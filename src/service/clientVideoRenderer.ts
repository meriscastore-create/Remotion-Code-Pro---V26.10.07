/**
 * Client-Side In-Browser Video Renderer (MediaRecorder / HTML5 Canvas).
 * Works 100% offline and seamlessly inside Cloudflare Pages without backend FFmpeg or API Keys!
 */

export interface ClientRenderParams {
  renderHtml: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  useAlpha: boolean;
  sandboxIframe: HTMLIFrameElement;
  onProgress?: (frame: number, totalFrames: number, pct: number) => void;
  isAborted?: () => boolean;
}

export interface ClientRenderResult {
  blob: Blob;
  url: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
}

/**
 * Checks if backend server FFmpeg endpoint is reachable and alive
 */
export async function isServerRenderAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch('/api/render/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ping: true }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    // If 404 or 502/503, backend endpoint does not exist (e.g. Cloudflare Pages)
    return resp.status !== 404 && resp.status !== 502 && resp.status !== 503;
  } catch (e) {
    return false;
  }
}

/**
 * Performs client-side video rendering in the browser using canvas captureStream and MediaRecorder.
 */
export async function renderCompositionInBrowser(
  params: ClientRenderParams
): Promise<ClientRenderResult> {
  const {
    renderHtml,
    width,
    height,
    fps,
    duration,
    useAlpha,
    sandboxIframe,
    onProgress,
    isAborted,
  } = params;

  const totalFrames = Math.max(1, Math.round(duration * fps));

  // 1. Prepare sandbox iframe dimensions
  sandboxIframe.style.width = `${width}px`;
  sandboxIframe.style.height = `${height}px`;

  await new Promise<void>((resolve, reject) => {
    let timeout: any = null;
    const onLoad = () => {
      clearTimeout(timeout);
      sandboxIframe.removeEventListener('load', onLoad);
      resolve();
    };
    timeout = setTimeout(() => {
      sandboxIframe.removeEventListener('load', onLoad);
      resolve();
    }, 4000);
    sandboxIframe.addEventListener('load', onLoad);
    sandboxIframe.srcdoc = renderHtml;
  });

  const win = sandboxIframe.contentWindow as any;
  if (!win) {
    throw new Error('Gagal mengakses konteks window di dalam render iframe.');
  }

  // 2. Wait for fonts & WebGL initialization
  if (win.document && win.document.fonts && win.document.fonts.ready) {
    await Promise.race([
      win.document.fonts.ready,
      new Promise(r => setTimeout(r, 1200))
    ]);
  }
  await new Promise(r => setTimeout(r, 200));

  // Pause playback so frames can be stepped deterministically
  win.postMessage({ type: 'pause' }, '*');

  // 3. Create offscreen canvas for recording stream
  const captureCanvas = document.createElement('canvas');
  captureCanvas.width = width;
  captureCanvas.height = height;
  const captureCtx = captureCanvas.getContext('2d', { alpha: useAlpha })!;

  // Select best supported video mime type
  let mimeType = 'video/webm;codecs=vp9';
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Browser ini tidak mendukung MediaRecorder API untuk video capture.');
  }

  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }
  if (!MediaRecorder.isTypeSupported(mimeType) && MediaRecorder.isTypeSupported('video/mp4')) {
    mimeType = 'video/mp4';
  }

  const stream = captureCanvas.captureStream(fps);
  const videoTrack = stream.getVideoTracks()[0] as any;

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 20000000, // 20 Mbps high quality
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  recorder.start(100);

  const frameIntervalMs = Math.max(12, Math.floor(1000 / fps));

  try {
    // 4. Step deterministically through each frame
    for (let f = 0; f < totalFrames; f++) {
      if (isAborted && isAborted()) {
        recorder.stop();
        throw new Error('Proses render dibatalkan.');
      }

      const progress = totalFrames > 0 ? f / totalFrames : 0;
      win.postMessage({ type: 'render', progress, frame: f }, '*');

      // Trigger frame rasterization
      if (typeof win.__captureCurrentFrameBlob === 'function') {
        try {
          await win.__captureCurrentFrameBlob(
            width,
            height,
            useAlpha ? 'image/png' : 'image/jpeg',
            0.95,
            useAlpha
          );
        } catch (e) {}
      }

      // Draw to recording canvas
      const srcCanvas = win.__renderOutCanvas;
      captureCtx.clearRect(0, 0, width, height);

      if (srcCanvas && srcCanvas.width > 0 && srcCanvas.height > 0) {
        captureCtx.drawImage(srcCanvas, 0, 0, width, height);
      } else {
        const innerCanvases = win.document.querySelectorAll('canvas');
        if (innerCanvases.length > 0) {
          for (let cIdx = 0; cIdx < innerCanvases.length; cIdx++) {
            const ic = innerCanvases[cIdx];
            if (ic.width > 0 && ic.height > 0) {
              captureCtx.drawImage(ic, 0, 0, width, height);
            }
          }
        }
      }

      // Request next frame on stream track if available
      if (videoTrack && typeof videoTrack.requestFrame === 'function') {
        try { videoTrack.requestFrame(); } catch (e) {}
      }

      if (onProgress) {
        const pct = Math.round(((f + 1) / totalFrames) * 100);
        onProgress(f + 1, totalFrames, pct);
      }

      await new Promise(r => setTimeout(r, frameIntervalMs));
    }

    // 5. Finalize recording
    const videoBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType }));
      };
      recorder.stop();
    });

    const url = URL.createObjectURL(videoBlob);
    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';

    return {
      blob: videoBlob,
      url,
      mimeType,
      extension,
      sizeBytes: videoBlob.size,
    };
  } catch (err) {
    if (recorder.state === 'recording') {
      try { recorder.stop(); } catch (e) {}
    }
    throw err;
  }
}
