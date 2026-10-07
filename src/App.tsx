import React, { useState, useEffect, useRef } from 'react';
import { 
  generateAnimationService, 
  applyVariationService, 
  formatFizkesPopovTitle,
  getCleanPopovFilename,
  generatePopovKeywords,
  cleanAdobeStockTitle,
  sanitizeRemotionConstants,
  healTsxSyntaxErrors,
  createFastClientPreviewHtmlFromTsx,
  generatePreviewFromTsxService,
  PopovKeywords
} from './service/gemini';
import { generateRandomMicrostockBackgroundPrompt, generateSmoothLiquidBackgroundPrompt, generateStrictCustomConceptPrompt } from './service/backgroundGenerator';
import { 
  saveBulkQueueTask, 
  getBulkQueueTask, 
  clearBulkQueueTask, 
  saveActiveDraft, 
  getActiveDraft, 
  clearActiveDraft, 
  saveFileToMotionBackgroundsFolder, 
  saveBinaryVideoToMotionBackgroundsFolder, 
  BulkQueueTask,
  BulkTsxItem,
  StoredTsxRecord,
  saveBulkTsxQueue,
  getBulkTsxQueue,
  clearBulkTsxQueue,
  saveTsxToStoredLibrary,
  getStoredTsxLibrary,
  deleteStoredTsxRecord,
  getAllLocalStoredTsxSources
} from './service/storage';
import { 
  ALL_BACKGROUND_STYLES,
  BACKGROUND_STYLE_CATEGORIES
} from './service/iconGenerator';
import { AISettingsModal } from './components/AISettingsModal';
import { getAISettings, AISettings } from './service/aiProviders';
import { renderCompositionInBrowser, isServerRenderAvailable } from './service/clientVideoRenderer';
import { 
  Upload, 
  Play, 
  Pause,
  Code, 
  Eye, 
  Copy, 
  Check, 
  Loader2, 
  Zap, 
  Type, 
  FileSearch, 
  AlertCircle, 
  Save, 
  History, 
  Sparkles, 
  FileCode, 
  CheckCircle, 
  CheckCircle2, 
  Wand2,
  Settings2,
  FileText,
  RefreshCw,
  Columns,
  SkipBack,
  SkipForward,
  RotateCcw,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Shapes,
  Search,
  Layers,
  Grid,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Square,
  Trash2,
  Download,
  ListOrdered,
  Image,
  Images,
  Plus,
  X,
  Monitor,
  Smartphone,
  Tag,
  ExternalLink,
  Send,
  MessageSquare,
  Undo2,
  CornerDownLeft,
  Video,
  Film,
  HardDrive,
  FolderOpen,
  PlayCircle,
  FilePlus,
  ArrowDownToLine,
  Key
} from 'lucide-react';

interface BulkImageItem {
  id: string;
  name: string;
  size: string;
  dataUrl: string;
  mimeType: string;
  mediaType?: 'image' | 'video' | 'svg';
  thumbnailUrl?: string;
  svgCode?: string;
  svgMeta?: {
    viewBox?: string;
    pathCount?: number;
    fileName?: string;
  };
}

const generateVideoThumbnail = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.muted = true;
      vid.playsInline = true;
      vid.src = url;
      vid.onloadedmetadata = () => {
        vid.currentTime = Math.min(0.5, (vid.duration || 1) / 2);
      };
      vid.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(640, vid.videoWidth || 640);
          canvas.height = Math.min(360, vid.videoHeight || 360);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
            const thumb = canvas.toDataURL('image/jpeg', 0.85);
            URL.revokeObjectURL(url);
            resolve(thumb);
            return;
          }
        } catch (e) {}
        URL.revokeObjectURL(url);
        resolve('');
      };
      vid.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
    } catch (e) {
      resolve('');
    }
  });
};

const svgToPngDataUrl = async (svgText: string): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const img = new window.Image();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const w = Math.max(1024, img.naturalWidth || 1024);
          const h = Math.max(1024, img.naturalHeight || 1024);
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const pngUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(url);
            resolve(pngUrl);
            return;
          }
        } catch (e) {
          console.warn('Canvas rasterize fallback', e);
        }
        URL.revokeObjectURL(url);
        resolve(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`);
      };
      img.src = url;
    } catch (err) {
      resolve(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`);
    }
  });
};

interface SavedFileHistoryItem {
  name: string;
  workspace: string;
  time: string;
  size: string;
  type: 'tsx' | 'html' | 'video';
}

export interface LocalCustomFontItem {
  id: string;
  familyName: string;
  fileName: string;
  dataUrl: string;
  format: 'truetype' | 'opentype' | 'woff2' | 'woff';
  sizeKB: string;
}

interface SuggestedVariationItem {
  label: string;
  description: string;
  prompt: string;
  category?: 'warna' | 'gerakan' | '3D' | 'sudut pandang' | 'combo';
}

// Default Preview dengan simulasi Canvas & Motion aktif 60 FPS
const DEFAULT_PREVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remotion Motion Canvas Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
      background: #060608;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #ffffff;
    }
    #visual-editor-wrapper {
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: radial-gradient(circle at 50% 50%, #151102 0%, #060608 80%);
    }
    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      pointer-events: none;
    }
    .hud-overlay {
      position: relative;
      z-index: 10;
      background: rgba(15, 15, 18, 0.88);
      border: 1px solid rgba(255, 195, 0, 0.35);
      border-radius: 28px;
      padding: 44px 56px;
      text-align: center;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(255, 195, 0, 0.12);
      backdrop-filter: blur(16px);
      max-width: 820px;
      transform-style: preserve-3d;
      transition: transform 0.05s ease-out;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 195, 0, 0.12);
      border: 1px solid rgba(255, 195, 0, 0.45);
      padding: 8px 22px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 800;
      color: #ffc300;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin-bottom: 22px;
      box-shadow: 0 0 20px rgba(255, 195, 0, 0.2);
    }
    .pulse-dot {
      width: 10px;
      height: 10px;
      background: #ffc300;
      border-radius: 50%;
      box-shadow: 0 0 12px #ffc300;
      animation: pulseAnim 1.4s infinite ease-in-out;
    }
    @keyframes pulseAnim {
      0%, 100% { opacity: 0.4; transform: scale(0.85); }
      50% { opacity: 1; transform: scale(1.3); }
    }
    .main-title {
      font-size: 40px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
      text-shadow: 0 4px 16px rgba(0,0,0,0.6);
    }
    .sub-title {
      font-size: 19px;
      color: #ffc300;
      font-weight: 800;
      letter-spacing: 0.12em;
      margin-bottom: 16px;
      text-transform: uppercase;
    }
    .desc-text {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .fps-counter {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: monospace;
      font-size: 12px;
      color: #a1a1aa;
      background: rgba(0,0,0,0.4);
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
    }
  </style>
</head>
<body>
  <div id="visual-editor-wrapper">
    <canvas id="bg-canvas" width="1920" height="1080"></canvas>
    <div class="hud-overlay" id="hud-card">
      <div class="status-badge">
        <div class="pulse-dot"></div>
        Remotion Engine Active &bull; 60 FPS
      </div>
      <div class="main-title">Pratinjau Animasi Remotion</div>
      <div class="sub-title">100% Siap Dirender &amp; Bergerak</div>
      <p class="desc-text">
        Masukkan prompt atau upload gambar referensi di sebelah kiri, lalu klik <b>Generate</b>.<br>
        Animasi akan otomatis direkonstruksi 99% identik dengan dinamika 3D penuh, pencahayaan alami bersih tanpa kilauan melintas, dan sistem partikel aktif.
      </p>
      <div class="fps-counter">
        <span style="color: #ffc300;">&bull; STATUS:</span> RUNNING <span style="margin: 0 4px;">|</span> FRAME: <span id="frame-display" style="color: #ffc300;">0</span>/600
      </div>
    </div>
  </div>

  <script>
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    const hudCard = document.getElementById('hud-card');
    const frameDisplay = document.getElementById('frame-display');
    const DURATION_FRAMES = 600;

    // Create 45 floating particles (lightweight, silky smooth)
    const particles = [];
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        radius: Math.random() * 2.8 + 1.2,
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: (Math.random() - 0.5) * 1.5,
        pulseOffset: Math.random() * Math.PI * 2,
        color: Math.random() > 0.4 ? 'rgba(255, 195, 0, ' : 'rgba(255, 255, 255, '
      });
    }

    // MANDATORY GLOBAL DRAW FUNCTION
    window.draw = function(progress) {
      const p = Math.max(0, Math.min(1, progress || 0));
      const frame = Math.floor(p * DURATION_FRAMES);
      if (frameDisplay) frameDisplay.textContent = frame;

      const w = canvas.width || 1920;
      const h = canvas.height || 1080;
      const t = p * Math.PI * 2;

      // 1. Clear background
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, w, h);

      // 2. Animated Ambient Glows
      const glowX = w * 0.5 + Math.cos(t) * 120;
      const glowY = h * 0.5 + Math.sin(t * 0.8) * 80;
      const radialGrad = ctx.createRadialGradient(glowX, glowY, 30, glowX, glowY, w * 0.45);
      radialGrad.addColorStop(0, 'rgba(255, 195, 0, 0.15)');
      radialGrad.addColorStop(0.5, 'rgba(255, 140, 0, 0.05)');
      radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, w, h);

      // 3. Cyber 3D Perspective Grid
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 195, 0, 0.04)';
      ctx.lineWidth = 1.5;
      const gridStep = 80;
      const offsetY = (p * 400) % gridStep;
      for (let x = 0; x <= w; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = offsetY; y <= h; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();

      // 4. Concentric Breathing Energy Rings
      ctx.save();
      ctx.translate(w * 0.5, h * 0.5);
      for (let ring = 1; ring <= 4; ring++) {
        const ringT = t * (ring % 2 === 0 ? 1 : -1) * 0.5;
        const ringR = (w * 0.16) + ring * 50 + Math.sin(t + ring) * 12;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, ringT, ringT + Math.PI * 1.4);
        ctx.strokeStyle = ring % 2 === 0 ? 'rgba(255, 195, 0, 0.18)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.restore();

      // 5. Floating Dynamic Particles with soft halo (GPU-friendly, ZERO shadowBlur stall)
      for (let i = 0; i < particles.length; i++) {
        const pt = particles[i];
        const px = (pt.x + Math.sin(t + pt.pulseOffset) * 80 + w) % w;
        const py = (pt.y + Math.cos(t * 0.7 + pt.pulseOffset) * 60 + h) % h;
        const alpha = 0.3 + 0.6 * Math.sin(t * 2 + pt.pulseOffset);

        // Soft outer ambient halo
        ctx.beginPath();
        ctx.arc(px, py, pt.radius * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = pt.color + (Math.max(0.04, alpha) * 0.22) + ')';
        ctx.fill();

        // Core crisp particle
        ctx.beginPath();
        ctx.arc(px, py, pt.radius, 0, Math.PI * 2);
        ctx.fillStyle = pt.color + Math.max(0.12, alpha) + ')';
        ctx.fill();
      }

      // 6. Kinetic Tilt for HUD Card
      if (hudCard) {
        const tiltY = Math.sin(t) * 5;
        const tiltX = -Math.cos(t * 0.7) * 3;
        const floatY = Math.sin(t * 1.2) * 10;
        hudCard.style.transform = 'perspective(1000px) translate3d(0, ' + floatY + 'px, 0) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)';
      }
    };

    window.render = window.draw;

    // Initial render
    window.draw(0);

    // Autonomous playback loop (only until external host takes over)
    let autoProgress = 0;
    let isExternalHost = false;
    let autoRafId = null;
    function autoPlaybackLoop() {
      if (!isExternalHost && !document.hidden) {
        autoProgress = (autoProgress + 0.003) % 1;
        window.draw(autoProgress);
        autoRafId = requestAnimationFrame(autoPlaybackLoop);
      }
    }
    autoRafId = requestAnimationFrame(autoPlaybackLoop);

    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'render') {
        if (!isExternalHost) {
          isExternalHost = true;
          if (autoRafId) {
            cancelAnimationFrame(autoRafId);
            autoRafId = null;
          }
        }
        window.draw(e.data.progress);
      }
    });
  </script>
</body>
</html>`;

const DEFAULT_REMOTION_TSX = `// FFMPEG_CONFIG: -minrate 60M -maxrate 70M -bitrate 65M -bufsize 100M -pix_fmt yuv420p

import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// --- CONFIGURATION CONSTANTS ---
export const DURATION = 600;
export const FPS = 60;
export const WIDTH = 3840;
export const HEIGHT = 2160;

// ==========================================
// MAIN COMPOSITION
// ==========================================
export const MainComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = frame / DURATION;

  const containerStyle: React.CSSProperties = {
    backgroundColor: '#010204',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    margin: 0,
    padding: 0,
    fontFamily: 'system-ui, sans-serif'
  };

  const scale = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5 },
    from: 0.85,
    to: 1.0
  });

  const opacity = interpolate(progress, [0, 0.15, 0.85, 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={containerStyle}>
      <div style={{
        opacity,
        transform: \`scale(\${scale})\`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: '#ffffff',
        padding: '40px'
      }}>
        <div style={{
          fontSize: '72px',
          fontWeight: 800,
          color: '#ffc300',
          marginBottom: '16px'
        }}>
          Animation Preview
        </div>
        <div style={{ fontSize: '32px', color: '#94a3b8' }}>
          Pure Vector Motion Engine
        </div>
      </div>
    </AbsoluteFill>
  );
};`;

const VISUAL_VARIATIONS_POOL: SuggestedVariationItem[] = [
  {
    label: "Sunset Dutch Parallax",
    category: "combo",
    description: "Warna senja ungu-oranye hangat, gerakan sinusoidal gelombang lembut, kedalaman berlapis paralaks 3D tinggi, dengan kemiringan kamera sinematik 8°.",
    prompt: "Ubah gaya visual dengan memadukan gradasi hangat Sunset (ungu senja & oranye), kurva gerakan mengalir lembut sinusoidal (smooth wave), kedalaman berlapis paralaks 3D stereoskopik tinggi, dan kemiringan kamera miring sinematik (dutch tilt 8 derajat). JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  },
  {
    label: "Emerald Vortex Top-Down",
    category: "combo",
    description: "Warna hijau aurora & toska berpendar, gerakan spiral pusaran (vortex) ke pusat, kedalaman lorong 3D spasial, dari sudut pandang tegak lurus bird's eye.",
    prompt: "Ubah gaya visual dengan memadukan warna Emerald Aurora (hijau zamrud & toska berpendar), putaran spiral pusaran (vortex rotation) menuju pusat secara anggun, kedalaman lorong 3D spasial tak terbatas dari tengah layar, dan sudut pandang tegak lurus sempurna dari atas (bird's eye view). JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  },
  {
    label: "Neon Spring Glass-Tilt",
    category: "combo",
    description: "Warna magenta pekat & biru elektrik, gerakan memantul elastis (spring bounce), kedalaman tekstur kaca bias 3D (glassmorphic), sudut pandang rendah mendongak.",
    prompt: "Ubah gaya visual dengan memadukan warna Neon Genesis (magenta pekat & biru elektrik berpendar), gerakan memantul elastis (elastic spring bounce) organik, tekstur glassmorphism berlapis semi-transparan dengan bayangan bias 3D, dan sudut pandang rendah mendongak ke atas (low-angle view). JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  },
  {
    label: "Velvet Bokeh Low-Sweep",
    category: "combo",
    description: "Emas berpendar mewah di atas beludru merah tua, gerakan orbit lambat hipnotis konstan, kedalaman fokus bokeh optis (DoF) tebal, disapu horizontal panoramik.",
    prompt: "Ubah gaya visual dengan memadukan warna Royal Gold & Velvet (emas murni bercahaya tinggi dengan latar beludru merah tua), lintasan orbit lambat hipnotis konstan, efek kedalaman bokeh optis (depth of field / blur latar belakang tebal), dan sudut pandang menyapu horizontal secara panoramik rendah (panoramic low sweep). JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  },
  {
    label: "Cosmic Staggered Fish-Eye",
    category: "combo",
    description: "Biru galaksi & pink nebula, gerakan sekuensial mengalir (staggered delay), kedalaman bayangan jatuh multi-dimensi, proyeksi lensa cembung (fish-eye).",
    prompt: "Ubah gaya visual dengan memadukan warna Cosmic Nebula (gradasi biru galaksi, ungu pekat, dan pink nebula), gerakan staggered delay (animasi berurutan mengalir lembut), kedalaman bayangan jatuh multi-dimensi (dimensional drop shadow) tebal, dan proyeksi kamera cembung (fish-eye lens effect) di sudut luar. JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  },
  {
    label: "Frozen Wave Glass-Orbit",
    category: "combo",
    description: "Biru es kutub & putih kristal, gerakan gelombang sinusoidal mulus, kedalaman kaca bias 3D berlapis, dari kemiringan sinematik dramatis.",
    prompt: "Ubah gaya visual dengan memadukan warna Frozen Cyber (biru es & putih kristal), gerakan mengalir gelombang sinusoidal lembut, kedalaman tekstur glassmorphic bias 3D berlapis, dan kamera miring sinematik (dutch tilt 8 derajat). JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  },
  {
    label: "Vibrant Spring-Parallax Top",
    category: "combo",
    description: "Warna oranye ultra & cyan neon kontras tinggi, gerakan memantul elastis kenyal, kedalaman paralaks stereoskopik multi-layer, sudut pandang bird's eye.",
    prompt: "Ubah gaya visual dengan memadukan warna oranye ultra & cyan neon kontras tinggi, gerakan memantul elastis organik (spring bounce), kedalaman paralaks stereoskopik multi-layer (lapisan belakang bergerak lebih lambat), dan sudut pandang tegak lurus dari atas (bird's eye view). JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  },
  {
    label: "Nebula Spiral Low-Angle",
    category: "combo",
    description: "Gradasi ungu magenta & biru toska kosmik, gerakan partikel spiral melingkar, kedalaman lorong 3D spasial tak terbatas, sudut pandang rendah mendongak.",
    prompt: "Ubah gaya visual dengan memadukan warna Cosmic Nebula (gradasi biru galaksi, ungu pekat, dan pendaran pink), gerakan orbit rotasi melingkar spiral (vortex rotation) menuju pusat secara anggun, kedalaman lorong 3D spasial tak terbatas, dan sudut pandang kamera rendah mendongak ke atas (low-angle view). JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  },
  {
    label: "Sunset Elastic Glass-Sweep",
    category: "combo",
    description: "Gradasi jingga senja & merah muda lembut, gerakan memantul elastis organik, kedalaman kaca bias 3D berlapis tebal, disapu horizontal panoramik.",
    prompt: "Ubah gaya visual dengan memadukan gradasi hangat Sunset (ungu senja & oranye), gerakan memantul elastis (elastic spring bounce) organik, tekstur glassmorphic berlapis dengan bayangan bias 3D, dan sudut pandang menyapu horizontal secara panoramik rendah (panoramic low sweep). JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  },
  {
    label: "Emerald Staggered Dutch-Tilt",
    category: "combo",
    description: "Hijau zamrud & emas lembut, gerakan staggered delay mengalir berurutan halus, kedalaman paralaks stereoskopik 3D, kemiringan kamera sinematik.",
    prompt: "Ubah gaya visual dengan memadukan warna hijau zamrud bercahaya & emas lembut, gerakan staggered delay mengalir berurutan halus, kedalaman paralaks stereoskopik 3D (lapisan belakang bergerak lebih lambat), dan kamera miring sinematik (dutch tilt 8 derajat). JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  },
  {
    label: "Cyber Vortex Fish-Eye",
    category: "combo",
    description: "Biru elektrik & magenta neon berpendar, gerakan spiral pusaran (vortex) ke pusat, kedalaman fokus bokeh (DoF) tebal, distorsi lensa cembung.",
    prompt: "Ubah gaya visual dengan memadukan warna biru elektrik & magenta neon, gerakan spiral pusaran (vortex rotation) ke pusat secara anggun, efek kedalaman bokeh optis (depth of field / blur latar belakang tebal), dan proyeksi kamera cembung (fish-eye lens effect) di sudut luar. JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  },
  {
    label: "Velvet Wave Top-Down",
    category: "combo",
    description: "Merah beludru tua & emas murni berpendar tinggi, gerakan gelombang sinusoidal lembut, kedalaman lorong 3D spasial tak terbatas, sudut pandang bird's eye.",
    prompt: "Ubah gaya visual dengan memadukan warna merah beludru tua & emas murni berpendar tinggi, kurva gerakan mengalir lembut sinusoidal (smooth wave), kedalaman lorong 3D spasial tak terbatas, dan sudut pandang tegak lurus sempurna dari atas (bird's eye view). JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel."
  }
];

const getCategoryBadge = (category?: string) => {
  if (!category) return null;
  const normalized = category.toLowerCase();
  if (normalized === 'combo') {
    return (
      <div className="flex gap-1 flex-wrap justify-end max-w-[170px] shrink-0">
        <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-sky-950/60 border border-sky-850 text-sky-400">
          Warna
        </span>
        <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-purple-950/60 border border-purple-850 text-purple-400">
          Gerak
        </span>
        <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-amber-950/60 border border-amber-850 text-[#ffc300]">
          3D
        </span>
        <span className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-emerald-950/60 border border-emerald-850 text-emerald-400">
          Sudut
        </span>
      </div>
    );
  }
  return null;
};

const ensureSevenVariations = (existingList: SuggestedVariationItem[]): SuggestedVariationItem[] => {
  return VISUAL_VARIATIONS_POOL.slice(0, 7);
};

export type LayoutPresetKey = 
  | 'landscape_4k_60'
  | 'landscape_4k_30'
  | 'landscape_2k_60'
  | 'landscape_2k_30'
  | 'vertical_4k_60'
  | 'vertical_4k_30'
  | 'vertical_2k_60'
  | 'vertical_2k_30';

export interface LayoutPresetItem {
  key: LayoutPresetKey;
  label: string;
  isLandscape: boolean;
  aspect: '16:9' | '9:16';
  resolution: '4K' | '2K';
  width: number;
  height: number;
  fps: number;
}

export const LAYOUT_PRESETS: LayoutPresetItem[] = [
  {
    key: 'landscape_4k_60',
    label: 'Landscape Layout (16:9 4K 60fps)',
    isLandscape: true,
    aspect: '16:9',
    resolution: '4K',
    width: 3840,
    height: 2160,
    fps: 60,
  },
  {
    key: 'landscape_4k_30',
    label: 'Landscape Layout (16:9 4K 30fps)',
    isLandscape: true,
    aspect: '16:9',
    resolution: '4K',
    width: 3840,
    height: 2160,
    fps: 30,
  },
  {
    key: 'landscape_2k_60',
    label: 'Landscape Layout (16:9 2K 60fps)',
    isLandscape: true,
    aspect: '16:9',
    resolution: '2K',
    width: 2560,
    height: 1440,
    fps: 60,
  },
  {
    key: 'landscape_2k_30',
    label: 'Landscape Layout (16:9 2k 30fps)',
    isLandscape: true,
    aspect: '16:9',
    resolution: '2K',
    width: 2560,
    height: 1440,
    fps: 30,
  },
  {
    key: 'vertical_4k_60',
    label: 'vertical Layout (9:16 4K 60fps)',
    isLandscape: false,
    aspect: '9:16',
    resolution: '4K',
    width: 2160,
    height: 3840,
    fps: 60,
  },
  {
    key: 'vertical_4k_30',
    label: 'vertical Layout (9:16 4K 30fps)',
    isLandscape: false,
    aspect: '9:16',
    resolution: '4K',
    width: 2160,
    height: 3840,
    fps: 30,
  },
  {
    key: 'vertical_2k_60',
    label: 'vertical Layout (9:16 2k 60fps)',
    isLandscape: false,
    aspect: '9:16',
    resolution: '2K',
    width: 1440,
    height: 2560,
    fps: 60,
  },
  {
    key: 'vertical_2k_30',
    label: 'vertical Layout (9:16 2k 30fps)',
    isLandscape: false,
    aspect: '9:16',
    resolution: '2K',
    width: 1440,
    height: 2560,
    fps: 30,
  },
];

export function ensurePreviewHtmlResolution(
  html: string,
  width: number,
  height: number,
  fps: number,
  duration: number
): string {
  if (!html) return html;
  const totalFrames = duration * fps;
  const centerX = Math.round(width / 2);
  const centerY = Math.round(height / 2);

  let updated = html;

  // 1. Update <canvas id="canvas" ...> attributes
  updated = updated.replace(/<canvas\b([^>]*)>/gi, (match, attrs) => {
    let newAttrs = attrs;
    if (/\bwidth=["']\d+["']/i.test(newAttrs)) {
      newAttrs = newAttrs.replace(/\bwidth=["']\d+["']/i, `width="${width}"`);
    } else {
      newAttrs += ` width="${width}"`;
    }
    if (/\bheight=["']\d+["']/i.test(newAttrs)) {
      newAttrs = newAttrs.replace(/\bheight=["']\d+["']/i, `height="${height}"`);
    } else {
      newAttrs += ` height="${height}"`;
    }
    return `<canvas${newAttrs}>`;
  });

  // 2. Update root SVG viewBox if SVG mode is used
  updated = updated.replace(/viewBox=["']\s*0\s+0\s+\d+\s+\d+\s*["']/gi, `viewBox="0 0 ${width} ${height}"`);

  // 3. Update canvas script size variables & clearRect
  updated = updated.replace(/canvas\.width\s*=\s*\d+;?/gi, `canvas.width = ${width};`);
  updated = updated.replace(/canvas\.height\s*=\s*\d+;?/gi, `canvas.height = ${height};`);
  updated = updated.replace(/(const|let|var)\s+WIDTH\s*=\s*\d+;?/gi, `$1 WIDTH = ${width};`);
  updated = updated.replace(/(const|let|var)\s+HEIGHT\s*=\s*\d+;?/gi, `$1 HEIGHT = ${height};`);
  updated = updated.replace(/(const|let|var)\s+FPS\s*=\s*\d+;?/gi, `$1 FPS = ${fps};`);
  updated = updated.replace(/(const|let|var)\s+TOTAL_FRAMES\s*=\s*\d+;?/gi, `$1 TOTAL_FRAMES = ${totalFrames};`);
  updated = updated.replace(/(const|let|var)\s+DURATION_FRAMES\s*=\s*\d+;?/gi, `$1 DURATION_FRAMES = ${totalFrames};`);
  updated = updated.replace(/(const|let|var)\s+CX\s*=\s*\d+;?/gi, `$1 CX = ${centerX};`);
  updated = updated.replace(/(const|let|var)\s+CY\s*=\s*\d+;?/gi, `$1 CY = ${centerY};`);

  // 4. Update clearRect in window.draw
  updated = updated.replace(/ctx\.clearRect\(\s*0\s*,\s*0\s*,\s*\d+\s*,\s*\d+\s*\)/gi, `ctx.clearRect(0, 0, ${width}, ${height})`);

  // 5. Update main subject transform in HTML preview
  updated = updated.replace(/(id=["']main-subject-master["'][^>]*transform=["']translate\()\s*\d+\s*,\s*\d+\s*(\))/gi, `$1${centerX}, ${centerY}$2`);

  // 6. Update Three.js WebGLRenderer size & aspect ratio if present
  updated = updated.replace(/renderer\.setSize\(\s*\d+\s*,\s*\d+\s*\)/gi, `renderer.setSize(${width}, ${height})`);
  updated = updated.replace(/new\s+THREE\.PerspectiveCamera\(\s*(\d+(?:\.\d+)?)\s*,\s*[^,]+\s*,/gi, `new THREE.PerspectiveCamera($1, ${width} / ${height},`);
  updated = updated.replace(/camera\.aspect\s*=\s*[^;]+;/gi, `camera.aspect = ${width} / ${height}; camera.updateProjectionMatrix();`);

  return updated;
}

export function applyBgOverrideToTSX(
  code: string,
  mode: 'none' | 'alpha' | 'greenscreen' | 'black' | 'white'
): string {
  if (!code || mode === 'none') return code;
  let updated = code;
  const targetColor = mode === 'alpha' ? 'transparent' : mode === 'greenscreen' ? '#00ff00' : mode === 'white' ? '#ffffff' : '#000000';

  // 1. Replace backgroundColor in styles / AbsoluteFill / containerStyle
  updated = updated.replace(/backgroundColor:\s*['"][^'"]*['"]/g, `backgroundColor: '${targetColor}'`);

  // 2. In SVG background rect if present
  if (mode === 'alpha') {
    updated = updated.replace(
      /(<rect\b[^>]*(?:id=["'](?:bg|background)[^"']*["']|width=["'](?:100%|WIDTH|width|\d+)["'][^>]*height=["'](?:100%|HEIGHT|height|\d+)["'])[^>]*fill=)["'][^"']*["']/gi,
      `$1"transparent"`
    );
    // 3. Update FFMPEG_CONFIG header pixel format to preserve alpha channel
    updated = updated.replace(/(\/\/\s*FFMPEG_CONFIG:[^\r\n]*?)-pix_fmt\s+yuv420p/gi, '$1-pix_fmt yuva444p10le');
  } else {
    updated = updated.replace(
      /(<rect\b[^>]*(?:id=["'](?:bg|background)[^"']*["']|width=["'](?:100%|WIDTH|width|\d+)["'][^>]*height=["'](?:100%|HEIGHT|height|\d+)["'])[^>]*fill=)["'][^"']*["']/gi,
      `$1"${targetColor}"`
    );
    // 3. Restore standard opaque yuv420p
    updated = updated.replace(/(\/\/\s*FFMPEG_CONFIG:[^\r\n]*?)-pix_fmt\s+yuva444p10le/gi, '$1-pix_fmt yuv420p');
  }

  return updated;
}

export function isGenericSystemFont(font: string): boolean {
  const lower = (font || '').toLowerCase().trim();
  const generics = [
    'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'helvetica neue',
    'helvetica', 'arial', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
    'inherit', 'initial', 'unset', 'none'
  ];
  return generics.includes(lower);
}

export function extractFontFamiliesFromCode(code: string, previewHtml?: string): string[] {
  const fonts = new Set<string>();
  const combined = (code || '') + '\n' + (previewHtml || '');

  // 1. Match Google Fonts URL parameters
  const gfMatches = combined.matchAll(/fonts\.googleapis\.com\/css2\?family=([^&"'\s\)]+)/gi);
  for (const m of gfMatches) {
    const raw = m[1];
    const parts = raw.split(/[:&]/)[0];
    const cleaned = decodeURIComponent(parts).replace(/\+/g, ' ').trim();
    if (cleaned && !isGenericSystemFont(cleaned)) {
      fonts.add(cleaned);
    }
  }

  // 2. Match fontFamily / font-family in CSS and JSX
  const fontPropMatches = combined.matchAll(/(?:fontFamily|font-family)\s*:\s*['"`]?([^;'"`}]+)/gi);
  for (const m of fontPropMatches) {
    const fontStr = m[1];
    const candidates = fontStr.split(',').map(s => s.replace(/['"`]/g, '').trim());
    for (const c of candidates) {
      if (c && !isGenericSystemFont(c) && !c.includes('{') && !c.includes('}')) {
        fonts.add(c);
      }
    }
  }

  // 3. Known Google Font typography keywords
  const knownTypographyKeywords = [
    'Caramel', 'Great Vibes', 'Dancing Script', 'Alex Brush', 'Pacifico',
    'Playfair Display', 'Cinzel', 'Cinzel Decorative', 'Montserrat', 'Pinyon Script',
    'Allura', 'Sacramento', 'Parisienne', 'Italianno', 'Caveat', 'Satisfy',
    'Marck Script', 'Rouge Script', 'Tangerine', 'Mr De Haviland', 'Herr Von Muellerhoff',
    'Oswald', 'Lobster', 'Comfortaa', 'Abril Fatface', 'Playfair', 'Cormorant Garamond'
  ];
  for (const kw of knownTypographyKeywords) {
    const kwRegex = new RegExp(`\\b${kw.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (kwRegex.test(combined)) {
      fonts.add(kw);
    }
  }

  return Array.from(fonts);
}

export function ensureConfigurationConstants(
  code: string,
  duration: number,
  fps: number,
  isLandscape: boolean = true,
  resolution: '4K' | '2K' = '4K',
  customWidth?: number,
  customHeight?: number,
  title?: string,
  keywords?: string[],
  bgOverride?: 'none' | 'greenscreen' | 'black' | 'white' | 'alpha',
  previewHtml?: string,
  localFont?: LocalCustomFontItem | null
): string {
  if (!code) return code;
  const totalFrames = duration * fps;
  let width = 3840;
  let height = 2160;

  if (customWidth && customHeight) {
    width = customWidth;
    height = customHeight;
  } else if (isLandscape) {
    width = resolution === '2K' ? 2560 : 3840;
    height = resolution === '2K' ? 1440 : 2160;
  } else {
    width = resolution === '2K' ? 1440 : 2160;
    height = resolution === '2K' ? 2560 : 3840;
  }

  const constantsBlock = `// --- CONFIGURATION CONSTANTS ---
export const DURATION = ${totalFrames};
export const FPS = ${fps};
export const WIDTH = ${width};
export const HEIGHT = ${height};`;

  // Bersihkan SEMUA deklarasi konstanta & metadata IPTC yang sebelumnya (baik single maupun duplikat ganda) serta pulihkan sintaks cacat/unterminated regex
  let cleaned = healTsxSyntaxErrors(sanitizeRemotionConstants(code));

  // 1. Sinkronkan atribut Composition dengan konstanta DURATION, FPS, WIDTH, HEIGHT
  cleaned = cleaned.replace(/<Composition\b([^>]*)>/gi, (match, attrs) => {
    let newAttrs = attrs;
    newAttrs = newAttrs.replace(/\bwidth=\{?\d+\}?/i, `width={WIDTH}`);
    newAttrs = newAttrs.replace(/\bheight=\{?\d+\}?/i, `height={HEIGHT}`);
    newAttrs = newAttrs.replace(/\bfps=\{?\d+\}?/i, `fps={FPS}`);
    newAttrs = newAttrs.replace(/\bdurationInFrames=\{?\d+\}?/i, `durationInFrames={DURATION}`);
    return `<Composition${newAttrs}>`;
  });

  // 2. Sinkronkan SVG viewBox root agar responsif terhadap WIDTH dan HEIGHT
  cleaned = cleaned.replace(/viewBox=["']\s*0\s+0\s+\d+\s+\d+\s*["']/gi, `viewBox={\`0 0 \${WIDTH} \${HEIGHT}\`}`);
  cleaned = cleaned.replace(/viewBox=\{`\s*0\s+0\s+\d+\s+\d+\s*`\}/gi, `viewBox={\`0 0 \${WIDTH} \${HEIGHT}\`}`);

  // 3. Sinkronkan posisi pusat subjek utama ke center kanvas dinamis (WIDTH / 2, HEIGHT / 2)
  cleaned = cleaned.replace(/(id=["']main-subject-master["'][^>]*transform=["']translate\()\s*\d+\s*,\s*\d+\s*(\))/gi, (match, pre, post) => {
    return `id="main-subject-master" transform={\`translate(\${WIDTH / 2}, \${HEIGHT / 2})\`}`;
  });

  // 4. DETEKSI & SINKRONISASI DETERMINISTIK GOOGLE FONTS & LOCAL FONT (ANTI-FALLBACK TIMES NEW ROMAN)
  const detectedFonts = extractFontFamiliesFromCode(cleaned, previewHtml);
  if (detectedFonts.length > 0 || localFont) {
    // Pastikan 'delayRender' dan 'continueRender' terimpor dari 'remotion'
    cleaned = cleaned.replace(/import\s*\{([^}]+)\}\s*from\s*['"]remotion['"]/g, (match, importsStr) => {
      let imports = importsStr.split(',').map((s: string) => s.trim());
      if (!imports.includes('delayRender')) imports.push('delayRender');
      if (!imports.includes('continueRender')) imports.push('continueRender');
      return `import { ${imports.join(', ')} } from 'remotion'`;
    });

    // Suntikkan delayRender font waiting hook ke komponen utama jika belum ada
    if (!cleaned.includes('document.fonts') && !cleaned.includes('fontReadyHandle')) {
      const compRegex = /(export\s+const\s+[A-Za-z0-9_]+\s*(?::\s*React\.FC[^=]*=|=\s*\([^)]*\)\s*=>)\s*\{)/;
      if (compRegex.test(cleaned)) {
        const fontLoaderHook = localFont
          ? `
  // --- DETERMINISTIC LOCAL CUSTOM FONT & GOOGLE FONT LOADER ---
  // Memuat font lokal "${localFont.familyName}" (${localFont.fileName}) secara deterministik sebelum frame 0 dirender.
  const [fontReadyHandle] = React.useState(() => typeof delayRender === 'function' ? delayRender('WaitCustomLocalFont') : null);
  React.useEffect(() => {
    async function loadFontsDeterministically() {
      try {
        if (typeof FontFace !== 'undefined' && typeof document !== 'undefined' && document.fonts) {
          const customFontFace = new FontFace('${localFont.familyName}', "url('${localFont.dataUrl}')");
          const loadedFace = await customFontFace.load();
          document.fonts.add(loadedFace);
          await document.fonts.ready;
        }
      } catch (e) {}
      if (fontReadyHandle !== null) continueRender(fontReadyHandle);
    }
    loadFontsDeterministically();
  }, [fontReadyHandle]);
`
          : `
  // --- DETERMINISTIC GOOGLE FONT LOADER ---
  // Remotion renders headless Chromium. This pause ensures Google Fonts (${detectedFonts.join(', ')})
  // finish downloading before capturing frame 0, preventing fallback to Times New Roman and font distortion.
  const [fontReadyHandle] = React.useState(() => typeof delayRender === 'function' ? delayRender('WaitGoogleFonts') : null);
  React.useEffect(() => {
    if (typeof document !== 'undefined' && document.fonts && fontReadyHandle !== null) {
      document.fonts.ready.then(() => continueRender(fontReadyHandle)).catch(() => continueRender(fontReadyHandle));
    } else if (fontReadyHandle !== null) {
      continueRender(fontReadyHandle);
    }
  }, [fontReadyHandle]);
`;
        cleaned = cleaned.replace(compRegex, `$1${fontLoaderHook}`);
      }
    }

    // Suntikkan tag <style> @import Google Fonts ke dalam <AbsoluteFill> jika belum ada
    if (detectedFonts.length > 0 && !cleaned.includes('fonts.googleapis.com') && cleaned.includes('<AbsoluteFill')) {
      const fontQuery = detectedFonts
        .filter(f => !localFont || f.toLowerCase() !== localFont.familyName.toLowerCase())
        .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:ital,wght@0,400;0,700;1,400`)
        .join('&');
      if (fontQuery) {
        const styleTag = `<style>{\`@import url('https://fonts.googleapis.com/css2?${fontQuery}&display=swap');\`}</style>`;
        cleaned = cleaned.replace(/(<AbsoluteFill\b[^>]*>)/i, `$1\n      ${styleTag}`);
      }
    }

    // Suntikkan @font-face Base64 untuk Local Font jika localFont aktif
    if (localFont && cleaned.includes('<AbsoluteFill')) {
      // Hapus injeksi local font sebelumnya jika ada agar tidak duplikat
      cleaned = cleaned.replace(/\s*<style id="local-custom-font-style">\{`[\s\S]*?`\}<\/style>/g, '');
      const localFontStyleTag = `<style id="local-custom-font-style">{\`@font-face { font-family: '${localFont.familyName}'; src: url('${localFont.dataUrl}') format('${localFont.format}'); font-weight: 100 900; font-style: normal; font-display: block; }\`}</style>`;
      cleaned = cleaned.replace(/(<AbsoluteFill\b[^>]*>)/i, `$1\n      ${localFontStyleTag}`);
      // Pastikan fontFamily di kode TSX mengarah ke localFont.familyName
      cleaned = cleaned.replace(/fontFamily:\s*['"`][^'"`]+['"`]/g, `fontFamily: "'${localFont.familyName}', sans-serif"`);
    }
  }

  // 5. SAFE AREA & ANTI-CROPPING SAFEGUARD
  // Mencegah teks panjang (seperti 'Congratulations') terpotong di tepi kanvas 4K 16:9
  cleaned = cleaned.replace(/(fontSize:\s*['"`]?)(2[4-9]\d|3\d{2})px?(['"`]?)/gi, (match, pre, numStr, post) => {
    // Kurangi font-size ekstrem (>240px) menjadi skala aman (180px - 200px)
    return `${pre}190px${post}`;
  });

  // Cari posisi penempatan yang tepat: tepat setelah statement import terakhir
  const importRegex = /(?:^|\n)[ \t]*import(?:\s+[\s\S]*?from\s+['"][^'"]+['"]|\s+['"][^'"]+['"])[ \t]*;?/g;
  let lastImportEnd = -1;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(cleaned)) !== null) {
    lastImportEnd = match.index + match[0].length;
  }

  let assembled = '';
  if (lastImportEnd !== -1) {
    const before = cleaned.slice(0, lastImportEnd).trimEnd();
    const after = cleaned.slice(lastImportEnd).trimStart();
    assembled = before + '\n\n' + constantsBlock + '\n\n' + after;
  } else {
    // Fallback jika ada header FFMPEG_CONFIG di baris paling awal
    const ffmpegMatch = cleaned.match(/^[ \t]*\/\/\s*FFMPEG_CONFIG:[^\r\n]*\r?\n/i);
    if (ffmpegMatch) {
      const header = ffmpegMatch[0];
      const rest = cleaned.slice(header.length).trimStart();
      assembled = header + '\n' + constantsBlock + '\n\n' + rest;
    } else {
      assembled = constantsBlock + '\n\n' + cleaned;
    }
  }

  if (bgOverride && bgOverride !== 'none') {
    assembled = applyBgOverrideToTSX(assembled, bgOverride);
  }

  return healTsxSyntaxErrors(assembled);
}

export function parseTsxMetadata(rawContent: string, fileName: string) {
  const cleanFileName = fileName.replace(/\.[^/.]+$/, '').trim();
  let detectedTitle = '';
  const titleMatch = rawContent.match(/(?:export\s+const\s+TITLE\s*=\s*['"]|title:\s*['"])([^'"]+)['"]/);
  if (titleMatch && titleMatch[1]) {
    detectedTitle = titleMatch[1];
  } else {
    detectedTitle = cleanFileName.replace(/[_-]/g, ' ');
  }

  let detectedWidth = 3840;
  let detectedHeight = 2160;
  let detectedFps = 60;
  let detectedDuration = 10;

  const widthMatch = rawContent.match(/(?:WIDTH|width)\s*[:=]\s*(\d+)/);
  if (widthMatch) detectedWidth = parseInt(widthMatch[1]);

  const heightMatch = rawContent.match(/(?:HEIGHT|height)\s*[:=]\s*(\d+)/);
  if (heightMatch) detectedHeight = parseInt(heightMatch[1]);

  const fpsMatch = rawContent.match(/(?:FPS|fps)\s*[:=]\s*(\d+)/);
  if (fpsMatch) detectedFps = parseInt(fpsMatch[1]);

  const durationMatch = rawContent.match(/(?:DURATION|durationInFrames)\s*[:=]\s*(\d+)/);
  if (durationMatch) {
    const durFrames = parseInt(durationMatch[1]);
    detectedDuration = Math.max(1, Math.round(durFrames / (detectedFps || 60)));
  }

  detectedWidth = Math.max(2, Math.floor(detectedWidth / 2) * 2);
  detectedHeight = Math.max(2, Math.floor(detectedHeight / 2) * 2);

  const isLandscape = detectedWidth >= detectedHeight;
  const is4K = detectedWidth >= 3840 || detectedHeight >= 3840;
  const is2K = !is4K && (detectedWidth >= 2560 || detectedHeight >= 2560);
  const resolutionLabel = is4K ? '4K UHD' : is2K ? '2K QHD' : '1080p FHD';

  const formattedTitle = formatFizkesPopovTitle(detectedTitle, {
    brief: detectedTitle,
    is3D: true,
  });

  return {
    cleanFileName,
    detectedTitle,
    formattedTitle,
    detectedWidth,
    detectedHeight,
    detectedFps,
    detectedDuration,
    totalFrames: detectedDuration * detectedFps,
    isLandscape,
    resolutionLabel,
  };
}

const App: React.FC = () => {
  const [mode, setMode] = useState<'reference' | 'prompt'>('prompt'); 
  
  const [reference, setReference] = useState<string | null>(null);
  const [refType, setRefType] = useState<'video' | 'image' | 'svg' | null>(null);
  const [svgCode, setSvgCode] = useState<string | null>(null);
  const [svgMeta, setSvgMeta] = useState<{
    viewBox?: string;
    width?: string | number;
    height?: string | number;
    pathCount?: number;
    fileName?: string;
  } | null>(null);
  const [patchTracedOcclusion, setPatchTracedOcclusion] = useState<boolean>(true);
  const [showSvgPathModal, setShowSvgPathModal] = useState<boolean>(false);
  const [brief, setBrief] = useState<string>("");
  
  // Bulk Prompt Khusus Per Baris (Critical Thinking Mode, aturan baku dinonaktifkan kecuali struktur kode)
  const [isBulkPerLineMode, setIsBulkPerLineMode] = useState<boolean>(false);
  const [bulkPerLineText, setBulkPerLineText] = useState<string>("");

  // Deteksi jumlah baris prompt aktif
  const detectedLineCount = bulkPerLineText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0).length;

  // Bulk Image Reference (Keakuratan 99% Identik & 100% Animasi)
  const [bulkImages, setBulkImages] = useState<BulkImageItem[]>([]);
  const [bulkImagePairingMode, setBulkImagePairingMode] = useState<'sequential' | 'single_for_all'>('sequential');
  const [isDraggingBulkImages, setIsDraggingBulkImages] = useState<boolean>(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Import TSX dari PC States & Refs
  const importTsxFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingTsx, setIsImportingTsx] = useState<boolean>(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);
  const [isDraggingTsx, setIsDraggingTsx] = useState<boolean>(false);

  const processBulkImageFiles = async (files: File[]) => {
    const validFiles = files.filter(
      f => f.type.startsWith('image/') || 
           f.type.startsWith('video/') ||
           f.name.toLowerCase().endsWith('.svg') || 
           f.type === 'image/svg+xml' ||
           f.name.toLowerCase().match(/\.(mp4|webm|mov|mkv)$/i)
    );
    if (validFiles.length === 0) {
      setError("Hanya berkas gambar (PNG, JPG, WebP, SVG) dan video (MP4, WebM, MOV) yang didukung untuk Bulk Reference.");
      return;
    }

    for (const file of validFiles) {
      const isSvg = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';
      const isVideo = file.type.startsWith('video/') || file.name.toLowerCase().match(/\.(mp4|webm|mov|mkv)$/i);
      const sizeKB = (file.size / 1024).toFixed(0);

      if (isSvg) {
        try {
          const svgText = await file.text();
          let pathCount = 0;
          let viewBox = '';
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgText, 'image/svg+xml');
            const svgEl = doc.querySelector('svg');
            viewBox = svgEl?.getAttribute('viewBox') || '';
            pathCount = doc.querySelectorAll('path, polygon, rect, circle, ellipse, polyline').length;
          } catch (e) {}

          const dataUrl = await svgToPngDataUrl(svgText);
          const newImg: BulkImageItem = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: file.name,
            size: `${sizeKB} KB (SVG)`,
            dataUrl,
            mediaType: 'svg',
            mimeType: 'image/svg+xml',
            svgCode: svgText,
            svgMeta: { viewBox, pathCount, fileName: file.name }
          };
          setBulkImages(prev => [...prev, newImg]);
          continue;
        } catch (err) {
          console.warn('SVG bulk read error', err);
        }
      }

      if (isVideo) {
        try {
          const thumb = await generateVideoThumbnail(file);
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const newImg: BulkImageItem = {
              id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              name: file.name,
              size: `${sizeKB} KB (Video)`,
              dataUrl,
              mediaType: 'video',
              mimeType: file.type || 'video/mp4',
              thumbnailUrl: thumb || undefined
            };
            setBulkImages(prev => [...prev, newImg]);
          };
          reader.readAsDataURL(file);
          continue;
        } catch (err) {
          console.warn('Video bulk read error', err);
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newImg: BulkImageItem = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          size: `${sizeKB} KB`,
          dataUrl,
          mediaType: 'image',
          mimeType: file.type || 'image/png'
        };
        setBulkImages(prev => [...prev, newImg]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBulkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processBulkImageFiles(Array.from(files));
    e.target.value = '';
  };

  const handleBulkImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingBulkImages(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processBulkImageFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemoveBulkImage = (id: string) => {
    setBulkImages(prev => prev.filter(img => img.id !== id));
  };

  const handleClearAllBulkImages = () => {
    setBulkImages([]);
  };

  const handleAutoFillPromptsFromImages = () => {
    if (bulkImages.length === 0) return;
    const lines = bulkImages.map((img) => {
      const cleanName = img.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      const isVideo = img.mediaType === 'video' || img.mimeType.startsWith('video/');
      const refDescriptor = isVideo ? `video referensi "${cleanName}"` : `gambar referensi "${cleanName}"`;
      const targetMedia = isVideo ? 'VIDEO REFERENSI' : 'GAMBAR REFERENSI';
      const textInstruction = cleanNoText
        ? 'Jika ada teks/tulisan pada referensi, DILARANG SERTAKAN TEKS TERSEBUT (wajib bersih tanpa teks agar pembeli dapat menaruh judul sendiri).'
        : 'Jika ada teks/tulisan/animasi tipografi pada referensi, SERTAKAN DAN ANIMASIKAN TEKS TERSEBUT 100% penuh sesuai referensi (Kinetic Typography / template footage with text).';
      return `Pahami subjek asli dan alur dinamika gerak secara spesifik dari ${refDescriptor} & animasikan secara totalitas untuk STOCK FOOTAGE KOMERSIAL (Adobe Stock / Shutterstock): Subjek, bentuk visual, dan alur pergerakan kinetik WAJIB 100% PERSIS SETIA PADA ${targetMedia} (DILARANG KERAS MENGARANG BENTUK 3D GENERIK LAIN SEPERTI DONAT TORUS / BOLA MELAYANG). Jika subjek bervolume 3D, pertahankan bentuk aslinya menggunakan Compound 3D Mesh / ExtrudeGeometry atau Volumetric 2.5D Shading PBR dengan pencahayaan sinematik. ${textInstruction} Pahami konteks gerak: tidak semua harus fade in fade out, prioritaskan seamless continuous infinite loop yang terus hidup dan berkesinambungan tanpa redup ke hitam. Rekonstruksi visual dan dinamika gerakan 100% penuh identik tanpa versi minimalis.`;
    });
    setBulkPerLineText(lines.join('\n'));
  };
  
  const [duration, setDuration] = useState<number>(10); 
  const [fps, setFps] = useState<number>(60);
  const [optimizeSVG, setOptimizeSVG] = useState<boolean>(false); 
  const [useGenerativeBgPro, setUseGenerativeBgPro] = useState<boolean>(false);
  const [useSvgVectorOnly, setUseSvgVectorOnly] = useState<boolean>(true);
  const [useNoHudClean, setUseNoHudClean] = useState<boolean>(true);
  const [cleanNoText, setCleanNoText] = useState<boolean>(true);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isVariating, setIsVariating] = useState<boolean>(false);

  // AI Visual Instruction & Code Chat Modifier States
  const [instructionInput, setInstructionInput] = useState<string>('');
  const [isApplyingInstruction, setIsApplyingInstruction] = useState<boolean>(false);
  const [instructionSuccessMsg, setInstructionSuccessMsg] = useState<string | null>(null);
  const [instructionError, setInstructionError] = useState<string | null>(null);
  const [isChatLogExpanded, setIsChatLogExpanded] = useState<boolean>(false);
  const [instructionChatLog, setInstructionChatLog] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    text: string;
    time: string;
    status?: 'success' | 'error' | 'pending';
  }>>([]);
  const [codeUndoHistory, setCodeUndoHistory] = useState<Array<{
    code: string;
    previewHtml: string;
    title: string;
    prompt: string;
  }>>([]);
  
  const [generatedTSXCode, setGeneratedTSXCode] = useState<string>(DEFAULT_REMOTION_TSX);
  const [previewHtmlCode, setPreviewHtmlCode] = useState<string>(DEFAULT_PREVIEW_HTML);
  
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveEditsSuccess, setSaveEditsSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [bgOverride, setBgOverride] = useState<'none' | 'greenscreen' | 'black' | 'white' | 'alpha'>('none');
  const [previewGpuOptimized, setPreviewGpuOptimized] = useState<boolean>(true);
  const [selectedLayoutKey, setSelectedLayoutKey] = useState<LayoutPresetKey>('landscape_4k_60');
  const activeLayoutPreset = LAYOUT_PRESETS.find(p => p.key === selectedLayoutKey) || LAYOUT_PRESETS[0];
  const forceLandscape = activeLayoutPreset.isLandscape;

  // Viewport dimensions for browser preview (Crisp 1080p when optimized, cutting ~75% GPU rasterization without visual loss)
  const previewWidth = previewGpuOptimized 
    ? (activeLayoutPreset.isLandscape ? 1920 : 1080)
    : activeLayoutPreset.width;
  const previewHeight = previewGpuOptimized 
    ? (activeLayoutPreset.isLandscape ? 1080 : 1920)
    : activeLayoutPreset.height;

  const handleSelectLayoutPreset = (presetKey: LayoutPresetKey) => {
    setSelectedLayoutKey(presetKey);
    const preset = LAYOUT_PRESETS.find(p => p.key === presetKey) || LAYOUT_PRESETS[0];
    setFps(preset.fps);
    let updatedCode = generatedTSXCode;
    let updatedHtml = previewHtmlCode;

    if (generatedTSXCode) {
      updatedCode = ensureConfigurationConstants(
        generatedTSXCode,
        duration,
        preset.fps,
        preset.isLandscape,
        preset.resolution,
        preset.width,
        preset.height
      );
      setGeneratedTSXCode(updatedCode);
    }

    if (previewHtmlCode) {
      const targetPreviewW = previewGpuOptimized 
        ? (preset.isLandscape ? 1920 : 1080)
        : preset.width;
      const targetPreviewH = previewGpuOptimized 
        ? (preset.isLandscape ? 1080 : 1920)
        : preset.height;

      updatedHtml = ensurePreviewHtmlResolution(
        previewHtmlCode,
        targetPreviewW,
        targetPreviewH,
        preset.fps,
        duration
      );
      setPreviewHtmlCode(updatedHtml);
    }

    if (selectedBgIndex >= 0 && generatedBgList[selectedBgIndex]) {
      setGeneratedBgList(prev => prev.map((item, idx) => {
        if (idx === selectedBgIndex) {
          return {
            ...item,
            code: updatedCode,
            previewHtml: updatedHtml,
          };
        }
        return item;
      }));
    }

    triggerRecompile(true);
  };
  
  const [isSeamlessBackground, setIsSeamlessBackground] = useState<boolean>(false);
  const [isPremium3D, setIsPremium3D] = useState<boolean>(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState<boolean>(false);
  const [isVariationExpanded, setIsVariationExpanded] = useState<boolean>(false);
  const [isAutoGenerateExpanded, setIsAutoGenerateExpanded] = useState<boolean>(false);
  const [isAutoGenerateEnabled, setIsAutoGenerateEnabled] = useState<boolean>(false);
  const [isAdvancedSettingsExpanded, setIsAdvancedSettingsExpanded] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Standby & Anti-Auto-Refresh Engine States
  const [isStandbyActive, setIsStandbyActive] = useState<boolean>(true);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [isStandbyInfoOpen, setIsStandbyInfoOpen] = useState<boolean>(false);

  // Versi Latar Belakang: Kombinasi Tema vs Non-Kombinasi (Smooth Liquid/Surface)
  const [directGenerateMode, setDirectGenerateMode] = useState<'combination' | 'non-combination'>('non-combination');
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [useCustomConcept, setUseCustomConcept] = useState<boolean>(false);
  const [customConcept, setCustomConcept] = useState<string>("");

  // Motion & Background Style Selector States
  const [selectedIconStyle, setSelectedIconStyle] = useState<string>("Seamless Motion Wave BG");
  const [isStyleAnimationEnabled, setIsStyleAnimationEnabled] = useState<boolean>(false);
  const [styleSearchQuery, setStyleSearchQuery] = useState<string>("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("All");
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!ALL_BACKGROUND_STYLES.includes(selectedIconStyle)) {
      setSelectedIconStyle("Seamless Motion Wave BG");
    }
    setActiveCategoryFilter("All");
  }, []);

  const formatStyleName = (styleName: string): string => {
    if (!styleName) return "Seamless Motion Wave BG";
    return styleName;
  };

  const getCategoryForStyle = (styleName: string): string => {
    const cat = BACKGROUND_STYLE_CATEGORIES.find(c => c.styles.includes(styleName));
    return cat ? cat.name : "Motion BG";
  };

  const getFilteredIconStyles = () => {
    let list = ALL_BACKGROUND_STYLES;
    const categories = BACKGROUND_STYLE_CATEGORIES;

    if (activeCategoryFilter !== "All") {
      const cat = categories.find(c => c.name === activeCategoryFilter);
      if (cat) {
        list = cat.styles;
      }
    }
    if (styleSearchQuery.trim()) {
      const q = styleSearchQuery.toLowerCase().trim();
      list = list.filter(s => s.toLowerCase().includes(q) || formatStyleName(s).toLowerCase().includes(q));
    }
    return list;
  };

  const renderStyleAnimationSelector = () => {
    const currentStyleCount = ALL_BACKGROUND_STYLES.length;
    const currentCategories = BACKGROUND_STYLE_CATEGORIES;

    return (
      <div className={`bg-zinc-950 rounded-xl border transition-colors overflow-hidden ${isStyleAnimationEnabled ? 'border-zinc-800/60' : 'border-zinc-800/30 opacity-75'}`}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/40">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-3.5 h-3.5 ${isStyleAnimationEnabled ? 'text-amber-500' : 'text-zinc-500'}`} />
            <span className={`text-xs font-medium transition-colors ${isStyleAnimationEnabled ? 'text-zinc-200' : 'text-zinc-400'}`}>
              Style Motion & Background
            </span>
          </div>
          
          {/* ON / OFF Toggle Switch */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-bold ${isStyleAnimationEnabled ? 'text-amber-400' : 'text-zinc-500'}`}>
              {isStyleAnimationEnabled ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isStyleAnimationEnabled}
              onClick={() => setIsStyleAnimationEnabled(!isStyleAnimationEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isStyleAnimationEnabled ? 'bg-amber-500' : 'bg-zinc-800'
              }`}
              title={isStyleAnimationEnabled ? "Style Animation Aktif" : "Style Animation Nonaktif"}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                  isStyleAnimationEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-2.5 flex flex-col gap-2">
          {!isStyleAnimationEnabled ? (
            <p className="text-[11px] text-zinc-500 leading-relaxed px-1 py-0.5">
              Generasi animasi akan memproses prompt murni tanpa pembatasan gaya visual.
            </p>
          ) : (
            <>
              {/* Interactive Dropdown Button Trigger */}
              <button
                type="button"
                onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                className="w-full bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 rounded-lg px-2.5 py-2 flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex flex-col text-left truncate">
                    <span className="text-xs font-semibold text-amber-400 truncate">
                      {formatStyleName(selectedIconStyle)}
                    </span>
                    <span className="text-[10px] text-zinc-500 truncate">
                      {getCategoryForStyle(selectedIconStyle)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-amber-400 shrink-0 ml-2">
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {isStyleDropdownOpen ? 'Tutup' : 'Ubah'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isStyleDropdownOpen ? 'rotate-180 text-amber-500' : ''}`} />
                </div>
              </button>

              {/* Expanded Dropdown Panel */}
              {isStyleDropdownOpen && (
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5 flex flex-col gap-2 animate-fade-in">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                    <input 
                      type="text"
                      value={styleSearchQuery}
                      onChange={(e) => setStyleSearchQuery(e.target.value)}
                      placeholder="Cari style motion..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-8 pr-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                      autoFocus
                    />
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {["All", ...currentCategories.map(c => c.name)].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategoryFilter(cat)}
                        className={`px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                          activeCategoryFilter === cat 
                            ? 'bg-amber-500 text-zinc-950 font-semibold shadow-xs' 
                            : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800/60'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Style Items List */}
                  <div className="max-h-44 overflow-y-auto no-scrollbar grid grid-cols-2 gap-1 bg-zinc-950 p-1.5 rounded-md border border-zinc-800/60">
                    {getFilteredIconStyles().length > 0 ? (
                      getFilteredIconStyles().map((styleName) => (
                        <button
                          key={styleName}
                          type="button"
                          onClick={() => {
                            setSelectedIconStyle(styleName);
                            setIsStyleDropdownOpen(false);
                          }}
                          className={`px-2 py-1.5 rounded text-[11px] font-medium text-left transition-all truncate cursor-pointer flex items-center justify-between ${
                            selectedIconStyle === styleName
                              ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                              : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100'
                          }`}
                          title={formatStyleName(styleName)}
                        >
                          <span className="truncate">{formatStyleName(styleName)}</span>
                          {selectedIconStyle === styleName && <Check className="w-3 h-3 shrink-0 ml-1 text-amber-400" />}
                        </button>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-3 text-xs text-zinc-500">
                        Tidak ditemukan
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };
  
  // List of generated background items (for 5 background generation workflow)
  interface GeneratedBackground {
    title: string;
    code: string;
    previewHtml: string;
    detectedObjects: string[];
    suggestedVariations: SuggestedVariationItem[];
    referenceImage?: string | null;
    popovKeywords?: PopovKeywords;
  }
  const [generatedBgList, setGeneratedBgList] = useState<GeneratedBackground[]>([]);
  const [selectedBgIndex, setSelectedBgIndex] = useState<number>(-1);

  const [detectedObjects, setDetectedObjects] = useState<string[]>(["Central HUD Panel", "Dynamic Floating Stars", "Grid Surface Planes"]);
  const [suggestedVariations, setSuggestedVariations] = useState<SuggestedVariationItem[]>(() => {
    return VISUAL_VARIATIONS_POOL.slice(0, 7);
  });
  const [customVariation, setCustomVariation] = useState<string>("");

  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [copiedTitle, setCopiedTitle] = useState<boolean>(false);
  const [isPopovModalOpen, setIsPopovModalOpen] = useState<boolean>(false);
  const [copiedKeywords, setCopiedKeywords] = useState<boolean>(false);
  const [copiedGoldenTags, setCopiedGoldenTags] = useState<boolean>(false);
  const [copiedEmbeddedIptc, setCopiedEmbeddedIptc] = useState<boolean>(false);
  const [savedFilesHistory, setSavedFilesHistory] = useState<SavedFileHistoryItem[]>([]);

  // Project Name Suffix Modes (Centang)
  const [suffixBackground, setSuffixBackground] = useState<boolean>(false);
  const [suffixBackgroundLoop, setSuffixBackgroundLoop] = useState<boolean>(false);

  // Mode Multivariasi Sekaligus & Jumlah Variasi (1, 3, 5, 10, 15, 20)
  const [variationCount, setVariationCount] = useState<number>(10);
  const [generateTenVariations, setGenerateTenVariations] = useState<boolean>(false);

  // Sinkronisasi perubahan editor kembali ke generatedBgList
  useEffect(() => {
    if (selectedBgIndex >= 0 && selectedBgIndex < generatedBgList.length) {
      const current = generatedBgList[selectedBgIndex];
      if (current.code !== generatedTSXCode || current.previewHtml !== previewHtmlCode || current.title !== workspaceName) {
        setGeneratedBgList(prev => {
          const next = [...prev];
          next[selectedBgIndex] = {
            ...next[selectedBgIndex],
            code: generatedTSXCode,
            previewHtml: previewHtmlCode,
            title: workspaceName,
            detectedObjects,
            suggestedVariations
          };
          return next;
        });
      }
    }
  }, [generatedTSXCode, previewHtmlCode, workspaceName, detectedObjects, suggestedVariations, selectedBgIndex]);

  // Playback States
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrame, setCurrentFrame] = useState<number>(0); 
  const currentFrameRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLoopOn, setIsLoopOn] = useState<boolean>(true);
  const isUserManuallyPausedRef = useRef<boolean>(false);

  // Active view tab for responsive screens (mobile/tablet)
  const [activeMobileTab, setActiveMobileTab] = useState<'params' | 'subconcepts' | 'preview' | 'code'>('preview');

  // Visual Spatial Transform Editor States (Pan & Zoom)
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [previewScale, setPreviewScale] = useState<number>(1);

  const generatedTSXCodeRef = useRef<string>(generatedTSXCode);
  const previewHtmlCodeRef = useRef<string>(previewHtmlCode);
  const isAbortedRef = useRef<boolean>(false);

  // Direct Video Render Engine States (Muted, Alpha Channel, ProRes 4444, MP4 H.264, ProRes Small)
  const [isRenderModalOpen, setIsRenderModalOpen] = useState<boolean>(false);
  const [renderCodec, setRenderCodec] = useState<'prores_4444' | 'mp4_h264' | 'prores_small'>('prores_4444');
  const [renderAlphaChannel, setRenderAlphaChannel] = useState<boolean>(false);
  const [renderResolutionMode, setRenderResolutionMode] = useState<'1080p' | '2k' | '4k'>('1080p');
  const [isRenderingVideo, setIsRenderingVideo] = useState<boolean>(false);
  const [renderCurrentFrame, setRenderCurrentFrame] = useState<number>(0);
  const [renderTotalFrames, setRenderTotalFrames] = useState<number>(600);
  const [renderStatusText, setRenderStatusText] = useState<string>('');
  const [renderErrorMsg, setRenderErrorMsg] = useState<string | null>(null);
  const [renderedVideoResult, setRenderedVideoResult] = useState<{
    downloadUrl: string;
    fileName: string;
    sizeMB: string;
    codecLabel: string;
    hasAlpha: boolean;
    extension: string;
    blobUrl?: string;
  } | null>(null);
  const renderAbortRef = useRef<boolean>(false);
  const activeRenderSessionIdRef = useRef<string | null>(null);
  const renderSandboxIframeRef = useRef<HTMLIFrameElement>(null);

  // Bulk TSX Video Render Engine States (Import from PC & Local Storage)
  const [isBulkRenderModalOpen, setIsBulkRenderModalOpen] = useState<boolean>(false);
  const [bulkTsxQueue, setBulkTsxQueue] = useState<BulkTsxItem[]>([]);
  const [isBulkRendering, setIsBulkRendering] = useState<boolean>(false);
  const [bulkRenderCurrentIndex, setBulkRenderCurrentIndex] = useState<number>(-1);
  const [bulkRenderCodec, setBulkRenderCodec] = useState<'prores_4444' | 'mp4_h264' | 'prores_small'>('prores_4444');
  const [bulkRenderAlphaChannel, setBulkRenderAlphaChannel] = useState<boolean>(false);
  const [bulkRenderResolutionMode, setBulkRenderResolutionMode] = useState<'native' | '1080p' | '2k' | '4k'>('native');
  const [bulkAutoDownloadVideos, setBulkAutoDownloadVideos] = useState<boolean>(true);
  const [bulkRenderProgressText, setBulkRenderProgressText] = useState<string>('');
  const [bulkRenderStatusFilter, setBulkRenderStatusFilter] = useState<'all' | 'idle' | 'completed' | 'error'>('all');
  const [isDraggingBulkTsx, setIsDraggingBulkTsx] = useState<boolean>(false);
  const [storedLocalStorageItems, setStoredLocalStorageItems] = useState<StoredTsxRecord[]>([]);
  const [isLoadingLocalStorageTsx, setIsLoadingLocalStorageTsx] = useState<boolean>(false);
  const [bulkRenderErrorMsg, setBulkRenderErrorMsg] = useState<string | null>(null);
  const [bulkSuccessAlert, setBulkSuccessAlert] = useState<string | null>(null);

  // AI Provider & API Keys States (Gemini Bulk, OpenRouter, 9Router)
  const [isAiSettingsModalOpen, setIsAiSettingsModalOpen] = useState<boolean>(false);
  const [aiSettings, setAiSettings] = useState<AISettings>(() => getAISettings());

  const bulkRenderAbortRef = useRef<boolean>(false);
  const bulkRenderActiveSessionRef = useRef<string | null>(null);
  const bulkTsxFileInputRef = useRef<HTMLInputElement>(null);

  // Local Custom Font States (TTF / OTF / WOFF2 / WOFF dari Penyimpanan Lokal PC)
  const [localCustomFonts, setLocalCustomFonts] = useState<LocalCustomFontItem[]>(() => {
    try {
      const saved = localStorage.getItem('vremotion_local_custom_fonts_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedLocalFontId, setSelectedLocalFontId] = useState<string>(() => {
    try {
      return localStorage.getItem('vremotion_selected_local_font_id') || '';
    } catch (e) {
      return '';
    }
  });
  const localFontInputRef = useRef<HTMLInputElement>(null);
  const activeLocalFont = localCustomFonts.find(f => f.id === selectedLocalFontId) || null;

  // Register uploaded local fonts into current window document.fonts so UI preview also renders them
  useEffect(() => {
    localCustomFonts.forEach(fontItem => {
      try {
        if (typeof FontFace !== 'undefined' && document.fonts) {
          const face = new FontFace(fontItem.familyName, `url('${fontItem.dataUrl}')`);
          face.load().then(loaded => {
            document.fonts.add(loaded);
          }).catch(() => {});
        }
      } catch (e) {}
    });
  }, [localCustomFonts]);

  const applyLocalFontToCurrentAnimation = (fontItem: LocalCustomFontItem | null) => {
    if (!generatedTSXCode) return;

    const updatedTSX = ensureConfigurationConstants(
      generatedTSXCode,
      duration,
      fps,
      activeLayoutPreset.isLandscape,
      activeLayoutPreset.resolution,
      activeLayoutPreset.width,
      activeLayoutPreset.height,
      workspaceName,
      undefined,
      bgOverride,
      previewHtmlCode,
      fontItem
    );

    let updatedHTML = previewHtmlCode;
    if (fontItem && updatedHTML) {
      // Replace canvas ctx.font family names or CSS font-family in preview HTML so existing text immediately morphs to local font
      updatedHTML = updatedHTML.replace(
        /(font-family\s*:\s*)([^;}"']+)/gi,
        `$1'${fontItem.familyName}', sans-serif`
      );
      updatedHTML = updatedHTML.replace(
        /(ctx\.font\s*=\s*['"`][^'"`]*?\b\d+(?:\.\d+)?px\s+)([^'"`]+)(['"`])/gi,
        `$1'${fontItem.familyName}'$3`
      );
    }

    setGeneratedTSXCode(updatedTSX);
    setPreviewHtmlCode(updatedHTML);

    if (selectedBgIndex >= 0 && generatedBgList[selectedBgIndex]) {
      setGeneratedBgList(prev => prev.map((item, idx) => {
        if (idx === selectedBgIndex) {
          return { ...item, code: updatedTSX, previewHtml: updatedHTML };
        }
        return item;
      }));
    }
    triggerRecompile(true);
  };

  const handleUploadLocalFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of (Array.from(files) as File[])) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!['ttf', 'otf', 'woff2', 'woff'].includes(ext)) {
        setError('Format font tidak didukung. Gunakan file .TTF, .OTF, .WOFF2, atau .WOFF dari penyimpanan lokal.');
        continue;
      }

      const format: LocalCustomFontItem['format'] =
        ext === 'otf' ? 'opentype' : ext === 'woff2' ? 'woff2' : ext === 'woff' ? 'woff' : 'truetype';
      const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
      const familyName = rawName || `CustomFont_${Date.now()}`;
      const sizeKB = `${(file.size / 1024).toFixed(0)} KB`;

      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const newFont: LocalCustomFontItem = {
        id: `font_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        familyName,
        fileName: file.name,
        dataUrl,
        format,
        sizeKB,
      };

      setLocalCustomFonts(prev => {
        const filtered = prev.filter(f => f.familyName.toLowerCase() !== familyName.toLowerCase());
        const next = [newFont, ...filtered].slice(0, 8);
        try {
          localStorage.setItem('vremotion_local_custom_fonts_v1', JSON.stringify(next));
        } catch (err) {
          console.warn('Local font storage quota warning, keeping in memory:', err);
        }
        return next;
      });

      setSelectedLocalFontId(newFont.id);
      try {
        localStorage.setItem('vremotion_selected_local_font_id', newFont.id);
      } catch (err) {}

      // Auto-disable cleanNoText when user uploads a font for text animation!
      setCleanNoText(false);
      applyLocalFontToCurrentAnimation(newFont);
    }

    e.target.value = '';
  };

  const handleRemoveLocalFont = (idToRemove: string) => {
    setLocalCustomFonts(prev => {
      const next = prev.filter(f => f.id !== idToRemove);
      try {
        localStorage.setItem('vremotion_local_custom_fonts_v1', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    if (selectedLocalFontId === idToRemove) {
      setSelectedLocalFontId('');
      try {
        localStorage.removeItem('vremotion_selected_local_font_id');
      } catch (e) {}
    }
  };

  const handleStopGenerate = () => {
    isAbortedRef.current = true;
    setIsGenerating(false);
    setIsVariating(false);
    setGenerationProgress("");
    clearBulkQueueTask().catch(() => {});
  };

  const handleResetAll = () => {
    isAbortedRef.current = true;
    setIsGenerating(false);
    setIsVariating(false);
    setGenerationProgress("");
    setGeneratedBgList([]);
    setSelectedBgIndex(-1);
    setGeneratedTSXCode(DEFAULT_REMOTION_TSX);
    setPreviewHtmlCode(DEFAULT_PREVIEW_HTML);
    setDetectedObjects([]);
    setSuggestedVariations([]);
    setError(null);
    clearBulkQueueTask().catch(() => {});
    clearActiveDraft().catch(() => {});
  };

  const handleDeleteSubConcept = (indexToDelete: number) => {
    setGeneratedBgList(prev => {
      const nextList = prev.filter((_, i) => i !== indexToDelete);
      if (nextList.length === 0) {
        setSelectedBgIndex(-1);
      } else if (selectedBgIndex === indexToDelete) {
        const nextIdx = Math.min(indexToDelete, nextList.length - 1);
        setSelectedBgIndex(nextIdx);
        const activeItem = nextList[nextIdx];
        if (activeItem) {
          setGeneratedTSXCode(activeItem.code);
          setPreviewHtmlCode(activeItem.previewHtml);
          setDetectedObjects(activeItem.detectedObjects);
          setSuggestedVariations(activeItem.suggestedVariations);
          setWorkspaceName(activeItem.title);
          localStorage.setItem('vremotion_workspace_name', activeItem.title);
          triggerRecompile();
        }
      } else if (selectedBgIndex > indexToDelete) {
        setSelectedBgIndex(selectedBgIndex - 1);
      }
      return nextList;
    });
  };

  const handleDownloadSingleSubConcept = async (idxToDownload: number) => {
    if (idxToDownload < 0 || idxToDownload >= generatedBgList.length) return;
    const bg = generatedBgList[idxToDownload];
    const fileName = getCleanPopovFilename(bg.title);

    try {
      // Simpan berkas TSX mandiri (Metadata IPTC Core sudah tertanam langsung di dalam kode TSX)
      await saveFileToMotionBackgroundsFolder(fileName, healTsxSyntaxErrors(bg.code));

      const date = new Date();
      const formattedDate = date.toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const newRecord: SavedFileHistoryItem = { 
        name: fileName, 
        workspace: bg.title,
        time: formattedDate, 
        size: `${(bg.code.length / 1024).toFixed(1)} KB`,
        type: 'tsx'
      };
      setSavedFilesHistory(prev => {
        const updated = [newRecord, ...prev.slice(0, 14)];
        localStorage.setItem('vremotion_saved_history_v3', JSON.stringify(updated));
        return updated;
      });

      // Otomatis hapus item dari list setelah diunduh
      handleDeleteSubConcept(idxToDownload);
    } catch (err: any) {
      console.error("Gagal mengunduh berkas sub-konsep:", err);
      setError("Gagal menyimpan file ke PC: " + err.message);
    }
  };

  // Handler untuk mengimpor berkas .tsx dari PC
  const handleImportTsxFile = async (file: File) => {
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.tsx') && !lowerName.endsWith('.ts') && !lowerName.endsWith('.jsx') && !lowerName.endsWith('.js')) {
      setError('Mohon pilih berkas dengan format .tsx (Remotion TypeScript JSX).');
      return;
    }

    setIsImportingTsx(true);
    setError(null);
    setImportErrorMsg(null);
    setImportSuccessMsg(null);

    try {
      const rawContent = await file.text();
      if (!rawContent || !rawContent.trim()) {
        throw new Error('Berkas TSX kosong atau tidak dapat dibaca.');
      }

      // 1. Ekstrak nama judul dari metadata atau nama file
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '').trim();
      let detectedTitle = '';
      const titleMatch = rawContent.match(/(?:export\s+const\s+TITLE\s*=\s*['"]|title:\s*['"])([^'"]+)['"]/);
      if (titleMatch && titleMatch[1]) {
        detectedTitle = titleMatch[1];
      } else {
        detectedTitle = cleanFileName.replace(/[_-]/g, ' ');
      }

      // 2. Ekstrak dimensi, fps, dan durasi dari konstanta TSX
      let detectedWidth = 3840;
      let detectedHeight = 2160;
      let detectedFps = 60;
      let detectedDuration = 10;

      const widthMatch = rawContent.match(/(?:WIDTH|width)\s*[:=]\s*(\d+)/);
      if (widthMatch) detectedWidth = parseInt(widthMatch[1]);

      const heightMatch = rawContent.match(/(?:HEIGHT|height)\s*[:=]\s*(\d+)/);
      if (heightMatch) detectedHeight = parseInt(heightMatch[1]);

      const fpsMatch = rawContent.match(/(?:FPS|fps)\s*[:=]\s*(\d+)/);
      if (fpsMatch) detectedFps = parseInt(fpsMatch[1]);

      const durationMatch = rawContent.match(/(?:DURATION|durationInFrames)\s*[:=]\s*(\d+)/);
      if (durationMatch) {
        const durFrames = parseInt(durationMatch[1]);
        detectedDuration = Math.max(1, Math.round(durFrames / detectedFps));
      }

      // 3. Tentukan layout preset yang cocok
      const isLandscape = detectedWidth >= detectedHeight;
      const is4K = detectedWidth >= 3840 || detectedHeight >= 3840;
      let matchedPresetKey: LayoutPresetKey = 'landscape_4k_60';
      if (isLandscape) {
        if (is4K) {
          matchedPresetKey = detectedFps === 30 ? 'landscape_4k_30' : 'landscape_4k_60';
        } else {
          matchedPresetKey = detectedFps === 30 ? 'landscape_2k_30' : 'landscape_2k_60';
        }
      } else {
        if (is4K) {
          matchedPresetKey = detectedFps === 30 ? 'vertical_4k_30' : 'vertical_4k_60';
        } else {
          matchedPresetKey = detectedFps === 30 ? 'vertical_2k_30' : 'vertical_2k_60';
        }
      }

      setSelectedLayoutKey(matchedPresetKey);
      setFps(detectedFps);
      setDuration(detectedDuration);

      const formattedTitle = formatFizkesPopovTitle(detectedTitle, {
        brief: detectedTitle,
        is3D: true,
      });
      setWorkspaceName(formattedTitle);
      localStorage.setItem('vremotion_workspace_name', formattedTitle);

      // 4. Bersihkan dan normalkan sintaks TSX
      const healedTsx = healTsxSyntaxErrors(sanitizeRemotionConstants(rawContent));
      const finalTsx = ensureConfigurationConstants(
        healedTsx,
        detectedDuration,
        detectedFps,
        isLandscape,
        is4K ? '4K' : '2K',
        detectedWidth,
        detectedHeight,
        formattedTitle
      );
      setGeneratedTSXCode(finalTsx);

      // 5. Buat pratinjau instan di sisi klien agar visual langsung tampil dalam 0 detik
      const instantClientHtml = createFastClientPreviewHtmlFromTsx(
        finalTsx,
        detectedWidth,
        detectedHeight,
        detectedFps,
        detectedDuration
      );
      setPreviewHtmlCode(instantClientHtml);

      // 6. Daftarkan ke Bulk Sub-Concepts
      const newConceptItem: GeneratedBackground = {
        title: formattedTitle,
        code: finalTsx,
        previewHtml: instantClientHtml,
        detectedObjects: ['TSX Terimpor dari PC', cleanFileName],
        suggestedVariations: VISUAL_VARIATIONS_POOL.slice(0, 7),
      };

      setGeneratedBgList(prev => [newConceptItem, ...prev]);
      setSelectedBgIndex(0);

      triggerRecompile(true);

      setImportSuccessMsg(`✓ Berkas "${file.name}" berhasil di-import! Pratinjau visual asli aktif dan siap dimodifikasi dengan Chat Editor Instruksi Visual.`);
      setTimeout(() => setImportSuccessMsg(null), 8000);

      // 7. Ambil deteksi objek komersial di latar belakang (tanpa menimpa visual asli jika sandbox berjalan mulus)
      generatePreviewFromTsxService({
        tsxCode: finalTsx,
        title: formattedTitle,
        width: detectedWidth,
        height: detectedHeight,
        fps: detectedFps,
        duration: detectedDuration,
        bgOverride
      }).then(aiRes => {
        if (aiRes) {
          if (aiRes.detectedObjects && aiRes.detectedObjects.length > 0) {
            setDetectedObjects(aiRes.detectedObjects);
            setGeneratedBgList(prev => prev.map((item, i) => i === 0 ? { ...item, detectedObjects: aiRes.detectedObjects } : item));
          }
          // Hanya fallback ke HTML sintesis AI jika terjadi error render pada sandbox komponen asli
          if (aiRes.previewHtml && instantClientHtml.includes('Komponen TSX Terimpor')) {
            const refinedHtml = ensurePreviewHtmlResolution(
              aiRes.previewHtml,
              detectedWidth,
              detectedHeight,
              detectedFps,
              detectedDuration
            );
            setPreviewHtmlCode(refinedHtml);
            setGeneratedBgList(prev => prev.map((item, i) => i === 0 ? { ...item, previewHtml: refinedHtml } : item));
            triggerRecompile(true);
          }
        }
      }).catch(aiErr => {
        console.warn("AI metadata extraction skipped, using authentic client preview:", aiErr);
      });

    } catch (err: any) {
      console.error('Gagal mengimpor file TSX:', err);
      setImportErrorMsg(`Gagal mengimpor berkas TSX: ${err.message}`);
    } finally {
      setIsImportingTsx(false);
    }
  };

  // Helper to persist bulk TSX queue
  const updateAndPersistBulkQueue = (updater: BulkTsxItem[] | ((prev: BulkTsxItem[]) => BulkTsxItem[])) => {
    setBulkTsxQueue((prev) => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      saveBulkTsxQueue(updated).catch(() => {});
      return updated;
    });
  };

  // Process bulk TSX files imported from PC / local disk
  const processBulkTsxFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const validFiles = files.filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.jsx') || name.endsWith('.js');
    });

    if (validFiles.length === 0) {
      setError("Hanya berkas format .tsx, .ts, atau .jsx yang didukung untuk render bulk TSX.");
      return;
    }

    setIsImportingTsx(true);
    setError(null);
    setBulkRenderErrorMsg(null);
    let addedCount = 0;

    const newItems: BulkTsxItem[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const rawContent = await file.text();
        if (!rawContent || !rawContent.trim()) continue;

        const meta = parseTsxMetadata(rawContent, file.name);
        const healedTsx = healTsxSyntaxErrors(sanitizeRemotionConstants(rawContent));
        const finalTsx = ensureConfigurationConstants(
          healedTsx,
          meta.detectedDuration,
          meta.detectedFps,
          meta.isLandscape,
          meta.detectedWidth >= 3840 ? '4K' : '2K',
          meta.detectedWidth,
          meta.detectedHeight,
          meta.formattedTitle
        );

        const instantClientHtml = createFastClientPreviewHtmlFromTsx(
          finalTsx,
          meta.detectedWidth,
          meta.detectedHeight,
          meta.detectedFps,
          meta.detectedDuration
        );

        const newItem: BulkTsxItem = {
          id: `tsx_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          title: meta.formattedTitle,
          code: finalTsx,
          previewHtml: instantClientHtml,
          width: meta.detectedWidth,
          height: meta.detectedHeight,
          fps: meta.detectedFps,
          duration: meta.detectedDuration,
          totalFrames: meta.totalFrames,
          isLandscape: meta.isLandscape,
          resolutionLabel: meta.resolutionLabel,
          status: 'idle',
          importedFrom: 'file',
          importedAt: Date.now(),
        };

        newItems.push(newItem);
        addedCount++;

        // Save to persistent Local Storage library
        saveTsxToStoredLibrary({
          name: file.name,
          title: meta.formattedTitle,
          code: finalTsx,
          source: 'Import Berkas PC'
        }).catch(() => {});

      } catch (err) {
        console.warn(`Gagal memproses file ${file.name}:`, err);
      }
    }

    if (newItems.length > 0) {
      updateAndPersistBulkQueue(prev => [...newItems, ...prev]);
      setIsBulkRenderModalOpen(true);
      setBulkSuccessAlert(`✓ Berhasil mengimpor ${addedCount} berkas TSX dari PC! Siap dirender secara massal.`);
      setTimeout(() => setBulkSuccessAlert(null), 6000);

      // If exactly 1 file was imported, also load into main editor
      if (validFiles.length === 1 && newItems[0]) {
        handleLoadItemIntoEditor(newItems[0], false);
      }
    }

    setIsImportingTsx(false);
  };

  // Load all TSX files found in browser Local Storage & IndexedDB into the bulk render queue
  const handleLoadFromLocalStorage = async () => {
    setIsLoadingLocalStorageTsx(true);
    setBulkRenderErrorMsg(null);
    try {
      const records = await getAllLocalStoredTsxSources();
      if (!records || records.length === 0) {
        setBulkRenderErrorMsg("Tidak ada berkas TSX yang tersimpan di Local Storage saat ini. Silakan simpan draf aktif atau impor berkas .tsx dari PC.");
        setTimeout(() => setBulkRenderErrorMsg(null), 5000);
        return;
      }

      setStoredLocalStorageItems(records);
      let addedCount = 0;
      const newItems: BulkTsxItem[] = [];

      for (const rec of records) {
        if (!rec.code || !rec.code.trim()) continue;

        const meta = parseTsxMetadata(rec.code, rec.name || 'Saved_TSX.tsx');
        const healedTsx = healTsxSyntaxErrors(sanitizeRemotionConstants(rec.code));
        const finalTsx = ensureConfigurationConstants(
          healedTsx,
          meta.detectedDuration,
          meta.detectedFps,
          meta.isLandscape,
          meta.detectedWidth >= 3840 ? '4K' : '2K',
          meta.detectedWidth,
          meta.detectedHeight,
          rec.title || meta.formattedTitle
        );

        const instantClientHtml = createFastClientPreviewHtmlFromTsx(
          finalTsx,
          meta.detectedWidth,
          meta.detectedHeight,
          meta.detectedFps,
          meta.detectedDuration
        );

        const newItem: BulkTsxItem = {
          id: `tsx_local_${rec.id || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: rec.name || `${meta.cleanFileName}.tsx`,
          title: rec.title || meta.formattedTitle,
          code: finalTsx,
          previewHtml: instantClientHtml,
          width: meta.detectedWidth,
          height: meta.detectedHeight,
          fps: meta.detectedFps,
          duration: meta.detectedDuration,
          totalFrames: meta.totalFrames,
          isLandscape: meta.isLandscape,
          resolutionLabel: meta.resolutionLabel,
          status: 'idle',
          importedFrom: 'local_storage',
          importedAt: rec.savedAt || Date.now(),
        };

        newItems.push(newItem);
        addedCount++;
      }

      if (newItems.length > 0) {
        updateAndPersistBulkQueue(prev => {
          // Avoid duplicates by name + code
          const existingCodes = new Set(prev.map(p => p.code.slice(0, 150)));
          const uniqueNew = newItems.filter(item => !existingCodes.has(item.code.slice(0, 150)));
          return [...uniqueNew, ...prev];
        });
        setBulkSuccessAlert(`✓ Berhasil memuat ${addedCount} berkas TSX dari Local Storage & Draft tersimpan!`);
        setTimeout(() => setBulkSuccessAlert(null), 6000);
      }
    } catch (err: any) {
      console.error("Gagal memuat TSX dari Local Storage:", err);
      setBulkRenderErrorMsg(`Gagal membaca Local Storage: ${err.message}`);
    } finally {
      setIsLoadingLocalStorageTsx(false);
    }
  };

  // Save active editor project to persistent Local Storage library
  const handleSaveActiveToLocalStorageLibrary = async () => {
    if (!generatedTSXCode) {
      setBulkRenderErrorMsg("Belum ada kode TSX yang aktif di editor untuk disimpan ke Local Storage.");
      return;
    }

    try {
      const fileName = `${(workspaceName || 'Motion_Background').replace(/[^\w\s-]/g, '').trim() || 'Untitled'}.tsx`;
      const savedRec = await saveTsxToStoredLibrary({
        name: fileName,
        title: workspaceName || 'Motion Background Remotion',
        code: generatedTSXCode,
        source: 'Editor Aktif'
      });

      const meta = parseTsxMetadata(generatedTSXCode, fileName);
      const instantClientHtml = previewHtmlCode || createFastClientPreviewHtmlFromTsx(
        generatedTSXCode,
        meta.detectedWidth,
        meta.detectedHeight,
        meta.detectedFps,
        meta.detectedDuration
      );

      const newItem: BulkTsxItem = {
        id: `tsx_saved_${savedRec.id}`,
        name: fileName,
        title: workspaceName || meta.formattedTitle,
        code: generatedTSXCode,
        previewHtml: instantClientHtml,
        width: meta.detectedWidth,
        height: meta.detectedHeight,
        fps: meta.detectedFps,
        duration: meta.detectedDuration,
        totalFrames: meta.totalFrames,
        isLandscape: meta.isLandscape,
        resolutionLabel: meta.resolutionLabel,
        status: 'idle',
        importedFrom: 'local_storage',
        importedAt: Date.now(),
      };

      updateAndPersistBulkQueue(prev => {
        const filtered = prev.filter(p => p.name !== fileName);
        return [newItem, ...filtered];
      });

      setBulkSuccessAlert(`✓ Berkas "${fileName}" berhasil disimpan ke Local Storage Library & masuk ke antrean render!`);
      setTimeout(() => setBulkSuccessAlert(null), 6000);
    } catch (err: any) {
      console.error("Gagal menyimpan ke Local Storage:", err);
      setBulkRenderErrorMsg(`Gagal menyimpan: ${err.message}`);
    }
  };

  // Load a BulkTsxItem into the main interactive workspace editor
  const handleLoadItemIntoEditor = (item: BulkTsxItem, notify: boolean = true) => {
    setGeneratedTSXCode(item.code);
    if (item.previewHtml) {
      setPreviewHtmlCode(item.previewHtml);
    } else {
      const clientHtml = createFastClientPreviewHtmlFromTsx(
        item.code,
        item.width,
        item.height,
        item.fps,
        item.duration
      );
      setPreviewHtmlCode(clientHtml);
    }

    setWorkspaceName(item.title);
    localStorage.setItem('vremotion_workspace_name', item.title);
    setFps(item.fps);
    setDuration(item.duration);

    const is4K = item.width >= 3840 || item.height >= 3840;
    let matchedPresetKey: LayoutPresetKey = 'landscape_4k_60';
    if (item.isLandscape) {
      if (is4K) {
        matchedPresetKey = item.fps === 30 ? 'landscape_4k_30' : 'landscape_4k_60';
      } else {
        matchedPresetKey = item.fps === 30 ? 'landscape_2k_30' : 'landscape_2k_60';
      }
    } else {
      if (is4K) {
        matchedPresetKey = item.fps === 30 ? 'vertical_4k_30' : 'vertical_4k_60';
      } else {
        matchedPresetKey = item.fps === 30 ? 'vertical_2k_30' : 'vertical_2k_60';
      }
    }
    setSelectedLayoutKey(matchedPresetKey);
    triggerRecompile(true);

    if (notify) {
      setImportSuccessMsg(`✓ Berkas "${item.name}" berhasil dimuat ke editor visual aktif!`);
      setTimeout(() => setImportSuccessMsg(null), 5000);
    }
  };

  // Start sequential Bulk TSX video rendering
  const handleStartBulkRender = async () => {
    if (isBulkRendering || bulkTsxQueue.length === 0) return;

    bulkRenderAbortRef.current = false;
    setIsBulkRendering(true);
    setBulkRenderErrorMsg(null);

    const wasPlaying = isPlaying;
    setIsPlaying(false);

    // Identify items to render
    const itemsToProcess = bulkTsxQueue.filter(item => item.status === 'idle' || item.status === 'error');
    if (itemsToProcess.length === 0) {
      setBulkRenderProgressText("Semua berkas dalam antrean sudah selesai dirender.");
      setIsBulkRendering(false);
      return;
    }

    const codecLabel = bulkRenderCodec === 'prores_4444'
      ? (bulkRenderAlphaChannel ? 'Apple ProRes 4444 (10-bit + Alpha)' : 'Apple ProRes 4444 (10-bit)')
      : bulkRenderCodec === 'prores_small'
        ? (bulkRenderAlphaChannel ? 'Apple ProRes Small (Alpha Compact)' : 'Apple ProRes Small (422 Proxy)')
        : 'MP4 H.264 (High Bitrate)';

    for (let i = 0; i < itemsToProcess.length; i++) {
      if (bulkRenderAbortRef.current) break;

      const currentItem = itemsToProcess[i];
      setBulkRenderCurrentIndex(i);

      // Update current item status to 'rendering'
      updateAndPersistBulkQueue(prev => prev.map(it => it.id === currentItem.id ? {
        ...it,
        status: 'rendering',
        progressFrame: 0,
        progressPercent: 0,
        errorMsg: undefined
      } : it));

      let sessionId = '';

      try {
        setBulkRenderProgressText(`Menyiapkan [${i + 1}/${itemsToProcess.length}]: ${currentItem.name} (${codecLabel} • Muted)...`);

        // Determine target width & height based on settings
        let targetW = currentItem.width;
        let targetH = currentItem.height;

        if (bulkRenderResolutionMode === '1080p') {
          targetW = currentItem.isLandscape ? 1920 : 1080;
          targetH = currentItem.isLandscape ? 1080 : 1920;
        } else if (bulkRenderResolutionMode === '2k') {
          targetW = currentItem.isLandscape ? 2560 : 1440;
          targetH = currentItem.isLandscape ? 1440 : 2560;
        } else if (bulkRenderResolutionMode === '4k') {
          targetW = currentItem.isLandscape ? 3840 : 2160;
          targetH = currentItem.isLandscape ? 2160 : 3840;
        }

        targetW = Math.max(2, Math.floor(targetW / 2) * 2);
        targetH = Math.max(2, Math.floor(targetH / 2) * 2);

        const targetFps = currentItem.fps || 60;
        const targetDuration = currentItem.duration || 10;
        const totalFrames = targetDuration * targetFps;

        const useAlpha = bulkRenderAlphaChannel && (bulkRenderCodec === 'prores_4444' || bulkRenderCodec === 'prores_small');
        const effectiveBgForRender = useAlpha ? 'alpha' : 'none';
        const frameInputFormat = useAlpha ? 'png' : 'jpeg';
        const frameMimeType = useAlpha ? 'image/png' : 'image/jpeg';

        // Prepare Sandbox iframe first
        const finalTsx = ensureConfigurationConstants(
          currentItem.code,
          targetDuration,
          targetFps,
          currentItem.isLandscape,
          targetW >= 3840 ? '4K' : '2K',
          targetW,
          targetH,
          currentItem.title
        );

        const rawHtml = createFastClientPreviewHtmlFromTsx(
          finalTsx,
          targetW,
          targetH,
          targetFps,
          targetDuration
        );

        const renderHtml = injectInteractiveControls(
          ensurePreviewHtmlResolution(rawHtml, targetW, targetH, targetFps, targetDuration),
          effectiveBgForRender
        );

        const sandboxIframe = renderSandboxIframeRef.current;
        if (!sandboxIframe) throw new Error('Elemen sandbox render iframe tidak tersedia.');

        // Cek ketersediaan server FFmpeg (jika di Cloudflare Pages, server tidak ada sehingga pakai browser recorder langsung)
        const isServerUp = await isServerRenderAvailable();

        if (!isServerUp) {
          // Cloudflare Pages Mode: 100% Client-Side In-Browser Video Render (Tanpa API Key, Tanpa Server)
          setBulkRenderProgressText(`[${i + 1}/${itemsToProcess.length}] ${currentItem.name}: Menjalankan Browser Video Recorder (Cloudflare Mode)...`);

          const clientResult = await renderCompositionInBrowser({
            renderHtml,
            width: targetW,
            height: targetH,
            fps: targetFps,
            duration: targetDuration,
            useAlpha,
            sandboxIframe,
            onProgress: (frame, total, pct) => {
              setBulkTsxQueue(prev => prev.map(it => it.id === currentItem.id ? {
                ...it,
                progressFrame: frame,
                progressPercent: pct
              } : it));
              setBulkRenderProgressText(
                `[${i + 1}/${itemsToProcess.length}] ${currentItem.name}: Frame ${frame}/${total} (${pct}%) • Client-Side (Cloudflare Ready)`
              );
            },
            isAborted: () => bulkRenderAbortRef.current,
          });

          const ext = clientResult.extension;
          const cleanBaseName = getCleanPopovFilename(currentItem.title || currentItem.name).replace(/\.tsx$/i, '');
          const finalVideoFileName = `${cleanBaseName}.${ext}`;
          const sizeMB = (Number(clientResult.sizeBytes || 0) / (1024 * 1024)).toFixed(2);
          const downloadUrl = clientResult.url;

          if (bulkAutoDownloadVideos) {
            try {
              await saveBinaryVideoToMotionBackgroundsFolder(finalVideoFileName, clientResult.blob);
            } catch (e) {}
            const a = document.createElement('a');
            a.href = clientResult.url;
            a.download = finalVideoFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }

          const date = new Date();
          const formattedDate = date.toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const newRecord: SavedFileHistoryItem = {
            name: finalVideoFileName,
            workspace: `${currentItem.title} (Browser ${ext.toUpperCase()})`,
            time: formattedDate,
            size: `${sizeMB} MB`,
            type: 'video',
          };
          setSavedFilesHistory(prev => {
            const updated = [newRecord, ...prev.slice(0, 14)];
            localStorage.setItem('vremotion_saved_history_v3', JSON.stringify(updated));
            return updated;
          });

          updateAndPersistBulkQueue(prev => prev.map(it => it.id === currentItem.id ? {
            ...it,
            status: 'completed',
            progressFrame: totalFrames,
            progressPercent: 100,
            renderedVideo: {
              fileName: finalVideoFileName,
              downloadUrl,
              sizeMB: `${sizeMB} MB`,
              codecLabel: `Browser ${ext.toUpperCase()}`,
              hasAlpha: useAlpha,
              extension: ext,
              blobUrl: clientResult.url,
            }
          } : it));

          continue;
        }

        // 1. Start FFmpeg render session (Fullstack Node.js server)
        const kwData = generatePopovKeywords(currentItem.title || currentItem.name);
        const startResp = await fetch('/api/render/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codec: bulkRenderCodec,
            alpha: useAlpha,
            fps: targetFps,
            width: targetW,
            height: targetH,
            title: currentItem.title || currentItem.name,
            keywords: kwData.all,
            inputFormat: frameInputFormat,
          }),
        });

        if (!startResp.ok) {
          const errJson = await startResp.json().catch(() => ({}));
          throw new Error(errJson.error || 'Gagal memulai sesi render FFmpeg di server.');
        }

        const startData = await startResp.json();
        sessionId = startData.sessionId;
        bulkRenderActiveSessionRef.current = sessionId;

        sandboxIframe.style.width = `${targetW}px`;
        sandboxIframe.style.height = `${targetH}px`;

        await new Promise<void>((resolve) => {
          const onLoad = () => {
            sandboxIframe.removeEventListener('load', onLoad);
            resolve();
          };
          sandboxIframe.addEventListener('load', onLoad);
          sandboxIframe.srcdoc = renderHtml;
        });

        const win = sandboxIframe.contentWindow as any;
        if (!win) throw new Error('Gagal mengakses konteks jendela render.');

        if (win.document && win.document.fonts && win.document.fonts.ready) {
          await Promise.race([
            win.document.fonts.ready,
            new Promise(r => setTimeout(r, 1200))
          ]);
        }
        await new Promise(r => setTimeout(r, 200));

        win.postMessage({ type: 'pause' }, '*');

        // 3. Loop deterministic frames
        for (let f = 0; f < totalFrames; f++) {
          if (bulkRenderAbortRef.current) {
            throw new Error('Bulk render dihentikan oleh pengguna.');
          }

          const progress = totalFrames > 0 ? f / totalFrames : 0;
          win.postMessage({ type: 'render', progress, frame: f }, '*');

          await new Promise(r => setTimeout(r, 4));

          if (typeof win.__captureCurrentFrameBlob !== 'function') {
            throw new Error('Fungsi penangkap kanvas tidak tersedia.');
          }

          const blob: Blob | null = await win.__captureCurrentFrameBlob(
            targetW,
            targetH,
            frameMimeType,
            0.92,
            useAlpha
          );

          if (!blob) {
            throw new Error(`Gagal menangkap frame ke-${f}.`);
          }

          const frameResp = await fetch(`/api/render/frame/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': frameMimeType },
            body: blob,
          });

          if (!frameResp.ok) {
            const errJson = await frameResp.json().catch(() => ({}));
            throw new Error(errJson.error || `Gagal mengirim frame ${f} ke FFmpeg.`);
          }

          const pct = Math.round(((f + 1) / totalFrames) * 100);
          if (f % 6 === 0 || f === totalFrames - 1) {
            setBulkTsxQueue(prev => prev.map(it => it.id === currentItem.id ? {
              ...it,
              progressFrame: f + 1,
              progressPercent: pct
            } : it));

            setBulkRenderProgressText(
              `[${i + 1}/${itemsToProcess.length}] ${currentItem.name}: Frame ${f + 1}/${totalFrames} (${pct}%) • ${codecLabel}`
            );
          }
        }

        // 4. Finish encoding
        setBulkRenderProgressText(`Menyelesaikan encoding video: ${currentItem.name}...`);
        const finishResp = await fetch(`/api/render/finish/${sessionId}`, { method: 'POST' });
        if (!finishResp.ok) {
          const errJson = await finishResp.json().catch(() => ({}));
          throw new Error(errJson.error || 'FFmpeg gagal menyelesaikan encoding berkas video.');
        }

        const finishData = await finishResp.json();
        const ext = finishData.extension || (bulkRenderCodec === 'mp4_h264' ? 'mp4' : 'mov');
        const cleanBaseName = getCleanPopovFilename(currentItem.title || currentItem.name).replace(/\.tsx$/i, '');
        const codecSuffix = bulkRenderCodec === 'prores_4444'
          ? (useAlpha ? '_ProRes4444_Alpha' : '_ProRes4444')
          : bulkRenderCodec === 'prores_small'
            ? (useAlpha ? '_ProResSmall_Alpha' : '_ProResSmall')
            : '_H264';
        const finalVideoFileName = `${cleanBaseName}${codecSuffix}.${ext}`;
        const sizeMB = (Number(finishData.sizeBytes || 0) / (1024 * 1024)).toFixed(2);
        const downloadUrl = `${finishData.downloadUrl}?filename=${encodeURIComponent(finalVideoFileName)}`;

        // 5. Download blob for preview & auto-save to PC folder
        let localBlobUrl = '';
        try {
          const videoBlobResp = await fetch(downloadUrl);
          const videoBlob = await videoBlobResp.blob();
          localBlobUrl = URL.createObjectURL(videoBlob);
          if (bulkAutoDownloadVideos) {
            await saveBinaryVideoToMotionBackgroundsFolder(finalVideoFileName, videoBlob);
          }
        } catch (downloadErr) {
          console.warn("Auto-save download video skipped:", downloadErr);
        }

        // 6. Record in saved history
        const date = new Date();
        const formattedDate = date.toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const newRecord: SavedFileHistoryItem = {
          name: finalVideoFileName,
          workspace: `${currentItem.title} (${codecLabel})`,
          time: formattedDate,
          size: `${sizeMB} MB`,
          type: 'video',
        };
        setSavedFilesHistory(prev => {
          const updated = [newRecord, ...prev.slice(0, 14)];
          localStorage.setItem('vremotion_saved_history_v3', JSON.stringify(updated));
          return updated;
        });

        // 7. Mark as completed
        updateAndPersistBulkQueue(prev => prev.map(it => it.id === currentItem.id ? {
          ...it,
          status: 'completed',
          progressFrame: totalFrames,
          progressPercent: 100,
          renderedVideo: {
            fileName: finalVideoFileName,
            downloadUrl,
            sizeMB: `${sizeMB} MB`,
            codecLabel,
            hasAlpha: useAlpha,
            extension: ext,
            blobUrl: localBlobUrl,
          }
        } : it));

        bulkRenderActiveSessionRef.current = null;
      } catch (err: any) {
        console.error(`Error rendering item ${currentItem.name}:`, err);
        if (sessionId) {
          fetch(`/api/render/cancel/${sessionId}`, { method: 'POST' }).catch(() => {});
          bulkRenderActiveSessionRef.current = null;
        }

        updateAndPersistBulkQueue(prev => prev.map(it => it.id === currentItem.id ? {
          ...it,
          status: 'error',
          errorMsg: err.message || 'Terjadi kesalahan saat render.',
        } : it));

        if (bulkRenderAbortRef.current) break;
      }
    }

    setIsBulkRendering(false);
    setBulkRenderCurrentIndex(-1);
    setBulkRenderProgressText('Bulk render selesai!');
    if (wasPlaying) setIsPlaying(true);
  };

  // Cancel bulk render
  const handleCancelBulkRender = async () => {
    bulkRenderAbortRef.current = true;
    const sid = bulkRenderActiveSessionRef.current;
    if (sid) {
      bulkRenderActiveSessionRef.current = null;
      try {
        await fetch(`/api/render/cancel/${sid}`, { method: 'POST' });
      } catch (e) {}
    }
    setIsBulkRendering(false);
    setBulkRenderProgressText('Bulk render dibatalkan.');
  };

  // Batch download all completed videos
  const handleDownloadAllRenderedVideos = () => {
    const completedItems = bulkTsxQueue.filter(
      item => item.status === 'completed' && item.renderedVideo?.downloadUrl
    );

    if (completedItems.length === 0) {
      setBulkRenderErrorMsg("Belum ada video yang selesai dirender untuk diunduh.");
      return;
    }

    completedItems.forEach((item, idx) => {
      if (!item.renderedVideo) return;
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = item.renderedVideo!.downloadUrl;
        a.download = item.renderedVideo!.fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
      }, idx * 400);
    });
  };

  const handleTsxFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
    if (files.length > 1) {
      processBulkTsxFiles(files);
    } else if (files.length === 1 && files[0]) {
      handleImportTsxFile(files[0]);
    }
    e.target.value = '';
  };

  const handleTsxFileDrop = (e: React.DragEvent) => {
    const files = e.dataTransfer.files ? (Array.from(e.dataTransfer.files) as File[]) : [];
    if (files.length > 0) {
      const tsxFiles = files.filter(f => {
        const name = f.name.toLowerCase();
        return name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.jsx');
      });
      if (tsxFiles.length > 1) {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingTsx(false);
        processBulkTsxFiles(tsxFiles);
      } else if (tsxFiles.length === 1 && tsxFiles[0]) {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingTsx(false);
        handleImportTsxFile(tsxFiles[0]);
      }
    }
  };

  useEffect(() => {
    generatedTSXCodeRef.current = generatedTSXCode;
  }, [generatedTSXCode]);

  useEffect(() => {
    previewHtmlCodeRef.current = previewHtmlCode;
  }, [previewHtmlCode]);

  // Handle Dynamic Suffix Appending to Project Name (Workspace Name)
  useEffect(() => {
    if (!workspaceName) return;
    let baseName = workspaceName.trim();
    // Strip existing suffix backgrounds/loops to prevent stacking
    baseName = baseName.replace(/(_background_loop|_background|\s+background\s+loop|\s+background)$/i, "");
    
    let targetName = baseName;
    if (suffixBackgroundLoop) {
      targetName = baseName + " background loop";
    } else if (suffixBackground) {
      targetName = baseName + " background";
    }
    
    if (targetName !== workspaceName) {
      setWorkspaceName(targetName);
    }
  }, [suffixBackground, suffixBackgroundLoop]);

  // Parser: Real-time sync from Code Editor to Interactive Preview
  useEffect(() => {
    // Only run parser if the user is currently editing inside the textarea to avoid state feedback loops
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      return;
    }

    // Try to match: transform: 'translate(100px, -200px) scale(1.5)'
    const match = generatedTSXCode.match(/transform:\s*['"`]translate\((-?\d+)px,\s*(-?\d+)px\)\s*scale\(([\d.]+)\)['"`]/);
    if (match) {
      const parsedX = parseInt(match[1]);
      const parsedY = parseInt(match[2]);
      const parsedZoom = parseFloat(match[3]);

      if (!isNaN(parsedX) && parsedX !== panX) {
        setPanX(parsedX);
      }
      if (!isNaN(parsedY) && parsedY !== panY) {
        setPanY(parsedY);
      }
      if (!isNaN(parsedZoom) && parsedZoom !== zoom) {
        setZoom(parsedZoom);
      }
    }
  }, [generatedTSXCode]);

  // Adjust container scale to fit screen beautifully without any zoom distortion or cropping
  useEffect(() => {
    const updateScale = () => {
      if (previewContainerRef.current) {
        const { clientWidth, clientHeight } = previewContainerRef.current;
        if (clientWidth === 0 || clientHeight === 0) return;
        const targetWidth = previewWidth;
        const targetHeight = previewHeight;
        
        // Reserve safe padding so the video preview card never clips outside container bounds
        const availableW = Math.max(50, clientWidth - 24);
        const availableH = Math.max(50, clientHeight - 24);
        const scaleX = availableW / targetWidth;
        const scaleY = availableH / targetHeight;
        
        // Exact 1:1 proportional fit (anti-zoom-in and anti-zoom-out)
        const fitScale = Math.min(scaleX, scaleY);
        setPreviewScale(Math.max(0.05, fitScale));
      }
    };

    const observer = new ResizeObserver(updateScale);
    if (previewContainerRef.current) {
      observer.observe(previewContainerRef.current);
    }
    
    setTimeout(updateScale, 150);
    
    return () => observer.disconnect();
  }, [previewWidth, previewHeight, activeLayoutPreset.isLandscape]);

  // Cache history, active draft session, and workspace on startup (Self-Healing Recovery)
  useEffect(() => {
    // 1. Load exported history
    const cachedHistory = localStorage.getItem('vremotion_saved_history_v3');
    if (cachedHistory) {
      try {
        const parsed = JSON.parse(cachedHistory);
        // Cap to max 10 records for memory efficiency
        setSavedFilesHistory(Array.isArray(parsed) ? parsed.slice(0, 10) : []);
      } catch (e) {
        console.error("Gagal memuat histori ekspor:", e);
      }
    }

    // 2. Load active draft (prevents auto-refresh loss)
    getActiveDraft().then((draft) => {
      if (!draft) {
        const cachedDraft = localStorage.getItem('vremotion_active_draft_v2');
        if (cachedDraft) {
          try {
            draft = JSON.parse(cachedDraft);
          } catch (e) {}
        }
      }
      if (draft) {
        const draftDur = draft.duration || 10;
        const draftFps = draft.fps || 60;
        const draftPresetKey = (draft.layoutPreset as LayoutPresetKey) || (draft.forceLandscape === false ? 'vertical_4k_60' : 'landscape_4k_60');
        const draftPreset = LAYOUT_PRESETS.find(p => p.key === draftPresetKey) || LAYOUT_PRESETS[0];
        const draftLandscape = draftPreset.isLandscape;

        if (draft.bgOverride) {
          setBgOverride(draft.bgOverride);
        }
        if (draft.layoutPreset && LAYOUT_PRESETS.some(p => p.key === draft.layoutPreset)) {
          setSelectedLayoutKey(draft.layoutPreset as LayoutPresetKey);
        } else if (draft.forceLandscape !== undefined) {
          setSelectedLayoutKey(draft.forceLandscape ? 'landscape_4k_60' : 'vertical_4k_60');
        }

        if (draft.generatedTSXCode) {
          setGeneratedTSXCode(ensureConfigurationConstants(draft.generatedTSXCode, draftDur, draftFps, draftLandscape, draftPreset.resolution, draftPreset.width, draftPreset.height));
        }
        if (draft.previewHtmlCode) setPreviewHtmlCode(draft.previewHtmlCode);
        if (draft.workspaceName) setWorkspaceName(draft.workspaceName);
        if (draft.brief !== undefined) setBrief(draft.brief);
        if (draft.mode !== undefined) setMode(draft.mode);
        if (draft.reference !== undefined) setReference(draft.reference);
        if (draft.refType !== undefined) setRefType(draft.refType);
        if (draft.isPremium3D !== undefined) setIsPremium3D(draft.isPremium3D);
        if (draft.isSeamlessBackground !== undefined) setIsSeamlessBackground(draft.isSeamlessBackground);
        if (draft.generatedBgList && Array.isArray(draft.generatedBgList) && draft.generatedBgList.length > 0) {
          const sanitizedList = draft.generatedBgList.map((bg: any) => ({
            ...bg,
            code: ensureConfigurationConstants(bg.code, draftDur, draftFps, draftLandscape, draftPreset.resolution, draftPreset.width, draftPreset.height)
          }));
          setGeneratedBgList(sanitizedList);
        }
        if (draft.selectedBgIndex !== undefined && typeof draft.selectedBgIndex === 'number') {
          setSelectedBgIndex(draft.selectedBgIndex);
        }
        if (draft.duration) setDuration(draft.duration);
        if (draft.fps) setFps(draft.fps);
        if (draft.selectedIconStyle) setSelectedIconStyle(draft.selectedIconStyle);
        if (draft.isStyleAnimationEnabled !== undefined) setIsStyleAnimationEnabled(draft.isStyleAnimationEnabled);
        if (draft.directGenerateMode) setDirectGenerateMode(draft.directGenerateMode);
        if (draft.useCustomConcept !== undefined) setUseCustomConcept(draft.useCustomConcept);
        if (draft.customConcept !== undefined) setCustomConcept(draft.customConcept);
        if (draft.isBulkPerLineMode !== undefined) setIsBulkPerLineMode(draft.isBulkPerLineMode);
        if (draft.bulkPerLineText !== undefined) setBulkPerLineText(draft.bulkPerLineText);
        if (draft.panX !== undefined) setPanX(draft.panX);
        if (draft.panY !== undefined) setPanY(draft.panY);
        if (draft.zoom !== undefined) setZoom(draft.zoom);
        if (draft.savedAt) setDraftSavedAt(draft.savedAt);
      } else {
        const cachedWorkspace = localStorage.getItem('vremotion_workspace_name');
        if (cachedWorkspace) {
          setWorkspaceName(cachedWorkspace);
        }
      }
    }).catch(err => console.error("Gagal memuat draf tersimpan:", err));

    // 3. Auto-resume bulk generation task if interrupted by refresh/reload
    getBulkQueueTask().then((task) => {
      if (task && task.completedCount < task.totalCount) {
        if (task.inputMode === 'reference' || task.referenceMedia) {
          setMode('reference');
          if (task.referenceMedia) setReference(task.referenceMedia);
          if (task.referenceType) setRefType(task.referenceType);
        }
        if (task.results && task.results.length > 0) {
          const sanitizedResults = task.results.map((res: any) => ({
            ...res,
            code: healTsxSyntaxErrors(res.code)
          }));
          setGeneratedBgList(sanitizedResults);
          if (sanitizedResults[0]) {
            setSelectedBgIndex(0);
            setGeneratedTSXCode(sanitizedResults[0].code);
            setPreviewHtmlCode(sanitizedResults[0].previewHtml);
            setDetectedObjects(sanitizedResults[0].detectedObjects || []);
            setSuggestedVariations(sanitizedResults[0].suggestedVariations || []);
            setWorkspaceName(sanitizedResults[0].title);
          }
        }
        resumeBulkTask(task);
      }
    }).catch(err => console.error("Error checking bulk queue:", err));

    // 4. Auto-load stored bulk TSX render queue from IndexedDB / localStorage
    getBulkTsxQueue().then((queue) => {
      if (queue && queue.length > 0) {
        setBulkTsxQueue(queue);
      }
    }).catch(err => console.warn("Error loading bulk TSX queue:", err));

    // 5. Preload stored TSX library items from local storage
    getStoredTsxLibrary().then((items) => {
      if (items && items.length > 0) {
        setStoredLocalStorageItems(items);
      }
    }).catch(err => console.warn("Error loading stored TSX library:", err));
  }, []);

  // Resumes incomplete bulk generation task after page refresh/reload
  const resumeBulkTask = async (task: BulkQueueTask) => {
    isAbortedRef.current = false;
    setIsGenerating(true);
    setError(null);
    setGenerationProgress(`Melanjutkan: Membuat variasi ${task.completedCount + 1} dari ${task.totalCount}...`);

    const reqMode = task.inputMode || (task.referenceMedia ? 'reference' : 'prompt');
    const reqRef = task.referenceMedia || null;
    const reqRefType = task.referenceType || null;

    if (reqMode === 'reference' || reqRef) {
      setMode('reference');
      if (reqRef) setReference(reqRef);
      if (reqRefType) setRefType(reqRefType);
    }

    const results = [...task.results];
    const count = task.totalCount;
    const usedArchetypes: string[] = task.usedArchetypes || [];

    try {
      for (let idx = task.completedCount; idx < count; idx++) {
        if (isAbortedRef.current) break;
        setGenerationProgress(`Sedang membuat variasi ${idx + 1} dari ${count} (Lanjutan)...`);

        const isCustomBulkPerLine = task.mode === 'bulk_per_line' || !!task.isBulkPerLine;
        const activeStyle = (!isCustomBulkPerLine && (task.isStyleAnimationEnabled || task.selectedIconStyle))
          ? formatStyleName(task.selectedIconStyle)
          : undefined;

        let bgPrompt: string;
        let bgTitle: string;

        if (isCustomBulkPerLine && task.bulkLinePrompts && task.bulkLinePrompts[idx]) {
          bgPrompt = task.bulkLinePrompts[idx];
          bgTitle = `baris_${idx + 1}`;
        } else if (task.mode === 'auto_generate') {
          const bgData = task.useCustomConcept
            ? generateStrictCustomConceptPrompt(idx, task.customConcept, task.isPremium3D, activeStyle, usedArchetypes)
            : task.directGenerateMode === 'combination'
              ? generateRandomMicrostockBackgroundPrompt(task.isPremium3D, undefined, activeStyle, idx, usedArchetypes)
              : generateSmoothLiquidBackgroundPrompt(task.isPremium3D, undefined, activeStyle, idx, usedArchetypes);
          bgPrompt = bgData.prompt;
          bgTitle = bgData.title;
        } else {
          let briefForVariation = task.activeBrief;
          if (task.activeBrief.trim()) {
            briefForVariation = `${task.activeBrief}\n\n[VARIASI UNIK ${idx + 1} DARI ${count}]: Rancang variasi ke-${idx + 1} ini agar memiliki identitas visual unik.`;
          } else {
            briefForVariation = `Ciptakan variasi animasi simulasi ke-${idx + 1} dari ${count}.`;
          }
          bgPrompt = briefForVariation;
          bgTitle = `variasi_${idx + 1}`;
        }

        const taskPreset = LAYOUT_PRESETS.find(p => p.key === task.layoutPreset) 
          || (task.forceLandscape === false ? LAYOUT_PRESETS[4] : LAYOUT_PRESETS[0]);

        const responseData = await generateAnimationService({
          mode: reqRef ? 'reference' : 'prompt',
          reference: reqRef,
          refType: reqRefType,
          brief: bgPrompt,
          duration: task.duration,
          fps: task.fps,
          optimizeSVG: isCustomBulkPerLine ? false : optimizeSVG,
          useGenerativeBgPro: isCustomBulkPerLine ? false : true,
          useSvgVectorOnly,
          useNoHudClean: true,
          bgOverride: (task.bgOverride as any) || bgOverride,
          forceLandscape: taskPreset.isLandscape,
          resolution: taskPreset.resolution,
          targetWidth: taskPreset.width,
          targetHeight: taskPreset.height,
          isSeamlessBackground,
          isPremium3D: task.isPremium3D,
          iconStyle: activeStyle,
          isCustomBulkPerLine,
        });

        if (isAbortedRef.current) break;

        if (!responseData.code || !responseData.previewHtml) {
          throw new Error(`Gagal menghasilkan animasi ke-${idx + 1}`);
        }

        const formattedTitle = formatFizkesPopovTitle(responseData.suggestedTitle || bgTitle, {
          brief: bgPrompt,
          is3D: isPremium3D,
        });

        let finalCode = ensureConfigurationConstants(
          responseData.code,
          task.duration,
          task.fps,
          taskPreset.isLandscape,
          taskPreset.resolution,
          taskPreset.width,
          taskPreset.height,
          formattedTitle
        );
        const newBg = {
          title: formattedTitle,
          code: finalCode,
          previewHtml: responseData.previewHtml,
          detectedObjects: responseData.detectedObjects || [],
          suggestedVariations: ensureSevenVariations(responseData.suggestedVariations || [])
        };

        results.push(newBg);
        setGeneratedBgList([...results]);

        if (results.length === 1 || idx === task.completedCount) {
          setSelectedBgIndex(0);
          setGeneratedTSXCode(newBg.code);
          setPreviewHtmlCode(newBg.previewHtml);
          setDetectedObjects(newBg.detectedObjects);
          setSuggestedVariations(newBg.suggestedVariations);
          setWorkspaceName(newBg.title);
          triggerRecompile(true);
        }

        await saveBulkQueueTask({
          ...task,
          completedCount: idx + 1,
          results: [...results],
          usedArchetypes: [...usedArchetypes],
          inputMode: reqMode,
          referenceMedia: reqRef,
          referenceType: reqRefType,
          bulkLinePrompts: task.bulkLinePrompts,
          isBulkPerLine: isCustomBulkPerLine,
          updatedAt: Date.now()
        });
      }

      if (!isAbortedRef.current) {
        await clearBulkQueueTask();
        setSelectedBgIndex(0);
      }
      setGenerationProgress("");
    } catch (err: any) {
      if (isAbortedRef.current) return;
      setError("Masalah generasi background: " + err.message);
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  // Debounced Real-time Auto-Save Draft to IndexedDB & LocalStorage (Anti-Auto-Refresh Engine)
  useEffect(() => {
    const timer = setTimeout(() => {
      const draftData = {
        generatedTSXCode,
        previewHtmlCode,
        workspaceName,
        brief,
        mode,
        reference,
        refType,
        isPremium3D,
        isSeamlessBackground,
        generatedBgList,
        selectedBgIndex,
        duration,
        fps,
        selectedIconStyle,
        isStyleAnimationEnabled,
        directGenerateMode,
        useCustomConcept,
        customConcept,
        isBulkPerLineMode,
        bulkPerLineText,
        panX,
        panY,
        zoom,
        forceLandscape,
        layoutPreset: selectedLayoutKey,
        bgOverride,
        resolution: activeLayoutPreset.resolution,
        savedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      saveActiveDraft(draftData);
      setDraftSavedAt(draftData.savedAt);
    }, 500);

    return () => clearTimeout(timer);
  }, [
    generatedTSXCode, previewHtmlCode, workspaceName, brief,
    mode, reference, refType, isPremium3D, isSeamlessBackground,
    generatedBgList, selectedBgIndex, duration, fps,
    selectedIconStyle, isStyleAnimationEnabled, directGenerateMode,
    useCustomConcept, customConcept, isBulkPerLineMode, bulkPerLineText, panX, panY, zoom,
    selectedLayoutKey, bgOverride
  ]);

  // Keep-Alive Heartbeat, Screen Wake Lock & Tab Recovery (Standby Anti-Reload & Anti-Sleep Protection)
  useEffect(() => {
    let wakeLockObj: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          if (!wakeLockObj || wakeLockObj.released) {
            wakeLockObj = await (navigator as any).wakeLock.request('screen');
          }
        }
      } catch (err) {
        // Wake lock optional in sandboxed browser environments
      }
    };

    requestWakeLock();

    // Background Web Worker Keep-Alive (kebal dari throttling/sleep tab Chrome & Edge saat di background)
    let keepAliveWorker: Worker | null = null;
    let heartbeatTick = 0;
    try {
      const workerCode = `
        var timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!timer) timer = setInterval(function() { self.postMessage('heartbeat'); }, 1000);
          } else if (e.data === 'stop') {
            if (timer) { clearInterval(timer); timer = null; }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      keepAliveWorker = new Worker(workerUrl);
      keepAliveWorker.postMessage('start');
      keepAliveWorker.onmessage = () => {
        heartbeatTick++;
        // Kirim heartbeat ke iframe setiap 3 detik
        if (heartbeatTick % 3 === 0 && iframeRef.current && iframeRef.current.contentWindow) {
          try {
            iframeRef.current.contentWindow.postMessage({ type: 'standby_heartbeat', timestamp: Date.now() }, '*');
          } catch (e) {}
        }
        // Jika standby aktif dan tidak dipause manual oleh pengguna, pastikan playback tidak mati sendiri
        if (isStandbyActive && !isUserManuallyPausedRef.current && !isPlaying) {
          setIsPlaying(true);
        }
      };
    } catch (e) {
      // Fallback timer jika worker dibatasi lingkungan sandboxed
    }

    // Periodic Heartbeat Ping fallback
    const heartbeatInterval = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({ type: 'standby_heartbeat', timestamp: Date.now() }, '*');
        } catch (e) {
          // ignore cross-origin error if any
        }
      }
      if (isStandbyActive && !isUserManuallyPausedRef.current && !isPlaying) {
        setIsPlaying(true);
      }
    }, 2000);

    // Prevent accidental page reload or tab closure when generating or modifying
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating || isVariating) {
        e.preventDefault();
        e.returnValue = 'Proses pembuatan animasi sedang berjalan. Yakin ingin meninggalkan halaman?';
        return e.returnValue;
      }
    };

    // Re-synchronize canvas, re-acquire wake lock & unfreeze playback when tab becomes visible after standby
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
        if (isStandbyActive && !isUserManuallyPausedRef.current) {
          setIsPlaying(true);
        }
        if (iframeRef.current && iframeRef.current.contentWindow) {
          const totalFrames = duration * fps;
          const progressValue = totalFrames > 0 ? Math.min(1, Math.max(0, currentFrameRef.current / totalFrames)) : 0;
          iframeRef.current.contentWindow.postMessage({
            type: 'render',
            progress: progressValue,
            frame: Math.floor(currentFrameRef.current)
          }, '*');
          iframeRef.current.contentWindow.postMessage({
            type: 'apply_visual_editor_transform',
            translateX: panX,
            translateY: panY,
            scale: zoom
          }, '*');
        }
      }
    };

    const handleWindowFocus = () => {
      requestWakeLock();
      if (isStandbyActive && !isUserManuallyPausedRef.current) {
        setIsPlaying(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(heartbeatInterval);
      if (keepAliveWorker) {
        keepAliveWorker.postMessage('stop');
        keepAliveWorker.terminate();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      if (wakeLockObj && typeof wakeLockObj.release === 'function') {
        wakeLockObj.release().catch(() => {});
      }
    };
  }, [isGenerating, isVariating, duration, fps, panX, panY, zoom, isStandbyActive, isPlaying]);

  // Frame simulation renderer (GPU-Optimized: zero background loops when paused or tab hidden)
  useEffect(() => {
    let animId: number | null = null;
    let lastTime = performance.now();

    // Pause animation when user switches tabs or minimizes browser
    const handleVisibility = () => {
      if (document.hidden) {
        if (animId !== null) {
          cancelAnimationFrame(animId);
          animId = null;
        }
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'pause' }, '*');
        }
      } else if (isPlaying && !animId) {
        lastTime = performance.now();
        animId = requestAnimationFrame(renderLoop);
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'play' }, '*');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const renderLoop = (now: number) => {
      if (!isPlaying || document.hidden) {
        animId = null;
        return;
      }

      // Batasi deltaMs maksimal 100ms agar saat tab berpindah tidak terjadi loncatan frame ekstrem yang memicu pause
      const deltaMs = Math.min(100, Math.max(0, now - lastTime));
      const totalFrames = duration * fps;
      const framesToAdvance = (deltaMs / 1000) * fps * playbackSpeed;
      
      let nextFrame = currentFrameRef.current + framesToAdvance;
      if (nextFrame >= totalFrames) {
        if (isLoopOn || isStandbyActive) {
          nextFrame = nextFrame % totalFrames;
        } else {
          setIsPlaying(false);
          nextFrame = totalFrames;
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ type: 'pause' }, '*');
          }
          animId = null;
          return;
        }
      }
      currentFrameRef.current = nextFrame;

      // 1. Direct postMessage to iframe at target fps without React state re-rendering
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const progressValue = totalFrames > 0 ? Math.min(1, Math.max(0, nextFrame / totalFrames)) : 0;
        iframeRef.current.contentWindow.postMessage({
          type: 'render',
          progress: progressValue,
          frame: Math.floor(nextFrame)
        }, '*');
      }

      // 2. Throttle React state update to ~100ms interval for scrubber UI display, saving massive CPU & RAM
      if (now - lastUiUpdateRef.current > 100) {
        lastUiUpdateRef.current = now;
        setCurrentFrame(nextFrame);
      }

      lastTime = now;
      animId = requestAnimationFrame(renderLoop);
    };

    if (isPlaying && !document.hidden) {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'play' }, '*');
      }
      animId = requestAnimationFrame(renderLoop);
    } else {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'pause' }, '*');
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, [isPlaying, playbackSpeed, isLoopOn, isStandbyActive, duration, fps]);

  // Sync current progress to iframe and keep currentFrameRef in sync
  useEffect(() => {
    currentFrameRef.current = currentFrame;
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const totalFrames = duration * fps;
      const progressValue = totalFrames > 0 ? Math.min(1, Math.max(0, currentFrame / totalFrames)) : 0;
      
      iframeRef.current.contentWindow.postMessage({
        type: 'render',
        progress: progressValue,
        frame: Math.floor(currentFrame)
      }, '*');
    }
  }, [currentFrame, duration, fps]);

  // Inject user's live transform parameters into the preview sandbox dynamically
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'apply_visual_editor_transform',
        translateX: panX,
        translateY: panY,
        scale: zoom
      }, '*');
    }
  }, [panX, panY, zoom, previewHtmlCode]);

  const injectInteractiveControls = (
    htmlCode: string,
    bgOverrideParam?: 'none' | 'greenscreen' | 'black' | 'white' | 'alpha'
  ): string => {
    if (!htmlCode) return htmlCode;
    const effectiveBgOverride = bgOverrideParam !== undefined ? bgOverrideParam : bgOverride;
    const totalCalculatedFrames = duration * fps;

    // Head script for Three.js importmap, Three.js UMD library, and WebGL Context Guard
    const threeAndContextHead = `
    <!-- Three.js & WebGL Engine Runtime Loader -->
    <script type="importmap">
    {
      "imports": {
        "three": "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js",
        "three/": "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/",
        "three/examples/jsm/": "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/"
      }
    }
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <script id="three-webgl-guard">
    (function() {
      // 1. Hook HTMLCanvasElement.prototype.getContext to prevent 2D/WebGL conflicts
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, attrs) {
        if (type === '2d') {
          this.__has2dContext = true;
          // Check if this canvas is attached to DOM or is the display canvas
          const isDisplayCanvas = (this.id === 'canvas' || this.id === 'bg-canvas' || (this.parentElement && (this.parentElement.id === 'visual-editor-wrapper' || this.parentElement === document.body)));
          const bgMode = "${effectiveBgOverride}";
          if (bgMode === 'alpha' && isDisplayCanvas) {
            attrs = Object.assign({}, attrs, { alpha: true });
          }
          const ctx = origGetContext.call(this, type, attrs);
          // ONLY hook fillRect if this is the display canvas! Offscreen canvases (e.g. 2048x1024 flag textures) MUST NOT be mutated!
          if (isDisplayCanvas && ctx && !ctx.__bgHooked && bgMode && bgMode !== 'none') {
            ctx.__bgHooked = true;
            const origFillRect = ctx.fillRect;
            const origClearRect = ctx.clearRect;
            ctx.fillRect = function(x, y, w, h) {
              const cw = ctx.canvas ? ctx.canvas.width : 0;
              const ch = ctx.canvas ? ctx.canvas.height : 0;
              const isFullCanvas = (x <= 30 && y <= 30 && w >= (cw - 60) && h >= (ch - 60));
              if (isFullCanvas) {
                if (bgMode === 'alpha') return origClearRect.call(ctx, 0, 0, cw, ch);
                if (bgMode === 'greenscreen') {
                  ctx.save(); ctx.fillStyle = '#00ff00'; origFillRect.call(ctx, 0, 0, cw, ch); ctx.restore(); return;
                }
                if (bgMode === 'black') {
                  ctx.save(); ctx.fillStyle = '#000000'; origFillRect.call(ctx, 0, 0, cw, ch); ctx.restore(); return;
                }
                if (bgMode === 'white') {
                  ctx.save(); ctx.fillStyle = '#ffffff'; origFillRect.call(ctx, 0, 0, cw, ch); ctx.restore(); return;
                }
              }
              return origFillRect.apply(ctx, arguments);
            };
          }
          return ctx;
        }

        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          this.__hasWebglContext = true;
          attrs = Object.assign({
            alpha: true,
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance'
          }, attrs);
          const gl = origGetContext.call(this, type, attrs);
          if (gl && !gl.__webglHooked) {
            gl.__webglHooked = true;
            const bgMode = "${effectiveBgOverride}";
            if (bgMode === 'alpha') {
              const origClearColor = gl.clearColor;
              gl.clearColor = function(r, g, b, a) {
                return origClearColor.call(gl, 0, 0, 0, 0);
              };
            }
          }
          return gl;
        }

        return origGetContext.call(this, type, attrs);
      };

      // 2. Three.js Auto-Healer: Prevents pitch-black unlit materials, culling, and clipped camera views
      function initThreeGuard() {
        if (typeof THREE === 'undefined' || !THREE.WebGLRenderer || THREE.WebGLRenderer.__guarded) return;

        const OrigWebGLRenderer = THREE.WebGLRenderer;
        THREE.WebGLRenderer = function(parameters) {
          const opts = Object.assign({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
          }, parameters);

          // If no canvas was specified, look for default canvas in DOM
          if (!opts.canvas) {
            const domCanvas = document.getElementById('canvas') || document.getElementById('bg-canvas') || document.querySelector('canvas');
            if (domCanvas && !domCanvas.__has2dContext) {
              opts.canvas = domCanvas;
            }
          }

          const renderer = new OrigWebGLRenderer(opts);
          window.__activeThreeRenderer = renderer;

          const origRender = renderer.render;
          renderer.render = function(scene, camera) {
            window.__activeThreeScene = scene;
            window.__activeThreeCamera = camera;

            if (scene && scene.isScene) {
              // Mesh Material & Canvas Texture Safety Guard
              scene.traverse(function(obj) {
                if (obj.isMesh && obj.material) {
                  const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                  for (let i = 0; i < mats.length; i++) {
                    const m = mats[i];
                    if (!m) continue;
                    // Force DoubleSide so sinusoidal deformed cloth folds and grazing camera angles are never culled!
                    if (m.side !== THREE.DoubleSide) {
                      m.side = THREE.DoubleSide;
                      m.needsUpdate = true;
                    }
                    // If map is a canvas texture or offscreen canvas, ensure it's marked for upload
                    if (m.map) {
                      m.map.needsUpdate = true;
                    }
                  }
                }
              });

              // Lighting Safety Guard: Add soft lights if scene has lit materials but zero lights
              let totalAmbient = 0;
              let hasLights = false;
              scene.traverse(function(obj) {
                if (obj.isLight) {
                  hasLights = true;
                  if (obj.isAmbientLight) totalAmbient += (obj.intensity || 0);
                }
              });

              if (!hasLights && !scene.__autoLightsAdded) {
                scene.__autoLightsAdded = true;
                const amb = new THREE.AmbientLight(0xffffff, 1.4);
                amb.name = '__autoAmbientLight';
                scene.add(amb);

                const dir = new THREE.DirectionalLight(0xffffff, 1.8);
                dir.position.set(5, 10, 7);
                dir.name = '__autoDirectionalLight';
                scene.add(dir);

                const back = new THREE.DirectionalLight(0xffffff, 0.8);
                back.position.set(-5, -5, -5);
                back.name = '__autoBackLight';
                scene.add(back);
              } else if (totalAmbient < 0.6 && !scene.__autoFillAdded) {
                // If ambient light is dim (e.g. 0.25 as requested in prompt) which would cause folds to turn pure black,
                // add a subtle hemisphere fill light to illuminate folds from below without washing out the colors
                scene.__autoFillAdded = true;
                const fillHemi = new THREE.HemisphereLight(0xffffff, 0x444455, 0.75);
                fillHemi.name = '__autoFillHemi';
                scene.add(fillHemi);
                const fillFront = new THREE.DirectionalLight(0xffffff, 0.5);
                fillFront.position.set(0, 0, 10);
                fillFront.name = '__autoFillFront';
                scene.add(fillFront);
              }

              // Camera Safety Guard: If camera is at (0, 0, 0) or clipped inside a large mesh (e.g. 2048 units), reposition
              if (camera && camera.isCamera && !scene.__cameraFramed) {
                scene.__cameraFramed = true;
                if (camera.position.x === 0 && camera.position.y === 0 && camera.position.z === 0) {
                  camera.position.set(0, 0, 5);
                  camera.lookAt(0, 0, 0);
                }
                if (camera.isPerspectiveCamera) {
                  const box = new THREE.Box3().setFromObject(scene);
                  if (!box.isEmpty()) {
                    const size = box.getSize(new THREE.Vector3());
                    const center = box.getCenter(new THREE.Vector3());
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const w = renderer.domElement ? (renderer.domElement.width || 1920) : 1920;
                    const h = renderer.domElement ? (renderer.domElement.height || 1080) : 1080;
                    const currentAspect = w / h;
                    if (Math.abs(camera.aspect - currentAspect) > 0.001) {
                      camera.aspect = currentAspect;
                      camera.updateProjectionMatrix();
                    }
                    const fovRad = ((camera.fov || 45) * Math.PI) / 180;
                    const vDist = (size.y / 2) / Math.tan(fovRad / 2);
                    const hDist = (size.x / 2) / (Math.tan(fovRad / 2) * currentAspect);
                    const fitDist = Math.max(vDist, hDist);
                    if (camera.far < fitDist * 8) {
                      camera.far = Math.max(5000, fitDist * 10);
                      camera.updateProjectionMatrix();
                    }
                    const curDist = camera.position.distanceTo(center);
                    // If camera was placed inside the mesh (e.g. mesh is 2048 units, but camera is at 5 units)
                    if (curDist < fitDist * 0.25 || curDist === 0 || isNaN(curDist)) {
                      camera.position.set(center.x, center.y - fitDist * 0.08, center.z + fitDist * 1.15);
                      camera.lookAt(center);
                      camera.updateProjectionMatrix();
                    }
                  }
                  if (!camera.aspect || isNaN(camera.aspect) || camera.aspect <= 0) {
                    const w = renderer.domElement ? (renderer.domElement.width || 1920) : 1920;
                    const h = renderer.domElement ? (renderer.domElement.height || 1080) : 1080;
                    camera.aspect = w / h;
                    camera.updateProjectionMatrix();
                  }
                }
              }
            }

            if (camera && camera.isPerspectiveCamera && renderer.domElement) {
              const curAspect = renderer.domElement.width / renderer.domElement.height;
              if (curAspect > 0 && Math.abs(camera.aspect - curAspect) > 0.001) {
                camera.aspect = curAspect;
                camera.updateProjectionMatrix();
              }
            }

            return origRender.call(renderer, scene, camera);
          };

          return renderer;
        };
        THREE.WebGLRenderer.prototype = OrigWebGLRenderer.prototype;
        THREE.WebGLRenderer.__guarded = true;
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThreeGuard);
      } else {
        initThreeGuard();
      }
    })();
    </script>
    `;

    const customSyncScript = `
    <script>
    (function() {
      let isExternallyDriven = false;
      let isPaused = ${!isPlaying};
      let currentProgress = 0;
      let internalRafId = null;
      const TOTAL_FRAMES_TARGET = ${totalCalculatedFrames};

      // 1. Resolve animation function across all common names and patterns
      function resolveDrawFunction() {
        if (typeof window.draw === 'function') return window.draw;
        if (typeof window.render === 'function') return window.render;
        if (typeof window.renderFrame === 'function') {
          return function(p, f) { window.renderFrame(f !== undefined ? f : Math.floor(p * TOTAL_FRAMES_TARGET), p); };
        }
        if (typeof window.updateProgress === 'function') return window.updateProgress;
        if (typeof window.animate === 'function') return window.animate;
        if (typeof window.update === 'function') return window.update;
        if (typeof window.step === 'function') return window.step;
        if (typeof window.tick === 'function') return window.tick;

        // Auto-bridge for Three.js WebGL rendering if draw was not explicitly exposed
        if (window.__activeThreeRenderer && window.__activeThreeScene && window.__activeThreeCamera) {
          return function(progress, frame) {
            if (typeof window.animate === 'function') {
              try { window.animate(progress, frame); } catch(e) {}
            } else if (typeof window.update === 'function') {
              try { window.update(progress, frame); } catch(e) {}
            }
            if (window.__activeThreeScene && !window.__customAnimated) {
              window.__activeThreeScene.rotation.y = progress * Math.PI * 2;
            }
            try {
              window.__activeThreeRenderer.render(window.__activeThreeScene, window.__activeThreeCamera);
            } catch(e) {}
          };
        }

        // Scan window properties for any function with animation keywords in name
        try {
          const keys = Object.keys(window);
          for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (typeof window[k] === 'function' && /^(draw|render|anim|update|tick|step|frame)/i.test(k)) {
              return window[k];
            }
          }
        } catch(e) {}
        return null;
      }

      // 2. Synthetic SVG/DOM/Canvas Animator if no draw function was defined or as a fallback
      // Menjaga pergerakan seamless infinite loop untuk stock footage komersial tanpa redup ke hitam paksa
      function fallbackDomAnimator(progress) {
        const t = progress * Math.PI * 2;
        const hoverY = Math.sin(t) * 28;
        const hoverX = Math.cos(t * 0.7) * 18;
        const tiltX = -Math.cos(t * 0.8) * 8;
        const tiltY = Math.sin(t) * 10;
        const breathe = 1.0 + Math.sin(t * 2) * 0.035;

        // Animate visual wrapper, SVGs, or Canvas (Seamless continuous loop, tetap solid & jelas)
        const visualContainers = document.querySelectorAll('#visual-editor-wrapper, #main-subject-master, .hud-overlay');
        visualContainers.forEach((el) => {
          if (el.id === 'main-subject-master' || el.classList.contains('hud-overlay')) {
            el.style.transform = "perspective(1200px) translate3d(" + hoverX + "px, " + hoverY + "px, 0) rotateX(" + tiltX + "deg) rotateY(" + tiltY + "deg) scale(" + breathe + ")";
            el.style.transformOrigin = 'center center';
          }
        });

        const svgs = document.querySelectorAll('svg');
        if (svgs.length > 0) {
          svgs.forEach((svg, idx) => {
            const phase = idx * 0.5;
            const subY = Math.sin(t + phase) * 24;
            const subTilt = Math.cos(t + phase) * 6;
            svg.style.transform = "perspective(1200px) translate3d(" + hoverX + "px, " + subY + "px, 0) rotateX(" + tiltX + "deg) rotateY(" + subTilt + "deg) scale(" + breathe + ")";
            svg.style.transformOrigin = 'center center';
            svg.style.transition = 'none';
          });
        }

        // Animate all groups or paths
        const groups = document.querySelectorAll('svg g');
        if (groups.length > 0) {
          groups.forEach((g, idx) => {
            const phase = idx * 0.2 + t;
            g.style.transform = "translate(" + (Math.sin(phase) * 6) + "px, " + (Math.cos(phase) * 5) + "px)";
            g.style.transformOrigin = 'center center';
          });
        }
      }

      // 3. Safe frame execution with error suppression
      function executeRender(progress, frame) {
        try {
          const drawFn = resolveDrawFunction();
          if (drawFn) {
            drawFn(progress, frame);
          } else {
            fallbackDomAnimator(progress);
          }
        } catch (err) {
          try { fallbackDomAnimator(progress); } catch(e) {}
        }
      }

      // 4. Autonomous playback loop (only runs when NOT driven externally, NOT paused, and NOT hidden)
      function scheduleAutoLoop() {
        if (isPaused || isExternallyDriven || document.hidden) {
          if (internalRafId !== null) {
            cancelAnimationFrame(internalRafId);
            internalRafId = null;
          }
          return;
        }
        currentProgress = (currentProgress + 0.003) % 1;
        executeRender(currentProgress, Math.floor(currentProgress * TOTAL_FRAMES_TARGET));
        internalRafId = requestAnimationFrame(scheduleAutoLoop);
      }

      // Handle visibility changes in sandbox
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          if (internalRafId !== null) {
            cancelAnimationFrame(internalRafId);
            internalRafId = null;
          }
        } else if (!isPaused && !isExternallyDriven) {
          scheduleAutoLoop();
        }
      });

      // 5. Host postMessage listener
      window.addEventListener('message', (event) => {
        if (!event.data) return;

        if (event.data.type === 'render') {
          isExternallyDriven = true;
          if (internalRafId !== null) {
            cancelAnimationFrame(internalRafId);
            internalRafId = null;
          }
          const progress = typeof event.data.progress === 'number' ? event.data.progress : 0;
          const frame = typeof event.data.frame === 'number' ? event.data.frame : 0;
          currentProgress = progress;
          executeRender(progress, frame);
        } else if (event.data.type === 'pause') {
          isPaused = true;
          if (internalRafId !== null) {
            cancelAnimationFrame(internalRafId);
            internalRafId = null;
          }
        } else if (event.data.type === 'play') {
          isPaused = false;
          if (!isExternallyDriven && !document.hidden) {
            scheduleAutoLoop();
          }
        } else if (event.data.type === 'resume_autoplay') {
          isExternallyDriven = false;
          if (!isPaused && !document.hidden) {
            scheduleAutoLoop();
          }
        } else if (event.data.type === 'standby_heartbeat') {
          // Handled silently
        } else if (event.data.type === 'apply_visual_editor_transform') {
          const tx = event.data.translateX || 0;
          const ty = event.data.translateY || 0;
          const sc = event.data.scale || 1;
          
          let wrapper = document.getElementById('visual-editor-wrapper');
          if (wrapper) {
            wrapper.style.transform = "translate(" + tx + "px, " + ty + "px) scale(" + sc + ")";
          }
        }
      });

      // 6. Direct High-Fidelity Frame Rasterizer (Canvas / WebGL / SVG / DOM) for Direct Video Render
      window.__captureCurrentFrameBlob = async function(targetW, targetH, mimeType, quality, isAlpha) {
        const w = targetW || 1920;
        const h = targetH || 1080;
        let outCanvas = window.__renderOutCanvas;
        if (!outCanvas) {
          outCanvas = document.createElement('canvas');
          window.__renderOutCanvas = outCanvas;
        }
        if (outCanvas.width !== w) outCanvas.width = w;
        if (outCanvas.height !== h) outCanvas.height = h;
        const outCtx = outCanvas.getContext('2d', { alpha: true });
        outCtx.clearRect(0, 0, w, h);

        if (!isAlpha) {
          const bgMode = "${effectiveBgOverride}";
          if (bgMode === 'greenscreen') {
            outCtx.fillStyle = '#00ff00';
            outCtx.fillRect(0, 0, w, h);
          } else if (bgMode === 'white') {
            outCtx.fillStyle = '#ffffff';
            outCtx.fillRect(0, 0, w, h);
          } else if (bgMode === 'black') {
            outCtx.fillStyle = '#000000';
            outCtx.fillRect(0, 0, w, h);
          } else {
            const bodyBg = window.getComputedStyle(document.body).backgroundColor;
            if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') {
              outCtx.fillStyle = bodyBg;
              outCtx.fillRect(0, 0, w, h);
            } else {
              outCtx.fillStyle = '#060608';
              outCtx.fillRect(0, 0, w, h);
            }
          }
        }

        // Apply pan/zoom transform if present on wrapper
        const wrapper = document.getElementById('visual-editor-wrapper');
        outCtx.save();
        if (wrapper && wrapper.style.transform) {
          const m = wrapper.style.transform.match(/translate\\((-?[\\d.]+)px,\\s*(-?[\\d.]+)px\\)\\s*scale\\(([\\d.]+)\\)/);
          if (m) {
            const tx = parseFloat(m[1]) || 0;
            const ty = parseFloat(m[2]) || 0;
            const sc = parseFloat(m[3]) || 1;
            if (tx !== 0 || ty !== 0 || sc !== 1) {
              outCtx.translate(w / 2 + tx, h / 2 + ty);
              outCtx.scale(sc, sc);
              outCtx.translate(-w / 2, -h / 2);
            }
          }
        }

        // A. Draw all active <canvas> elements (2D & Three.js WebGL)
        const canvases = document.querySelectorAll('canvas');
        for (let i = 0; i < canvases.length; i++) {
          const c = canvases[i];
          if (c === outCanvas || c.width === 0 || c.height === 0) continue;
          try {
            outCtx.drawImage(c, 0, 0, w, h);
          } catch (e) {}
        }

        // B. Draw all active <svg> elements
        const svgs = document.querySelectorAll('svg');
        for (let i = 0; i < svgs.length; i++) {
          const svg = svgs[i];
          try {
            const clone = svg.cloneNode(true);
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            if (!clone.getAttribute('width')) clone.setAttribute('width', String(w));
            if (!clone.getAttribute('height')) clone.setAttribute('height', String(h));

            // Copy inline computed styles for groups/paths that may be animated via style.transform
            const origEls = svg.querySelectorAll('*');
            const cloneEls = clone.querySelectorAll('*');
            for (let j = 0; j < origEls.length; j++) {
              const oEl = origEls[j];
              const cEl = cloneEls[j];
              if (oEl && cEl && oEl.style && oEl.style.cssText) {
                cEl.style.cssText = oEl.style.cssText;
              }
            }

            if (isAlpha) {
              const bgRects = clone.querySelectorAll('rect[width="100%"][height="100%"], rect[id*="bg" i], rect[id*="background" i]');
              bgRects.forEach(r => {
                r.setAttribute('fill', 'transparent');
                r.style.fill = 'transparent';
                r.style.opacity = '0';
              });
            }

            const svgXml = new XMLSerializer().serializeToString(clone);
            const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                try { outCtx.drawImage(img, 0, 0, w, h); } catch (e) {}
                URL.revokeObjectURL(url);
                resolve(null);
              };
              img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(null);
              };
              img.src = url;
            });
          } catch (e) {}
        }

        outCtx.restore();

        return await new Promise((resolve) => {
          outCanvas.toBlob((b) => resolve(b), mimeType || 'image/png', quality || 0.92);
        });
      };

      // Initial frame render
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => executeRender(0, 0));
      } else {
        executeRender(0, 0);
      }
    })();
    </script>
    `;
    
    let modifiedHtml = htmlCode;

    // Convert scripts with import/export to type="module" so browser won't crash with SyntaxError
    modifiedHtml = modifiedHtml.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, code) => {
      if (/\bimport\s+[\s\S]*?from\s+['"]|\bexport\s+/i.test(code) && !/\btype\s*=\s*['"]module['"]/i.test(attrs)) {
        return `<script${attrs} type="module">\nwindow.THREE = THREE;\n${code}\n</script>`;
      }
      return match;
    });

    // Inject Three.js loader, WebGL context guard, and anti-distortion framing into <head>
    const localFontHeadInjection = activeLocalFont
      ? `
    <style id="local-custom-font-sandbox-style">
      @font-face {
        font-family: '${activeLocalFont.familyName}';
        src: url('${activeLocalFont.dataUrl}') format('${activeLocalFont.format}');
        font-weight: 100 900;
        font-style: normal;
        font-display: block;
      }
      @font-face {
        font-family: '${activeLocalFont.familyName}';
        src: url('${activeLocalFont.dataUrl}') format('${activeLocalFont.format}');
        font-weight: 100 900;
        font-style: italic;
        font-display: block;
      }
    </style>
    <script id="local-custom-font-preload-script">
      (function() {
        try {
          if (typeof FontFace !== 'undefined' && document.fonts) {
            var lf = new FontFace('${activeLocalFont.familyName}', "url('${activeLocalFont.dataUrl}')");
            lf.load().then(function(loaded) {
              document.fonts.add(loaded);
            }).catch(function() {});
          }
        } catch(e) {}
      })();
    </script>
    `
      : '';

    const antiDistortionStyle = `
    <style id="anti-distortion-framing-style">
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      #visual-editor-wrapper {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: hidden !important;
      }
      canvas, #canvas, #bg-canvas, svg {
        max-width: 100% !important;
        max-height: 100% !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        display: block !important;
      }
    </style>
    `;

    if (modifiedHtml.includes('<head>')) {
      modifiedHtml = modifiedHtml.replace('<head>', `<head>${localFontHeadInjection}${threeAndContextHead}${antiDistortionStyle}`);
    } else {
      modifiedHtml = localFontHeadInjection + threeAndContextHead + antiDistortionStyle + modifiedHtml;
    }

    // Inject background override styles for live preview (including Alpha Channel)
    if (effectiveBgOverride !== 'none') {
      const targetColor = effectiveBgOverride === 'alpha' ? 'transparent' : effectiveBgOverride === 'greenscreen' ? '#00ff00' : effectiveBgOverride === 'white' ? '#ffffff' : '#000000';
      const overrideStyle = `
      <style id="bg-override-channel-style">
        html, body, #visual-editor-wrapper {
          background: ${targetColor} !important;
          background-color: ${targetColor} !important;
        }
        canvas, #bg-canvas {
          background: transparent !important;
          background-color: transparent !important;
        }
        ${effectiveBgOverride === 'alpha' ? `
        svg > rect:first-of-type,
        svg rect[width="100%"][height="100%"],
        svg rect[id*="bg" i],
        svg rect[id*="background" i],
        svg rect[class*="bg" i],
        svg rect[class*="background" i] {
          fill: transparent !important;
          opacity: 0 !important;
        }
        #hud-card {
          background: rgba(10, 10, 14, 0.45) !important;
        }
        ` : `
        svg > rect:first-of-type,
        svg rect[width="100%"][height="100%"],
        svg rect[id*="bg" i],
        svg rect[id*="background" i],
        svg rect[class*="bg" i],
        svg rect[class*="background" i] {
          fill: ${targetColor} !important;
          opacity: 1 !important;
        }
        `}
      </style>
      `;

      if (modifiedHtml.includes('</head>')) {
        modifiedHtml = modifiedHtml.replace('</head>', `${overrideStyle}</head>`);
      } else {
        modifiedHtml = overrideStyle + modifiedHtml;
      }
    }

    // Wrap body contents in #visual-editor-wrapper statically without reparenting nodes at runtime
    if (!modifiedHtml.includes('id="visual-editor-wrapper"')) {
      if (modifiedHtml.includes('<body>')) {
        modifiedHtml = modifiedHtml.replace('<body>', '<body><div id="visual-editor-wrapper" style="width: 100%; height: 100%; transform: translate(0px, 0px) scale(1.0); transform-origin: center center; transition: none; position: absolute; inset: 0;">');
      }
      if (modifiedHtml.includes('</body>')) {
        modifiedHtml = modifiedHtml.replace('</body>', '</div></body>');
      }
    }

    if (modifiedHtml.includes('</body>')) {
      return modifiedHtml.replace('</body>', `${customSyncScript}</body>`);
    }
    return modifiedHtml + customSyncScript;
  };

  const triggerRecompile = (autoPlay: any = false) => {
    const shouldPlay = typeof autoPlay === 'boolean' ? autoPlay : false;
    setIsPlaying(false);
    setTimeout(() => {
      setCurrentFrame(0);
      setIsPlaying(shouldPlay);
    }, 150);
  };

  const handleSelectBgOverride = (mode: 'none' | 'alpha' | 'greenscreen' | 'black' | 'white') => {
    setBgOverride(mode);
    if (mode === 'alpha') {
      setRenderAlphaChannel(true);
      if (renderCodec === 'mp4_h264') {
        setRenderCodec('prores_4444');
      }
    }
    if (generatedTSXCode) {
      const updatedTSX = mode === 'none' 
        ? generatedTSXCode.replace(/backgroundColor:\s*['"]transparent['"]/g, "backgroundColor: '#010204'")
        : applyBgOverrideToTSX(generatedTSXCode, mode);
      setGeneratedTSXCode(updatedTSX);
      if (selectedBgIndex >= 0 && generatedBgList[selectedBgIndex]) {
        setGeneratedBgList(prev => prev.map((item, idx) => {
          if (idx === selectedBgIndex) {
            return { ...item, code: updatedTSX };
          }
          return item;
        }));
      }
    }
  };

  const handleOpenRenderModal = () => {
    setRenderErrorMsg(null);
    if (bgOverride === 'alpha') {
      setRenderAlphaChannel(true);
      if (renderCodec === 'mp4_h264') {
        setRenderCodec('prores_4444');
      }
    }
    setIsRenderModalOpen(true);
  };

  const handleCancelDirectRender = async () => {
    renderAbortRef.current = true;
    const sid = activeRenderSessionIdRef.current;
    if (sid) {
      activeRenderSessionIdRef.current = null;
      try {
        await fetch(`/api/render/cancel/${sid}`, { method: 'POST' });
      } catch (e) {}
    }
    setIsRenderingVideo(false);
    setRenderStatusText('Render dibatalkan.');
  };

  const handleStartDirectRender = async () => {
    if (isRenderingVideo || !previewHtmlCode) return;

    renderAbortRef.current = false;
    setIsRenderingVideo(true);
    setRenderErrorMsg(null);
    setRenderedVideoResult(null);

    const totalFrames = duration * fps;
    setRenderTotalFrames(totalFrames);
    setRenderCurrentFrame(0);

    // Pause live preview playback so GPU focuses 100% on deterministic frame capture
    const wasPlaying = isPlaying;
    setIsPlaying(false);

    // Determine target width & height based on chosen render resolution & orientation
    const isLand = activeLayoutPreset.isLandscape;
    let targetW = 1920;
    let targetH = 1080;
    if (renderResolutionMode === '4k') {
      targetW = isLand ? 3840 : 2160;
      targetH = isLand ? 2160 : 3840;
    } else if (renderResolutionMode === '2k') {
      targetW = isLand ? 2560 : 1440;
      targetH = isLand ? 1440 : 2560;
    } else {
      targetW = isLand ? 1920 : 1080;
      targetH = isLand ? 1080 : 1920;
    }

    const useAlpha = renderAlphaChannel && (renderCodec === 'prores_4444' || renderCodec === 'prores_small');
    const effectiveBgForRender = useAlpha ? 'alpha' : (bgOverride === 'alpha' ? 'none' : bgOverride);
    const frameInputFormat = useAlpha ? 'png' : 'jpeg';
    const frameMimeType = useAlpha ? 'image/png' : 'image/jpeg';

    const codecLabel = renderCodec === 'prores_4444'
      ? (useAlpha ? 'Apple ProRes 4444 (10-bit + Alpha)' : 'Apple ProRes 4444 (10-bit)')
      : renderCodec === 'prores_small'
        ? (useAlpha ? 'Apple ProRes Small (Alpha Compact)' : 'Apple ProRes Small (422 Proxy)')
        : 'MP4 H.264 (High Bitrate)';

    let sessionId = '';

    try {
      // Prepare dedicated offscreen render sandbox iframe at target resolution first
      setRenderStatusText('Memuat komposisi & font di kanvas render...');
      const renderHtml = injectInteractiveControls(
        ensurePreviewHtmlResolution(previewHtmlCode, targetW, targetH, fps, duration),
        effectiveBgForRender
      );

      const sandboxIframe = renderSandboxIframeRef.current;
      if (!sandboxIframe) {
        throw new Error('Elemen sandbox render tidak tersedia.');
      }

      // Cek apakah server FFmpeg tersedia (jika di Cloudflare Pages, gunakan browser recorder)
      const isServerUp = await isServerRenderAvailable();

      if (!isServerUp) {
        setRenderStatusText('Menjalankan Browser Video Recorder (Cloudflare Mode)...');
        const clientResult = await renderCompositionInBrowser({
          renderHtml,
          width: targetW,
          height: targetH,
          fps,
          duration,
          useAlpha,
          sandboxIframe,
          onProgress: (frame, total, pct) => {
            setRenderCurrentFrame(frame);
            setRenderStatusText(`Merender Frame ${frame} / ${total} (${pct}%) • Browser Recorder [Cloudflare Mode]`);
          },
          isAborted: () => renderAbortRef.current,
        });

        const ext = clientResult.extension;
        const cleanBaseName = getCleanPopovFilename(workspaceName || 'Motion Background').replace(/\.tsx$/i, '');
        const finalVideoFileName = `${cleanBaseName}.${ext}`;
        const sizeMB = (Number(clientResult.sizeBytes || 0) / (1024 * 1024)).toFixed(2);

        await saveBinaryVideoToMotionBackgroundsFolder(finalVideoFileName, clientResult.blob);

        const date = new Date();
        const formattedDate = date.toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const newRecord: SavedFileHistoryItem = {
          name: finalVideoFileName,
          workspace: `${workspaceName || 'Motion Background'} (Browser ${ext.toUpperCase()})`,
          time: formattedDate,
          size: `${sizeMB} MB`,
          type: 'video',
        };
        setSavedFilesHistory(prev => {
          const updated = [newRecord, ...prev.slice(0, 14)];
          localStorage.setItem('vremotion_saved_history_v3', JSON.stringify(updated));
          return updated;
        });

        setRenderedVideoResult({
          downloadUrl: clientResult.url,
          fileName: finalVideoFileName,
          sizeMB: `${sizeMB} MB`,
          codecLabel: `Browser ${ext.toUpperCase()}`,
          hasAlpha: useAlpha,
          extension: ext,
          blobUrl: clientResult.url,
        });

        setRenderStatusText(`Selesai! Video ${finalVideoFileName} (${sizeMB} MB) berhasil dirender langsung di browser.`);
        return;
      }

      setRenderStatusText(`Menyiapkan sesi FFmpeg (${codecLabel} • Muted)...`);
      const kwData = generatePopovKeywords(workspaceName || 'Motion Background');

      const startResp = await fetch('/api/render/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codec: renderCodec,
          alpha: useAlpha,
          fps,
          width: targetW,
          height: targetH,
          title: workspaceName || 'Motion Background',
          keywords: kwData.all,
          inputFormat: frameInputFormat,
        }),
      });

      if (!startResp.ok) {
        const errJson = await startResp.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal memulai sesi FFmpeg di server.');
      }

      const startData = await startResp.json();
      sessionId = startData.sessionId;
      activeRenderSessionIdRef.current = sessionId;

      sandboxIframe.style.width = `${targetW}px`;
      sandboxIframe.style.height = `${targetH}px`;

      await new Promise<void>((resolve) => {
        const onLoad = () => {
          sandboxIframe.removeEventListener('load', onLoad);
          resolve();
        };
        sandboxIframe.addEventListener('load', onLoad);
        sandboxIframe.srcdoc = renderHtml;
      });

      const win = sandboxIframe.contentWindow as any;
      if (!win) {
        throw new Error('Gagal mengakses konteks jendela render.');
      }

      // Wait for Google Fonts & WebGL initialization inside render sandbox
      if (win.document && win.document.fonts && win.document.fonts.ready) {
        await Promise.race([
          win.document.fonts.ready,
          new Promise(r => setTimeout(r, 1500))
        ]);
      }
      await new Promise(r => setTimeout(r, 250));

      // Apply user pan/zoom transform
      win.postMessage({
        type: 'apply_visual_editor_transform',
        translateX: panX,
        translateY: panY,
        scale: zoom
      }, '*');
      win.postMessage({ type: 'pause' }, '*');

      // Step through every frame deterministically
      for (let f = 0; f < totalFrames; f++) {
        if (renderAbortRef.current) {
          throw new Error('Render dibatalkan oleh pengguna.');
        }

        const progress = totalFrames > 0 ? f / totalFrames : 0;
        win.postMessage({ type: 'render', progress, frame: f }, '*');

        // Allow microtask / layout flush
        await new Promise(r => setTimeout(r, 4));

        if (typeof win.__captureCurrentFrameBlob !== 'function') {
          throw new Error('Fungsi penangkap frame tidak ditemukan pada kanvas.');
        }

        const blob: Blob | null = await win.__captureCurrentFrameBlob(
          targetW,
          targetH,
          frameMimeType,
          0.92,
          useAlpha
        );

        if (!blob) {
          throw new Error(`Gagal menangkap gambar pada frame ke-${f}.`);
        }

        const frameResp = await fetch(`/api/render/frame/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': frameMimeType },
          body: blob,
        });

        if (!frameResp.ok) {
          const errJson = await frameResp.json().catch(() => ({}));
          throw new Error(errJson.error || `Gagal mengirim frame ${f} ke FFmpeg.`);
        }

        setRenderCurrentFrame(f + 1);
        if (f % 5 === 0 || f === totalFrames - 1) {
          const pct = Math.round(((f + 1) / totalFrames) * 100);
          setRenderStatusText(`Merender Frame ${f + 1} / ${totalFrames} (${pct}%) • ${codecLabel} [Muted]`);
        }
      }

      setRenderStatusText('Menyelesaikan encoding kontainer video & menyematkan metadata IPTC...');
      const finishResp = await fetch(`/api/render/finish/${sessionId}`, {
        method: 'POST',
      });

      if (!finishResp.ok) {
        const errJson = await finishResp.json().catch(() => ({}));
        throw new Error(errJson.error || 'FFmpeg gagal menyelesaikan encoding video.');
      }

      const finishData = await finishResp.json();
      const ext = finishData.extension || (renderCodec === 'mp4_h264' ? 'mp4' : 'mov');
      const cleanBaseName = getCleanPopovFilename(workspaceName || 'Motion Background').replace(/\.tsx$/i, '');
      const codecSuffix = renderCodec === 'prores_4444'
        ? (useAlpha ? '_ProRes4444_Alpha' : '_ProRes4444')
        : renderCodec === 'prores_small'
          ? (useAlpha ? '_ProResSmall_Alpha' : '_ProResSmall')
          : '_H264';
      const finalVideoFileName = `${cleanBaseName}${codecSuffix}.${ext}`;
      const sizeMB = (Number(finishData.sizeBytes || 0) / (1024 * 1024)).toFixed(2);
      const downloadUrlWithFilename = `${finishData.downloadUrl}?filename=${encodeURIComponent(finalVideoFileName)}`;

      // Fetch blob so user can preview or auto-save to PC folder immediately
      const videoBlobResp = await fetch(downloadUrlWithFilename);
      const videoBlob = await videoBlobResp.blob();
      const localBlobUrl = URL.createObjectURL(videoBlob);

      await saveBinaryVideoToMotionBackgroundsFolder(finalVideoFileName, videoBlob);

      // Record in export history
      const date = new Date();
      const formattedDate = date.toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const newRecord: SavedFileHistoryItem = {
        name: finalVideoFileName,
        workspace: `${workspaceName || 'Motion Background'} (${codecLabel})`,
        time: formattedDate,
        size: `${sizeMB} MB`,
        type: 'video',
      };
      setSavedFilesHistory(prev => {
        const updated = [newRecord, ...prev.slice(0, 14)];
        localStorage.setItem('vremotion_saved_history_v3', JSON.stringify(updated));
        return updated;
      });

      setRenderedVideoResult({
        downloadUrl: downloadUrlWithFilename,
        fileName: finalVideoFileName,
        sizeMB: `${sizeMB} MB`,
        codecLabel,
        hasAlpha: useAlpha,
        extension: ext,
        blobUrl: localBlobUrl,
      });

      setRenderStatusText(`Selesai! Video ${finalVideoFileName} (${sizeMB} MB) berhasil dirender (Muted).`);
      activeRenderSessionIdRef.current = null;
    } catch (err: any) {
      if (!renderAbortRef.current) {
        console.error('Direct video render error:', err);
        setRenderErrorMsg(err.message || 'Terjadi kesalahan saat merender video.');
      }
      if (sessionId) {
        fetch(`/api/render/cancel/${sessionId}`, { method: 'POST' }).catch(() => {});
      }
    } finally {
      setIsRenderingVideo(false);
      if (wasPlaying) {
        setIsPlaying(true);
      }
    }
  };

  // Drag and Pan events for the preview wrapper
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panX, y: e.clientY - panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPanX(dx);
    setPanY(dy);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = 1.1;
    let nextZoom = zoom;
    if (e.deltaY < 0) {
      nextZoom = Math.min(4.0, zoom * scaleFactor);
    } else {
      nextZoom = Math.max(0.1, zoom / scaleFactor);
    }
    setZoom(parseFloat(nextZoom.toFixed(2)));
  };

  // Save the currently edited spatial coordinates (translates & scale) directly into both TSX & HTML codes!
  const handleSaveEditsToCode = () => {
    setError(null);
    try {
      // 1. Inject transforms into TSX code
      let updatedTSX = generatedTSXCode;
      // Search for the transform container inside TSX and update it
      const transformRegex = /transform:\s*['"`]translate\(-?[\d.]+px,\s*-?[\d.]+px\)\s*scale\([\d.]+[\)]['"`]/g;
      if (transformRegex.test(updatedTSX)) {
        updatedTSX = updatedTSX.replace(transformRegex, `transform: 'translate(${panX}px, ${panY}px) scale(${zoom})'`);
      } else {
        // If it doesn't exist, search for user editable container and wrap/replace
        const userEditAnchor = /USER EDITABLE TRANSFORM CONTAINER/g;
        if (userEditAnchor.test(updatedTSX)) {
          updatedTSX = updatedTSX.replace(
            /transform:\s*['"`]translate\(-?[\d.]+px,\s*-?[\d.]+px\)\s*scale\([\d.]+\)['"`]/,
            `transform: 'translate(${panX}px, ${panY}px) scale(${zoom})'`
          );
        } else {
          // Fallback simple replacement on translate/scale div
          updatedTSX = updatedTSX.replace(
            /transform:\s*['"`]translate\([^)]+\)\s*scale\([^)]+\)['"`]/g,
            `transform: 'translate(${panX}px, ${panY}px) scale(${zoom})'`
          );
        }
      }

      // 2. Inject transforms into HTML code template so that it is persisted
      let updatedHTML = previewHtmlCode;
      const htmlTransformRegex = /transform:\s*translate\(-?[\d.]+px,\s*-?[\d.]+px\)\s*scale\([\d.]+\)/g;
      if (htmlTransformRegex.test(updatedHTML)) {
        updatedHTML = updatedHTML.replace(htmlTransformRegex, `transform: translate(${panX}px, ${panY}px) scale(${zoom})`);
      } else {
        // Find wrapper tag or inject direct styling
        updatedHTML = updatedHTML.replace(
          /id="visual-editor-wrapper"\s+style="([^"]*)"/g,
          `id="visual-editor-wrapper" style="width: 100%; height: 100%; transform: translate(${panX}px, ${panY}px) scale(${zoom}); transform-origin: center center; transition: none; position: absolute; inset: 0;"`
        );
      }

      setGeneratedTSXCode(updatedTSX);
      setPreviewHtmlCode(updatedHTML);

      if (selectedBgIndex >= 0 && generatedBgList[selectedBgIndex]) {
        setGeneratedBgList(prev => prev.map((item, idx) => {
          if (idx === selectedBgIndex) {
            return {
              ...item,
              code: updatedTSX,
              previewHtml: updatedHTML,
            };
          }
          return item;
        }));
      }

      setSaveEditsSuccess(true);
      setTimeout(() => setSaveEditsSuccess(false), 2500);
    } catch (err: any) {
      setError("Gagal mensinkronisasikan koordinat edit: " + err.message);
    }
  };

  const handleSaveToPCFolder = async (): Promise<void> => {
    if (!generatedTSXCode) return;
    setError(null);
    
    const date = new Date();
    const formattedDate = date.toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    const fileName = getCleanPopovFilename(workspaceName);
    const kwData = generatePopovKeywords(workspaceName);

    // Pastikan kode TSX yang disimpan selalu memiliki konstanta IPTC Core & calculateMetadata mutakhir
    const finalTsxToSave = ensureConfigurationConstants(
      generatedTSXCode,
      duration,
      fps,
      activeLayoutPreset.isLandscape,
      activeLayoutPreset.resolution,
      activeLayoutPreset.width,
      activeLayoutPreset.height,
      workspaceName,
      kwData.all,
      bgOverride,
      previewHtmlCode,
      activeLocalFont
    );
    
    try {
      // Simpan berkas TSX utama (Metadata IPTC Core sudah tertanam langsung di dalam kode TSX)
      await saveFileToMotionBackgroundsFolder(fileName, finalTsxToSave);

      const newRecord: SavedFileHistoryItem = { 
        name: fileName, 
        workspace: workspaceName,
        time: formattedDate, 
        size: `${(finalTsxToSave.length / 1024).toFixed(1)} KB`,
        type: 'tsx'
      };
      const updatedHistory = [newRecord, ...savedFilesHistory.slice(0, 14)];
      setSavedFilesHistory(updatedHistory);
      localStorage.setItem('vremotion_saved_history_v3', JSON.stringify(updatedHistory));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);

      // Otomatis hapus item terpilih dari list sub-konsep jika ada
      if (selectedBgIndex >= 0 && selectedBgIndex < generatedBgList.length) {
        handleDeleteSubConcept(selectedBgIndex);
      }
    } catch (err: any) {
      console.error('Gagal mengunduh berkas:', err);
      setError("Gagal menyimpan file ke PC: " + err.message);
    }
  };

  const handleWorkspaceChange = (val: string): void => {
    setWorkspaceName(val);
    localStorage.setItem('vremotion_workspace_name', val);
  };

  const handleCopyTitle = (textToCopy?: string): void => {
    const text = textToCopy || workspaceName;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const handleAutoFormatWorkspaceTitle = (): void => {
    if (!workspaceName) return;
    const formatted = formatFizkesPopovTitle(workspaceName, {
      brief: workspaceName,
      style: selectedIconStyle,
      is3D: isPremium3D,
    });
    setWorkspaceName(formatted);
    localStorage.setItem('vremotion_workspace_name', formatted);
  };

  const handleCopyKeywords = (keywordsStr: string): void => {
    if (!keywordsStr) return;
    navigator.clipboard.writeText(keywordsStr);
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2000);
  };

  const handleCopyGoldenTags = (goldenTags: string[]): void => {
    if (!goldenTags || goldenTags.length === 0) return;
    navigator.clipboard.writeText(goldenTags.join(', '));
    setCopiedGoldenTags(true);
    setTimeout(() => setCopiedGoldenTags(false), 2000);
  };

  const handleCopyTitleAndKeywords = (titleText: string, keywordsStr: string): void => {
    const combined = `TITLE:\n${titleText}\n\nHEADLINE:\n${titleText}\n\nDESCRIPTION:\n${titleText}\n\nKEYWORDS (${keywordsStr.split(',').length} tags):\n${keywordsStr}`;
    navigator.clipboard.writeText(combined);
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2000);
  };

  const handleCopyEmbeddedIptc = (): void => {
    const safeTitle = workspaceName.replace(/"/g, '\\"');
    const kwData = generatePopovKeywords(workspaceName);
    const kwListStr = JSON.stringify(kwData.all, null, 2);
    const block = `// --- IPTC CORE & ADOBE BRIDGE METADATA (TERTETAP DALAM KODE .TSX) ---
export const TITLE = "${safeTitle}";
export const HEADLINE = TITLE; // Sama dengan title
export const DESCRIPTION = TITLE; // Sama dengan title
export const KEYWORDS = ${kwListStr};

export const IPTC_METADATA = {
  title: TITLE,
  headline: HEADLINE,
  description: DESCRIPTION,
  keywords: KEYWORDS,
};

export const calculateMetadata = () => {
  return {
    props: {
      title: TITLE,
      headline: HEADLINE,
      description: DESCRIPTION,
      keywords: KEYWORDS,
    },
    defaultProps: {
      title: TITLE,
      headline: HEADLINE,
      description: DESCRIPTION,
      keywords: KEYWORDS,
    },
  };
};`;
    copyTextToClipboard(block);
    setCopiedEmbeddedIptc(true);
    setTimeout(() => setCopiedEmbeddedIptc(false), 2000);
  };

  const activeBg = (selectedBgIndex >= 0 && selectedBgIndex < generatedBgList.length) 
    ? generatedBgList[selectedBgIndex] 
    : null;

  const currentPopovKeywords: PopovKeywords = React.useMemo(() => {
    if (activeBg?.popovKeywords) {
      return activeBg.popovKeywords;
    }
    return generatePopovKeywords(workspaceName || "Modern Motion Background", {
      brief: brief || workspaceName,
      objects: detectedObjects
    });
  }, [activeBg, workspaceName, brief, detectedObjects]);

  const clearHistory = (): void => {
    setSavedFilesHistory([]);
    localStorage.removeItem('vremotion_saved_history_v3');
  };

  const handleResetDraft = (): void => {
    if (window.confirm("Yakin ingin menghapus draf tersimpan dan kembali ke tampilan awal default?")) {
      clearActiveDraft();
      setGeneratedTSXCode(DEFAULT_REMOTION_TSX);
      setPreviewHtmlCode(DEFAULT_PREVIEW_HTML);
      setGeneratedBgList([]);
      setSelectedBgIndex(-1);
      setBrief("");
      setReference(null);
      setRefType(null);
      setSvgCode(null);
      setSvgMeta(null);
      setMode('prompt');
      setIsPremium3D(false);
      setIsSeamlessBackground(false);
      setPanX(0);
      setPanY(0);
      setZoom(1.0);
      setDraftSavedAt(null);
      triggerRecompile();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isSvg = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';

    if (isSvg) {
      try {
        const svgText = await file.text();
        let viewBox = '';
        let width = '';
        let height = '';
        let pathCount = 0;
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgText, 'image/svg+xml');
          const svgEl = doc.querySelector('svg');
          if (svgEl) {
            viewBox = svgEl.getAttribute('viewBox') || '';
            width = svgEl.getAttribute('width') || '';
            height = svgEl.getAttribute('height') || '';
            pathCount = doc.querySelectorAll('path, polygon, rect, circle, ellipse, polyline').length;
          }
        } catch (e) {
          console.warn('SVG parse error', e);
        }

        const pngDataUrl = await svgToPngDataUrl(svgText);
        setReference(pngDataUrl);
        setRefType('svg');
        setSvgCode(svgText);
        setSvgMeta({
          viewBox: viewBox || '0 0 3840 2160',
          width,
          height,
          pathCount,
          fileName: file.name
        });
        setMode('reference');
        setDetectedObjects([
          `SVG Vector Trace (${pathCount} paths)`,
          'Direct SVG Coordinate Ingestion Active',
          'Anti-Bolong Occlusion Infill Protected'
        ]);
        setSuggestedVariations(VISUAL_VARIATIONS_POOL.slice(0, 7));
        return;
      } catch (err: any) {
        setError('Gagal membaca berkas SVG: ' + err.message);
      }
    }

    setSvgCode(null);
    setSvgMeta(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        setReference(event.target.result);
        setRefType(file.type.startsWith('video') ? 'video' : 'image');
        setMode('reference');
        setDetectedObjects([]);
        setSuggestedVariations(VISUAL_VARIATIONS_POOL.slice(0, 7));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = (): void => {
    const cleanCode = ensureConfigurationConstants(
      generatedTSXCode,
      duration,
      fps,
      activeLayoutPreset.isLandscape,
      activeLayoutPreset.resolution,
      activeLayoutPreset.width,
      activeLayoutPreset.height,
      workspaceName,
      undefined,
      bgOverride,
      previewHtmlCode,
      activeLocalFont
    );
    setGeneratedTSXCode(cleanCode);
    copyTextToClipboard(cleanCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const copyTextToClipboard = (text: string): void => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Aksi salin gagal', err);
    }
    document.body.removeChild(textArea);
  };

  const handleApplyVariation = async (variationPrompt: string): Promise<void> => {
    if (!generatedTSXCode) return;
    setIsVariating(true);
    setError(null);

    try {
      const responseData = await applyVariationService({
        variationPrompt,
        generatedTSXCode,
        previewHtmlCode,
        duration,
        fps,
        forceLandscape: activeLayoutPreset.isLandscape,
        resolution: activeLayoutPreset.resolution,
        targetWidth: activeLayoutPreset.width,
        targetHeight: activeLayoutPreset.height,
      });
      
      if (responseData.code && responseData.previewHtml) {
        const formattedTitle = formatFizkesPopovTitle(responseData.suggestedTitle || workspaceName, {
          brief: customVariation,
          style: selectedIconStyle,
          is3D: isPremium3D,
        });

        let finalCode = ensureConfigurationConstants(
          responseData.code,
          duration,
          fps,
          activeLayoutPreset.isLandscape,
          activeLayoutPreset.resolution,
          activeLayoutPreset.width,
          activeLayoutPreset.height,
          formattedTitle,
          undefined,
          bgOverride,
          responseData.previewHtml
        );

        const finalHtml = ensurePreviewHtmlResolution(
          responseData.previewHtml,
          activeLayoutPreset.width,
          activeLayoutPreset.height,
          fps,
          duration
        );
        
        setGeneratedTSXCode(finalCode);
        setPreviewHtmlCode(finalHtml);
        setWorkspaceName(formattedTitle);
        localStorage.setItem('vremotion_workspace_name', formattedTitle);

        if (selectedBgIndex >= 0 && generatedBgList[selectedBgIndex]) {
          setGeneratedBgList(prev => prev.map((item, idx) => {
            if (idx === selectedBgIndex) {
              return {
                ...item,
                title: formattedTitle,
                code: finalCode,
                previewHtml: finalHtml,
              };
            }
            return item;
          }));
        }

        triggerRecompile(true);
      } else {
        throw new Error("Gagal menerapkan variasi.");
      }
    } catch (err: any) {
      setError("Gagal variasi: " + err.message);
    } finally {
      setIsVariating(false);
    }
  };

  const handleSendInstruction = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || instructionInput).trim();
    if (!promptToSend || !generatedTSXCode || isApplyingInstruction) return;

    setIsApplyingInstruction(true);
    setInstructionError(null);
    setInstructionSuccessMsg(null);

    const newLogId = `msg_${Date.now()}`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Simpan snapshot untuk fitur Undo
    setCodeUndoHistory(prev => [
      {
        code: generatedTSXCode,
        previewHtml: previewHtmlCode,
        title: workspaceName,
        prompt: promptToSend
      },
      ...prev.slice(0, 9)
    ]);

    setInstructionChatLog(prev => [
      ...prev,
      { id: newLogId, role: 'user', text: promptToSend, time: nowTime, status: 'pending' }
    ]);

    if (!customPrompt) {
      setInstructionInput('');
    }

    const isZoomOutRequest = /zoom\s*out|perkecil|kecilkan|safe\s*zone|terpotong|crop/i.test(promptToSend);
    const isFontRequest = /font|huruf|tipografi|times\s*new\s*roman|kaligrafi|script/i.test(promptToSend);

    let extraSurgicalDirectives = '';
    if (isZoomOutRequest) {
      extraSurgicalDirectives += `
🚨 ATURAN KHUSUS ZOOM OUT / ANTI-TERPOTONG:
- User meminta mengecilkan/zoom out (misal: "zoom out 1.2x" atau "perkecil"). Anda WAJIB MENGECILKAN SKALA objek/teks (scale: 0.8 atau 0.83).
- DILARANG KERAS menaikkan scale ke 1.2 karena itu memperbesar dan membuat teks makin terpotong!
- Tambahkan Safe Area margin minimal 15% dari tepi frame kiri & kanan agar teks (seperti "Congratulations") tidak terpotong di tepi frame render video!`;
    }
    if (isFontRequest || activeLocalFont) {
      extraSurgicalDirectives += `
🚨 ATURAN KHUSUS FONT (ANTI-FALLBACK TIMES NEW ROMAN):
${activeLocalFont ? `- User telah mengunggah FONT LOKAL KUSTOM dengan nama family: '${activeLocalFont.familyName}'. Anda WAJIB menggunakan fontFamily: "'${activeLocalFont.familyName}', sans-serif" (di TSX) dan font-family: '${activeLocalFont.familyName}', sans-serif (di HTML/Canvas) pada teks utama agar bentuk font 100% persis sama dengan file font lokal yang diunggah!` : `- Pertahankan jenis font kaligrafi (Caramel / script / Google Font) dan muat via Google Fonts @import di tag <style>.`}
- WAJIB gunakan hook delayRender & continueRender dari 'remotion' dengan document.fonts.ready agar Remotion headless Puppeteer menunggu font selesai di-download sebelum menangkap frame 0!`;
    }

    try {
      const responseData = await applyVariationService({
        variationPrompt: `🚨 MANDATORI SURGICAL PATCH (REVISI HANYA PADA BAGIAN/KOMPONEN YANG DIMINTA SAJA):
DAFTAR INSTRUKSI PERUBAHAN DARI USER:
"""
${promptToSend}
"""
${extraSurgicalDirectives}

HUKUM MUTLAK BEDAH KODE PRESISI TINGGI (ANTI-MEROMBAK KESELURUHAN):
1. DILARANG MEROMBAK ULANG KODE ATAU MENGUBAH ELEMEN LAIN YANG TIDAK DIMINTA!
2. 95%+ kode sumber yang ada saat ini WAJIB dipertahankan secara utuh persis (nama fungsi, struktur komponen, geometri objek, kurva Bezier, rumus gerakan lain).
3. HANYA SENTUH & REVISI nilai atau baris spesifik yang secara eksplisit diminta dalam daftar di atas (misal hanya ganti hex warna yang dimaksud, pengali kecepatan frame yang dimaksud, atau scale transform yang dimaksud).
4. Pastikan kode TSX Remotion ("code") dan HTML preview ("previewHtml") tetap 100% sinkron dan langsung menampilkan perubahan yang diminta.`,
        generatedTSXCode,
        previewHtmlCode,
        duration,
        fps,
        forceLandscape: activeLayoutPreset.isLandscape,
        resolution: activeLayoutPreset.resolution,
        targetWidth: activeLayoutPreset.width,
        targetHeight: activeLayoutPreset.height,
        bgOverride,
      });

      if (responseData.code && responseData.previewHtml) {
        const formattedTitle = formatFizkesPopovTitle(responseData.suggestedTitle || workspaceName, {
          brief: promptToSend,
          style: selectedIconStyle,
          is3D: isPremium3D,
        });

        let finalCode = ensureConfigurationConstants(
          responseData.code,
          duration,
          fps,
          activeLayoutPreset.isLandscape,
          activeLayoutPreset.resolution,
          activeLayoutPreset.width,
          activeLayoutPreset.height,
          formattedTitle,
          undefined,
          bgOverride,
          responseData.previewHtml,
          activeLocalFont
        );

        const finalHtml = ensurePreviewHtmlResolution(
          responseData.previewHtml,
          activeLayoutPreset.width,
          activeLayoutPreset.height,
          fps,
          duration
        );

        setGeneratedTSXCode(finalCode);
        setPreviewHtmlCode(finalHtml);
        setWorkspaceName(formattedTitle);
        localStorage.setItem('vremotion_workspace_name', formattedTitle);

        if (selectedBgIndex >= 0 && generatedBgList[selectedBgIndex]) {
          setGeneratedBgList(prev => prev.map((item, idx) => {
            if (idx === selectedBgIndex) {
              return {
                ...item,
                title: formattedTitle,
                code: finalCode,
                previewHtml: finalHtml,
              };
            }
            return item;
          }));
        }

        triggerRecompile(true);
        setInstructionSuccessMsg(`Visual & kode berhasil diperbarui!`);
        setInstructionChatLog(prev => prev.map(m => m.id === newLogId ? { ...m, status: 'success' } : m));
        setInstructionChatLog(prev => [
          ...prev,
          {
            id: `bot_${Date.now()}`,
            role: 'assistant',
            text: `Perubahan berhasil diterapkan ke visual & kode: "${promptToSend}".`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'success'
          }
        ]);
      } else {
        throw new Error("Gagal menerima hasil kode baru dari layanan AI.");
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Gagal menerapkan instruksi perubahan.';
      setInstructionError(errMsg);
      setInstructionChatLog(prev => prev.map(m => m.id === newLogId ? { ...m, status: 'error' } : m));
    } finally {
      setIsApplyingInstruction(false);
    }
  };

  const handleUndoCodeRevision = () => {
    if (codeUndoHistory.length === 0) return;
    const [previous, ...rest] = codeUndoHistory;
    setGeneratedTSXCode(previous.code);
    setPreviewHtmlCode(previous.previewHtml);
    setWorkspaceName(previous.title);
    setCodeUndoHistory(rest);
    triggerRecompile(true);
    setInstructionSuccessMsg(`Berhasil dikembalikan ke versi sebelum "${previous.prompt.slice(0, 30)}..."`);
  };

  const handleSelectAndReplaceVariation = (clickedIndex: number) => {
    const clickedVar = suggestedVariations[clickedIndex];
    if (!clickedVar) return;

    handleApplyVariation(clickedVar.prompt);

    const currentPrompts = suggestedVariations.map(v => v.prompt);
    const availablePool = VISUAL_VARIATIONS_POOL.filter(v => !currentPrompts.includes(v.prompt));

    if (availablePool.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePool.length);
      const nextVar = availablePool[randomIndex];

      setSuggestedVariations(prev => {
        const updated = [...prev];
        updated[clickedIndex] = nextVar;
        return updated;
      });
    }
  };

  const generateAnimation = async (): Promise<void> => {
    isAbortedRef.current = false;

    // JIKA MODE BULK PROMPT KHUSUS PER BARIS DIAKTIFKAN:
    // Menerapkan 1 Baris = 1 Animasi, Remotion Engine Architect & Visual Director (120 Core Directives)
    // Mendukung Bulk Image Reference dengan keakuratan 99% identik visual dan 100% menganimasikan gambar
    if (isBulkPerLineMode) {
      let linePrompts = bulkPerLineText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      // Jika user belum mengetik prompt tapi sudah mengunggah berkas referensi, buatkan otomatis 1 prompt per berkas dengan analisis konteks & standar stock footage komersial
      if (linePrompts.length === 0 && bulkImages.length > 0) {
        linePrompts = bulkImages.map(img => {
          const cleanName = img.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
          const isVideo = img.mediaType === 'video' || img.mimeType.startsWith('video/');
          const refDescriptor = isVideo ? `video referensi "${cleanName}"` : `gambar referensi "${cleanName}"`;
          const targetMedia = isVideo ? 'VIDEO REFERENSI' : 'GAMBAR REFERENSI';
          const textInstruction = cleanNoText
            ? 'Jika ada teks/tulisan pada referensi, DILARANG SERTAKAN TEKS TERSEBUT (wajib bersih tanpa teks agar pembeli dapat menaruh judul sendiri).'
            : 'Jika ada teks/tulisan/animasi tipografi pada referensi, SERTAKAN DAN ANIMASIKAN TEKS TERSEBUT 100% penuh sesuai referensi (Kinetic Typography / template footage with text).';
          return `Pahami subjek asli dan alur dinamika gerak secara spesifik dari ${refDescriptor} & animasikan secara totalitas untuk STOCK FOOTAGE KOMERSIAL (Adobe Stock / Shutterstock): Subjek, bentuk visual, dan alur pergerakan kinetik WAJIB 100% PERSIS SETIA PADA ${targetMedia} (DILARANG KERAS MENGARANG BENTUK 3D GENERIK LAIN SEPERTI DONAT TORUS / BOLA MELAYANG). Jika subjek bervolume 3D, pertahankan bentuk aslinya menggunakan Compound 3D Mesh / ExtrudeGeometry atau Volumetric 2.5D Shading PBR dengan pencahayaan sinematik. ${textInstruction} Pahami konteks gerak: tidak semua harus fade in fade out, prioritaskan seamless continuous infinite loop yang terus hidup dan berkesinambungan tanpa redup ke hitam. Rekonstruksi visual dan dinamika gerakan 100% penuh identik tanpa versi minimalis.`;
        });
      }

      if (linePrompts.length === 0) {
        setError("Silakan ketik minimal 1 baris prompt atau unggah gambar/video referensi pada kotak Bulk.");
        return;
      }

      setIsGenerating(true);
      setError(null);
      setSelectedBgIndex(-1);
      setGeneratedBgList([]);

      try {
        const results: GeneratedBackground[] = [];
        const count = linePrompts.length;
        const taskId = `bulk_line_${Date.now()}`;

        for (let idx = 0; idx < count; idx++) {
          if (isAbortedRef.current) break;
          const currentPrompt = linePrompts[idx];

          // Pasangkan media referensi jika tersedia
          let pairedImageRef: string | null = null;
          let pairedRefType: 'image' | 'video' | 'svg' | null = null;
          let pairedSvgCode: string | null = null;
          let pairedSvgMeta: any = null;

          if (bulkImages.length > 0) {
            if (bulkImagePairingMode === 'single_for_all') {
              const b0 = bulkImages[0];
              pairedImageRef = b0.dataUrl;
              pairedRefType = b0.mediaType === 'video' || b0.mimeType.startsWith('video/')
                ? 'video'
                : (b0.mimeType === 'image/svg+xml' ? 'svg' : 'image');
              pairedSvgCode = b0.svgCode || null;
              pairedSvgMeta = b0.svgMeta || null;
            } else {
              const matchedImg = bulkImages[idx] || (bulkImages.length === 1 ? bulkImages[0] : null);
              if (matchedImg) {
                pairedImageRef = matchedImg.dataUrl;
                pairedRefType = matchedImg.mediaType === 'video' || matchedImg.mimeType.startsWith('video/')
                  ? 'video'
                  : (matchedImg.mimeType === 'image/svg+xml' ? 'svg' : 'image');
                pairedSvgCode = matchedImg.svgCode || null;
                pairedSvgMeta = matchedImg.svgMeta || null;
              }
            }
          }

          const shortPreview = currentPrompt.length > 28 ? currentPrompt.slice(0, 28) + '...' : currentPrompt;
          setGenerationProgress(
            pairedImageRef
              ? `Membuat baris ${idx + 1} dari ${count} [99% Identik & 100% Animasi]: "${shortPreview}"`
              : `Membuat baris ${idx + 1} dari ${count}: "${shortPreview}"`
          );

          let responseData: any = null;
          let lineError: any = null;

          // Percobaan hingga 2 kali per baris dengan jeda retry jika ada kendala jaringan/kuota
          for (let attempt = 1; attempt <= 2; attempt++) {
            if (isAbortedRef.current) break;
            try {
              if (attempt > 1) {
                setGenerationProgress(`Mencoba ulang baris ${idx + 1} (Percobaan ke-${attempt})...`);
                await new Promise((r) => setTimeout(r, 2000));
              }

              responseData = await generateAnimationService({
                mode: pairedImageRef ? 'reference' : 'prompt',
                reference: pairedImageRef,
                refType: pairedRefType,
                svgCode: pairedSvgCode,
                svgMeta: pairedSvgMeta,
                patchTracedOcclusion: true,
                brief: currentPrompt + (activeLocalFont ? `\n\n[MANDATORI FONT LOKAL KUSTOM]: Gunakan fontFamily: "'${activeLocalFont.familyName}', sans-serif" (di TSX) dan font-family: '${activeLocalFont.familyName}', sans-serif (di HTML/Canvas) untuk teks/tipografi utama.` : ''),
                duration,
                fps,
                optimizeSVG: false,
                useGenerativeBgPro: false,
                useSvgVectorOnly: false, // Bebaskan model agar bisa memakai Canvas, 3D CSS matrix, WebGL, dan rich filters
                useNoHudClean: true, // Wajib bersih dari HUD/teks/elemen distraksi
                bgOverride,
                forceLandscape: activeLayoutPreset.isLandscape,
                resolution: activeLayoutPreset.resolution,
                targetWidth: activeLayoutPreset.width,
                targetHeight: activeLayoutPreset.height,
                isSeamlessBackground,
                isPremium3D: true, // Berikan kedalaman 3D, pencahayaan alami bersih (tanpa kilau melintas), dan bayangan dinamis
                iconStyle: undefined, // Bebaskan dari preset icon style kaku
                isCustomBulkPerLine: true, // Standar Remotion Engine Architect & Visual Director
                cleanNoText: activeLocalFont ? false : cleanNoText,
              });

              if (responseData && (responseData.code || responseData.previewHtml)) {
                lineError = null;
                break;
              }
            } catch (err: any) {
              lineError = err;
            }
          }

          if (isAbortedRef.current) break;

          if (!responseData || !responseData.code || !responseData.previewHtml) {
            console.warn(`Gagal menghasilkan animasi baris ke-${idx + 1}:`, lineError?.message);
            // Tetap lanjutkan ke baris berikutnya agar antrean tidak terputus total
            continue;
          }

          const title = formatFizkesPopovTitle(responseData.suggestedTitle, {
            brief: currentPrompt,
            is3D: isPremium3D,
          });

          let finalCode = ensureConfigurationConstants(
            responseData.code,
            duration,
            fps,
            activeLayoutPreset.isLandscape,
            activeLayoutPreset.resolution,
            activeLayoutPreset.width,
            activeLayoutPreset.height,
            title,
            undefined,
            bgOverride,
            responseData.previewHtml,
            activeLocalFont
          );
          const finalHtml = ensurePreviewHtmlResolution(
            responseData.previewHtml,
            activeLayoutPreset.width,
            activeLayoutPreset.height,
            fps,
            duration
          );
          const newBg: GeneratedBackground = {
            title,
            code: finalCode,
            previewHtml: finalHtml,
            detectedObjects: responseData.detectedObjects || [],
            suggestedVariations: ensureSevenVariations(responseData.suggestedVariations || []),
            referenceImage: pairedImageRef
          };

          results.push(newBg);
          setGeneratedBgList([...results]);

          await saveBulkQueueTask({
            id: taskId,
            totalCount: count,
            completedCount: idx + 1,
            mode: 'bulk_per_line',
            activeBrief: '',
            useCustomConcept: false,
            customConcept: '',
            directGenerateMode: '',
            isPremium3D,
            duration,
            fps,
            results: [...results],
            bulkLinePrompts: linePrompts,
            isBulkPerLine: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });

          if (results.length === 1) {
            setSelectedBgIndex(0);
            setGeneratedTSXCode(finalCode);
            setPreviewHtmlCode(finalHtml);
            setDetectedObjects(responseData.detectedObjects || []);
            setSuggestedVariations(newBg.suggestedVariations);
            setWorkspaceName(title);
            localStorage.setItem('vremotion_workspace_name', title);
            triggerRecompile(true);
          }

          // Jeda singkat 1.2 detik antar baris untuk meredakan rate-limit (RPM) Gemini API
          if (idx < count - 1) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }

        if (!isAbortedRef.current) {
          await clearBulkQueueTask();
          if (results.length > 0) {
            setSelectedBgIndex(0);
          }
        }
        setGenerationProgress("");
      } catch (err: any) {
        if (isAbortedRef.current) return;
        setError("Masalah generasi bulk per baris: " + err.message);
      } finally {
        setIsGenerating(false);
        setGenerationProgress("");
      }
      return;
    }

    let activeBrief = brief;
    let activeReference = reference;
    let activeRefType = refType;
    let activeMode = mode;

    // Jika tanpa prompt maupun referensi media (baik di mode prompt maupun reference)
    if ((activeMode === 'prompt' && !activeBrief.trim()) || (activeMode === 'reference' && !activeReference)) {
      if (!isAutoGenerateEnabled) {
        setError("Auto-Generate Mode dalam posisi OFF. Silakan masukkan prompt/referensi atau aktifkan Auto-Generate Mode.");
        return;
      }
      activeMode = 'prompt';
      
      setIsGenerating(true);
      setError(null);
      setSelectedBgIndex(-1);
      setGeneratedBgList([]);

      try {
        const results = [];
        const count = variationCount;
        const taskId = `bulk_auto_${Date.now()}`;
        const usedArchetypes: string[] = [];

        for (let idx = 0; idx < count; idx++) {
          if (isAbortedRef.current) break;
          setGenerationProgress(`Sedang membuat background ${idx + 1} dari ${count}...`);
          
          // Tentukan style aktif jika isStyleAnimationEnabled atau selectedIconStyle aktif
          const activeStyle = (isStyleAnimationEnabled || selectedIconStyle)
            ? formatStyleName(selectedIconStyle)
            : undefined;

          // Buat prompt background acak dan unik berdasarkan pilihan directGenerateMode atau useCustomConcept
          const bgData = useCustomConcept
            ? generateStrictCustomConceptPrompt(idx, customConcept, isPremium3D, activeStyle, usedArchetypes)
            : directGenerateMode === 'combination'
              ? generateRandomMicrostockBackgroundPrompt(isPremium3D, undefined, activeStyle, idx, usedArchetypes)
              : generateSmoothLiquidBackgroundPrompt(isPremium3D, undefined, activeStyle, idx, usedArchetypes);
            
          const responseData = await generateAnimationService({
            mode: 'prompt',
            reference: null,
            refType: null,
            brief: bgData.prompt,
            duration,
            fps,
            optimizeSVG,
            useGenerativeBgPro: true, // tetapkan bg pro untuk hasil berkualitas tinggi
            useSvgVectorOnly,
            useNoHudClean,
            bgOverride,
            forceLandscape: activeLayoutPreset.isLandscape,
            resolution: activeLayoutPreset.resolution,
            targetWidth: activeLayoutPreset.width,
            targetHeight: activeLayoutPreset.height,
            isSeamlessBackground, // tetap gunakan pilihan zero margin dari user (off/mati secara default)
            isPremium3D,
            iconStyle: activeStyle,
          });

          if (isAbortedRef.current) break;

          if (!responseData.code || !responseData.previewHtml) {
            throw new Error(`Gagal menghasilkan animasi ke-${idx + 1}`);
          }

          const formattedTitle = formatFizkesPopovTitle(responseData.suggestedTitle || bgData.title, {
            brief: bgData.prompt,
            style: selectedIconStyle,
            is3D: isPremium3D,
          });

          let finalCode = ensureConfigurationConstants(
            responseData.code,
            duration,
            fps,
            activeLayoutPreset.isLandscape,
            activeLayoutPreset.resolution,
            activeLayoutPreset.width,
            activeLayoutPreset.height,
            formattedTitle
          );
          const finalHtml = ensurePreviewHtmlResolution(
            responseData.previewHtml,
            activeLayoutPreset.width,
            activeLayoutPreset.height,
            fps,
            duration
          );
          const newBg = {
            title: formattedTitle,
            code: finalCode,
            previewHtml: finalHtml,
            detectedObjects: responseData.detectedObjects || [],
            suggestedVariations: ensureSevenVariations(responseData.suggestedVariations || [])
          };

          results.push(newBg);
          
          // Update state real-time agar user melihat kreasi tercipta satu demi satu
          setGeneratedBgList([...results]);

          // Simpan progres ke persistent storage agar aman dari refresh
          await saveBulkQueueTask({
            id: taskId,
            totalCount: count,
            completedCount: idx + 1,
            mode: 'auto_generate',
            activeBrief: '',
            useCustomConcept,
            customConcept,
            directGenerateMode,
            isPremium3D,
            duration,
            fps,
            forceLandscape: activeLayoutPreset.isLandscape,
            layoutPreset: selectedLayoutKey,
            bgOverride,
            resolution: activeLayoutPreset.resolution,
            selectedIconStyle,
            isStyleAnimationEnabled,
            results: [...results],
            usedArchetypes: [...usedArchetypes],
            inputMode: activeMode,
            referenceMedia: activeReference,
            referenceType: activeRefType,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });

          // Update editor & preview langsung setelah background pertama selesai
          if (idx === 0) {
            setSelectedBgIndex(0);
            setGeneratedTSXCode(finalCode);
            setPreviewHtmlCode(finalHtml);
            setDetectedObjects(responseData.detectedObjects || []);
            setSuggestedVariations(newBg.suggestedVariations);
            setWorkspaceName(newBg.title);
            localStorage.setItem('vremotion_workspace_name', newBg.title);
            triggerRecompile(true);
          }
        }

        if (!isAbortedRef.current) {
          await clearBulkQueueTask();
          setSelectedBgIndex(0);
        }
        setGenerationProgress("");
      } catch (err: any) {
        if (isAbortedRef.current) return;
        setError("Masalah generasi background: " + err.message);
      } finally {
        setIsGenerating(false);
        setGenerationProgress("");
      }
      return;
    }

    // Jika user mengaktifkan Mode Variasi Sekaligus dengan prompt atau referensi dari mereka sendiri
    if (generateTenVariations) {
      setIsGenerating(true);
      setError(null);
      setSelectedBgIndex(-1);
      setGeneratedBgList([]);

      try {
        const results = [];
        const count = variationCount;
        const taskId = `bulk_multi_${Date.now()}`;
        for (let idx = 0; idx < count; idx++) {
          if (isAbortedRef.current) break;
          setGenerationProgress(`Sedang membuat variasi ${idx + 1} dari ${count}...`);
          
          let briefForVariation = activeBrief;
          if (activeBrief.trim()) {
            briefForVariation = `${activeBrief}

[VARIASI UNIK ${idx + 1} DARI ${count} - PETUNJUK KREATIF KE-${idx + 1}]:
Rancang variasi ke-${idx + 1} ini agar memiliki identitas visual dan nuansa gerak yang unik dan khas dibanding variasi lainnya, namun tetap setia pada instruksi utama di atas.
Gunakan arah gerakan, gaya visual, atau orkestrasi partikel/elemen yang unik. Pastikan kodenya benar-benar unik dan belum pernah dibuat sebelumnya!`;
          } else {
            // Jika kosong, tetapi check-box tercentang (e.g. upload media reference saja)
            briefForVariation = `Ciptakan variasi animasi simulasi ke-${idx + 1} dari ${count} murni dari video/gambar referensi dengan keunikan style, sudut pandang, warna, atau gerakan unik dan khas (misalnya: variasi ${idx + 1} menggunakan konsep visual yang berbeda dari variasi lainnya). JANGAN menambahkan HUD, FPS, timeline, playback controls, safe area, atau debug panel.`;
          }

          const responseData = await generateAnimationService({
            mode: activeMode,
            reference: activeReference,
            refType: activeRefType,
            svgCode: activeRefType === 'svg' ? svgCode : null,
            svgMeta: activeRefType === 'svg' ? svgMeta : null,
            patchTracedOcclusion,
            brief: briefForVariation,
            duration,
            fps,
            optimizeSVG,
            useGenerativeBgPro,
            useSvgVectorOnly: activeReference ? false : useSvgVectorOnly,
            useNoHudClean,
            bgOverride,
            forceLandscape: activeLayoutPreset.isLandscape,
            resolution: activeLayoutPreset.resolution,
            targetWidth: activeLayoutPreset.width,
            targetHeight: activeLayoutPreset.height,
            isSeamlessBackground,
            isPremium3D: activeReference ? true : isPremium3D,
            iconStyle: isStyleAnimationEnabled ? formatStyleName(selectedIconStyle) : undefined,
            isCustomBulkPerLine: true,
            cleanNoText,
          });

          if (isAbortedRef.current) break;

          if (!responseData.code || !responseData.previewHtml) {
            throw new Error(`Gagal menghasilkan animasi ke-${idx + 1}`);
          }

          const title = formatFizkesPopovTitle(responseData.suggestedTitle, {
            brief: briefForVariation,
            style: selectedIconStyle,
            is3D: isPremium3D,
          });

          let finalCode = ensureConfigurationConstants(
            responseData.code,
            duration,
            fps,
            activeLayoutPreset.isLandscape,
            activeLayoutPreset.resolution,
            activeLayoutPreset.width,
            activeLayoutPreset.height,
            title
          );
          const finalHtml = ensurePreviewHtmlResolution(
            responseData.previewHtml,
            activeLayoutPreset.width,
            activeLayoutPreset.height,
            fps,
            duration
          );
          const newBg = {
            title,
            code: finalCode,
            previewHtml: finalHtml,
            detectedObjects: responseData.detectedObjects || [],
            suggestedVariations: ensureSevenVariations(responseData.suggestedVariations || [])
          };

          results.push(newBg);
          
          // Update state real-time agar user melihat kreasi tercipta satu demi satu
          setGeneratedBgList([...results]);

          // Simpan progres ke persistent storage agar aman dari refresh
          await saveBulkQueueTask({
            id: taskId,
            totalCount: count,
            completedCount: idx + 1,
            mode: 'multi_variation',
            activeBrief,
            useCustomConcept,
            customConcept,
            directGenerateMode,
            isPremium3D,
            duration,
            fps,
            forceLandscape: activeLayoutPreset.isLandscape,
            layoutPreset: selectedLayoutKey,
            bgOverride,
            resolution: activeLayoutPreset.resolution,
            selectedIconStyle,
            isStyleAnimationEnabled,
            results: [...results],
            inputMode: activeMode,
            referenceMedia: activeReference,
            referenceType: activeRefType,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });

          // Update editor & preview langsung setelah background pertama selesai
          if (idx === 0) {
            setSelectedBgIndex(0);
            setGeneratedTSXCode(finalCode);
            setPreviewHtmlCode(finalHtml);
            setDetectedObjects(responseData.detectedObjects || []);
            setSuggestedVariations(newBg.suggestedVariations);
            setWorkspaceName(title);
            localStorage.setItem('vremotion_workspace_name', title);
            triggerRecompile(true);
          }
        }

        if (!isAbortedRef.current) {
          await clearBulkQueueTask();
          setSelectedBgIndex(0);
        }
        setGenerationProgress("");
      } catch (err: any) {
        if (isAbortedRef.current) return;
        setError("Masalah generasi variasi: " + err.message);
      } finally {
        setIsGenerating(false);
        setGenerationProgress("");
      }
      return;
    }

    // Generator standard jika ada input prompt/referensi dari user
    setIsGenerating(true);
    setError(null);

    const localFontPromptSuffix = activeLocalFont
      ? `\n\n[MANDATORI FONT LOKAL KUSTOM]: User telah mengunggah font lokal dengan nama family: '${activeLocalFont.familyName}'. Untuk semua elemen teks/tipografi utama, WAJIB gunakan fontFamily: "'${activeLocalFont.familyName}', sans-serif" (di TSX) dan font-family: '${activeLocalFont.familyName}', sans-serif (di HTML/Canvas) agar bentuk huruf saat dirender 100% persis sama dengan font lokal milik user!`
      : '';

    try {
      const responseData = await generateAnimationService({
        mode: activeMode,
        reference: activeReference,
        refType: activeRefType,
        svgCode: activeRefType === 'svg' ? svgCode : null,
        svgMeta: activeRefType === 'svg' ? svgMeta : null,
        patchTracedOcclusion,
        brief: activeBrief + localFontPromptSuffix,
        duration,
        fps,
        optimizeSVG,
        useGenerativeBgPro,
        useSvgVectorOnly: activeReference ? false : useSvgVectorOnly,
        useNoHudClean,
        bgOverride,
        forceLandscape: activeLayoutPreset.isLandscape,
        resolution: activeLayoutPreset.resolution,
        targetWidth: activeLayoutPreset.width,
        targetHeight: activeLayoutPreset.height,
        isSeamlessBackground,
        isPremium3D: activeReference ? true : isPremium3D,
        iconStyle: isStyleAnimationEnabled ? formatStyleName(selectedIconStyle) : undefined,
        isCustomBulkPerLine: true,
        cleanNoText: activeLocalFont ? false : cleanNoText,
      });
      
      if (isAbortedRef.current) return;

      if (responseData.code && responseData.previewHtml) {
        const title = formatFizkesPopovTitle(responseData.suggestedTitle, {
          brief,
          style: selectedIconStyle,
          is3D: isPremium3D,
        });

        let finalCode = ensureConfigurationConstants(
          responseData.code,
          duration,
          fps,
          activeLayoutPreset.isLandscape,
          activeLayoutPreset.resolution,
          activeLayoutPreset.width,
          activeLayoutPreset.height,
          title,
          undefined,
          bgOverride,
          responseData.previewHtml,
          activeLocalFont
        );
        const finalHtml = ensurePreviewHtmlResolution(
          responseData.previewHtml,
          activeLayoutPreset.width,
          activeLayoutPreset.height,
          fps,
          duration
        );
        const bgItem: GeneratedBackground = {
          title,
          code: finalCode,
          previewHtml: finalHtml,
          detectedObjects: responseData.detectedObjects || [],
          suggestedVariations: ensureSevenVariations(responseData.suggestedVariations || [])
        };

        setGeneratedBgList([bgItem]);
        setSelectedBgIndex(0);

        setGeneratedTSXCode(finalCode);
        setPreviewHtmlCode(finalHtml);
        setDetectedObjects(responseData.detectedObjects || []);
        setSuggestedVariations(bgItem.suggestedVariations);
        setWorkspaceName(title);
        localStorage.setItem('vremotion_workspace_name', title);
        triggerRecompile(true);
      } else {
        throw new Error("Gagal mengekstrak berkas TSX/HTML terstruktur dari AI.");
      }
    } catch (err: any) {
      if (isAbortedRef.current) return;
      setError("Masalah: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden selection:bg-amber-500/30 selection:text-amber-300">
      
      {/* HEADER BAR */}
      <header className="min-h-14 border-b border-zinc-800 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between bg-zinc-900 shadow-2xs z-30 shrink-0 gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Zap className="text-amber-500 w-5 h-5 sm:w-6 sm:h-6 fill-amber-500 shrink-0" />
          <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-zinc-100 shrink-0">
            Remotion <span className="text-amber-500 font-black">Code Pro v2</span>
          </h1>
          <div className="hidden sm:block h-4 w-[1px] bg-zinc-800 mx-1" />
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider hidden sm:inline">Title:</span>
            <div className="relative flex items-center">
              <input 
                type="text"
                value={workspaceName}
                onChange={(e) => handleWorkspaceChange(e.target.value)}
                placeholder="Formula Fizkes & Andrey Popov: [Subjek]+[Gerund]+[Objek]+[Lokasi]+[Konsep Komersial] (88-130 karakter)"
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-zinc-900 w-44 xs:w-56 sm:w-72 md:w-80 lg:w-[360px] xl:w-[460px] transition-all truncate placeholder-zinc-600"
                title={`Judul Adobe Stock / Shutterstock (Formula Fizkes & Andrey Popov)\nPanjang: ${workspaceName.length} karakter\nStandar: 88 - 130 karakter tanpa terpotong`}
              />
            </div>

            {/* Character Count Badge for Adobe Stock Formula (65 - 130 chars) */}
            {workspaceName ? (
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${
                  workspaceName.length >= 65 && workspaceName.length <= 130
                    ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 shadow-xs'
                    : workspaceName.length < 65
                    ? 'bg-amber-950/70 border-amber-700/80 text-amber-300'
                    : 'bg-rose-950/70 border-rose-700/80 text-rose-300'
                }`}
                title={`Formula Andrey Popov & Fizkes: 65-120 karakter (Saat ini: ${workspaceName.length} karakter). ${
                  workspaceName.length >= 65 && workspaceName.length <= 130
                    ? '✓ Panjang Ideal Terindeks Agensi Komersial (Adobe Stock & Shutterstock)'
                    : workspaceName.length < 65
                    ? '⚠️ Kurang dari 65 karakter, klik tombol Fix Popov untuk formula lengkap'
                    : '⚠️ Melebihi 130 karakter, berisiko terpotong pada tampilan card'
                }`}
              >
                <span>{workspaceName.length}c</span>
                {workspaceName.length >= 65 && workspaceName.length <= 130 && (
                  <span className="text-[8px] font-sans font-extrabold uppercase text-emerald-400 bg-emerald-500/20 px-1 rounded">Stock Valid</span>
                )}
              </span>
            ) : null}

            {/* Quick Copy Adobe Stock Title Button */}
            <button
              type="button"
              onClick={() => handleCopyTitle()}
              disabled={!workspaceName}
              className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-bold shrink-0 cursor-pointer ${
                copiedTitle
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-extrabold'
                  : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title="Salin Judul Adobe Stock (Formula Fizkes & Andrey Popov)"
            >
              {copiedTitle ? <Check className="w-3.5 h-3.5 text-zinc-950" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden xl:inline">{copiedTitle ? 'Tersalin' : 'Copy'}</span>
            </button>

            {/* Auto-Format Title Button (if custom manual title is < 65 or > 130) */}
            {workspaceName && (workspaceName.length < 65 || workspaceName.length > 130) && (
              <button
                type="button"
                onClick={handleAutoFormatWorkspaceTitle}
                className="px-2 py-1 rounded-lg border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Format otomatis ke formula Fizkes & Andrey Popov (65-120 karakter)"
              >
                <Wand2 className="w-3 h-3 text-amber-400" />
                <span className="hidden xl:inline">Fix Popov</span>
              </button>
            )}

            {/* MetaStocker & Andrey Popov 3-Tier SEO Keywords Button */}
            <button
              type="button"
              onClick={() => setIsPopovModalOpen(true)}
              disabled={!workspaceName}
              className="px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg border border-amber-500/60 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[10px] font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Buka Arsitektur SEO MetaStocker (Formula Andrey Popov & 3-Tier Keyword Pyramid)"
            >
              <Tag className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Popov SEO</span>
              <span className="text-[8px] bg-amber-500 text-zinc-950 font-black px-1 rounded">3-Tier</span>
            </button>
          </div>

          {/* DYNAMIC PROJECT NAME SUFFIX (OTOMATIS) INLINE CONTROLS */}
          <div className="flex items-center gap-2 sm:gap-3.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2 sm:px-3 py-1 shrink-0">
            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest hidden xs:inline">
              Suffix:
            </span>
            <label className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-zinc-300 cursor-pointer hover:text-zinc-100 transition-colors">
              <input 
                type="checkbox" 
                checked={suffixBackground} 
                onChange={(e) => {
                  setSuffixBackground(e.target.checked);
                  if (e.target.checked) setSuffixBackgroundLoop(false);
                }} 
                className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500 w-3 h-3 sm:w-3.5 sm:h-3.5 cursor-pointer"
              />
              <span>bg</span>
            </label>
            <div className="w-[1px] h-3.5 bg-zinc-800" />
            <label className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-zinc-300 cursor-pointer hover:text-zinc-100 transition-colors">
              <input 
                type="checkbox" 
                checked={suffixBackgroundLoop} 
                onChange={(e) => {
                  setSuffixBackgroundLoop(e.target.checked);
                  if (e.target.checked) setSuffixBackground(false);
                }} 
                className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500 w-3 h-3 sm:w-3.5 sm:h-3.5 cursor-pointer"
              />
              <span>loop</span>
            </label>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* STANDBY ACTIVE & ANTI AUTO-REFRESH INDICATOR */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsStandbyInfoOpen(!isStandbyInfoOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800/80 hover:bg-emerald-900/90 text-emerald-300 transition-all cursor-pointer text-[10px] sm:text-xs font-extrabold shadow-xs"
              title="Standby Mode Aktif: Aplikasi dikunci agar tidak auto-refresh dan draf tersimpan realtime"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_8px_#34d399]" />
              <span className="hidden sm:inline tracking-tight">STANDBY ACTIVE</span>
              <span className="inline sm:hidden">STANDBY</span>
              {draftSavedAt && (
                <span className="text-[9px] font-medium text-emerald-400/80 hidden md:inline ml-0.5 font-mono">
                  • {draftSavedAt}
                </span>
              )}
            </button>

            {/* Standby & Anti Auto-Refresh Info Popover */}
            {isStandbyInfoOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 shadow-2xl z-50 animate-fade-in text-xs text-zinc-300">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Standby Active & Anti-Sleep</span>
                  </div>
                  <button 
                    onClick={() => setIsStandbyInfoOpen(false)}
                    className="text-zinc-500 hover:text-zinc-200 text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-2.5">
                  Aplikasi dalam status <strong className="text-emerald-400 font-bold">100% Siaga Aktif</strong>. Sistem keep-alive menjaga tab dan pemutar animasi agar tidak pernah paused atau sleep sendiri saat ditinggal atau diminimalkan.
                </p>

                <div className="space-y-1.5 mb-2.5 text-[10px]">
                  <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 rounded px-2 py-1">
                    <span className="text-zinc-400">🛡️ Screen Wake Lock:</span>
                    <span className="text-emerald-400 font-bold">Terkunci Aktif</span>
                  </div>
                  <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 rounded px-2 py-1">
                    <span className="text-zinc-400">⚡ Keep-Alive Worker:</span>
                    <span className="text-emerald-400 font-bold">Background Running</span>
                  </div>
                  <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 rounded px-2 py-1">
                    <span className="text-zinc-400">🔄 Continuous Loop:</span>
                    <span className="text-emerald-400 font-bold">Always Active (Anti-Pause)</span>
                  </div>
                  {draftSavedAt && (
                    <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800/80 rounded px-2 py-1">
                      <span className="text-zinc-400">💾 Draf Realtime:</span>
                      <span className="text-emerald-400 font-mono font-bold">{draftSavedAt}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsStandbyInfoOpen(false);
                    handleResetDraft();
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-red-950/80 hover:border-red-800 text-zinc-400 hover:text-red-300 border border-zinc-800 text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Draf Ke Default</span>
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-red-950/60 text-red-300 rounded-lg text-xs font-semibold border border-red-800 max-w-[200px] sm:max-w-sm truncate" title={error}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
              <span className="truncate">{error}</span>
            </div>
          )}
          
          {/* AI Provider & API Keys Modal Button */}
          <button
            type="button"
            onClick={() => setIsAiSettingsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all border shadow-2xs bg-zinc-900 hover:bg-zinc-800 border-zinc-700 hover:border-amber-500/80 text-zinc-200 hover:text-amber-300 cursor-pointer shrink-0"
            title="Pengaturan AI Provider, Bulk API Keys Gemini, OpenRouter (Claude 3.5), atau 9Router (Cloudflare Ready)"
          >
            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">AI Provider</span>
            <span className="sm:hidden">AI</span>
            <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
              aiSettings.activeProvider === 'openrouter'
                ? 'bg-emerald-500 text-zinc-950'
                : aiSettings.activeProvider === '9router'
                  ? 'bg-sky-500 text-zinc-950'
                  : 'bg-amber-500 text-zinc-950'
            }`}>
              {aiSettings.activeProvider === 'openrouter'
                ? 'OpenRouter'
                : aiSettings.activeProvider === '9router'
                  ? '9Router'
                  : 'Gemini'}
            </span>
          </button>

          {/* Hidden File Input untuk Import TSX dari PC (Bisa Multi File / Bulk) */}
          <input
            ref={importTsxFileInputRef}
            type="file"
            multiple
            accept=".tsx,.ts,.jsx,.js"
            onChange={handleTsxFileInputChange}
            className="hidden"
          />

          {/* Import TSX Button */}
          <button 
            type="button"
            onClick={() => importTsxFileInputRef.current?.click()}
            disabled={isImportingTsx}
            className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all border shadow-2xs bg-zinc-900 hover:bg-zinc-800 border-amber-500/60 hover:border-amber-400 text-amber-300 hover:text-amber-200 cursor-pointer disabled:opacity-50 shrink-0"
            title="Import berkas .tsx dari PC (Mendukung pilih banyak sekaligus / bulk)"
          >
            {isImportingTsx ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Import TSX</span>
            <span className="text-[8px] bg-amber-500 text-zinc-950 font-black px-1 rounded">PC/Bulk</span>
          </button>

          {/* Render Bulk TSX (Local Storage / PC) Button */}
          <button
            type="button"
            onClick={() => {
              setBulkRenderErrorMsg(null);
              setIsBulkRenderModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all border shadow-2xs cursor-pointer bg-zinc-900 hover:bg-zinc-800 border-amber-500/70 hover:border-amber-400 text-amber-300 hover:text-amber-200 shrink-0"
            title="Render massal antrean berkas TSX dari Local Storage atau File PC menjadi video ProRes 4444 / MP4 (Muted & IPTC)"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Render Bulk TSX</span>
            {bulkTsxQueue.length > 0 ? (
              <span className="text-[9px] bg-amber-500 text-zinc-950 font-black px-1.5 py-0.2 rounded-full">
                {bulkTsxQueue.length}
              </span>
            ) : (
              <span className="text-[8px] bg-amber-500/20 text-amber-300 font-bold px-1 rounded">
                Antrean
              </span>
            )}
          </button>

          {generatedTSXCode && (
            <>
              {/* Salin Kode */}
              <button 
                onClick={handleCopy}
                className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all border shadow-2xs ${
                  copySuccess 
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300' 
                  : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200 cursor-pointer'
                }`}
                title="Salin kode Remotion TSX lengkap"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
                <span className="hidden xs:inline">{copySuccess ? 'Copied' : 'Copy TSX'}</span>
              </button>

              {/* Unduh Berkas */}
              <button 
                onClick={handleSaveToPCFolder}
                className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                  saveSuccess 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold' 
                  : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-500 shadow-2xs'
                }`}
                title="Unduh berkas Remotion .tsx siap pakai"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 fill-current" />
                    <span>Download .TSX</span>
                  </>
                )}
              </button>

              {/* Render Video Langsung (Muted + Alpha Channel + ProRes 4444 / MP4 H.264 / ProRes Small) */}
              <button
                type="button"
                onClick={handleOpenRenderModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all border shadow-2xs cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 border-emerald-400 shrink-0"
                title="Render hasil langsung di sini menjadi video Muted (.MOV ProRes 4444, ProRes Small, atau .MP4 H.264 + Alpha Channel)"
              >
                <Film className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                <span>Render Video</span>
                <span className="text-[8px] bg-zinc-950 text-emerald-400 font-black px-1 py-0.2 rounded uppercase">
                  Direct
                </span>
              </button>
            </>
          )}
          
          <button 
            onClick={generateAnimation}
            disabled={isGenerating || isVariating}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all shadow-2xs cursor-pointer ${
              isGenerating 
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700' 
              : 'bg-amber-500 text-zinc-950 hover:bg-amber-400 font-extrabold active:scale-95'
            }`}
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" /> : <Play className="w-3.5 h-3.5 fill-current text-zinc-950" />}
            <span>
              {isGenerating 
                ? (generationProgress || 'Menganalisis...') 
                : (isBulkPerLineMode 
                    ? (bulkImages.length > 0 
                        ? `Generate (${detectedLineCount > 0 ? detectedLineCount : bulkImages.length}x • 99% Identik)`
                        : (detectedLineCount > 0 ? `Generate (${detectedLineCount} Baris)` : 'Generate'))
                    : 'Generate')}
            </span>
          </button>

          {isGenerating ? (
            <button
              type="button"
              onClick={handleStopGenerate}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
              title="Hentikan proses generate"
            >
              <Square className="w-3.5 h-3.5 fill-current text-white" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
              title="Reset semua project & kembali ke tampilan awal untuk membebaskan RAM"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* TSX IMPORT FEEDBACK BANNER */}
      {importSuccessMsg && (
        <div className="bg-emerald-950/90 border-b border-emerald-700/80 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-200 z-30 shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{importSuccessMsg}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setImportSuccessMsg(null)}
            className="text-emerald-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {importErrorMsg && (
        <div className="bg-rose-950/90 border-b border-rose-700/80 px-4 py-2.5 flex items-center justify-between text-xs text-rose-200 z-30 shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{importErrorMsg}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setImportErrorMsg(null)}
            className="text-rose-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MOBILE / TABLET RESPONSIVE WORKSPACE TAB SWITCHER (< lg) */}
      <div className="flex lg:hidden bg-zinc-900 border-b border-zinc-800 p-1.5 gap-1 overflow-x-auto shrink-0 z-20">
        <button
          type="button"
          onClick={() => setActiveMobileTab('params')}
          className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeMobileTab === 'params'
              ? 'bg-amber-500 text-zinc-950 shadow-2xs font-extrabold'
              : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Parameter</span>
        </button>

        {generatedBgList.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveMobileTab('subconcepts')}
            className={`flex-1 min-w-[110px] py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeMobileTab === 'subconcepts'
                ? 'bg-amber-500 text-zinc-950 shadow-2xs font-extrabold'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Sub-Konsep ({generatedBgList.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveMobileTab('preview')}
          className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeMobileTab === 'preview'
              ? 'bg-amber-500 text-zinc-950 shadow-2xs font-extrabold'
              : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMobileTab('code')}
          className={`flex-1 min-w-[95px] py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeMobileTab === 'code'
              ? 'bg-amber-500 text-zinc-950 shadow-2xs font-extrabold'
              : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Kode TSX</span>
        </button>
      </div>

      <main className="flex flex-1 overflow-hidden">
        
        {/* PANEL KENDALI KIRI (SIDEBAR) */}
        <aside className={`border-r border-zinc-800 bg-zinc-900 flex flex-col overflow-y-auto no-scrollbar shrink-0 transition-all duration-300 ease-in-out relative ${
          activeMobileTab === 'params' ? 'flex w-full' : 'hidden lg:flex'
        } ${
          isSidebarOpen ? 'lg:w-80 lg:min-w-[320px] lg:opacity-100' : 'lg:w-0 lg:min-w-0 lg:overflow-hidden lg:p-0 lg:border-r-0 lg:opacity-0'
        }`}>
          
          <div className="p-4 flex flex-col gap-4 border-b border-zinc-800">
            {/* Sidebar header title & close button */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Panel Parameter</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="hidden lg:flex items-center justify-center p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 transition-all cursor-pointer"
                title="Tutup Panel Parameter"
              >
                <PanelLeftClose className="w-4 h-4 text-amber-400" />
              </button>
            </div>

            {/* Mode selector */}
            <div className="flex p-0.5 bg-zinc-950 rounded-lg border border-zinc-800/80 text-[10px]">
              <button 
                type="button"
                onClick={() => setMode('prompt')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  mode === 'prompt' 
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-200 font-medium opacity-70 hover:opacity-100'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Prompt</span>
              </button>
              <button 
                type="button"
                onClick={() => setMode('reference')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  mode === 'reference' 
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs' 
                    : 'text-zinc-500 hover:text-zinc-200 font-medium opacity-70 hover:opacity-100'
                }`}
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span>Ref Media</span>
              </button>
            </div>

            {mode === 'reference' && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">Media Reference</label>
                  {reference && (
                    <button
                      type="button"
                      onClick={() => {
                        setReference(null);
                        setRefType(null);
                        setSvgCode(null);
                        setSvgMeta(null);
                      }}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 px-2 py-0.5 rounded cursor-pointer transition-colors"
                      title="Hapus Media Referensi"
                    >
                      Hapus Media
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="video/*,image/*,.svg,.mp4,.webm,.mov,image/svg+xml" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all overflow-hidden ${
                    reference ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-950 group-hover:border-zinc-500'
                  }`}>
                    {reference ? (
                      refType === 'video' ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-black">
                          <video src={reference} className="h-full w-full object-cover rounded-lg" autoPlay muted loop playsInline />
                          <span className="absolute bottom-1.5 left-1.5 bg-purple-950/90 text-purple-300 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded border border-purple-700/80 flex items-center gap-1 backdrop-blur-xs">
                            <Play className="w-2 h-2 fill-current" /> Video Referensi • 100% Penuh
                          </span>
                        </div>
                      ) : (
                        <img src={reference} className="h-full w-full object-contain p-2 rounded-lg bg-zinc-900/50" alt="Ref" />
                      )
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-zinc-900 shadow-2xs flex items-center justify-center text-zinc-400 border border-zinc-800">
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-medium text-zinc-400 text-center px-4">Unggah Video / Gambar / SVG Trace</span>
                        <span className="text-[9px] text-zinc-500 font-mono">MP4, WebM, MOV, PNG, JPG, WebP, SVG</span>
                      </>
                    )}
                  </div>
                </div>

                {/* VIDEO REFERENCE STATUS & 100% TAKARAN PENUH CONTROLS */}
                {reference && refType === 'video' && (
                  <div className="p-2.5 bg-purple-950/40 border border-purple-800/60 rounded-xl flex flex-col gap-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                          <Play className="w-3 h-3 fill-current" />
                          Video Reference Active • Takaran 100% Penuh
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-900/60 px-1.5 py-0.5 rounded border border-purple-700/60">
                        100% Motion Reconstructed
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono bg-zinc-900/80 p-2 rounded-lg border border-purple-950">
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[8px]">ANALISIS GERAK</span>
                        <span className="text-purple-300 font-bold truncate">Dinamika Kinetik 60 FPS</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[8px]">STOCK FOOTAGE</span>
                        <span className="text-purple-300 font-bold truncate">
                          {cleanNoText ? 'Clean Plate (Tanpa Teks)' : 'Include Text Allowed'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-purple-900/60 flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-zinc-200 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                          Rekonstruksi Visual & Gerak 100% Penuh
                        </span>
                        <span className="text-[8px] text-zinc-400 leading-tight">
                          AI mereplikasi seluruh dinamika gerakan, kurva timing, dan lekukan 3D video referensi tanpa versi minimalis (30%)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold shrink-0">
                        MANDATORI 100%
                      </span>
                    </div>
                  </div>
                )}

                {/* SVG TRACED VECTOR STATUS & ANTI-BOLONG CONTROLS */}
                {reference && refType === 'svg' && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex flex-col gap-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                          <FileCode className="w-3 h-3" />
                          SVG Traced Vector Active
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSvgPathModal(true)}
                        className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                      >
                        Lihat Path ({svgMeta?.pathCount || 0})
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono bg-zinc-900/80 p-2 rounded-lg border border-emerald-950">
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[8px]">TOTAL GEOMETRI</span>
                        <span className="text-emerald-300 font-bold">{svgMeta?.pathCount || 0} Paths</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[8px]">VIEWBOX</span>
                        <span className="text-emerald-300 font-bold truncate" title={svgMeta?.viewBox}>{svgMeta?.viewBox || 'Auto (3840x2160)'}</span>
                      </div>
                    </div>

                    {/* TOGGLE ANTI-BOLONG OCCLUSION INFILL */}
                    <div className="pt-2 border-t border-emerald-900/60 flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-zinc-200 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                          Anti-Bolong (Occlusion Infill)
                        </span>
                        <span className="text-[8px] text-zinc-400 leading-tight">
                          Menambal lubang/background tembus pandang pada hasil trace saat elemen dianimasikan dalam ruang 3D
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPatchTracedOcclusion(!patchTracedOcclusion)}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                          patchTracedOcclusion ? 'bg-emerald-600' : 'bg-zinc-800'
                        }`}
                        title="Aktifkan/Nonaktifkan Penambal Celah Kosong Hasil Trace"
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                          patchTracedOcclusion ? 'left-4' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Style Selector Component on Ref Media Mode */}
                {renderStyleAnimationSelector()}
              </section>
            )}

            {/* KOTAK KONFIGURASI VIDEO */}
            <section className="bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col overflow-hidden transition-all duration-300">
              {/* Header Toggle */}
              <button
                type="button"
                onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800 transition-colors text-left focus:outline-none cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Settings2 className="w-4 h-4 text-amber-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-200 uppercase tracking-widest leading-none">
                      Pengaturan Video
                    </span>
                    {!isSettingsExpanded && (
                      <span className="text-[8px] text-amber-400 font-semibold tracking-wide mt-1 block leading-none">
                        {duration}s • {activeLayoutPreset.aspect} ({activeLayoutPreset.resolution} {activeLayoutPreset.fps}fps) • {bgOverride === 'none' ? 'Default BG' : bgOverride === 'alpha' ? 'ALPHA CHANNEL' : bgOverride.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                {isSettingsExpanded ? (
                  <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-amber-500 shrink-0" />
                )}
              </button>

              {/* Collapsible Content */}
              {isSettingsExpanded && (
                <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex flex-col gap-3.5 animate-fade-in">
                  
                  {/* ZERO MARGIN */}
                  <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1">
                        <Maximize2 className="w-3 h-3 text-amber-500" />
                        Zero Margin & Overflow
                      </span>
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                        Layout
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-0.5 rounded-md border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setIsSeamlessBackground(true)}
                        className={`py-1 px-1.5 rounded text-[9px] sm:text-[10px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                          isSeamlessBackground 
                            ? 'bg-amber-500 text-zinc-950 font-extrabold shadow-2xs' 
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSeamlessBackground ? 'bg-zinc-950' : 'bg-zinc-500'}`} />
                        Aktif
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setIsSeamlessBackground(false)}
                        className={`py-1 px-1.5 rounded text-[9px] sm:text-[10px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                          !isSeamlessBackground 
                            ? 'bg-amber-500 text-zinc-950 font-extrabold shadow-2xs' 
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${!isSeamlessBackground ? 'bg-zinc-950' : 'bg-zinc-500'}`} />
                        Mati
                      </button>
                    </div>
                    
                    <span className="text-[9px] text-zinc-400 font-medium leading-normal">
                      Menghilangkan seluruh margin, border luar, dan memotong melimpahnya partikel di tepi frame.
                    </span>
                  </div>

                  {/* PREMIUM 3D RENDER */}
                  <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Visual Komputasi 3D
                      </span>
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                        3D Render
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-0.5 rounded-md border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setIsPremium3D(true)}
                        className={`py-1 px-1.5 rounded text-[9px] sm:text-[10px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                          isPremium3D 
                            ? 'bg-amber-500 text-zinc-950 font-extrabold shadow-2xs' 
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isPremium3D ? 'bg-zinc-950' : 'bg-zinc-500'}`} />
                        Aktif
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setIsPremium3D(false)}
                        className={`py-1 px-1.5 rounded text-[9px] sm:text-[10px] font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                          !isPremium3D 
                            ? 'bg-amber-500 text-zinc-950 font-extrabold shadow-2xs' 
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${!isPremium3D ? 'bg-zinc-950' : 'bg-zinc-500'}`} />
                        Mati
                      </button>
                    </div>
                    
                    <span className="text-[9px] text-zinc-400 font-medium leading-normal">
                      Memaksa sistem rendering menggunakan matematika 3D kustom dan sRGB presisi.
                    </span>
                  </div>

                  {/* Latar Belakang Warna (Termasuk Alpha Channel) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                        Warna Latar Belakang
                      </span>
                      {bgOverride === 'alpha' && (
                        <span className="text-[8px] font-black text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 uppercase tracking-wider">
                          Alpha Channel
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                      <button 
                        type="button"
                        onClick={() => handleSelectBgOverride('none')}
                        className={`py-1.5 px-1 rounded text-[9px] font-bold transition-all text-center cursor-pointer ${
                          bgOverride === 'none' 
                            ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-2xs font-extrabold' 
                            : 'text-zinc-400 hover:text-zinc-100'
                        }`}
                      >
                        Default
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleSelectBgOverride('alpha')}
                        className={`py-1.5 px-1 rounded text-[9px] font-black transition-all text-center cursor-pointer flex items-center justify-center gap-1 relative overflow-hidden ${
                          bgOverride === 'alpha' 
                            ? 'bg-amber-500 text-zinc-950 shadow-md ring-1 ring-amber-400 font-black' 
                            : 'text-amber-300 hover:text-white bg-zinc-950/80 border border-amber-500/40'
                        }`}
                        title="Alpha Channel (Transparan / No Background untuk compositing di After Effects, Premiere, DaVinci, CapCut)"
                      >
                        <span 
                          className="w-2.5 h-2.5 rounded-xs border border-zinc-600 shrink-0 inline-block"
                          style={{
                            backgroundImage: 'linear-gradient(45deg, #71717a 25%, transparent 25%), linear-gradient(-45deg, #71717a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #71717a 75%), linear-gradient(-45deg, transparent 75%, #71717a 75%)',
                            backgroundSize: '4px 4px',
                            backgroundColor: '#27272a'
                          }}
                        />
                        Alpha Channel
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleSelectBgOverride('greenscreen')}
                        className={`py-1.5 px-1 rounded text-[9px] font-bold transition-all text-center cursor-pointer ${
                          bgOverride === 'greenscreen' 
                            ? 'bg-emerald-600 text-white font-black shadow-2xs' 
                            : 'text-zinc-400 hover:text-zinc-100'
                        }`}
                      >
                        Greenscreen
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleSelectBgOverride('black')}
                        className={`py-1.5 px-1 rounded text-[9px] font-bold transition-all text-center cursor-pointer ${
                          bgOverride === 'black' 
                            ? 'bg-black text-white border border-zinc-700 shadow-2xs font-extrabold' 
                            : 'text-zinc-400 hover:text-zinc-100'
                        }`}
                      >
                        Hitam
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleSelectBgOverride('white')}
                        className={`py-1.5 px-1 rounded text-[9px] font-bold transition-all text-center cursor-pointer col-span-2 ${
                          bgOverride === 'white' 
                            ? 'bg-white text-zinc-950 font-black shadow-2xs' 
                            : 'text-zinc-400 hover:text-zinc-100'
                        }`}
                      >
                        Putih
                      </button>
                    </div>
                    {bgOverride === 'alpha' && (
                      <span className="text-[8px] text-amber-400/90 leading-tight">
                        ✨ <b>Alpha Channel aktif</b>: Latar belakang transparan tanpa warna solid untuk kebutuhan compositing video profesional.
                      </span>
                    )}
                  </div>

                  {/* LAYOUT & RESOLUTION / FPS PRESETS */}
                  <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                        {activeLayoutPreset.isLandscape ? <Monitor className="w-3.5 h-3.5 text-amber-500" /> : <Smartphone className="w-3.5 h-3.5 text-amber-500" />}
                        Layout & Resolusi Output
                      </span>
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700 font-mono">
                        {activeLayoutPreset.width}x{activeLayoutPreset.height} ({activeLayoutPreset.fps}fps)
                      </span>
                    </div>

                    {/* Preset Dropdown with exact 8 options */}
                    <select
                      value={selectedLayoutKey}
                      onChange={(e) => handleSelectLayoutPreset(e.target.value as LayoutPresetKey)}
                      className="w-full text-xs font-semibold bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <optgroup label="── Landscape (16:9) ──">
                        <option value="landscape_4k_60">Landscape Layout (16:9 4K 60fps)</option>
                        <option value="landscape_4k_30">Landscape Layout (16:9 4K 30fps)</option>
                        <option value="landscape_2k_60">Landscape Layout (16:9 2K 60fps)</option>
                        <option value="landscape_2k_30">Landscape Layout (16:9 2k 30fps)</option>
                      </optgroup>
                      <optgroup label="── Vertical (9:16) ──">
                        <option value="vertical_4k_60">vertical Layout (9:16 4K 60fps)</option>
                        <option value="vertical_4k_30">vertical Layout (9:16 4K 30fps)</option>
                        <option value="vertical_2k_60">vertical Layout (9:16 2k 60fps)</option>
                        <option value="vertical_2k_30">vertical Layout (9:16 2k 30fps)</option>
                      </optgroup>
                    </select>

                    {/* Quick Selection Buttons Grid */}
                    <div className="grid grid-cols-2 gap-1 pt-0.5">
                      {LAYOUT_PRESETS.map((p) => {
                        const isSelected = selectedLayoutKey === p.key;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => handleSelectLayoutPreset(p.key)}
                            className={`p-1.5 rounded-md text-left transition-all border cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-500/80 text-amber-300 ring-1 ring-amber-500/40'
                                : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-extrabold flex items-center gap-1">
                                {p.isLandscape ? <Monitor className="w-2.5 h-2.5 shrink-0" /> : <Smartphone className="w-2.5 h-2.5 shrink-0" />}
                                {p.isLandscape ? 'Landscape' : 'Vertical'}
                              </span>
                              <span className={`text-[8px] font-mono font-bold px-1 rounded ${
                                isSelected ? 'bg-amber-500 text-zinc-950 font-black' : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {p.resolution}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[8px] text-zinc-500 mt-0.5">
                              <span>{p.aspect}</span>
                              <span className={isSelected ? 'text-amber-400 font-bold' : ''}>{p.fps} fps</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-1 flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                      <span>DURASI VIDEO</span>
                      <span className="text-amber-400 font-extrabold">{duration} Detik ({duration * fps} f)</span>
                    </div>
                    <input 
                      type="range" 
                      min="3" 
                      max="30" 
                      value={duration} 
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    {/* Shortcut Buttons Durasi */}
                    <div className="grid grid-cols-5 gap-1 pt-1">
                      {[5, 10, 15, 20, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDuration(d)}
                          className={`py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                            duration === d 
                              ? 'bg-amber-500 text-zinc-950 font-black' 
                              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border border-zinc-800'
                          }`}
                        >
                          {d}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

              {/* INSTRUKSIONAL AREA */}
              <section className="flex flex-col gap-3">
                {/* MODE BULK PROMPT KHUSUS PER BARIS (CRITICAL THINKING - ANTI-MONOTON) */}
                <div className={`bg-zinc-950 rounded-xl border transition-all overflow-hidden ${
                  isBulkPerLineMode ? 'border-amber-500/80 shadow-xs' : 'border-zinc-800/60'
                }`}>
                  <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/70">
                    <div className="flex items-center gap-2">
                      <ListOrdered className={`w-3.5 h-3.5 ${isBulkPerLineMode ? 'text-amber-400' : 'text-zinc-400'}`} />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                          Bulk Prompt Per Baris
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Microstock Tier 1
                          </span>
                        </span>
                        <span className="text-[9px] text-amber-400/90 font-medium leading-tight">
                          Standar Adobe Stock & Pond5 • Multi-Layer & 60 FPS
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold ${isBulkPerLineMode ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {isBulkPerLineMode ? 'ON' : 'OFF'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isBulkPerLineMode}
                        onClick={() => setIsBulkPerLineMode(!isBulkPerLineMode)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isBulkPerLineMode ? 'bg-amber-500' : 'bg-zinc-800'
                        }`}
                        title={isBulkPerLineMode ? "Matikan Mode Bulk Prompt Per Baris" : "Aktifkan Mode Bulk Prompt Per Baris"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                            isBulkPerLineMode ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {isBulkPerLineMode && (
                    <div className="p-3 border-t border-zinc-800/60 flex flex-col gap-3 bg-zinc-950">
                      {/* Penjelasan Kebebasan Kreatif & Standar Microstock */}
                      <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-2.5 flex flex-col gap-1 text-[10px] text-amber-200/90 leading-relaxed">
                        <div className="flex items-center gap-1.5 font-bold text-amber-400">
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>Remotion Engine Architect & Visual Director • 120 Aturan Mutlak Remotion</span>
                        </div>
                        <p className="text-zinc-300 text-[10px] leading-relaxed">
                          Sistem dipandu oleh <strong>Remotion Engine Architect & Visual Director</strong> dengan <strong>120 Aturan Mutlak</strong>: Determinisme Frame murni, Matematika Gerak & Fisika Spring, Kedalaman 2.5D & Glassmorphism, Kinetic Typography, Integrasi 3D Sinematik & Unreal Engine (@remotion/three), Post-Processing Shaders & Color Grading, serta Arsitektur TSX Anti-Crash siap render komersial.
                        </p>
                      </div>

                      {/* BULK IMAGE & VIDEO REFERENCE SECTION (99% Identik & 100% Animasi) */}
                      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Images className="w-4 h-4 text-amber-400" />
                            <span className="font-bold text-zinc-100 text-xs">
                              Bulk Media Reference (Gambar & Video)
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-300" title="Takaran 100% Penuh: Dilarang membuat versi minimalis (30%), seluruh elemen, ornamen mikro, dan panel wajib direkonstruksi utuh">
                              Takaran 100% Penuh
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-700/80 text-purple-300" title="Support Video Reference: Mendukung MP4, WebM, MOV dengan analisis gerakan 60 FPS dan takaran 100% penuh">
                              Video & Image Ref
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/80 text-cyan-300" title="Volumetrik 3D: Gambar bervolume/3D wajib dirender dengan Three.js / React Three Fiber / WebGL PBR">
                              Three.js WebGL 3D
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={() => setCleanNoText(prev => !prev)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setCleanNoText(prev => !prev);
                                }
                              }}
                              className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border transition-all cursor-pointer select-none ${
                                cleanNoText
                                  ? 'bg-rose-950/80 border-rose-700/80 text-rose-300 hover:bg-rose-900/80'
                                  : 'bg-zinc-800/90 border-zinc-600/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/80'
                              }`}
                              title={
                                cleanNoText
                                  ? "Clean No-Text Aktif: Teks dari referensi otomatis dihilangkan (clean plate). Klik untuk ubah ke abu-abu (izinkan teks/animation text disertakan)."
                                  : "Include Text Aktif (Abu-abu / OFF): Jika referensi ada teks atau animasi tipografi, teks AKAN DI-INCLUDE dan dianimasikan. Klik untuk aktifkan Clean No-Text."
                              }
                            >
                              {cleanNoText ? 'Clean No-Text' : 'Include Text'}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-700/80 text-purple-300" title="Seamless Infinite Loop: Gerakan berkesinambungan tanpa redup ke hitam untuk kebutuhan stock footage komersial">
                              Seamless Loop
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-700/80 text-amber-300" title="Stock Footage Komersial: Standar visual tinggi kelas Adobe Stock / Shutterstock">
                              Stock Footage Pro
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-700/80 text-blue-300" title="Anti-Minimalis: Kode TSX dan Preview HTML masing-masing wajib minimal 900 hingga 1500+ baris kode asli">
                              900+ Baris Kode
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-zinc-400 leading-relaxed">
                          Unggah kumpulan gambar atau video referensi (multi-upload). AI akan menganalisis konteks visual dan gerakan untuk <strong className="text-amber-400">Stock Footage Komersial</strong>: jika objek <strong className="text-cyan-400">bervolume/3D maka direkonstruksi setia pada subjek asli (Compound 3D Mesh / Extrude / Volumetric Shading PBR, anti-mengarang)</strong>, {cleanNoText ? <>jika berkas <strong className="text-rose-400">ada teks maka teks otomatis dihilangkan (clean plate)</strong></> : <>jika berkas <strong className="text-zinc-300">ada teks/animasi tipografi maka teks di-include & dianimasikan 100%</strong></>}, memprioritaskan <strong className="text-purple-400">seamless infinite loop tanpa dipaksa fade out ke hitam</strong>, dan mereplikasi visual serta kinetik dengan <strong className="text-emerald-400">takaran 100% penuh</strong> dalam <strong className="text-blue-400">900+ baris kode</strong> siap render komersial.
                        </p>

                        {/* Hidden file input */}
                        <input
                          ref={bulkFileInputRef}
                          type="file"
                          multiple
                          accept="image/*,video/*,.svg,.mp4,.webm,.mov,image/svg+xml"
                          onChange={handleBulkImageUpload}
                          className="hidden"
                        />

                        {/* Drag & Drop Upload Zone */}
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDraggingBulkImages(true); }}
                          onDragLeave={() => setIsDraggingBulkImages(false)}
                          onDrop={handleBulkImageDrop}
                          onClick={() => bulkFileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                            isDraggingBulkImages
                              ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                              : 'border-zinc-700/80 hover:border-amber-500/60 bg-zinc-950/60 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Upload className="w-3.5 h-3.5 text-amber-400" />
                            <span>Tarik & lepas gambar, video (MP4/WebM/MOV), atau SVG trace ke sini atau klik untuk memilih file</span>
                          </div>
                          <span className="text-[9px] text-zinc-500">
                            Mendukung PNG, JPG, WebP, SVG Vector Trace, Video MP4, WebM, MOV • Multi-Upload ({bulkImages.length} berkas terpilih)
                          </span>
                        </div>

                        {/* Uploaded Bulk Images Preview List */}
                        {bulkImages.length > 0 && (
                          <div className="flex flex-col gap-2 pt-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-zinc-300">
                                Berkas Referensi Terunggah ({bulkImages.length})
                              </span>
                              <button
                                type="button"
                                onClick={handleClearAllBulkImages}
                                className="text-[9px] font-semibold text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                Hapus Semua Berkas
                              </button>
                            </div>

                            {/* Horizontal scroll thumbnails */}
                            <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                              {bulkImages.map((img, i) => (
                                <div
                                  key={img.id}
                                  className="relative group shrink-0 w-24 bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 flex flex-col gap-1 items-center"
                                >
                                  <div className="relative w-full aspect-video rounded overflow-hidden bg-black/40 border border-zinc-800/80 flex items-center justify-center">
                                    <img
                                      src={img.thumbnailUrl || img.dataUrl}
                                      alt={img.name}
                                      className="w-full h-full object-contain"
                                    />
                                    <span className="absolute top-0.5 left-0.5 bg-zinc-900/90 text-amber-400 font-mono text-[8px] font-bold px-1 rounded border border-zinc-700">
                                      #{i + 1}
                                    </span>
                                    {img.mediaType === 'video' && (
                                      <span className="absolute bottom-0.5 right-0.5 bg-purple-950/90 text-purple-300 font-mono text-[7px] font-bold px-1 rounded border border-purple-700 flex items-center gap-0.5">
                                        <Play className="w-1.5 h-1.5 fill-current" /> VID
                                      </span>
                                    )}
                                    {img.svgCode && (
                                      <span className="absolute bottom-0.5 right-0.5 bg-emerald-950/90 text-emerald-400 font-mono text-[7px] font-bold px-1 rounded border border-emerald-700">
                                        SVG
                                      </span>
                                    )}
                                  </div>
                                  <div className="w-full text-left truncate">
                                    <span className="text-[9px] font-medium text-zinc-200 block truncate" title={img.name}>
                                      {img.name}
                                    </span>
                                    <span className="text-[8px] font-mono text-zinc-500 block">
                                      {bulkImagePairingMode === 'single_for_all' ? 'Semua Baris' : `Baris #${i + 1}`}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveBulkImage(img.id);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded-full flex items-center justify-center text-[10px] shadow transition-colors cursor-pointer"
                                    title="Hapus berkas ini"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Pairing Mode Selector */}
                            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-2 flex flex-col gap-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                                Mode Pemasangan Gambar ke Baris Prompt:
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setBulkImagePairingMode('sequential')}
                                  className={`py-1.5 px-2 rounded-md text-[10px] font-medium transition-all text-left flex flex-col cursor-pointer ${
                                    bulkImagePairingMode === 'sequential'
                                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  <span className="font-bold">Urutan 1:1 (Sesuai Baris)</span>
                                  <span className="text-[8px] text-zinc-500">Gambar 1 ➔ Baris 1, Gambar 2 ➔ Baris 2</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBulkImagePairingMode('single_for_all')}
                                  className={`py-1.5 px-2 rounded-md text-[10px] font-medium transition-all text-left flex flex-col cursor-pointer ${
                                    bulkImagePairingMode === 'single_for_all'
                                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                  }`}
                                >
                                  <span className="font-bold">1 Gambar untuk Semua Baris</span>
                                  <span className="text-[8px] text-zinc-500">Animasi beragam variasi dari gambar pertama</span>
                                </button>
                              </div>
                            </div>

                            {/* Auto-fill prompt helper button */}
                            <button
                              type="button"
                              onClick={handleAutoFillPromptsFromImages}
                              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Isi Baris Prompt Otomatis Berdasarkan {bulkImages.length} Berkas (Gambar/Video) Ini</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Textarea Multi-line */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <label className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">
                            Daftar Prompt (1 Baris = 1 Video Microstock)
                          </label>
                          <span className="font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[10px]">
                            {detectedLineCount > 0 ? `${detectedLineCount} Baris (${detectedLineCount}x Video)` : (bulkImages.length > 0 ? `${bulkImages.length}x Video (Otomatis)` : '0 Baris')}
                          </span>
                        </div>
                        <textarea
                          value={bulkPerLineText}
                          onChange={(e) => setBulkPerLineText(e.target.value)}
                          placeholder={"Ketik 1 prompt per baris (tekan Enter untuk baris berikutnya):\nKinetic Typography judul berani dengan spring physics bouncy, word-by-word highlight neon cyan, dan partikel floating orbs 2D\nSinematik low-angle 3D metallic cube berputar dengan PBR physical material, Three-Point Lighting, dan depth of field faux\nGlassmorphism finance card analytics dengan dynamic grid line drawing, counter easing expo, dan subtle gradient glow\nBendera merah putih berkibar megah di tiang silinder logam 3D dengan fisika kain volumetrik mulus sehalus sutra"}
                          rows={6}
                          className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all resize-y text-zinc-100 placeholder-zinc-500 leading-relaxed font-sans min-h-[130px]"
                        />
                      </div>

                      {/* Tombol Bantuan */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setBulkPerLineText(
                              "Kinetic Typography judul berani dengan spring physics bouncy, word-by-word highlight neon cyan, dan partikel floating orbs 2D\n" +
                              "Sinematik low-angle 3D metallic cube berputar dengan PBR physical material, Three-Point Lighting, dan depth of field faux\n" +
                              "Glassmorphism finance card analytics dengan dynamic grid line drawing, counter easing expo, dan subtle gradient glow\n" +
                              "Bendera merah putih berkibar megah di tiang silinder logam 3D dengan fisika kain volumetrik mulus sehalus sutra"
                            );
                          }}
                          className="text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Isi Contoh Prompt Remotion (120 Core Directives)</span>
                        </button>

                        {bulkPerLineText.trim() && (
                          <button
                            type="button"
                            onClick={() => setBulkPerLineText("")}
                            className="text-[10px] font-semibold text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            Bersihkan
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {!isBulkPerLineMode && mode === 'prompt' && (
                  <>
                    {renderStyleAnimationSelector()}
                  </>
                )}

                {!isBulkPerLineMode && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
                      Instruksi Tambahan (Prompts)
                    </label>
                    <textarea 
                      value={brief}
                      onChange={(e) => setBrief(e.target.value)}
                      placeholder="cth: transisi partikel dinamis, efek ombak sinergis, warna emas berpendar..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all resize-none text-zinc-100 placeholder-zinc-500 leading-relaxed focus:bg-zinc-900 no-scrollbar"
                    />
                  </div>
                )}

                {/* FONT LOKAL DARI PENYIMPANAN PC (TTF / OTF / WOFF2) - KUNCI BENTUK FONT 100% SAMA SAAT RENDER */}
                <div className={`bg-zinc-950 rounded-xl border transition-all overflow-hidden p-3 flex flex-col gap-2.5 ${
                  activeLocalFont ? 'border-amber-500/70 shadow-xs' : 'border-zinc-800/80'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Type className={`w-3.5 h-3.5 shrink-0 ${activeLocalFont ? 'text-amber-400' : 'text-zinc-400'}`} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 truncate">
                          <span>Font Lokal Kustom (PC)</span>
                          {activeLocalFont && (
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                              100% Locked
                            </span>
                          )}
                        </span>
                        <span className="text-[9px] text-zinc-400 leading-tight">
                          Unggah file .TTF / .OTF / .WOFF2 agar bentuk font teks 100% persis sama saat dirender
                        </span>
                      </div>
                    </div>

                    <input
                      ref={localFontInputRef}
                      type="file"
                      accept=".ttf,.otf,.woff2,.woff"
                      multiple
                      onChange={handleUploadLocalFont}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => localFontInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs"
                      title="Pilih file font (.ttf, .otf, .woff2, .woff) dari penyimpanan lokal PC Anda"
                    >
                      <Upload className="w-3 h-3 text-zinc-950" />
                      <span>+ Upload Font</span>
                    </button>
                  </div>

                  {localCustomFonts.length > 0 ? (
                    <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800/60">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-400 font-semibold">Pilih Font Aktif:</span>
                        {activeLocalFont && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLocalFontId('');
                              localStorage.removeItem('vremotion_selected_local_font_id');
                            }}
                            className="text-[9px] font-bold text-zinc-400 hover:text-amber-400 cursor-pointer"
                          >
                            Matikan Kunci Font
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                        {localCustomFonts.map((fItem) => {
                          const isSelected = fItem.id === selectedLocalFontId;
                          return (
                            <div
                              key={fItem.id}
                              onClick={() => {
                                setSelectedLocalFontId(fItem.id);
                                localStorage.setItem('vremotion_selected_local_font_id', fItem.id);
                                setCleanNoText(false);
                                applyLocalFontToCurrentAnimation(fItem);
                              }}
                              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                                  : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="text-sm font-normal text-zinc-100 truncate"
                                    style={{ fontFamily: `'${fItem.familyName}', sans-serif` }}
                                  >
                                    {fItem.familyName} — Abc 123
                                  </span>
                                </div>
                                <span className="text-[9px] font-mono text-zinc-400 truncate">
                                  {fItem.fileName} • {fItem.sizeKB} • Embedded Base64
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {isSelected && (
                                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950">
                                    Aktif
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveLocalFont(fItem.id);
                                  }}
                                  className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                                  title="Hapus font lokal ini"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {activeLocalFont && (
                        <button
                          type="button"
                          onClick={() => applyLocalFontToCurrentAnimation(activeLocalFont)}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          title="Suntikkan dan paksa semua teks pada animasi saat ini menggunakan font lokal ini"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Terapkan "{activeLocalFont.familyName}" ke Animasi Saat Ini</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-500 bg-zinc-900/60 border border-dashed border-zinc-800 rounded-lg p-2 text-center">
                      Belum ada font lokal. Klik <b>+ Upload Font</b> untuk memilih file <code>.ttf</code> / <code>.otf</code> dari komputer Anda.
                    </div>
                  )}
                </div>

                {/* BATCH VARIATION CONFIGURATION */}
                <div className="bg-zinc-950 rounded-xl border border-zinc-800/60 overflow-hidden">
                  <button 
                    type="button"
                    onClick={() => setIsVariationExpanded(!isVariationExpanded)}
                    className="flex items-center justify-between w-full px-3 py-2.5 text-left cursor-pointer hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-medium text-zinc-200">
                        Jumlah Variasi
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {variationCount}x
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isVariationExpanded ? 'rotate-180 text-amber-500' : ''}`} />
                    </div>
                  </button>

                  {isVariationExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-zinc-800/40 flex flex-col gap-2.5 animate-fade-in">
                      <div className="grid grid-cols-6 gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800/50">
                        {[1, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              setVariationCount(num);
                              if (num > 1) setGenerateTenVariations(true);
                            }}
                            className={`py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                              variationCount === num 
                                ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs' 
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                            }`}
                          >
                            {num}x
                          </button>
                        ))}
                      </div>

                      <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={generateTenVariations} 
                          onChange={(e) => setGenerateTenVariations(e.target.checked)} 
                          className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500/20 w-3.5 h-3.5 shrink-0"
                        />
                        <span>Aktifkan mode multivariasi untuk Prompt & Ref</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* AUTO-GENERATE MODE */}
                <div className={`bg-zinc-950 rounded-xl border transition-colors overflow-hidden ${isAutoGenerateEnabled ? 'border-zinc-800/60' : 'border-zinc-800/30 opacity-75'}`}>
                  <div className="flex items-center justify-between w-full px-3 py-2.5">
                    <button 
                      type="button"
                      onClick={() => setIsAutoGenerateExpanded(!isAutoGenerateExpanded)}
                      className="flex items-center gap-2 text-left cursor-pointer group flex-1"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isAutoGenerateEnabled ? 'text-amber-500' : 'text-zinc-500'}`} />
                      <span className={`text-xs font-medium transition-colors ${isAutoGenerateEnabled ? 'text-zinc-200 group-hover:text-amber-400' : 'text-zinc-400'}`}>
                        Auto-Generate Mode
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isAutoGenerateExpanded ? 'rotate-180 text-amber-500' : ''}`} />
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      {isAutoGenerateEnabled && (
                        <span className="text-[10px] font-semibold text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {variationCount}x
                        </span>
                      )}

                      {/* TOGGLE SWITCH ON/OFF */}
                      <div className="flex items-center gap-1.5 pl-1 border-l border-zinc-800/60">
                        <span className={`text-[10px] font-bold ${isAutoGenerateEnabled ? 'text-amber-400' : 'text-zinc-500'}`}>
                          {isAutoGenerateEnabled ? 'ON' : 'OFF'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isAutoGenerateEnabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextState = !isAutoGenerateEnabled;
                            setIsAutoGenerateEnabled(nextState);
                            if (nextState) setIsAutoGenerateExpanded(true);
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isAutoGenerateEnabled ? 'bg-amber-500' : 'bg-zinc-800'
                          }`}
                          title={isAutoGenerateEnabled ? "Auto-Generate Mode Aktif" : "Auto-Generate Mode Nonaktif"}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                              isAutoGenerateEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isAutoGenerateEnabled && isAutoGenerateExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-zinc-800/40 flex flex-col gap-2.5 animate-fade-in">
                      {/* Pemilihan Jumlah Variasi */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>Jumlah Variasi</span>
                          <span className="font-mono text-amber-400 font-semibold">{variationCount}x</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800/50">
                          {[1, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setVariationCount(num)}
                              className={`py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                                variationCount === num 
                                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs' 
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                              }`}
                            >
                              {num}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mode Kombinasi / Non-Kombinasi */}
                      <div className="grid grid-cols-2 gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800/50">
                        <button
                          type="button"
                          disabled={useCustomConcept}
                          onClick={() => setDirectGenerateMode('combination')}
                          className={`py-1.5 px-2 rounded-md text-[10px] font-medium transition-all text-center ${
                            useCustomConcept
                              ? 'opacity-30 cursor-not-allowed text-zinc-500'
                              : directGenerateMode === 'combination' 
                                ? 'bg-amber-500 text-zinc-950 font-bold cursor-pointer shadow-xs' 
                                : 'text-zinc-400 hover:text-zinc-200 cursor-pointer'
                          }`}
                        >
                          Kombinasi Tema
                        </button>
                        <button
                          type="button"
                          disabled={useCustomConcept}
                          onClick={() => setDirectGenerateMode('non-combination')}
                          className={`py-1.5 px-2 rounded-md text-[10px] font-medium transition-all text-center ${
                            useCustomConcept
                              ? 'opacity-30 cursor-not-allowed text-zinc-500'
                              : directGenerateMode === 'non-combination' 
                                ? 'bg-amber-500 text-zinc-950 font-bold cursor-pointer shadow-xs' 
                                : 'text-zinc-400 hover:text-zinc-200 cursor-pointer'
                          }`}
                        >
                          Non-Kombinasi
                        </button>
                      </div>
                      
                      <p className="text-[9px] text-amber-400/90 font-medium leading-tight px-0.5">
                        {directGenerateMode === 'non-combination' 
                          ? '✨ Non-Kombinasi: Mulus & presisi tanpa shape kaku — visual background murni layak jual (Commercial Use Ready).'
                          : '⚡ Kombinasi Tema: Paduan dinamis multi-layer tema untuk latar belakang dengan variasi kompleks.'}
                      </p>

                      <div className="flex flex-col gap-1.5 pt-1">
                        <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={useCustomConcept} 
                            onChange={(e) => setUseCustomConcept(e.target.checked)} 
                            className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500/20 w-3.5 h-3.5 shrink-0"
                          />
                          <span>Gunakan Konsep Kustom</span>
                        </label>

                        {useCustomConcept && (
                          <textarea
                            value={customConcept}
                            onChange={(e) => setCustomConcept(e.target.value)}
                            placeholder="cth: batik indonesia, cosmic nebula, retro pixel wave..."
                            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-lg p-2 text-xs h-14 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all resize-none text-zinc-100 placeholder-zinc-500 leading-relaxed no-scrollbar"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* PENGATURAN LANJUTAN (SVG, HUD, PRO PARAMETERS) - COLLAPSIBLE */}
                <div className="bg-zinc-950 rounded-xl border border-zinc-800/60 overflow-hidden">
                  <button 
                    type="button"
                    onClick={() => setIsAdvancedSettingsExpanded(!isAdvancedSettingsExpanded)}
                    className="flex items-center justify-between w-full px-3 py-2.5 text-left cursor-pointer hover:bg-zinc-900/50 transition-colors"
                  >
                    <span className="text-xs font-medium text-zinc-300">
                      Pengaturan Lanjutan
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isAdvancedSettingsExpanded ? 'rotate-180 text-amber-500' : ''}`} />
                  </button>

                  {isAdvancedSettingsExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-zinc-800/40 flex flex-col gap-2 animate-fade-in">
                      <label className="flex items-start gap-2.5 text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={useSvgVectorOnly} 
                          onChange={(e) => setUseSvgVectorOnly(e.target.checked)} 
                          className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500/20 w-3.5 h-3.5 mt-0.5 shrink-0"
                        />
                        <span className="leading-tight">Pure SVG Vector Paths Only (No Rasters)</span>
                      </label>
                      <label className="flex items-start gap-2.5 text-[11px] text-zinc-300 cursor-pointer hover:text-zinc-100 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={useNoHudClean} 
                          onChange={(e) => setUseNoHudClean(e.target.checked)} 
                          className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500/20 w-3.5 h-3.5 mt-0.5 shrink-0"
                        />
                        <span className="leading-tight text-amber-400 font-medium">NO HUD & Clean Animation</span>
                      </label>
                      <label className="flex items-start gap-2.5 text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-200 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={optimizeSVG} 
                          onChange={(e) => setOptimizeSVG(e.target.checked)} 
                          className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500/20 w-3.5 h-3.5 mt-0.5 shrink-0"
                        />
                        <span className="leading-tight">Optimized SVG (Bezier Simplification)</span>
                      </label>
                      <label className="flex items-start gap-2.5 text-[11px] text-zinc-300 cursor-pointer hover:text-zinc-100 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={useGenerativeBgPro} 
                          onChange={(e) => setUseGenerativeBgPro(e.target.checked)} 
                          className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500/20 w-3.5 h-3.5 mt-0.5 shrink-0"
                        />
                        <span className="leading-tight text-amber-400 font-medium">Generative Background Pro Parameter</span>
                      </label>
                    </div>
                  )}
                </div>
            </section>
          </div>



          {/* HISTORI EKSPOR */}
          <div className="p-4 flex-1 flex flex-col min-h-[160px]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <History className="w-4 h-4 text-zinc-400" />
                Histori Penyimpanan TSX
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    handleLoadFromLocalStorage();
                    setIsBulkRenderModalOpen(true);
                  }}
                  className="text-[9px] font-extrabold text-amber-400 hover:text-amber-300 transition-all uppercase cursor-pointer flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded"
                  title="Muat semua riwayat dan draf dari Local Storage untuk dirender massal"
                >
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span>Bulk Render</span>
                </button>
                {savedFilesHistory.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-[9px] font-bold text-red-400 hover:text-red-300 transition-all uppercase cursor-pointer"
                  >
                    Bersihkan
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar max-h-48 pr-1 space-y-2">
              {savedFilesHistory.length > 0 ? (
                savedFilesHistory.map((file, idx) => (
                  <div key={idx} className="p-2 rounded-lg border border-zinc-800 bg-zinc-950 flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <FileCode className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-[11px] font-bold text-zinc-200 truncate" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded shrink-0">
                        Saved
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-zinc-400 font-medium">
                      <span className="truncate max-w-[130px]">Proyek: {file.workspace}</span>
                      <span>{file.time} ({file.size})</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-800 rounded-xl text-zinc-500">
                  <span className="text-[10px] font-medium leading-relaxed">
                    Belum ada video TSX yang diekspor.<br />
                    Klik <b>"Download .TSX"</b> untuk memulai ekspor perdana Anda.
                  </span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* PANEL KANAN (PREVIEW FRAME & COMPILER) */}
        <div className="flex-1 flex flex-col relative bg-zinc-950 overflow-hidden">
          
          {/* Header Split View Controller */}
          <div className="h-auto sm:h-12 border-b border-zinc-800 px-4 sm:px-6 py-2 sm:py-0 flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-900 shrink-0 gap-2">
            <div className="flex items-center gap-2.5">
              <Columns className="w-3.5 h-3.5 sm:w-4 h-4 text-amber-500" />
              <span className="text-[11px] sm:text-xs font-bold text-zinc-100 uppercase tracking-widest">
                Real-time Interactive Split Editor
              </span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-emerald-400 uppercase">
                Dual Sandbox Sync Active
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* BULK SUB-CONCEPTS SIDEBAR PANEL */}
            {generatedBgList.length > 0 && (
              <div className={`w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden max-h-[300px] sm:max-h-[380px] lg:max-h-none ${
                activeMobileTab === 'subconcepts' ? 'flex' : 'hidden lg:flex'
              }`}>
                
                {/* Panel Title Bar */}
                <div className="bg-zinc-950 border-b border-zinc-800 px-3.5 py-2.5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black text-zinc-100 uppercase tracking-wider">Bulk Sub-Concepts</span>
                    <span className="bg-amber-500 text-zinc-950 px-1.5 py-0.5 rounded text-[10px] font-black">
                      {generatedBgList.length}
                    </span>
                  </div>
                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest">
                    Sub-Concept Tabs
                  </span>
                </div>

                {/* Sub-Header Actions */}
                <div className="p-2 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between gap-1.5 shrink-0 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button 
                      type="button"
                      className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400 text-[10px] font-bold uppercase flex items-center gap-1 shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      AI Sub-Concepts
                    </button>
                    <button
                      type="button"
                      onClick={() => importTsxFileInputRef.current?.click()}
                      disabled={isImportingTsx}
                      className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Import berkas .tsx dari PC ke list sub-konsep"
                    >
                      {isImportingTsx ? <Loader2 className="w-3 h-3 text-amber-400 animate-spin" /> : <Upload className="w-3 h-3 text-amber-400" />}
                      <span>+ Import TSX</span>
                    </button>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    ({selectedBgIndex >= 0 ? selectedBgIndex + 1 : 1}/{generatedBgList.length})
                  </span>
                </div>

                {/* Active Processing Indicator / Ready Status Banner */}
                {(isGenerating || isVariating) && (selectedBgIndex < 0 || selectedBgIndex >= generatedBgList.length) ? (
                  <div className="mx-2.5 mt-2.5 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2 text-[10px] font-bold text-amber-300 shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin shrink-0" />
                    <span className="truncate">
                      Memproses Variasi #{generatedBgList.length + 1}...
                    </span>
                  </div>
                ) : (
                  <div className="mx-2.5 mt-2.5 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-[10px] font-bold text-emerald-400 shrink-0">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        Siap #{selectedBgIndex >= 0 ? selectedBgIndex + 1 : 1}: {
                          generatedBgList[selectedBgIndex >= 0 ? selectedBgIndex : 0]?.title
                            ? generatedBgList[selectedBgIndex >= 0 ? selectedBgIndex : 0].title.replace(/_Vibrant_\d+|_\d+/g, '').replace(/_/g, ' ')
                            : 'Sub-Concept Item'
                        }
                      </span>
                    </div>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded uppercase font-mono shrink-0">Rendered</span>
                  </div>
                )}

                {/* Vertical Scrollable Sub-Concepts List */}
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-thin">
                  {generatedBgList.map((bg, idx) => {
                    const isSelected = selectedBgIndex === idx;
                    const displayTitle = bg.title
                      ? bg.title.replace(/_Vibrant_\d+|_\d+/g, '').replace(/_/g, ' ')
                      : `Sub-Concept ${idx + 1}`;

                    return (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedBgIndex(idx);
                          setGeneratedTSXCode(bg.code);
                          setPreviewHtmlCode(bg.previewHtml);
                          setDetectedObjects(bg.detectedObjects);
                          setSuggestedVariations(bg.suggestedVariations);
                          setWorkspaceName(bg.title);
                          localStorage.setItem('vremotion_workspace_name', bg.title);
                          triggerRecompile();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedBgIndex(idx);
                            setGeneratedTSXCode(bg.code);
                            setPreviewHtmlCode(bg.previewHtml);
                            setDetectedObjects(bg.detectedObjects);
                            setSuggestedVariations(bg.suggestedVariations);
                            setWorkspaceName(bg.title);
                            localStorage.setItem('vremotion_workspace_name', bg.title);
                            triggerRecompile();
                          }
                        }}
                        className={`w-full p-2 rounded-lg border text-left transition-all flex items-center justify-between gap-2 cursor-pointer group outline-none focus:ring-1 focus:ring-amber-500/50 ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300 font-extrabold shadow-2xs'
                            : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300 font-semibold'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                            isSelected 
                              ? 'bg-amber-500 text-zinc-950 border-amber-500 font-extrabold' 
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 group-hover:text-zinc-200'
                          }`}>
                            #{idx + 1}
                          </span>
                          {bg.title && (
                            <span className={`text-[9px] font-mono px-1 py-0.2 rounded border shrink-0 hidden xs:inline ${
                              bg.title.length >= 88 && bg.title.length <= 130
                                ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-400 font-semibold'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                            }`} title={`Panjang judul: ${bg.title.length} karakter`}>
                              {bg.title.length}c
                            </span>
                          )}
                          {bg.referenceImage && (
                            <div className="relative shrink-0" title="Ref Image (99% Identik & 100% Animasi)">
                              <img
                                src={bg.referenceImage}
                                alt="Ref"
                                className="w-5 h-5 object-cover rounded border border-amber-500/60 shadow-xs"
                              />
                            </div>
                          )}
                          <span className="text-[11px] truncate tracking-tight" title={bg.title || displayTitle}>{displayTitle}</span>
                        </div>

                        <div className="shrink-0 flex items-center gap-1">
                          {bg.title && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyTitle(bg.title);
                              }}
                              className="p-1 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                              title={`Salin Judul Adobe Stock (${bg.title.length} karakter)`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBgIndex(idx);
                              setWorkspaceName(bg.title);
                              setIsPopovModalOpen(true);
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Buka Metadata & 3-Tier Keywords MetaStocker"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSingleSubConcept(idx);
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Unduh sub-konsep ini"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSubConcept(idx);
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-950/60 transition-colors cursor-pointer"
                            title="Hapus sub-konsep ini dari daftar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {(isGenerating || isVariating) && (
                    <div className="w-full p-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 flex items-center justify-between gap-2 text-left animate-pulse">
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border shrink-0 bg-amber-500 text-zinc-950 border-amber-500">
                          #{generatedBgList.length + 1}
                        </span>
                        <span className="text-[11px] truncate tracking-tight font-semibold">
                          Memproses Variasi #{generatedBgList.length + 1}...
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center">
                        <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Download & Reset Actions */}
                <div className="p-2 bg-zinc-950 border-t border-zinc-800 shrink-0 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      const currentList = [...generatedBgList];
                      const usedNames = new Set<string>();
                      for (let idx = 0; idx < currentList.length; idx++) {
                        const bg = currentList[idx];
                        const baseFileName = getCleanPopovFilename(bg.title);
                        let fileName = baseFileName;
                        let counter = 2;
                        while (usedNames.has(fileName)) {
                          fileName = baseFileName.replace(/\.tsx$/, ` (${counter}).tsx`);
                          counter++;
                        }
                        usedNames.add(fileName);
                        // Simpan TSX (Metadata IPTC Core sudah tertanam langsung di dalam kode TSX)
                        await saveFileToMotionBackgroundsFolder(fileName, healTsxSyntaxErrors(bg.code));
                        await new Promise(r => setTimeout(r, 120));
                      }
                      handleResetAll();
                    }}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Download semua file TSX sekaligus ke folder Motion Backgrounds TSX"
                  >
                    <Save className="w-3.5 h-3.5 text-zinc-950" />
                    Download Semua ({generatedBgList.length} .TSX)
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="w-full py-1.5 px-3 bg-zinc-900 hover:bg-red-950/50 hover:border-red-800/50 text-zinc-400 hover:text-red-300 border border-zinc-800 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Hapus semua project dari daftar untuk membebaskan RAM"
                  >
                    <RotateCcw className="w-3 h-3 text-red-400" />
                    Reset Semua Project
                  </button>
                </div>

              </div>
            )}

            {/* INTERACTIVE PREVIEW PLAYER WITH MULTI-DIMENSIONAL SPATIAL CONTROLS */}
            <div className={`flex-1 flex flex-col bg-zinc-950 relative border-b lg:border-b-0 lg:border-r border-zinc-800 overflow-hidden ${
              activeMobileTab === 'preview' ? 'flex' : 'hidden lg:flex'
            }`}>
              
              <div className="h-auto sm:h-10 border-b border-zinc-800 bg-zinc-900 px-4 sm:px-5 py-2 sm:py-0 flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="hidden lg:flex items-center justify-center p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-400 hover:text-amber-300 transition-all cursor-pointer mr-1"
                    title={isSidebarOpen ? "Tutup Panel Parameter" : "Buka Panel Parameter"}
                  >
                    {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                  </button>

                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest ml-2 sm:ml-3 truncate max-w-[150px] xs:max-w-none">
                    <span className="hidden sm:inline">COMPOSITION </span>TRANSFORM EDITOR
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-amber-400 border border-zinc-700 hidden sm:inline-flex items-center gap-1">
                    {activeLayoutPreset.isLandscape ? <Monitor className="w-2.5 h-2.5" /> : <Smartphone className="w-2.5 h-2.5" />}
                    {activeLayoutPreset.aspect} ({activeLayoutPreset.resolution} {activeLayoutPreset.fps}fps)
                  </span>

                  {/* GPU Eco Mode / High-Performance Preview Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode = !previewGpuOptimized;
                      setPreviewGpuOptimized(nextMode);
                      const targetW = nextMode 
                        ? (activeLayoutPreset.isLandscape ? 1920 : 1080)
                        : activeLayoutPreset.width;
                      const targetH = nextMode
                        ? (activeLayoutPreset.isLandscape ? 1080 : 1920)
                        : activeLayoutPreset.height;
                      if (previewHtmlCode) {
                        setPreviewHtmlCode(ensurePreviewHtmlResolution(previewHtmlCode, targetW, targetH, fps, duration));
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      previewGpuOptimized
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                    }`}
                    title={previewGpuOptimized ? "Mode Hemat GPU Aktif: Pratinjau 1080p Tajam & Dingin (Ekspor TSX tetap 4K). Klik untuk beralih ke Native 4K." : "Mode Native 4K Aktif: Pratinjau Kanvas 4K Penuh (Memakan banyak GPU). Klik untuk beralih ke Mode Hemat GPU."}
                  >
                    <Zap className={`w-3 h-3 ${previewGpuOptimized ? 'text-emerald-400 fill-emerald-400/20' : 'text-zinc-400'}`} />
                    <span>{previewGpuOptimized ? 'GPU Eco (1080p)' : 'Native 4K'}</span>
                  </button>

                  {bgOverride === 'alpha' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 hidden md:inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-xs border border-zinc-600" style={{ backgroundImage: 'linear-gradient(45deg, #71717a 25%, transparent 25%), linear-gradient(-45deg, #71717a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #71717a 75%), linear-gradient(-45deg, transparent 75%, #71717a 75%)', backgroundSize: '3px 3px' }} />
                      Alpha Channel
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2.5 self-end sm:self-auto">
                  {/* Save Coordinate Edits Button */}
                  <button
                    onClick={handleSaveEditsToCode}
                    className={`flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                      saveEditsSuccess 
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold border-amber-500'
                    }`}
                    title="Simpan pergeseran & zoom koordinat langsung ke kode TSX & HTML preview"
                  >
                    {saveEditsSuccess ? <Check className="w-3 h-3 text-amber-300" /> : <Save className="w-3 h-3 text-zinc-950" />}
                    {saveEditsSuccess ? 'Saved' : 'Simpan Edit'}
                  </button>

                  <button 
                    onClick={triggerRecompile}
                    className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer"
                    title="Muat ulang render kompilasi sandbox"
                  >
                    <RefreshCw className="w-2.5 h-2.5 text-zinc-400" />
                    Re-Compile
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenRenderModal}
                    className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                    title="Render Video Langsung di Sini (Muted • Alpha Channel • ProRes 4444 / MP4 H.264 / ProRes Small)"
                  >
                    <Film className="w-3 h-3 text-zinc-950" />
                    <span>Render Video</span>
                  </button>
                </div>
              </div>

              {/* MULTI-DIMENSIONAL TRANSFORM CONTROLS PANEL */}
              <div className="bg-zinc-900 border-b border-zinc-800 p-2 sm:p-2.5 flex flex-col gap-2 shrink-0">
                {/* Manual Translation sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full min-w-0">
                  <div className="flex items-center justify-between gap-1.5 text-xs font-semibold text-zinc-300 bg-zinc-950/80 border border-zinc-800 px-2 py-1.5 rounded-lg w-full min-w-0 overflow-hidden">
                    <span className="flex items-center gap-1 shrink-0 text-amber-400 font-bold min-w-[28px]">
                      <Move className="w-3.5 h-3.5 text-amber-500" />
                      <span>X:</span>
                    </span>
                    <input 
                      type="range"
                      min="-1200"
                      max="1200"
                      value={panX}
                      onChange={(e) => setPanX(parseInt(e.target.value))}
                      className="min-w-0 flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="font-mono text-[10px] text-amber-400 min-w-[40px] text-right shrink-0">{panX}px</span>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 text-xs font-semibold text-zinc-300 bg-zinc-950/80 border border-zinc-800 px-2 py-1.5 rounded-lg w-full min-w-0 overflow-hidden">
                    <span className="flex items-center gap-1 shrink-0 text-amber-400 font-bold min-w-[28px]">
                      <Move className="w-3.5 h-3.5 text-amber-500 rotate-90" />
                      <span>Y:</span>
                    </span>
                    <input 
                      type="range"
                      min="-1200"
                      max="1200"
                      value={panY}
                      onChange={(e) => setPanY(parseInt(e.target.value))}
                      className="min-w-0 flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="font-mono text-[10px] text-amber-400 min-w-[40px] text-right shrink-0">{panY}px</span>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 text-xs font-semibold text-zinc-300 bg-zinc-950/80 border border-zinc-800 px-2 py-1.5 rounded-lg w-full min-w-0 overflow-hidden">
                    <span className="flex items-center gap-1 shrink-0 text-amber-400 font-bold min-w-[46px]">
                      <ZoomIn className="w-3.5 h-3.5 text-amber-500" />
                      <span>Zoom:</span>
                    </span>
                    <input 
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="min-w-0 flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="font-mono text-[10px] text-amber-400 min-w-[32px] text-right shrink-0">{zoom}x</span>
                  </div>
                </div>

                {/* Direct quick move buttons */}
                <div className="flex items-center justify-between flex-wrap gap-1.5 bg-zinc-950/40 border border-zinc-800/80 p-1.5 rounded-lg w-full">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button 
                      onClick={() => setPanX(prev => prev - 50)} 
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[9px] sm:text-[10px] font-bold rounded text-zinc-300 cursor-pointer transition-colors"
                      title="Geser Kiri"
                    >
                      ← Kiri
                    </button>
                    <button 
                      onClick={() => setPanX(prev => prev + 50)} 
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[9px] sm:text-[10px] font-bold rounded text-zinc-300 cursor-pointer transition-colors"
                      title="Geser Kanan"
                    >
                      Kanan →
                    </button>
                    <button 
                      onClick={() => setPanY(prev => prev - 50)} 
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[9px] sm:text-[10px] font-bold rounded text-zinc-300 cursor-pointer transition-colors"
                      title="Geser Atas"
                    >
                      ↑ Atas
                    </button>
                    <button 
                      onClick={() => setPanY(prev => prev + 50)} 
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[9px] sm:text-[10px] font-bold rounded text-zinc-300 cursor-pointer transition-colors"
                      title="Geser Bawah"
                    >
                      Bawah ↓
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setZoom(prev => Math.min(3.0, parseFloat((prev + 0.1).toFixed(2))))} 
                      className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 cursor-pointer transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setZoom(prev => Math.max(0.2, parseFloat((prev - 0.1).toFixed(2))))} 
                      className="p-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 cursor-pointer transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => {
                        setPanX(0);
                        setPanY(0);
                        setZoom(1.0);
                      }} 
                      className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-[9px] sm:text-[10px] font-extrabold uppercase rounded cursor-pointer transition-colors ml-0.5"
                      title="Reset Posisi & Skala"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* BINGKAI PREVIEW INTERAKTIF */}
              <div 
                ref={previewContainerRef} 
                className={`flex-1 flex items-center justify-center bg-zinc-950 overflow-hidden relative group select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleTsxFileDrop}
              >
                <div className="absolute top-3 left-3 z-20 pointer-events-none bg-zinc-900/90 backdrop-blur border border-zinc-800 px-2.5 py-1 rounded-md flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 shadow-sm">
                  <Move className="w-3.5 h-3.5 text-amber-500" />
                  <span>Seret mouse untuk <b>geser</b>, scroll untuk <b>zoom</b></span>
                </div>

                {previewHtmlCode ? (
                  <div 
                    className="relative overflow-hidden transition-shadow shadow-2xl border border-zinc-800 rounded-lg shrink-0"
                    style={{
                      width: `${previewWidth * previewScale}px`,
                      height: `${previewHeight * previewScale}px`,
                      aspectRatio: `${activeLayoutPreset.width} / ${activeLayoutPreset.height}`,
                      ...(bgOverride === 'alpha' ? {
                        backgroundImage: `
                          linear-gradient(45deg, #38383e 25%, transparent 25%), 
                          linear-gradient(-45deg, #38383e 25%, transparent 25%), 
                          linear-gradient(45deg, transparent 75%, #38383e 75%), 
                          linear-gradient(-45deg, transparent 75%, #38383e 75%)
                        `,
                        backgroundSize: '20px 20px',
                        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                        backgroundColor: '#18181b'
                      } : {
                        backgroundColor: bgOverride === 'greenscreen' ? '#00ff00' : bgOverride === 'white' ? '#ffffff' : '#000000'
                      })
                    }}
                  >
                    <iframe 
                      ref={iframeRef}
                      key={`${previewHtmlCode}_${activeLayoutPreset.key}_${bgOverride}_${previewGpuOptimized ? 'eco' : '4k'}_${selectedLocalFontId}`}
                      title="Remotion Sandbox Rendering Engine"
                      srcDoc={injectInteractiveControls(previewHtmlCode)}
                      className="transition-transform duration-100 ease-out"
                      style={{
                        width: `${previewWidth}px`,
                        height: `${previewHeight}px`,
                        transform: `scale(${previewScale})`,
                        transformOrigin: 'top left',
                        border: 'none',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: 'none',
                        backgroundColor: 'transparent',
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest text-center">
                    Generate animasi latar belakang untuk memulai penayangan.
                  </div>
                )}
              </div>

              {/* PLAYBACK CONTROLLER BAR (SCRUBBER & BUTTONS) */}
              <div className="h-auto min-h-12 border-t border-zinc-800 bg-zinc-900 px-2 sm:px-4 py-2 flex items-center justify-between shrink-0 gap-1.5 sm:gap-3 flex-wrap sm:flex-nowrap min-w-0">
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentFrame(0);
                    }}
                    className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                    title="Kembali ke Awal (Skip Back)"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      const nextPlay = !isPlaying;
                      isUserManuallyPausedRef.current = !nextPlay;
                      setIsPlaying(nextPlay);
                    }}
                    className="p-1.5 rounded-full bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-95 transition-all shadow-2xs cursor-pointer flex items-center justify-center"
                    title={isPlaying ? "Jeda" : "Putar"}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      isUserManuallyPausedRef.current = true;
                      const totalFrames = duration * fps;
                      setCurrentFrame(totalFrames - 1);
                    }}
                    className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                    title="Lompat ke Akhir"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      isUserManuallyPausedRef.current = false;
                      setIsPlaying(true);
                      setCurrentFrame(0);
                    }}
                    className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                    title="Ulangi dari Awal"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress Scrubber */}
                <div className="flex-1 mx-1 sm:mx-2 min-w-0 flex items-center gap-1 sm:gap-2">
                  <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 min-w-[28px] sm:min-w-[36px] text-right shrink-0">
                    {Math.floor(currentFrame)}f
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={duration * fps - 1}
                    value={Math.floor(currentFrame)}
                    onChange={(e) => {
                      setIsPlaying(false);
                      isUserManuallyPausedRef.current = true;
                      setCurrentFrame(parseInt(e.target.value));
                    }}
                    className="flex-1 min-w-0 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 min-w-[28px] sm:min-w-[36px] text-left shrink-0">
                    {duration * fps}f
                  </span>
                </div>

                {/* Control Settings */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Loop Toggle */}
                  <button
                    onClick={() => {
                      const nextLoop = !isLoopOn;
                      setIsLoopOn(nextLoop);
                      if (nextLoop) {
                        isUserManuallyPausedRef.current = false;
                        setIsPlaying(true);
                      }
                    }}
                    className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                      isLoopOn 
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                        : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Ulangi terus menerus"
                  >
                    Loop: {isLoopOn ? "ON" : "OFF"}
                  </button>

                  {/* Speed Selector */}
                  <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-md p-0.5 shrink-0">
                    {[0.5, 1.0, 2.0].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer ${
                          playbackSpeed === speed
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* REAL-TIME EDITABLE TSX CODE AREA */}
            <div className={`flex-1 flex flex-col bg-zinc-900 border-l border-zinc-800 overflow-hidden ${
              activeMobileTab === 'code' ? 'flex' : 'hidden lg:flex'
            }`}>
              <div className="h-auto min-h-10 border-b border-zinc-800 bg-zinc-950 px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between shrink-0 gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-[10px] font-mono text-zinc-300 font-bold tracking-wider truncate">
                    {getCleanPopovFilename(workspaceName || "Motion Background")}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => importTsxFileInputRef.current?.click()}
                    disabled={isImportingTsx}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                    title="Import berkas .tsx dari PC ke Code Editor dan pratinjau visual"
                  >
                    {isImportingTsx ? <Loader2 className="w-3 h-3 animate-spin text-amber-400" /> : <Upload className="w-3 h-3 text-amber-400" />}
                    <span>Import TSX dari PC</span>
                  </button>
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded whitespace-nowrap">
                    Live Code Editor
                  </span>
                </div>
              </div>

              {generatedTSXCode ? (
                <div className="flex-1 p-2 sm:p-3 overflow-hidden flex flex-col gap-2.5">
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingTsx(true); }}
                    onDragLeave={() => setIsDraggingTsx(false)}
                    onDrop={(e) => { setIsDraggingTsx(false); handleTsxFileDrop(e); }}
                    className={`flex-1 min-h-[200px] bg-zinc-950 border rounded-xl overflow-hidden flex flex-col transition-colors relative ${
                      isDraggingTsx ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-zinc-800'
                    }`}
                  >
                    {isDraggingTsx && (
                      <div className="absolute inset-0 bg-amber-950/80 backdrop-blur-xs z-20 flex flex-col items-center justify-center gap-2 pointer-events-none border-2 border-dashed border-amber-400 rounded-xl">
                        <Upload className="w-8 h-8 text-amber-400 animate-bounce" />
                        <span className="text-sm font-bold text-amber-200">Lepaskan berkas .tsx untuk mengimpor dari PC</span>
                        <span className="text-xs text-amber-400/80">Visual akan langsung tampil dan siap diedit</span>
                      </div>
                    )}
                    <textarea
                      ref={textareaRef}
                      value={generatedTSXCode}
                      onChange={(e) => setGeneratedTSXCode(e.target.value)}
                      className="flex-1 p-3 sm:p-4 text-[12px] font-mono leading-relaxed text-zinc-300 bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-amber-500/40 overflow-y-auto no-scrollbar whitespace-pre resize-none"
                      style={{ fontStyle: 'normal' }}
                      spellCheck={false}
                    />
                    <div className="px-2.5 py-2 sm:px-4 sm:py-2.5 border-t border-zinc-800 bg-zinc-900 flex flex-col md:flex-row items-center justify-between text-[10px] sm:text-[11px] text-zinc-400 gap-2 shrink-0">
                      <span className="text-[9px] sm:text-[10px] text-center md:text-left text-zinc-400/80 leading-tight">
                        Ubah isi kode di atas untuk penyesuaian logika render realtime
                      </span>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-end w-full md:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => importTsxFileInputRef.current?.click()}
                          disabled={isImportingTsx}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-zinc-700 disabled:opacity-50"
                          title="Import berkas .tsx dari PC"
                        >
                          {isImportingTsx ? <Loader2 className="w-3 h-3 animate-spin text-amber-400" /> : <Upload className="w-3 h-3 text-amber-400" />}
                          <span>Import TSX</span>
                        </button>

                        <button
                          onClick={handleSaveEditsToCode}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap ${
                            saveEditsSuccess 
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold' 
                            : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-500 font-extrabold'
                          }`}
                          title="Simpan pergeseran & zoom koordinat ke dalam kode TSX"
                        >
                          {saveEditsSuccess ? <Check className="w-3 h-3 text-amber-300 shrink-0" /> : <Save className="w-3 h-3 text-zinc-950 shrink-0" />}
                          <span>{saveEditsSuccess ? 'Saved!' : 'Simpan Edit'}</span>
                        </button>

                        <button
                          onClick={handleSaveToPCFolder}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border whitespace-nowrap ${
                            saveSuccess 
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold' 
                            : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-500 font-extrabold'
                          }`}
                          title="Download .TSX file"
                        >
                          <Save className="w-3 h-3 fill-current shrink-0" />
                          <span>{saveSuccess ? 'Downloaded!' : 'Download .TSX'}</span>
                        </button>

                        <button
                          onClick={triggerRecompile}
                          className="flex-1 sm:flex-none flex items-center justify-center px-2.5 py-1.5 sm:py-1 bg-zinc-800 hover:bg-zinc-700 text-[9px] sm:text-[10px] font-bold rounded text-zinc-200 transition-all cursor-pointer border border-zinc-700 whitespace-nowrap"
                        >
                          Recompile
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AI VISUAL INSTRUCTION & CHAT MODIFIER (TEPAT DI BAWAH TEXTAREA KODE RESULT) */}
                  <div className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-2.5 sm:p-3 flex flex-col gap-2 shrink-0 shadow-xl bg-gradient-to-b from-zinc-950 to-zinc-900/90">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                              Chat Editor Instruksi Visual
                            </span>
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700/80 text-emerald-300">
                              Surgical Patch (Ubah Bagian Tertentu Saja)
                            </span>
                          </div>
                          <span className="text-[9px] text-zinc-400 truncate">
                            Tulis daftar poin perubahan visual • Komponen lain dijamin 100% tetap utuh
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {codeUndoHistory.length > 0 && (
                          <button
                            type="button"
                            onClick={handleUndoCodeRevision}
                            disabled={isApplyingInstruction}
                            className="text-[9px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            title="Kembalikan ke versi kode sebelum revisi AI terakhir"
                          >
                            <Undo2 className="w-2.5 h-2.5" />
                            <span>Undo ({codeUndoHistory.length})</span>
                          </button>
                        )}

                        {instructionChatLog.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setIsChatLogExpanded(!isChatLogExpanded)}
                            className="text-[9px] text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <History className="w-2.5 h-2.5 text-zinc-400" />
                            <span>{isChatLogExpanded ? 'Tutup Riwayat' : `Riwayat (${instructionChatLog.length})`}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* LOCAL FONT SELECTOR & UPLOADER BAR DIRECTLY INSIDE CHAT EDITOR */}
                    <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg px-2.5 py-2 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Type className={`w-3.5 h-3.5 shrink-0 ${activeLocalFont ? 'text-amber-400' : 'text-zinc-400'}`} />
                        <span className="text-[10px] font-bold text-zinc-300 shrink-0">
                          Font Lokal (PC):
                        </span>

                        {localCustomFonts.length > 0 ? (
                          <select
                            value={selectedLocalFontId}
                            onChange={(e) => {
                              const nextId = e.target.value;
                              setSelectedLocalFontId(nextId);
                              if (nextId) {
                                localStorage.setItem('vremotion_selected_local_font_id', nextId);
                                const found = localCustomFonts.find(f => f.id === nextId) || null;
                                if (found) {
                                  setCleanNoText(false);
                                  applyLocalFontToCurrentAnimation(found);
                                }
                              } else {
                                localStorage.removeItem('vremotion_selected_local_font_id');
                              }
                            }}
                            disabled={isApplyingInstruction}
                            className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-[10px] font-semibold text-amber-300 focus:outline-none focus:border-amber-500 cursor-pointer truncate max-w-[200px] sm:max-w-[260px]"
                          >
                            <option value="">-- Gunakan Font Default / Google Font --</option>
                            {localCustomFonts.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.familyName} ({f.fileName})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] text-zinc-500 truncate">
                            Belum ada font lokal (.ttf/.otf/.woff2)
                          </span>
                        )}

                        {activeLocalFont && (
                          <span
                            className="text-xs text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/60 truncate hidden sm:inline-block"
                            style={{ fontFamily: `'${activeLocalFont.familyName}', sans-serif` }}
                            title={`Pratinjau bentuk huruf asli dari ${activeLocalFont.fileName}`}
                          >
                            {activeLocalFont.familyName} • Locked
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => localFontInputRef.current?.click()}
                          disabled={isApplyingInstruction}
                          className="px-2 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Upload file font (.TTF, .OTF, .WOFF2, .WOFF) dari penyimpanan lokal PC Anda"
                        >
                          <Upload className="w-2.5 h-2.5 text-amber-400" />
                          <span>+ Upload Font Lokal</span>
                        </button>

                        {activeLocalFont && (
                          <>
                            <button
                              type="button"
                              onClick={() => applyLocalFontToCurrentAnimation(activeLocalFont)}
                              disabled={isApplyingInstruction}
                              className="px-2 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[9px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              title="Langsung terapkan bentuk font lokal ini ke kode TSX & pratinjau saat ini (0 detik tanpa menunggu AI)"
                            >
                              <Check className="w-2.5 h-2.5 text-zinc-950" />
                              <span>Terapkan Instan</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const fontPrompt = `Ubah font teks utama menjadi font lokal '${activeLocalFont.familyName}' (fontFamily: "'${activeLocalFont.familyName}', sans-serif"), sesuaikan ukuran & kerning agar proporsional di tengah Safe Area, dan kunci dengan delayRender agar bentuk huruf saat dirender 100% identik`;
                                setInstructionInput(prev => {
                                  const trimmed = prev.trim();
                                  const lines = trimmed ? trimmed.split('\n') : [];
                                  const nextNum = lines.length + 1;
                                  const newLine = `${nextNum}. ${fontPrompt}`;
                                  return trimmed ? `${trimmed}\n${newLine}` : newLine;
                                });
                              }}
                              disabled={isApplyingInstruction}
                              className="px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Masukkan instruksi modifikasi font lokal ke kotak Chat Editor di bawah"
                            >
                              <Wand2 className="w-2.5 h-2.5 text-amber-400" />
                              <span>+ Ke Chat</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quick Suggestion Pills (Klik untuk menambahkan ke daftar list) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                      <span className="text-[8px] uppercase font-bold text-zinc-500 shrink-0">
                        + Tambah Poin:
                      </span>
                      {[
                        ...(activeLocalFont
                          ? [
                              {
                                label: `🔤 Gunakan Font Lokal (${activeLocalFont.familyName})`,
                                prompt: `Gunakan font lokal '${activeLocalFont.familyName}' (fontFamily: "'${activeLocalFont.familyName}', sans-serif") pada seluruh elemen teks/tipografi utama dan kunci dengan delayRender agar bentuk font saat dirender 100% persis sama`
                              }
                            ]
                          : []),
                        { label: '✏️ Ganti Isi Teks & Animasi Huruf', prompt: 'Ubah tulisan teks utama menjadi "..." dan berikan animasi kinetic typography per huruf yang halus dengan tetap mempertahankan bentuk font lokal yang aktif' },
                        { label: '📥 Edit TSX Terimpor', prompt: 'Pertahankan struktur utama dari berkas TSX yang diimpor, dan modifikasi elemen visual ini:' },
                        { label: '🔍 Zoom Out / Perkecil (0.8x)', prompt: 'Perkecil skala objek/teks (zoom out) menjadi scale: 0.82 dan berikan Safe Area margin minimal 15% dari tepi frame kiri & kanan agar teks tidak terpotong saat dirender' },
                        { label: '🛡️ Safe Area (Anti-Terpotong)', prompt: 'Beri Safe Area margin 20% pada teks utama agar seluruh huruf tidak ada yang terpotong di tepi kanvas 4K saat dirender' },
                        { label: '🔤 Kunci Font Kaligrafi (Anti-Times New Roman)', prompt: 'Kunci font kaligrafi (Caramel / script) dengan delayRender dan Google Fonts @import agar hasil render di Remotion persis identik dengan pratinjau dan tidak berubah menjadi Times New Roman' },
                        { label: '🎨 Ganti Warna Aksen', prompt: 'Ganti skema warna aksen dan partikel menjadi Cyan elektrik dan Emas kontras tinggi' },
                        { label: '⏱️ Perlambat Gerakan 50%', prompt: 'Perlambat ritme dan kecepatan rotasi menjadi 50% lebih pelan dan halus' },
                        { label: '⚡ Percepat Putaran 2x', prompt: 'Percepat ritme perputaran dan pergerakan menjadi 2 kali lipat lebih dinamis' },
                        { label: '🔍 Perbesar Objek +25%', prompt: 'Perbesar skala objek subjek utama sebesar 25% tanpa mengubah elemen lainnya' },
                        { label: '✨ Tambah Partikel & Glow', prompt: 'Tambahkan partikel debu cahaya halus melayang di sekeliling subjek utama' },
                        { label: '💫 Rotasi Lebih Halus', prompt: 'Sempurnakan formula rotasi agar looping 100% harmonik tanpa patahan di akhir frame' },
                        { label: '🌟 Tingkatkan Kontras 3D', prompt: 'Pertegas bayangan ambient occlusion dan rim-light agar kedalaman volumetrik lebih hidup' },
                        { label: '🔲 Transparan (Alpha)', prompt: 'Jadikan latar belakang kanvas murni transparan (Alpha Channel) tanpa background solid' },
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInstructionInput(prev => {
                              const trimmed = prev.trim();
                              const lines = trimmed ? trimmed.split('\n') : [];
                              const nextNum = lines.length + 1;
                              const newLine = `${nextNum}. ${chip.prompt}`;
                              return trimmed ? `${trimmed}\n${newLine}` : newLine;
                            });
                          }}
                          disabled={isApplyingInstruction}
                          className="shrink-0 text-[9px] font-medium px-2 py-0.5 rounded-md bg-zinc-900/90 hover:bg-amber-500/15 hover:text-amber-300 text-zinc-400 border border-zinc-800/90 hover:border-amber-500/30 transition-all cursor-pointer whitespace-nowrap disabled:opacity-40"
                          title="Klik untuk menyisipkan poin ini ke dalam kotak list instruksi"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Collapsible Chat Log / History */}
                    {isChatLogExpanded && instructionChatLog.length > 0 && (
                      <div className="max-h-36 overflow-y-auto no-scrollbar bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-2 flex flex-col gap-1.5 text-[10px]">
                        {instructionChatLog.slice(-6).map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-1.5 rounded-md flex flex-col gap-0.5 ${
                              msg.role === 'user'
                                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200 self-end max-w-[90%]'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 self-start max-w-[95%]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[8px] text-zinc-500">
                              <span className="font-bold uppercase">{msg.role === 'user' ? 'Daftar Instruksi Anda' : 'AI Copilot'}</span>
                              <span>{msg.time}</span>
                            </div>
                            <span className="leading-relaxed whitespace-pre-wrap">{msg.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Feedback Messages */}
                    {instructionSuccessMsg && (
                      <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                          <span className="truncate">{instructionSuccessMsg}</span>
                        </div>
                        <button type="button" onClick={() => setInstructionSuccessMsg(null)} className="cursor-pointer text-emerald-400 hover:text-emerald-200">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {instructionError && (
                      <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300 text-[10px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                          <span className="truncate">{instructionError}</span>
                        </div>
                        <button type="button" onClick={() => setInstructionError(null)} className="cursor-pointer text-rose-400 hover:text-rose-200">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Multiline Textarea Input Bar (Enter = Baris Baru, Ctrl+Enter = Kirim) */}
                    <div className="flex flex-col gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-2 focus-within:border-amber-500/60 focus-within:ring-1 focus-within:ring-amber-500/30 transition-all">
                      <textarea
                        value={instructionInput}
                        onChange={(e) => setInstructionInput(e.target.value)}
                        onKeyDown={(e) => {
                          // Ctrl+Enter atau Cmd+Enter untuk kirim, Enter biasa membuat baris baru
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            handleSendInstruction();
                          }
                        }}
                        placeholder={"Tulis list poin perubahan visual (Enter untuk baris baru):\n1. Ganti warna background jadi navy pekat\n2. Perlambat kecepatan putaran 50%\n3. Perbesar objek utama 15%\n(Hanya poin ini yang akan diubah, elemen lain 100% dipertahankan)"}
                        rows={3}
                        disabled={isApplyingInstruction}
                        className="w-full bg-transparent p-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50 resize-y min-h-[64px] max-h-[140px] leading-relaxed no-scrollbar font-sans"
                      />

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
                        <div className="flex items-center gap-2 text-[9px] text-zinc-500">
                          <span>
                            <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono text-[8px]">Enter</kbd> = baris baru
                          </span>
                          <span>•</span>
                          <span>
                            <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono text-[8px]">Ctrl+Enter</kbd> = kirim
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {instructionInput.trim() && (
                            <button
                              type="button"
                              onClick={() => setInstructionInput('')}
                              disabled={isApplyingInstruction}
                              className="text-[9px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
                            >
                              Bersihkan
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleSendInstruction()}
                            disabled={isApplyingInstruction || !instructionInput.trim()}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-extrabold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            title="Terapkan revisi hanya pada komponen yang dimaksud"
                          >
                            {isApplyingInstruction ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Memodifikasi...</span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-3 h-3" />
                                <span>Terapkan (Surgical Patch)</span>
                                <CornerDownLeft className="w-2.5 h-2.5 opacity-70" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                  Buat animasi terlebih dahulu untuk memulai pengeditan kode.
                </div>
              )}
            </div>

          </div>

          {/* FOOTER BAR */}
          <footer className="h-9 border-t border-zinc-800 px-4 sm:px-6 flex items-center justify-between text-[10px] font-bold text-zinc-400 bg-zinc-900 uppercase tracking-wider z-30 shrink-0">
            <div className="flex items-center gap-4 sm:gap-6">
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                60 FPS Render Pipeline
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                4K UHD Canvas
              </span>
            </div>
          </footer>

        </div>
      </main>

      {/* MODAL INSPEKSI PATH SVG TRACE */}
      {showSvgPathModal && svgCode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                    Struktur Path Vektor SVG Trace
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Ekstraksi Aktif
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {svgMeta?.fileName} &bull; {svgMeta?.pathCount} Geometri &bull; ViewBox: {svgMeta?.viewBox}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSvgPathModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1 font-mono text-xs text-zinc-300 bg-zinc-950/90 leading-relaxed whitespace-pre-wrap select-all selection:bg-emerald-800">
              {svgCode}
            </div>

            <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Anti-Bolong Aktif: AI mengekstrak path asli dan otomatis melapiskan infill solid untuk mencegah celah kosong saat animasi bergerak.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSvgPathModal(false)}
                className="px-4 py-1.5 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* METASTOCKER & ANDREY POPOV SEO ARCHITECTURE MODAL */}
      {isPopovModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950 flex items-start justify-between gap-3 shrink-0">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-extrabold text-zinc-100 tracking-tight">
                      MetaStocker SEO Architecture
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Andrey Popov Standard
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Arsitektur metadata komersial berbasis riset kontributor top dunia (motionpopov / metastocker): Formula judul 5 elemen & 3-Tier Keyword Pyramid untuk Adobe Stock dan Shutterstock.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPopovModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-zinc-200">
              {/* SECTION 1: COMMERCIAL TITLE */}
              <div className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      1. Formula Judul Komersial (Andrey Popov & Fizkes)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      workspaceName.length >= 65 && workspaceName.length <= 130
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                        : 'bg-amber-950/80 border-amber-700 text-amber-300'
                    }`}>
                      {workspaceName.length} Karakter (Target: 65-120)
                    </span>
                    {workspaceName.length >= 65 && workspaceName.length <= 130 && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Stock Valid
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80 leading-relaxed font-mono">
                  <span className="text-amber-400">[Subjek Demografis]</span> + <span className="text-sky-400">[Kata Kerja Aktif/Gerund]</span> + <span className="text-emerald-400">[Objek/Properti]</span> + <span className="text-indigo-400">[Lokasi/Ruang]</span> + <span className="text-rose-400">[Konsep Komersial]</span>
                </div>

                <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-sm font-medium text-zinc-100 leading-relaxed select-all">
                  {workspaceName || "Belum ada judul yang dibuat."}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Tanpa Nomor Acak / Timestamps
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Tanpa Underscore (_)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoFormatWorkspaceTitle}
                      className="px-3 py-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Auto-Fix Formula
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyTitle()}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      {copiedTitle ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedTitle ? "Tersalin!" : "Salin Judul"}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: 3-TIER KEYWORD PYRAMID */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-400" />
                      2. Hierarki Kata Kunci 3-Tier (Piramida SEO MetaStocker)
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Algoritma Adobe Stock & microstock mengutamakan 10 kata kunci pertama (~80% bobot relevansi indeks).
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {currentPopovKeywords.allKeywords ? currentPopovKeywords.allKeywords.split(',').length : 0} Kata Kunci (Target 20-35)
                  </span>
                </div>

                {/* TIER 1: GOLDEN TAGS (1-10) */}
                <div className="bg-zinc-950 border border-amber-500/40 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-zinc-950 font-mono">
                        Tier 1 (Golden Tags #1 - #10)
                      </span>
                      <span className="text-[11px] text-amber-300/90 font-medium hidden sm:inline">
                        80% Bobot Pencarian • Subjek Utama, Aksi & Objek Konkret
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyGoldenTags(currentPopovKeywords.tier1Golden)}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedGoldenTags ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedGoldenTags ? "Tersalin!" : "Salin Golden Tags"}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentPopovKeywords.tier1Golden.map((tag, idx) => (
                      <span
                        key={`t1-${tag}-${idx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-2xs"
                      >
                        <span className="text-[9px] font-mono text-amber-400/70 font-bold">#{idx + 1}</span>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* TIER 2: CONTEXTUAL & ENVIRONMENT (11-25) */}
                <div className="bg-zinc-950 border border-sky-500/30 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-sky-600 text-white font-mono">
                        Tier 2 (Contextual #11 - #25)
                      </span>
                      <span className="text-[11px] text-sky-300/90 font-medium hidden sm:inline">
                        Pencahayaan, Ruang, Tekstur & Dinamika Gerak Animasi
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentPopovKeywords.tier2Contextual.map((tag, idx) => (
                      <span
                        key={`t2-${tag}-${idx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-950/60 border border-sky-700/50 text-sky-200"
                      >
                        <span className="text-[9px] font-mono text-sky-400/70 font-bold">#{idx + 11}</span>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* TIER 3: CONCEPTUAL & COMMERCIAL (26-35) */}
                <div className="bg-zinc-950 border border-emerald-500/30 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-600 text-white font-mono">
                        Tier 3 (Commercial #26 - #35)
                      </span>
                      <span className="text-[11px] text-emerald-300/90 font-medium hidden sm:inline">
                        Commercial Search Intent, Kegunaan Korporat & Branding
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {currentPopovKeywords.tier3Conceptual.map((tag, idx) => (
                      <span
                        key={`t3-${tag}-${idx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/60 border border-emerald-700/50 text-emerald-200"
                      >
                        <span className="text-[9px] font-mono text-emerald-400/70 font-bold">#{idx + 26}</span>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 3: EXPORT & RAW COPY */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    3. Siap Tempel (Comma-Separated untuk Adobe Stock & Shutterstock)
                  </span>
                </div>

                <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-300 leading-relaxed break-words select-all max-h-28 overflow-y-auto">
                  {currentPopovKeywords.allKeywords || "Kata kunci belum tersedia."}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopyTitleAndKeywords(workspaceName, currentPopovKeywords.allKeywords)}
                    className="px-3 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Salin judul dan semua kata kunci dalam satu format teks"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Salin Paket Lengkap (Title + Keywords)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyKeywords(currentPopovKeywords.allKeywords)}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Salin semua kata kunci dipisahkan koma untuk di-paste langsung ke portal Adobe Stock"
                  >
                    {copiedKeywords ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedKeywords ? "Semua Keywords Tersalin!" : "Salin Semua Keywords"}
                  </button>
                </div>
              </div>

              {/* SECTION 4: IPTC CORE METADATA TERTANAM LANGSUNG DI DALAM .TSX */}
              <div className="bg-zinc-950 border border-emerald-500/40 rounded-xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      4. IPTC Core Metadata (100% Tertanam Langsung di Dalam .TSX)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold">
                    Built-in .TSX IPTC Core
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Semua metadata IPTC Core (<strong>Title, Headline, Description, Keywords</strong>) sudah <strong>tertanam langsung di dalam kode berkas .TSX</strong> tanpa memerlukan berkas eksternal <code className="text-zinc-400 line-through">.xmp</code>. Ketika berkas .TSX ini dirender oleh Remotion/FFmpeg, Remotion mengekspor data metadata tersebut ke dalam properti kontainer video sehingga saat dicek di <strong>Adobe Bridge</strong> seluruh kolom langsung otomatis terisi:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">IPTC Core Title:</span>
                      <span className="text-[9px] text-emerald-400 font-semibold">Tertanam di .TSX</span>
                    </div>
                    <div className="text-zinc-200 font-medium text-xs truncate" title={workspaceName}>
                      {workspaceName || "Belum ada judul"}
                    </div>
                  </div>

                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">IPTC Core Headline:</span>
                      <span className="text-[9px] text-emerald-400 font-semibold">100% Sama dgn Title</span>
                    </div>
                    <div className="text-zinc-200 font-medium text-xs truncate" title={workspaceName}>
                      {workspaceName || "Belum ada judul"}
                    </div>
                  </div>

                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">IPTC Core Description:</span>
                      <span className="text-[9px] text-emerald-400 font-semibold">100% Sama dgn Title</span>
                    </div>
                    <div className="text-zinc-200 font-medium text-xs truncate" title={workspaceName}>
                      {workspaceName || "Belum ada judul"}
                    </div>
                  </div>

                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono">IPTC Core Keywords:</span>
                      <span className="text-[9px] text-amber-400 font-semibold">
                        {currentPopovKeywords.allKeywords ? currentPopovKeywords.allKeywords.split(',').length : 0} Kata Kunci (20-35)
                      </span>
                    </div>
                    <div className="text-zinc-200 font-mono text-[11px] truncate">
                      {currentPopovKeywords.allKeywords ? currentPopovKeywords.allKeywords.slice(0, 80) + '...' : 'Belum ada kata kunci'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyEmbeddedIptc}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    title="Salin blok kode konstanta IPTC yang tertanam di dalam berkas .TSX"
                  >
                    {copiedEmbeddedIptc ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedEmbeddedIptc ? "Konstanta IPTC Tersalin!" : "Salin Blok IPTC (.TSX)"}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Standar MetaStocker Andrey Popov: 100% bebas banned words (beautiful, 4k, stunning), terindeks ramah SEO.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPopovModalOpen(false)}
                className="px-4 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN OFFSCREEN SANDBOX IFRAME FOR DETERMINISTIC DIRECT VIDEO RENDERING */}
      <div
        style={{
          position: 'fixed',
          left: '-99999px',
          top: '-99999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0,
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        <iframe
          ref={renderSandboxIframeRef}
          title="Offscreen Deterministic Video Render Sandbox"
          style={{ border: 'none', backgroundColor: 'transparent' }}
        />
      </div>

      {/* DIRECT VIDEO RENDER ENGINE MODAL (MUTED • ALPHA CHANNEL • PRORES 4444 / MP4 H.264 / PRORES SMALL) */}
      {isRenderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-zinc-900 border border-zinc-700/90 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950 flex items-start justify-between gap-3 shrink-0">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 shrink-0">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-extrabold text-zinc-100 tracking-tight">
                      Direct Video Render Engine
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      100% Muted (No Audio)
                    </span>
                    {renderAlphaChannel && (renderCodec === 'prores_4444' || renderCodec === 'prores_small') && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Alpha Channel Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Render hasil animasi langsung di sini menjadi berkas video siap unggah ke Adobe Stock / Shutterstock dengan FFmpeg pipeline (Muted otomatis & metadata IPTC tertanam).
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isRenderingVideo}
                onClick={() => setIsRenderModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors shrink-0 disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5 text-zinc-200">
              {/* 1. PILIH CODEC VIDEO */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    1. Pilih Codec Render Video
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                    Audio: Muted (-an)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* ProRes 4444 */}
                  <button
                    type="button"
                    disabled={isRenderingVideo}
                    onClick={() => setRenderCodec('prores_4444')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                      renderCodec === 'prores_4444'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200 ring-1 ring-amber-500/50 shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-zinc-100">ProRes 4444</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950">
                          .MOV
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                        Kualitas master studio 10-bit 4:4:4 lossless. Mendukung penuh <b>Alpha Channel</b> (transparan).
                      </p>
                    </div>
                    <div className="text-[9px] font-mono text-amber-400 font-bold">
                      yuva444p10le / yuv444p10le
                    </div>
                  </button>

                  {/* MP4 H.264 */}
                  <button
                    type="button"
                    disabled={isRenderingVideo}
                    onClick={() => {
                      setRenderCodec('mp4_h264');
                      if (renderAlphaChannel) {
                        setRenderAlphaChannel(false);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                      renderCodec === 'mp4_h264'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200 ring-1 ring-amber-500/50 shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-zinc-100">MP4 H.264</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500 text-zinc-950">
                          .MP4
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                        Kompatibilitas universal tinggi & ukuran efisien untuk preview maupun microstock standar.
                      </p>
                    </div>
                    <div className="text-[9px] font-mono text-sky-400 font-bold">
                      libx264 • yuv420p (CRF 17)
                    </div>
                  </button>

                  {/* ProRes Small */}
                  <button
                    type="button"
                    disabled={isRenderingVideo}
                    onClick={() => setRenderCodec('prores_small')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                      renderCodec === 'prores_small'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200 ring-1 ring-amber-500/50 shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-zinc-100">ProRes Small</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-zinc-950">
                          .MOV
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-snug">
                        Versi hemat ukuran file dari Apple ProRes (422 Proxy / Compact Alpha) untuk upload cepat.
                      </p>
                    </div>
                    <div className="text-[9px] font-mono text-emerald-400 font-bold">
                      ProRes Compact • Ukuran Ringan
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. OPSI ALPHA CHANNEL (TRANSPARANSI) & MUTED STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                  renderAlphaChannel
                    ? 'bg-amber-500/10 border-amber-500/60'
                    : 'bg-zinc-950 border-zinc-800'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-xs border border-zinc-600 shrink-0 inline-block"
                        style={{
                          backgroundImage: 'linear-gradient(45deg, #71717a 25%, transparent 25%), linear-gradient(-45deg, #71717a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #71717a 75%), linear-gradient(-45deg, transparent 75%, #71717a 75%)',
                          backgroundSize: '6px 6px',
                          backgroundColor: '#27272a'
                        }}
                      />
                      <span className="text-xs font-extrabold text-zinc-100">
                        Render dengan Alpha Channel
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isRenderingVideo}
                      onClick={() => {
                        const nextAlpha = !renderAlphaChannel;
                        setRenderAlphaChannel(nextAlpha);
                        if (nextAlpha) {
                          handleSelectBgOverride('alpha');
                          if (renderCodec === 'mp4_h264') {
                            setRenderCodec('prores_4444');
                          }
                        } else if (bgOverride === 'alpha') {
                          handleSelectBgOverride('none');
                        }
                      }}
                      className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        renderAlphaChannel ? 'bg-amber-500' : 'bg-zinc-800'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform absolute top-0.5 ${
                        renderAlphaChannel ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    {renderAlphaChannel
                      ? 'Aktif: Latar belakang dihapus menjadi murni transparan (RGBA 10-bit yuva444p10le). Otomatis menggunakan kontainer .MOV ProRes.'
                      : 'Nonaktif: Video dirender dengan latar belakang penuh (Opaque) sesuai pengaturan warna latar saat ini.'}
                  </p>
                </div>

                {/* Status Audio Muted Permanen */}
                <div className="p-3.5 rounded-xl border border-emerald-800/50 bg-emerald-950/20 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Standar Audio Microstock
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500 text-zinc-950">
                      MUTED TERKUNCI
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Sesuai syarat mutlak Adobe Stock & Shutterstock, seluruh hasil render dikunci tanpa jalur suara (<b>100% Muted / -an</b>) sehingga bebas penolakan audio noise.
                  </p>
                </div>
              </div>

              {/* 3. RESOLUSI & PARAMETER FRAME RENDER */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300">
                    3. Resolusi Render Output ({activeLayoutPreset.isLandscape ? 'Landscape 16:9' : 'Vertical 9:16'})
                  </span>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">
                    {duration}s • {fps} FPS ({duration * fps} Frames)
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      key: '1080p',
                      label: 'Full HD 1080p (Cepat)',
                      dim: activeLayoutPreset.isLandscape ? '1920 × 1080' : '1080 × 1920',
                    },
                    {
                      key: '2k',
                      label: '2K QHD (Detail Tinggi)',
                      dim: activeLayoutPreset.isLandscape ? '2560 × 1440' : '1440 × 2560',
                    },
                    {
                      key: '4k',
                      label: '4K UHD (Ultra Master)',
                      dim: activeLayoutPreset.isLandscape ? '3840 × 2160' : '2160 × 3840',
                    },
                  ].map((resItem) => (
                    <button
                      key={resItem.key}
                      type="button"
                      disabled={isRenderingVideo}
                      onClick={() => setRenderResolutionMode(resItem.key as any)}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        renderResolutionMode === resItem.key
                          ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-[11px] font-bold truncate">{resItem.label}</div>
                      <div className="text-[10px] font-mono text-zinc-400 mt-0.5">{resItem.dim}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PROGRESS BAR SAAT PROSES RENDER BERJALAN */}
              {isRenderingVideo && (
                <div className="bg-zinc-950 border border-amber-500/50 rounded-xl p-4 space-y-2.5 animate-pulse">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                    <span className="flex items-center gap-2 truncate">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                      <span className="truncate">{renderStatusText || 'Memproses render...'}</span>
                    </span>
                    <span className="font-mono shrink-0 ml-2">
                      {Math.round((renderCurrentFrame / Math.max(1, renderTotalFrames)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-150"
                      style={{ width: `${Math.min(100, Math.round((renderCurrentFrame / Math.max(1, renderTotalFrames)) * 100))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>Frame {renderCurrentFrame} dari {renderTotalFrames}</span>
                    <span>Codec: {renderCodec.toUpperCase()} • Audio: Muted</span>
                  </div>
                </div>
              )}

              {/* ERROR FEEDBACK */}
              {renderErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/80 text-rose-200 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{renderErrorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRenderErrorMsg(null)}
                    className="text-rose-400 hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* HASIL VIDEO SETELAH SELESAI DIRENDER */}
              {renderedVideoResult && !isRenderingVideo && (
                <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-extrabold text-emerald-200">
                          Render Video Berhasil & Diunduh Otomatis!
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono truncate max-w-md">
                          {renderedVideoResult.fileName} ({renderedVideoResult.sizeMB})
                        </div>
                      </div>
                    </div>
                    <a
                      href={renderedVideoResult.downloadUrl}
                      download={renderedVideoResult.fileName}
                      className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Ulang ({renderedVideoResult.extension.toUpperCase()})</span>
                    </a>
                  </div>

                  {renderedVideoResult.blobUrl && (renderedVideoResult.extension === 'mp4' || renderedVideoResult.extension === 'webm') && (
                    <div className="rounded-lg overflow-hidden border border-zinc-800 bg-black max-h-48 flex items-center justify-center">
                      <video
                        src={renderedVideoResult.blobUrl}
                        controls
                        muted
                        loop
                        autoPlay
                        playsInline
                        className="max-h-48 w-auto object-contain"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <Film className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  FFmpeg Server Pipeline • Muted (-an) • IPTC Metadata Embedded
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isRenderingVideo ? (
                  <button
                    type="button"
                    onClick={handleCancelDirectRender}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Batalkan Render</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsRenderModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Tutup
                    </button>
                    <button
                      type="button"
                      onClick={handleStartDirectRender}
                      className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Film className="w-4 h-4 text-zinc-950" />
                      <span>Mulai Render Sekarang</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK TSX VIDEO RENDER ENGINE MODAL (LOCAL STORAGE & MULTI-FILE IMPORT) */}
      {isBulkRenderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5">
          <div className="bg-zinc-900 border border-zinc-700/90 rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Hidden Input for Bulk TSX File Selection */}
            <input
              ref={bulkTsxFileInputRef}
              type="file"
              multiple
              accept=".tsx,.ts,.jsx,.js"
              onChange={(e) => {
                const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
                if (files.length > 0) processBulkTsxFiles(files);
                e.target.value = '';
              }}
              className="hidden"
            />

            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950 flex items-start justify-between gap-3 shrink-0">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-extrabold text-zinc-100 tracking-tight">
                      Bulk TSX Video Render Engine
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Local Storage & PC Batch
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      100% Muted (Microstock)
                    </span>
                    {bulkRenderAlphaChannel && (bulkRenderCodec === 'prores_4444' || bulkRenderCodec === 'prores_small') && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Alpha Channel
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Render massal otomatis seluruh berkas Remotion .tsx yang di-import dari <b>Local Storage</b> browser atau folder <b>PC</b> menjadi video ProRes 4444 / MP4 siap unggah ke microstock.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isBulkRendering}
                onClick={() => setIsBulkRenderModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors shrink-0 disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Toolbar */}
            <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950/70 flex items-center justify-between gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Import Multi Files from PC */}
                <button
                  type="button"
                  disabled={isBulkRendering || isImportingTsx}
                  onClick={() => bulkTsxFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 cursor-pointer disabled:opacity-50"
                  title="Pilih banyak file .tsx dari komputer sekaligus"
                >
                  {isImportingTsx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus className="w-3.5 h-3.5" />}
                  <span>+ Import File TSX dari PC</span>
                </button>

                {/* Load From Local Storage */}
                <button
                  type="button"
                  disabled={isBulkRendering || isLoadingLocalStorageTsx}
                  onClick={handleLoadFromLocalStorage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700 hover:border-zinc-600 cursor-pointer disabled:opacity-50"
                  title="Ambil seluruh berkas TSX yang tersimpan di Local Storage dan Draf aktif browser"
                >
                  {isLoadingLocalStorageTsx ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <HardDrive className="w-3.5 h-3.5 text-amber-400" />}
                  <span>Ambil dari Local Storage</span>
                </button>

                {/* Save Current Editor to Local Storage */}
                {generatedTSXCode && (
                  <button
                    type="button"
                    disabled={isBulkRendering}
                    onClick={handleSaveActiveToLocalStorageLibrary}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-zinc-700 cursor-pointer"
                    title="Simpan file yang sedang terbuka di editor saat ini ke Library Local Storage"
                  >
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Simpan TSX Aktif ke Library</span>
                  </button>
                )}
              </div>

              {/* Clear Queue */}
              {bulkTsxQueue.length > 0 && !isBulkRendering && (
                <button
                  type="button"
                  onClick={() => updateAndPersistBulkQueue([])}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Antrean</span>
                </button>
              )}
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-zinc-200">
              {/* Alert Feedback */}
              {bulkSuccessAlert && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{bulkSuccessAlert}</span>
                  </div>
                  <button type="button" onClick={() => setBulkSuccessAlert(null)} className="text-emerald-400 hover:text-white p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {bulkRenderErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700/80 text-rose-200 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{bulkRenderErrorMsg}</span>
                  </div>
                  <button type="button" onClick={() => setBulkRenderErrorMsg(null)} className="text-rose-400 hover:text-white p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* DRAG & DROP ZONE (If queue empty or user drags) */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingBulkTsx(true); }}
                onDragLeave={() => setIsDraggingBulkTsx(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingBulkTsx(false);
                  const files = e.dataTransfer.files ? (Array.from(e.dataTransfer.files) as File[]) : [];
                  if (files.length > 0) processBulkTsxFiles(files);
                }}
                onClick={() => bulkTsxFileInputRef.current?.click()}
                className={`p-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 text-center cursor-pointer ${
                  isDraggingBulkTsx
                    ? 'border-amber-400 bg-amber-500/15'
                    : 'border-zinc-700/70 hover:border-zinc-500 bg-zinc-950/50 hover:bg-zinc-950'
                }`}
              >
                <div className="flex items-center gap-2 text-amber-400">
                  <Upload className="w-5 h-5 animate-bounce" />
                  <span className="text-xs sm:text-sm font-bold text-zinc-200">
                    Tarik & Lepas beberapa berkas .tsx ke sini, atau klik untuk memilih
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Mendukung multi-file sekaligus (misal 5, 10, atau 50 berkas .tsx). Resolusi, durasi, dan orientasi otomatis terdeteksi.
                </p>
              </div>

              {/* RENDER CONFIGURATION SETTINGS */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    Pengaturan Bulk Render Output
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                    Audio: 100% Muted (-an) • IPTC Embedded
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Codec: ProRes 4444 */}
                  <button
                    type="button"
                    disabled={isBulkRendering}
                    onClick={() => setBulkRenderCodec('prores_4444')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      bulkRenderCodec === 'prores_4444'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200 ring-1 ring-amber-500/40'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-zinc-100">ProRes 4444</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500 text-zinc-950">.MOV</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">10-bit lossless, mendukung Alpha Channel transparan.</div>
                  </button>

                  {/* Codec: MP4 H.264 */}
                  <button
                    type="button"
                    disabled={isBulkRendering}
                    onClick={() => {
                      setBulkRenderCodec('mp4_h264');
                      if (bulkRenderAlphaChannel) setBulkRenderAlphaChannel(false);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      bulkRenderCodec === 'mp4_h264'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200 ring-1 ring-amber-500/40'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-zinc-100">MP4 H.264</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500 text-zinc-950">.MP4</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">Kompatibel universal & ukuran file sangat efisien.</div>
                  </button>

                  {/* Codec: ProRes Small */}
                  <button
                    type="button"
                    disabled={isBulkRendering}
                    onClick={() => setBulkRenderCodec('prores_small')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      bulkRenderCodec === 'prores_small'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200 ring-1 ring-amber-500/40'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-zinc-100">ProRes Small</span>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500 text-zinc-950">.MOV</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">Versi ringan compact Apple ProRes untuk upload cepat.</div>
                  </button>
                </div>

                {/* Sub Options: Alpha Channel & Resolution Override */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Alpha Channel Toggle */}
                  <div className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                    bulkRenderAlphaChannel ? 'bg-amber-500/10 border-amber-500/50' : 'bg-zinc-900 border-zinc-800'
                  }`}>
                    <div>
                      <div className="text-xs font-bold text-zinc-200">Alpha Channel (Transparan)</div>
                      <div className="text-[10px] text-zinc-400">Otomatis render RGBA transparan (.MOV)</div>
                    </div>
                    <button
                      type="button"
                      disabled={isBulkRendering}
                      onClick={() => {
                        const nextAlpha = !bulkRenderAlphaChannel;
                        setBulkRenderAlphaChannel(nextAlpha);
                        if (nextAlpha && bulkRenderCodec === 'mp4_h264') {
                          setBulkRenderCodec('prores_4444');
                        }
                      }}
                      className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        bulkRenderAlphaChannel ? 'bg-amber-500' : 'bg-zinc-800'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-zinc-950 transition-transform absolute top-0.5 ${
                        bulkRenderAlphaChannel ? 'left-4.5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Resolution Selector */}
                  <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <div className="text-xs font-bold text-zinc-200">Mode Resolusi</div>
                      <div className="text-[10px] text-zinc-400">Pilihan skala output</div>
                    </div>
                    <select
                      value={bulkRenderResolutionMode}
                      disabled={isBulkRendering}
                      onChange={(e) => setBulkRenderResolutionMode(e.target.value as any)}
                      className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-md px-2 py-1 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="native">Resolusi Asli TSX (Native)</option>
                      <option value="1080p">Paksa 1080p Full HD</option>
                      <option value="2k">Paksa 2K QHD</option>
                      <option value="4k">Paksa 4K UHD</option>
                    </select>
                  </div>
                </div>

                {/* Auto Download Option */}
                <div className="flex items-center gap-2 pt-1 text-xs text-zinc-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkAutoDownloadVideos}
                      onChange={(e) => setBulkAutoDownloadVideos(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Otomatis simpan video ke folder <b>Motion Backgrounds Video</b> saat tiap berkas selesai dirender</span>
                  </label>
                </div>
              </div>

              {/* PROGRESS BAR (Active Rendering) */}
              {isBulkRendering && (
                <div className="bg-zinc-950 border border-amber-500/60 rounded-xl p-4 space-y-2.5 animate-pulse shadow-lg">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                    <span className="flex items-center gap-2 truncate">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                      <span className="truncate">{bulkRenderProgressText || 'Memproses bulk render...'}</span>
                    </span>
                    <span className="font-mono shrink-0 ml-2">
                      {Math.round(
                        ((bulkTsxQueue.filter(i => i.status === 'completed').length) / Math.max(1, bulkTsxQueue.length)) * 100
                      )}% Selesai
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-teal-400 transition-all duration-200"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(((bulkTsxQueue.filter(i => i.status === 'completed').length) / Math.max(1, bulkTsxQueue.length)) * 100)
                        )}%`
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>
                      Berkas Selesai: {bulkTsxQueue.filter(i => i.status === 'completed').length} / {bulkTsxQueue.length}
                    </span>
                    <span>Codec: {bulkRenderCodec.toUpperCase()} • Muted (-an)</span>
                  </div>
                </div>
              )}

              {/* QUEUE ITEMS SECTION */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                      Daftar Antrean Berkas ({bulkTsxQueue.length})
                    </span>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[10px] font-bold">
                    {(['all', 'idle', 'completed', 'error'] as const).map((filterKey) => {
                      const count = filterKey === 'all'
                        ? bulkTsxQueue.length
                        : bulkTsxQueue.filter(i => i.status === filterKey).length;
                      const label = filterKey === 'all' ? 'Semua' : filterKey === 'idle' ? 'Menunggu' : filterKey === 'completed' ? 'Selesai' : 'Gagal';
                      return (
                        <button
                          key={filterKey}
                          type="button"
                          onClick={() => setBulkRenderStatusFilter(filterKey)}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            bulkRenderStatusFilter === filterKey
                              ? 'bg-amber-500 text-zinc-950 font-black'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {label} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Empty State */}
                {bulkTsxQueue.length === 0 && (
                  <div className="p-8 rounded-xl border border-zinc-800 bg-zinc-950/60 text-center space-y-2">
                    <FileCode className="w-8 h-8 text-zinc-600 mx-auto" />
                    <div className="text-sm font-bold text-zinc-300">Antrean Render Bulk Masih Kosong</div>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto">
                      Impor berkas .tsx dari PC menggunakan tombol di atas, atau klik <b>Ambil dari Local Storage</b> untuk memuat draf dan template yang pernah tersimpan.
                    </p>
                  </div>
                )}

                {/* Queue Item Cards */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {bulkTsxQueue
                    .filter(item => bulkRenderStatusFilter === 'all' || item.status === bulkRenderStatusFilter)
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          item.status === 'rendering'
                            ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40'
                            : item.status === 'completed'
                              ? 'bg-emerald-950/20 border-emerald-800/60'
                              : item.status === 'error'
                                ? 'bg-rose-950/20 border-rose-800/60'
                                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {/* File Details */}
                        <div className="flex items-start gap-2.5 truncate w-full sm:w-auto">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            item.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : item.status === 'rendering'
                                ? 'bg-amber-500/20 text-amber-400 animate-spin'
                                : item.status === 'error'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {item.status === 'rendering' ? (
                              <Loader2 className="w-4 h-4" />
                            ) : item.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : item.status === 'error' ? (
                              <AlertCircle className="w-4 h-4" />
                            ) : (
                              <FileCode className="w-4 h-4" />
                            )}
                          </div>

                          <div className="truncate">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-zinc-200 truncate" title={item.name}>
                                {item.name}
                              </span>
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                item.importedFrom === 'local_storage'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                  : 'bg-blue-950 text-blue-300 border border-blue-800'
                              }`}>
                                {item.importedFrom === 'local_storage' ? 'Local Storage' : 'PC File'}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-400">
                                {item.resolutionLabel} • {item.fps} FPS • {item.duration}s
                              </span>
                            </div>

                            <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {item.title}
                            </div>

                            {/* Rendering Progress on item */}
                            {item.status === 'rendering' && (
                              <div className="mt-1.5 space-y-1">
                                <div className="text-[10px] text-amber-300 font-mono flex items-center gap-1">
                                  <span>Frame {item.progressFrame || 0} / {item.totalFrames} ({item.progressPercent || 0}%)</span>
                                </div>
                                <div className="w-44 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-400 transition-all duration-150"
                                    style={{ width: `${item.progressPercent || 0}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Completed Status with size */}
                            {item.status === 'completed' && item.renderedVideo && (
                              <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5">
                                <span>✓ Video Siap ({item.renderedVideo.sizeMB}) • {item.renderedVideo.extension.toUpperCase()}</span>
                              </div>
                            )}

                            {/* Error Details */}
                            {item.status === 'error' && item.errorMsg && (
                              <div className="text-[10px] text-rose-400 mt-0.5">
                                Gagal: {item.errorMsg}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons for each item */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {/* Open in Main Editor */}
                          <button
                            type="button"
                            onClick={() => handleLoadItemIntoEditor(item)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                            title="Buka kode & visual di Editor Utama"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Completed: Download Video */}
                          {item.status === 'completed' && item.renderedVideo && (
                            <a
                              href={item.renderedVideo.downloadUrl}
                              download={item.renderedVideo.fileName}
                              className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                              title="Unduh video hasil render"
                            >
                              <Download className="w-3 h-3" />
                              <span>Unduh</span>
                            </a>
                          )}

                          {/* Delete Item from Queue */}
                          {!isBulkRendering && (
                            <button
                              type="button"
                              onClick={() => updateAndPersistBulkQueue(prev => prev.filter(p => p.id !== item.id))}
                              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-md transition-colors cursor-pointer"
                              title="Hapus dari antrean"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3 shrink-0 flex-wrap">
              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <Film className="w-4 h-4 text-amber-400 shrink-0" />
                <span>FFmpeg Pipeline • Muted (-an) • IPTC Meta • Auto-download PC</span>
              </div>

              <div className="flex items-center gap-2">
                {bulkTsxQueue.some(i => i.status === 'completed') && (
                  <button
                    type="button"
                    onClick={handleDownloadAllRenderedVideos}
                    className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-zinc-700 cursor-pointer transition-colors"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Unduh Semua Video Selesai</span>
                  </button>
                )}

                {isBulkRendering ? (
                  <button
                    type="button"
                    onClick={handleCancelBulkRender}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Batalkan Bulk Render</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsBulkRenderModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Tutup
                    </button>
                    <button
                      type="button"
                      disabled={bulkTsxQueue.length === 0}
                      onClick={handleStartBulkRender}
                      className="px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-500 hover:from-amber-400 hover:to-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Film className="w-4 h-4 text-zinc-950" />
                      <span>
                        Mulai Render Bulk ({bulkTsxQueue.filter(i => i.status === 'idle' || i.status === 'error').length} Berkas)
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Provider & API Keys Modal (Gemini Bulk, OpenRouter, 9Router) */}
      <AISettingsModal
        isOpen={isAiSettingsModalOpen}
        onClose={() => setIsAiSettingsModalOpen(false)}
        onSettingsSaved={(newSettings) => {
          setAiSettings(newSettings);
        }}
      />
    </div>
  );
};

export default App;
