"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Video } from "lucide-react";
import {
  countWords,
  createScript,
  ensureSample,
  formatDuration,
  listScripts,
  onScriptsChange,
  syncScripts,
  type Script,
} from "@/lib/scripts";

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return `hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function ScriptsPage() {
  const router = useRouter();
  const [scripts, setScripts] = useState<Script[] | null>(null);

  useEffect(() => {
    ensureSample();
    const load = () => setScripts(listScripts());
    load();
    syncScripts().catch(() => {});
    return onScriptsChange(load);
  }, []);

  function novo() {
    const s = createScript();
    router.push(`/app/roteiro/?id=${s.id}`);
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Seus roteiros</h1>
        <button
          onClick={novo}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-5 py-3 font-bold text-lav hover:bg-ink-2"
        >
          <Plus size={20} /> Novo roteiro
        </button>
      </div>

      {scripts && scripts.length === 0 && (
        <div className="mt-10 rounded-3xl border-2 border-dashed border-ink/20 p-8 text-center">
          <p className="text-lg font-bold">Nenhum roteiro ainda.</p>
          <p className="mt-1 text-muted">Escreva o que você quer falar e grave com o texto na tela.</p>
          <button onClick={novo} className="mt-5 rounded-full bg-band px-6 py-3 font-bold text-ink">
            Escrever o primeiro roteiro
          </button>
        </div>
      )}

      <ul className="mt-8 divide-y divide-ink/10 overflow-hidden rounded-3xl bg-paper">
        {scripts?.map((s) => {
          const words = countWords(s.content);
          return (
            <li key={s.id} className="flex items-center gap-3 px-5 py-4">
              <Link href={`/app/roteiro/?id=${s.id}`} className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{s.title || "Sem título"}</p>
                <p className="truncate text-muted">
                  {s.content.trim().slice(0, 90) || "Roteiro vazio"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Cerca de {formatDuration(words)} de fala. Editado {when(s.updatedAt)}.
                </p>
              </Link>
              <Link
                href={`/app/gravar/?id=${s.id}`}
                aria-label={`Gravar ${s.title || "roteiro"}`}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-lav hover:bg-ink-2"
              >
                <Video size={20} />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
