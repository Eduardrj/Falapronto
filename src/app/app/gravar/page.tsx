"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Share2,
  SwitchCamera,
  X,
} from "lucide-react";
import { getScript } from "@/lib/scripts";
import { APP_VERSION } from "@/lib/config";
import { loadPrefs, pxPerSecond, savePrefs, type PrompterPrefs } from "@/lib/prefs";
import { fileNameFor, formatClock, formatSize, saveTake, type Take } from "@/lib/takes";
import { canShareFiles, shareVideo } from "@/lib/native";

type Phase = "idle" | "countdown" | "recording" | "done";

function pickMime() {
  const opts = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  return opts.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

function cameraError(e: unknown): string {
  const name = (e as Error)?.name;
  if (!window.isSecureContext)
    return "A câmera só funciona em endereço seguro (https). Abra o app pelo link https.";
  if (name === "NotAllowedError")
    return "O acesso à câmera ou ao microfone foi bloqueado. Libere nas permissões do navegador (ícone de cadeado ao lado do endereço) e toque em Tentar de novo.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "Nenhuma câmera foi encontrada neste aparelho.";
  if (name === "NotReadableError")
    return "A câmera está sendo usada por outro app. Feche-o e toque em Tentar de novo.";
  return "Não foi possível abrir a câmera. Toque em Tentar de novo.";
}

function Recorder() {
  const router = useRouter();
  const params = useSearchParams();
  const scriptId = params.get("id");

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [prefs, setPrefs] = useState<PrompterPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(3);
  const [scrolling, setScrolling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<{ take: Take; url: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasMultipleCams, setHasMultipleCams] = useState(false);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [camSize, setCamSize] = useState("");
  const [camAspect, setCamAspect] = useState(0);
  const [screenAspect, setScreenAspect] = useState(0.5);
  const [hint, setHint] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const scrollingRef = useRef(false);
  const prefsRef = useRef<PrompterPrefs | null>(null);
  const dragRef = useRef<{ y: number; moved: boolean } | null>(null);
  const phaseRef = useRef<Phase>("idle");

  phaseRef.current = phase;
  scrollingRef.current = scrolling;
  prefsRef.current = prefs;

  // ---------- carregar roteiro e preferências ----------
  useEffect(() => {
    setPrefs(loadPrefs());
    const s = scriptId ? getScript(scriptId) : undefined;
    if (s) {
      setTitle(s.title || "Sem título");
      setText(s.content);
    } else {
      setTitle("Gravação livre");
      setText("");
    }
  }, [scriptId]);

  useEffect(() => {
    if (prefs) savePrefs(prefs);
  }, [prefs]);

  // ---------- câmera ----------
  const startCamera = useCallback(async (facing: "user" | "environment", fov: PrompterPrefs["fov"] = "largo169") => {
    setError(null);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      // 1280x720 evita o modo "recortado" (zoom) que muitos celulares usam em resoluções altas.
      // O navegador gira para retrato sozinho quando o celular está em pé.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          // "aberto" = 4:3, usa o sensor inteiro (câmeras frontais costumam ser 4:3 e
          // cortam a imagem quando pedimos 16:9). "auto" = deixa o aparelho escolher.
          ...(fov === "aberto"
            ? { width: { ideal: 1280 }, height: { ideal: 960 } }
            : fov === "largo169"
              ? { width: { ideal: 1280 }, height: { ideal: 720 } }
              : {}),
          frameRate: { ideal: 30 },
        },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      // Zoom: começa no mínimo (campo de visão mais aberto) quando a câmera permite
      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
        zoom?: { min: number; max: number; step: number };
      };
      if (caps.zoom && caps.zoom.max > caps.zoom.min) {
        const z = caps.zoom.min;
        await track
          .applyConstraints({ advanced: [{ zoom: z } as MediaTrackConstraintSet] })
          .catch(() => {});
        setZoomRange({ min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 });
        setZoom(z);
      } else {
        setZoomRange(null);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      setHasMultipleCams(devices.filter((d) => d.kind === "videoinput").length > 1);
    } catch (e) {
      setError(cameraError(e));
    }
  }, []);

  function changeZoom(z: number) {
    setZoom(z);
    const track = streamRef.current?.getVideoTracks()[0];
    track?.applyConstraints({ advanced: [{ zoom: z } as MediaTrackConstraintSet] }).catch(() => {});
  }

  useEffect(() => {
    if (!prefs) return;
    startCamera(prefs.facing, prefs.fov);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs?.facing, prefs?.fov]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // manter a tela acesa
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  function readCam(v: HTMLVideoElement) {
    if (!v.videoWidth) return;
    setCamSize(`${v.videoWidth}×${v.videoHeight}`);
    setCamAspect(v.videoWidth / v.videoHeight);
  }

  useEffect(() => {
    const upd = () => setScreenAspect(window.innerWidth / window.innerHeight);
    upd();
    window.addEventListener("resize", upd);
    const t = setTimeout(() => setHint(false), 5000);
    return () => {
      window.removeEventListener("resize", upd);
      clearTimeout(t);
    };
  }, []);

  // ---------- rolagem ----------
  const applyOffset = useCallback(() => {
    if (textRef.current) textRef.current.style.transform = `translateY(${-offsetRef.current}px)`;
  }, []);

  const maxOffset = useCallback(() => {
    const box = boxRef.current;
    const t = textRef.current;
    if (!box || !t) return 0;
    const fs = prefsRef.current?.fontSize ?? 38;
    return Math.max(0, t.scrollHeight - box.clientHeight - fs * 2.1);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (scrollingRef.current && prefsRef.current) {
        offsetRef.current += pxPerSecond(prefsRef.current) * dt;
        const max = maxOffset();
        if (offsetRef.current >= max) {
          offsetRef.current = max;
          setScrolling(false);
        }
        applyOffset();
      }
      if (phaseRef.current === "recording") {
        setElapsed(Date.now() - startRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [applyOffset, maxOffset]);

  function nudge(delta: number) {
    offsetRef.current = Math.min(maxOffset(), Math.max(0, offsetRef.current + delta));
    applyOffset();
  }

  function rewind() {
    offsetRef.current = 0;
    applyOffset();
  }

  // ---------- gravação ----------
  function beginRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 6_000_000,
        audioBitsPerSecond: 128_000,
      });
    } catch {
      setNotice("Este navegador não consegue gravar vídeo. Use o Chrome, o Edge ou o app Android.");
      setPhase("idle");
      return;
    }
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = async () => {
      const type = rec.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const durationMs = Date.now() - startRef.current;
      try {
        const take = await saveTake({
          blob,
          mimeType: type,
          durationMs,
          scriptId,
          scriptTitle: title,
        });
        setResult({ take, url: URL.createObjectURL(blob) });
      } catch {
        const take = {
          id: "tmp",
          blob,
          mimeType: type,
          durationMs,
          scriptId,
          scriptTitle: title,
          createdAt: new Date().toISOString(),
          size: blob.size,
        };
        setResult({ take, url: URL.createObjectURL(blob) });
        setNotice("Não deu para guardar em Meus vídeos (pouco espaço). Salve o vídeo agora.");
      }
      setPhase("done");
    };
    recRef.current = rec;
    rec.start(1000);
    startRef.current = Date.now();
    setElapsed(0);
    setPhase("recording");
    setScrolling(true);
  }

  function onRecordButton() {
    if (phase === "recording") {
      setScrolling(false);
      recRef.current?.stop();
      return;
    }
    if (phase !== "idle" || error) return;
    rewind();
    setShowSettings(false);
    if (prefs?.countdown) {
      setPhase("countdown");
      setCount(3);
      let n = 3;
      const iv = setInterval(() => {
        n -= 1;
        if (n <= 0) {
          clearInterval(iv);
          beginRecording();
        } else setCount(n);
      }, 1000);
    } else beginRecording();
  }

  function retake() {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setNotice(null);
    setPhase("idle");
    rewind();
  }

  // ---------- teclado (computador) ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current === "done") return;
      if (e.code === "Space") {
        e.preventDefault();
        setScrolling((s) => !s);
      } else if (e.key === "r" || e.key === "R") onRecordButton();
      else if (e.key === "ArrowUp") setPrefs((p) => p && { ...p, speed: Math.min(10, p.speed + 0.5) });
      else if (e.key === "ArrowDown") setPrefs((p) => p && { ...p, speed: Math.max(1, p.speed - 0.5) });
      else if (e.key === "+" || e.key === "=") setPrefs((p) => p && { ...p, fontSize: Math.min(80, p.fontSize + 2) });
      else if (e.key === "-") setPrefs((p) => p && { ...p, fontSize: Math.max(20, p.fontSize - 2) });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!prefs) return <div className="h-dvh bg-black" />;

  const lines = text.split(/\n+/).filter((l) => l.trim());
  // Automático: preenche a tela quando isso corta no máximo 30% da imagem
  const crop = camAspect ? 1 - Math.min(camAspect, screenAspect) / Math.max(camAspect, screenAspect) : 1;
  const useCover = prefs.fit === "cover" || (prefs.fit === "auto" && crop <= 0.3);
  const recording = phase === "recording";

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        onLoadedMetadata={(e) => readCam(e.currentTarget)}
        onResize={(e) => readCam(e.currentTarget)}
        className={`absolute inset-0 h-full w-full ${useCover ? "object-cover" : "object-contain"}`}
        style={{ transform: prefs.facing === "user" ? "scaleX(-1)" : undefined }}
      />

      {/* teleprompter */}
      {lines.length > 0 && (
        <div
          ref={boxRef}
          className="absolute inset-x-0 top-0 mx-auto max-w-4xl cursor-grab touch-none select-none overflow-hidden sm:rounded-b-3xl"
          style={{
            height: `${prefs.boxHeight}%`,
            background: `linear-gradient(to bottom, rgba(16,8,36,${prefs.bgOpacity}) 0%, rgba(16,8,36,${prefs.bgOpacity}) 72%, rgba(16,8,36,0) 100%)`,
          }}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            dragRef.current = { y: e.clientY, moved: false };
          }}
          onPointerMove={(e) => {
            const d = dragRef.current;
            if (!d) return;
            const dy = e.clientY - d.y;
            if (Math.abs(dy) > 6) d.moved = true;
            if (d.moved) {
              nudge(-dy);
              d.y = e.clientY;
            }
          }}
          onPointerUp={() => {
            const d = dragRef.current;
            dragRef.current = null;
            if (d && !d.moved) setScrolling((s) => !s);
          }}
          onWheel={(e) => nudge(e.deltaY * 0.6)}
          role="region"
          aria-label="Teleprompter. Toque para pausar ou continuar; arraste para voltar."
        >
          {/* linha de leitura */}
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-y-2 border-band/80 bg-band/15"
            style={{ top: "30%", height: prefs.fontSize * 1.45 }}
          />
          <div
            className="px-6 sm:px-12"
            style={{
              paddingTop: `calc(${prefs.boxHeight}dvh * 0.3)`,
              transform: prefs.mirror ? "scaleX(-1)" : undefined,
            }}
          >
            <div ref={textRef} className="will-change-transform">
              {lines.map((l, i) => (
                <p
                  key={i}
                  className="mb-[0.7em] font-bold"
                  style={{
                    overflowWrap: "anywhere",
                    fontSize: prefs.fontSize,
                    lineHeight: 1.4,
                    textAlign: prefs.align,
                    textShadow: "0 2px 8px rgba(0,0,0,.5)",
                  }}
                >
                  {l}
                </p>
              ))}
              <div style={{ height: `${prefs.boxHeight}dvh` }} />
            </div>
          </div>
          {!scrolling && !showSettings && phase !== "countdown" && (recording || hint) && (
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-bold">
              {recording ? "Pausado. Toque para continuar" : "Toque no texto para ensaiar a rolagem"}
            </div>
          )}
        </div>
      )}

      {/* tempo de gravação (fica embaixo para não cobrir o rosto) */}
      {recording && (
        <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-[7.5rem] z-10 flex justify-center">
          <div className="flex items-center gap-2 rounded-full bg-black/55 px-4 py-1.5 font-bold tabular-nums">
            <span className="h-3 w-3 animate-pulse rounded-full bg-tally" /> {formatClock(elapsed)}
          </div>
        </div>
      )}

      {/* contagem */}
      {phase === "countdown" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span key={count} className="font-display text-[9rem] font-extrabold drop-shadow-xl">
            {count}
          </span>
        </div>
      )}

      {/* erro de câmera */}
      {error && (
        <div className="absolute inset-x-5 top-1/2 mx-auto max-w-md -translate-y-1/2 rounded-3xl bg-paper p-6 text-ink">
          <p className="text-lg font-bold">Câmera indisponível</p>
          <p className="mt-2 leading-relaxed text-muted">{error}</p>
          <button
            onClick={() => startCamera(prefs.facing, prefs.fov)}
            className="mt-5 rounded-full bg-ink px-6 py-3 font-bold text-lav"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {notice && phase !== "done" && (
        <div className="absolute inset-x-5 bottom-40 mx-auto max-w-md rounded-2xl bg-paper p-4 text-ink">
          {notice}
        </div>
      )}

      {/* controles */}
      <div className="safe-bottom absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/75 to-transparent px-4 pb-5 pt-14 sm:gap-8">
        <button
          onClick={() => router.push(scriptId ? `/app/roteiro/?id=${scriptId}` : "/app/")}
          disabled={recording}
          aria-label="Voltar"
          className="grid h-12 w-12 place-items-center rounded-full bg-black/45 disabled:opacity-30"
        >
          <ArrowLeft size={22} />
        </button>
        <button
          onClick={() =>
            setPrefs({ ...prefs, facing: prefs.facing === "user" ? "environment" : "user" })
          }
          disabled={recording || !hasMultipleCams}
          aria-label="Trocar câmera"
          className="grid h-12 w-12 place-items-center rounded-full bg-black/45 disabled:opacity-30"
        >
          <SwitchCamera size={24} />
        </button>

        <button
          onClick={onRecordButton}
          disabled={!!error || phase === "countdown"}
          aria-label={recording ? "Parar gravação" : "Começar a gravar"}
          className="grid h-20 w-20 place-items-center rounded-full border-4 border-white disabled:opacity-40"
        >
          <span
            className={`bg-tally transition-all ${recording ? "h-8 w-8 rounded-lg" : "h-[60px] w-[60px] rounded-full"}`}
          />
        </button>

        <button
          onClick={() => setScrolling((s) => !s)}
          disabled={!lines.length}
          aria-label={scrolling ? "Pausar texto" : "Rolar texto"}
          className="grid h-12 w-12 place-items-center rounded-full bg-black/45 disabled:opacity-30"
        >
          {scrolling ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          onClick={() => setShowSettings((v) => !v)}
          aria-label="Ajustes do teleprompter"
          aria-expanded={showSettings}
          className="grid h-12 w-12 place-items-center rounded-full bg-black/45"
        >
          <Settings2 size={22} />
        </button>
      </div>

      {/* ajustes */}
      {showSettings && (
        <div className="safe-bottom absolute inset-x-0 bottom-0 z-30 mx-auto max-h-[85dvh] max-w-xl overflow-y-auto rounded-t-3xl bg-paper px-6 pt-5 text-ink shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-2xl font-bold">Ajustes</p>
            <button onClick={() => setShowSettings(false)} aria-label="Fechar ajustes" className="p-2">
              <X size={22} />
            </button>
          </div>
          <Slider label="Velocidade" value={prefs.speed} min={1} max={10} step={0.5}
            show={prefs.speed.toFixed(1).replace(".", ",")}
            onChange={(v) => setPrefs({ ...prefs, speed: v })} />
          <Slider label="Tamanho da letra" value={prefs.fontSize} min={20} max={80} step={2}
            show={`${prefs.fontSize}`}
            onChange={(v) => setPrefs({ ...prefs, fontSize: v })} />
          <Slider label="Altura da área de texto" value={prefs.boxHeight} min={25} max={85} step={1}
            show={`${prefs.boxHeight}%`}
            onChange={(v) => setPrefs({ ...prefs, boxHeight: v })} />
          <Slider label="Fundo atrás do texto" value={prefs.bgOpacity} min={0.15} max={1} step={0.05}
            show={`${Math.round(prefs.bgOpacity * 100)}%`}
            onChange={(v) => setPrefs({ ...prefs, bgOpacity: v })} />
          {zoomRange && (
            <Slider label="Zoom da câmera" value={zoom} min={zoomRange.min} max={zoomRange.max} step={zoomRange.step}
              show={`${zoom.toFixed(1).replace(".", ",")}x`}
              onChange={changeZoom} />
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pb-4 pt-2">
            <Toggle label="Contagem de 3 s" on={prefs.countdown} onChange={(v) => setPrefs({ ...prefs, countdown: v })} />
            <Toggle label="Texto espelhado" on={prefs.mirror} onChange={(v) => setPrefs({ ...prefs, mirror: v })} />
            <Toggle label="Alinhar à esquerda" on={prefs.align === "left"} onChange={(v) => setPrefs({ ...prefs, align: v ? "left" : "center" })} />
          </div>
          <div className="pb-3">
            <p className="font-bold">Enquadramento na tela</p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Enquadramento na tela">
              {([
                ["auto", "Automático"],
                ["contain", "Imagem inteira"],
                ["cover", "Preencher"],
              ] as const).map(([v, l]) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={prefs.fit === v}
                  onClick={() => setPrefs({ ...prefs, fit: v })}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${prefs.fit === v ? "bg-ink text-lav" : "bg-ink/5 text-ink"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="pb-1">
            <p className="font-bold">Formato da câmera</p>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Formato da câmera">
              {([
                ["largo169", "Vídeo 9:16 / 16:9"],
                ["aberto", "Aberto 3:4 / 4:3"],
                ["auto", "Automático"],
              ] as const).map(([v, l]) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={prefs.fov === v}
                  onClick={() => setPrefs({ ...prefs, fov: v })}
                  className={`rounded-full px-4 py-2 text-sm font-bold ${prefs.fov === v ? "bg-ink text-lav" : "bg-ink/5 text-ink"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted">
              Se a imagem estiver muito perto, troque o formato. Hoje a câmera entrega {camSize || "…"}.
            </p>
          </div>
          <p className="hidden pt-2 text-sm text-muted sm:block">
            No teclado: espaço pausa o texto, R grava, setas mudam a velocidade, + e − mudam a letra.
          </p>
          <p className="pb-4 pt-2 text-xs text-muted">Versão {APP_VERSION}</p>
        </div>
      )}

      {/* resultado */}
      {phase === "done" && result && (
        <div className="absolute inset-0 z-40 flex flex-col bg-ink">
          <div className="safe-top flex items-center justify-between px-4 py-3 text-lav">
            <p className="font-display text-xl font-bold">Vídeo gravado</p>
            <p className="text-sm text-lav/70">
              {formatClock(result.take.durationMs)}, {formatSize(result.take.size)}
            </p>
          </div>
          <div className="relative min-h-0 flex-1 bg-black">
            <video src={result.url} controls playsInline className="absolute inset-0 h-full w-full object-contain" />
          </div>
          <div className="safe-bottom grid gap-3 bg-ink px-5 pt-4 sm:mx-auto sm:w-full sm:max-w-xl sm:grid-cols-2">
            {notice && <p className="rounded-2xl bg-band px-4 py-3 font-bold text-ink sm:col-span-2">{notice}</p>}
            {canShareFiles() && (
              <button
                onClick={() => shareVideo(result.take.blob, fileNameFor(result.take), "share")}
                className="flex items-center justify-center gap-2 rounded-full bg-band px-6 py-3.5 font-bold text-ink"
              >
                <Share2 size={20} /> Enviar ou salvar
              </button>
            )}
            {!canShareFiles() && (
              <button
                onClick={() => shareVideo(result.take.blob, fileNameFor(result.take), "download")}
                className="flex items-center justify-center gap-2 rounded-full bg-band px-6 py-3.5 font-bold text-ink"
              >
                <Download size={20} /> Baixar vídeo
              </button>
            )}
            <button
              onClick={retake}
              className="flex items-center justify-center gap-2 rounded-full border-2 border-lav/30 px-6 py-3.5 font-bold text-lav"
            >
              <RotateCcw size={20} /> Gravar de novo
            </button>
            <Link
              href="/app/videos/"
              className="py-2 text-center font-bold text-lav/80 underline underline-offset-4 sm:col-span-2"
            >
              Ver todos em Meus vídeos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  show: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block py-2">
      <span className="flex justify-between font-bold">
        {props.label} <span className="tabular-nums text-muted">{props.show}</span>
      </span>
      <input
        type="range"
        className="mt-1 w-full"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-2 font-bold">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-ink" />
      {label}
    </label>
  );
}

export default function GravarPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-black" />}>
      <Recorder />
    </Suspense>
  );
}
