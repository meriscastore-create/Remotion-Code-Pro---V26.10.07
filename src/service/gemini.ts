import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { transform as sucraseTransform } from "sucrase";
import {
  getAISettings,
  parseBulkGeminiKeys,
  saveAISettings,
  executeOpenAICompatibleChat,
  optimizeReferenceImageForAI,
  AISettings,
} from "./aiProviders";

let aiClient: GoogleGenAI | null = null;
let currentClientApiKey: string = "";

export function getEffectiveGeminiApiKey(): string {
  const settings = getAISettings();
  const bulkKeys = parseBulkGeminiKeys(settings.geminiKeysText);
  if (bulkKeys.length > 0) {
    const idx = settings.activeGeminiKeyIndex % bulkKeys.length;
    return bulkKeys[idx];
  }
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== "undefined" ? process.env.GEMINI_API_KEY : "") || "";
}

export function tryRotateGeminiKey(): boolean {
  const settings = getAISettings();
  const bulkKeys = parseBulkGeminiKeys(settings.geminiKeysText);
  if (bulkKeys.length > 1) {
    const nextIdx = (settings.activeGeminiKeyIndex + 1) % bulkKeys.length;
    saveAISettings({ activeGeminiKeyIndex: nextIdx });
    aiClient = null;
    currentClientApiKey = "";
    console.warn(`[Auto Key Failover] Beralih ke Gemini API Key ke-${nextIdx + 1} dari ${bulkKeys.length}`);
    return true;
  }
  return false;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = getEffectiveGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY belum diatur. Silakan masukkan API Key Gemini di menu Pengaturan AI & Model, atau pilih provider OpenRouter / 9Router."
    );
  }
  if (!aiClient || currentClientApiKey !== apiKey) {
    currentClientApiKey = apiKey;
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export interface SvgTraceMeta {
  viewBox?: string;
  width?: string | number;
  height?: string | number;
  pathCount?: number;
  fileName?: string;
}

export interface GenerateAnimationParams {
  mode: "reference" | "prompt";
  reference: string | null;
  refType: "video" | "image" | "svg" | null;
  svgCode?: string | null;
  svgMeta?: SvgTraceMeta | null;
  patchTracedOcclusion?: boolean;
  brief: string;
  duration: number;
  fps: number;
  optimizeSVG: boolean;
  useGenerativeBgPro: boolean;
  useSvgVectorOnly: boolean;
  useNoHudClean?: boolean;
  bgOverride: "none" | "greenscreen" | "black" | "white" | "alpha";
  forceLandscape: boolean;
  resolution?: "4K" | "2K";
  targetWidth?: number;
  targetHeight?: number;
  isSeamlessBackground: boolean;
  isPremium3D: boolean;
  isIconMode?: boolean;
  iconStyle?: string;
  isCustomBulkPerLine?: boolean;
  cleanNoText?: boolean;
}

export const NO_HUD_CLEAN_STRICT_RULES = `
The final result must meet the visual quality standards of premium commercial stock footage, luxury brand campaigns, high-end broadcast motion graphics, and professional CGI production, with exceptional cleanliness, consistency, balance, and production-ready execution.

Render all typography using a real installed system font (TrueType/OpenType) with native font rendering, never converting text into vector paths, SVG paths, Bézier outlines, polygons, meshes, or custom shape geometry. Automatically select a font that perfectly matches the visual concept and mood of the scene, using only professional-quality fonts that are 100% free for commercial use, sourced exclusively from Google Fonts or Font Squirrel.

COMMERCIAL QUALITY REQUIREMENTS
- Clean, elegant, and highly organized composition.
- Professional broadcast-quality CGI suitable for commercial licensing.
- Perfect visual hierarchy with balanced distribution of visual weight.
- Consistent scale, spacing, proportions, and symmetry where appropriate.
- Smooth visual flow without clutter or distracting elements.
- Premium luxury aesthetic with refined artistic direction.
- Every element must appear intentional, cohesive, and meticulously arranged.
- No random objects or visual noise.
- No chaotic clustering or awkward empty areas.
- Uniform material quality and consistent lighting across the entire frame.
- Seamless edge-to-edge composition with no visible repetition.
- Designed for professional motion graphics, presentations, advertising, broadcast, digital signage, and premium commercial backgrounds.
- Timeless, versatile, and commercially appealing visual design.
- Polished, refined, production-ready quality with flawless execution.

STRUCTURAL REQUIREMENTS
- Seamless infinite loop.
- Smooth continuous surfaces.
- Premium materials and flawless reflections.
- Sophisticated cinematic lighting.
- Edge-to-edge composition with no empty areas.
- Perfectly balanced composition.
- Broadcast-quality CGI.
- Ultra-high realism.

ABSOLUTE EXCLUSION RULES

The final composition must consist exclusively of the primary visual subject.
Do not add any secondary decorative elements, interface elements, corner decorations, loading bars, progress bars, status indicators, control panels, dashboards, widgets, information panels, callout graphics, corner accents, framing accents, decorative borders, ornamental overlays, navigation graphics, broadcast graphics, lower thirds, tickers, labels, indicators, timelines, scale marks, measuring graphics, calibration marks, targeting graphics, reticles, crosshairs, holographic graphics, blueprint graphics, infographic elements, or any small isolated design elements placed near the edges or corners.
Every visible element must belong to the main sculptural composition. No independent floating objects, corner ornaments, decorative accents, or disconnected graphic details are permitted anywhere in the frame.


NEGATIVE CONSTRAINTS
NO vortex.
NO canopy.
NO waves.
NO tunnel.
NO grid.
NO Crimson
NO Sculpture
no Neomorphic 
no Neomorphic wave
NO kinetic Sculpture
NO crystal geometry.
NO kinetic patterns.
NO cosmic elements.
NO wireframes.
NO outlines.
NO edges as primary design elements.
NO streaks.
NO ribbons.
NO strands.
NO filaments.
NO beams.
NO laser effects.
NO light trails.
NO flowing curves.
NO parallel lines.
NO intersecting lines.
NO line-based compositions.
NO abstract line art.
NO contour graphics.
NO HUD.
NO UI.
NO loading bars.
NO progress bars.
NO lower thirds.
NO broadcast graphics.
NO status indicators.
NO control panels.
NO dashboard elements.
NO corner decorations.
NO corner accents.
NO decorative corner graphics.
NO isolated decorative objects.
NO floating interface elements.
NO framing decorations.
NO edge decorations.
NO isolated glowing objects.
NO disconnected visual elements.
NO interface.
NO technical diagrams.
NO network structures.
NO web-like structures.
NO skeletal frameworks.
NO mesh patterns.
NO string-like forms.
NO cable-like forms.
NO elongated linear elements.
NO particles.
NO dots.
NO sparks.
NO floating debris.
NO dust.
NO bokeh.
NO text.
NO typography.
NO letters.
NO numbers.
NO logos.
NO watermark.
NO icons.
NO symbols.
NO overlays.
NO borders.
NO frames.
NO empty space.
NO black background.
`;

export interface GenerateAnimationResponse {
  code: string;
  previewHtml: string;
  detectedObjects: string[];
  suggestedVariations: {
    label: string;
    description: string;
    prompt: string;
  }[];
  suggestedTitle: string;
}

/**
 * FORMULA JUDUL FIZKES & ANDREY POPOV (RISET VALID ADOBE STOCK / SHUTTERSTOCK TOP BESTSELLER)
 * https://github.com/motionpopov/metastocker
 * 
 * Formula Baku:
 * [Subjek Demografis / Subjek Visual Spesifik] + [Kata Kerja Aktif / Gerund (-ing)] + [Objek/Properti/Elemen] + [Lokasi/Setting] + [Konsep Komersial]
 * 
 * Syarat Panjang Karakter Mutlak:
 * 65 - 120 Karakter (Tanpa Terpotong)
 * 
 * Contoh Standar Industri:
 * "Smiling young businesswoman wearing headset working on laptop in modern creative office, customer service support concept" (122 karakter)
 */
export interface PopovKeywords {
  tier1: string[]; // Rank 1-10: Golden Tags (Primary Subject & Core Action - 80% weight)
  tier2: string[]; // Rank 11-25: Contextual & Environment (Lighting, Texture, Motion Dynamics)
  tier3: string[]; // Rank 26-35: Conceptual & Commercial (Business Intent, Buyer Value)
  all: string[];   // Combined strictly 20-35 unique single words
  formattedString: string; // Comma-separated for Adobe Stock / Shutterstock / MetaStocker CSV
  tier1Golden: string[];
  tier2Contextual: string[];
  tier3Conceptual: string[];
  allKeywords: string;
}

export interface GenerateAnimationResponse {
  code: string;
  previewHtml: string;
  detectedObjects: string[];
  suggestedVariations: {
    label: string;
    description: string;
    prompt: string;
  }[];
  suggestedTitle: string;
  suggestedKeywords?: string[];
  popovKeywords?: PopovKeywords;
}

export interface ApplyVariationParams {
  variationPrompt: string;
  generatedTSXCode: string;
  previewHtmlCode: string;
  duration: number;
  fps: number;
  forceLandscape?: boolean;
  resolution?: "4K" | "2K";
  targetWidth?: number;
  targetHeight?: number;
  bgOverride?: "none" | "greenscreen" | "black" | "white" | "alpha";
}

export interface ApplyVariationResponse {
  code: string;
  previewHtml: string;
  suggestedTitle: string;
  suggestedKeywords?: string[];
  popovKeywords?: PopovKeywords;
}

export function sanitizeSvgForPrompt(rawSvg: string): string {
  if (!rawSvg) return "";
  // Strip XML prolog, doctype, comments, and inkscape/sodipodi/adobe metadata
  let cleaned = rawSvg
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(sodipodi|inkscape|adobe):[\s\S]*?\/>/gi, "")
    .replace(/<(metadata)[\s\S]*?<\/\1>/gi, "")
    .replace(/\s(sodipodi|inkscape|xmlns:sodipodi|xmlns:inkscape|xmlns:adobe):[a-z0-9_-]+="[^"]*"/gi, "")
    .trim();

  // If the SVG is still very large, limit to ~48,000 characters to ensure safe token usage
  if (cleaned.length > 48000) {
    cleaned = cleaned.slice(0, 48000) + "\n<!-- [Sisa elemen SVG dipotong untuk efisiensi token - gunakan struktur koordinat path di atas] -->\n</svg>";
  }
  return cleaned;
}

/**
 * METASTOCKER & ANDREY POPOV COMMERCIAL SEO ARCHITECTURE
 * Top Microstock Contributor Standards (Adobe Stock / Shutterstock / Freepik)
 * 
 * Title Formula:
 * [Specific Subject] + [Active Gerunds (-ing)] + [Props / Motion Dynamics] + [Environment] + [Commercial Intent / Closing]
 * 
 * Example Standard:
 * "Luxurious blue silk fabric gracefully flowing and rippling in continuous motion for elegant corporate branding backgrounds"
 * 
 * Constraints:
 * - Sentence case (capitalized only at the very first word)
 * - NO trailing period (.)
 * - NO random numbers / timestamps (_1789488318065, etc.)
 * - NO underscores (_)
 * - NO subjective spam ("beautiful", "stunning", "amazing", "breathtaking", "cute")
 * - NO camera jargon ("4k", "cinematic", "canon", "close up")
 * - NO redundant prefixes ("an image of", "photo of", "clip of", "footage of")
 * - Length: 65 - 120 characters ideal (comprehensive without truncation)
 */

export const BANNED_METASTOCKER_WORDS = [
  /\b(beautiful|stunning|amazing|breathtaking|gorgeous|cute|handsome|lovely|wonderful|magnificent|eye catching)\b/gi,
  /\b(an image of|photo of|clip of|footage of|video of|picture of|rendering of)\b/gi,
  /\b(4k|8k|hd|ultra hd|cinematic|canon|nikon|sony|close up|macro|isolated on white)\b/gi
];

export const POPOV_COMMERCIAL_CLOSINGS = [
  "for elegant corporate branding backgrounds",
  "for modern business technology backgrounds",
  "for creative advertising and brand marketing",
  "for digital communication and network presentations",
  "for luxury commercial brand identity backgrounds",
  "for futuristic artificial intelligence concepts",
  "for corporate financial investment presentations",
  "for modern creative motion graphic design",
  "for innovative technology and business solutions",
  "for professional corporate video presentations"
];

/**
 * Converts string to Sentence case (capital letter only at start, preserves common acronyms).
 */
export function toSentenceCase(str: string): string {
  if (!str) return "";
  const cleaned = str.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  const lower = cleaned.toLowerCase();
  let result = lower.charAt(0).toUpperCase() + lower.slice(1);
  // Restore industry standard acronyms
  result = result
    .replace(/\b3d\b/gi, "3D")
    .replace(/\b2d\b/gi, "2D")
    .replace(/\bai\b/gi, "AI")
    .replace(/\bui\b/gi, "UI")
    .replace(/\bcgi\b/gi, "CGI")
    .replace(/\bvr\b/gi, "VR")
    .replace(/\bar\b/gi, "AR");
  return result;
}

/**
 * Cleans titles according to Andrey Popov / MetaStocker standards.
 * Strips random numbers, timestamps, quotes, prefixes, underscores, and banned spam words.
 */
