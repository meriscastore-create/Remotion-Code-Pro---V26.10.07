import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Sparkles,
  Check,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Zap,
  Globe,
  Layers,
  Eye,
  EyeOff,
  Flame,
  Star,
  Info
} from 'lucide-react';
import {
  AIProviderType,
  AISettings,
  ScannedModelInfo,
  KeyValidationResult,
  getAISettings,
  saveAISettings,
  parseBulkGeminiKeys,
  validateBulkGeminiKeys,
  scanGeminiModels,
  scanOpenRouterModels,
  scanNineRouterModels,
  maskApiKey,
  DEFAULT_AI_SETTINGS
} from '../service/aiProviders';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (settings: AISettings) => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved
}) => {
  const [settings, setSettings] = useState<AISettings>(getAISettings());
  const [activeTab, setActiveTab] = useState<AIProviderType>('gemini');

  // Gemini state
  const [geminiKeysText, setGeminiKeysText] = useState(settings.geminiKeysText || '');
  const [geminiValidationResults, setGeminiValidationResults] = useState<KeyValidationResult[]>([]);
  const [isValidatingGemini, setIsValidatingGemini] = useState(false);
  const [geminiActiveIdx, setGeminiActiveIdx] = useState(settings.activeGeminiKeyIndex || 0);
  const [isScanningGemini, setIsScanningGemini] = useState(false);
  const [geminiScanMsg, setGeminiScanMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [geminiFilter, setGeminiFilter] = useState('');
  const [customGeminiInput, setCustomGeminiInput] = useState('');
  const [selectedGeminiModel, setSelectedGeminiModel] = useState(
    settings.geminiSelectedModel || 'gemini-2.5-flash'
  );
  const [scannedGeminiModels, setScannedGeminiModels] = useState<ScannedModelInfo[]>(
    settings.geminiScannedModels && settings.geminiScannedModels.length > 0
      ? settings.geminiScannedModels
      : (DEFAULT_AI_SETTINGS.geminiScannedModels || [])
  );

  // OpenRouter state
  const [openrouterKey, setOpenrouterKey] = useState(settings.openrouterKey || '');
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [isScanningOpenRouter, setIsScanningOpenRouter] = useState(false);
  const [openrouterScanMsg, setOpenrouterScanMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [openrouterFilter, setOpenrouterFilter] = useState('');
  const [selectedOpenRouterModel, setSelectedOpenRouterModel] = useState(
    settings.openrouterSelectedModel || 'anthropic/claude-3.5-sonnet'
  );

  // 9Router state
  const [nineRouterKey, setNineRouterKey] = useState(settings.nineRouterKey || '');
  const [showNineRouterKey, setShowNineRouterKey] = useState(false);
  const [nineRouterBaseUrl, setNineRouterBaseUrl] = useState(settings.nineRouterBaseUrl || 'https://api.9router.com/v1');
  const [isScanningNineRouter, setIsScanningNineRouter] = useState(false);
  const [nineRouterScanMsg, setNineRouterScanMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [nineRouterFilter, setNineRouterFilter] = useState('');
  const [selectedNineRouterModel, setSelectedNineRouterModel] = useState(
    settings.nineRouterSelectedModel || 'claude-3-5-sonnet'
  );

  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getAISettings();
      setSettings(current);
      setActiveTab(current.activeProvider);
      setGeminiKeysText(current.geminiKeysText || '');
      setGeminiActiveIdx(current.activeGeminiKeyIndex || 0);
      setSelectedGeminiModel(current.geminiSelectedModel || 'gemini-2.5-flash');
      setScannedGeminiModels(
        current.geminiScannedModels && current.geminiScannedModels.length > 0
          ? current.geminiScannedModels
          : (DEFAULT_AI_SETTINGS.geminiScannedModels || [])
      );
      setOpenrouterKey(current.openrouterKey || '');
      setSelectedOpenRouterModel(current.openrouterSelectedModel || 'anthropic/claude-3.5-sonnet');
      setNineRouterKey(current.nineRouterKey || '');
      setNineRouterBaseUrl(current.nineRouterBaseUrl || 'https://api.9router.com/v1');
      setSelectedNineRouterModel(current.nineRouterSelectedModel || 'claude-3-5-sonnet');
      setSaveSuccessMsg(false);
      setGeminiScanMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedGeminiKeys = parseBulkGeminiKeys(geminiKeysText);

  // Scan Gemini Models
  const handleScanGemini = async () => {
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
    if (parsedGeminiKeys.length === 0 && !envKey) {
      setGeminiScanMsg({ type: 'error', text: 'Masukkan minimal satu API Key Gemini pada textarea di atas untuk memindai model resmi.' });
      return;
    }

    setIsScanningGemini(true);
    setGeminiScanMsg(null);
    try {
      const keysToTry = parsedGeminiKeys.length > 0
        ? [parsedGeminiKeys[geminiActiveIdx] || parsedGeminiKeys[0], ...parsedGeminiKeys.filter((_, idx) => idx !== geminiActiveIdx)]
        : [envKey];

      let lastError = '';
      let successfulRes: any = null;

      for (const k of keysToTry) {
        if (!k) continue;
        const res = await scanGeminiModels(k);
        if (res.valid && res.models.length > 0) {
          successfulRes = res;
          break;
        } else {
          lastError = res.error || lastError;
        }
      }

      if (successfulRes && successfulRes.models.length > 0) {
        setScannedGeminiModels(successfulRes.models);
        setSettings(prev => ({
          ...prev,
          geminiScannedModels: successfulRes.models
        }));
        setGeminiScanMsg({
          type: 'success',
          text: successfulRes.keyStatusText || `Berhasil memindai ${successfulRes.models.length} model resmi Google Gemini!`
        });
      } else {
        setGeminiScanMsg({
          type: 'error',
          text: lastError || 'Gagal memindai model dari Google Gemini. Pastikan API Key aktif dan memiliki akses.'
        });
      }
    } catch (e: any) {
      setGeminiScanMsg({
        type: 'error',
        text: e.message || 'Koneksi gagal ke Google Gemini.'
      });
    } finally {
      setIsScanningGemini(false);
    }
  };

  // Validate Bulk Gemini Keys
  const handleValidateGemini = async () => {
    if (parsedGeminiKeys.length === 0) {
      setGeminiValidationResults([]);
      return;
    }
    setIsValidatingGemini(true);
    try {
      const res = await validateBulkGeminiKeys(parsedGeminiKeys);
      setGeminiValidationResults(res);
    } catch (e: any) {
      console.warn('Gagal validasi Gemini:', e);
    } finally {
      setIsValidatingGemini(false);
    }
  };

  // Scan OpenRouter Models
  const handleScanOpenRouter = async () => {
    if (!openrouterKey.trim()) {
      setOpenrouterScanMsg({ type: 'error', text: 'Masukkan API Key OpenRouter terlebih dahulu.' });
      return;
    }
    setIsScanningOpenRouter(true);
    setOpenrouterScanMsg(null);
    try {
      const res = await scanOpenRouterModels(openrouterKey);
      if (res.valid && res.models.length > 0) {
        setSettings(prev => ({
          ...prev,
          openrouterScannedModels: res.models
        }));
        setOpenrouterScanMsg({
          type: 'success',
          text: res.keyStatusText || `API Key Valid ✓ Berhasil memindai ${res.models.length} model!`
        });
      } else {
        setOpenrouterScanMsg({
          type: 'error',
          text: res.error || 'Gagal memindai model dari OpenRouter.'
        });
      }
    } catch (e: any) {
      setOpenrouterScanMsg({
        type: 'error',
        text: e.message || 'Koneksi gagal ke OpenRouter.'
      });
    } finally {
      setIsScanningOpenRouter(false);
    }
  };

  // Scan 9Router Models
  const handleScanNineRouter = async () => {
    if (!nineRouterKey.trim()) {
      setNineRouterScanMsg({ type: 'error', text: 'Masukkan API Key 9Router terlebih dahulu.' });
      return;
    }
    setIsScanningNineRouter(true);
    setNineRouterScanMsg(null);
    try {
      const res = await scanNineRouterModels(nineRouterKey, nineRouterBaseUrl);
      if (res.valid && res.models.length > 0) {
        setSettings(prev => ({
          ...prev,
          nineRouterScannedModels: res.models
        }));
        setNineRouterScanMsg({
          type: 'success',
          text: res.keyStatusText || `API Key Valid ✓ Berhasil memindai ${res.models.length} model!`
        });
      } else {
        setNineRouterScanMsg({
          type: 'error',
          text: res.error || 'Gagal memindai model dari 9Router.'
        });
      }
    } catch (e: any) {
      setNineRouterScanMsg({
        type: 'error',
        text: e.message || 'Koneksi gagal ke 9Router.'
      });
    } finally {
      setIsScanningNineRouter(false);
    }
  };

  // Save all settings
  const handleSaveAndApply = () => {
    const newSettings: AISettings = {
      ...settings,
      activeProvider: activeTab,
      geminiKeysText,
      activeGeminiKeyIndex: geminiActiveIdx,
      geminiSelectedModel: selectedGeminiModel,
      geminiScannedModels: scannedGeminiModels,
      openrouterKey,
      openrouterSelectedModel: selectedOpenRouterModel,
      nineRouterKey,
      nineRouterBaseUrl,
      nineRouterSelectedModel: selectedNineRouterModel,
    };

    saveAISettings(newSettings);
    setSettings(newSettings);
    setSaveSuccessMsg(true);
    if (onSettingsSaved) {
      onSettingsSaved(newSettings);
    }
    setTimeout(() => {
      setSaveSuccessMsg(false);
      onClose();
    }, 900);
  };

  // Gemini models filtered list
  const filteredGeminiModels = (scannedGeminiModels.length > 0 ? scannedGeminiModels : (DEFAULT_AI_SETTINGS.geminiScannedModels || [])).filter(m => {
    if (!geminiFilter.trim()) return true;
    const q = geminiFilter.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
  });

  // OpenRouter models filtered list
  const filteredOpenRouterModels = settings.openrouterScannedModels.filter(m => {
    if (!openrouterFilter.trim()) return true;
    const q = openrouterFilter.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
  });

  // 9Router models filtered list
  const filteredNineRouterModels = settings.nineRouterScannedModels.filter(m => {
    if (!nineRouterFilter.trim()) return true;
    const q = nineRouterFilter.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-zinc-100">Pengaturan AI, Provider & API Keys</h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  Cloudflare Ready
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Pilih provider AI, masukkan Bulk API Keys, atau scan model OpenRouter / 9Router untuk dijalankan di Cloudflare.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CLOUDFLARE & BULK RENDER BANNER */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-teal-950/50 via-zinc-900 to-amber-950/30 border-b border-zinc-800/80 flex items-center justify-between text-xs text-zinc-300 shrink-0 gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-emerald-400">Render Bulk TSX 100% Mandiri:</strong> Fitur Render Bulk TSX dari file lokal atau PC dapat dijalankan di Cloudflare <em>tanpa perlu memasukkan API Key</em> sama sekali!
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 shrink-0 font-mono">
            Client-Side Execution
          </span>
        </div>

        {/* PROVIDER TABS */}
        <div className="flex px-5 pt-3 border-b border-zinc-800 bg-zinc-950/40 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-t border-x transition-all cursor-pointer ${
              activeTab === 'gemini'
                ? 'bg-zinc-900 text-amber-400 border-zinc-800 border-b-2 border-b-transparent shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Google Gemini</span>
            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-black">
              Bulk Keys
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('openrouter')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-t border-x transition-all cursor-pointer ${
              activeTab === 'openrouter'
                ? 'bg-zinc-900 text-emerald-400 border-zinc-800 border-b-2 border-b-transparent shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900/40'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>OpenRouter</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-black">
              Claude 3.5 / 100+ Model
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('9router')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-t border-x transition-all cursor-pointer ${
              activeTab === '9router'
                ? 'bg-zinc-900 text-sky-400 border-zinc-800 border-b-2 border-b-transparent shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900/40'
            }`}
          >
            <Zap className="w-4 h-4 text-sky-400" />
            <span>9Router</span>
            <span className="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-black">
              Gateway
            </span>
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* TAB 1: GOOGLE GEMINI */}
          {activeTab === 'gemini' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs">
                    G
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Google Gemini API Direct & Bulk Keys</h3>
                    <p className="text-[11px] text-zinc-400">
                      Mendukung input banyak API Key sekaligus dengan auto-failover ketika kuota/RPM habis.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-amber-400">
                    {parsedGeminiKeys.length} Key Terdeteksi
                  </span>
                  <p className="text-[10px] text-zinc-500">Model: Gemini 3.8 / 3.7 / 3.6 Flash</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <span>Daftar API Key Gemini (Bulk):</span>
                    <span className="text-[10px] font-normal text-zinc-500">
                      (Satu baris per key atau dipisahkan koma)
                    </span>
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Dapatkan API Key Gratis</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <textarea
                  value={geminiKeysText}
                  onChange={(e) => setGeminiKeysText(e.target.value)}
                  placeholder={`AIzaSyAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nAIzaSyByyyyyyyyyyyyyyyyyyyyyyyyyyyyyy\nAIzaSyCzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz\n\n(Opsional: Masukkan beberapa key agar aplikasi otomatis berganti key bila kuota habis)`}
                  rows={5}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-colors"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                  <span className="text-[11px] text-zinc-400">
                    * Otomatis merotasi key saat limit 429 atau kuota habis tanpa cloud fallback macet.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleValidateGemini}
                      disabled={isValidatingGemini || parsedGeminiKeys.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isValidatingGemini ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>Cek {parsedGeminiKeys.length} Key</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleScanGemini}
                      disabled={isScanningGemini}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isScanningGemini ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                      ) : (
                        <Search className="w-3.5 h-3.5 text-zinc-950" />
                      )}
                      <span>Scan Model Google</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SCAN STATUS MESSAGE */}
              {geminiScanMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    geminiScanMsg.type === 'success'
                      ? 'bg-amber-950/60 border-amber-800 text-amber-200'
                      : 'bg-rose-950/60 border-rose-800 text-rose-200'
                  }`}
                >
                  {geminiScanMsg.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{geminiScanMsg.text}</span>
                </div>
              )}

              {/* ACTIVE SELECTED MODEL CARD */}
              <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Model Google Gemini Aktif yang Dipilih:
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-extrabold text-amber-400 font-mono">
                      {selectedGeminiModel}
                    </span>
                    <span className="text-[9px] bg-teal-500/20 text-teal-300 font-black px-1.5 py-0.2 rounded border border-teal-500/30 flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" />
                      Multimodal / Vision Gambar ✓
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded-full border border-amber-500/30">
                  Aktif Digunakan ✓
                </span>
              </div>

              {/* ROTATING KEYS & CLOUD RESILIENCE BANNER */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-200/90 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 font-bold">Rotasi API Key Otomatis (Bebas Macet di Cloud):</strong>
                  <p className="text-zinc-300 mt-0.5 leading-relaxed">
                    Jika aplikasi dijalankan di Cloudflare Pages atau hosting cloud, sistem secara mandiri merotasi daftar API Key yang Anda masukkan ketika kuota/RPM habis (429). Anda bebas memilih model Gemini yang sudah di-scan di bawah ini.
                  </p>
                </div>
              </div>

              {/* VALIDATION RESULTS */}
              {geminiValidationResults.length > 0 && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                  <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hasil Pengecekan API Key ({geminiValidationResults.length}):</span>
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {geminiValidationResults.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
                          item.status === 'active'
                            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                            : item.status === 'rate_limited'
                              ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                              : 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="gemini_active_key"
                            checked={geminiActiveIdx === idx}
                            onChange={() => setGeminiActiveIdx(idx)}
                            className="text-amber-500 cursor-pointer"
                          />
                          <span className="font-mono font-bold">{item.maskedKey}</span>
                          <span className="text-[10px] opacity-75">#{idx + 1}</span>
                        </div>
                        <span className="text-[11px] font-semibold">
                          {item.message || (item.isValid ? 'Aktif ✓' : 'Tidak Valid')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CUSTOM MODEL INPUT */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ketik Model Kustom / Khusus Google Gemini:</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">User bebas memilih model apapun</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customGeminiInput}
                    onChange={(e) => setCustomGeminiInput(e.target.value)}
                    placeholder="Contoh: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash, gemini-1.5-pro..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customGeminiInput.trim()) {
                        setSelectedGeminiModel(customGeminiInput.trim());
                      }
                    }}
                    disabled={!customGeminiInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-bold border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Gunakan Model Ini
                  </button>
                </div>
              </div>

              {/* SEARCH & SCANNED GEMINI MODEL LIST */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    Pilih Bebas Model Gemini Hasil Scan ({filteredGeminiModels.length}):
                  </label>
                  <div className="relative w-64">
                    <input
                      type="text"
                      value={geminiFilter}
                      onChange={(e) => setGeminiFilter(e.target.value)}
                      placeholder="Cari model (flash, pro, 2.5, 2.0)..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredGeminiModels.map((m) => {
                    const isSelected = selectedGeminiModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedGeminiModel(m.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500 shadow-xs'
                            : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-zinc-200">{m.name}</span>
                            {m.isRecommended && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-black border border-amber-500/30 flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Rekomendasi
                              </span>
                            )}
                            <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded font-black border border-teal-500/30 flex items-center gap-0.5">
                              <Eye className="w-2.5 h-2.5" />
                              Vision / Gambar ✓
                            </span>
                            {m.contextLength && (
                              <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono border border-zinc-700">
                                {(m.contextLength / 1000).toFixed(0)}k Tokens
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400 block">{m.id}</span>
                          {m.description && (
                            <p className="text-[10px] text-zinc-500 line-clamp-1">{m.description}</p>
                          )}
                        </div>

                        <div className="text-right shrink-0 pl-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGeminiModel(m.id);
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                              isSelected
                                ? 'bg-amber-500 text-zinc-950 font-black'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                            }`}
                          >
                            {isSelected ? '✓ Dipilih' : 'Pilih Model'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPENROUTER */}
          {activeTab === 'openrouter' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                    OR
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">OpenRouter (100+ Model Terunggul)</h3>
                    <p className="text-[11px] text-zinc-400">
                      Gunakan Claude 3.5 Sonnet, Claude 3.7 Sonnet, Gemini 2.5 Pro, DeepSeek V3, atau model gratis.
                    </p>
                  </div>
                </div>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Dapatkan Key OpenRouter</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* INPUT OPENROUTER KEY */}
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                  OpenRouter API Key:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showOpenrouterKey ? 'text' : 'password'}
                      value={openrouterKey}
                      onChange={(e) => setOpenrouterKey(e.target.value)}
                      placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenrouterKey(!showOpenrouterKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                    >
                      {showOpenrouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleScanOpenRouter}
                    disabled={isScanningOpenRouter || !openrouterKey.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isScanningOpenRouter ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                    ) : (
                      <Search className="w-4 h-4 text-zinc-950" />
                    )}
                    <span>Cek Key & Scan Model Cocok</span>
                  </button>
                </div>
              </div>

              {/* SCAN STATUS MESSAGE */}
              {openrouterScanMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    openrouterScanMsg.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-800 text-rose-200'
                  }`}
                >
                  {openrouterScanMsg.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{openrouterScanMsg.text}</span>
                </div>
              )}

              {/* ACTIVE SELECTED MODEL CARD */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Model OpenRouter Aktif yang Dipilih:
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-extrabold text-emerald-400 font-mono">
                      {selectedOpenRouterModel}
                    </span>
                    {(selectedOpenRouterModel.includes('claude-3') ||
                      selectedOpenRouterModel.includes('gpt-4o') ||
                      selectedOpenRouterModel.includes('gemini') ||
                      selectedOpenRouterModel.includes('-vl') ||
                      selectedOpenRouterModel.includes('vision') ||
                      selectedOpenRouterModel.includes('pixtral')) ? (
                      <span className="text-[9px] bg-teal-500/20 text-teal-300 font-black px-1.5 py-0.2 rounded border border-teal-500/30 flex items-center gap-0.5">
                        <Eye className="w-2.5 h-2.5" />
                        Vision / Gambar Aktif ✓
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-black px-1.5 py-0.2 rounded border border-amber-500/30 flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Hanya Teks (Tanpa Gambar)
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Dipilih ✓
                </span>
              </div>

              {/* GUIDANCE TIP FOR VISION / PROMPT */}
              <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-800/40 text-[11px] text-teal-200/90 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-teal-300 font-bold">Panduan Referensi Gambar di OpenRouter:</strong>
                  <p className="text-zinc-300 mt-0.5 leading-relaxed">
                    Jika Anda mengunggah <strong>Gambar, SVG, atau Video referensi</strong>, pastikan memilih model berlabel <span className="text-teal-300 font-bold">Vision / Gambar ✓</span> (seperti <strong>Claude 3.5 Sonnet</strong>, <strong>Claude 3.7 Sonnet</strong>, <strong>Gemini 2.5 Pro</strong>, atau <strong>GPT-4o</strong>). Model teks murni seperti DeepSeek V3 hanya membaca prompt tulisan dan tidak dapat menganalisis gambar.
                  </p>
                </div>
              </div>

              {/* SEARCH & MODEL LIST */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    Pilih Salah Satu Model Hasil Scan ({filteredOpenRouterModels.length}):
                  </label>
                  <div className="relative w-64">
                    <input
                      type="text"
                      value={openrouterFilter}
                      onChange={(e) => setOpenrouterFilter(e.target.value)}
                      placeholder="Cari model (claude, deepseek, gemini)..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredOpenRouterModels.map((m) => {
                    const isSelected = selectedOpenRouterModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedOpenRouterModel(m.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-600 shadow-xs'
                            : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-zinc-200">{m.name}</span>
                            {m.isRecommended && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-black border border-amber-500/30 flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Rekomendasi
                              </span>
                            )}
                            {m.supportsVision ? (
                              <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded font-black border border-teal-500/30 flex items-center gap-0.5">
                                <Eye className="w-2.5 h-2.5" />
                                Vision / Gambar ✓
                              </span>
                            ) : (
                              <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-medium border border-zinc-700">
                                Teks Saja
                              </span>
                            )}
                            {m.isFree && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-black border border-emerald-500/30">
                                Free Tier
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400 block">{m.id}</span>
                          {m.description && (
                            <p className="text-[10px] text-zinc-500 line-clamp-1">{m.description}</p>
                          )}
                        </div>

                        <div className="text-right shrink-0 pl-3">
                          {m.pricing && (
                            <span className="text-[10px] text-zinc-400 block font-mono">
                              {m.pricing.prompt}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOpenRouterModel(m.id);
                            }}
                            className={`mt-1 px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                              isSelected
                                ? 'bg-emerald-500 text-zinc-950 font-black'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                            }`}
                          >
                            {isSelected ? '✓ Dipilih' : 'Pilih Model'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 9ROUTER */}
          {activeTab === '9router' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-black text-xs">
                    9R
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">9Router Gateway & OpenAI-Compatible Proxy</h3>
                    <p className="text-[11px] text-zinc-400">
                      Gunakan layanan 9Router atau gateway OpenAI-compatible kustom Anda sendiri.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-sky-400 font-bold">
                  {nineRouterBaseUrl}
                </span>
              </div>

              {/* INPUT 9ROUTER KEY & BASE URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    9Router API Key:
                  </label>
                  <div className="relative">
                    <input
                      type={showNineRouterKey ? 'text' : 'password'}
                      value={nineRouterKey}
                      onChange={(e) => setNineRouterKey(e.target.value)}
                      placeholder="Masukkan 9Router API Key..."
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNineRouterKey(!showNineRouterKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
                    >
                      {showNineRouterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">
                    Base URL (Endpoint):
                  </label>
                  <input
                    type="text"
                    value={nineRouterBaseUrl}
                    onChange={(e) => setNineRouterBaseUrl(e.target.value)}
                    placeholder="https://api.9router.com/v1"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleScanNineRouter}
                  disabled={isScanningNineRouter || !nineRouterKey.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-zinc-950 text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isScanningNineRouter ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  ) : (
                    <Search className="w-4 h-4 text-zinc-950" />
                  )}
                  <span>Cek Key & Scan Model 9Router</span>
                </button>
              </div>

              {/* 9ROUTER SCAN STATUS */}
              {nineRouterScanMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    nineRouterScanMsg.type === 'success'
                      ? 'bg-sky-950/60 border-sky-800 text-sky-200'
                      : 'bg-rose-950/60 border-rose-800 text-rose-200'
                  }`}
                >
                  {nineRouterScanMsg.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-sky-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{nineRouterScanMsg.text}</span>
                </div>
              )}

              {/* ACTIVE 9ROUTER MODEL */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Model 9Router Aktif yang Dipilih:
                  </span>
                  <span className="text-xs font-extrabold text-sky-400 font-mono">
                    {selectedNineRouterModel}
                  </span>
                </div>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-black px-2 py-0.5 rounded-full border border-sky-500/30">
                  Dipilih ✓
                </span>
              </div>

              {/* 9ROUTER MODELS LIST */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    Pilih Salah Satu Model 9Router ({filteredNineRouterModels.length}):
                  </label>
                  <div className="relative w-64">
                    <input
                      type="text"
                      value={nineRouterFilter}
                      onChange={(e) => setNineRouterFilter(e.target.value)}
                      placeholder="Cari model 9Router..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredNineRouterModels.map((m) => {
                    const isSelected = selectedNineRouterModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedNineRouterModel(m.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-600 shadow-xs'
                            : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-zinc-200">{m.name}</span>
                            {m.isRecommended && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-black border border-amber-500/30 flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Rekomendasi
                              </span>
                            )}
                            {m.supportsVision ? (
                              <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded font-black border border-teal-500/30 flex items-center gap-0.5">
                                <Eye className="w-2.5 h-2.5" />
                                Vision / Gambar ✓
                              </span>
                            ) : (
                              <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-medium border border-zinc-700">
                                Teks Saja
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400 block">{m.id}</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNineRouterModel(m.id);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                            isSelected
                              ? 'bg-sky-500 text-zinc-950 font-black'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                          }`}
                        >
                          {isSelected ? '✓ Dipilih' : 'Pilih Model'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-800 bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              Provider Aktif: <strong className="text-amber-400 uppercase">{activeTab}</strong>
            </span>
            {saveSuccessMsg && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tersimpan!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 text-xs font-black bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-zinc-950 stroke-[3]" />
              <span>Simpan & Terapkan Provider</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default AISettingsModal;
