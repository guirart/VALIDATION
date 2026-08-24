# Veredicta

> Senha padrão do app: `marcal2015`. Em produção, ela pode ser sobrescrita pela variável `APP_PASSWORD`. — MP nº 1.376/2026 — modo GPT Action

App web para organizar e auditar análises de contratos de crédito rural. Nesta versão, **o app não chama a OpenAI por API**.

O motor de IA é um **GPT personalizado no ChatGPT**. O GPT usa **Actions** para conversar com este app:

1. o app/Supabase guarda o contrato;
2. o GPT chama `getCaseForAnalysis`;
3. o GPT executa análise jurídica + auditoria adversarial usando suas instruções e Knowledge;
4. o GPT chama `submitAuditedAnalysis`;
5. o backend valida estruturalmente os 15 pontos e verifica literalmente citações da MP e do contrato;
6. o app mostra o resultado;
7. um advogado realiza a revisão humana obrigatória.

## Arquivos importantes

- `GPT_INSTRUCTIONS.md` — instruções para colar no GPT.
- `openapi.yaml` — schema da Action.
- `SETUP_GPT_ACTION.md` — configuração passo a passo.
- `api/gpt/*` — endpoints exclusivos da Action.
- `legal/*` — fontes jurídicas que também devem ser anexadas como Knowledge do GPT.
- `supabase/schema.sql` — banco.

## Segurança

O app usa duas autenticações independentes:

- navegador: sessão com `APP_PASSWORD`;
- GPT Action: Bearer `GPT_ACTION_API_KEY`.

A `SUPABASE_SERVICE_ROLE_KEY` fica somente no backend e nunca é entregue ao GPT.

## Deploy

Veja `SETUP_GPT_ACTION.md` e `DEPLOY.md`.
