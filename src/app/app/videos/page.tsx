"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, Share2, Trash2 } from "lucide-react";
import { deleteTake, fileNameFor, formatClock, formatSize, listTakes, type Take } from "@/lib/takes";
import { canShareFiles, shareVideo } from "@/lib/native";

export default function VideosPage() {
  const [takes, setTakes] = useState<(Take & { url: string })[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let urls: string[] = [];
    listTakes()
      .then((list) => {
        const withUrl = list.map((t) => ({ ...t, url: URL.createObjectURL(t.blob) }));
        urls = withUrl.map((t) => t.url);
        setTakes(withUrl);
      })
      .catch(() => setError(true));
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const share = canShareFiles();

  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">Meus vídeos</h1>
      <p className="mt-2 text-muted">Ficam guardados só neste aparelho. Salve os que quiser manter.</p>

      {error && (
        <p className="mt-8 rounded-2xl bg-paper p-5">
          Este navegador bloqueou o armazenamento de vídeos (modo anônimo costuma fazer isso). Abra em uma
          janela normal.
        </p>
      )}

      {takes && takes.length === 0 && (
        <div className="mt-10 rounded-3xl border-2 border-dashed border-ink/20 p-8 text-center">
          <p className="text-lg font-bold">Nenhum vídeo gravado ainda.</p>
          <Link href="/app/" className="mt-5 inline-block rounded-full bg-band px-6 py-3 font-bold text-ink">
            Escolher um roteiro para gravar
          </Link>
        </div>
      )}

      <ul className="mt-8 grid gap-6 sm:grid-cols-2">
        {takes?.map((t) => (
          <li key={t.id} className="overflow-hidden rounded-3xl bg-paper">
            <video src={t.url} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-contain" />
            <div className="p-4">
              <p className="truncate font-bold">{t.scriptTitle}</p>
              <p className="text-sm text-muted">
                {new Date(t.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}, {formatClock(t.durationMs)}, {formatSize(t.size)}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => shareVideo(t.blob, fileNameFor(t), share ? "share" : "download")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 font-bold text-lav"
                >
                  {share ? <Share2 size={18} /> : <Download size={18} />} {share ? "Enviar ou salvar" : "Baixar"}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Apagar este vídeo do aparelho?")) return;
                    await deleteTake(t.id);
                    URL.revokeObjectURL(t.url);
                    setTakes((list) => list?.filter((x) => x.id !== t.id) ?? null);
                  }}
                  aria-label="Apagar vídeo"
                  className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
