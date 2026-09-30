# Setup — Semana 1 (Supabase, GitHub, Cloudflare Pages)

Guia para você criar as contas/projetos reais. Eu não consigo criar contas
em serviços externos por você — quando terminar cada bloco, me passe o que
está pedido em **"Me devolva"** que eu termino a integração (edito `.env`,
rodo as migrations, configuro o deploy).

---

## 1. Supabase (banco + auth)

1. Crie uma conta em https://supabase.com (pode ser com GitHub).
2. **New project** → escolha organização, nome (`obra-facil`), senha do
   banco (guarde-a) e região **South America (São Paulo)**.
3. Aguarde o projeto provisionar (~2 min).
4. Em **Project Settings → API**, copie:
   - `Project URL`
   - `anon public` key
5. Em **Authentication → Providers**:
   - **Email**: já vem habilitado. Em **Authentication → URL Configuration**,
     defina `Site URL` como `http://localhost:5173` por enquanto (trocamos
     para o domínio real no deploy).
   - **Google**: ative o provider Google. Para isso você precisa de um
     OAuth Client no [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
     - Tipo de aplicativo: **Web application**.
     - Authorized redirect URI: use a URL que o Supabase mostra na tela do
       provider Google (formato `https://SEU-PROJETO.supabase.co/auth/v1/callback`).
     - Copie o **Client ID** e **Client Secret** gerados e cole nos campos
       do provider Google no Supabase.

**Me devolva:** `Project URL`, `anon public key` (e me avise se preferir
que eu não veja o Client Secret do Google — nesse caso só confirme que o
provider está "Enabled" no painel).

### 1.1 Rodar as migrations no projeto real

Depois de me passar as credenciais acima, eu aplico
`supabase/migrations/0001_initial_schema.sql` e `0002_rls_policies.sql`.
Se preferir aplicar você mesmo primeiro:

```bash
npx supabase login
npx supabase link --project-ref SEU-PROJECT-REF   # está na URL do projeto
npx supabase db push
```

O `SEU-PROJECT-REF` é o pedaço antes de `.supabase.co` na Project URL.

---

## 2. GitHub (repositório de código)

1. Crie um repositório novo e **vazio** (sem README/gitignore) em
   https://github.com/new — sugestão de nome: `obra-facil`. Pode ser
   privado.
2. Me passe a URL do repositório (ex.: `https://github.com/seu-usuario/obra-facil.git`).
3. Eu faço `git remote add origin ...` e `git push` do que já está commitado
   localmente.

Alternativa: se você tiver o [GitHub CLI](https://cli.github.com/)
instalado e autenticado (`gh auth login`), me avise que eu crio e faço o
push direto por aqui.

---

## 3. Cloudflare Pages (hospedagem do front-end)

1. Crie uma conta em https://dash.cloudflare.com/sign-up (grátis).
2. **Workers & Pages → Create → Pages → Connect to Git** e conecte o
   repositório GitHub criado no passo 2.
3. Configuração de build:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Em **Environment variables**, adicione (mesmos valores do `.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Você recebe uma URL tipo `obra-facil.pages.dev`.
6. Depois do primeiro deploy, volte no Supabase (**Authentication → URL
   Configuration**) e adicione essa URL em `Site URL` / `Redirect URLs`,
   senão o login Google/magic link não redireciona certo em produção.

**Me devolva:** a URL `*.pages.dev` gerada, para eu atualizar a config do
Supabase Auth e o README.

---

## 4. Depois de me passar tudo isso

Eu vou:
1. Preencher `.env` local com suas credenciais (não commitado — está no
   `.gitignore`).
2. Rodar `npm run dev` e confirmar que o login Google e o link mágico
   funcionam de ponta a ponta.
3. Aplicar as migrations no projeto (se você ainda não tiver feito).
4. Deixar tudo commitado e sincronizado com o GitHub.
5. Seguir para a **Semana 2** do roadmap (seção 14): perfis, categorias,
   catálogo e verificação de profissionais.
