/**
 * AI Provider Service: Gemini AI (Bulk Keys with Auto-Failover), OpenRouter, and 9Router.
 * Supports model scanning, key validation, and universal code generation compatible with Cloudflare Pages.
 */

export type AIProviderType = 'gemini' | 'openrouter' | '9router';

export interface ScannedModelInfo {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  isFree?: boolean;
  isRecommended?: boolean;
  supportsVision?: boolean;
  provider: 'openrouter' | '9router' | 'gemini';
}

export interface KeyValidationResult {
  key: string;
  maskedKey: string;
  isValid: boolean;
  status: 'active' | 'rate_limited' | 'invalid' | 'untested';
  message?: string;
}

export interface AISettings {
  activeProvider: AIProviderType;
  geminiKeysText: string;
  activeGeminiKeyIndex: number;
  geminiSelectedModel?: string;
  geminiScannedModels?: ScannedModelInfo[];
  openrouterKey: string;
  openrouterSelectedModel: string;
  openrouterScannedModels: ScannedModelInfo[];
  nineRouterKey: string;
  nineRouterBaseUrl: string;
  nineRouterSelectedModel: string;
  nineRouterScannedModels: ScannedModelInfo[];
}

const STORAGE_KEY = 'vremotion_ai_settings_v1';

export const POPULAR_RECOMMENDED_MODELS: Record<string, boolean> = {
  'anthropic/claude-3.7-sonnet': true,
  'anthropic/claude-3.5-sonnet': true,
  'google/gemini-2.5-pro': true,
  'google/gemini-2.5-flash': true,
  'google/gemini-2.0-flash-001': true,
  'google/gemini-2.0-flash': true,
  'deepseek/deepseek-chat': true,
  'deepseek/deepseek-r1': true,
  'openai/gpt-4o': true,
  'openai/gpt-4o-mini': true,
  'openai/o3-mini': true,
  'qwen/qwen-2.5-coder-32b-instruct': true,
  'meta-llama/llama-3.3-70b-instruct': true,
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  activeProvider: 'gemini',
  geminiKeysText: '',
  activeGeminiKeyIndex: 0,
  geminiSelectedModel: 'gemini-2.5-flash',
  geminiScannedModels: [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash (Rekomendasi Cepat & Multimodal)',
      description: 'Model generasi terbaru Google dengan latensi rendah, penalaran kuat, dan dukungan visual gambar prima.',
      contextLength: 1048576,
      isRecommended: true,
      supportsVision: true,
      provider: 'gemini',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro (Penalaran Kompleks & 3D WebGL)',
      description: 'Model tercanggih Google untuk coding Three.js, simulasi fisika, dan akurasi geometri tertinggi.',
      contextLength: 1048576,
      isRecommended: true,
      supportsVision: true,
      provider: 'gemini',
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash (Stabil & Cepat)',
      description: 'Respon cepat dengan dukungan multimodal penuh.',
      contextLength: 1048576,
      isRecommended: true,
      supportsVision: true,
      provider: 'gemini',
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro (Jendela Konteks 2 Juta Token)',
      description: 'Model penalaran dengan jendela konteks raksasa 2M token.',
      contextLength: 2097152,
      isRecommended: false,
      supportsVision: true,
      provider: 'gemini',
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash (Ringan & Hemat)',
      description: 'Model serbaguna untuk eksekusi cepat dan stabil.',
      contextLength: 1048576,
      isRecommended: false,
      supportsVision: true,
      provider: 'gemini',
    },
  ],
  openrouterKey: '',
  openrouterSelectedModel: 'anthropic/claude-3.5-sonnet',
  openrouterScannedModels: [
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet (Rekomendasi Utama Remotion & Vision)',
      description: 'Model nomor satu untuk Remotion TSX, WebGL Shader, pemahaman gambar referensi, dan Canvas visual coding.',
      contextLength: 200000,
      isRecommended: true,
      supportsVision: true,
      provider: 'openrouter',
    },
    {
      id: 'google/gemini-2.5-pro',
      name: 'Gemini 2.5 Pro (Google Multimodal Vision)',
      description: 'Penalaran visual tingkat tinggi dengan pemahaman konteks gambar referensi yang sangat detail.',
      contextLength: 1000000,
      isRecommended: true,
      supportsVision: true,
      provider: 'openrouter',
    },
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o (OpenAI Flagship Multimodal Vision)',
      description: 'Model multimodal flagship OpenAI, sangat akurat dalam mengikuti prompt dan gambar.',
      contextLength: 128000,
      isRecommended: true,
      supportsVision: true,
      provider: 'openrouter',
    },
    {
      id: 'google/gemini-2.0-flash-001',
      name: 'Gemini 2.0 Flash (Cepat & Multimodal)',
      description: 'Generasi kilat dengan dukungan pemahaman gambar referensi.',
      contextLength: 1000000,
      isRecommended: true,
      supportsVision: true,
      provider: 'openrouter',
    },
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek V3 (Cepat & Hemat - Khusus Teks)',
      description: 'Kinerja coding handal dengan biaya sangat terjangkau (Catatan: Khusus prompt teks murni, tidak mendukung gambar).',
      contextLength: 64000,
      isRecommended: true,
      supportsVision: false,
      provider: 'openrouter',
    },
    {
      id: 'google/gemini-2.0-flash-exp:free',
      name: 'Gemini 2.0 Flash (Free Tier & Vision)',
      description: 'Gratis di OpenRouter, respon instan dengan dukungan gambar referensi.',
      contextLength: 1000000,
      isFree: true,
      isRecommended: true,
      supportsVision: true,
      provider: 'openrouter',
    },
  ],
  nineRouterKey: '',
  nineRouterBaseUrl: 'https://api.9router.com/v1',
  nineRouterSelectedModel: 'claude-3-5-sonnet',
  nineRouterScannedModels: [
    {
      id: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet (9Router)',
      description: 'Optimal untuk generasi kode animasi Remotion TSX dan analisis gambar visual.',
      isRecommended: true,
      supportsVision: true,
      provider: '9router',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro (9Router)',
      description: 'Kreativitas visual 3D & komposisi kaya detail multimodal.',
      isRecommended: true,
      supportsVision: true,
      provider: '9router',
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o (9Router)',
      description: 'Model multimodal flagship OpenAI.',
      isRecommended: true,
      supportsVision: true,
      provider: '9router',
    },
  ],
};

