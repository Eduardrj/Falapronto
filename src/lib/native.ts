"use client";

import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Salvar/compartilhar o vídeo.
 * - No APK: grava o arquivo no cache do app e abre a folha de compartilhamento do Android
 *   (Galeria, WhatsApp, Instagram, Drive...).
 * - No navegador: usa o compartilhamento nativo quando existe; senão baixa o arquivo.
 */
export async function shareVideo(blob: Blob, fileName: string, mode: "share" | "download") {
  if (isNative()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const data = await blobToBase64(blob);
    const res = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
    await Share.share({ title: fileName, files: [res.uri], dialogTitle: "Salvar ou enviar vídeo" });
    return "shared";
  }

  if (mode === "share") {
    const file = new File([blob], fileName, { type: blob.type });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: fileName });
        return "shared";
      } catch (e) {
        if ((e as Error).name === "AbortError") return "cancelled";
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}

export function canShareFiles() {
  if (typeof window === "undefined") return false;
  if (isNative()) return true;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    return Boolean(nav.canShare?.({ files: [new File([""], "a.mp4", { type: "video/mp4" })] }));
  } catch {
    return false;
  }
}
