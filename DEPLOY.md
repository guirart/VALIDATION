# Deploy — Veredicta v3.11

1. Publique o projeto na Vercel.
2. Configure Supabase Auth, Supabase server key, `APP_SESSION_SECRET`, Stripe e `VEREDICTA_ADMIN_EMAIL`.
3. Execute as migrations já aplicáveis ao banco e, para a v3.11, execute `supabase/migration_v3_11_gpt_oauth.sql`.
4. Configure na Vercel `GPT_OAUTH_CLIENT_ID`, `GPT_OAUTH_CLIENT_SECRET` e, depois de criar a Action, `GPT_OAUTH_REDIRECT_URIS`.
5. Faça redeploy.
6. No GPT personalizado, cole `GPT_INSTRUCTIONS.md` e use o `openapi.yaml` completo.
7. Em Actions > Authentication, selecione OAuth.
8. Use Authorization URL `https://SEU-DOMINIO/oauth/authorize`, Token URL `https://SEU-DOMINIO/api/oauth/token` e scope `veredicta`.
9. Copie a Callback URL fornecida pelo editor do GPT para `GPT_OAUTH_REDIRECT_URIS` na Vercel e faça novo redeploy.
10. Teste com um usuário adimplente e confirme que o GPT enxerga somente os casos daquela conta.

Não configure `OPENAI_API_KEY`: o Veredicta não chama a API da OpenAI diretamente.
