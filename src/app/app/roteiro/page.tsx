"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Trash2, Video } from "lucide-react";
import {
  countWords,
  createScript,
  deleteScript,
  formatDuration,
  getScript,
  saveScript,
} from "@/lib/scripts";

const PACES = [
  { wpm: 110, label: "Calmo" },
  { wpm: 140, label: "Normal" },
  { wpm: 170, label: "Rápido" },
];

function Editor() {
  const router = useRouter();
  const params = useSearchParams();
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [wpm, setWpm] = useState(140);
  const [missing, setMissing] = useState(false);
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    let sid = params.get("id");
    if (!sid || params.get("novo")) {
      const s = createScript();
      sid = s.id;
      router.replace(`/app/roteiro/?id=${s.id}`);
    }
    const s = getScript(sid);
    if (!s) {
      setMissing(true);
      return;
    }
    setId(s.id);
    setTitle(s.title);
    setContent(s.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function schedule(patch: { title?: string; content?: string }) {
    if (!id) return;
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveScript(id, patch);
      setSaved(true);
    }, 400);
  }

  // salva ao sair da página
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function flush() {
    if (id) saveScript(id, { title, content });
    setSaved(true);
  }

  if (missing)
    return (
      <div className="py-10 text-center">
        <p className="text-lg font-bold">Este roteiro não existe mais neste aparelho.</p>
        <Link href="/app/" className="mt-4 inline-block font-bold underline">
          Voltar para seus roteiros
        </Link>
      </div>
    );

  const words = countWords(content);

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/app/"
          onClick={flush}
          className="flex items-center gap-1.5 font-bold text-muted hover:text-ink"
        >
          <ArrowLeft size={18} /> Roteiros
        </Link>
        <span className="text-sm text-muted" aria-live="polite">
          {saved ? "Salvo neste aparelho" : "Salvando…"}
        </span>
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          schedule({ title: e.target.value, content });
        }}
        placeholder="Título do roteiro"
        aria-label="Título do roteiro"
        className="font-display w-full bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-ink/30 sm:text-4xl"
      />

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          schedule({ title, content: e.target.value });
        }}
        placeholder="Escreva aqui o que você vai falar. Frases curtas são mais fáceis de ler na câmera."
        aria-label="Texto do roteiro"
        className="mt-5 min-h-[50dvh] w-full resize-y rounded-3xl bg-paper p-5 text-lg leading-relaxed outline-none ring-ink/20 placeholder:text-ink/35 focus:ring-2"
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-ink p-5 text-lav">
        <div>
          <p className="text-2xl font-bold">{formatDuration(words, wpm)}</p>
          <p className="text-sm text-lav/70">{words} palavras em ritmo {PACES.find((p) => p.wpm === wpm)?.label.toLowerCase()}</p>
        </div>
        <div className="flex rounded-full bg-lav/10 p-1" role="radiogroup" aria-label="Ritmo de fala">
          {PACES.map((p) => (
            <button
              key={p.wpm}
              role="radio"
              aria-checked={wpm === p.wpm}
              onClick={() => setWpm(p.wpm)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${
                wpm === p.wpm ? "bg-band text-ink" : "text-lav/80"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => {
            if (!id) return;
            if (confirm("Apagar este roteiro? Os vídeos já gravados continuam em Meus vídeos.")) {
              deleteScript(id);
              router.push("/app/");
            }
          }}
          className="flex items-center gap-2 rounded-full px-4 py-3 font-bold text-muted hover:bg-ink/5 hover:text-ink"
        >
          <Trash2 size={18} /> Apagar
        </button>
        <button
          disabled={!words}
          onClick={() => {
            flush();
            router.push(`/app/gravar/?id=${id}`);
          }}
          className="flex items-center gap-2 rounded-full bg-tally px-7 py-4 text-lg font-bold text-white disabled:opacity-40"
        >
          <Video size={20} /> Gravar com este roteiro
        </button>
      </div>
    </>
  );
}

export default function EditorPage() {
  return (
    <Suspense>
      <Editor />
    </Suspense>
  );
}
