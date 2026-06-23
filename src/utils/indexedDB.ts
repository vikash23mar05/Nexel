/**
 * Client-Side IndexedDB Helper for Nexel.
 * Provides a robust, offline-capable client database for storing PDF files,
 * highlights, and folders when deployed in serverless environments like Vercel
 * where local filesystem writes are disallowed.
 */

const DB_NAME = "nexel-client-db";
const DB_VERSION = 1;

export interface LocalDoc {
  id: string;
  name: string;
  size: string;
  fileData: Blob;
  uploadedAt: string;
}

export interface LocalFolder {
  id: string;
  name: string;
  color: string;
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in the browser"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("highlights")) {
        db.createObjectStore("highlights", { keyPath: "docId" });
      }
      if (!db.objectStoreNames.contains("folders")) {
        db.createObjectStore("folders", { keyPath: "id" });
      }
    };
  });
}

// Documents
export async function saveLocalDocument(id: string, name: string, size: string, fileData: Blob): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("documents", "readwrite");
    const store = transaction.objectStore("documents");
    const record: LocalDoc = {
      id,
      name,
      size,
      fileData,
      uploadedAt: new Date().toISOString()
    };
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalDocuments(): Promise<LocalDoc[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("documents", "readonly");
    const store = transaction.objectStore("documents");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalDocumentFile(id: string): Promise<Blob | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("documents", "readonly");
    const store = transaction.objectStore("documents");
    const request = store.get(id);
    request.onsuccess = () => {
      resolve(request.result ? request.result.fileData : null);
    };
    request.onerror = () => reject(request.error);
  });
}

// Highlights
export async function saveLocalHighlights(docId: string, highlightsArray: any[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("highlights", "readwrite");
    const store = transaction.objectStore("highlights");
    const request = store.put({ docId, highlights: highlightsArray });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalHighlights(docId: string): Promise<any[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("highlights", "readonly");
    const store = transaction.objectStore("highlights");
    const request = store.get(docId);
    request.onsuccess = () => {
      resolve(request.result ? request.result.highlights : []);
    };
    request.onerror = () => resolve([]); // fallback to empty
  });
}

// Folders
export async function saveLocalFolder(id: string, name: string, color: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("folders", "readwrite");
    const store = transaction.objectStore("folders");
    const record: LocalFolder = { id, name, color };
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalFolders(): Promise<LocalFolder[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("folders", "readonly");
    const store = transaction.objectStore("folders");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
