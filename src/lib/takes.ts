"use client";

// Vídeos gravados ficam no IndexedDB do aparelho (não sobem para a nuvem no MVP).

export type Take = {
  id: string;
  scriptId: string | null;
  scriptTitle: string;
  createdAt: string;
  durationMs: number;
  mimeType: string;
  size: number;
  blob: Blob;
};

const DB = "fala-pronto";
const STORE = "takes";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" }).createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTake(t: Omit<Take, "id" | "createdAt" | "size">): Promise<Take> {
  const take: Take = {
    ...t,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    size: t.blob.size,
  };
  await tx("readwrite", (s) => s.put(take));
  return take;
}

export async function listTakes(): Promise<Take[]> {
  const all = await tx<Take[]>("readonly", (s) => s.getAll() as IDBRequest<Take[]>);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteTake(id: string) {
  await tx("readwrite", (s) => s.delete(id));
}

export function extFor(mime: string) {
  return mime.includes("mp4") ? "mp4" : "webm";
}

export function fileNameFor(take: Pick<Take, "scriptTitle" | "createdAt" | "mimeType">) {
  const slug =
    (take.scriptTitle || "video")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "video";
  const d = new Date(take.createdAt);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  return `${slug}-${stamp}.${extFor(take.mimeType)}`;
}

export function formatClock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatSize(bytes: number) {
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1).replace(".", ",")} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}
