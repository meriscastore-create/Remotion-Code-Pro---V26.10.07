/**
 * Utility for persisting generated backgrounds, active drafts, and bulk generation queues
 * using IndexedDB with graceful fallback to localStorage.
 */

const DB_NAME = 'vremotion_persist_db';
const DB_VERSION = 4;

export interface BulkTsxItem {
  id: string;
  name: string;
  title: string;
  code: string;
  previewHtml?: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  totalFrames: number;
  isLandscape: boolean;
  resolutionLabel: string;
  status: 'idle' | 'rendering' | 'completed' | 'error' | 'cancelled';
  progressFrame?: number;
  progressPercent?: number;
  renderedVideo?: {
    fileName: string;
    downloadUrl: string;
    sizeMB: string;
    codecLabel: string;
    hasAlpha: boolean;
    extension: string;
    blobUrl?: string;
  };
  errorMsg?: string;
  importedFrom: 'file' | 'local_storage' | 'draft';
  importedAt: number;
}

export interface StoredTsxRecord {
  id: string;
  name: string;
  title: string;
  code: string;
  source: string;
  savedAt: number;
}

export interface GeneratedBgItem {
  title: string;
  code: string;
  previewHtml: string;
  detectedObjects: string[];
  suggestedVariations: any[];
}

export interface BulkQueueTask {
  id: string;
  totalCount: number;
  completedCount: number;
  mode: 'auto_generate' | 'multi_variation' | 'bulk_per_line';
  activeBrief: string;
  useCustomConcept: boolean;
  customConcept: string;
  directGenerateMode: string;
  isPremium3D: boolean;
  duration: number;
  fps: number;
  forceLandscape?: boolean;
  layoutPreset?: string;
  bgOverride?: 'none' | 'greenscreen' | 'black' | 'white' | 'alpha';
  resolution?: '4K' | '2K';
  selectedIconStyle?: string;
  isStyleAnimationEnabled?: boolean;
  results: GeneratedBgItem[];
  usedArchetypes?: string[];
  inputMode?: 'reference' | 'prompt';
  referenceMedia?: string | null;
  referenceType?: 'video' | 'image' | null;
  bulkLinePrompts?: string[];
  isBulkPerLine?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DraftData {
  generatedTSXCode?: string;
  previewHtmlCode?: string;
  workspaceName?: string;
  brief?: string;
  mode?: 'reference' | 'prompt';
  reference?: string | null;
  refType?: 'video' | 'image' | null;
  generatedBgList?: GeneratedBgItem[];
  selectedBgIndex?: number;
  duration?: number;
  fps?: number;
  selectedIconStyle?: string;
  isStyleAnimationEnabled?: boolean;
  directGenerateMode?: 'combination' | 'non-combination';
  useCustomConcept?: boolean;
  customConcept?: string;
  isBulkPerLineMode?: boolean;
  bulkPerLineText?: string;
  panX?: number;
  panY?: number;
  zoom?: number;
  isPremium3D?: boolean;
  isSeamlessBackground?: boolean;
  forceLandscape?: boolean;
  layoutPreset?: string;
  bgOverride?: 'none' | 'greenscreen' | 'black' | 'white' | 'alpha';
  resolution?: '4K' | '2K';
  savedAt?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('bulk_queue')) {
        db.createObjectStore('bulk_queue');
      }
      if (!db.objectStoreNames.contains('active_draft')) {
        db.createObjectStore('active_draft');
      }
      if (!db.objectStoreNames.contains('folder_handles')) {
        db.createObjectStore('folder_handles');
      }
      if (!db.objectStoreNames.contains('bulk_tsx_queue')) {
        db.createObjectStore('bulk_tsx_queue');
      }
      if (!db.objectStoreNames.contains('saved_tsx_library')) {
        db.createObjectStore('saved_tsx_library');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('folder_handles', 'readwrite');
    tx.objectStore('folder_handles').put(handle, 'root_dir');
  } catch (e) {
    console.warn('Gagal menyimpan dir handle ke IndexedDB:', e);
  }
}