export function isVisionCapableModel(modelId: string, architecture?: any): boolean {
  if (!modelId) return false;
  const inputModalities = architecture?.input_modalities || [];
  const modality = architecture?.modality || '';
  if (
    inputModalities.includes('image') ||
    inputModalities.includes('multimodal') ||
    modality.includes('image') ||
    modality.includes('multimodal')
  ) {
    return true;
  }
  const id = modelId.toLowerCase();
  return (
    id.includes('claude-3') ||
    id.includes('gpt-4o') ||
    id.includes('gemini') ||
    id.includes('-vl') ||
    id.includes('vision') ||
    id.includes('pixtral') ||
    id.includes('omni') ||
    id.includes('llama-3.2-11b-vision') ||
    id.includes('llama-3.2-90b-vision')
  );
}

export function getAISettings(): AISettings {
  if (typeof window === 'undefined') return DEFAULT_AI_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_AI_SETTINGS, ...parsed };
  } catch (e) {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAISettings(settings: Partial<AISettings>): AISettings {
  const current = getAISettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Gagal menyimpan AI settings ke localStorage:', e);
  }
  return updated;
}

export function parseBulkGeminiKeys(text: string): string[] {
  if (!text) return [];
  return text
    .split(/[\r\n,]+/)
    .map(k => k.trim())
    .filter(k => k.length >= 10);
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

/**
 * Validates a single Gemini API key against Google's API
 */
export async function validateSingleGeminiKey(apiKey: string): Promise<KeyValidationResult> {
  const maskedKey = maskApiKey(apiKey);
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { method: 'GET' }
    );

    if (resp.ok) {
      return {
        key: apiKey,
        maskedKey,
        isValid: true,
        status: 'active',
        message: 'Aktif & Kuota Tersedia ✓',
      };
    }

    if (resp.status === 429) {
      return {
        key: apiKey,
        maskedKey,
        isValid: true,
        status: 'rate_limited',
        message: 'Rate Limited (Batas Kuota Sementara Tercapai)',
      };
    }

    const errJson = await resp.json().catch(() => ({}));
    return {
      key: apiKey,
      maskedKey,
      isValid: false,
      status: 'invalid',
      message: errJson.error?.message || 'API Key tidak valid atau kadaluarsa',
    };
  } catch (err: any) {
    return {
      key: apiKey,
      maskedKey,
      isValid: false,
      status: 'invalid',
      message: err.message || 'Koneksi gagal',
    };
  }
}

/**
 * Validates all Gemini keys in bulk
 */
export async function validateBulkGeminiKeys(keys: string[]): Promise<KeyValidationResult[]> {
  const results: KeyValidationResult[] = [];
  for (const key of keys) {
    const res = await validateSingleGeminiKey(key);
    results.push(res);
  }
  return results;
}

