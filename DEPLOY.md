# Deploy — Veredicta GPT Action

1. Crie um projeto Supabase e execute `supabase/schema.sql`.
2. Suba o repositório no GitHub e importe na Vercel.
3. Configure as variáveis de `.env.example` na Vercel.
4. Faça o primeiro deploy.
5. Crie o GPT personalizado conforme `SETUP_GPT_ACTION.md`.
6. Troque o servidor placeholder em `openapi.yaml` pelo domínio real da Vercel e cole o schema em Actions.
7. Configure a Action com API key Bearer usando `GPT_ACTION_API_KEY`.
8. Anexe os dois arquivos de `legal/` como Knowledge do GPT.
9. Teste uma análise fictícia antes de inserir dados reais.

Não configure `OPENAI_API_KEY`: esta versão não chama a API da OpenAI.