export async function getStoredDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('folder_handles', 'readonly');
    const req = tx.objectStore('folder_handles').get('root_dir');
    return await new Promise<FileSystemDirectoryHandle | null>((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

let cachedDirHandle: FileSystemDirectoryHandle | null = null;

export async function saveFileToMotionBackgroundsFolder(fileName: string, content: string): Promise<boolean> {
  const FOLDER_NAME = 'Motion Backgrounds TSX';
  
  // Try File System Access API
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      if (!cachedDirHandle) {
        cachedDirHandle = await getStoredDirHandle();
      }
      if (cachedDirHandle) {
        const queryPerm = await (cachedDirHandle as any).queryPermission({ mode: 'readwrite' });
        if (queryPerm !== 'granted') {
          const reqPerm = await (cachedDirHandle as any).requestPermission({ mode: 'readwrite' });
          if (reqPerm !== 'granted') {
            cachedDirHandle = null;
          }
        }
      }
      if (!cachedDirHandle) {
        cachedDirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'downloads'
        });
        if (cachedDirHandle) {
          await storeDirHandle(cachedDirHandle);
        }
      }
      if (cachedDirHandle) {
        // Buat atau dapatkan folder "Motion Backgrounds TSX" secara otomatis
        const motionDir = await cachedDirHandle.getDirectoryHandle(FOLDER_NAME, { create: true });
        const fileHandle = await motionDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
      }
    } catch (e) {
      console.warn('Direct File System write cancelled or not supported, falling back to standard download link:', e);
    }
  }

  // Fallback standar browser download link
  const mimeType = fileName.endsWith('.xmp') || fileName.endsWith('.xml')
    ? 'application/xml;charset=utf-8'
    : 'text/typescript;charset=utf-8';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
  return true;
}

export async function saveBinaryVideoToMotionBackgroundsFolder(fileName: string, blob: Blob): Promise<boolean> {
  const FOLDER_NAME = 'Motion Backgrounds Video';

  // Try File System Access API if user already granted directory handle
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window && cachedDirHandle) {
    try {
      const queryPerm = await (cachedDirHandle as any).queryPermission({ mode: 'readwrite' });
      if (queryPerm === 'granted') {
        const videoDir = await cachedDirHandle.getDirectoryHandle(FOLDER_NAME, { create: true });
        const fileHandle = await videoDir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      }
    } catch (e) {
      console.warn('Direct video file write fallback to download link:', e);
    }
  }

  // Standard browser download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
  return true;
}

export async function saveBulkQueueTask(task: BulkQueueTask): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('bulk_queue', 'readwrite');
    tx.objectStore('bulk_queue').put(task, 'active_job');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    try {
      localStorage.setItem('vremotion_active_bulk_job', JSON.stringify(task));
    } catch (ex) {
      console.warn('Gagal menyimpan tugas bulk queue ke localStorage fallback:', ex);
    }
  }
}

export async function getBulkQueueTask(): Promise<BulkQueueTask | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('bulk_queue', 'readonly');
    const req = tx.objectStore('bulk_queue').get('active_job');
    const result = await new Promise<BulkQueueTask | null>((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (result) return result;
  } catch (e) {
    // fallback ke localStorage
  }

  try {
    const val = localStorage.getItem('vremotion_active_bulk_job');
    return val ? JSON.parse(val) : null;
  } catch (ex) {
    return null;
  }
}

export async function clearBulkQueueTask(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('bulk_queue', 'readwrite');
    tx.objectStore('bulk_queue').delete('active_job');
  } catch (e) {
    // fallback
  }
  try {
    localStorage.removeItem('vremotion_active_bulk_job');
  } catch (e) {}
}

export async function saveActiveDraft(draft: DraftData): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('active_draft', 'readwrite');
    tx.objectStore('active_draft').put(draft, 'current');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    try {
      localStorage.setItem('vremotion_active_draft_v2', JSON.stringify(draft));
    } catch (ex) {
      console.warn('Gagal menyimpan draf ke localStorage fallback:', ex);
    }
  }
}

export async function getActiveDraft(): Promise<DraftData | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('active_draft', 'readonly');
    const req = tx.objectStore('active_draft').get('current');
    const result = await new Promise<DraftData | null>((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (result) return result;
  } catch (e) {
    // fallback
  }

  try {
    const val = localStorage.getItem('vremotion_active_draft_v2');
    return val ? JSON.parse(val) : null;
  } catch (ex) {
    return null;
  }
}

export async function clearActiveDraft(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('active_draft', 'readwrite');
    tx.objectStore('active_draft').delete('current');
  } catch (e) {
    // fallback
  }
  try {
    localStorage.removeItem('vremotion_active_draft_v2');
  } catch (e) {}
}

export async function saveBulkTsxQueue(items: BulkTsxItem[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('bulk_tsx_queue', 'readwrite');
    tx.objectStore('bulk_tsx_queue').put(items, 'active_queue');
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (e) {
    // IndexedDB fallback
  }

  try {
    // Save lightweight version without heavy blob URLs
    const sanitized = items.map(item => ({
      ...item,
      renderedVideo: item.renderedVideo ? {
        ...item.renderedVideo,
        blobUrl: undefined,
      } : undefined
    }));
    localStorage.setItem('vremotion_bulk_tsx_queue_v1', JSON.stringify(sanitized));
  } catch (ex) {
    console.warn('Gagal menyimpan bulk TSX queue ke localStorage:', ex);
  }
}

export async function getBulkTsxQueue(): Promise<BulkTsxItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('bulk_tsx_queue', 'readonly');
    const req = tx.objectStore('bulk_tsx_queue').get('active_queue');
    const result = await new Promise<BulkTsxItem[] | null>((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (result && Array.isArray(result) && result.length > 0) return result;
  } catch (e) {
    // fallback
  }

  try {
    const val = localStorage.getItem('vremotion_bulk_tsx_queue_v1');
    return val ? JSON.parse(val) : [];
  } catch (ex) {
    return [];
  }
}

export async function clearBulkTsxQueue(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('bulk_tsx_queue', 'readwrite');
    tx.objectStore('bulk_tsx_queue').delete('active_queue');
  } catch (e) {
    // fallback
  }
  try {
    localStorage.removeItem('vremotion_bulk_tsx_queue_v1');
  } catch (e) {}
}

