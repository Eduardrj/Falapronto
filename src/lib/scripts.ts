"use client";

import { getSupabase } from "./supabase";
import { DEFAULT_WPM } from "./config";

export type Script = {
  id: string;
  title: string;
  content: string;
  updatedAt: string; // ISO
  deletedAt?: string | null;
};

const KEY = "fp.scripts.v1";
const EVENT = "fp:scripts";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function readAll(): Script[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Script[];
  } catch {
    return [];
  }
}

function writeAll(list: Script[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* armazenamento cheio ou bloqueado */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function onScriptsChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function listScripts(): Script[] {
  return readAll()
    .filter((s) => !s.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getScript(id: string): Script | undefined {
  return readAll().find((s) => s.id === id && !s.deletedAt);
}

export function createScript(partial?: Partial<Script>): Script {
  const s: Script = {
    id: uuid(),
    title: partial?.title ?? "",
    content: partial?.content ?? "",
    updatedAt: new Date().toISOString(),
  };
  writeAll([s, ...readAll()]);
  queueSync();
  return s;
}

export function saveScript(id: string, patch: Partial<Pick<Script, "title" | "content">>) {
  const list = readAll();
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
  writeAll(list);
  queueSync();
}

export function deleteScript(id: string) {
  const list = readAll();
  const i = list.findIndex((s) => s.id === id);
  if (i < 0) return;
  const now = new Date().toISOString();
  list[i] = { ...list[i], deletedAt: now, updatedAt: now };
  writeAll(list);
  queueSync();
}

/** Garante que o primeiro acesso tenha um roteiro de exemplo. */
export function ensureSample() {
  if (localStorage.getItem("fp.sampled")) return;
  localStorage.setItem("fp.sampled", "1");
  if (readAll().length) return;
  createScript({
    title: "Roteiro de exemplo",
    content:
      "Oi, tudo bem? Este é o seu teleprompter.\n\nO texto sobe sozinho enquanto você grava, então você fala olhando para a lente, sem decorar nada.\n\nToque no texto para pausar. Arraste para voltar uma frase. Ajuste a velocidade e o tamanho da letra na engrenagem.\n\nQuando terminar, toque no botão vermelho de novo. O vídeo fica salvo em Meus vídeos e você pode compartilhar direto no WhatsApp ou no Instagram.\n\nAgora apague este texto e escreva o seu.",
  });
}

// ---------- estatísticas do roteiro ----------

export function countWords(text: string) {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function formatDuration(words: number, wpm = DEFAULT_WPM) {
  const secs = Math.round((words / wpm) * 60);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m ? `${m} min ${s.toString().padStart(2, "0")} s` : `${s} s`;
}

// ---------- sincronização com Supabase (opcional) ----------

type Row = {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  deleted_at: string | null;
};

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function queueSync() {
  if (!getSupabase()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncScripts().catch(() => {});
  }, 1500);
}

/** Junta roteiros locais e da nuvem; vence a versão editada por último. */
export async function syncScripts(): Promise<"ok" | "offline" | "no-user"> {
  const sb = getSupabase();
  if (!sb) return "offline";
  const { data: auth } = await sb.auth.getSession();
  const user = auth.session?.user;
  if (!user) return "no-user";

  const { data, error } = await sb
    .from("scripts")
    .select("id,title,content,updated_at,deleted_at");
  if (error) throw error;

  const remote = new Map<string, Row>((data as Row[]).map((r) => [r.id, r]));
  const local = readAll();
  const merged = new Map<string, Script>();
  const toPush: Script[] = [];

  for (const s of local) {
    const r = remote.get(s.id);
    if (!r || s.updatedAt > r.updated_at) {
      merged.set(s.id, s);
      toPush.push(s);
    } else {
      merged.set(s.id, fromRow(r));
    }
  }
  for (const r of remote.values()) if (!merged.has(r.id)) merged.set(r.id, fromRow(r));

  if (toPush.length) {
    const { error: upErr } = await sb.from("scripts").upsert(
      toPush.map((s) => ({
        id: s.id,
        user_id: user.id,
        title: s.title,
        content: s.content,
        updated_at: s.updatedAt,
        deleted_at: s.deletedAt ?? null,
      }))
    );
    if (upErr) throw upErr;
  }
  writeAll([...merged.values()]);
  return "ok";
}

function fromRow(r: Row): Script {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}
