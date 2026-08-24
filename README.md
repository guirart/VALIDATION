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

## Supabase — nomes de variáveis aceitos

A URL do projeto pode ser configurada como `NEXT_PUBLIC_SUPABASE_URL` (preferida quando o projeto já foi iniciado pelo assistente do Supabase) ou `SUPABASE_URL`.

A `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` é reconhecida para diagnóstico, mas **não é usada para gravar contratos**. O schema ativa RLS e não possui policies públicas. Para operações server-side configure `SUPABASE_SECRET_KEY` (chave `sb_secret_...`, recomendada nos projetos novos) ou, em projetos legados, `SUPABASE_SERVICE_ROLE_KEY`.

Depois do login, `GET /api/config` informa apenas se as variáveis foram detectadas e quais nomes foram usados; nenhum valor secreto é devolvido.


## Versão 1.4 — checklist no app

Cada caso agora exibe permanentemente os 15 pontos jurídicos. Antes da análise ficam como pendentes; após a Action do GPT, cada ponto mostra veredito, referência jurídica, citação da MP, citação do contrato, raciocínio e status da auditoria.


## Versão 1.5 — fluxo do painel de referência

A interface foi redesenhada para reproduzir o fluxo demonstrado no vídeo de referência:
- abas horizontais por caso;
- classificação final + resumo;
- grade 4×4 dos 15 pontos;
- filtros por veredito;
- expansão/recolhimento dos 15 cards;
- comparação "Na MP" × "No contrato/laudo";
- formulário de novo contrato no mesmo fluxo;
- checklist resolutivo com documentação genérica;
- itens dos pontos 1–15 aparecem somente quando o ponto não está `atinge`;
- marcações do checklist persistem no navegador por caso;
- atualização automática quando uma nova análise chega do GPT.
