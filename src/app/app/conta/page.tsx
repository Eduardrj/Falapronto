"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { syncScripts } from "@/lib/scripts";

export default function ContaPage() {
  const sb = getSupabase();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sb?.auth.getUser().then(({ data }) => setUser(data.user));
  }, [sb]);

  if (!sb)
    return (
      <p className="rounded-2xl bg-paper p-5">
        Login desativado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY para ativar.
      </p>
    );

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await sb!.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setMsg(`Não foi possível enviar o código: ${error.message}`);
    else {
      setStep("code");
      setMsg(`Enviamos um código de 6 dígitos para ${email}.`);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await sb!.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) return setMsg("Código incorreto ou vencido. Confira o e-mail ou peça outro código.");
    setUser(data.user);
    setMsg("Pronto. Seus roteiros agora aparecem em todos os aparelhos em que você entrar.");
    syncScripts().catch(() => {});
  }

  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">Conta</h1>

      {user ? (
        <div className="mt-6 rounded-3xl bg-paper p-6">
          <p className="text-muted">Conectado como</p>
          <p className="text-lg font-bold">{user.email}</p>
          <p className="mt-3 text-muted">Seus roteiros são copiados para a nuvem automaticamente. Os vídeos continuam só neste aparelho.</p>
          {msg && <p className="mt-3 font-bold">{msg}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={async () => {
                setBusy(true);
                const r = await syncScripts().catch(() => "erro");
                setBusy(false);
                setMsg(r === "ok" ? "Roteiros sincronizados." : "Não foi possível sincronizar. Verifique a internet.");
              }}
              disabled={busy}
              className="rounded-full bg-ink px-5 py-3 font-bold text-lav"
            >
              Sincronizar agora
            </button>
            <button
              onClick={async () => {
                await sb.auth.signOut();
                setUser(null);
                setStep("email");
                setMsg(null);
              }}
              className="rounded-full px-5 py-3 font-bold text-muted hover:bg-ink/5"
            >
              Sair
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl bg-paper p-6">
          <p className="max-w-prose text-muted">
            Entre com seu e-mail para guardar os roteiros na nuvem e abrir no celular e no computador. Não precisa de senha.
          </p>
          {step === "email" ? (
            <form onSubmit={sendCode} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                aria-label="E-mail"
                className="flex-1 rounded-full border-2 border-ink/15 bg-white px-5 py-3 outline-none focus:border-ink"
              />
              <button disabled={busy} className="rounded-full bg-ink px-6 py-3 font-bold text-lav disabled:opacity-50">
                Enviar código
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Código de 6 dígitos"
                aria-label="Código recebido por e-mail"
                className="flex-1 rounded-full border-2 border-ink/15 bg-white px-5 py-3 tracking-widest outline-none focus:border-ink"
              />
              <button disabled={busy} className="rounded-full bg-ink px-6 py-3 font-bold text-lav disabled:opacity-50">
                Entrar
              </button>
            </form>
          )}
          {msg && <p className="mt-4 font-bold">{msg}</p>}
        </div>
      )}
    </>
  );
}
