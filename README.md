# Yep Ads — Vagas Brasil

Landing page de captação de candidaturas para 8 vagas home office da Yep Ads no Brasil.

## Stack

- **Frontend**: HTML/CSS/JS puro (1 arquivo, sem build)
- **Hospedagem**: Vercel (grátis)
- **Backend**: Vercel Serverless Functions (Node.js, no diretório `/api`)
- **Banco de dados**: Supabase (Postgres, grátis até 500MB)
- **Versionamento**: GitHub

---

## 🚀 Passo-a-passo do deploy completo

> Faz na ordem. Leva uns 20–30 min na primeira vez. Depois é só `git push` que atualiza tudo sozinho.

### 1) Supabase — criar o banco

1. Acessa https://supabase.com → "Start your project" → loga com GitHub.
2. **New project**:
   - Name: `yepads-vagas`
   - Database password: (gera uma e salva)
   - Region: `South America (São Paulo)`
   - Plan: `Free`
3. Espera ~2 min até o projeto provisionar.
4. No menu lateral → **SQL Editor** → **New query** → cola e roda:

```sql
create table candidaturas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  whatsapp text not null,
  vaga text not null,
  link text,
  created_at timestamptz default now()
);

-- Index pra ordenar por data
create index idx_candidaturas_created_at on candidaturas (created_at desc);
```

5. Vai em **Project Settings (engrenagem) → API** e copia:
   - **Project URL** → será o `SUPABASE_URL` (ex: `https://xxxxx.supabase.co`)
   - **service_role secret** (em "Project API keys") → será o `SUPABASE_SERVICE_KEY`

⚠️ **Atenção**: a `service_role key` tem poderes totais no banco. NUNCA coloca ela no frontend nem comita no Git. Ela só vai como variável de ambiente no Vercel.

---

### 2) GitHub — criar e subir o repositório

Abre o terminal **na pasta do projeto** (a que tem o `index.html`).

```bash
# Inicializa git
git init
git add .
git commit -m "primeiro commit: landing de vagas yep"

# Cria o repo no GitHub via CLI (precisa ter o gh instalado)
# Se não tiver: https://cli.github.com/
gh auth login
gh repo create yepads-vagas --public --source=. --remote=origin --push
```

**Sem o `gh` (CLI do GitHub)?** Cria o repo manualmente em https://github.com/new (nome: `yepads-vagas`, público) e roda:

```bash
git remote add origin https://github.com/SEU_USUARIO/yepads-vagas.git
git branch -M main
git push -u origin main
```

---

### 3) Vercel — fazer o deploy

**Opção A — via CLI (mais rápido):**

```bash
# Instala a CLI uma vez só
npm install -g vercel

# Loga
vercel login

# Deploy (na pasta do projeto)
vercel
# → escolhe o time, nome do projeto, "directory" deixa o padrão (./)
# Vai pedir "deploy?" → enter
```

A primeira vez ele pergunta umas coisas. Aceita os defaults.

Depois, configura as variáveis de ambiente:

```bash
vercel env add SUPABASE_URL
# Cola o valor → escolhe "Production, Preview, Development"

vercel env add SUPABASE_SERVICE_KEY
# Cola o valor → escolhe "Production, Preview, Development"
```

Faz o deploy de produção:

```bash
vercel --prod
```

**Opção B — via dashboard:**

1. Vai em https://vercel.com → "Add New Project"
2. Importa o repositório `yepads-vagas` do GitHub
3. Em **Environment Variables**, adiciona:
   - `SUPABASE_URL` = (cola o valor)
   - `SUPABASE_SERVICE_KEY` = (cola o valor)
4. Clica **Deploy**

Pronto. Em ~1 min vai ter uma URL tipo `https://yepads-vagas.vercel.app`

---

### 4) Testar

1. Acessa a URL do Vercel
2. Preenche o formulário
3. No painel do Supabase → **Table Editor** → `candidaturas` — deve aparecer a linha que você acabou de criar

---

## 📊 Como ver as candidaturas

**Via Supabase Dashboard** (mais fácil):
- Login no Supabase → seu projeto → **Table Editor** → `candidaturas`
- Pode exportar pra CSV, filtrar, etc.

**Via SQL** (pra relatórios):
```sql
-- Total por vaga
select vaga, count(*) from candidaturas group by vaga order by count desc;

-- Últimas 20 candidaturas
select nome, vaga, created_at from candidaturas
order by created_at desc limit 20;
```

---

## 🔄 Atualizar a página

Mudou o `index.html`? Só dar push:

```bash
git add .
git commit -m "atualiza copy"
git push
```

O Vercel detecta o push e refaz o deploy automaticamente (~30 segundos).

---

## 🌐 Domínio próprio (opcional)

No painel do Vercel → projeto → **Settings → Domains** → adiciona o domínio (ex: `vagas.yepads.com.br`). Eles te dão os registros DNS pra apontar.

---

## ⚠️ Coisas pra ajustar antes de mandar pro cliente

- [ ] Validar com o cliente as **faixas salariais** mostradas (estão como exemplo)
- [ ] Confirmar se as **descrições das vagas** estão certas
- [ ] Trocar o **ano** no rodapé se necessário
- [ ] (Opcional) Adicionar um campo "currículo" no form que faz upload pro Supabase Storage
- [ ] (Opcional) Configurar email automático de confirmação (via Resend ou Supabase Edge Function)

---

## 💡 Custos

Tudo aqui é **grátis** dentro dos limites:
- **Vercel Free**: 100 GB bandwidth/mês — sobra muito pra uma página de vagas
- **Supabase Free**: 500 MB de banco, 50.000 rows/mês — dá pra receber dezenas de milhares de candidaturas
- **GitHub**: repos públicos são grátis e ilimitados

Se passar dos limites (improvável), o upgrade mais barato é uns USD $20/mês cada um.
