# Deploy Veredicta v3.9

1. Execute `supabase/migration_v3_9_multiuser.sql` no Supabase SQL Editor.
2. Ative Email/Password em Supabase Authentication.
3. Adicione na Vercel: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `SUPABASE_ANON_KEY`) e `ALLOW_SIGNUP=true|false`, além das chaves Supabase já usadas.
4. Faça deploy.
5. Abra `/login.html`, crie/acesse uma conta e confirme que um caso real criado por ela recebe `owner_id`.
6. Teste outro usuário: ele não deve visualizar o caso real do primeiro.
7. Confirme que casos sintéticos continuam visíveis para o Test Lab.
8. A Action `/api/gpt/cases` deve listar apenas casos sintéticos.
