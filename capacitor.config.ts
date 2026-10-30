import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.edsystems.falapronto",
  appName: "Fala Pronto",
  webDir: "out",
  android: {
    // permite que o WebView use câmera/microfone com getUserMedia
    allowMixedContent: false,
  },
};

export default config;