export function cleanAdobeStockTitle(raw: string): string {
  if (!raw) return "";
  let text = raw.trim();

  // Strip JSON formatting, quotes, markdown, and field labels
  text = text
    .replace(/^["'`“”«»]+|["'`“”«»]+$/g, "")
    .replace(/^(title|suggested title|adobe stock title|project name)\s*:\s*/i, "")
    .replace(/[\r\n\t]+/g, " ");

  // Strip trailing timestamps and random numbers like _1789488318065, _1, _12345
  text = text.replace(/[_\s-]*\b\d{4,}\b/g, "");
  text = text.replace(/_\d+$/g, "");
  text = text.replace(/\b\d{6,}\b/g, "");

  // Strip underscores and turn into clean spaces
  text = text.replace(/_+/g, " ");

  // Strip banned subjective spam & camera jargon
  for (const banned of BANNED_METASTOCKER_WORDS) {
    text = text.replace(banned, "");
  }

  // Normalize delimiters & whitespace
  text = text
    .replace(/\s*,\s*,+/g, ",")
    .replace(/\s+/g, " ")
    .replace(/^[,\s;.-]+|[,\s;.-]+$/g, "");

  return toSentenceCase(text);
}

/**
 * Generates a bulletproof Andrey Popov / MetaStocker title.
 * Formats: [Subject] + [Active Gerunds (-ing)] + [Props / Motion Dynamics] + [Commercial Intent]
 * Guarantees sentence case, zero numbers, zero underscores, and ideal 65-120 length.
 */
export function formatFizkesPopovTitle(
  rawTitle: string,
  context: { brief?: string; style?: string; is3D?: boolean } = {}
): string {
  let text = cleanAdobeStockTitle(rawTitle);

  // If title is empty or a generic placeholder
  const isPlaceholder =
    !text ||
    /^(baris\s*\d+|variasi\s*\d+|custom\s*animation|untitled|video|bg\s*var|project|motion\s*background)$/i.test(
      text
    );

  if (isPlaceholder) {
    const briefClean = cleanAdobeStockTitle(context.brief || "");
    if (briefClean && briefClean.length > 10) {
      text = briefClean;
    } else {
      text = "Luxurious abstract silk fabric gracefully flowing and rippling in continuous motion for elegant corporate branding backgrounds";
    }
  }

  // Remove trailing period if any
  text = text.replace(/\.+$/g, "").trim();

  // Ensure active gerund (-ing) exists for motion background video
  const hasGerund = /\b(\w+ing)\b/i.test(text);
  if (!hasGerund) {
    text = `${text} gracefully flowing in continuous motion`;
  }

  // Check if it already has a commercial closing (starts with "for ...")
  const hasPopovClosing = /\bfor\s+[\w\s]+backgrounds?$/i.test(text) || /\bfor\s+[\w\s]+(concept|design|presentations?|marketing)$/i.test(text);

  if (!hasPopovClosing) {
    // If it has old legacy comma suffix like ", luxury textile background concept", clean it into natural preposition
    if (/,\s*[\w\s]+concept$/i.test(text)) {
      text = text.replace(/,\s*/g, " for ").replace(/\bconcept$/i, "backgrounds");
    } else {
      // Pick best Popov closing matching target length 75-120
      let pickedClosing = "";
      for (const closing of POPOV_COMMERCIAL_CLOSINGS) {
        const targetLen = text.length + 1 + closing.length;
        if (targetLen >= 75 && targetLen <= 120) {
          pickedClosing = closing;
          break;
        }
      }
      if (!pickedClosing) {
        pickedClosing = text.length + 43 <= 120
          ? "for elegant corporate branding backgrounds"
          : "for modern business backgrounds";
      }
      text = `${text} ${pickedClosing}`;
    }
  }

  // If text is still under 70 characters, enrich with motion dynamic context
  if (text.length < 70) {
    const forIdx = text.toLowerCase().indexOf(" for ");
    if (forIdx !== -1) {
      const head = text.substring(0, forIdx).trim();
      const tail = text.substring(forIdx);
      text = `${head} in continuous motion${tail}`;
    } else {
      text = `${text} for corporate branding backgrounds`;
    }
  }

  // If text exceeds 125 characters, gently trim at word boundary before commercial closing
  if (text.length > 125) {
    const forIdx = text.toLowerCase().lastIndexOf(" for ");
    if (forIdx !== -1 && forIdx > 35) {
      const closing = text.substring(forIdx);
      let head = text.substring(0, forIdx);
      const maxHeadLen = 125 - closing.length;
      if (maxHeadLen > 30) {
        let cutHead = head.substring(0, maxHeadLen);
        const lastSpace = cutHead.lastIndexOf(" ");
        if (lastSpace > 25) {
          head = cutHead.substring(0, lastSpace);
        }
        text = `${head}${closing}`;
      }
    } else {
      let cut = text.substring(0, 125);
      const lastSpace = cut.lastIndexOf(" ");
      text = cut.substring(0, lastSpace > 40 ? lastSpace : 120);
    }
  }

  // Final cleanup: no random numbers, no underscores, sentence case, no trailing dot
  text = text
    .replace(/[_\s-]*\b\d{4,}\b/g, "")
    .replace(/_\d+$/g, "")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .trim();

  return toSentenceCase(text);
}

/**
 * Generates clean filename strictly without random numbers or timestamps.
 * E.g.: "Luxurious blue silk fabric gracefully flowing and rippling in continuous motion for elegant corporate branding backgrounds.tsx"
 */
export function getCleanPopovFilename(rawTitle: string): string {
  let clean = cleanAdobeStockTitle(rawTitle || "Motion Background");
  // Remove illegal OS filename characters
  clean = clean
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/[_\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .trim();

  // Strictly strip any numeric timestamps or random trailing IDs
  clean = clean.replace(/\s*\b\d{4,}\b/g, "").trim();

  return `${clean || "Motion Background"}.tsx`;
}

/**
 * Strips declaration blocks that have matching braces {} (e.g., objects or arrow functions)
 */
export function stripDeclWithBraces(source: string, prefixRegex: RegExp): string {
  let result = source;
  let match: RegExpExecArray | null;
  while ((match = prefixRegex.exec(result)) !== null) {
    const startIndex = match.index;
    const afterPrefix = startIndex + match[0].length;
    const openBraceIdx = result.indexOf("{", afterPrefix);
    if (openBraceIdx === -1 || openBraceIdx > afterPrefix + 150) {
      const semiIdx = result.indexOf(";", afterPrefix);
      if (semiIdx !== -1) {
        result = result.slice(0, startIndex) + result.slice(semiIdx + 1);
        prefixRegex.lastIndex = startIndex;
        continue;
      }
      break;
    }
    let depth = 0;
    let endIndex = -1;
    for (let i = openBraceIdx; i < result.length; i++) {
      if (result[i] === "{") depth++;
      else if (result[i] === "}") {
        depth--;
        if (depth === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    if (endIndex !== -1) {
      while (endIndex < result.length && (result[endIndex] === ";" || result[endIndex] === " " || result[endIndex] === "\t")) {
        endIndex++;
      }
      if (endIndex < result.length && result[endIndex] === "\r") endIndex++;
      if (endIndex < result.length && result[endIndex] === "\n") endIndex++;
      result = result.slice(0, startIndex) + result.slice(endIndex);
      prefixRegex.lastIndex = startIndex;
    } else {
      break;
    }
  }
  return result;
}

/**
 * Strips declaration blocks that have matching brackets [] (e.g., arrays)
 */
export function stripDeclWithBrackets(source: string, prefixRegex: RegExp): string {
  let result = source;
  let match: RegExpExecArray | null;
  while ((match = prefixRegex.exec(result)) !== null) {
    const startIndex = match.index;
    const afterPrefix = startIndex + match[0].length;
    const openBracketIdx = result.indexOf("[", afterPrefix);
    if (openBracketIdx === -1 || openBracketIdx > afterPrefix + 80) {
      const semiIdx = result.indexOf(";", afterPrefix);
      if (semiIdx !== -1) {
        result = result.slice(0, startIndex) + result.slice(semiIdx + 1);
        prefixRegex.lastIndex = startIndex;
        continue;
      }
      break;
    }
    let depth = 0;
    let endIndex = -1;
    for (let i = openBracketIdx; i < result.length; i++) {
      if (result[i] === "[") depth++;
      else if (result[i] === "]") {
        depth--;
        if (depth === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    if (endIndex !== -1) {
      while (endIndex < result.length && (result[endIndex] === ";" || result[endIndex] === " " || result[endIndex] === "\t")) {
        endIndex++;
      }
      if (endIndex < result.length && result[endIndex] === "\r") endIndex++;
      if (endIndex < result.length && result[endIndex] === "\n") endIndex++;
      result = result.slice(0, startIndex) + result.slice(endIndex);
      prefixRegex.lastIndex = startIndex;
    } else {
      break;
    }
  }
  return result;
}

/**
 * Strips ALL duplicate or existing CONFIGURATION CONSTANTS, IPTC METADATA blocks,
 * and stray scalar constants from Remotion TSX code.
 */
export function sanitizeRemotionConstants(code: string): string {
  if (!code) return "";
  let cleaned = code;

  // 1. Remove all section comments for configuration and IPTC
  cleaned = cleaned.replace(/^[ \t]*\/\/\s*---\s*CONFIGURATION CONSTANTS\s*---[^\r\n]*\r?\n?/gmi, "");
  cleaned = cleaned.replace(/^[ \t]*\/\/\s*---\s*IPTC[^\r\n]*\r?\n?/gmi, "");
  cleaned = cleaned.replace(/^[ \t]*\/\/\s*---\s*ADOBE BRIDGE[^\r\n]*\r?\n?/gmi, "");
  cleaned = cleaned.replace(/^[ \t]*\/\/\s*IPTC CORE[^\r\n]*\r?\n?/gmi, "");

  // 2. Remove complex functions and objects (handles nested braces, multiline, etc.)
  cleaned = stripDeclWithBraces(cleaned, /export\s+const\s+calculateMetadata\s*=\s*(?:async\s*)?\([\s\S]*?\)\s*=>/g);
  cleaned = stripDeclWithBraces(cleaned, /export\s+const\s+IPTC_METADATA\s*=/g);
  cleaned = stripDeclWithBrackets(cleaned, /export\s+const\s+KEYWORDS\s*=/g);

  // 3. Remove single-line constants
  cleaned = cleaned.replace(/export\s+const\s+DURATION\s*=\s*[^;\r\n]+;?[^\r\n]*\r?\n?/gi, "");
  cleaned = cleaned.replace(/export\s+const\s+FPS\s*=\s*[^;\r\n]+;?[^\r\n]*\r?\n?/gi, "");
  cleaned = cleaned.replace(/export\s+const\s+WIDTH\s*=\s*[^;\r\n]+;?[^\r\n]*\r?\n?/gi, "");
  cleaned = cleaned.replace(/export\s+const\s+HEIGHT\s*=\s*[^;\r\n]+;?[^\r\n]*\r?\n?/gi, "");
  cleaned = cleaned.replace(/export\s+const\s+TITLE\s*=\s*(?:["'`][\s\S]*?["'`]|[^;\r\n]+);?[^\r\n]*\r?\n?/gi, "");
  cleaned = cleaned.replace(/export\s+const\s+HEADLINE\s*=\s*[^;\r\n]+;?[^\r\n]*\r?\n?/gi, "");
  cleaned = cleaned.replace(/export\s+const\s+DESCRIPTION\s*=\s*[^;\r\n]+;?[^\r\n]*\r?\n?/gi, "");

  // 4. Remove any stray standalone numbers (e.g. "600;\n") left behind
  cleaned = cleaned.replace(/^[ \t]*\d+;[ \t]*\r?\n/gm, "");

  // 5. Trim excess empty lines (max 2 consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * Automatically detects and heals syntax defects in generated Remotion TSX code,
 * resolving esbuild, Webpack, and TypeScript compilation errors such as:
 * - '...' expected (caused by stray '{' at end of JSX tags, unspread attributes, comments inside tags, or LLM ellipsis placeholders)
 * - Unexpected token. Did you mean `{'>'}` or `&gt;`? (caused by unescaped > in JSX children or arrow comments // ---> inside JSX)
 * - Identifier expected (caused by unclosed JSX tags, dangling slashes, or missing tag closures)
 * - Unterminated regular expressions (caused by lone trailing / slashes or incomplete division)
 * - Generic arrow function parsing ambiguities in TSX (e.g. <T>(...) => parsed as JSX tag <T>)
 * - Missing self-closing slashes on SVG leaf elements (<circle>, <path>, <line>, <rect>, etc.)
 */
export function healTsxSyntaxErrors(code: string): string {
  if (!code) return "";
  let healed = code;

  // 1. Remove lone lines with only `...` or `... (truncated)` or `... (more)` or `... (rest)`:
  healed = healed.replace(/^[ \t]*\.\.\.[^\r\n]*$/gm, "");

  // 2. Remove lone lines with only `{...}` or `{ ... }`:
  healed = healed.replace(/^[ \t]*\{\s*\.\.\.\s*\}[^\r\n]*$/gm, "");

  // 3. Remove trailing `...` in object literals or arrays: e.g. `{ id: 1, ... }` -> `{ id: 1 }`
  healed = healed.replace(/,\s*\.\.\.(?=\s*[\}\]])/g, "");

  // 4. Remove standalone `...` in JSX tags: e.g. `<path d="M0 0" ... />` -> `<path d="M0 0" />`
  healed = healed.replace(/(<[A-Za-z0-9_.-]+[^>]*?)\s+\.\.\.(?=\s*[\/>])/g, "$1");

  // 5. Remove empty spread `{...}` inside JSX tags: e.g. `<path {...} />` -> `<path />`
  healed = healed.replace(/(<[A-Za-z0-9_.-]+[^>]*?)\s*\{\s*\.\.\.\s*\}([^>]*>)/g, "$1$2");

  // 6. Generic arrow functions in TSX:
  // In TSX, <T>(x: T) => is parsed as JSX tag unless disambiguated with trailing comma: <T,>(x: T) =>
  healed = healed.replace(/\bconst\s+([A-Za-z0-9_]+)\s*=\s*<([A-Z][A-Za-z0-9_]*)\s*>\s*\(/g, "const $1 = <$2,>(");
  healed = healed.replace(/\bconst\s+([A-Za-z0-9_]+)\s*=\s*<([A-Z][A-Za-z0-9_]*)\s+extends\s+([^>]+)>\s*\(/g, "const $1 = <$2 extends $3,>(");

  // 7. Remove all comments inside return ( ... ) blocks completely (except USER EDITABLE TRANSFORM CONTAINER)
  // Supports single or multiple return blocks (for subcomponents)
  healed = healed.replace(/return\s*\([\s\S]*?\)\s*;/g, (retBlock) => {
    let cleaned = retBlock;
    // Strip JSX comments except editable transform container
    cleaned = cleaned.replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.includes("USER EDITABLE TRANSFORM CONTAINER") ? m : "");
    // Strip inline comments after JSX attributes: fill="#ffc300" // comment
    cleaned = cleaned.replace(/(\b[a-zA-Z0-9_-]+=(?:\{[^}]*\}|"[^"]*"|'[^']*'))\s*\/\/[^\r\n]*/g, "$1");
    // Strip single-line comments // inside return block
    cleaned = cleaned.replace(/^[ \t]*\/\/[^\r\n]*$/gm, "");
    // Strip multiline comments /* ... */
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, (m) => m.includes("USER EDITABLE TRANSFORM CONTAINER") ? m : "");
    return cleaned;
  });

  // 8. Strip any remaining comments inside JSX opening tags:
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\{\/\*[\s\S]*?\*\/\}([^>]*>)/g, "$1$2");
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\/\*[\s\S]*?\*\/([^>]*>)/g, "$1$2");

  // 9. Remove stray `{` at end of line inside opening tags (e.g. `<path {` -> `<path`)
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\s*\{\s*$/gm, "$1");
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\s*\{\s*(?=\r?\n)/g, "$1");

  // 10. Close unclosed leaf tags before next tag starts:
  healed = healed.replace(/(<(?:path|rect|circle|line|ellipse|polygon|polyline|stop|use|image)\b[^>]*?)(?=\r?\n\s*<[A-Za-z/])/gm, (match) => {
    if (!match.endsWith("/")) {
      return match + " />";
    }
    return match;
  });

  // 11. Fix unclosed opening tags at end of line with standalone prop:
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:[^>]*?))\s+\{(?!\.\.\.)([a-zA-Z0-9_$.]+)\}(?=\s*(?:\r?\n\s*<|\r?\n\s*\/[/>]|\r?\n\s*\)|$))/g, "$1 {...$2} />");

  // 12. Fix unspread JSX props (ensuring no duplicate ...):
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\s+\{(?!\.\.\.)([a-zA-Z0-9_$.]+)\}([^>]*>)/g, "$1 {...$2}$3");

  // 13. Fix multiple consecutive dots in spread:
  healed = healed.replace(/\{\s*\.{4,}/g, "{...");

  // 14. Fix empty JSX prop braces:
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\s+\{\s*\}([^>]*>)/g, "$1 $2");

  // 15. Fix spaced self-closing tags:
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:(?:\s+[^>]*?)?))\s*\/\s+>/g, "$1 />");

  // 16. Fix malformed multiline and single-line self-closing tags:
  healed = healed.replace(/(<[A-Za-z0-9_.-]+(?:[^>]*?))\s*\/(?![>*/])(?=\s*(?:\r?\n\s*<|\r?\n\s*\/[/>]|\r?\n\s*\)|$))/g, "$1 />");

  // 17. Fix leaf SVG tags that forgot self-closing slash:
  const leafTags = [
    "circle", "path", "line", "rect", "ellipse", "polygon", "polyline", 
    "stop", "use", "image", "feGaussianBlur", "feDropShadow", "feColorMatrix", 
    "feBlend", "feMergeNode", "feComposite", "feDisplacementMap", "feTurbulence",
    "fePointLight", "feDistantLight", "feSpotLight", "feOffset"
  ];
  for (const tag of leafTags) {
    const regex = new RegExp("<(" + tag + ")\\b([^>]*?)>(?!\\s*<\\/" + tag + ">)", "gi");
    healed = healed.replace(regex, (m, tagName, attrs) => {
      const trimmedAttrs = attrs.trimEnd();
      if (trimmedAttrs.endsWith("/")) return m;
      return "<" + tagName + attrs + " />";
    });
  }

  // 18. Fix raw unescaped > or arrows (->, =>) in JSX text children:
  healed = healed.replace(/(<([A-Za-z0-9_.-]+)\b[^>]*>)([^<]+)(<\/\2>)/g, (full, open, tagName, body, close) => {
    if (body.includes(">") || body.includes("<")) {
      const fixedBody = body
        .replace(/->/g, " &rarr; ")
        .replace(/=>/g, " &rArr; ")
        .replace(/>/g, "&gt;")
        .replace(/</g, "&lt;");
      return open + fixedBody + close;
    }
    return full;
  });

  // 19. Anti-Truncation Healer: If LLM output was truncated mid-JSX, safely close open containers and function
  if (/return\s*\(\s*<AbsoluteFill/i.test(healed) && !/<\/AbsoluteFill>\s*\)\s*;/i.test(healed)) {
    healed = healed.replace(/<[A-Za-z0-9_.-]+[^>]*$/s, "").trimEnd();
    const containers = ["g", "defs", "svg", "div", "ThreeCanvas"];
    for (const tag of containers) {
      const openCount = (healed.match(new RegExp("<" + tag + "\\b", "g")) || []).length;
      const closeCount = (healed.match(new RegExp("</" + tag + ">", "g")) || []).length;
      if (openCount > closeCount) {
        for (let j = 0; j < (openCount - closeCount); j++) {
          healed += "\n</" + tag + ">";
        }
      }
    }
    if (!healed.includes("</AbsoluteFill>")) {
      healed += "\n    </AbsoluteFill>";
    }
    healed += "\n  );\n};\n";
    const compMatch = healed.match(/export const\s+([A-Za-z0-9_]+)\s*(?::\s*React\.FC[^=]*=|=\s*\([^)]*\)\s*=>)/);
    if (compMatch && !healed.includes("export default")) {
      healed += `\nexport default ${compMatch[1]};\n`;
    }
  }

  // 20. Comprehensive Stack-Based JSX Container Balancer
  // Solves fatal error: "Expected corresponding JSX closing tag for 'AbsoluteFill'"
  // when any container tag (div, g, svg, defs, linearGradient, radialGradient, filter, mask, clipPath, ThreeCanvas, group, mesh, etc.)
  // is left unclosed before </AbsoluteFill>.
  const absStart = healed.indexOf("<AbsoluteFill");
  const absEnd = healed.lastIndexOf("</AbsoluteFill>");
  if (absStart !== -1 && absEnd !== -1 && absEnd > absStart) {
    const tagClose = healed.indexOf(">", absStart);
    if (tagClose !== -1 && tagClose < absEnd) {
      const beforeContent = healed.slice(0, tagClose + 1);
      let insideContent = healed.slice(tagClose + 1, absEnd);
      const afterContent = healed.slice(absEnd);

      const leafTagsSet = new Set([
        "circle", "path", "line", "rect", "ellipse", "polygon", "polyline", 
        "stop", "use", "image", "feGaussianBlur", "feDropShadow", "feColorMatrix", 
        "feBlend", "feMergeNode", "feComposite", "feDisplacementMap", "feTurbulence",
        "fePointLight", "feDistantLight", "feSpotLight", "feOffset", "input", "br", "hr"
      ]);

      // Ensure all leaf tags inside are self-closing
      for (const leaf of leafTagsSet) {
        const r = new RegExp("<(" + leaf + ")\\b([^>]*?)>(?!\\s*<\\/" + leaf + ">)", "gi");
        insideContent = insideContent.replace(r, (m, name, attrs) => {
          if (attrs.trimEnd().endsWith("/")) return m;
          return `<${name}${attrs} />`;
        });
      }

      // Track all container tags using a stack
      const tagScanner = /<(\/)?([A-Za-z0-9_.-]+)([^>]*?)(\/?>)/g;
      const stack: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = tagScanner.exec(insideContent)) !== null) {
        const [, isClosing, tagName, attrs, endBracket] = match;
        const isSelfClosing = endBracket === "/>" || attrs.trimEnd().endsWith("/");

        if (leafTagsSet.has(tagName.toLowerCase()) || tagName === "AbsoluteFill") {
          continue;
        }

        if (!isClosing && !isSelfClosing) {
          stack.push(tagName);
        } else if (isClosing) {
          if (stack.length > 0) {
            if (stack[stack.length - 1] === tagName) {
              stack.pop();
            } else {
              const foundIdx = stack.lastIndexOf(tagName);
              if (foundIdx !== -1) {
                stack.splice(foundIdx, stack.length - foundIdx);
              }
            }
          }
        }
      }

      let missingClosings = "";
      while (stack.length > 0) {
        const unclosed = stack.pop();
        missingClosings += `\n    </${unclosed}>`;
      }

      if (missingClosings) {
        healed = beforeContent + insideContent + missingClosings + "\n" + afterContent;
      }
    }
  }

  // 21. Fix single-slash comments outside return (STRICTLY preserving self-closing `/>`):
  healed = healed.split('\n').map(line => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('/>') || trimmed.startsWith('/ >')) return line;
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
      const rest = trimmed.slice(1);
      if (!/\/[gimsuy]*\s*([,;)\].]|$)/.test(rest)) {
        const indent = line.slice(0, line.length - trimmed.length);
        return indent + '//' + rest;
      }
    }
    return line;
  }).join('\n');

  // 22. Fix malformed JSX comments:
  healed = healed.replace(/\{\s*\/\*?\s*([^}*]+?)\s*\*?\/?\s*\}/g, '{/* $1 */}');

  // 23. Fix dangling division:
  healed = healed.replace(/([a-zA-Z0-9_)\]])\s*\/\s*(?=[;\r\n])/g, '$1 / 1');

  // 24. Fix lone dangling slash lines:
  healed = healed.replace(/^[ \t]*\/[ \t]*\r?\n/gm, '');

  // 25. Fix missing opening braces on JSX style and object attributes:
  // e.g. style=\n width: '100%', height: '100%', display: 'block', }} -> style={{ width: '100%', height: '100%', display: 'block' }}
  healed = healed.replace(/([a-zA-Z0-9_-]+)\s*=\s*(?!\s*["'{])\s*\n?\s*([a-zA-Z0-9_'"]+\s*:[^}]+)\s*\}\}/g, (m, attrName, body) => {
    return `${attrName}={{\n${body}\n}}`;
  });

  // e.g. style={\n width: '100%' }} -> style={{ width: '100%' }}
  healed = healed.replace(/([a-zA-Z0-9_-]+)\s*=\s*\{\s*(?!\{)\s*([a-zA-Z0-9_'"]+\s*:[^}]+)\s*\}\}/g, (m, attrName, body) => {
    return `${attrName}={{\n${body}\n}}`;
  });

  // e.g. style=\n width: '100%' } -> style={{ width: '100%' }}
  healed = healed.replace(/([a-zA-Z0-9_-]+)\s*=\s*(?!\s*["'{])\s*\n?\s*([a-zA-Z0-9_'"]+\s*:[^}]+)\s*\}(?!\})/g, (m, attrName, body) => {
    return `${attrName}={{\n${body}\n}}`;
  });

  // e.g. style={{ width: '100%' } /> -> style={{ width: '100%' }} />
  healed = healed.replace(/([a-zA-Z0-9_-]+)\s*=\s*\{\{\s*([a-zA-Z0-9_'"]+\s*:[^}]+)\s*\}(?!\})\s*(?=\/?>)/g, (m, attrName, body) => {
    return `${attrName}={{\n${body}\n}}`;
  });

  // 26. Clean up any excessive empty lines:
  healed = healed.replace(/\n{3,}/g, '\n\n');

  return healed;
}

/**
 * Dedicated syntax healer for standalone HTML preview sandbox.
 * Ensures valid HTML structure, properly closed script tags, and guaranteed window.draw function.
 */
export function healHtmlPreviewSyntax(html: string): string {
  if (!html) return "";
  let healed = html.trim();

  // 1. Strip markdown code fencing if present
  if (healed.startsWith("```html")) {
    healed = healed.replace(/^```html\s*/i, "").replace(/\s*```$/, "");
  } else if (healed.startsWith("```")) {
    healed = healed.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // 2. Ensure DOCTYPE and html wrapper
  if (!healed.toLowerCase().includes('<!doctype html>')) {
    if (!healed.includes('<html')) {
      healed = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n</head>\n<body>\n${healed}\n</body>\n</html>`;
    } else {
      healed = `<!DOCTYPE html>\n${healed}`;
    }
  }

  // 3. Close open script tags if truncated
  const scriptOpenCount = (healed.match(/<script\b/gi) || []).length;
  const scriptCloseCount = (healed.match(/<\/script>/gi) || []).length;
  if (scriptOpenCount > scriptCloseCount) {
    healed += "\n  };\n</script>";
  }

  // 4. Close body and html if missing
  if (!healed.includes('</body>')) {
    healed += '\n</body>';
  }
  if (!healed.includes('</html>')) {
    healed += '\n</html>';
  }

  // 5. Ensure window.draw and window.render exist
  if (!healed.includes('window.draw') && !healed.includes('window.render')) {
    const bridgeScript = `\n<script>\nif (typeof window.draw !== 'function') {\n  window.draw = function(p, f) {\n    if (typeof window.render === 'function') window.render(p, f);\n    else if (typeof window.animate === 'function') window.animate(p, f);\n    else if (typeof window.update === 'function') window.update(p, f);\n  };\n  window.render = window.draw;\n}\n</script>\n`;
    healed = healed.replace('</body>', `${bridgeScript}</body>`);
  }

  return healed;
}

/**
 * SISTEM PIRAMIDA 3 LAPISAN METASTOCKER (ANDREY POPOV) KEYWORDS GENERATOR
 * - Tier 1 (Rank 1 - 10): Golden Tags (Subjek & Aksi Utama - 80% Weight di Adobe Stock)
 * - Tier 2 (Rank 11 - 25): Contextual & Environment (Tekstur, Pencahayaan, Dinamika Gerak)
 * - Tier 3 (Rank 26 - 35): Conceptual & Commercial (Nilai Bisnis, Search Intent Pembeli)
 * Total: 20 - 35 Single Words (Strictly No Phrases, No Duplicates, No Banned Words)
 */
export function generatePopovKeywords(
  title: string,
  context: { brief?: string; objects?: string[] } = {}
): PopovKeywords {
  const combinedText = `${title} ${context.brief || ""} ${(context.objects || []).join(" ")}`.toLowerCase();

  // Common singularizer helper to prevent duplicate plurals (e.g., 'wave' and 'waves')
  const normalizeWord = (w: string): string => {
    let clean = w.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (clean.endsWith("ies") && clean.length > 4) return clean.slice(0, -3) + "y";
    if (clean.endsWith("es") && clean.length > 4 && !clean.endsWith("ses") && !clean.endsWith("zes")) return clean.slice(0, -2);
    if (clean.endsWith("s") && clean.length > 3 && !clean.endsWith("ss") && !clean.endsWith("us") && !clean.endsWith("is")) return clean.slice(0, -1);
    return clean;
  };

  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "of", "from",
    "is", "are", "was", "were", "be", "been", "being", "it", "its", "this", "that", "these", "those",
    "beautiful", "stunning", "amazing", "breathtaking", "cute", "handsome", "photo", "picture", "clip",
    "footage", "video", "4k", "8k", "hd", "cinematic", "canon", "nikon", "sony", "isolated", "white"
  ]);

  const seen = new Set<string>();
  const addWord = (w: string, list: string[]): void => {
    const norm = normalizeWord(w);
    if (!norm || norm.length < 3 || stopWords.has(norm) || seen.has(norm)) return;
    seen.add(norm);
    list.push(norm);
  };

  // 1. Extract physical words from title
  const rawWords = title.toLowerCase().split(/[\s,._-]+/);
  const titleWords: string[] = [];
  rawWords.forEach(w => {
    const norm = normalizeWord(w);
    if (norm && norm.length >= 3 && !stopWords.has(norm) && !seen.has(norm)) {
      titleWords.push(norm);
    }
  });

  // Categorize words into Tiers
  const tier1: string[] = [];
  const tier2: string[] = [];
  const tier3: string[] = [];

  // Seed domain-specific keywords based on detected semantics
  const isFabric = /silk|satin|fabric|cloth|curtain|textile|drapery|velvet/i.test(combinedText);
  const isTech = /cyber|digital|data|network|tech|future|ai|code|matrix|grid/i.test(combinedText);
  const is3D = /3d|cube|sphere|geometric|polygon|prism|mesh|render/i.test(combinedText);
  const isFluid = /liquid|fluid|water|wave|flow|stream|ripple|ink/i.test(combinedText);
  const isLuxury = /luxury|luxurious|gold|golden|chrome|metallic|silver|glass/i.test(combinedText);

  // Tier 1 Seed Pool: Physical subjects, materials, colors, core action
  const tier1Pool = [
    ...(isFabric ? ["silk", "fabric", "flowing", "rippling", "satin", "textile", "wave", "cloth", "drapery"] : []),
    ...(isTech ? ["technology", "digital", "network", "data", "cyber", "futuristic", "grid", "connection", "matrix"] : []),
    ...(is3D ? ["geometric", "cube", "sphere", "abstract", "render", "polygon", "surface", "dimension", "shape"] : []),
    ...(isFluid ? ["liquid", "wave", "fluid", "flowing", "ripple", "water", "splash", "stream", "surface"] : []),
    ...(isLuxury ? ["luxury", "metallic", "gold", "chrome", "reflection", "shiny", "elegance", "premium"] : []),
    "motion", "background", "loop", "smooth", "curtain", "blue", "wave"
  ];

  // Populate Tier 1 (Golden Tags: 1 - 10)
  titleWords.slice(0, 7).forEach(w => addWord(w, tier1));
  tier1Pool.forEach(w => {
    if (tier1.length < 10) addWord(w, tier1);
  });

  // Tier 2 Seed Pool: Contextual, Lighting, Texture, Dynamics (11 - 25)
  const tier2Pool = [
    ...(isFabric ? ["texture", "crease", "fold", "shimmer", "drapery", "soft"] : []),
    ...(isTech ? ["matrix", "connection", "cyberpunk", "hologram", "binary"] : []),
    ...(is3D ? ["geometric", "polygon", "mesh", "wireframe", "perspective"] : []),
    ...(isFluid ? ["stream", "splash", "wavelet", "translucent", "viscous"] : []),
    ...(isLuxury ? ["chrome", "metallic", "specular", "sheen", "prestige"] : []),
    "continuous", "seamless", "movement", "gradient", "lighting", "reflection",
    "backdrop", "animation", "glow", "dynamic", "clean", "vibrant", "depth", "modern"
  ];
  titleWords.slice(7).forEach(w => {
    if (tier2.length < 12) addWord(w, tier2);
  });
  tier2Pool.forEach(w => {
    if (tier2.length < 12) addWord(w, tier2);
  });

  // Tier 3 Seed Pool: Conceptual, Commercial Intent, Buyer Use Case (26 - 35)
  const tier3Pool = [
    "corporate", "branding", "presentation", "advertising", "marketing",
    "business", "concept", "commercial", "creative", "template"
  ];
  tier3Pool.forEach(w => {
    if (tier3.length < 8) addWord(w, tier3);
  });

  // Combine organically without forcing fixed size 35
  const combinedKeywords = [...tier1, ...tier2, ...tier3];

  // Microstock & SEO requirement: Minimum 20, Maximum 35.
  // DO NOT force to 35: keep natural, accurate count between 20 and 35
  const emergencyFallbacks = [
    "motion", "background", "loop", "animation", "graphic",
    "display", "visual", "design", "effect", "surface", "backdrop"
  ];
  
  // Only add if natural count is strictly below 20
  for (const w of emergencyFallbacks) {
    if (combinedKeywords.length >= 20) break;
    addWord(w, combinedKeywords);
  }

  // Strictly enforce maximum 35
  const allKeywords = combinedKeywords.slice(0, 35);

  const finalTier1 = allKeywords.slice(0, Math.min(10, allKeywords.length));
  const finalTier2 = allKeywords.length > 10 ? allKeywords.slice(10, Math.min(25, allKeywords.length)) : [];
  const finalTier3 = allKeywords.length > 25 ? allKeywords.slice(25, 35) : [];
  const formattedString = allKeywords.join(", ");

  return {
    tier1: finalTier1,
    tier2: finalTier2,
    tier3: finalTier3,
    all: allKeywords,
    formattedString,
    tier1Golden: finalTier1,
    tier2Contextual: finalTier2,
    tier3Conceptual: finalTier3,
    allKeywords: formattedString,
  };
}

/**
 * GENERATE ADOBE BRIDGE & IPTC CORE COMPLIANT XMP METADATA XML
 * 
 * When Adobe Bridge inspects any media or when a sidecar .xmp file exists:
 * - IPTC Core > Title: [TITLE]
 * - IPTC Core > Headline: [HEADLINE] (sama dengan title)
 * - IPTC Core > Description: [DESCRIPTION] (sama dengan title)
 * - IPTC Core > Keywords: [KEYWORDS] (20 - 35 kata kunci tersusun piramida SEO)
 */
export function generateAdobeXmpXml(title: string, keywords: string[]): string {
  const cleanTitle = (title || "Modern Motion Background").trim();
  const escapeXml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const escapedTitle = escapeXml(cleanTitle);
  const keywordItems = (keywords && keywords.length > 0 ? keywords : ["motion", "background"])
    .map(kw => `     <rdf:li>${escapeXml(kw.trim())}</rdf:li>`)
    .join("\n");

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 7.0-c000 1.000000, 0000/00/00-00:00:00">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"
    xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/">
   <dc:title>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapedTitle}</rdf:li>
    </rdf:Alt>
   </dc:title>
   <photoshop:Headline>${escapedTitle}</photoshop:Headline>
   <dc:description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${escapedTitle}</rdf:li>
    </rdf:Alt>
   </dc:description>
   <dc:subject>
    <rdf:Bag>
${keywordItems}
    </rdf:Bag>
   </dc:subject>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}


export async function generateAnimationService(
  params: GenerateAnimationParams
): Promise<GenerateAnimationResponse> {
  const {
    mode,
    reference,
    refType,
    svgCode,
    svgMeta,
    patchTracedOcclusion = true,
    brief,
    duration,
    fps,
    optimizeSVG,
    useGenerativeBgPro,
    useSvgVectorOnly,
    useNoHudClean = true,
    bgOverride,
    forceLandscape,
    isSeamlessBackground,
    isPremium3D,
    isIconMode,
    iconStyle,
    isCustomBulkPerLine,
    cleanNoText = true,
  } = params;

  const isLandscape = forceLandscape !== false;
  const targetWidth = params.targetWidth || (isLandscape ? (params.resolution === "2K" ? 2560 : 3840) : (params.resolution === "2K" ? 1440 : 2160));
  const targetHeight = params.targetHeight || (isLandscape ? (params.resolution === "2K" ? 1440 : 2160) : (params.resolution === "2K" ? 2560 : 3840));
  const centerX = Math.round(targetWidth / 2);
  const centerY = Math.round(targetHeight / 2);
  const aspectDesc = isLandscape ? "16:9 Landscape" : "9:16 Vertical";
  const resolutionLabel = targetWidth >= 3840 || targetHeight >= 3840 ? "4K" : "2K";
  const totalFrames = duration * fps;

  const isComplex3D = /three(\.js)?|webgl|mesh|geometry|shader|glsl|simulation|simulasi|physics|fisika|cloth|kain|satin|silk|sutra|fabric|flag|bendera|fluid|fluida|particle|partikel|wave|gelombang|gravity|gravitasi|spring|pendulum|collision|rigid/i.test(brief);

  const configRequirements: string[] = [];

  if (isComplex3D) {
    configRequirements.push(`- PROTOKOL EKSEKUSI TINGKAT TINGGI THREE.JS / WEBGL & SIMULASI FISIKA KOMPLEKS (PENALARAN & PENGKODEAN TINGKAT LANJUT):
      1. PENALARAN MATEMATIKA & FISIKA REALISTIS:
         * Formulasi Dinamika Fisika Akurat: Gunakan superposisi gelombang harmonik kontinu (superposition of sinusoidal waves), persamaan fluida/kain terarah, atau kisi pegas-massa-redaman (mass-spring-damper) dengan integrasi waktu stabil (Verlet / Euler numerical integration) dan rasio redaman (damping factor 0.95 - 0.98) agar simulasi stabil dan tidak meledak (anti-NaN/anti-Infinity).
         * Loop Periodik Mulus Sempurna: Rumus fisika berbasis waktu WAJIB menggunakan kelipatan sudut fase periodik (phase = progress * Math.PI * 2 * n) sehingga frame akhir menyambung 100% mulus dengan frame awal (seamless loop tanpa jump-cut atau patahan).
      2. ARSITEKTUR KODE THREE.JS / WEBGL KOKOH & ULTRA-HALUS:
         * Komponen Remotion TSX me-render canvas dengan inisialisasi Three.js WebGLRenderer ({ canvas: canvasRef.current, antialias: true, alpha: true, preserveDrawingBuffer: true }) dan mengupdate per frame dengan useCurrentFrame().
         * Geometri Berdensitas Tinggi: Gunakan THREE.PlaneGeometry(16, 9, 128, 128) atau BufferGeometry dengan Float32Array position attribute untuk permukaan bergelombang atau kain sutra/bendera yang halus tanpa sudut tajam.
         * Dynamic Normals: Setiap perubahan posisi vertex, panggil:
           geometry.attributes.position.needsUpdate = true;
           geometry.computeVertexNormals();
           if (geometry.attributes.normal) geometry.attributes.normal.needsUpdate = true;
         * Shading & PBR Material: Gunakan THREE.MeshPhysicalMaterial atau THREE.MeshStandardMaterial dengan roughness (0.35 - 0.6), metalness (0.05 - 0.2), clearcoat (0.5), dan MANDATORI side: THREE.DoubleSide agar lipatan kain/permukaan tidak tembus pandang atau terpotong backface culling.
         * Studio Cinematic Lighting 3-Titik: Key Directional Light (intensitas 1.5 - 2.0), Fill Light lembut (0.6 - 0.8), Ambient Light (0.8 - 1.0), dan Rim Light di belakang objek untuk aksen siluet dramatis.
      3. DUAL SINKRONISASI KODE REMOTION TSX & HTML PREVIEW:
         * Standalone previewHtml WAJIB mengimpor CDN Three.js r128, mengikatkan update ke window.draw(progress, frame) dan window.render(progress, frame), serta requestAnimationFrame loop yang aktif bergerak 100% identik dengan kode Remotion.`);
  }

  if (bgOverride === "greenscreen") {
    configRequirements.push(
      "- BACKGROUND GREENSCREEN: Override background color to pure greenscreen (#00ff00) in both the TSX composition background and HTML render preview."
    );
  } else if (bgOverride === "black") {
    configRequirements.push(
      "- BACKGROUND BLACK: Override background color to pure black (#000000) in both the TSX composition background and HTML render preview."
    );
  } else if (bgOverride === "white") {
    configRequirements.push(
      "- BACKGROUND WHITE: Override background color to pure white (#ffffff) in both the TSX composition background and HTML render preview."
    );
  } else if (bgOverride === "alpha") {
    configRequirements.push(
      "- BACKGROUND ALPHA CHANNEL (TRANSPARAN / ZERO BACKGROUND): Override background color to 100% transparent (backgroundColor: 'transparent' / rgba(0,0,0,0) in both the TSX composition AbsoluteFill and HTML render preview). DILARANG KERAS merender background solid, backdrop hitam/putih, gradient penutup latar, atau elemen penutup canvas penuh. Objek visual animasi utama harus mengambang bebas dengan alpha transparan (crisp isolated alpha channel) agar langsung siap digunakan untuk video overlay dan compositing tanpa perlu chroma keying."
    );
  }

  if (isLandscape) {
    configRequirements.push(
      `- CINEMATIC LANDSCAPE LAYOUT (16:9 ${resolutionLabel}, ${targetWidth}x${targetHeight} @ ${fps}fps):
       1. Force design coordinates, scene composition, and visual flow to 16:9 landscape bounds with center locked at (CX = ${centerX}, CY = ${centerY}).
       2. PANTANGAN TERZOOM IN ATAU TERZOOM OUT: Framing objek utama harus pas membingkai layar secara proporsional dengan safe margin 5-8% di sekeliling canvas. Dilarang terpotong di tepi atas/bawah/kiri/kanan (terzoom in) dan dilarang terlalu kecil di tengah kanvas kosong (terzoom out).
       3. Jika menggunakan Three.js/WebGL: camera.aspect WAJIB = ${targetWidth} / ${targetHeight}; camera.updateProjectionMatrix();. Atur camera.position.z dan FOV agar seluruh mesh/objek 3D terlihat pas dalam batas pandang kamera.`
    );
  } else {
    configRequirements.push(
      `- VERTICAL MOBILE LAYOUT (9:16 ${resolutionLabel}, ${targetWidth}x${targetHeight} @ ${fps}fps):
       1. Force design coordinates, framing, focal elements, and visual hierarchy to 9:16 vertical / portrait format (TikTok / Reels / Shorts / Stories) with center locked at (CX = ${centerX}, CY = ${centerY}).
       2. PANTANGAN TERZOOM IN ATAU TERZOOM OUT: Framing objek utama harus pas membingkai format vertikal 9:16 secara proporsional. DILARANG menaruh elemen di luar batas lebar ${targetWidth}px!
       3. PANTANGAN CLIPPING TERTUTUP DI KIRI/KANAN: Karena pada rasio 9:16 FOV horizontal kamera lebih sempit daripada vertikal, posisikan kamera lebih jauh atau sesuaikan skala objek secara proporsional agar sisi samping tidak terpotong (anti-zoom-in)!
       4. Jika menggunakan Three.js/WebGL: camera.aspect WAJIB = ${targetWidth} / ${targetHeight}; camera.updateProjectionMatrix();.`
    );
  }

  configRequirements.push(
    `- PANTANGAN IPTC DI DALAM KODE: DILARANG KERAS menyertakan komentar '// --- IPTC CORE & ADOBE BRIDGE METADATA...' maupun variabel TITLE, HEADLINE, DESCRIPTION, KEYWORDS, IPTC_METADATA, atau calculateMetadata di dalam kode TSX maupun HTML! Metadata komersial hanya boleh dikembalikan melalui JSON field 'suggestedTitle', BUKAN di dalam kode visual.`
  );

  if (isSeamlessBackground) {
    configRequirements.push(`- PREMIUM SEAMLESS BACKGROUND (Zero Margin & Clip Overflow): 
      1. Wajib rancang komponen ini sebagai latar belakang animasi (wallpaper) yang memenuhi layar secara penuh (edge-to-edge / seamless) tanpa celah samping kanan-kiri dan atas-bawah frame.
      2. Zero Margin & Padding: Atur margin dan padding kontainer/wrapper utama murni menjadi 0.
      3. Absolute Canvas Snapping: Gunakan lebar penuh (width: 100% atau ${targetWidth}px) dan tinggi penuh (${targetHeight}px).
      4. Clip Overflow Guard: Wajib tambahkan property CSS 'overflow: hidden' pada seluruh elemen kontainer utama.`);
  }

  if (isPremium3D) {
    configRequirements.push(`- STRUKTUR VISUAL KOMPUTASI 3D & FISIK RENDERING:
      * Proyeksi Perspektif & Fisika Kamera 3D
      * Pencahayaan terarah alami & stabil (PANTANGAN: DILARANG menggunakan efek kilauan melintas / moving specular beam)
      * Z-Depth & Parallax Layering
      * Color Management sRGB murni dengan kontras tinggi.`);
  }

  if (useSvgVectorOnly) {
    configRequirements.push(
      "- Use pure editable SVG vector paths only. Every illustration, object, component, detail, and effect must be constructed entirely from clean SVG path elements."
    );
  }

  // Jika isCustomBulkPerLine = true:
  // Seluruh aturan baku, batasan ketat negatif (NO HUD, NO waves/grid/particles, dll),
  // dan seluruh preset style ditiadakan!
  // Hanya susunan kode dan critical thinking untuk memahami prompt yang dipakai.
  if (!isCustomBulkPerLine) {
    if (useNoHudClean) {
      configRequirements.push(
        `- NO HUD AND CLEAN MANDATE:\n${NO_HUD_CLEAN_STRICT_RULES}`
      );
    }

    if (optimizeSVG) {
      configRequirements.push(
        "- Every SVG path should use the minimum number of control points while preserving smooth curves and clean topology for efficient rendering."
      );
    }

    if (useGenerativeBgPro) {
      configRequirements.push(
        `- BACKGROUND PRO MODE ACTIVE: The user is requesting a highly professional, generative background. Apply high precision float math, smooth vector curvature, organic flow fields, and continuous silk surface shading. ABSOLUTELY NO TRAVELLING LIGHT STREAKS, NO HORIZONTAL LENS FLARES, NO SCANNING LIGHT BEAMS, AND NO FLOATING BOKEH PARTICLES / DISTRACTING CENTER DOTS.`
      );
    }

    if (!isIconMode) {
      const formattedStyle = iconStyle ? iconStyle.replace(/\bIcon\b/gi, "Background") : "Seamless Motion Background";
      configRequirements.push(
        `- MOTION BACKGROUND & ILLUSTRATION BACKGROUND MANDATE (FULL SCREEN EDGE-TO-EDGE ${aspectDesc} ${resolutionLabel} ${targetWidth}x${targetHeight} @ ${fps}FPS):
          1. FULL CANVAS COVERAGE (ZERO MARGINS & NO GAPS):
             - Visual layout MUST be designed specifically for ${aspectDesc} ${resolutionLabel} (${targetWidth}x${targetHeight}) Motion Background or Illustration Background that seamlessly covers 100% of the canvas without any outer margins, gaps, borders, or padding.
             - DO NOT create a small isolated floating card or centered icon box. The graphic paths, motion patterns, and illustration layers MUST stretch and extend dynamically across the entire edge-to-edge frame.
          2. VISUAL STYLE INTEGRATION (${formattedStyle}):
             - Apply the artistic direction, rendering aesthetic, lighting, motion, and line work of "${formattedStyle}" across all background motion elements and graphic illustrations.
          3. CONTINUOUS FLUID LOOPING MOTION (${fps} FPS):
             - All background motion graphic elements, fluid waves, vector shapes, particles, and gradients MUST animate continuously with silky smooth ${fps} FPS precision, looping seamlessly from frame 0 to final frame ${totalFrames}.
          4. ADAPTIVE SHAPE GEOMETRY & HIGH PRECISION RENDERING:
             - Adapt visual geometry, shapes, 3D forms, geometric structures, or fluid curves strictly to match the requested concept or style direction for ${aspectDesc} aspect ratio.
             - Ensure all visual paths, SVG shapes, and motion layers are mathematically precise, clean, elegant, and free of jagged glitch artifacts.
          5. STRICT NO DISTRACTING LIGHT FLARES / NO TRAVELLING LIGHT STREAKS / NO BOKEH CIRCLES MANDATE:
             - The background MUST remain a clean, smooth, unified, elegant surface motion graphics without any noisy light flashes, traveling beams, or distracting central artifacts.`
      );
    }

    if (isIconMode) {
      configRequirements.push(`- AUTO-GENERATE ICON VECTOR MODE MANDATORY REQUIREMENTS:
        1. SINGLE FOCAL ICON HERO MANDATE (FOKUS 1 IKON UTAMA):
           - Hasil WAJIB BERUPA 1 SINGLE FOCAL ICON UTAMA yang menjadi pusat perhatian di tengah canvas.
           - Subjek utama dan objek/elemen ikon WAJIB 100% PERSIS SESUAI KONSEP KLIEN: "${brief}".
        2. CENTERING, GEOMETRI PRESISI & RESPONSIVE PROPORTION:
           - GEOMETRI BENTUK HARUS SEMPURNA: Path SVG vektor presisi tinggi, simetris dan proporsional sempurna.
           - POSISI PRESISE DI TENGAH CANVAS: Subjek Vektor Ikon WAJIB berada TEPAT DI TENGAH CANVAS (centered at X=${centerX}, Y=${centerY} atau width/2, height/2) dengan proporsi seimbang mengisi ~60% dari dimensi frame terkecil (${Math.min(targetWidth, targetHeight)}px).
        3. ANIMASI STANDAR LOTTIEFILES & ${fps}FPS:
           - Gerakan mulus ${fps} FPS dengan easing elastic spring atau harmonic oscillation terikat pada durasi ${duration} detik (${totalFrames} frame).
        4. ZERO CLUTTER / NO HUD OVERLAY:
           - Bersih, profesional, bebas dari overlay diagnostik atau debug.`);
    }
  }

  const isSvgTraceMode = !!svgCode && svgCode.trim().length > 0;

  const basePrompt = `# REMOTION ENGINE ARCHITECT & MASTER 3D VISUAL DIRECTOR: PROTOKOL REKONSTRUKSI TINGGI & GERAKAN SINEMATIK ${resolutionLabel} (${aspectDesc}, ${targetWidth}x${targetHeight} @ ${fps}FPS)

${isSvgTraceMode ? `
================================================================================
💎 PROTOKOL MANDATORI: INJEKSI VEKTOR TRACE SVG ASLI & ANTI-BOLONG (OCCLUSION INFILL) 💎
================================================================================
PENGGUNA MENGUNGGAH BERKAS VEKTOR ASLI (.SVG) HASIL AUTO-TRACE (Contoh: Illustrator Image Trace / Inkscape / Vectorizer).
Informasi Berkas SVG:
- Nama Berkas: ${svgMeta?.fileName || 'vector_traced.svg'}
- ViewBox Asli: ${svgMeta?.viewBox || `0 0 ${targetWidth} ${targetHeight}`}
- Jumlah Elemen Geometri: ${svgMeta?.pathCount || 'Multiple'} paths/elemen.
- Status Patching Anti-Bolong: ${patchTracedOcclusion !== false ? 'AKTIF (WAJIB DITERAPKAN)' : 'NON-AKTIF'}

KODE SUMBER VEKTOR SVG DARI PENGGUNA (AMBIL SELURUH KOORDINAT PATH DARI SINI SECARA LANGSUNG):
\`\`\`xml
${sanitizeSvgForPrompt(svgCode || "")}
\`\`\`

MANDATORI UTAMA PENGAMBILAN & ANIMASI DARI FILE SVG TRACE INI:
1. LANGSUNG EKSTRAK & AMBIL SELURUH PATH ASLI DARI KODE SVG DI ATAS:
   - DILARANG MEMBUAT ULANG ATAU MENEBAK KOORDINAT DARI AWAL!
   - Salin dan gunakan seluruh atribut 'd' dari <path>, kurva Bezier, koordinat polygon, dan nilai warna fill/stroke asli yang ada di kode SVG di atas ke dalam kode Remotion TSX dan HTML preview.
   - Posisikan ke tengah kanvas ${aspectDesc} ${resolutionLabel} (${targetWidth} x ${targetHeight}) dengan titik jangkar di (CX = ${centerX}, CY = ${centerY}). Skalakan seluruh grup secara proporsional agar mengisi kanvas dengan seimbang, simetris, dan megah.
   - Kelompokkan path-path tersebut secara cerdas ke dalam sub-grup hierarkis (siluet dasar, badan utama, emblem, garis kontur, ornamen, detail highlight) agar masing-masing dapat dianimasikan secara berurutan dengan stagger delay.

2. PENANGANAN MASALAH "BOLONG" PADA LATAR BELAKANG HASIL TRACE (TRACE OCCLUSION HEALING & ANTI-BOLONG):
   - LATAR BELAKANG MASALAH DARI PENGGUNA: File hasil trace vektor memotong gambar menjadi kepingan-kepingan berongga (boolean cutout tanpa overlap). Di belakang objek/elemen depan, latarnya KOSONG / BOLONG TEMBUS PANDANG. Saat elemen-elemen dianimasikan, digerakkan, dimiringkan 3D, atau dipisahkan secara kinetik, latar belakang di belakang elemen tersebut akan BOLONG dan merusak tampilan visual!
   - KARENA ITU, ANDA WAJIB MENERAPKAN SISTEM PENAMBAL (OCCLUSION INFILL & UNDERLAY BACKING) SECARA TUNTAS:
     * A. Solid Silhouette Infill Hull (<g id="infill-solid-backing">):
        Sebelum me-render grup-grup path yang dianimasikan, buat lapisan siluet dasar solid di posisi layer paling belakang subjek. Lapisan ini merangkum bentuk keseluruhan objek dengan warna dasar/bayangan pekat yang serasi. Hasilnya: ketika elemen depan terangkat, berotasi, bernapas, atau bergerak bebas, TIDAK AKAN PERNAH ADA LUBANG TRANSPARAN YANG TERLIHAT!
     * B. Duplicate Base Underlay (Alas Penutup Tiap Elemen yang Bergerak):
        Untuk setiap komponen yang bergerak secara independen (misal: aksen kepala, logo tengah, sayap, atau potongan ornamen), render duplikat alas (underlay patch) tepat di bawahnya tanpa lubang cutout, sehingga saat komponen tersebut berotasi/mengambang dalam ruang 3D, area di bawahnya tetap tertutup rapat dan padat.
     * C. Anti-Hairline Seam Overlap:
        Gunakan 'shape-rendering="geometricPrecision"' dan berikan sedikit tumpang-tindih (overlap 0.5px atau stroke 1px dengan warna fill yang sama) pada sambungan antar kepingan puzzle hasil trace agar tidak muncul retakan garis putih saat kamera bergerak dinamis.
     * D. Atmospheric Ambient Backplate:
        Tambahkan pendaran cahaya atmosferik lembut (radial glow / subtle shadow / ambient backdrop) di belakang subjek yang menyatu harmonis dengan warna kanvas, sehingga animasi terasa menyatu utuh, solid, berbobot, dan bernilai jual tinggi.
================================================================================
` : ''}

${reference ? `
================================================================================
🚨 MANDATORI KRITIKAL: REKONSTRUKSI 100% TAKARAN LENGKAP & PANTANGAN VERSI MINIMALIS (30%) 🚨
================================================================================
${refType === 'video' ? `BERKAS VIDEO REFERENSI ASLI TELAH DISERTAKAN DI ATAS (INLINE VIDEO DATA).
PENGGUNA SECARA TEGAS MENGINSTRUKSIKAN:
"Tambahkan juga agar support referensi video, dengan aturan yang sama takaran 100% penuh."
- Pelajari secara mendalam dinamika gerak, alur kurva kinetik, kecepatan/akselerasi, timing per frame, deformasi fisik, interaksi cahaya, dan struktur 3D dari video referensi!
- HUKUM MUTLAK TAKARAN 100% PENUH: Seluruh komponen visual dan alur gerak dari video referensi WAJIB direkonstruksi 100% penuh tanpa pengurangan. DILARANG KERAS membuat versi minimalis atau hanya mengambil 30% dari video referensi!` : `GAMBAR REFERENSI TELAH DISERTAKAN DI ATAS (INLINE IMAGE DATA).
PENGGUNA SECARA TEGAS MENGELUHKAN:
"Dari gambar referensi, tapi gambar yang dihasilkan tidak sama. Mirip mungkin iya, tapi yang dihasilkan itu malah versi minimalisnya, seperti menghilangkan beberapa elemen yang ada di referensi. Misal takaran referensi 100%, hasilnya seperti hanya menganimasikan versi minimalnya atau dalam takaran 30%."`}

HUKUM MUTLAK REKONSTRUKSI ELEMEN (ANTI-MINIMALIS):
- DILARANG KERAS menghasilkan versi minimalis, siluet polos, atau karikatur sederhana dari media referensi!
- TAKARAN REKONSTRUKSI WAJIB 100% PENUH: Jika pada media referensi ada 100 komponen visual/garis/ornamen/gerak, KE-100 ELEMEN TERSEBUT WAJIB HADIR DI DALAM KODE! Menghilangkan elemen atau hanya membuat versi 30% adalah KEGAGALAN FATAL.

ANDA DIWAJIBKAN MEMATUHI 5 PILAR UTAMA BERIKUT SECARA MUTLAK:

--------------------------------------------------------------------------------
PILAR 1: TATA LETAK PRESISI & HIERARKI KARTESIAN TERPUSAT (ANTI-BERANTAKAN / ANTI-SCATTER)
--------------------------------------------------------------------------------
1. Pusat Koordinat Terkunci & Adaptif Sesuai Layout Target (Cartesian Center Lock):
   - Resolusi target yang dipilih pengguna adalah ${aspectDesc} ${resolutionLabel} (${targetWidth} x ${targetHeight} @ ${fps} FPS).
   - Titik tengah kanvas mutlak berada di (CX = ${centerX}, CY = ${centerY}).
   - Seluruh subjek utama dari gambar referensi WAJIB diikat dalam satu kontainer induk terpadu yang dinamis:
     Di TSX Remotion:
     Gunakan 'const { width, height, fps, durationInFrames } = useVideoConfig();'
     dan bungkus subjek dalam kontainer terpusat:
     <g id="main-subject-master" transform={\`translate(\${width / 2}, \${height / 2})\`}>
     (atau <g id="main-subject-master" transform="translate(${centerX}, ${centerY})">)
   - Di Standalone HTML Preview:
     Gunakan canvas/SVG berukuran width="${targetWidth}" height="${targetHeight}" dengan viewBox="0 0 ${targetWidth} ${targetHeight}", dan pusatkan pada (${centerX}, ${centerY}).
   - KOORDINAT RELATIF LOKAL PADA SEMUA SUB-ELEMEN:
     Seluruh organ, bagian tubuh, ornamen, potongan panel, emblem, lambang, mata, aksesoris, highlight, dan garis ukiran WAJIB menggunakan sistem koordinat relatif lokal yang berpusat pada (0, 0)!
   - DILARANG KERAS menyebarkan koordinat absolut di luar batas kanvas ${targetWidth}x${targetHeight}!
   - Semua sub-elemen dari subjek utama harus berada di dalam skala bounding-box yang selaras dan proporsional terhadap satu sama lain.
   - Semua sub-elemen dari subjek utama harus berada di dalam skala bounding-box yang selaras dan proporsional terhadap satu sama lain.
2. Pengelompokan Layer Semantik Terstruktur (Minimal 10-15 Layer Nyata):
   Bungkus setiap komponen visual ke dalam layer yang rapi dengan z-index dan urutan render yang tepat:
   * Layer 1: <g id="layer-canvas-bg"> (Latar belakang atmosfer, radial gradient, vignette)
   * Layer 2: <g id="layer-ambient-dust"> (Partikel latar belakang mengambang)
   * Layer 3: <g id="layer-back-glow-shadow"> (Bayangan volumetrik & pendaran aura belakang)
   * Layer 4: <g id="layer-subject-base-silhouette"> (Siluet dasar objek dengan kurva Bezier kontinu penuh)
   * Layer 5: <g id="layer-subject-facets-panels"> (Panel/bidang struktural utama, segmen anatomi/geometri)
    * Layer 6: <g id="layer-subject-contour-lines"> (Garis kontur internal, sambungan, dan lekukan meso)
    * Layer 7: <g id="layer-subject-micro-details"> (Ukiran mikro, pola tekstur, jahitan, kisi-kisi, dan ornamen detail)
    * Layer 8: <g id="layer-subject-emblems-symbols"> (Emblem, logo, lambang, dan simbol murni TANPA teks/huruf apapun)
    * Layer 9: <g id="layer-subject-bevels-depth"> (Gradasi bevel 3D, ambient occlusion shading, dan kedalaman volumetrik)
    * Layer 10: <g id="layer-subject-rim-highlights"> (Pencahayaan tepi statis alami & highlight permukaan)
    * Layer 11: <g id="layer-foreground-ambient"> (Partikel debu cahaya sinematik halus di depan)

--------------------------------------------------------------------------------
PILAR 2: KESETIAAN VISUAL 100% IDENTIK & ZERO-OMISSION (DEKOMPOSISI 3 TINGKAT)
--------------------------------------------------------------------------------
Untuk memastikan takaran visual 100% dan BUKAN versi minimalis (30%), AI WAJIB merekonstruksi melalui 3 Tingkat Geometri:
1. Tingkat 1 (Makro - Siluet & Badan Utama):
   - Bentuk badan keseluruhan, proporsi, postur, dan skala asli.
2. Tingkat 2 (Meso - Panel, Sambungan, & Potongan Geometri):
   - Jangan biarkan bidang badan menjadi poligon polos! Pecah menjadi panel-panel, pelindung, lipatan, sayap, atau segmen terpisah dengan garis pemisah yang nyata.
3. Tingkat 3 (Mikro - Ornamen, Garis Ukir, Tekstur, Lambang, & Detail Halus):
   - INILAH YANG PALING SERING DIHILANGKAN OLEH AI SEHINGGA TERASA SEPERTI VERSI MINIMALIS 30%!
   - Seluruh ornamen kecil, ukiran garis, motif tribal/geometris, simbol murni, mata/ekspresi, gradasi bevel, dan tekstur WAJIB dikodekan secara eksplisit dalam kode!
   - ${cleanNoText !== false ? `🚨 PANTANGAN MUTLAK SERTAKAN TEKS (UNTUK STOCK FOOTAGE KOMERSIAL):
     JIKA PADA GAMBAR REFERENSI TERDAPAT TEKS, TULISAN, TIPOGRAFI, WATERMARK, JUDUL, NOMOR, ATAU HURUF: DILARANG KERAS MENYERTAKAN TEKS TERSEBUT! Video ini ditujukan untuk stock footage komersial (Adobe Stock, Shutterstock) di mana pembeli membutuhkan rekaman bersih (clean plate) agar mereka bebas menambahkan tipografi sendiri di software editing (Premiere Pro, After Effects, DaVinci). Abaikan dan hilangkan seluruh teks, rekonstruksi hanya bentuk visual subjek, volume 3D, geometri, dan ornamennya secara murni!` : `✨ MODE INCLUDE TEXT & KINETIC TYPOGRAPHY (TEKS DIIZINKAN & DIANIMASIKAN):
     PENGGUNA MENGIZINKAN TEKS REFERENSI DISERTAKAN. Jika pada referensi terdapat teks, judul, tipografi kinetik, animasi teks, atau template footage dengan teks: SERTAKAN DAN ANIMASIKAN TEKS TERSEBUT SECARA LENGKAP & DINAMIS! Pertahankan kata-kata, tata letak, gaya tipografi, dan animasi kinetiknya secara 100% penuh sesuai referensi!`}
   - DILARANG KERAS menyederhanakan gambar referensi menjadi ikon datar atau siluet kartun!
4. Presisi Palet Warna Asli:
   - Ambil sampel warna HEX eksak dari gambar referensi untuk setiap bagian: warna primer, warna sekunder, ambient occlusion shadow, inner shading, soft bevels, dan rim light highlights.
   - Pertahankan skema warna asli gambar referensi secara akurat tanpa mengubah atau menggantinya secara sepihak.

--------------------------------------------------------------------------------
PILAR 3: VEKTOR ULTRA-SMOOTH & ANTI-PIKSELASI KASAR (ANTI-PIXELATION DIRECTIVE)
--------------------------------------------------------------------------------
1. Kurva Bezier Kontinu Mulus (Anti-Jagged & Anti-Coarse):
   - DILARANG KERAS menggunakan garis patah-patah bersudut tajam (low-poly jagged straight lines), kotak-kotak diskrit (pixel grid / mosaic loops / fillRect tile loops), atau filter noise kasar (<feTurbulence>, <feDisplacementMap>).
   - Seluruh garis lengkung WAJIB dibangun dari kurva kubik Bezier matematika kontinu yang sangat halus (perintah 'C' dan 'S' pada SVG path, atau 'ctx.bezierCurveTo()' pada Canvas).
2. Presisi Rendering Antialiasing 4K:
   - Pada SVG: WAJIB menyertakan atribut shape-rendering="geometricPrecision" dan text-rendering="geometricPrecision" pada tag <svg>.
   - Pada Canvas 2D: WAJIB mengatur canvas.width = 3840; canvas.height = 2160; serta mengaktifkan ctx.imageSmoothingEnabled = true; dan ctx.imageSmoothingQuality = 'high';.
   - DILARANG menggunakan pembulatan integer diskrit (seperti Math.round atau Math.floor) pada koordinat path vektor kurva; gunakan angka desimal floating-point kontinu murni.
3. Gradasi Multi-Stop Tanpa Banding:
   - Setiap elemen shading volumetrik harus menggunakan minimal 3-5 color stops pada <linearGradient> atau <radialGradient> dengan nilai opacity alpha bertingkat halus untuk mencegah garis patahan warna (color banding).

--------------------------------------------------------------------------------
PILAR 4: STANDAR STOCK FOOTAGE KOMERSIAL, THREE.JS BERVOLUME & KONTEKS GERAK SEAMLESS
--------------------------------------------------------------------------------
PENGGUNA SECARA TEGAS MENGINSTRUKSIKAN 4 MANDATORI UTAMA:
1. "JIKA GAMBAR YANG BERVOLUME, MAKA GUNAKAN THREE.JS FIBER WEBGL"
2. "TIDAK SEMUA HARUS FADE IN FADE OUT. PAHAMI LAGI KONTEKSNYA"
3. "TUJUANNYA UNTUK STOCK FOOTAGE (COMERCIAL USE)"
4. ${cleanNoText !== false ? '"JIKA GAMBAR ADA TEXT, JANGAN SERTAKAN TEXT TERSEBUT."' : '"JIKA REFERENSI ADA TEXT, SERTAKAN DAN ANIMASIKAN TEKS TERSEBUT (KINETIC TYPOGRAPHY / ANIMATED TEXT)."'}

HUKUM MUTLAK 1: MANDATORI REKONSTRUKSI VOLUME 3D SETIA PADA SUBJEK ASLI (ANTI-MENGARANG SENDIRI)
- 🚨 PANTANGAN FATAL MENGARANG BENTUK 3D GENERIK LAIN:
  DILARANG KERAS MENGGANTI SUBJEK REFERENSI DENGAN BENTUK 3D GENERIK (seperti tiba-tiba membuat TorusKnot donat, bola polos melayang, atau kubus sembarangan padahal gambar aslinya bukan donat/bola)!
  Jika gambar referensi adalah kamera, mobil, cangkir kopi, trofi, laptop isometrik, tangan, mahkota, hewan, gedung, atau lambang/ikon 3D:
  SUBJEK YANG DIHASILKAN WAJIB 100% TETAP MERUPAKAN SUBJEK TERSEBUT DENGAN ANATOMI, BENTUK, DAN PROPORSI ASLINYA!
- STRATEGI EKSEKUSI VOLUME 3D:
  1. METODE THREE.JS COMPOUND MESH & EXTRUDE (Bentuk Geometris Terstruktur):
     Jika subjek 3D dimodelkan dengan Three.js / WebGL:
     - DILARANG hanya melempar 1 geometri primitif acak (seperti TorusKnotGeometry)!
     - Rancang SUB-BAGIAN anatomi subjek dengan Compound Mesh di dalam THREE.Group (contoh jika kamera: BoxGeometry bodi + CylinderGeometry lensa + Cylinder tombol; jika trofi: Silinder alas + Torus separuh gagang + Kerucut/Piala cawan).
     - ATAU gunakan THREE.Shape() + THREE.ExtrudeGeometry({ depth, bevelEnabled: true, bevelThickness, bevelSegments }) untuk mengekstrusi siluet kontur asli dari gambar referensi ke dalam ruang 3D nyata!
     - Terapkan material PBR sinematik (MeshStandardMaterial / MeshPhysicalMaterial dengan roughness, metalness, clearcoat), Three-Point Lighting (Key, Fill, Rim Light), dan rotasi/orbit kamera 3D halus.
  2. METODE VOLUMETRIC LAYERED BEZIER & 2.5D SHADING (Ilustrasi 3D, Claymorphism & Bentuk Organik Rumit):
     - Jika gambar referensi memiliki lekukan kurva yang sangat kaya, karakter, ornamen mikro rumit, atau style claymorphism/ilustrasi 3D yang akan rusak jika dipaksakan menjadi balok Three.js kasar:
     - BANGUN DENGAN HIGH-FIDELITY LAYERED VOLUMETRIC BEZIER PATHS + MULTI-STOP GRADIENT SHADING PBR + AMBIENT OCCLUSION + RIM SPECULAR LIGHTING + CSS 3D MATRIX TRANSFORMS (perspective: 1000px, rotateX/Y/Z) ATAU CANVAS 2D/3D!
     - Dengan metode ini, 100% kontur asli gambar referensi TERCERMIN DENGAN AKURAT DAN IDENTIK, tetap memiliki kedalaman volume 3D yang tebal, dan AI TIDAK AKAN MENGARANG BENTUK SENDIRI!

HUKUM MUTLAK 2: PAHAMI KONTEKS GERAK - TIDAK SEMUA HARUS FADE IN FADE OUT (PRIORITAS SEAMLESS INFINITE LOOP)
- JANGAN MEMBUAT FADE TO BLACK DI AWAL ATAU DI AKHIR jika subjek berupa stock footage background, objek 3D bervolume, fluida/partikel, ambient motion, atau pergerakan berkelanjutan!
- Pembeli stock footage komersial (Adobe Stock, Shutterstock, Pond5) membutuhkan video SEAMLESS INFINITE LOOP yang dapat di-loop berulang-ulang di timeline video editor tanpa jeda dan tanpa redup ke hitam!
- Seluruh formula gerak diikat pada periode trigonometri 2*PI harmonik penuh: Math.sin(frame / totalFrames * Math.PI * 2 * n) atau rotasi sudut kontinu frame * 2 * Math.PI / totalFrames, sehingga frame 0 dan frame akhir menyatu 100% mulus (100% Seamless Looping).
- Hanya gunakan Fade In / Fade Out jika konteks spesifik memang menuntut intro/reveal atau exit (misalnya logo reveal / title card stinger). Untuk konten footage berkelanjutan: pertahankan objek tetap terlihat jelas dan looping tanpa henti!

HUKUM MUTLAK 3: STANDAR TINGGI STOCK FOOTAGE KOMERSIAL (COMMERCIAL BROADCAST QUALITY)
- Standar kualitas visual kelas dunia (Adobe Stock, Shutterstock, Envato).
- Bebas dari watermark, teks pengganggu, atau HUD frame.
- Komposisi seimbang, pencahayaan sinematik dengan rasio kontras prima, kedalaman volumetrik nyata, dan pergerakan 60 FPS deterministik.

HUKUM MUTLAK 4: PANTANGAN SERTAKAN TEKS (CLEAN PLATE UNTUK EDITING)
- Jika gambar referensi mengandung teks, font, tipografi, watermark, nomor, atau logo bertuliskan huruf: HILANGKAN SELURUH TEKS TERSEBUT!
- Hanya rekonstruksi bentuk visual subjek, ikon murni, volume 3D, dan background.

--------------------------------------------------------------------------------
PILAR 5: STANDAR KUALITAS KODE SEMPURNA TANPA SYNTAX ERROR (STANDAR BULK PROMPT & ZERO DEFECT)
--------------------------------------------------------------------------------
🚨 HUKUM MUTLAK KEBERHASILAN RENDER (SETARA BULK PROMPT PER BARIS & INSTRUKSI TAMBAHAN):
PENGGUNA SECARA TEGAS MENGINSTRUKSIKAN:
"bro. beritahu ai agar membuat codenya sempurna tanpa ada syntax error saat mengenerate dari Bulk Image Reference. code harus sempurna seperti ketika menggenerate dari Bulk Prompt Per Baris atau Instruksi Tambahan (Prompts). intinya jangan ada syntax error ketika di render."

AI WAJIB MENJAMIN 100% BAHWA KODE YANG DIHASILKAN DAPAT LANGSUNG DI-COMPILE OLEH TYPESCRIPT / ESBUILD DAN DI-RENDER DI REMOTION MAUPUN IFRAME PREVIEW TANPA SATU PUN SYNTAX ERROR / PARSE ERROR:

1. STRUKTUR ELEGAN, PROSEDURAL & ANTI-TRUNCATION:
   - DILARANG menulis ribuan baris koordinat acak yang rawan terpotong (truncated) di tengah jalan atau memicu typo parser!
   - Gunakan pendekatan arsitektur kode modern yang modular dan tangguh: kalkulasi matematika parametrik (sinusoidal wave, harmonic loops, Bezier procedural math), Three.js PBR mesh dinamis, Canvas 2D/3D render loop, atau sub-komponen terstruktur yang merekonstruksi gambar referensi secara 100% lengkap, kaya detail, dan solid.
   - Kode TSX Remotion ("code") dan HTML Preview ("previewHtml") WAJIB LENGKAP tuntas dari baris import pertama sampai tag penutup dan export default terakhir. DILARANG KERAS memotong kode atau menyisakan baris menggantung.

2. ATURAN SINTAKS KETAT & BEBAS CACAT 100% (ZERO PARSE ERROR):
   - SEMUA tag leaf SVG (circle, path, line, rect, ellipse, polygon, polyline, stop, use, image, fe*) WAJIB DITUTUP SELF-CLOSING '/>' secara presisi.
   - SEMUA kontainer JSX (<AbsoluteFill>, <svg>, <g>, <defs>, <div>, <ThreeCanvas>) WAJIB DITUTUP BERPASANGAN EKSPLISIT (</g>, </defs>, </svg>, </AbsoluteFill>).
    - DILARANG KERAS MENULIS KOMENTAR APAPUN DI DALAM BLOK return ( ... )! Baik // komentar, /* komentar */, maupun {/* komentar */} di dalam tag. Blok return (...) harus murni elemen JSX valid tanpa komentar sama sekali.
   - DILARANG MENARUK KOMENTAR '//' DI AKHIR BARIS ATRIBUT JSX (contoh fatal: '<path fill="#fff" // sayap' adalah SYNTAX ERROR FATAL di TSX!).
   - ATRIBUT STYLE JSX WAJIB MEMAKAI KURUNG KURAWAL GANDA LENGKAP: style={{ width: '100%', height: '100%', display: 'block' }}. DILARANG KERAS MENULIS 'style=' TANPA KURUNG KURAWAL GANDA (seperti 'style=\n width: 100% }}' yang memicu syntax error fatal '{ or JSX element expected')!
   - DILARANG menaruh kurung kurawal '{' yang berdiri sendiri atau tanpa nama properti di dalam tag elemen JSX (contoh fatal: '<path {' atau '<circle {r}').
   - DILARANG KERAS menulis placeholder titik tiga ('...' atau '{...}') di dalam array, objek, maupun tag elemen.
   - DILARANG menulis karakter '>' atau '<' telanjang di teks JSX atau SVG <text> (selalu gunakan &gt; atau &lt;).
    - DILARANG generic arrow function ambigu seperti const fn = <T>(x: T) =>. Gunakan function fn<T>(x: T) atau <T,>(x: T) =>.
   - HANYA IMPOR REMOTION VALID: import React from 'react'; import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion'; (dan Three.js jika 3D).
   - BLOK KONSTANTA KONFIGURASI MANDATORI (TEPAT SATU KALI):
     // --- CONFIGURATION CONSTANTS ---
     export const DURATION = ${totalFrames};
     export const FPS = ${fps};
     export const WIDTH = ${targetWidth};
     export const HEIGHT = ${targetHeight};
   - ROOT COMPONENT: export const MainComposition: React.FC = () => { ... }; export default MainComposition;
   - PREVIEW HTML JAVASCRIPT HARUS 100% BERSIH: Seluruh deklarasi fungsi, loop render, dan objek canvas/Three.js harus valid ES6 tanpa variabel undefined atau error runtime.
================================================================================
` : `
================================================================================
🚨 MANDATORI ANALISIS KONTEKS VISUAL & ORKESTRASI ANIMASI TOTALITAS (ZERO SYNTAX ERROR) 🚨
================================================================================
1. PUSAT TATA LETAK KARTESIAN: Pusatkan seluruh komposisi pada titik tengah (${centerX}, ${centerY}) dengan koordinat anak relatif (0, 0) yang teratur, simetris, dan rapi.
2. STANDAR STOCK FOOTAGE KOMERSIAL: Jika objek bervolume/3D gunakan Three.js WebGL PBR, hilangkan semua teks dari referensi (clean plate), dan utamakan seamless infinite loop tanpa fade to black paksa.
3. KODE SEMPURNA BEBAS SYNTAX ERROR: Kode TSX Remotion ("code") dan HTML preview ("previewHtml") WAJIB 100% valid secara sintaksis, tanpa komentar di dalam return (...), seluruh kurung dan tag JSX tertutup rapi, dan langsung siap dirender mulus tanpa error.
================================================================================
`}

# CORE DIRECTIVES (120 ATURAN MUTLAK PEMBUATAN KODE REMOTION)

### I. Determinisme Frame & Arsitektur Remotion (Aturan 1–15)
1. DILARANG menggunakan \`Date.now()\`, \`Math.random()\`, atau fungsi non-deterministik saat runtime. Setiap keacakan harus dipra-kalkulasi menggunakan seed deterministik berdasarkan nomor frame (\`Math.sin(seed + frame)\`).
2. DILARANG menggunakan animasi CSS konvensional (\`@keyframes\`, \`transition\`, atau \`animation\`). SEMUA pergerakan visual harus dihitung strictly dari \`useCurrentFrame()\`.
3. DILARANG menggunakan \`setTimeout\`, \`setInterval\`, atau hook berbasis waktu nyata seperti \`requestAnimationFrame\`.
4. Selalu ekstrak \`frame = useCurrentFrame()\` dan \`{ fps, width, height, durationInFrames } = useVideoConfig()\` di tingkat paling atas komponen root/scene.
5. Gunakan \`<AbsoluteFill>\` sebagai pembungkus container utama untuk memastikan konsistensi layout absolute di seluruh layer visual.
6. Hindari penggunaan margin negatif untuk pergeseran layout; gunakan manipulasi \`transform: translate3d(...)\` yang diikat langsung ke perhitungan frame.
7. Seluruh komponen harus berupa Functional Components dengan pengetikan TypeScript yang ketat (\`React.FC<Props>\`).
8. Setiap props scene wajib didefinisikan menggunakan interface TypeScript eksplisit dan divalidasi (jika diperlukan) menggunakan schema Zod.
9. Gunakan \`<Sequence>\` dengan prop \`from\` dan \`durationInFrames\` yang presisi untuk memecah scene menjadi komposisi modular.
10. Jangan pernah membiarkan scene mengalami tumpang tindih visual (z-fighting) tanpa manajemen eksplisit \`zIndex\`.
11. Komponen harus self-contained; impor komponen modular secara bersih dan jangan biarkan state global merusak rendering terisolasi.
12. Nilai interpolasi harus selalu menyediakan penanganan \`extrapolateLeft: 'clamp'\` dan \`extrapolateRight: 'clamp'\` kecuali secara eksplisit membuat gerakan berulang/looping.
13. Gunakan looping modulo berbasis frame murni: \`const cycleFrame = frame % periodInFrames;\` untuk efek rotasi atau denyut konstan.
14. Semua aset eksternal (gambar, audio, model 3D) wajib dibungkus menggunakan \`staticFile()\` dari Remotion.
15. Tangani pre-mounting aset menggunakan \`<DelayRender>\` dan \`continueRender\` jika memuat aset eksternal dinamis.

### II. Matematika Gerak, Easing, & Fisika Spring (Aturan 16–30)
16. Animasi transisi masuk/keluar WAJIB menggunakan fungsi \`spring()\` dari Remotion, bukan sekadar \`interpolate\` linier.
17. Konfigurasi \`spring()\` standar untuk motion modern: \`{ damping: 12, mass: 0.5, stiffness: 100 }\` (UI Snappy).
18. Konfigurasi \`spring()\` untuk elemen berat/sinematik: \`{ damping: 20, mass: 2.5, stiffness: 80 }\`.
19. Konfigurasi \`spring()\` untuk gaya playful/bouncy: \`{ damping: 8, mass: 0.3, stiffness: 150 }\`.
20. Jika menggunakan fungsi \`interpolate()\`, selalu berikan easing eksplisit menggunakan \`Easing.bezier()\`, \`Easing.out(Easing.cubic)\`, atau \`Easing.inOut(Easing.quad)\`.
21. Terapkan prinsip animasi "Anticipation": beri nilai negatif kecil atau skala menyusut sesaat (2-5 frame) sebelum objek melesat maju.
22. Terapkan prinsip animasi "Overshoot": pastikan elemen melampaui batas target sekitar 2-5% sebelum diam pada nilai akhir.
23. Terapkan prinsip "Follow Through & Overlapping Action": animasikan bagian anak (child elements) dengan offset frame (stagger) sebesar 2 hingga 6 frame di belakang elemen induk.
24. Terapkan prinsip "Squash and Stretch": sesuaikan sumbu scale secara terbalik \`scaleX = 1 + delta; scaleY = 1 - delta;\` saat terjadi akselerasi/tumbukan tinggi.
25. Hitung kecepatan instan (\`velocity\`) berdasarkan delta perubahan frame untuk menerapkan motion blur dinamis berbasis CSS atau Canvas.
26. Jangan pernah menginterpolasi warna secara mentah; gunakan fungsi interpolasi warna yang benar atau kalkulasi nilai RGB/HSL individual.
27. Hindari pergerakan linear murni (linear velocity) kecuali untuk simulasi pergerakan pita teks running-text atau kamera slider konstan.
28. Gunakan interpolasi multi-langkah (array input/output multi-titik) untuk lintasan animasi non-linear yang kompleks.
29. Hitung jarak (distance) dan waktu tempuh frame secara proporsional agar kecepatan visual elemen yang menempuh jarak berbeda terasa seragam.
30. Sinkronisasikan kurva easing kamera dan objek; jika kamera melambat, objek tidak boleh berhenti secara mendadak.

### III. Layout, Responsivitas, & Kedalaman Visual 2.5D (Aturan 31–45)
31. Gunakan persentase (\`%\`), \`vw/vh\`, atau kalkulasi dinamis berdasarkan \`width\` dan \`height\` dari \`useVideoConfig()\`, BUKAN nilai pixel tetap (\`px\`) yang membatasi resolusi (kecuali untuk ketebalan border atau blur radius).
32. Skala komposisi harus responsif terhadap variasi aspek rasio: 16:9 (1920x1080/3840x2160), 9:16 (1080x1920), dan 1:1 (1080x1080).
33. Selalu posisikan anchor point (\`transformOrigin\`) secara sadar: \`'center center'\`, \`'bottom center'\`, dll., tergantung konteks pergerakan.
34. Manfaatkan CSS 3D Transforms dengan mengaktifkan \`perspective: 1000px\` dan \`transformStyle: 'preserve-3d'\` pada container induk.
35. Buat kedalaman paralaks bertingkat dengan memisahkan scene menjadi minimal 3 bidang: Background (depth 0.2), Midground (depth 1.0), Foreground (depth 1.8).
36. Terapkan efek kedalaman ruang (Depth of Field faux) dengan memberikan \`filter: blur(...)\` yang proporsional pada layer foreground ekstrim dan background jauh.
37. Gunakan layering warna bayangan realistis (multi-layered drop shadows): jangan gunakan satu bayangan hitam pekat, melainkan 3-4 lapisan bayangan halus dengan opacity rendah dan blur bertingkat.
38. Elemen Glassmorphism wajib mengkombinasikan \`backdropFilter: 'blur(Xpx)'\`, border semi-transparan \`rgba(255,255,255,0.2)\`, dan gradasi pencahayaan statis elegan (PANTANGAN: DILARANG menggunakan efek kilauan melintas).
39. Gunakan sistem grid presisi (CSS Grid/Flexbox) di dalam \`<AbsoluteFill>\` untuk menghindari drifting posisi elemen antar-render.
40. Komposisi visual harus mematuhi aturan visual hierarchy: Rule of Thirds atau Golden Ratio focal points.
41. Hindari penumpukan elemen di area Safe Zone (margin minimum 5% dari tepi layar untuk mencegah cropping pada pemutar video).
42. Jika teks harus responsif terhadap panjang kata, bungkus dalam layout kalkulator dinamis atau batasi dengan \`clamp()\` CSS.
43. Gunakan masking visual via CSS \`clipPath\` (\`polygon()\`, \`path()\`, \`circle()\`) yang diikat ke kalkulasi frame untuk transisi geometric shape modern.
44. Rotasi 3D harus diuraikan menjadi komponen: \`rotateX\`, \`rotateY\`, \`rotateZ\` terpisah menggunakan interpolasi sudut (\`\${val}deg\`).
45. Pastikan semua elemen transparan yang keluar dari viewport sepenuhnya di-unmount atau diberi \`display: 'none'\` / \`opacity: 0\` untuk optimasi rasterizer browser.

### IV. Styling & Motion Graphics 2D (Flat, Vector, Kinetic) (Aturan 46–60)
46. Visual 2D harus memiliki palet warna harmonis (maksimal 3-5 warna utama per scene: Primer, Sekunder, Aksen, Background, Text).
47. Kinetic Typography wajib memecah string teks menjadi huruf (characters) atau kata (words) individual menggunakan \`.split('')\` dan menganimasikannya dengan efek stagger (\`delay = index * factor\`).
48. Huruf kinetic typography tidak boleh hanya muncul; mereka harus menggabungkan minimal 3 properti sekaligus: \`opacity\`, \`translateY\`, dan \`scale\` atau \`rotate\`.
49. SVG Path Animation wajib memanfaatkan manipulasi \`strokeDasharray\` dan \`strokeDashoffset\` yang dihitung dari total panjang path untuk efek menggambar sendiri (line-drawing).
50. Tambahkan partikel latar belakang 2D dinamis (floating geometric orbs, subtle grid lines, noise textures) untuk menghindari visual "mati".
51. Terapkan efek glitch deterministik dengan menggeser slice \`clipPath\` dan channel warna RGB menggunakan fungsi sinusoidal berbasis frame.
52. Ilustrasi berbasis vektor harus menggunakan SVG inline murni di dalam React untuk memungkinkan manipulasi warna fill, stroke, dan deformasi titik path secara dinamis.
53. Gunakan blend mode modern (\`mixBlendMode: 'difference'\`, \`'screen'\`, \`'overlay'\`) untuk menghasilkan kontras grafis tingkat tinggi.
54. Transisi antar slide grafis 2D harus memanfaatkan "Whip Pan" (pergerakan kamera super cepat yang dipadukan dengan scale-down dan horizontal blur).
55. Kinetic text highlight: Berikan efek teks distabilkan/distabilo menggunakan layer persegi di belakang teks yang melebarkan \`width\` dari 0% ke 100%.
56. Kartu informasi/UI Card masuk ke frame harus memiliki rotasi dinamis kecil (misal -3deg ke 0deg) untuk memberi kesan organik, bukan kaku.
57. Bar grafik atau visualisasi data harus dianimasikan dari nilai 0 ke target dengan kurva easing non-linear yang melambat mulus di akhir (ease-out-expo).
58. Warna gradien harus bergerak (animasi \`backgroundPosition\` atau sudut gradien linier) untuk memberikan kesan futuristik dinamis.
59. Ikon UI wajib memiliki mikro-animasi internal (seperti ikon checklist yang menggambar jalurnya sendiri, atau gear yang berputar proporsional).
60. Elemen penunjuk (cursor/pointer/arrow) harus memiliki fisika ayunan (damping tinggi) saat bergerak dari satu titik ke titik lain.

### V. Integrasi 3D & Estetika Unreal Engine/Three.js (Aturan 61–85)
61. Gunakan \`@remotion/three\` dan \`@react-three/fiber\` untuk rendering 3D performa tinggi di dalam loop Remotion.
62. Komponen kanvas 3D (\`<ThreeCanvas>\`) harus disinkronkan secara ketat dengan ukuran frame Remotion: \`<ThreeCanvas width={width} height={height}>\`.
63. DILARANG menggunakan loop animasi internal Three.js seperti \`useFrame()\` bawaan R3F untuk pergerakan utama jika tidak terikat dengan frame Remotion. Selalu gunakan \`useCurrentFrame()\` untuk mengontrol properti 3D.
64. Semua kalkulasi rotasi 3D harus menggunakan Radian (\`degrees * (Math.PI / 180)\`).
65. Gunakan Perspective Camera dengan Field of View (FOV) sinematik (antara 24mm fov ~45° hingga 50mm fov ~28°) untuk menghindari distorsi fisheye yang murah.
66. Pergerakan kamera 3D harus meniru Rig Sinematik: Dolly, Orbit, Crane, atau Pan, menggabungkan interpolasi \`camera.position\` dan \`camera.lookAt()\`.
67. Simulasikan Physical Based Rendering (PBR) tingkat Unreal Engine: Gunakan \`<meshStandardMaterial>\` atau \`<meshPhysicalMaterial>\` dengan kontrol ketat pada \`roughness\`, \`metalness\`, \`clearcoat\`, dan \`transmission\`.
68. Pencahayaan (Lighting) WAJIB menggunakan setup Three-Point Lighting Sinematik: Key Light (terang, hangat), Fill Light (lembut, dingin, ratio 1:3), dan Rim/Back Light (kuat, kontras, memberi pemisahan siluet dari background).
69. Tambahkan Directional Light dengan shadow casting yang memiliki resolusi shadow map tinggi (\`shadow-mapSize-width={2048}\`, \`shadow-mapSize-height={2048}\`).
70. Untuk simulasi fotorealistik interior/otomotif: setel \`roughness\` material rendah (0.1 - 0.2) dengan \`metalness\` tinggi (0.8 - 0.9) dan terapkan peta environment reflection yang kaya.
71. Tambahkan pencahayaan volumetrik (god rays) menggunakan material shader kerucut semi-transparan atau simulasi mesh kabut (\`fog\` atau \`fogExp2\`).
72. Simulasikan Unreal Engine Lumen/Global Illumination dengan menempatkan beberapa point-light pantulan kecil (bounce lights) dengan intensitas rendah di sekitar bidang objek utama.
73. Animasikan intensitas cahaya (\`light.intensity\`) secara subtle (variasi 1-3%) menggunakan fungsi sinus untuk meniru flicker realistis atau fluktuasi energi.
74. Terapkan depth-of-field realistis: fokuskan target kamera ke objek utama, dan berikan blur intensif pada objek 3D di dekat lensa (foreground framing).
75. Tambahkan sistem partikel 3D (sparks, floating dust motes, digital embers) menggunakan \`<points>\` dan \`<bufferGeometry>\` dengan ribuan titik deterministik yang mengapung lambat.
76. Jika merender model geometri prosedural, gunakan buffer attributes terindeks untuk memastikan rendering 60fps yang ringan tanpa stutter memori.
77. Material Emissive: Elemen sci-fi/neon harus menggunakan \`emissive\` dengan warna jenuh dan \`emissiveIntensity > 2\` untuk efek glow paska-render.
78. Rotasi objek 3D tidak boleh berputar pada satu sumbu saja; gabungkan perputaran lambat pada sumbu Y (\`frame * 0.01\`) dengan goyangan lembut pada sumbu X dan Z.
79. Gunakan Camera Shake deterministik untuk adegan aksi/tumbukan tinggi: variasikan posisi kamera menggunakan derau sinusoidal acak selama 5-10 frame paska-tumbukan.
80. Posisikan kamera mendekati ground plane untuk sudut pandang dramatis (Low Angle Hero Shot) guna memberikan kesan megah pada objek atau teks 3D.
81. Gunakan deformasi geometri vertex shader jika membuat efek gelombang air, medan bergelombang, atau transisi hologram digital.
82. Simulasikan Ambient Occlusion (AO) dengan menggunakan contact shadows di bawah objek 3D menggunakan plane transparan dengan tekstur gradient alpha radial.
83. Render latar belakang 3D menggunakan gradient skydome atau kubus ruang mendalam yang selaras dengan warna rim light subjek utama.
84. Hindari aset low-poly untuk shot close-up: pastikan segmen geometri melingkar (\`sphereGeometry\`, \`cylinderGeometry\`) memiliki minimal 64 radial segments.
85. Sinkronkan pergerakan subjek 3D dengan zoom kamera dinamis (Vertigo Effect / Dolly Zoom) dengan menggeser kamera mundur sambil memperbesar FOV secara simultan.

### VI. Post-Processing Sinematik & Shaders (Aturan 86–100)
86. Tambahkan lapisan Post-Processing Vignette di atas seluruh scene: radial gradient dari transparan di tengah ke hitam pekat di sudut layar dengan opacity 0.3 - 0.6.
87. Tambahkan lapisan Film Grain sintetis deterministik menggunakan SVG filter \`<feTurbulence>\` dengan blend-mode overlay (opacity 0.05 - 0.12) untuk menghilangkan kesan visual "steril" digital.
88. Simulasikan Chromatic Aberration pada momen gerakan berkecepatan tinggi dengan menggeser layer duplikat channel Merah (Red) dan Biru (Blue) sejauh 2-8 pixel.
89. Terapkan Color Grading Sinematik: Lakukan adjustment level menggunakan CSS filters global: \`contrast(1.08) saturate(1.15) brightness(0.98)\`.
90. Terapkan palet warna sinematik Hollywood: Orange & Teal contrast, Cyberpunk Neon (Cyan/Magenta), atau Deep Luxury Minimalist (Gold/Champagne/Matte Black).
91. Buat efek Optical Lens Flare buatan yang muncul saat sumber cahaya utama bergerak mendekati atau melintasi sudut pandang kamera.
92. Terapkan efek Anamorphic Streak (garis pendar cahaya horizontal cyan/biru) pada titik sorotan paling terang di scene.
93. Gunakan Screen Shake directional (hanya pada sumbu tumbukan horizontal/vertikal) untuk menekankan hentakan beat audio atau perubahan teks besar.
94. Berikan efek Scanlines halus (\`repeating-linear-gradient\`) transparan untuk tema antarmuka visual sci-fi/HUD.
95. Terapkan Tone Mapping buatan dengan mengompres rentang highlight ekstrim menggunakan blend mode agar elemen putih tidak pecah (clipping).
96. Simulasikan Light Leaks hangat yang masuk dari sudut atas layar selama 15-30 frame pertama sebagai transisi scene yang elegan.
97. Berikan efek Edge Glow (Bloom) pada elemen visual dengan intensitas tinggi menggunakan filter \`drop-shadow\` berlapis atau shader pass WebGL.
98. Simulasikan efek lensa kamera kotor (Dirt on Lens) yang terlihat hanya ketika tersorot langsung oleh cahaya intensitas tinggi.
99. Tambahkan Letterboxing sinematik (aspek rasio 2.39:1 Anamorphic bars hitam di atas dan bawah) jika prompt meminta gaya sinematik layar lebar.
100. Pastikan efek post-processing tidak menutupi keterbacaan teks informasi esensial (teks harus tetap kontras tajam di atas noise/bloom).

### VII. Tipografi, Timing & Audio Orchestration (Aturan 101–112)
101. Muat font kustom menggunakan \`@remotion/google-fonts\` untuk memastikan jenis huruf termuat sepenuhnya secara deterministik sebelum frame pertama dirender.
102. Teks judul utama (Headings) WAJIB menggunakan font berbobot tebal (Black/Extra Bold, font-weight: 800/900) untuk dampak visual instan.
103. Batasi kalimat dalam satu tampilan kinetic text: maksimal 3–7 kata per frame/beat visual agar penonton sempat memproses informasi.
104. Sinkronisasikan setiap perpindahan visual kunci (cut, slam, scale-up) persis pada frame ketukan ritme audio (misal: setiap 15 frame untuk tempo 120 BPM pada 30 FPS).
105. Integrasikan aset audio menggunakan \`<Audio>\` dari Remotion dengan kontrol properti \`volume\` dinamis untuk fade-in dan fade-out.
106. Volume audio transisi/SFX (Swoosh, Hit, Impact, Glitch) harus memiliki puncak eksponensial tepat pada frame kontak visual terjadi.
107. Jangan biarkan layar kosong tanpa informasi visual selama lebih dari 10 frame berurutan.
108. Terapkan prinsip "Spatial Memory": jika elemen grafis keluar ke arah kanan layar, transisi elemen pengganti sebaiknya masuk dari arah yang konsisten secara spasial.
109. Gunakan Kerning (letter-spacing) dinamis: renggangkan teks secara elegan (\`letterSpacing: '0.2em' -> '0.05em'\`) bersamaan dengan scale-up lambat.
110. Subtitle atau Captions modern harus menerapkan "Word-by-word Highlight Color": seluruh kalimat terlihat transparan, dan kata yang sedang diucapkan berubah warna menjadi terang menyala (misal: Neon Yellow).
111. Setiap akhir video (Outro) harus memiliki transisi penutup yang terkontrol (fade out to black atau zoom-in out of view) minimal 15 frame sebelum video selesai total.
112. Atur durasi baca teks berdasarkan rumus: minimal 1 frame per karakter teks + 15 frame buffer waktu respons mata manusia.

### VIII. Standar Kerapian Kode, Eksekusi TypeScript, & Anti-Crash (Aturan 113–120)
113. SELURUH kode yang dihasilkan WAJIB disatukan dalam satu file \`.tsx\` yang lengkap atau komponen terdefinisi secara utuh tanpa ada potongan \`// TODO: Implement later\` atau placeholder yang belum selesai.
114. Semua impor eksternal harus akurat terhadap ekosistem Remotion: \`remotion\`, \`@remotion/three\`, \`@react-three/fiber\`, \`three\`, \`@remotion/google-fonts\`, \`lucide-react\`, dll.
115. BLOK KONSTANTA KONFIGURASI MANDATORI (WAJIB TEPAT SATU KALI): Tepat setelah baris impor eksternal dan sebelum interface/komponen, Anda WAJIB menyertakan blok konstanta konfigurasi berikut secara persis dan lengkap TEPAT SATU KALI:
// --- CONFIGURATION CONSTANTS ---
export const DURATION = ${totalFrames};
export const FPS = ${fps};
export const WIDTH = ${targetWidth};
export const HEIGHT = ${targetHeight};

PENTING ANTI-DUPLIKASI & ANTI-IPTC DI DALAM KODE:
- DILARANG KERAS menyertakan header/komentar "// --- IPTC CORE & ADOBE BRIDGE METADATA..." atau mendeklarasikan variabel metadata IPTC (TITLE, HEADLINE, DESCRIPTION, KEYWORDS, IPTC_METADATA, atau calculateMetadata) di dalam kode TSX maupun kode HTML! Seluruh metadata komersial hanya boleh berada di luar kode (pada JSON property 'suggestedTitle').
- DILARANG KERAS mengulang atau menduplikasi header "// --- CONFIGURATION CONSTANTS ---" atau mendeklarasikan ulang variabel DURATION, FPS, WIDTH, HEIGHT di bagian lain file! Seluruh konstanta tersebut HANYA BOLEH ADA SATU KALI di seluruh berkas.
- FRAMING ANTI-ZOOM: Seluruh visual harus dibingkai pas 1:1 proporsional sesuai rasio ${aspectDesc} (${targetWidth}x${targetHeight}) @ ${fps} FPS tanpa terpotong di tepi-tepinya (terzoom in) dan tanpa terlalu kecil di tengah kanvas kosong (terzoom out). Pada Three.js, camera.aspect WAJIB = ${targetWidth} / ${targetHeight}; camera.updateProjectionMatrix();.

Definisikan juga \`Composition\` dengan properti lengkap yang mereferensikan konstanta tersebut: \`id\`, \`component\`, \`durationInFrames: DURATION\`, \`fps: FPS\`, \`width: WIDTH\`, \`height: HEIGHT\`, dan \`defaultProps\`. Selalu sertakan export komponen utama \`export const MainComposition: React.FC<MainCompositionProps> = () => { ... }; export default MainComposition;\`.
116. KONSISTENSI PREVIEW VS HASIL RENDER REMOTION (MANDATORI IDENTIK 100%):
- Di dalam kode TSX Remotion:
  Selalu panggil 'const { width, height, fps, durationInFrames } = useVideoConfig();'.
  Hitung progress secara deterministik: 'const progress = frame / durationInFrames;'.
  Untuk fungsi spring: selalu sertakan fps: 'spring({ frame, fps, config: ... })'.
  Gunakan viewBox={'0 0 ' + width + ' ' + height} atau viewBox={\`0 0 \${width} \${height}\`} pada SVG root dengan preserveAspectRatio="xMidYMid meet".
  Pusatkan subjek utama pada translate(width / 2, height / 2) atau transform={'translate(' + (width / 2) + 'px, ' + (height / 2) + 'px)'} atau transform={'translate(${centerX}px, ${centerY}px)'}.

  MANDATORI GOOGLE FONTS DETERMINISTIK (ANTI-FALLBACK TIMES NEW ROMAN):
  Jika animasi mengandung teks/tipografi/kaligrafi:
  1. Impor delayRender dan continueRender dari 'remotion'.
  2. Muat Google Font melalui tag <style> di dalam AbsoluteFill:
     <style>{\`@import url('https://fonts.googleapis.com/css2?family=Caramel&display=swap');\`}</style>
  3. WAJIB tahan render headless Puppeteer hingga font selesai di-download menggunakan:
     const [fontReady] = React.useState(() => delayRender('FontLoader'));
     React.useEffect(() => {
       if (typeof document !== 'undefined' && document.fonts) {
         document.fonts.ready.then(() => continueRender(fontReady)).catch(() => continueRender(fontReady));
       } else {
         continueRender(fontReady);
       }
     }, [fontReady]);
  Tanpa delayRender ini, Remotion headless render di PC akan gagal mendownload web font tepat waktu dan jatuh ke font default sistem (Times New Roman)!

  SAFE AREA & ANTI-CROPPING (PANTANGAN TEKS TERPOTONG):
  Pastikan seluruh teks memiliki Safe Zone minimal 15% dari tepi layar (left/right). Lebar teks tidak boleh melebihi 75%-80% lebar layar (${targetWidth}px) agar tidak terpotong di render video.
  Dengan aturan ini, hasil render Remotion akan 100% PERSIS DAN IDENTIK dengan tampilan pratinjau di layar pada resolusi (${targetWidth}x${targetHeight}) dan FPS (${fps}) apapun!
117. JANGAN memanggil fungsi Web Browser mentah seperti \`window.innerWidth\`, \`window.innerHeight\`, atau \`document.querySelector\` di dalam file TSX Remotion yang akan memicu kegagalan (crash) saat Remotion me-render via headless server (SSR/Puppeteer).
118. Semua operasi matematika pembagian harus memiliki fallback pencegah \`NaN\` atau \`Infinity\` (misal: \`const safeVal = isNaN(result) ? 0 : result;\`).
119. Array interpolasi harus memiliki panjang yang sama secara ketat: \`inputRange\` dengan panjang N WAJIB berpasangan dengan \`outputRange\` panjang N.
120. Struktur kode harus rapi dan terorganisir: Definisikan Types/Interfaces -> Helper Utilities / Math Curves -> Sub-komponen visual terisolasi -> Komponen Utama Scene -> Komponen Root Composition.
Hasil akhir kode harus memenuhi standar produksi: bebas error tipe TypeScript, performa render tinggi, deterministik, dan menyajikan fidelitas visual spektakuler sesuai instruksi visual pengguna.

---

# STRUKTUR OUTPUT KODE YANG DIHARAPKAN (STANDAR TINGGI TANPA MINIMALISME)
Ketika pengguna memberikan prompt, respons Anda WAJIB:
1. Menyajikan ringkasan arsitektur visual singkat (Visual & Motion Concept) dalam 2-3 kalimat.
2. Menyajikan **KODE TSX REMOTION LENGKAP & MANDIRI (MINIMAL 900 HINGGA 1500+ BARIS KODE ASLI)** yang siap pakai di dalam properti "code".
3. Menyajikan **KODE STANDALONE PREVIEW HTML LENGKAP (MINIMAL 900 HINGGA 1500+ BARIS KODE ASLI)** di dalam properti "previewHtml" dengan simulasi Canvas 2D/WebGL/SVG yang 100% identik dan 100% BERGERAK DINAMIS pada resolusi target ${targetWidth}x${targetHeight} @ ${fps} FPS.
4. Menjelaskan parameter konfigurasi (FPS: ${fps}, Durasi: ${duration} detik, Resolusi: ${aspectDesc} ${resolutionLabel} ${targetWidth}x${targetHeight}).

Terapkan seluruh aturan di atas tanpa kecuali. PANTANGAN KODE MINIMALIS: Jangan pernah memotong, menyingkat, atau menghilangkan detail visual maupun efek gerak!

# STRUKTUR KODE PRATINJAU HTML ("previewHtml") WAJIB BERGERAK 100% DINAMIS (MANDATORI ANTI-STATIC & ANTI-FREEZE):
Kode HTML preview ("previewHtml") DILARANG KERAS HANYA BERUPA GAMBAR STATIS ATAU SVG MATI TANPA ANIMASI!
Anda WAJIB menyusun file HTML mandiri yang hidup dan bergerak terus-menerus dengan struktur berikut:
1. Sediakan tag <canvas id="canvas" width="${targetWidth}" height="${targetHeight}"></canvas> ATAU container SVG dinamis beresolusi penuh (viewBox="0 0 ${targetWidth} ${targetHeight}").
2. PENTING: Anda WAJIB mendaftarkan fungsi draw global ke window:
   \`window.draw = function(progress, frame) { ... };\`
   \`window.render = window.draw;\`
3. Parameter \`progress\` bernilai 0.0 hingga 1.0 (setara frame = Math.floor(progress * ${totalFrames})).
4. Setiap kali \`window.draw(progress, frame)\` dipanggil, ia WAJIB:
   - Menghapus frame sebelumnya (ctx.clearRect(0, 0, ${targetWidth}, ${targetHeight}) pada Canvas, atau reset koordinat transform pada SVG).
   - Pusatkan elemen visual pada titik tengah kanvas: (CX = ${centerX}, CY = ${centerY}) atau (canvas.width / 2, canvas.height / 2).
   - Menghitung koordinat parametrik gerakan kinetik (spring physics intro, continuous organic breathing/floating, multi-axis 3D gimbal tilt, volumetric bloom glow, partikel atmosfer bergerak aktif - PANTANGAN: DILARANG membuat kilauan melintas).
   - Menggambar ulang seluruh 10-18 layer visual dengan keakuratan 99% identik dengan gambar referensi.
5. Panggil \`window.draw(0, 0);\` saat inisialisasi agar frame pertama langsung muncul tidak blank.
6. Sertakan loop requestAnimationFrame otomatis agar pratinjau bergerak secara kontinu secara mandiri:
   \`\`\`javascript
   let autoProgress = 0;
   let isHostControlled = false;
   function autoLoop() {
     if (!isHostControlled) {
       autoProgress = (autoProgress + 0.003) % 1;
       window.draw(autoProgress, Math.floor(autoProgress * ${totalFrames}));
     }
     requestAnimationFrame(autoLoop);
   }
   requestAnimationFrame(autoLoop);
   window.addEventListener('message', function(e) {
     if (e.data && e.data.type === 'render') {
       isHostControlled = true;
       window.draw(e.data.progress, e.data.frame !== undefined ? e.data.frame : Math.floor(e.data.progress * ${totalFrames}));
     }
   });
   \`\`\`

7. PANDUAN KHUSUS JIKA MENGGUNAKAN THREE.JS / WEBGL & SIMULASI FISIKA KOMPLEKS (ANTI-BLANK HITAM, ANTI-CULLING, ANTI-CLIPPING & PENALARAN FISIKA):
   - Inisialisasi Renderer dengan preserveDrawingBuffer & alpha:
     const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true, alpha: true, preserveDrawingBuffer: true }); renderer.setSize(${targetWidth}, ${targetHeight});
   - Formulasi Fisika & Gelombang Mulus (Harmonic Wave Superposition):
     Gunakan superposisi sinus/kosinus harmonik berfrekuensi ganda dengan phase loop teratur:
     const phase = progress * Math.PI * 2;
     // Contoh kalkulasi deformasi vertex z:
     // z = Math.sin(x * freqX + phase) * amp1 + Math.sin((x + y) * freqDiag - phase) * amp2 + Math.cos(y * freqY + phase * 2) * amp3;
     Loop phase selalu kelipatan (Math.PI * 2) agar animasi looping 100% mulus (seamless) tanpa lompatan frame 0 ke akhir.
   - Simulasi Dinamika Kain / Sutra / Partikel (Verlet & Damping):
     Gunakan delta waktu stabil atau progress interpolasi dengan faktor redaman (damping factor 0.95-0.98) agar kalkulasi koordinat stabil, tidak menghasilkan nilai NaN, dan tidak meledak ke Infinity.
   - Tekstur Offscreen Canvas:
     Jika menggambar tekstur di canvas terpisah (misal motif/logo 2048x1024), WAJIB update tekstur:
     const texture = new THREE.CanvasTexture(offscreenCanvas);
     texture.needsUpdate = true;
   - Material PBR Kain / Simulasi Permukaan (WAJIB DoubleSide agar lipatan tidak hilang saat bergelombang):
     const mat = new THREE.MeshStandardMaterial({ 
       map: texture, 
       roughness: 0.45, 
       metalness: 0.1, 
       side: THREE.DoubleSide 
     });
   - Geometri & Skala Proporsional:
     Gunakan ukuran proporsional (misal PlaneGeometry(16, 9, 128, 128) atau PlaneGeometry(12, 12, 128, 128)), BUKAN ribuan unit agar kamera dapat melihat seluruh permukaan secara utuh edge-to-edge tanpa terpotong frustum clipping.
   - Pengaturan Kamera & Aspek Rasio:
     const camera = new THREE.PerspectiveCamera(35, ${targetWidth} / ${targetHeight}, 0.1, 1000);
     camera.position.set(0, -0.5, 14); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
   - Setup Pencahayaan Sinematik 3-Titik:
     const ambLight = new THREE.AmbientLight(0xffffff, 0.9); scene.add(ambLight);
     const dirLight = new THREE.DirectionalLight(0xffffff, 1.8); dirLight.position.set(5, 10, 7); scene.add(dirLight);
     const fillLight = new THREE.DirectionalLight(0xffffff, 0.6); fillLight.position.set(-5, -5, 5); scene.add(fillLight);
     const rimLight = new THREE.DirectionalLight(0xffffff, 0.5); rimLight.position.set(0, 5, -8); scene.add(rimLight);
   - Deformasi Vertex Dinamis & Normal Recomputation:
     Pada loop animasi: deformasi vertex Z melalui position.array atau setZ(i, z), lalu WAJIB panggil:
     geometry.computeVertexNormals();
     geometry.attributes.position.needsUpdate = true;
     if (geometry.attributes.normal) geometry.attributes.normal.needsUpdate = true;
   - Integrasikan ke window.draw & window.render:
     window.draw = function(progress, frame) { updateAnimation(progress, frame); renderer.render(scene, camera); };
     window.render = window.draw;
     window.draw(0, 0);
   - Struktur TSX Remotion untuk Three.js:
     Di dalam Remotion TSX, render elemen canvas dengan properti style kurung ganda:
     return (
       <AbsoluteFill style={{ backgroundColor: '#000000', overflow: 'hidden' }}>
         <canvas
           ref={canvasRef}
           width={width}
           height={height}
           style={{
             width: '100%',
             height: '100%',
             display: 'block',
           }}
         />
       </AbsoluteFill>
     );
     Sinkronkan progress = frame / DURATION ke fungsi render Three.js di useCurrentFrame(). Pastikan selalu merestore WebGL context saat renderMode aktif.
     PENTING: Atribut style pada canvas WAJIB menggunakan kurung kurawal ganda style={{ width: '100%', height: '100%', display: 'block' }}. DILARANG KERAS menulis 'style=' tanpa '{{'!

8. PROTOKOL SINTAKS KETAT & ANTI-UNTERMINATED REGULAR EXPRESSION (MANDATORI ESBUILD BUNDLER COMPLIANT):
   Bundler Remotion (esbuild) SANGAT KETAT terhadap sintaks TSX/JSX:
   - PANTANGAN ATRIBUT STYLE ATAU OBJECT TANPA KURUNG KURAWAL GANDA:
     Di TSX / JSX, inline style adalah JavaScript object sehingga WAJIB DITULIS dengan kurung kurawal ganda: style={{ width: '100%', height: '100%' }}. DILARANG KERAS MENULIS 'style=' tanpa kurung kurawal ganda (seperti 'style=\n width: 100% }}' yang memicu fatal error '{ or JSX element expected')!
   - PANTANGAN KOMENTAR GARIS MIRING TUNGGAL:
     Komentar WAJIB menggunakan garis miring ganda '//' untuk single-line comment atau '/* ... */' untuk multi-line comment. DILARANG KERAS menulis garis miring satu seperti '/ komentar' atau '{/ komentar /}'.
   - PANTANGAN SELF-CLOSING TAG TANPA TANDUK PENUTUP (>):
     Setiap elemen JSX mandiri (seperti <circle />, <ellipse />, <rect />, <path />, <div />, <g />, <defs />) WAJIB DITUTUP LENGKAP dengan '/>' (ada tanda slash '/' dan diikuti tanda kurung siku '>'). DILARANG LUPA tanda '>' seperti '<circle cx={10} cy={10} /' karena esbuild akan mengartikan tanda '/' tersebut sebagai pembuka Regular Expression yang tidak tertutup (Unterminated regular expression)!
   - PANTANGAN PEMBAGIAN MATEMATIKA MENGGANTUNG:
     Setiap operasi pembagian ('/') WAJIB memiliki pembilang dan penyebut lengkap, contoh: 'width / 2' atau 'Math.sin(frame / 30)'. Dilarang menulis 'width /' atau 'frame / ;'.
   - PANTANGAN KARAKTER SLASH BEBAS DI DALAM JSX:
     Dilarang menaruh karakter '/' mentah di dalam elemen JSX tanpa diapit string atau komentar JSX valid ('{/* komentar */}').

PROMPT PENGGUNA UNTUK VIDEO INI:
"${brief}"
DURASI: ${duration} detik (${totalFrames} frame pada ${fps} FPS, resolusi target ${aspectDesc} ${resolutionLabel} ${targetWidth}x${targetHeight}).

KEMBALIKAN OUTPUT DALAM FORMAT JSON SESUAI SKEMA BERIKUT:
- "detectedObjects": WAJIB DIISI PERTAMA KALI SEBAGAI INVENTARIS AUDIT VISUAL 100% (MINIMAL 15-25 KOMPONEN MENDETAIL). Tuliskan secara lengkap seluruh elemen visual gambar referensi: bentuk makro, panel meso, garis kontur, ornamen mikro, ukiran, emblem/logo, layer shading volumetrik, dan palet warna asli. ${cleanNoText !== false ? 'PANTANGAN MUTLAK TEKS: JIKA ADA TEKS/TULISAN/HURUF PADA GAMBAR REFERENSI, JANGAN SERTAKAN TEKS TERSEBUT (wajib dieliminasi agar footage bersih tanpa teks).' : 'TEKS REFERENSI DIIZINKAN: JIKA ADA TEKS/TULISAN/ANIMASI TIPOGRAFI PADA REFERENSI, SERTAKAN DAN ANIMASIKAN TEKS TERSEBUT (Kinetic Typography 100% penuh).'} Seluruh komponen visual non-teks ini WAJIB dikodekan secara nyata di dalam "code" dan "previewHtml" (PANTANGAN VERSI MINIMALIS 30%).
- "code": Kode TSX Remotion LENGKAP, BEBAS DARI SEGALA MACAM SYNTAX ERROR, merekonstruksi SELURUH item dari "detectedObjects" secara 100% identik tanpa pengurangan (STANDAR MUTLAK SAMA DENGAN BULK PROMPT). Jika subjek bervolume/3D, WAJIB gunakan Three.js & @remotion/three / @react-three/fiber dengan <ThreeCanvas>, geometri 3D, material PBR sinematik, dan pencahayaan Three-Point. Pahami konteks gerak untuk STOCK FOOTAGE KOMERSIAL: TIDAK SEMUA HARUS FADE IN FADE OUT; prioritaskan SEAMLESS INFINITE LOOP yang terus hidup dan berkesinambungan tanpa redup ke hitam. DILARANG SERTAKAN TEKS APAPUN DARI GAMBAR! Seluruh tag JSX, kurung kurawal, dan tanda kutip wajib tertutup sempurna tanpa ada komentar di dalam blok return (...).
- "previewHtml": Kode standalone HTML preview (Three.js WebGL / Canvas / SVG / CSS 3D) LENGKAP, BEBAS SYNTAX ERROR, yang menyajikan simulasi visual gerakan yang 100% identik pada resolusi ${targetWidth}x${targetHeight}. Jika subjek bervolume/3D, gunakan Three.js WebGL (THREE.WebGLRenderer, scene, camera, lights, mesh) dengan loop requestAnimationFrame dan window.draw(progress, frame) yang aktif bergerak dinamis secara nyata.
- "suggestedVariations": 7 variasi visual lanjutan.
- "suggestedTitle": WAJIB MENGGUNAKAN FORMULA BAKU KONTRIBUTOR NO. 1 DUNIA ADOBE STOCK (METASTOCKER / ANDREY POPOV & FIZKES):
  RUMUS FORMULA: [Subjek Spesifik / Visual] + [Kata Kerja Aktif Gerund (-ing)] + [Objek / Gerak / Tekstur] + [Tujuan / Setting Komersial]
  CONTOH EMAS ANDREY POPOV:
  "Luxurious blue silk fabric gracefully flowing and rippling in continuous motion for elegant corporate branding backgrounds"
  PANTANGAN MUTLAK:
  - DILARANG nomor acak, ID angka, atau timestamp (DILARANG: _1789488318065, #1, 12345).
  - DILARANG karakter underscore (_) atau koma pemisah kaku. Gunakan kalimat mengalir dengan preposisi alami ("for ... backgrounds").
  - DILARANG kata subjektif murahan ("beautiful", "stunning", "amazing", "breathtaking", "cute", "gorgeous").
  - DILARANG kata teknis kamera ("4k", "cinematic", "canon", "close up", "an image of", "photo of").
  - DILARANG tanda titik (.) di akhir judul.
  - FORMAT HURUF: Sentence case murni (Hanya huruf pertama kata pertama yang kapital, sisanya huruf kecil kecuali singkatan 3D, AI, UI).
  - PANJANG: Ideal 65 hingga 120 karakter (88 - 120 karakter sempurna).
`;

  const contents: any[] = [];

  // PENTING: Sisipkan media referensi di posisi PERTAMA agar model mengatensi visual token secara prima
  if (reference && refType) {
    const parts = reference.split(",");
    const base64Data = parts[1] || parts[0];
    const mimeMatch = reference.match(/^data:([^;]+);base64,/);
    let mimeType = mimeMatch ? mimeMatch[1] : (refType === "video" ? "video/mp4" : "image/png");
    if (refType === "video" && !mimeType.startsWith("video/")) {
      mimeType = "video/mp4";
    }
    contents.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });
  }

  contents.push({ text: basePrompt });

  let response;
  const isVideoRef = refType === "video";
  let systemInstructionText = reference
    ? `Anda adalah "Remotion Engine Architect & Master 3D Visual Director" dengan spesialisasi Produksi Stock Footage Komersial Kelas Dunia (Adobe Stock / Shutterstock).
🚨 MANDATORI SINTAKS 100% BEBAS SYNTAX ERROR (STANDAR BULK PROMPT & INSTRUKSI TAMBAHAN):
PENGGUNA MENEGASKAN SECARA MUTLAK:
Saat meng-generate dari Media Referensi (${isVideoRef ? 'Video Referensi Asli' : 'Bulk Image / SVG Reference'}), kode TSX Remotion ("code") dan HTML Preview ("previewHtml") WAJIB SEMPURNA TANPA SYNTAX ERROR KETIKA DI-RENDER, SAMA SEPERTI KETIKA MENG-GENERATE DARI BULK PROMPT PER BARIS ATAU INSTRUKSI TAMBAHAN.
DILARANG KERAS memotong kode di tengah jalan.
DILARANG KERAS menulis komentar di dalam blok return (...).
DILARANG KERAS menulis komentar // di akhir baris atribut JSX.
SEMUA tag leaf SVG wajib self-closing '/>'.
SEMUA tag kontainer wajib tertutup berpasangan.
Gunakan struktur matematika prosedural, Three.js PBR mesh, atau Canvas 2D/3D yang kaya, solid, dan langsung dapat di-compile oleh TypeScript / esbuild dan dirender sempurna tanpa error.
PENGGUNA SECARA TEGAS MEMBERIKAN 4 MANDATORI UTAMA:
1. "REKONSTRUKSI VOLUME 3D SETIA PADA SUBJEK ASLI (ANTI-MENGARANG SENDIRI)":
   - 🚨 PANTANGAN FATAL: DILARANG KERAS mengganti objek referensi dengan geometri 3D generik (seperti tiba-tiba membuat TorusKnot donat, bola polos melayang, atau kubus sembarangan padahal referensi bukan donat/bola)!
   - Subjek yang dihasilkan WAJIB 100% SAMA DENGAN SUBJEK REFERENSI (anatomi, komponen, lekukan, dan proporsinya).
   - Jika menggunakan Three.js WebGL: buat compound mesh hierarkis (THREE.Group) dari bagian-bagian subjek asli atau THREE.ExtrudeGeometry dari kontur siluetnya.
   - Jika bentuk subjek organik/detail/clay: gunakan High-Fidelity 2.5D Volumetric Layered Bezier Shading dengan multi-stop gradient PBR, ambient occlusion, dan CSS 3D transforms agar 100% lekukan asli terjiplak persis bervolume tanpa mengarang bentuk sendiri!
2. "TIDAK SEMUA HARUS FADE IN FADE OUT. PAHAMI LAGI KONTEKSNYA":
   - Untuk aset background, ambient motion, stock footage, fluida, dan pergerakan 3D: DILARANG membuat fade ke hitam (fade to black)! Prioritaskan SEAMLESS CONTINUOUS INFINITE LOOP (siklus gerak 100% harmonik di mana frame akhir menyatu mulus dengan frame 0) agar footage dapat diputar berulang-ulang tanpa jeda di timeline editor video! Hanya gunakan fade in / out jika konteksnya adalah reveal stinger.
3. "TUJUANNYA UNTUK STOCK FOOTAGE (COMERCIAL USE)":
   - Hasil akhir harus memenuhi standar tertinggi footage komersial: kualitas visual elegan, bersih, rasio kontras prima, tanpa watermark atau HUD frame mengganggu, 60 FPS deterministik, dan siap lisensi komersial.
${cleanNoText !== false ? `4. "JIKA REFERENSI ADA TEXT, JANGAN SERTAKAN TEXT TERSEBUT":
   - DILARANG KERAS menyertakan tulisan, tipografi, huruf, atau watermark dari media referensi! Hapus seluruh teks dan rekonstruksi hanya bentuk visual objek, volume 3D, dan lingkungannya secara bersih (clean plate) agar pembeli video dapat menambahkan teks mereka sendiri.` : `4. "MODE INCLUDE TEXT (TEKS DIIZINKAN & DIANIMASIKAN)":
   - Jika media referensi mengandung teks, judul, tipografi animasi, atau template footage dengan teks: SERTAKAN DAN ANIMASIKAN TEKS TERSEBUT 100% penuh sesuai referensi! Gunakan Kinetic Typography dengan styling font yang selaras, spring easing animasi, dan tata letak yang proporsional.`}
5. TAKARAN 100% PENUH (ANTI-MINIMALIS 30%):
   - Rekonstruksi seluruh elemen makro, panel meso, garis kontur, ornamen mikro, dan warna asli secara tuntas.${isVideoRef ? ' Pada video referensi, seluruh kurva dinamika gerak kinetik dan timing direplikasi 100% penuh.' : ''}
TATA LETAK RAPI TERKUNCI: Kunci seluruh subjek utama pada sistem koordinat kartesian terpusat (translate ${centerX}, ${centerY}) dengan target kanvas ${targetWidth}x${targetHeight} (${aspectDesc}) @ ${fps}FPS.
Kode TSX ("code") dan HTML preview ("previewHtml") WAJIB LENGKAP, TEBAL, BEBAS SYNTAX ERROR, dan MEREKONSTRUKSI SELURUH DETAIL DENGAN TINGKAT KEAKURATAN TERTINGGI. FORMULA JUDUL ADOBE STOCK: Field "suggestedTitle" WAJIB menggunakan formula baku Fizkes & Andrey Popov: [Subjek]+[Gerund]+[Objek]+[Lokasi]+[Konsep Komersial] dengan panjang ketat 88-130 karakter tanpa terpotong.`
    : `Anda adalah "Remotion Engine Architect & Master 3D Visual Director" untuk Produksi Stock Footage Komersial. Ciptakan animasi grafis bergerak kelas industri tingkat dunia dengan resolusi ${aspectDesc} ${resolutionLabel} (${targetWidth}x${targetHeight} @ ${fps} FPS) menggunakan Remotion TSX dan HTML preview dinamis. Jika objek bervolume, gunakan Three.js WebGL. Bebas dari teks pengganggu (clean plate) dan prioritaskan seamless infinite loop tanpa redup ke hitam. Kode TSX ("code") dan HTML preview ("previewHtml") WAJIB LENGKAP, TEBAL, 100% BEBAS DARI SEGALA SYNTAX ERROR, dan MEREKONSTRUKSI SELURUH DETAIL TERTINGGI. FORMULA JUDUL ADOBE STOCK: Field "suggestedTitle" WAJIB menggunakan formula baku Fizkes & Andrey Popov: [Subjek]+[Gerund]+[Objek]+[Lokasi]+[Konsep Komersial] dengan panjang ketat 88-130 karakter tanpa terpotong.`;

  if (isSvgTraceMode) {
    systemInstructionText = `Anda adalah "Remotion Engine Architect & Master 3D Visual Director" dengan spesialisasi Animasi Vektor SVG Trace & Occlusion Infill (Anti-Bolong). PANTANGAN MENEBAK KOORDINAT: Ekstrak dan gunakan langsung seluruh atribut path ("d") dan warna dari kode SVG yang diunggah pengguna. MANDATORI ANTI-BOLONG: Karena file hasil trace memotong objek menjadi potongan kepingan berongga (boolean cutouts), Anda WAJIB membuat lapisan penambal alas (solid silhouette infill hull & underlay base backing) di belakang elemen-elemen yang bergerak agar saat elemen bergerak/berotasi 3D tidak ada lubang kosong tembus pandang di latar belakang! TATA LETAK RAPI: Skalakan dan pusatkan pada (${centerX}, ${centerY}) untuk format ${aspectDesc} ${targetWidth}x${targetHeight}. HIERARKI SINEMATIK: Selektif dalam menggerakkan elemen—badan utama stabil, hanya aksen yang bergerak kinetik—tanpa efek kilauan melintas (no specular glint sweep). Kode TSX dan HTML preview WAJIB LENGKAP, TEBAL, BEBAS SYNTAX ERROR, dan MEREKONSTRUKSI SELURUH DETAIL. FORMULA JUDUL ADOBE STOCK: Field "suggestedTitle" WAJIB menggunakan formula baku Fizkes & Andrey Popov: [Subjek]+[Gerund]+[Objek]+[Lokasi]+[Konsep Komersial] dengan panjang ketat 88-130 karakter tanpa terpotong.`;
  }

  if (isComplex3D) {
    systemInstructionText += " PENALARAN TINGKAT TINGGI THREE.JS / WEBGL & FISIKA KOMPLEKS: Lakukan penalaran komputasi spasial dan matematika fisika mendalam (chain-of-thought spatial & physical reasoning) sebelum menulis kode. Turunkan persamaan matematika dinamis (superposisi gelombang periodik sinus/kosinus, integrasi Euler/Verlet numerik stabil, redaman kisi pegas-massa, dan komputasi dinamis posisi/normal mesh) untuk menghasilkan kode Three.js / WebGL Remotion TSX dan HTML preview yang stabil, bebas NaN, bebas artefak bolong/culling, dan 100% bergerak dinamis.";
  }

  systemInstructionText += " SINTAKS TSX MUTLAK BEBAS CACAT (ZERO PARSE ERROR): AI WAJIB menghasilkan kode TSX Remotion yang 100% bebas dari segala jenis syntax error. DILARANG KERAS menulis komentar apapun di dalam blok return (...). ATRIBUT STYLE JSX WAJIB MEMAKAI KURUNG KURAWAL GANDA: style={{ width: '100%', height: '100%', display: 'block' }}. DILARANG KERAS menulis 'style=' tanpa '{{' (seperti 'style=\\n width: 100% }}' yang memicu fatal error '{ or JSX element expected'). DILARANG menaruh komentar // di akhir baris atribut JSX. DILARANG menaruh kurung kurawal '{' nyasar di dalam tag elemen JSX. DILARANG menulis placeholder titik tiga ('...' atau '{...}'). SEMUA tag leaf SVG (path, circle, rect, line, ellipse, stop, use) WAJIB self-closing '/>'. KODE HARUS 100% LENGKAP DARI IMPORT SAMPAI EXPORT DEFAULT DAN LANGSUNG DAPAT DI-RENDER TANPA ERROR.";

  const schemaConfig = {
    type: Type.OBJECT,
    properties: {
      detectedObjects: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Inventaris lengkap seluruh elemen visual (makro, meso, mikro) dari gambar referensi yang wajib direkonstruksi 100% tanpa pengurangan.",
      },
      code: {
        type: Type.STRING,
        description: "Kode TypeScript TSX Remotion 100% LENGKAP dan VALID dari baris import pertama sampai export default. WAJIB 100% BEBAS DARI SEGALA MACAM SYNTAX ERROR. Atribut style JSX WAJIB memakai kurung kurawal ganda: style={{ width: '100%', height: '100%', display: 'block' }}. DILARANG KERAS menulis 'style=' tanpa '{{'. DILARANG komentar apapun di dalam blok return (...). SEMUA tag leaf SVG (circle, path, rect, line, stop) WAJIB self-closing '/>'. Seluruh kurung kurawal dan kontainer JSX WAJIB tertutup berpasangan secara presisi.",
      },
      previewHtml: {
        type: Type.STRING,
        description: "Kode HTML & Vanilla JS 100% mandiri untuk pratinjau interaktif, bebas dari syntax error JavaScript atau variabel undefined.",
      },
      suggestedVariations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            description: { type: Type.STRING },
            prompt: { type: Type.STRING },
          },
          required: ["label", "description", "prompt"],
        },
      },
      suggestedTitle: {
        type: Type.STRING,
        description: "Judul komersial Adobe Stock sesuai Formula Fizkes & Andrey Popov ([Subjek]+[Gerund]+[Objek]+[Lokasi]+[Konsep Komersial]), panjang WAJIB ketat antara 88 hingga 130 karakter penuh tanpa terpotong.",
      },
    },
    required: [
      "detectedObjects",
      "code",
      "previewHtml",
      "suggestedVariations",
      "suggestedTitle",
    ],
  };

  const targetTemperature = reference ? 0.2 : (isCustomBulkPerLine ? 0.45 : 0.3);

  const salvageJsonFields = (text: string): Partial<GenerateAnimationResponse> => {
    const result: Partial<GenerateAnimationResponse> = {};
    
    // Extract code
    const codeMatch = text.match(/"code"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"previewHtml"|"\s*,\s*"suggestedVariations"|"\s*,\s*"suggestedTitle"|"\s*\})/);
    if (codeMatch) {
      try {
        result.code = healTsxSyntaxErrors(JSON.parse(`"${codeMatch[1]}"`));
      } catch (e) {
        result.code = healTsxSyntaxErrors(codeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
      }
    }

    // Extract previewHtml
    const htmlMatch = text.match(/"previewHtml"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"suggestedVariations"|"\s*,\s*"suggestedTitle"|"\s*\})/);
    if (htmlMatch) {
      try {
        result.previewHtml = healHtmlPreviewSyntax(JSON.parse(`"${htmlMatch[1]}"`));
      } catch (e) {
        result.previewHtml = healHtmlPreviewSyntax(htmlMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
      }
    }

    // Extract suggestedTitle
    const titleMatch = text.match(/"suggestedTitle"\s*:\s*"([^"]+)"/);
    if (titleMatch) {
      result.suggestedTitle = titleMatch[1];
    }

    return result;
  };

  const cleanAndParseJson = (rawText: string): GenerateAnimationResponse => {
    let cleaned = (rawText || "").trim();
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    try {
      return JSON.parse(cleaned) as GenerateAnimationResponse;
    } catch (initialErr) {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const extracted = cleaned.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(extracted) as GenerateAnimationResponse;
        } catch (subErr) {
          // Lanjut ke salvage parser
        }
      }

      // Resilient Salvage Parser for complex prompts
      const salvaged = salvageJsonFields(cleaned);
      if (salvaged.code || salvaged.previewHtml) {
        return {
          detectedObjects: ["Subjek 3D Terdeteksi", "Animasi Dinamis"],
          code: salvaged.code || salvaged.previewHtml || "",
          previewHtml: salvaged.previewHtml || salvaged.code || "",
          suggestedVariations: [],
          suggestedTitle: salvaged.suggestedTitle || "Ultra high quality 3D simulation rendering with dynamic lighting and surface detail"
        };
      }

      throw initialErr;
    }
  };

  const aiSettings = getAISettings();

  // 1. Support OpenRouter & 9Router Providers
  if (aiSettings.activeProvider === 'openrouter' || aiSettings.activeProvider === '9router') {
    const is9Router = aiSettings.activeProvider === '9router';
    const baseUrl = is9Router ? (aiSettings.nineRouterBaseUrl || 'https://api.9router.com/v1') : 'https://openrouter.ai/api/v1';
    const apiKey = is9Router ? aiSettings.nineRouterKey : aiSettings.openrouterKey;
    const model = is9Router ? aiSettings.nineRouterSelectedModel : aiSettings.openrouterSelectedModel;
    const providerName = is9Router ? '9Router' : 'OpenRouter';

    if (!apiKey || !apiKey.trim()) {
      throw new Error(`API Key untuk ${providerName} belum dimasukkan. Silakan buka menu Pengaturan AI & Model untuk memasukkan API Key.`);
    }

    // Optimalkan gambar atau frame video referensi jika ada
    let referenceImageUrl: string | undefined = undefined;
    if (reference) {
      try {
        referenceImageUrl = await optimizeReferenceImageForAI(reference);
      } catch (e) {
        referenceImageUrl = reference;
      }
    }

    // Bangun prompt lengkap yang menyertakan brief pengguna, spesifikasi, dan panduan
    let fullUserPrompt = `${basePrompt}`;
    if (referenceImageUrl) {
      fullUserPrompt += `\n\n🚨 PANDUAN WAJIB MEDIA REFERENSI TERLAMPIR:
Gambar/media visual referensi pengguna TELAH TERLAMPIR pada request ini.
Model AI WAJIB MENGANALISIS GAMBAR REFERENSI SECARA CERMAT DAN MEREKONSTRUKSI 100% SUBJEK ASLI (bentuk, proporsi, lekukan siluet, anatomi, tekstur, palet warna, dan elemen khasnya) ke dalam Remotion TSX ("code") dan HTML preview ("previewHtml").
DILARANG KERAS MENGARANG BENTUK GEOMETRI SENDIRI yang berbeda dari gambar referensi!`;
    }
    if (isSvgTraceMode && svgCode) {
      fullUserPrompt += `\n\nKODE SVG REFERENSI ASLI:\n\`\`\`xml\n${svgCode}\n\`\`\``;
    }
    fullUserPrompt += `\n\nIMPORTANT: Response MUST be a valid JSON object containing "code" (Remotion TSX), "previewHtml" (standalone HTML preview), "suggestedTitle", and "detectedObjects". Do NOT write any conversational text outside JSON.`;

    const rawResponse = await executeOpenAICompatibleChat({
      baseUrl,
      apiKey,
      model: model || (is9Router ? 'claude-3-5-sonnet' : 'anthropic/claude-3.5-sonnet'),
      systemInstruction: systemInstructionText,
      userPrompt: fullUserPrompt,
      imageUrl: referenceImageUrl,
      temperature: targetTemperature,
      providerName,
    });

    const parsed = cleanAndParseJson(rawResponse);
    if (parsed && (parsed.code || parsed.previewHtml)) {
      if (parsed.code) parsed.code = healTsxSyntaxErrors(parsed.code);
      if (parsed.previewHtml) parsed.previewHtml = healHtmlPreviewSyntax(parsed.previewHtml);
      parsed.suggestedTitle = formatFizkesPopovTitle(parsed.suggestedTitle, {
        brief,
        style: iconStyle,
        is3D: isPremium3D,
      });
      parsed.popovKeywords = generatePopovKeywords(parsed.suggestedTitle, {
        brief,
        objects: parsed.detectedObjects,
      });
      parsed.suggestedKeywords = parsed.popovKeywords.all;
      return parsed;
    }
    throw new Error(`Gagal menghasilkan kode valid dari provider ${providerName}.`);
  }

  // 2. Default Gemini with Auto-Key Failover Rotation
  const candidateModels = [
    "gemini-3.8-flash",       // Primer: gemini-3.8-flash
    "gemini-3.7-flash",       // Fallback 1: gemini-3.7-flash
    "gemini-3.6-flash",       // Fallback 2: gemini-3.6-flash
  ];

  let lastError: any = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const currentModel = candidateModels[mIdx];
    try {
      if (mIdx > 0) {
        console.warn(`[Fallback Active] Mencoba model fallback ke-${mIdx}: ${currentModel}`);
        await new Promise((res) => setTimeout(res, 1500));
      }

      const activeAi = getGeminiClient();
      const response = await activeAi.models.generateContent({
        model: currentModel,
        contents: { parts: contents },
        config: {
          responseMimeType: "application/json",
          responseSchema: schemaConfig,
          systemInstruction: systemInstructionText,
          temperature: targetTemperature,
          maxOutputTokens: 65536,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      const rawText = response.text?.trim() || "{}";
      const parsed = cleanAndParseJson(rawText);
      if (parsed && (parsed.code || parsed.previewHtml)) {
        if (parsed.code) {
          parsed.code = healTsxSyntaxErrors(parsed.code);
        }
        if (parsed.previewHtml) {
          parsed.previewHtml = healHtmlPreviewSyntax(parsed.previewHtml);
        }
        parsed.suggestedTitle = formatFizkesPopovTitle(parsed.suggestedTitle, {
          brief,
          style: iconStyle,
          is3D: isPremium3D,
        });
        parsed.popovKeywords = generatePopovKeywords(parsed.suggestedTitle, {
          brief,
          objects: parsed.detectedObjects,
        });
        parsed.suggestedKeywords = parsed.popovKeywords.all;
        return parsed;
      }
      throw new Error(`Model ${currentModel} tidak menghasilkan code atau previewHtml`);
    } catch (err: any) {
      lastError = err;
      console.warn(`[Model Attempt Failed] ${currentModel}:`, err?.message || err);
    }
  }

  throw lastError || new Error("Semua model fallback gagal menghasilkan animasi.");
}

export async function applyVariationService(
  params: ApplyVariationParams
): Promise<ApplyVariationResponse> {
  const {
    variationPrompt,
    generatedTSXCode,
    previewHtmlCode,
    duration,
    fps,
    forceLandscape,
    resolution,
    targetWidth: explicitWidth,
    targetHeight: explicitHeight,
    bgOverride,
  } = params;

  const isLandscape = forceLandscape !== false;
  const targetWidth =
    explicitWidth ||
    (isLandscape
      ? resolution === "2K"
        ? 2560
        : 3840
      : resolution === "2K"
      ? 1440
      : 2160);
  const targetHeight =
    explicitHeight ||
    (isLandscape
      ? resolution === "2K"
        ? 1440
        : 2160
      : resolution === "2K"
      ? 2560
      : 3840);
  const centerX = Math.round(targetWidth / 2);
  const centerY = Math.round(targetHeight / 2);
  const aspectDesc = isLandscape ? "16:9 Landscape" : "9:16 Vertical";
  const resolutionLabel = targetWidth >= 3840 || targetHeight >= 3840 ? "4K" : "2K";
  const totalFrames = duration * fps;

  let bgDirective = "";
  if (bgOverride === "alpha") {
    bgDirective = "11. LATAR BELAKANG TRANSPARAN MUTLAK (ALPHA CHANNEL): Jadikan backgroundColor: 'transparent' pada AbsoluteFill/containerStyle TSX dan HTML preview. DILARANG MERENDER background rect solid penutup kanvas agar subjek terisolasi dengan transparansi murni.";
  } else if (bgOverride === "greenscreen") {
    bgDirective = "11. LATAR BELAKANG GREENSCREEN: Jadikan background color #00ff00 murni (greenscreen) pada TSX dan HTML preview.";
  } else if (bgOverride === "black") {
    bgDirective = "11. LATAR BELAKANG HITAM: Jadikan background color #000000 murni pada TSX dan HTML preview.";
  } else if (bgOverride === "white") {
    bgDirective = "11. LATAR BELAKANG PUTIH: Jadikan background color #ffffff murni pada TSX dan HTML preview.";
  }

  const sanitizedTSXInput = sanitizeRemotionConstants(generatedTSXCode);

  const prompt = `Anda adalah Spesialis Pembuat Kode Video Remotion TSX & WebGL Precision Code Surgeon.
Lakukan SURGICAL MODIFICATION (MODIFIKASI BEDAH KODE PRESISI TINGGI) pada kode Remotion TSX dan kode preview HTML saat ini berdasarkan instruksi perubahan berikut:

DAFTAR INSTRUKSI PERUBAHAN DARI USER:
"""
${variationPrompt}
"""

================================================================================
🚨 MANDATORI MUTLAK: SURGICAL IN-PLACE EDITING (HANYA UBAH BAGIAN YANG DIMAKSUD!) 🚨
================================================================================
PENGGUNA MENGELUH DENGAN SANGAT TEGAS:
"ini terlalu merubah semuanya. hingga hasilnya berubah dari sebelumnya tidak pada komponen yang dimaksud saja. kritikal ubah hanya pada bagian yang dimaksud saja!"

KARENA ITU, ANDA DIWAJIBKAN MEMATUHI ATURAN BEDAH KODE INI SECARA MUTLAK:
1. DILARANG KERAS MEROMBAK ULANG KESELURUHAN KODE DARI AWAL!
2. DILARANG MENGGANTI ATAU MENGUBAH ELEMEN/KOMPONEN YANG TIDAK DIMINTA!
3. KODE SAAT INI ADALAH BASELINE UTAMA: Pertahankan 95%+ struktur kode, nama fungsi, bentuk geometri subjek, koordinat kurva Bezier, susunan layer, Three.js mesh, dan rumus animasi yang sudah ada.
4. HANYA SENTUH DAN UBAH NILAI/BARIS SPESIFIK (SURGICAL EDIT) yang secara eksplisit tercantum dalam instruksi user di atas:
   - Jika instruksi berisi daftar list poin (1, 2, 3...): telusuri dan laksanakan modifikasi TEPAT pada elemen yang ditargetkan oleh masing-masing poin.
   - Jika user meminta ubah warna (misal "ganti background ke navy" atau "ganti warna aksen ke gold"): HANYA ubah nilai warna/hex/stop-color pada elemen tersebut.
   - Jika user meminta ubah kecepatan gerak (misal "perlambat 50%" atau "percepat rotasi"): HANYA ubah multiplier/nilai pengali frame atau durasi spring pada gerakan tersebut.
   - Jika user meminta perbesar/geser objek (misal "perbesar 20%"): HANYA sesuaikan nilai scale/translate pada kontainer subjek terkait.
   - 🚨 KRITIKAL ZOOM OUT / PERKECIL (PANTANGAN SALAH SKALA): Jika user meminta "zoom out 1.2x", "perkecil 20%", "zoom out", atau "kecilkan":
     * Nilai scale HARUS DIKURANGI / LEBIH KECIL DARI 1.0 (misalnya: scale: 0.8 atau 0.83! DILARANG KERAS diset 1.2 karena 1.2 justru memperbesar objek dan membuatnya makin terpotong!).
     * Nilai zoom out selalu bernilai < 1.0 (misal scale: 0.85, 0.8, 0.75).
   - 🚨 SAFE AREA & ANTI-CROPPING: Pastikan seluruh teks dan subjek memiliki SAFE ZONE MARGIN minimal 15% dari tepi layar (${targetWidth}x${targetHeight}) agar huruf tidak terpotong di tepi frame render video.
   - 🚨 KONSISTENSI FONT & DETERMINISTIK GOOGLE FONTS: DILARANG mengganti atau menghilangkan font kaligrafi/script yang sudah ada. Muat Google Font dengan @import dan gunakan hook delayRender & continueRender dari 'remotion' dengan document.fonts.ready agar Remotion headless Puppeteer tidak fallback ke font serif default (Times New Roman)!
   - Jika user meminta tambah efek (misal "tambah partikel glow"): Sisipkan layer partikel tersebut secara rapi tanpa merusak layer yang sudah ada.
5. SINKRONISASI KEDUA KODE: Kode TSX Remotion ("code") dan HTML Preview ("previewHtml") WAJIB menerapkan perubahan surgical yang persis sama dan sinkron 100%.
6. PERTAHANKAN STRUKTUR TRANSFORMS & CONFIGURATION CONSTANTS:
   - Tetap sertakan blok konstanta konfigurasi TEPAT SATU KALI:
     // --- CONFIGURATION CONSTANTS ---
     export const DURATION = ${totalFrames};
     export const FPS = ${fps};
     export const WIDTH = ${targetWidth};
     export const HEIGHT = ${targetHeight};
   - Pertahankan '{/* USER EDITABLE TRANSFORM CONTAINER */}' dan tag pembungkus transform.
7. MANDATORI SINTAKS MUTLAK 100% BEBAS DARI SEGALA SYNTAX ERROR (STANDAR PERSIS SAMA DENGAN GENERATE AWAL):
   - DILARANG KERAS MEMOTONG KODE DI TENGAH JALAN: Kode TSX Remotion ("code") dan HTML preview ("previewHtml") WAJIB LENGKAP UTUH dari baris import pertama sampai tag penutup dan export default terakhir.
   - DILARANG ADA TAG JSX YANG TIDAK TERTUTUP (UNCLOSED TAGS):
     * SEMUA tag leaf SVG (<circle />, <path />, <line />, <rect />, <ellipse />, <polygon />, <polyline />, <stop />, <use />, <image />, fe*) WAJIB self-closing '/>'. DILARANG lupa slash '/' dan tanda '>'!
     * SEMUA kontainer JSX (<AbsoluteFill>, <svg>, <g>, <defs>, <div>, <ThreeCanvas>, <linearGradient>, <radialGradient>, <filter>, <mask>, <clipPath>) WAJIB DITUTUP BERPASANGAN EKSPLISIT sebelum </AbsoluteFill>!
     * PANTANGAN FATAL: Membiarkan tag <g>, <div>, <defs>, atau <svg> terbuka tanpa tag penutup sebelum </AbsoluteFill> akan memicu error fatal esbuild 'Expected corresponding JSX closing tag for AbsoluteFill'!
   - DILARANG KERAS MENULIS KOMENTAR DI DALAM BLOK return ( ... ):
     * Blok return (...) harus murni elemen JSX valid tanpa komentar apapun (tidak boleh //, tidak boleh /* */, dan tidak boleh {/* */}).
     * DILARANG komentar '//' di ujung baris atribut JSX (contoh fatal: fill="#fff" // komentar).
   - ATRIBUT STYLE JSX WAJIB MEMAKAI KURUNG KURAWAL GANDA:
     * style={{ width: '100%', height: '100%', display: 'block' }}. DILARANG KERAS menulis 'style=' tanpa '{{' ganda (seperti 'style=\n width: 100% }}' yang memicu syntax error '{ or JSX element expected')!
   - DILARANG LONE BRACES & PLACEHOLDER:
     * DILARANG kurung kurawal '{' berdiri sendiri di dalam tag JSX (contoh fatal: '<path {').
     * DILARANG placeholder titik tiga ('...' atau '{...}').
     * DILARANG karakter '>' atau '<' telanjang di teks JSX (selalu gunakan &gt; atau &lt;).
     * DILARANG generic arrow function ambigu seperti const fn = <T>(x: T) =>. Gunakan const fn = <T,>(x: T) =>.
   - PREVIEW HTML JAVASCRIPT HARUS 100% BERSIH: Seluruh deklarasi fungsi, loop render, dan objek Three.js/Canvas harus valid ES6 tanpa variabel undefined atau syntax error runtime.
${bgDirective ? `${bgDirective}\n` : ""}
================================================================================

KODE TSX REMOTION SAAT INI (JADIKAN DASAR UTAMA & UBAH HANYA BAGIAN YANG DIMAKSUD):
\`\`\`tsx
${sanitizedTSXInput}
\`\`\`

KODE PREVIEW HTML SAAT INI (JADIKAN DASAR UTAMA & UBAH HANYA BAGIAN YANG DIMAKSUD):
\`\`\`html
${previewHtmlCode}
\`\`\`

Output harus berupa JSON dengan struktur: 
{ 
  "code": "Kode TSX Remotion hasil modifikasi surgical (mempertahankan struktur asli, HANYA mengubah bagian yang dimaksud)", 
  "previewHtml": "Kode HTML preview hasil modifikasi surgical (mempertahankan struktur asli, HANYA mengubah bagian yang dimaksud)",
  "suggestedTitle": "Adobe Stock Title sesuai formula Fizkes & Andrey Popov ([Subject] + [Gerund] + [Object] + [Location] + [Concept]), STRICTLY 88 to 130 characters"
}`;

  const aiSettings = getAISettings();

  // 1. Support OpenRouter & 9Router Providers
  if (aiSettings.activeProvider === 'openrouter' || aiSettings.activeProvider === '9router') {
    const is9Router = aiSettings.activeProvider === '9router';
    const baseUrl = is9Router ? (aiSettings.nineRouterBaseUrl || 'https://api.9router.com/v1') : 'https://openrouter.ai/api/v1';
    const apiKey = is9Router ? aiSettings.nineRouterKey : aiSettings.openrouterKey;
    const model = is9Router ? aiSettings.nineRouterSelectedModel : aiSettings.openrouterSelectedModel;
    const providerName = is9Router ? '9Router' : 'OpenRouter';

    if (!apiKey || !apiKey.trim()) {
      throw new Error(`API Key untuk ${providerName} belum dimasukkan. Silakan buka menu Pengaturan AI & Model.`);
    }

    const surgeonInstruction = "You are a Precision Code Surgeon for Remotion TSX and WebGL/Canvas visual code. Modify ONLY targeted parts in-place. Output MUST be valid JSON with keys 'code', 'previewHtml', 'suggestedTitle'.";
    const rawResponse = await executeOpenAICompatibleChat({
      baseUrl,
      apiKey,
      model: model || (is9Router ? 'claude-3-5-sonnet' : 'anthropic/claude-3.5-sonnet'),
      systemInstruction: surgeonInstruction,
      userPrompt: prompt,
      temperature: 0.2,
      providerName,
    });

    let cleaned = (rawResponse || "").trim();
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(cleaned) as ApplyVariationResponse;
    if (parsed) {
      if (parsed.code) parsed.code = healTsxSyntaxErrors(parsed.code);
      if (parsed.previewHtml) parsed.previewHtml = healHtmlPreviewSyntax(parsed.previewHtml);
      parsed.suggestedTitle = formatFizkesPopovTitle(parsed.suggestedTitle, {
        brief: variationPrompt,
        is3D: true,
      });
      parsed.popovKeywords = generatePopovKeywords(parsed.suggestedTitle, {
        brief: variationPrompt,
      });
      parsed.suggestedKeywords = parsed.popovKeywords.all;
      return parsed;
    }
    throw new Error(`Gagal memodifikasi animasi dari provider ${providerName}.`);
  }

  // 2. Default Gemini
  const candidateModels = [
    "gemini-3.8-flash",       // Primer: gemini-3.8-flash
    "gemini-3.7-flash",       // Fallback 1: gemini-3.7-flash
    "gemini-3.6-flash",       // Fallback 2: gemini-3.6-flash
  ];

  let lastError: any = null;
  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const currentModel = candidateModels[mIdx];
    try {
      if (mIdx > 0) {
        console.warn(`[Variation Fallback Active] Model ke-${mIdx}: ${currentModel}`);
        await new Promise((res) => setTimeout(res, 1500));
      }

      const activeAi = getGeminiClient();
      const response = await activeAi.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING },
              previewHtml: { type: Type.STRING },
              suggestedTitle: {
                type: Type.STRING,
                description: "Adobe Stock Title strictly following Fizkes & Andrey Popov formula ([Subject] + [Gerund] + [Object] + [Location] + [Concept]), STRICTLY 88 to 130 characters long without truncation",
              },
            },
            required: ["code", "previewHtml", "suggestedTitle"],
          },
          maxOutputTokens: 65536,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
          systemInstruction:
            "You are a Precision Code Surgeon for Remotion TSX and WebGL/Canvas visual code. Your mission is to apply STRICT, SURGICAL, IN-PLACE EDITS to existing animations based on user requests. CRITICAL RULE: DO NOT REWRITE OR OVERHAUL UNRELATED PARTS OF THE CODE. 95%+ of existing geometry, subject shapes, structure, and animation logic must remain 100% untouched. You only modify the exact properties, colors, speeds, sizes, or elements specifically targeted in the user's checklist or prompt. Both Remotion TSX ('code') and HTML preview ('previewHtml') must be kept in perfect sync. MANDATORY ZOOM OUT / SCALE: If user asks for 'zoom out' or 'perkecil' (e.g. 'zoom out 1.2x'), you MUST REDUCE scale (scale < 1.0, e.g. scale: 0.8 or 0.83). NEVER increase scale or set scale to 1.2 which zooms in and cuts off edges! Ensure safe margin padding of at least 15% from left and right boundaries. MANDATORY FONT PRESERVATION: Keep font-family identical. For typography in TSX, import delayRender & continueRender and use document.fonts.ready with <style>{`@import url('https://fonts.googleapis.com/...');`}</style> so Remotion headless rendering NEVER falls back to default Times New Roman! MANDATORY ZERO-DEFECT TSX SYNTAX (IDENTICAL TO INITIAL GENERATION QUALITY): Absolutely NO comments inside return (...), JSX style attributes MUST use double curly braces: style={{ ... }} (NEVER write 'style=' without '{{'), NO lone '{' in JSX tags, NO ellipsis '...' placeholders, ALL SVG leaf tags must be strictly self-closing '/>', and ALL container tags (<g>, <defs>, <svg>, <div>, <linearGradient>, <ThreeCanvas>) MUST be explicitly closed with proper matching tags before </AbsoluteFill> so that NO 'Expected corresponding JSX closing tag for AbsoluteFill' error can ever occur. Full code must be complete from imports to export default without truncation.",
        },
      });

      const rawText = response.text?.trim() || "{}";
      let cleaned = rawText;
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      const parsed = JSON.parse(cleaned) as ApplyVariationResponse;
      if (parsed) {
        if (parsed.code) {
          parsed.code = healTsxSyntaxErrors(parsed.code);
        }
        if (parsed.previewHtml) {
          parsed.previewHtml = healHtmlPreviewSyntax(parsed.previewHtml);
        }
        parsed.suggestedTitle = formatFizkesPopovTitle(parsed.suggestedTitle, {
          brief: variationPrompt,
          is3D: true,
        });
        parsed.popovKeywords = generatePopovKeywords(parsed.suggestedTitle, {
          brief: variationPrompt,
        });
        parsed.suggestedKeywords = parsed.popovKeywords.all;
      }
      return parsed;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Variation Model Attempt Failed] ${currentModel}:`, err?.message || err);
    }
  }

  throw lastError || new Error("Semua model variasi gagal.");
}

/**
 * Fast client-side compiler & sandbox that parses Remotion TSX code (React hooks, AbsoluteFill,
 * interpolate, spring, SVG, Canvas, Three.js, CSS styles) and executes the actual component
 * in an interactive standalone sandbox preview immediately upon file import (0s latency).
 */
export function createFastClientPreviewHtmlFromTsx(
  tsxCode: string,
  width: number = 3840,
  height: number = 2160,
  fps: number = 60,
  duration: number = 10
): string {
  const totalFrames = duration * fps;
  const centerX = Math.round(width / 2);
  const centerY = Math.round(height / 2);

  // 1. Extract any Google Fonts or <style> tags
  const styleMatches: string[] = [];
  const styleRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let sMatch;
  while ((sMatch = styleRegex.exec(tsxCode)) !== null) {
    const cleanCss = sMatch[1]
      .replace(/\{\s*`([\s\S]*?)`\s*\}/g, '$1')
      .replace(/\{\s*['"]([\s\S]*?)['"]\s*\}/g, '$1');
    styleMatches.push(cleanCss);
  }

  // 2. Extract SVG blocks if present as visual fallback
  let svgContent = '';
  const svgOpenIdx = tsxCode.indexOf('<svg');
  const svgCloseIdx = tsxCode.lastIndexOf('</svg>');
  if (svgOpenIdx !== -1 && svgCloseIdx !== -1 && svgCloseIdx > svgOpenIdx) {
    let rawSvg = tsxCode.substring(svgOpenIdx, svgCloseIdx + 6);
    rawSvg = rawSvg
      .replace(/className=/g, 'class=')
      .replace(/viewBox=\{`[^`]*`\}/g, `viewBox="0 0 ${width} ${height}"`)
      .replace(/viewBox=\{['"][^'"]*['"]\}/g, `viewBox="0 0 ${width} ${height}"`)
      .replace(/width=\{[^}]+\}/g, `width="${width}"`)
      .replace(/height=\{[^}]+\}/g, `height="${height}"`)
      .replace(/transform=\{`translate\(\$\{[^}]+\},\s*\$\{[^}]+\}\)`\}/g, `transform="translate(${centerX}, ${centerY})"`)
      .replace(/transform=\{`([^`]+)`\}/g, 'transform="$1"')
      .replace(/transform=\{['"]([^'"]+)['"]\}/g, 'transform="$1"')
      .replace(/style=\{\{([^}]+)\}\}/g, (_, inner) => {
        const cssStr = inner
          .replace(/([a-zA-Z]+):\s*['"`]?([^,'"`}]+)['"`]?/g, (_: string, prop: string, val: string) => {
            const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${kebab}: ${val.trim()};`;
          });
        return `style="${cssStr.trim()}"`;
      })
      .replace(/fill=\{['"]([^'"]+)['"]\}/g, 'fill="$1"')
      .replace(/stroke=\{['"]([^'"]+)['"]\}/g, 'stroke="$1"')
      .replace(/opacity=\{([\d.]+)\}/g, 'opacity="$1"');

    svgContent = rawSvg;
  }

  // Check if Three.js is referenced
  const hasThree = tsxCode.includes('THREE.') || tsxCode.includes('@remotion/three') || tsxCode.includes('ThreeCanvas');

  // Background color extraction
  let bgColor = '#060608';
  const bgMatch = tsxCode.match(/backgroundColor:\s*['"]([^'"]+)['"]/);
  if (bgMatch) bgColor = bgMatch[1];

  // 3. Transpile TSX to pure JavaScript using Sucrase
  let transpiledJs = '';
  let transpileError = '';
  try {
    const cleanCode = sanitizeRemotionConstants(tsxCode);
    const result = sucraseTransform(cleanCode, {
      transforms: ['jsx', 'typescript', 'imports'],
      production: true,
    });
    transpiledJs = result.code || '';
  } catch (err: any) {
    transpileError = err?.message || String(err);
    console.warn('[Remotion TSX Fast Transpile Notice]', transpileError);
  }

  // Escape any closing script tags inside the transpiled JS to prevent breaking the HTML document
  const safeTranspiledJs = transpiledJs.replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Imported Remotion Composition Preview</title>
  <!-- React 18 & ReactDOM UMD Runtime -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
  <!-- Three.js UMD -->
  ${hasThree ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>' : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
      background: ${bgColor};
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
      background: ${bgColor};
    }
    #root {
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      width: 100%;
      height: 100%;
      display: block;
      max-width: 100%;
      max-height: 100%;
      shape-rendering: geometricPrecision;
      text-rendering: geometricPrecision;
    }
    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
    ${styleMatches.join('\n')}
  </style>
</head>
<body>
  <div id="visual-editor-wrapper">
    <div id="root"></div>
  </div>

  <script>
    (function() {
      const WIDTH = ${width};
      const HEIGHT = ${height};
      const FPS = ${fps};
      const DURATION = ${duration};
      const TOTAL_FRAMES = ${totalFrames};
      const CX = ${centerX};
      const CY = ${centerY};

      // 1. Remotion Context & React Hook Mock
      const RemotionContext = React.createContext({
        frame: 0,
        fps: FPS,
        width: WIDTH,
        height: HEIGHT,
        durationInFrames: TOTAL_FRAMES,
      });

      const Remotion = {
        useCurrentFrame: function() {
          const ctx = React.useContext(RemotionContext);
          return ctx ? ctx.frame : 0;
        },
        useVideoConfig: function() {
          const ctx = React.useContext(RemotionContext);
          return {
            fps: ctx ? ctx.fps : FPS,
            width: ctx ? ctx.width : WIDTH,
            height: ctx ? ctx.height : HEIGHT,
            durationInFrames: ctx ? ctx.durationInFrames : TOTAL_FRAMES,
            id: 'imported-composition'
          };
        },
        AbsoluteFill: function(props) {
          const customStyle = Object.assign({
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }, props.style || {});
          return React.createElement('div', Object.assign({}, props, { style: customStyle }), props.children);
        },
        Sequence: function(props) {
          const ctx = React.useContext(RemotionContext);
          const from = props.from || 0;
          const dur = props.durationInFrames !== undefined ? props.durationInFrames : Infinity;
          if (ctx.frame < from || ctx.frame >= (from + dur)) return null;
          const innerFrame = ctx.frame - from;
          const nextCtx = Object.assign({}, ctx, {
            frame: innerFrame,
            durationInFrames: Math.min(ctx.durationInFrames, dur)
          });
          const content = props.layout === 'none' ? props.children : React.createElement('div', {
            style: Object.assign({ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }, props.style || {})
          }, props.children);
          return React.createElement(RemotionContext.Provider, { value: nextCtx }, content);
        },
        Series: function(props) {
          return React.createElement('div', null, props.children);
        },
        interpolate: function(input, inputRange, outputRange, options) {
          const opts = options || {};
          const exLeft = opts.extrapolateLeft || opts.extrapolate || 'extend';
          const exRight = opts.extrapolateRight || opts.extrapolate || 'extend';
          if (!inputRange || !outputRange || inputRange.length === 0 || outputRange.length === 0) return 0;
          if (input <= inputRange[0]) {
            if (exLeft === 'clamp') return outputRange[0];
            if (exLeft === 'identity') return input;
          }
          if (input >= inputRange[inputRange.length - 1]) {
            if (exRight === 'clamp') return outputRange[outputRange.length - 1];
            if (exRight === 'identity') return input;
          }
          for (let i = 1; i < inputRange.length; i++) {
            if (input <= inputRange[i]) {
              const inMin = inputRange[i - 1];
              const inMax = inputRange[i];
              const outMin = outputRange[i - 1];
              const outMax = outputRange[i];
              const p = (inMax === inMin) ? 0 : (input - inMin) / (inMax - inMin);
              const ep = opts.easing ? opts.easing(p) : p;
              return outMin + (outMax - outMin) * ep;
            }
          }
          return outputRange[outputRange.length - 1];
        },
        spring: function(config) {
          const cfg = config || {};
          const f = cfg.frame !== undefined ? cfg.frame : 0;
          const fFps = cfg.fps || FPS;
          const sc = cfg.config || {};
          const damping = sc.damping !== undefined ? sc.damping : 10;
          const mass = sc.mass !== undefined ? sc.mass : 1;
          const stiffness = sc.stiffness !== undefined ? sc.stiffness : 100;
          const t = f / fFps;
          const w0 = Math.sqrt(stiffness / mass);
          const zeta = damping / (2 * Math.sqrt(stiffness * mass));
          let progress = 0;
          if (zeta < 1) {
            const wd = w0 * Math.sqrt(1 - zeta * zeta);
            progress = 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
          } else {
            progress = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
          }
          if (sc.overshootClamping && progress > 1) progress = 1;
          return Math.max(0, Math.min(2, progress));
        },
        Easing: {
          linear: function(t) { return t; },
          ease: function(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
          bezier: function() { return function(t) { return t; }; },
          in: function(fn) { return fn || function(t) { return t * t; }; },
          out: function(fn) { return fn || function(t) { return t * (2 - t); }; },
          inOut: function(fn) { return fn || function(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }; },
          quad: function(t) { return t * t; },
          cubic: function(t) { return t * t * t; },
          sin: function(t) { return 1 - Math.cos((t * Math.PI) / 2); },
          circle: function(t) { return 1 - Math.sqrt(1 - t * t); },
          exp: function(t) { return t === 0 ? 0 : Math.pow(2, 10 * (t - 1)); }
        },
        random: function(seed) {
          let s = typeof seed === 'number' ? seed : 42;
          const x = Math.sin(s++) * 10000;
          return x - Math.floor(x);
        },
        delayRender: function() { return 1; },
        continueRender: function() {},
        staticFile: function(f) { return f; },
        ThreeCanvas: function(props) {
          return React.createElement('div', Object.assign({
            style: Object.assign({ width: '100%', height: '100%', position: 'absolute', inset: 0 }, props.style || {})
          }, props), props.children);
        }
      };

      window.Remotion = Remotion;

      // 2. Lucide Icon Mock Proxy
      const LucideIconProxy = new Proxy({}, {
        get: function(target, prop) {
          return function(props) {
            const p = props || {};
            const size = p.size || 24;
            const color = p.color || p.stroke || 'currentColor';
            return React.createElement('svg', {
              width: size,
              height: size,
              viewBox: '0 0 24 24',
              fill: p.fill || 'none',
              stroke: color,
              strokeWidth: p.strokeWidth || 2,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              style: p.style,
              className: p.className
            }, React.createElement('circle', { cx: 12, cy: 12, r: 8 }));
          };
        }
      });

      // 3. Module Resolution Shim (CommonJS / ESModule Bridge)
      const exports = {};
      const module = { exports: exports };
      function require(name) {
        if (name === 'react') return window.React;
        if (name === 'react-dom') return window.ReactDOM;
        if (name === 'react-dom/client') return window.ReactDOM;
        if (name === 'remotion' || name.startsWith('@remotion/')) return window.Remotion;
        if (name === 'three') return window.THREE;
        if (name === 'lucide-react') return LucideIconProxy;
        return window[name] || {};
      }

      // 4. Execute the Transpiled Remotion TSX Code
      try {
        ${safeTranspiledJs}
      } catch (execErr) {
        console.warn("[Remotion Execution Error]", execErr);
      }

      // 5. Detect Root Component
      let RootComponent = exports.default;
      if (!RootComponent) {
        const keys = Object.keys(exports);
        for (let i = 0; i < keys.length; i++) {
          if (typeof exports[keys[i]] === 'function' && keys[i] !== 'require') {
            RootComponent = exports[keys[i]];
            break;
          }
        }
      }

      // 6. Error Boundary to protect rendering
      class RemotionErrorBoundary extends React.Component {
        constructor(props) {
          super(props);
          this.state = { hasError: false, error: null };
        }
        static getDerivedStateFromError(error) {
          return { hasError: true, error: error };
        }
        componentDidCatch(error, errorInfo) {
          console.warn("[Remotion Component Error]", error, errorInfo);
        }
        render() {
          if (this.state.hasError) {
            return ${svgContent ? `React.createElement('div', {
              style: { width: '100%', height: '100%' },
              dangerouslySetInnerHTML: { __html: ${JSON.stringify(svgContent)} }
            })` : `React.createElement('div', {
              style: {
                padding: '24px',
                color: '#fca5a5',
                fontFamily: 'monospace',
                fontSize: '13px',
                backgroundColor: 'rgba(20, 10, 10, 0.95)',
                border: '1px solid #7f1d1d',
                borderRadius: '8px',
                margin: '20px',
                lineHeight: '1.5'
              }
            }, [
              React.createElement('div', { key: 't', style: { fontWeight: 'bold', fontSize: '15px', color: '#f87171', marginBottom: '8px' } }, 'Komponen TSX Terimpor'),
              React.createElement('div', { key: 'm' }, String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error))
            ])`};
          }
          return this.props.children;
        }
      }

      // 7. Interactive Sandbox Runner connected to window.draw & postMessage
      function SandboxRunner() {
        const [frame, setFrame] = React.useState(0);

        React.useEffect(() => {
          window.draw = function(progress, f) {
            const targetFrame = f !== undefined ? f : Math.floor((progress || 0) * TOTAL_FRAMES);
            setFrame(targetFrame);
          };
          window.render = window.draw;

          const onMessage = function(e) {
            if (e.data && e.data.type === 'render') {
              const targetFrame = e.data.frame !== undefined ? e.data.frame : Math.floor((e.data.progress || 0) * TOTAL_FRAMES);
              setFrame(targetFrame);
            }
          };
          window.addEventListener('message', onMessage);

          return function() {
            window.removeEventListener('message', onMessage);
          };
        }, []);

        const ctxValue = {
          frame: frame,
          fps: FPS,
          width: WIDTH,
          height: HEIGHT,
          durationInFrames: TOTAL_FRAMES
        };

        const elementToRender = RootComponent 
          ? React.createElement(RootComponent)
          : ${svgContent ? `React.createElement('div', {
              style: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
              dangerouslySetInnerHTML: { __html: ${JSON.stringify(svgContent)} }
            })` : `React.createElement('div', {
              style: { color: '#94a3b8', fontSize: '18px', textAlign: 'center', padding: '40px' }
            }, 'Remotion TSX Aktif')`};

        return React.createElement(RemotionContext.Provider, { value: ctxValue },
          React.createElement(RemotionErrorBoundary, null, elementToRender)
        );
      }

      // 8. Mount to DOM
      const rootDom = document.getElementById('root');
      if (rootDom && window.ReactDOM) {
        if (window.ReactDOM.createRoot) {
          window.ReactDOM.createRoot(rootDom).render(React.createElement(SandboxRunner));
        } else if (window.ReactDOM.render) {
          window.ReactDOM.render(React.createElement(SandboxRunner), rootDom);
        }
      }

      // Autonomous Standalone Loop (when not driven by parent host)
      let isExternalHost = false;
      let autoProgress = 0;
      function autoLoop() {
        if (!isExternalHost && !document.hidden) {
          autoProgress = (autoProgress + (1 / TOTAL_FRAMES)) % 1;
          if (window.draw) window.draw(autoProgress, Math.floor(autoProgress * TOTAL_FRAMES));
          requestAnimationFrame(autoLoop);
        }
      }
      const autoTimer = setTimeout(function() {
        if (!isExternalHost) requestAnimationFrame(autoLoop);
      }, 300);

      window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'render') {
          isExternalHost = true;
          clearTimeout(autoTimer);
        }
      });
    })();
  </script>
</body>
</html>`;
}

