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
  openrouterKey: '',
  openrouterSelectedModel: 'anthropic/claude-3.5-sonnet',
  openrouterScannedModels: [
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet (Rekomendasi Utama Remotion)',
      description: 'Model terunggul untuk Remotion TSX, WebGL Shader, dan Canvas visual coding.',
      contextLength: 200000,
      isRecommended: true,
      provider: 'openrouter',
    },
    {
      id: 'google/gemini-2.5-pro',
      name: 'Gemini 2.5 Pro (Google)',
      description: 'Model penalaran tinggi dengan pemahaman konteks visual mutakhir.',
      contextLength: 1000000,
      isRecommended: true,
      provider: 'openrouter',
    },
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek V3 (Cepat & Sangat Hemat)',
      description: 'Kinerja coding handal dengan biaya sangat terjangkau.',
      contextLength: 64000,
      isRecommended: true,
      provider: 'openrouter',
    },
    {
      id: 'google/gemini-2.0-flash-exp:free',
      name: 'Gemini 2.0 Flash (Free Tier)',
      description: 'Gratis di OpenRouter, respon instan.',
      contextLength: 1000000,
      isFree: true,
      isRecommended: true,
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
      description: 'Optimal untuk generasi kode animasi Remotion TSX.',
      isRecommended: true,
      provider: '9router',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro (9Router)',
      description: 'Kreativitas visual 3D & komposisi kaya detail.',
      isRecommended: true,
      provider: '9router',
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o (9Router)',
      description: 'Model multimodal flagship OpenAI.',
      isRecommended: true,
      provider: '9router',
    },
  ],
};

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

      return {
        id,
        name: m.name || id,
        contextLength: m.context_length || 128000,
        isRecommended,
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
 * Executes a Chat Completion request to OpenRouter or 9Router
 */
export async function executeOpenAICompatibleChat(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemInstruction?: string;
  userPrompt: string;
  temperature?: number;
  providerName?: string;
}): Promise<string> {
  const { baseUrl, apiKey, model, systemInstruction, userPrompt, temperature = 0.7, providerName = 'OpenRouter' } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error(`API Key ${providerName} belum dimasukkan. Silakan atur di menu Pengaturan AI.`);
  }

  const cleanBase = baseUrl.replace(/\/+$/, '');
  const messages: any[] = [];

  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  messages.push({ role: 'user', content: userPrompt });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey.trim()}`,
  };

  if (cleanBase.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://remotion-code-pro.pages.dev';
    headers['X-Title'] = 'Remotion Code Pro';
  }

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
    // Jika model menolak parameter response_format json_object (misal Claude / model lama), coba ulang tanpa response_format
    if (errText.includes('response_format') || errText.includes('json_object') || response.status === 400) {
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
        let parsedErr = retryErrText;
        try {
          const json = JSON.parse(retryErrText);
          parsedErr = json.error?.message || retryErrText;
        } catch (e) {}
        throw new Error(`${providerName} Error (${retryResp.status}): ${parsedErr}`);
      }
    } else {
      let parsedErr = errText;
      try {
        const json = JSON.parse(errText);
        parsedErr = json.error?.message || errText;
      } catch (e) {}
      throw new Error(`${providerName} Error (${response.status}): ${parsedErr}`);
    }
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || '';

  if (!content) {
    throw new Error(`Respon kosong dari model ${model} pada ${providerName}.`);
  }

  return content;
}