/**
 * Scans available models from Google Gemini API using provided API Key
 */
export async function scanGeminiModels(
  apiKey: string
): Promise<{ valid: boolean; models: ScannedModelInfo[]; keyStatusText?: string; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, models: [], error: 'Masukkan API Key Gemini terlebih dahulu.' };
  }

  const cleanKey = apiKey.trim();

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`,
      { method: 'GET' }
    );

    if (!resp.ok) {
      if (resp.status === 400 || resp.status === 403) {
        return { valid: false, models: [], error: 'API Key Gemini tidak valid atau tidak memiliki akses (HTTP ' + resp.status + ').' };
      }
      if (resp.status === 429) {
        return { valid: false, models: [], error: 'Rate limit kuota tercapai pada API Key ini (429).' };
      }
      const errJson = await resp.json().catch(() => ({}));
      return {
        valid: false,
        models: [],
        error: errJson.error?.message || `Gagal menghubungi Google Gemini API (HTTP ${resp.status})`,
      };
    }

    const data = await resp.json();
    const rawList: any[] = data.models || [];

    // Filter only gemini generative models supporting generateContent
    const geminiModels = rawList.filter((m: any) => {
      const methods: string[] = m.supportedGenerationMethods || [];
      const name: string = m.name || '';
      return methods.includes('generateContent') && name.includes('gemini');
    });

    if (geminiModels.length === 0) {
      return {
        valid: false,
        models: [],
        error: 'Tidak ditemukan model Gemini generateContent pada API Key ini.',
      };
    }

    const models: ScannedModelInfo[] = geminiModels.map((m: any) => {
      const cleanId = (m.name || '').replace(/^models\//, '');
      const isRecommended = Boolean(
        cleanId.includes('gemini-2.5-pro') ||
        cleanId.includes('gemini-2.5-flash') ||
        cleanId.includes('gemini-2.0-flash') ||
        cleanId.includes('gemini-3.')
      );

      return {
        id: cleanId,
        name: m.displayName ? `${m.displayName} (${cleanId})` : cleanId,
        description: m.description ? m.description.slice(0, 180) + '...' : undefined,
        contextLength: m.inputTokenLimit || 1000000,
        isRecommended,
        supportsVision: true,
        provider: 'gemini',
      };
    });

    // Sort: Recommended first, then by ID
    models.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return a.id.localeCompare(b.id);
    });

    return {
      valid: true,
      models,
      keyStatusText: `API Key Gemini Aktif ✓ Berhasil memindai ${models.length} model resmi Google!`,
    };
  } catch (err: any) {
    return {
      valid: false,
      models: [],
      error: err.message || 'Gagal memindai model dari Google Gemini.',
    };
  }
}

/**
 * Scans available models from OpenRouter API using provided API Key
 */
export async function scanOpenRouterModels(
  apiKey: string
): Promise<{ valid: boolean; models: ScannedModelInfo[]; keyStatusText?: string; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, models: [], error: 'API Key OpenRouter tidak boleh kosong.' };
  }

  try {
    let keyStatusText = 'API Key Valid ✓';

    // Cek auth info jika memungkinkan
    try {
      const authResp = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
      });
      if (authResp.ok) {
        const authData = await authResp.json();
        const usage = authData.data?.usage != null ? `$${Number(authData.data.usage).toFixed(3)}` : '';
        const limit = authData.data?.limit != null ? `$${Number(authData.data.limit).toFixed(2)}` : 'Unlimited';
        keyStatusText = `API Key Aktif ✓ ${usage ? `(Terpakai: ${usage} / Limit: ${limit})` : ''}`;
      } else if (authResp.status === 401) {
        return { valid: false, models: [], error: 'API Key OpenRouter tidak valid (401 Unauthorized).' };
      }
    } catch (e) {}

    const resp = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://remotion-code-pro.pages.dev',
        'X-Title': 'Remotion Code Pro',
      },
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      return {
        valid: false,
        models: [],
        error: errJson.error?.message || `Gagal menghubungi OpenRouter (HTTP ${resp.status})`,
      };
    }

    const data = await resp.json();
    const rawList: any[] = data.data || [];

    const models: ScannedModelInfo[] = rawList.map((m: any) => {
      const isRecommended = Boolean(
        POPULAR_RECOMMENDED_MODELS[m.id] ||
        m.id.includes('claude-3.5-sonnet') ||
        m.id.includes('claude-3.7-sonnet') ||
        m.id.includes('gemini-2.5-pro') ||
        m.id.includes('gemini-2.5-flash') ||
        m.id.includes('deepseek-chat') ||
        m.id.includes('deepseek-r1') ||
        m.id.includes('qwen-2.5-coder') ||
        m.id.includes('gpt-4o')
      );

      const promptPrice = m.pricing?.prompt ? Number(m.pricing.prompt) * 1000000 : 0;
      const isFree = m.id.endsWith(':free') || promptPrice === 0;

      const architecture = m.architecture || {};
      const supportsVision = isVisionCapableModel(m.id, architecture);

      return {
        id: m.id,
        name: m.name || m.id,
        description: m.description ? m.description.slice(0, 180) + '...' : undefined,
        contextLength: m.context_length || 128000,
        pricing: {
          prompt: `$${promptPrice.toFixed(2)}/M tokens`,
          completion: m.pricing?.completion ? `$${(Number(m.pricing.completion) * 1000000).toFixed(2)}/M` : '',
        },
        isFree,
        isRecommended,
        supportsVision,
        provider: 'openrouter',
      };
    });

    // Sort: Recommended first, then by name
    models.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return a.name.localeCompare(b.name);
    });

    return { valid: true, models, keyStatusText };
  } catch (err: any) {
    return {
      valid: false,
      models: [],
      error: err.message || 'Gagal memindai model dari OpenRouter.',
    };
  }
}

/**
 * Scans available models from 9Router or OpenAI-compatible proxy endpoint
 */
export async function scanNineRouterModels(
  apiKey: string,
  baseUrl: string = 'https://api.9router.com/v1'
): Promise<{ valid: boolean; models: ScannedModelInfo[]; keyStatusText?: string; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, models: [], error: 'API Key 9Router tidak boleh kosong.' };
  }

  const cleanBase = baseUrl.replace(/\/+$/, '');

  try {
    const resp = await fetch(`${cleanBase}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      return {
        valid: false,
        models: [],
        error: errJson.error?.message || `Gagal menghubungi 9Router (HTTP ${resp.status})`,
      };
    }

    const data = await resp.json();
    const rawList: any[] = data.data || [];

    const models: ScannedModelInfo[] = rawList.map((m: any) => {
      const id = m.id || String(m);
      const isRecommended = Boolean(
        id.includes('claude') ||
        id.includes('gemini') ||
        id.includes('gpt-4') ||
        id.includes('deepseek') ||
        id.includes('coder')
      );
      const supportsVision = isVisionCapableModel(id);

      return {
        id,
        name: m.name || id,
        contextLength: m.context_length || 128000,
        isRecommended,
        supportsVision,
        provider: '9router',
      };
    });

    models.sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return a.name.localeCompare(b.name);
    });

    return { valid: true, models, keyStatusText: `API Key 9Router Aktif (${models.length} model terdeteksi) ✓` };
  } catch (err: any) {
    return {
      valid: false,
      models: [],
      error: err.message || 'Gagal memindai model dari 9Router.',
    };
  }
}

