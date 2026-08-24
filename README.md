# Veredicta — versão 1.1

MVP de triagem de contratos rurais com GPT Action e Supabase.

## Supabase nesta versão
O app funciona com as duas variáveis que o dashboard moderno do Supabase fornece:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Para isso, execute `supabase/schema.sql` no SQL Editor. O arquivo cria as tabelas e as policies necessárias ao modo MVP.

> Segurança: as policies desta versão permitem acesso `anon` às tabelas. Use somente contratos fictícios/testes. Para produção com dados reais, migre para Supabase Auth/RLS por usuário ou use chave secreta no backend.

## Login do app
Senha padrão: `marcal2015` (pode ser sobrescrita por `APP_PASSWORD`).

## Deploy
Veja `DEPLOY.md`.
