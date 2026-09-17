# Configuração do GPT Action — Veredicta v3.11

## 1. Deploy

Publique o Veredicta na Vercel e mantenha Supabase, Stripe, login e sessão configurados.

## 2. Migration OAuth

No Supabase > SQL Editor, execute:

`supabase/migration_v3_11_gpt_oauth.sql`

## 3. Variáveis OAuth na Vercel

Configure:

```text
GPT_OAUTH_CLIENT_ID=veredicta-chatgpt
GPT_OAUTH_CLIENT_SECRET=<segredo longo e exclusivo>
GPT_OAUTH_REDIRECT_URIS=<callback URL mostrada pelo editor do GPT>
```

Também mantenha as variáveis já usadas pelo aplicativo, como `APP_SESSION_SECRET`, Supabase, Stripe e `VEREDICTA_ADMIN_EMAIL`.

`GPT_ACTION_API_KEY` pode permanecer somente para compatibilidade com integrações antigas. Novos usuários não devem receber essa chave.

## 4. Crie ou atualize o GPT

No editor de GPTs:

1. Use `GPT_INSTRUCTIONS.md` como instruções.
2. Em Knowledge, mantenha as fontes jurídicas do Veredicta.
3. Em Actions, use integralmente o `openapi.yaml` da v3.11.
4. Em Authentication, escolha **OAuth**.
5. Client ID: o mesmo `GPT_OAUTH_CLIENT_ID` da Vercel.
6. Client Secret: o mesmo `GPT_OAUTH_CLIENT_SECRET` da Vercel.
7. Authorization URL: `https://SEU-DOMINIO/oauth/authorize`
8. Token URL: `https://SEU-DOMINIO/api/oauth/token`
9. Scope: `veredicta`
10. Se houver opção de método de troca do token, escolha **Basic**.

O editor fornecerá uma Callback URL. Copie essa URL exatamente para `GPT_OAUTH_REDIRECT_URIS` na Vercel e faça redeploy.

A OpenAI documenta OAuth como o modo apropriado quando a Action precisa identificar contas individuais.

## 5. Fluxo do usuário

1. Usuário cria a conta no Veredicta.
2. Confirma e-mail e conclui a assinatura.
3. Abre o GPT Veredicta.
4. O ChatGPT solicita conexão da conta.
5. Abre a tela de autorização do Veredicta.
6. Usuário entra com o mesmo e-mail e senha do Veredicta.
7. Usuário aprova a conexão.
8. A Action passa a acessar somente os casos daquele `owner_id`.

Não existe chave para o usuário copiar.

## 6. Administração

A tela `/admin-users.html` mostra contas, assinatura e estado da conexão GPT. O administrador pode suspender uma conta ou revogar a conexão GPT.

## Segurança

- nunca exponha `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` ao GPT;
- nunca coloque `GPT_OAUTH_CLIENT_SECRET` no frontend;
- o banco grava somente hashes de códigos e tokens OAuth;
- usuário comum só conecta o GPT com assinatura `active` ou `trialing`;
- administrador continua isento de cobrança;
- mantenha revisão humana antes de concluir casos reais.