/**
 * Extracts a single representative video frame from a video data URL
 */
export async function extractVideoThumbnail(videoDataUrl: string): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return videoDataUrl;
  }
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.src = videoDataUrl;
      video.currentTime = 0.1;

      const timeout = setTimeout(() => {
        resolve(videoDataUrl);
      }, 4000);

      video.onloadeddata = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(1280, video.videoWidth || 1280);
          canvas.height = Math.min(720, video.videoHeight || 720);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frameUrl = canvas.toDataURL('image/jpeg', 0.85);
            clearTimeout(timeout);
            resolve(frameUrl);
            return;
          }
        } catch (e) {}
        clearTimeout(timeout);
        resolve(videoDataUrl);
      };

      video.onerror = () => {
        clearTimeout(timeout);
        resolve(videoDataUrl);
      };
    } catch (e) {
      resolve(videoDataUrl);
    }
  });
}

/**
 * Optimizes an image data URL for OpenRouter/multimodal API requests.
 * Resizes images larger than 1568px and compresses high-res images to avoid payload size errors.
 */
export async function optimizeReferenceImageForAI(dataUrl: string): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return dataUrl;
  }
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    return dataUrl;
  }

  // If it's a video, extract a representative frame
  if (dataUrl.startsWith('data:video/')) {
    return extractVideoThumbnail(dataUrl);
  }

  // If it's SVG data url, return as is
  if (dataUrl.startsWith('data:image/svg+xml')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1568;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;

          // If image is already reasonably sized and not gigantic, resolve directly
          if (w <= maxDim && h <= maxDim && dataUrl.length < 2 * 1024 * 1024) {
            resolve(dataUrl);
            return;
          }

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const optimized = canvas.toDataURL('image/jpeg', 0.88);
          resolve(optimized);
        } catch (e) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch (e) {
      resolve(dataUrl);
    }
  });
}