export interface GeneratePreviewFromTsxParams {
  tsxCode: string;
  title?: string;
  width?: number;
  height?: number;
  fps?: number;
  duration?: number;
  bgOverride?: "none" | "greenscreen" | "black" | "white" | "alpha";
}

export interface GeneratePreviewFromTsxResponse {
  previewHtml: string;
  suggestedTitle?: string;
  detectedObjects?: string[];
}

export async function generatePreviewFromTsxService(
  params: GeneratePreviewFromTsxParams
): Promise<GeneratePreviewFromTsxResponse> {
  const {
    tsxCode,
    title,
    width = 3840,
    height = 2160,
    fps = 60,
    duration = 10,
    bgOverride,
  } = params;

  const sanitizedTSX = sanitizeRemotionConstants(tsxCode);

  const prompt = `Anda adalah Spesialis Kompilator Remotion TSX ke Standalone HTML & Vanilla JS Animation.
PENGGUNA MENGIMPOR BERKAS REMOTION TSX DARI PC DENGAN JUDUL: "${title || 'Imported Animation'}".
TUGAS ANDA:
Terjemahkan dan susun kode HTML & JavaScript standalone 100% mandiri ("previewHtml") yang mereplikasi persis seluruh visual, bentuk geometri, warna, layering, tipografi Google Fonts, dan gerakan animasi dari kode Remotion TSX berikut ke dalam kanvas berukuran ${width}x${height} @ ${fps} FPS.

KRITERIA WAJIB PREVIEW HTML:
1. OUTPUT: Kode HTML lengkap (dari <!DOCTYPE html> sampai </html>).
2. ANIMASI SEAMLESS 60 FPS:
   - Sediakan fungsi 'window.draw = function(progress, frame) { ... }' atau 'window.render' yang menerima nilai progress (0.0 hingga 1.0) dan nomor frame (0 hingga ${duration * fps - 1}).
   - Animasi WAJIB looping 100% mulus (seamless infinite loop) menggunakan rumus trigonometri harmonik.
3. KESETIAAN VISUAL 100%:
   - Ambil seluruh path kurva Bezier, SVG elements, CSS styling, gradient defs, Three.js mesh, atau canvas drawing dari kode Remotion TSX tersebut.
   - Posisikan di tengah kanvas (${Math.round(width / 2)}, ${Math.round(height / 2)}) dengan transform scale yang proporsional.
4. ZERO SYNTAX ERROR: Bebas dari error runtime JavaScript, variabel undefined, atau tag tidak tertutup.
${bgOverride === 'alpha' ? '5. LATAR BELAKANG TRANSPARAN: Jadikan background transparan murni.' : ''}

KODE REMOTION TSX SUMBER:
\`\`\`tsx
${sanitizedTSX}
\`\`\`

Berikan output JSON dengan format:
{
  "previewHtml": "<!DOCTYPE html>...</html>",
  "suggestedTitle": "Judul komersial sesuai Andrey Popov 88-130 karakter",
  "detectedObjects": ["Objek 1", "Objek 2"]
}`;

  const aiSettings = getAISettings();
  if (aiSettings.activeProvider === 'openrouter' || aiSettings.activeProvider === '9router') {
    const is9Router = aiSettings.activeProvider === '9router';
    const baseUrl = is9Router ? (aiSettings.nineRouterBaseUrl || 'https://api.9router.com/v1') : 'https://openrouter.ai/api/v1';
    const apiKey = is9Router ? aiSettings.nineRouterKey : aiSettings.openrouterKey;
    const model = is9Router ? aiSettings.nineRouterSelectedModel : aiSettings.openrouterSelectedModel;
    const providerName = is9Router ? '9Router' : 'OpenRouter';

    const rawResponse = await executeOpenAICompatibleChat({
      baseUrl,
      apiKey,
      model: model || (is9Router ? 'claude-3-5-sonnet' : 'anthropic/claude-3.5-sonnet'),
      systemInstruction: "You are a Remotion TSX to Standalone HTML & Canvas/SVG preview compiler. Generate ultra-clean, 60fps standalone HTML previews that replicate the Remotion composition visually with window.draw(progress, frame).",
      userPrompt: prompt,
      providerName,
    });

    let cleaned = (rawResponse || "{}").trim();
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    const parsed = JSON.parse(cleaned) as GeneratePreviewFromTsxResponse;
    if (parsed.previewHtml) {
      parsed.previewHtml = healHtmlPreviewSyntax(parsed.previewHtml);
      return parsed;
    }
    throw new Error(`Model ${model} dari ${providerName} tidak menghasilkan previewHtml`);
  }

  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
  ];

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const currentModel = candidateModels[mIdx];
    try {
      const activeAi = getGeminiClient();
      const response = await activeAi.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              previewHtml: { type: Type.STRING },
              suggestedTitle: { type: Type.STRING },
              detectedObjects: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["previewHtml"],
          },
          maxOutputTokens: 65536,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
          systemInstruction:
            "You are a Remotion TSX to Standalone HTML & Canvas/SVG preview compiler. Generate ultra-clean, 60fps standalone HTML previews that replicate the Remotion composition visually with window.draw(progress, frame).",
        },
      });

      const rawText = response.text?.trim() || "{}";
      let cleaned = rawText;
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      const parsed = JSON.parse(cleaned) as GeneratePreviewFromTsxResponse;
      if (parsed && parsed.previewHtml) {
        parsed.previewHtml = healHtmlPreviewSyntax(parsed.previewHtml);
        return parsed;
      }
    } catch (err: any) {
      console.warn(`[Preview Generator Attempt Failed] ${currentModel}:`, err?.message || err);
    }
  }

  // Fallback to fast client generator if all models fail
  return {
    previewHtml: createFastClientPreviewHtmlFromTsx(tsxCode, width, height, fps, duration),
    suggestedTitle: title,
    detectedObjects: ["Subjek Terimpor"],
  };
}
