"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { isNative } from "@/lib/native";

const DEMO = [
  "Oi, eu sou a Carla, da Doceria Ponto Doce.",
  "Esta semana chegou o bolo de pote de maracujá.",
  "Encomendas pelo WhatsApp até quinta-feira,",
  "e a entrega aqui no bairro é grátis.",
  "Gravei isto em um take só, sem decorar nada,",
  "porque o texto vai subindo do lado da câmera.",
  "Toco na tela para pausar quando preciso respirar.",
  "No fim é só mandar direto para o Instagram.",
];

const AJUSTES = [
  ["Velocidade", "do passo de leitura ao ritmo de locutor, ajustável até no meio do take"],
  ["Tamanho da letra", "grande o bastante para ler a um braço de distância"],
  ["Texto espelhado", "para usar com vidro de teleprompter de verdade"],
  ["Contagem regressiva", "três segundos para ajeitar a postura antes de gravar"],
  ["Câmera da frente ou de trás", "troque com um toque, inclusive no notebook"],
  ["Funciona sem internet", "roteiros e vídeos ficam no seu aparelho"],
];

export default function Landing() {
  const router = useRouter();
  useEffect(() => {
    if (isNative()) router.replace("/app/");
  }, [router]);

  return (
    <main>
      <section className="bg-ink text-lav">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <span className="font-display text-2xl font-bold tracking-tight">{APP_NAME}</span>
          <Link
            href="/app/"
            className="rounded-full border border-lav/30 px-4 py-2 text-sm font-bold hover:bg-lav/10"
          >
            Abrir o app
          </Link>
        </nav>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 sm:px-8 md:grid-cols-[1.3fr_0.7fr] md:pb-28 md:pt-14">
          <div>
            <h1 className="font-display text-[2.9rem] font-extrabold leading-[0.95] tracking-tight sm:text-[4.1rem] lg:text-[4.6rem]">
              Olhe para a lente.
              <br />O texto vem até você.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-lav/80">
              Escreva o roteiro, aperte gravar e fale com calma. O {APP_NAME} rola o texto bem
              perto da câmera, no seu ritmo, no celular ou no computador.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/app/"
                className="rounded-full bg-band px-7 py-4 text-lg font-bold text-ink hover:brightness-95"
              >
                Abrir o teleprompter
              </Link>
              <a
                href="/fala-pronto.apk"
                className="rounded-full border border-lav/30 px-7 py-4 text-lg font-bold hover:bg-lav/10"
              >
                Baixar para Android
              </a>
            </div>
            <p className="mt-4 text-sm text-lav/60">Grátis. Não precisa criar conta para começar.</p>
          </div>

          {/* O próprio teleprompter como peça principal */}
          <div className="mx-auto w-full max-w-[340px]" aria-hidden="true">
            <div className="relative aspect-[9/16] overflow-hidden rounded-[2.4rem] border-[10px] border-ink-2 bg-[#160b30] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
              <div className="absolute left-1/2 top-3 h-3 w-3 -translate-x-1/2 rounded-full bg-[#0c061c] ring-2 ring-ink-2" />
              <div className="absolute inset-x-0 top-0 h-[58%] overflow-hidden px-5 pt-10">
                <div className="absolute inset-x-0 top-[38%] h-[2.6rem] bg-band/20 border-y-2 border-band/70" />
                <div className="hero-roll relative">
                  {[...DEMO, ...DEMO].map((l, i) => (
                    <p key={i} className="py-1.5 text-center text-[1.35rem] font-bold leading-snug text-white">
                      {l}
                    </p>
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#160b30] to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-[#2a1a52] to-[#3d2a6e]">
                <div className="absolute bottom-[-12%] left-1/2 h-[90%] w-[62%] -translate-x-1/2 rounded-t-full bg-[#5a4590]" />
                <div className="absolute bottom-[58%] left-1/2 h-[34%] w-[30%] -translate-x-1/2 rounded-full bg-[#7a64b2]" />
              </div>
              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-sm font-bold text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-tally" />
                0:12
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Do roteiro ao vídeo em três passos
        </h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {[
            ["Escreva ou cole o texto", "O app mostra quantas palavras tem e quanto tempo o vídeo vai durar."],
            ["Grave olhando para a lente", "O texto sobe colado à câmera. Toque para pausar, arraste para voltar uma frase."],
            ["Salve ou envie", "O vídeo fica em Meus vídeos. Mande direto para WhatsApp, Instagram ou TikTok."],
          ].map(([t, d], i) => (
            <li key={t} className="border-t-4 border-ink pt-5">
              <span className="font-display text-6xl font-extrabold text-ink-2/25">{i + 1}</span>
              <h3 className="mt-2 text-xl font-bold">{t}</h3>
              <p className="mt-2 max-w-[30ch] leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-paper">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-[0.8fr_1.2fr]">
          <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Ajuste o teleprompter ao seu jeito de falar
          </h2>
          <dl className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {AJUSTES.map(([t, d]) => (
              <div key={t}>
                <dt className="text-lg font-bold">{t}</dt>
                <dd className="mt-1 leading-relaxed text-muted">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8">
        <p className="font-display mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Seu próximo vídeo começa com um parágrafo.
        </p>
        <Link
          href="/app/roteiro/?novo=1"
          className="mt-8 inline-block rounded-full bg-ink px-8 py-4 text-lg font-bold text-lav hover:bg-ink-2"
        >
          Escrever um roteiro
        </Link>
      </section>

      <footer className="border-t border-ink/10 px-5 py-8 text-center text-sm text-muted">
        {APP_NAME} é um produto{" "}
        <a href="https://edsystems.com.br" className="underline underline-offset-2">
          Edsystems
        </a>
        .
      </footer>
    </main>
  );
}
