/**
 * IndexedDB helper for persisting large video files and media assets
 * Prevents blob URL revocation and browser quota crashes on refresh.
 */

const DB_NAME = "zoya_media_store";
const DB_VERSION = 1;
const STORE_NAME = "media_assets";
const VIDEO_KEY = "background_video";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

/**
 * Saves a video file or blob to IndexedDB
 */
export async function saveVideoToIndexedDB(file: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const putRequest = store.put(file, VIDEO_KEY);

    putRequest.onsuccess = () => resolve();
    putRequest.onerror = () => reject(putRequest.error || new Error("Failed to write video to IndexedDB"));
    tx.oncomplete = () => db.close();
  });
}

/**
 * Retrieves the stored video blob from IndexedDB and creates a fresh Object URL
 */
export async function loadSavedVideoBackground(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(VIDEO_KEY);

      getRequest.onsuccess = () => {
        const result = getRequest.result;
        db.close();
        if (result instanceof Blob) {
          try {
            const url = URL.createObjectURL(result);
            resolve(url);
          } catch (e) {
            console.warn("Could not create object URL for stored video:", e);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (err) {
    console.warn("IndexedDB load error:", err);
    return null;
  }
}

/**
 * Deletes the stored video background from IndexedDB
 */
export async function deleteVideoFromIndexedDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const delRequest = store.delete(VIDEO_KEY);

      delRequest.onsuccess = () => resolve();
      delRequest.onerror = () => reject(delRequest.error || new Error("Failed to delete video"));
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn("IndexedDB delete error:", err);
  }
}

export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
];

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }

  // Format validation
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const hasValidExt = /\.(mp4|webm|ogg|mov)$/i.test(fileName);
  const hasValidMime = ALLOWED_VIDEO_TYPES.includes(fileType) || fileType.startsWith("video/");

  if (!hasValidMime && !hasValidExt) {
    return {
      valid: false,
      error: "Invalid format. Please upload an MP4, WebM, or OGG video file.",
    };
  }

  // Size validation
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Video is too large (${sizeMb}MB). Maximum allowed size is 50MB for smooth performance.`,
    };
  }

  return { valid: true };
}