export async function saveTsxToStoredLibrary(record: Omit<StoredTsxRecord, 'id' | 'savedAt'> & { id?: string }): Promise<StoredTsxRecord> {
  const fullRecord: StoredTsxRecord = {
    id: record.id || `tsx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: record.name,
    title: record.title,
    code: record.code,
    source: record.source || 'local_storage',
    savedAt: Date.now(),
  };

  try {
    const db = await openDB();
    const tx = db.transaction('saved_tsx_library', 'readwrite');
    tx.objectStore('saved_tsx_library').put(fullRecord, fullRecord.id);
  } catch (e) {
    // fallback
  }

  try {
    const currentList = await getStoredTsxLibrary();
    const filtered = currentList.filter(item => item.id !== fullRecord.id);
    const updated = [fullRecord, ...filtered].slice(0, 50);
    localStorage.setItem('vremotion_saved_tsx_library_v1', JSON.stringify(updated));
  } catch (ex) {
    console.warn('Gagal menyimpan TSX ke library localStorage:', ex);
  }

  return fullRecord;
}

export async function getStoredTsxLibrary(): Promise<StoredTsxRecord[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('saved_tsx_library', 'readonly');
    const store = tx.objectStore('saved_tsx_library');
    const req = store.getAll();
    const result = await new Promise<StoredTsxRecord[]>((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    if (result && result.length > 0) return result.sort((a, b) => b.savedAt - a.savedAt);
  } catch (e) {
    // fallback
  }

  try {
    const val = localStorage.getItem('vremotion_saved_tsx_library_v1');
    return val ? JSON.parse(val) : [];
  } catch (ex) {
    return [];
  }
}

export async function deleteStoredTsxRecord(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('saved_tsx_library', 'readwrite');
    tx.objectStore('saved_tsx_library').delete(id);
  } catch (e) {}

  try {
    const current = await getStoredTsxLibrary();
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem('vremotion_saved_tsx_library_v1', JSON.stringify(updated));
  } catch (ex) {}
}

export async function getAllLocalStoredTsxSources(): Promise<StoredTsxRecord[]> {
  const recordsMap = new Map<string, StoredTsxRecord>();

  // 1. Dari stored library
  try {
    const libraryItems = await getStoredTsxLibrary();
    for (const item of libraryItems) {
      if (item.code && item.code.trim()) {
        recordsMap.set(item.name || item.id, item);
      }
    }
  } catch (e) {}

  // 2. Dari active draft
  try {
    const draft = await getActiveDraft();
    if (draft && draft.generatedTSXCode && draft.generatedTSXCode.trim()) {
      const draftName = draft.workspaceName ? `${draft.workspaceName}.tsx` : 'Active_Draft.tsx';
      recordsMap.set('current_active_draft', {
        id: 'draft_current',
        name: draftName,
        title: draft.workspaceName || 'Active Draft Remotion',
        code: draft.generatedTSXCode,
        source: 'Active Draft (Local Storage)',
        savedAt: Date.now(),
      });
    }

    // Dari sub-concepts generatedBgList dalam draft
    if (draft && Array.isArray(draft.generatedBgList)) {
      draft.generatedBgList.forEach((bg, idx) => {
        if (bg.code && bg.code.trim()) {
          const bgName = `${(bg.title || `Concept_${idx + 1}`).replace(/[^\w\s-]/g, '')}.tsx`;
          recordsMap.set(`draft_bg_${idx}`, {
            id: `draft_bg_${idx}`,
            name: bgName,
            title: bg.title || `Sub Concept ${idx + 1}`,
            code: bg.code,
            source: 'Draft Sub-Concept (Local Storage)',
            savedAt: Date.now() - (idx * 60000),
          });
        }
      });
    }
  } catch (e) {}

  // 3. Dari localStorage draft v2 & saved history
  try {
    const rawHistory = localStorage.getItem('vremotion_saved_history_v3');
    if (rawHistory) {
      const historyItems: any[] = JSON.parse(rawHistory);
      // History has name and workspace, check if code can be retrieved
    }
  } catch (e) {}

  return Array.from(recordsMap.values());
}

