# Painel Pessoal

Dashboard pessoal com plano alimentar gerado via API da Anthropic. Next.js 14, autenticação JWT, pronto para deploy no Vercel.

## Stack

- **Next.js 14** — App Router + API Routes
- **Anthropic SDK** — plano alimentar gerado por IA
- **jose** — JWT para autenticação
- **Tailwind CSS** — estilo utilitário

---

## Setup local

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o arquivo de variáveis

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...        # Chave da Anthropic Console
DASHBOARD_PASSWORD=sua-senha-forte  # Senha de acesso ao painel
AUTH_SECRET=                        # Gerar com: openssl rand -base64 32
```

### 3. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000` — vai redirecionar para `/login`.

---

## Deploy no Vercel

### 1. Criar repositório no GitHub e fazer push

```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/SEU_USUARIO/painel-pessoal.git
git push -u origin main
```

### 2. Importar no Vercel

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Selecione o repositório
3. Em **Environment Variables**, adicione as três variáveis:
   - `ANTHROPIC_API_KEY`
   - `DASHBOARD_PASSWORD`
   - `AUTH_SECRET`
4. Clique em **Deploy**

---

## Como atualizar o plano

O plano é gerado pela API da Anthropic automaticamente. Há cache de 6 horas — o mesmo plano não é regenerado a cada visita.

Para forçar regeneração:
- No dashboard, clique no botão **"Regenerar plano"**
- Ou faça `POST /api/meal-plan` diretamente

Para alterar as restrições e preferências alimentares, edite o `SYSTEM_PROMPT` em:
```
src/app/api/meal-plan/route.ts
```

---

## Adicionar novas seções

O dashboard tem sidebar expansível. Para adicionar uma seção (ex: treino, medicamentos, peso):

1. Crie a página em `src/app/dashboard/NOME/page.tsx`
2. Adicione a API em `src/app/api/NOME/route.ts` (se necessário)
3. Descomente/adicione a entrada no array `NAV` em `src/app/dashboard/layout.tsx`
