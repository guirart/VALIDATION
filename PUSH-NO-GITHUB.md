# Substituição limpa do repositório VALIDATION

Esta versão foi preparada para a Vercel Hobby e contém somente 8 Serverless Functions.

## IMPORTANTE
Não copie esta versão por cima dos arquivos antigos sem apagar o conteúdo anterior.
O erro anterior da Vercel ocorreu porque endpoints antigos permaneceram dentro de `/api`.

## Método recomendado

1. Faça backup do repositório atual.
2. Apague todos os arquivos do repositório local, preservando apenas a pasta `.git`.
3. Copie TODO o conteúdo deste pacote para a raiz do repositório.
4. Rode:

```bash
git add -A
git commit -m "Versao 1.2 limpa - Vercel Hobby e Supabase secret key"
git push
```

`git add -A` é importante porque registra as exclusões dos endpoints antigos.

## Funções Serverless esperadas

Somente estas 8:

- `api/auth.js`
- `api/cases.js`
- `api/config.js`
- `api/review.js`
- `api/gpt/cases.js`
- `api/gpt/case.js`
- `api/gpt/analysis.js`
- `api/gpt/source-status.js`

Os helpers ficam em `/lib` e NÃO devem voltar para `/api/_lib`.

## Variáveis da Vercel

Use:

- `APP_PASSWORD=marcal2015`
- `APP_SESSION_SECRET=<segredo>`
- `GPT_ACTION_API_KEY=<segredo>`
- `NEXT_PUBLIC_SUPABASE_URL=<url>`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>`
- `SUPABASE_SECRET_KEY=<sb_secret_...>`
- `LEGAL_SOURCE_VERSION=2026-08-24`
- `MEMORANDUM_VERSION=1.0`

O backend prioriza `SUPABASE_SECRET_KEY` e também aceita `SUPABASE_SERVICE_ROLE_KEY` por compatibilidade.
