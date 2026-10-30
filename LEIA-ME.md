# Fala Pronto: teleprompter (site + APK Android)

Versão 0.1 (MVP): escrever roteiros, gravar com o texto rolando perto da câmera, salvar e compartilhar o vídeo.
O mesmo código gera o site e o APK.

Nome provisório. Para trocar, edite:
- src/lib/config.ts (APP_NAME)
- capacitor.config.ts (appName)
- public/manifest.webmanifest (name e short_name)
- android/app/src/main/res/values/strings.xml (app_name e title_activity_main)

---

## O que já funciona

- Roteiros: criar, editar (salva sozinho), apagar, com estimativa de duração (calmo/normal/rápido)
- Teleprompter sobre a câmera: velocidade, tamanho da letra, altura da área de texto, fundo, texto espelhado, alinhamento, contagem de 3 s, linha de leitura amarela
- Toque no texto para pausar ou continuar, arraste para voltar e use a roda do mouse no computador
- Teclado no computador: espaço pausa, R grava, setas mudam a velocidade, + e − mudam a letra
- Gravação em MP4 quando o navegador permite (Chrome/Edge/Android recentes), senão WebM
- Meus vídeos: ficam guardados no aparelho (IndexedDB), com opções de baixar, compartilhar e apagar
- No APK, "Enviar ou salvar" abre a tela de compartilhar do Android (Galeria, WhatsApp, Instagram, Drive)
- Tela fica acesa enquanto grava
- Login opcional por código no e-mail (Supabase): os roteiros sincronizam entre aparelhos
- Funciona sem internet e sem conta

---

## PASSO A PASSO

### Passo 1: Rodar no seu computador

1. Instale o Node.js 22 (https://nodejs.org).
2. Descompacte o zip e abra o terminal dentro da pasta fala-pronto.
3. Rode:

   npm install
   npm run dev

4. Abra http://localhost:3000 no Chrome.
5. Clique em "Abrir o teleprompter" e permita câmera e microfone.

### Passo 2: Subir para o GitHub

1. Crie um repositório vazio no GitHub, por exemplo edsystems/fala-pronto (pode ser privado).
2. Dentro da pasta, rode:

   git init
   git add .
   git commit -m "Fala Pronto MVP"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/fala-pronto.git
   git push -u origin main

### Passo 3: Publicar o site (Cloudflare Pages)

A câmera só funciona em https, e o Cloudflare Pages já entrega com https.

Jeito mais rápido (sem GitHub): use o arquivo fala-pronto-site.zip que veio junto.
1. Cloudflare > Workers & Pages > Create > Pages > Upload assets.
2. Dê o nome fala-pronto e arraste o fala-pronto-site.zip.
3. Clique em Deploy. O site fica em https://fala-pronto.pages.dev (ou nome parecido).

Jeito automático (atualiza a cada push no GitHub):

1. Cloudflare > Workers & Pages > Create > Pages > Connect to Git.
2. Escolha o repositório fala-pronto.
3. Configure:
   - Framework preset: Next.js (Static HTML Export)
   - Build command: npm run build
   - Build output directory: out
4. Em Environment variables, adicione NODE_VERSION = 22.
5. Clique em Save and Deploy.
6. Para usar seu domínio (ex.: falapronto.edsystems.com.br), vá em Custom domains > Set up a custom domain. O DNS já está no Cloudflare, então ele cria o registro sozinho.

Na Vercel funciona igual: importe o repositório e ela detecta tudo.
Na Hostinger: rode npm run build e envie o CONTEÚDO da pasta out/ para public_html.

### Passo 4: Gerar o APK (automático pelo GitHub)

O repositório já traz o arquivo .github/workflows/android-apk.yml.

1. Depois do push do Passo 2, abra o repositório no GitHub > aba Actions.
2. Clique em "Gerar APK Android". Ele roda sozinho a cada push na main (leva uns 5 a 8 minutos).
3. Quando ficar verde, abra a execução e desça até Artifacts.
4. Baixe fala-pronto-apk (vem em .zip) e extraia o fala-pronto.apk.
5. Mande para o celular (WhatsApp, Drive ou cabo) e instale. O Android vai pedir para permitir "instalar apps de fontes desconhecidas". Aceite.
6. Abra o app, toque em gravar e permita câmera e microfone.

Para o botão "Baixar para Android" do site funcionar, copie o fala-pronto.apk para a pasta public/ e faça um novo deploy.

### Passo 5 (opcional): Login e roteiros na nuvem com Supabase

1. Crie um projeto em https://supabase.com.
2. SQL Editor > New query > cole o conteúdo de supabase/schema.sql > Run.
3. Authentication > Sign In / Providers > Email: deixe ativado.
4. Authentication > Email Templates > Magic Link: troque o corpo por algo como
   "Seu código do Fala Pronto: {{ .Token }}"
   (o app pede o código de 6 dígitos, não usa link).
5. Project Settings > API: copie a Project URL e a anon public key.
6. Coloque as duas em três lugares:
   - No computador: crie um arquivo .env.local (modelo em .env.example)
   - No Cloudflare Pages: Settings > Environment variables
   - No GitHub: Settings > Secrets and variables > Actions > New repository secret
     (NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY)
7. Faça um novo deploy. A aba "Conta" aparece no app.

### Passo 6 (para publicar na Play Store): APK assinado

O APK do Passo 4 é de teste (debug). Para a Play Store:

1. Gere uma chave (precisa do Java instalado):

   keytool -genkey -v -keystore release.keystore -alias falapronto -keyalg RSA -keysize 2048 -validity 10000

2. Guarde o arquivo e as senhas em lugar seguro. Se perder, não dá para atualizar o app na loja.
3. Converta para texto: base64 -w0 release.keystore (no Windows use o Git Bash).
4. No GitHub, crie os secrets:
   ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS (falapronto), ANDROID_KEY_PASSWORD
5. No próximo push o workflow gera o APK release assinado.
6. Para a Play Store o formato é .aab: troque assembleRelease por bundleRelease no workflow.

---

## Estrutura

src/app/page.tsx              site (página inicial)
src/app/app/page.tsx          lista de roteiros
src/app/app/roteiro/          editor
src/app/app/gravar/           teleprompter + câmera + gravação
src/app/app/videos/           meus vídeos
src/app/app/conta/            login (só com Supabase)
src/lib/                      config, roteiros, vídeos, preferências, compartilhar
supabase/schema.sql           tabela + segurança (RLS)
android/                      projeto Android (Capacitor)
.github/workflows/            gera o APK

## Próximas versões sugeridas (com base na BIGVU)

1. Roteiro com IA (Claude Haiku / Groq) a partir de um tema
2. Legendas automáticas (transcrição + legenda queimada estilo Reels)
3. Corte de pausas e "ééé" pela transcrição
4. Formato 9:16, 1:1 ou 16:9 com logo/marca d'água (kit de marca)
5. Vídeos na nuvem (Supabase Storage) e link de compartilhamento
6. Rolagem guiada pela voz (o texto acompanha a fala)
