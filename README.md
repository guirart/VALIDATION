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


## Versão 1.6 — histórico lateral

Mantém o fluxo da versão 1.5, mas substitui a navegação por abas horizontais por uma barra lateral rolável. As análises antigas ficam permanentemente acessíveis à esquerda, com busca, cliente, classificação, status e data. O caso selecionado abre no painel principal com os 15 pontos, evidências, filtros e checklist resolutivo.


## Versão 1.7 — segurança jurídica e validação

- valida citações com normalização apenas de formatação, sem fuzzy/semântica;
- trata o ponto 6 como silêncio normativo sem fabricar citação;
- corrige o campo técnico `atencao`;
- usa o número real `point`, verifica duplicados e exige exatamente 1–15;
- impede `atinge` quando a evidência documental é um marcador de ausência;
- exige fundamentação em todos os findings da auditoria;
- quality gate passa a medir integridade técnica (15 pontos confirmados + classificações coerentes), não resultado jurídico favorável;
- retorna `quality_gate_reasons` separadamente;
- ponto 7 atualizado para exigir adimplência conforme o texto normativo.


## Versão 1.8 — separação entre evidência e resultado jurídico

Cada ponto passa a ter `evidence_status` e `legal_result`. O backend rejeita contradições como `nao_consta` quando a própria citação do dossiê foi localizada, e impede `atende` sem evidência comprovada. O `verdict` antigo permanece apenas para compatibilidade visual e é derivado dos dois campos novos.


## Versão 1.9 — Action, backend e modelo jurídico sincronizados

- `evidence_status` e `legal_result` são obrigatórios no schema da GPT Action;
- arquivo `GPT_ACTION_SCHEMA_V1.9.yaml` pronto para copiar no editor do GPT;
- backend retorna `validation_error_details` categorizados por tipo e ponto;
- correção automática deve usar esses detalhes e ocorrer no máximo uma vez;
- `nao_atende` não pode ser usado quando a evidência relevante simplesmente `nao_consta`;
- painel exibe separadamente situação da prova e resultado jurídico;
- schema, GPT, backend e interface usam os mesmos enums.
