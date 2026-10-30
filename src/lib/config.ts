// Troque o nome do app aqui — é o único lugar.
export const APP_NAME = "Fala Pronto";
export const APP_TAGLINE = "Teleprompter no celular e no navegador";
export const APP_ID = "br.com.edsystems.falapronto"; // usado no APK (capacitor.config.ts)

// Ritmo médio de fala em português (palavras por minuto)
export const DEFAULT_WPM = 140;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
