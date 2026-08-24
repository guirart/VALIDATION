# Deploy — Versão 1.1 (Supabase publishable key)

## 1. Vercel
Configure em Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `APP_PASSWORD=marcal2015`
- `APP_SESSION_SECRET`
- `GPT_ACTION_API_KEY`

Depois faça um novo deploy.

## 2. Supabase
Abra **SQL Editor → New query**, cole TODO o conteúdo de `supabase/schema.sql` e clique em **Run**.

Sem esse passo, a publishable key será bloqueada pelo RLS.

## 3. Teste
Entre no app e crie um caso.

## Aviso de segurança
Esta versão habilita policies `anon` para permitir o MVP funcionar somente com a publishable key. Isso é adequado para teste com contratos fictícios, não para contratos reais/confidenciais.

Para produção, use Supabase Auth + policies por usuário/organização ou uma secret/service-role key somente no backend e remova as policies anônimas.
