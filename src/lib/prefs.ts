"use client";

export type PrompterPrefs = {
  fontSize: number; // px
  speed: number; // 1–10
  bgOpacity: number; // 0.2–1
  boxHeight: number; // % da tela
  mirror: boolean;
  countdown: boolean;
  align: "center" | "left";
  facing: "user" | "environment";
};

export const DEFAULT_PREFS: PrompterPrefs = {
  fontSize: 38,
  speed: 4,
  bgOpacity: 0.6,
  boxHeight: 42,
  mirror: false,
  countdown: true,
  align: "center",
  facing: "user",
};

const KEY = "fp.prefs.v1";

export function loadPrefs(): PrompterPrefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: PrompterPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

/** px por segundo. Calibrado para ~140 palavras/min com velocidade 4 e letra 38px no celular. */
export function pxPerSecond(p: PrompterPrefs) {
  return p.speed * p.fontSize * 0.17;
}
