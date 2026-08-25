# Configuração do GPT Action — Veredicta

## 1. Faça o deploy do app

Suba este projeto para GitHub e Vercel e configure Supabase normalmente.

## 2. Variáveis da Vercel

Configure:

- `APP_PASSWORD`
- `APP_SESSION_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GPT_ACTION_API_KEY` — gere uma chave aleatória longa; esta é a chave usada exclusivamente pela Action.
- `LEGAL_SOURCE_VERSION`
- `MEMORANDUM_VERSION`
- `CUSTOM_GPT_URL` — opcional; adicione depois que criar o GPT para o botão do painel poder abri-lo diretamente.

Não existe `OPENAI_API_KEY` neste projeto.

## 3. Crie o GPT no ChatGPT

No editor de GPTs:

1. Crie um GPT novo.
2. Cole o conteúdo de `GPT_INSTRUCTIONS.md` no campo de instruções.
3. Em Knowledge, envie:
   - `legal/MP_1376_2026_texto_integral.md`
   - `legal/15_pontos_analise_MP_1376.md`
4. Em Actions, escolha criar nova Action.
5. Em autenticação, escolha API Key e tipo Bearer.
6. Como chave, use exatamente o valor de `GPT_ACTION_API_KEY` configurado na Vercel.
7. Abra `openapi.yaml`, troque `https://SEU-DOMINIO.vercel.app` pelo domínio real da Vercel e cole o schema no editor da Action.
8. Teste `getLegalSourceStatus`, `listCases`, `getCaseForAnalysis` e `submitAuditedAnalysis` na Prévia.

A OpenAI exige um schema OpenAPI para definir servidor, endpoints, parâmetros e operationIds das Actions. A autenticação pode ser None, API key ou OAuth. Para este app interno, Bearer API key é o desenho mais simples.

## 4. Fluxo de uso

### Pelo app

1. Entre no Veredicta.
2. Crie o caso e cole o contrato/dossiê.
3. Clique em `Analisar no GPT`.
4. No GPT, diga: `Analise o caso <UUID>.`
5. O GPT chama as Actions, analisa e grava o resultado.
6. Volte ao app e atualize o caso.
7. Faça a revisão humana.

### Diretamente pelo GPT

Você também pode colar um contrato no GPT e pedir que ele use `createCase` antes de analisar. Assim o caso já nasce no Supabase e o resultado volta ao painel.

## Segurança

- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` ao GPT.
- A Action conhece apenas `GPT_ACTION_API_KEY`.
- O navegador usa sessão própria (`APP_PASSWORD`/cookie); a Action usa Bearer separado.
- Mantenha o GPT privado se houver dados reais de clientes.
- O painel continua exigindo revisão humana antes de marcar um caso como concluído.


## Atualização obrigatória para v1.9

No editor do GPT, substitua integralmente o schema antigo da Action pelo conteúdo de:

`GPT_ACTION_SCHEMA_V1.9.yaml`

Sem essa atualização, o GPT continuará operando com o contrato antigo e poderá alegar que `evidence_status` e `legal_result` não existem.


## Atualização v2.0

Substitua integralmente o schema da Action pelo conteúdo de:
`GPT_ACTION_SCHEMA_V2.0.yaml`

A Action de produção NÃO oferece criação de casos.
O POST disponível aceita somente `action=gpt-analysis`.


## Atualização obrigatória v2.8

Substitua o schema da Action pelo arquivo `GPT_ACTION_SCHEMA_V2.8.yaml`.

A atualização é necessária porque `source_contract_sha256` passou a ser obrigatório no envio da análise.


## Atualização obrigatória v3.3
Substitua o schema da Action por `GPT_ACTION_SCHEMA_V3.3.yaml`.

A nova operação `importarCasosSinteticosVeredicta` só funciona se `TEST_IMPORT_ENABLED=true` na Vercel.
