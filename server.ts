import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

interface RenderSession {
  id: string;
  codec: 'prores_4444' | 'mp4_h264' | 'prores_small';
  alpha: boolean;
  fps: number;
  width: number;
  height: number;
  title?: string;
  keywords?: string[];
  outputPath: string;
  extension: string;
  mimeType: string;
  ffmpegProc: ChildProcessWithoutNullStreams;
  ffmpegExitPromise: Promise<{ code: number | null; stderr: string }>;
  framesReceived: number;
  createdAt: number;
}

const renderSessions = new Map<string, RenderSession>();

// Cleanup stale sessions older than 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of renderSessions.entries()) {
    if (now - session.createdAt > 30 * 60 * 1000) {
      try {
        session.ffmpegProc.kill('SIGKILL');
      } catch (e) {}
      try {
        if (fs.existsSync(session.outputPath)) {
          fs.unlinkSync(session.outputPath);
        }
      } catch (e) {}
      renderSessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow large payloads for frame buffers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.raw({ type: ['image/png', 'image/jpeg', 'image/webp', 'application/octet-stream'], limit: '50mb' }));

  // 1. Start Render Session
  app.post('/api/render/start', (req, res) => {
    try {
      const {
        codec = 'mp4_h264',
        alpha = false,
        fps = 60,
        width = 1920,
        height = 1080,
        title = '',
        keywords = [],
        inputFormat = 'png', // 'png' | 'jpeg'
      } = req.body || {};

      const sessionId = `render_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const isMov = codec === 'prores_4444' || codec === 'prores_small';
      const extension = isMov ? 'mov' : 'mp4';
      const mimeType = isMov ? 'video/quicktime' : 'video/mp4';
      const outputPath = path.join(os.tmpdir(), `${sessionId}.${extension}`);

      // Build FFmpeg arguments
      // Mandatory: -an (100% Muted / No Audio Track)
      const args: string[] = [
        '-y',
        '-f', 'image2pipe',
        '-vcodec', inputFormat === 'jpeg' ? 'mjpeg' : 'png',
        '-framerate', String(fps),
        '-i', '-',
        '-an', // Hard Muted (Zero Audio Stream)
      ];

      // Ensure even dimensions for codecs that require it
      const safeW = Math.floor(Number(width) / 2) * 2;
      const safeH = Math.floor(Number(height) / 2) * 2;
      args.push('-vf', `scale=${safeW}:${safeH}`);

      if (codec === 'prores_4444') {
        // Apple ProRes 4444 (Supports 10-bit 4:4:4 + Alpha Channel yuva444p10le)
        args.push(
          '-c:v', 'prores_ks',
          '-profile:v', '4444',
          '-pix_fmt', alpha ? 'yuva444p10le' : 'yuv444p10le',
          '-vendor', 'apl0',
          '-bits_per_mb', '8000'
        );
      } else if (codec === 'prores_small') {
        // Apple ProRes Small:
        // If Alpha Channel is enabled, use ProRes 4444 with compact quantizer (qscale:v 13) so Alpha is preserved with smaller file size!
        // If Opaque, use ProRes 422 Proxy (profile 0) for ultra-lightweight ProRes .mov
        if (alpha) {
          args.push(
            '-c:v', 'prores_ks',
            '-profile:v', '4444',
            '-pix_fmt', 'yuva444p10le',
            '-qscale:v', '13',
            '-vendor', 'apl0'
          );
        } else {
          args.push(
            '-c:v', 'prores_ks',
            '-profile:v', '0', // ProRes 422 Proxy (Small)
            '-pix_fmt', 'yuv422p10le',
            '-vendor', 'apl0'
          );
        }
      } else {
        // MP4 H.264 (libx264)
        args.push(
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-preset', 'veryfast',
          '-crf', '17',
          '-movflags', '+faststart'
        );
      }

      // Embed IPTC / QuickTime / MP4 Metadata if title/keywords provided
      if (title) {
        args.push('-metadata', `title=${title}`);
        args.push('-metadata', `comment=${title}`);
        args.push('-metadata', `description=${title}`);
      }
      if (Array.isArray(keywords) && keywords.length > 0) {
        args.push('-metadata', `keywords=${keywords.join(', ')}`);
      }

      args.push(outputPath);

      const ffmpegProc = spawn('ffmpeg', args);
      let stderrLog = '';

      ffmpegProc.stderr.on('data', (chunk) => {
        stderrLog += chunk.toString();
        if (stderrLog.length > 12000) {
          stderrLog = stderrLog.slice(-12000);
        }
      });

      const ffmpegExitPromise = new Promise<{ code: number | null; stderr: string }>((resolve) => {
        ffmpegProc.on('close', (code) => {
          resolve({ code, stderr: stderrLog });
        });
        ffmpegProc.on('error', (err) => {
          resolve({ code: -1, stderr: stderrLog + '\n' + err.message });
        });
      });

      const session: RenderSession = {
        id: sessionId,
        codec,
        alpha: Boolean(alpha),
        fps: Number(fps),
        width: safeW,
        height: safeH,
        title,
        keywords,
        outputPath,
        extension,
        mimeType,
        ffmpegProc,
        ffmpegExitPromise,
        framesReceived: 0,
        createdAt: Date.now(),
      };

      renderSessions.set(sessionId, session);
      res.json({ sessionId, extension, mimeType });
    } catch (err: any) {
      console.error('Error starting render session:', err);
      res.status(500).json({ error: err.message || 'Gagal memulai sesi render FFmpeg' });
    }
  });

  // 2. Push Frame (Binary PNG/JPEG buffer)
  app.post('/api/render/frame/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = renderSessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Sesi render tidak ditemukan atau sudah kadaluarsa.' });
      return;
    }

    try {
      const buffer: Buffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(req.body);

      if (!buffer || buffer.length === 0) {
        res.status(400).json({ error: 'Frame buffer kosong.' });
        return;
      }

      const canWrite = session.ffmpegProc.stdin.write(buffer);
      session.framesReceived++;

      if (!canWrite) {
        await new Promise<void>((resolve) => {
          session.ffmpegProc.stdin.once('drain', () => resolve());
        });
      }

      res.json({ ok: true, framesReceived: session.framesReceived });
    } catch (err: any) {
      console.error('Error writing frame to ffmpeg:', err);
      res.status(500).json({ error: err.message || 'Gagal menulis frame ke FFmpeg' });
    }
  });

  // 3. Finish Render & Get Output Info
  app.post('/api/render/finish/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = renderSessions.get(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Sesi render tidak ditemukan.' });
      return;
    }

    try {
      session.ffmpegProc.stdin.end();
      const { code, stderr } = await session.ffmpegExitPromise;

      if (code !== 0 || !fs.existsSync(session.outputPath)) {
        console.error('FFmpeg exited with code:', code, stderr);
        renderSessions.delete(sessionId);
        res.status(500).json({
          error: `FFmpeg gagal merender video (exit code ${code}). Detail: ${stderr.slice(-300)}`,
        });
        return;
      }

      const stats = fs.statSync(session.outputPath);
      res.json({
        ok: true,
        sessionId,
        sizeBytes: stats.size,
        extension: session.extension,
        mimeType: session.mimeType,
        downloadUrl: `/api/render/download/${sessionId}`,
      });
    } catch (err: any) {
      console.error('Error finishing render:', err);
      res.status(500).json({ error: err.message || 'Gagal menyelesaikan render video' });
    }
  });

  // 4. Download Rendered File
  app.get('/api/render/download/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = renderSessions.get(sessionId);
    if (!session || !fs.existsSync(session.outputPath)) {
      res.status(404).send('Berkas hasil render tidak ditemukan atau sudah dihapus.');
      return;
    }

    const customName = req.query.filename ? String(req.query.filename) : `${sessionId}.${session.extension}`;
    res.setHeader('Content-Type', session.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${customName.replace(/"/g, '')}"`);

    const stream = fs.createReadStream(session.outputPath);
    stream.pipe(res);
  });

  // 5. Cancel / Abort Render Session
  app.post('/api/render/cancel/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = renderSessions.get(sessionId);
    if (session) {
      try {
        session.ffmpegProc.kill('SIGKILL');
      } catch (e) {}
      try {
        if (fs.existsSync(session.outputPath)) {
          fs.unlinkSync(session.outputPath);
        }
      } catch (e) {}
      renderSessions.delete(sessionId);
    }
    res.json({ ok: true });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
