# Versão 1.3 — substituição integral

Esta versão usa **1 única Serverless Function** (`api/index.js`).

## IMPORTANTE
Não copie por cima do repositório antigo. Apague os arquivos antigos do projeto, preservando somente a pasta `.git`, e então copie o conteúdo desta versão.

Depois execute:

```bash
git add -A
git commit -m "Versao 1.3 - API unificada para Vercel Hobby"
git push
```

No GitHub, confirme que a pasta `/api` contém **somente** `index.js`.

A Vercel continuará aceitando as URLs antigas (`/api/auth`, `/api/cases`, `/api/gpt/...`) por meio de rewrites, mas todas são processadas pela mesma função.