export interface OpenAIChatCompletionParams {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemInstruction?: string;
  userPrompt: string;
  imageUrl?: string;
  temperature?: number;
  providerName?: string;
}

/**
 * Executes a Chat Completion request to OpenRouter or 9Router
 * Supports multimodal image inputs, automatic reasoning tag stripping, and model fallbacks.
 */
export async function executeOpenAICompatibleChat(params: OpenAIChatCompletionParams): Promise<string> {
  const { baseUrl, apiKey, model, systemInstruction, userPrompt, imageUrl, temperature = 0.7, providerName = 'OpenRouter' } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error(`API Key ${providerName} belum dimasukkan. Silakan atur di menu Pengaturan AI.`);
  }

  const cleanBase = baseUrl.replace(/\/+$/, '');
  const messages: any[] = [];

  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  let userContent: any;
  if (imageUrl && imageUrl.trim()) {
    userContent = [
      {
        type: 'text',
        text: userPrompt,
      },
      {
        type: 'image_url',
        image_url: {
          url: imageUrl.trim(),
        },
      },
    ];
  } else {
    userContent = userPrompt;
  }

  messages.push({ role: 'user', content: userContent });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey.trim()}`,
  };

  if (cleanBase.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://remotion-code-pro.pages.dev';
    headers['X-Title'] = 'Remotion Code Pro';
  }

  // Attempt initial request with json_object response_format
  let response = await fetch(`${cleanBase}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const json = JSON.parse(errText);
      parsedErr = json.error?.message || errText;
    } catch (e) {}

    const lowerErr = parsedErr.toLowerCase();

    // Check if error is specifically about model not supporting images/vision
    if (
      imageUrl &&
      (lowerErr.includes('image') ||
       lowerErr.includes('vision') ||
       lowerErr.includes('modal') ||
       lowerErr.includes('endpoints found that support') ||
       lowerErr.includes('unsupported image') ||
       lowerErr.includes('no endpoint'))
    ) {
      throw new Error(
        `Model "${model}" di ${providerName} tidak mendukung input gambar/vision.\n` +
        `Solusi: Buka menu "Pengaturan AI" dan pilih model yang mendukung Vision (seperti Claude 3.5 Sonnet, Claude 3.7 Sonnet, Gemini 2.5 Pro, Gemini 2.0 Flash, atau GPT-4o) untuk menganalisis gambar referensi.`
      );
    }

    // If model rejects response_format (common on Anthropic or older models), retry without response_format
    if (
      lowerErr.includes('response_format') ||
      lowerErr.includes('json_object') ||
      lowerErr.includes('json') ||
      response.status === 400
    ) {
      const retryResp = await fetch(`${cleanBase}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature,
        }),
      });

      if (retryResp.ok) {
        response = retryResp;
      } else {
        const retryErrText = await retryResp.text();
        let retryParsedErr = retryErrText;
        try {
          const json = JSON.parse(retryErrText);
          retryParsedErr = json.error?.message || retryErrText;
        } catch (e) {}
        const retryLowerErr = retryParsedErr.toLowerCase();
        if (
          imageUrl &&
          (retryLowerErr.includes('image') ||
           retryLowerErr.includes('vision') ||
           retryLowerErr.includes('modal') ||
           retryLowerErr.includes('endpoints found that support') ||
           retryLowerErr.includes('unsupported image'))
        ) {
          throw new Error(
            `Model "${model}" di ${providerName} tidak mendukung input gambar/vision.\n` +
            `Solusi: Buka menu "Pengaturan AI" dan pilih model yang mendukung Vision (seperti Claude 3.5 Sonnet, Claude 3.7 Sonnet, Gemini 2.5 Pro, Gemini 2.0 Flash, atau GPT-4o) untuk menganalisis gambar referensi.`
          );
        }
        throw new Error(`${providerName} Error (${retryResp.status}): ${retryParsedErr}`);
      }
    } else {
      throw new Error(`${providerName} Error (${response.status}): ${parsedErr}`);
    }
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  let content = choice?.message?.content || '';

  // Strip reasoning / thinking tags from models like DeepSeek R1, Qwen, etc.
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  if (!content) {
    throw new Error(`Respon kosong dari model ${model} pada ${providerName}.`);
  }

  return content;
}
