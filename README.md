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


## Versão 2.0 — modo de produção

Separação rígida de responsabilidades:

APP VEREDICTA
- cadastra casos reais;
- armazena contrato/dossiê;
- exibe histórico e análise;
- permite revisão humana.

GPT VEREDICTA
- somente leitura dos casos existentes;
- executa análise dos 15 pontos;
- executa auditoria adversarial;
- grava somente a análise.

O GPT não possui mais Action para criar caso.
Mesmo que uma chamada POST `gpt-cases` seja tentada manualmente, o backend retorna 405.


## Versão 2.1 — novo caso em página separada

O cadastro deixou de aparecer no meio das análises.

Fluxo:
- painel principal (`/`) = histórico, análises, checklist e revisão;
- botão `+ Novo caso` = abre `/new-case.html`;
- página `new-case.html` = cadastro exclusivo do caso/dossiê;
- após salvar, o app retorna ao painel com `?case=<UUID>` e abre automaticamente o caso recém-criado.

O GPT continua sem permissão para criar ou editar casos.

## Versão 2.2 — citações seguras
O validador mantém correspondência literal da MP e amplia a exceção controlada de silêncio normativo aos pontos 6 e 12. A exceção exige referência explícita à ausência normativa e não autoriza paráfrase ou citação inventada.


## Versão 2.4 — cadastro manual corrigido

Correção de permissão:
- `/api/cases` usa autenticação da sessão do app e permite POST para cadastro manual;
- `/api/gpt/cases` / `gpt-cases` permanece somente leitura e rejeita métodos de escrita com 405;
- o GPT continua sem permissão para criar, editar ou excluir casos;
- o cadastro em `/new-case.html` volta a funcionar normalmente.


## Versão 2.5 — cabeçalho fixo
O cabeçalho institucional permanece visível durante a rolagem das páginas. A marca Veredicta, a identificação da MP, a logo institucional da OAB e as ações do cabeçalho não desaparecem ao rolar análises ou o formulário de novo caso.


## Versão 2.6 — validação correta dos pontos 6 e 12

Os pontos 6 e 12 agora aceitam citação literal da MP quando houver dispositivo expresso aplicável e aceitam silêncio normativo apenas quando esse silêncio for declarado de forma explícita. Isso corrige o falso bloqueio do quality gate sem afrouxar a validação.

Também foi acrescentado alerta visual quando o cliente cadastrado não é localizado literalmente no dossiê, para reduzir risco de mistura entre casos.


## Versão 2.7 — ponto 12 corrigido

A validação normativa foi centralizada.

Para os pontos 6 e 12:
- citação literal válida é aceita normalmente;
- silêncio normativo só é aceito quando referência jurídica + raciocínio + mp_quote são coerentes com ausência de previsão expressa;
- não existe mais estado híbrido em que o backend exige simultaneamente silêncio e citação literal.

Nos demais 13 pontos, a regra continua rígida: exige-se citação literal verificável quando o ponto usa fundamento normativo positivo.


## Versão 2.8.0 — diagnóstico e integridade

Correções:
- o marcador `Sem previsão expressa na MP` passa a ser reconhecido pelo validador de silêncio normativo;
- `source-status` informa `app_version` e `validator_version`;
- `gpt-case` retorna `contract_sha256`;
- o envio da análise exige `source_contract_sha256`;
- hash divergente rejeita a análise antes da gravação;
- o retorno do quality gate inclui `validation_debug` dos pontos 6 e 12 com cada condição booleana;
- logs registram versão, hash e diagnóstico.

Esta versão permite descobrir exatamente por que um ponto foi recusado e impede mistura de dossiês.


## Versão 2.9 — autenticação por cabeçalho personalizado

A integração passa a preferir `X-Veredicta-Key`, evitando ambiguidades do modo Bearer no editor de GPT Actions. Bearer permanece como fallback. Respostas 401 incluem apenas diagnóstico booleano sobre presença dos headers, nunca o valor das chaves.


## Versão 3.0 — diagnóstico completo e histórico lateral fixo

Diagnóstico:
- cada POST `gpt-analysis` registra etapas seguras no log;
- respostas 400 indicam `stage`, `field` e `received_fields` quando aplicável;
- quality gate retorna `failed_points`, `validation_error_details` e `validation_debug`;
- logs nunca registram conteúdo do contrato nem valores de chaves.

Interface:
- lateral permanece fixa;
- botões e estrutura da lateral não se movem;
- somente a caixa interna do histórico de casos possui rolagem;
- conteúdo principal rola independentemente da lateral;
- cabeçalho institucional continua fixo.


## Versão 3.1 — visual dark institucional

A interface foi redesenhada no estilo preto/grafite com acentos dourados.

Correção estrutural da lateral:
- `.history-sidebar` é fixa na tela;
- cabeçalho da lateral, busca e botão `+ Novo caso` não se movem;
- somente `.case-history` possui `overflow-y:auto`;
- a rolagem da análise ocorre apenas no conteúdo principal;
- o cabeçalho superior permanece fixo.

O backend e o diagnóstico da v3.0 foram preservados.


## Versão 3.2 — tema claro e escuro

O Veredicta agora possui dois temas:
- Claro
- Escuro

Há um botão no cabeçalho para alternância. A preferência fica salva em `localStorage` e é reaplicada ao abrir o painel e a página de novo caso.

O tema claro preserva a lateral escura fixa e o conteúdo principal claro. O tema escuro mantém o visual institucional grafite/dourado da v3.1.


## Versão 3.3 — importação controlada de casos sintéticos

Nova infraestrutura exclusivamente de teste:
- `POST /api/gpt/test-import` para GPT Action;
- `POST /api/test-import` para a página interna `/test-import.html`;
- proteção `TEST_IMPORT_ENABLED=true`;
- campos `synthetic`, `environment` e `external_test_id`;
- idempotência por `external_test_id`;
- adoção de casos manuais existentes pelo mesmo título sem substituir o dossiê;
- casos sintéticos recebem selo TESTE no histórico.

### Ordem de deploy
1. Execute `supabase/migration_v3_3_test_import.sql` no SQL Editor do Supabase.
2. Configure `TEST_IMPORT_ENABLED=true` somente durante a importação da bateria.
3. Faça deploy.
4. Atualize a Action com `GPT_ACTION_SCHEMA_V3.3.yaml`.
5. Importe `VEREDICTA_40_CASOS_IMPORT.json`.
6. Depois da importação, recomenda-se voltar `TEST_IMPORT_ENABLED=false`.


## Versão 3.4 — histórico e diagnóstico de análises

Novas operações somente leitura:
- GET /api/gpt/analysis-history?case_id=...
- GET /api/gpt/analysis-detail?id=...

A consulta detalhada retorna analyst_json, audit_json e o diagnóstico salvo:
validation_errors, validation_error_details, quality_gate_reasons,
validation_debug, failed_points, contract_sha256 e versões.


## Versão 3.5 — regressão dos pontos 11 e 12

- Corrige o falso negativo de silêncio no TEST-001/P12 reconhecendo "não contém previsão expressa".
- Trata ausência documental no P11 separadamente de silêncio normativo.
- Mantém citações não literais como erro.
- Ignora apenas markup Markdown de apresentação na comparação literal.
- `validation_debug` passa a incluir todos os 15 pontos.
- Não exige migração de banco.


## Versão 3.6
- P11: detector de silêncio documental baseado em sinais semânticos controlados, reduzindo dependência de frase canônica.
- Mantém travas: mp_quote literal, contract_quote literal, silêncio documental não pode virar `atende`.
- Tema claro: botões bege e paleta pastel; remove caixas pretas dos controles.
- Tema escuro permanece opcional.
- Sem migração de banco.


## UI patch 3.6.2 — legibilidade
- Corrige títulos brancos/ilegíveis no histórico do modo claro.
- O título usa agora a classe `history-title` e contraste preto explícito.
- Remove a faixa preta residual do scrollbar lateral.
- Mantém cartões bege/creme e estados em tons pastéis.
- Não altera o validador jurídico v3.6.


## UI 3.6.3 — histórico recolhível e redimensionável
- O histórico pode ser minimizado/expandido por botão.
- A divisória pode ser arrastada horizontalmente para ajustar a largura entre 240px e 560px.
- Botões −/+ fornecem alternativa acessível ao arraste.
- A largura e o estado recolhido ficam persistidos no navegador.
- O painel principal cresce automaticamente quando o histórico é reduzido.
- Não altera o validador jurídico.


## UI 3.6.4 — sidebar por arraste e minimização real
- Remove os botões + e −.
- A largura do histórico é alterada segurando o botão esquerdo do mouse na divisória e arrastando.
- Ao minimizar, a sidebar passa a largura 0 e o painel de análise ocupa o espaço liberado.
- Fica apenas uma pequena aba para reabrir o histórico.
- Não altera o validador jurídico.


## UI 3.6.5 — correção do layout real da sidebar
- Corrige a implementação para a variável real `--veredicta-sidebar-width`.
- A divisória agora fica fixa na borda da sidebar e redimensiona lateral e conteúdo simultaneamente.
- O arraste funciona segurando o botão esquerdo do mouse.
- Minimizar mantém um trilho de 52px com botão de reabrir sempre acessível.
- O painel direito ocupa imediatamente o espaço liberado.
- Não altera o validador jurídico.


## UI 3.6.8 — retorno ao template anterior
- Restaura integralmente o template visual da v3.6.5.
- Mantém a sidebar redimensionável por arraste e minimização recuperável.
- Remove as alterações de visão executiva das v3.6.6 e v3.6.7.
- Não altera o validador jurídico.


## UI 3.6.9 — classificação final destacada
- Mantém integralmente o template anterior da v3.6.8.
- Destaca somente o bloco de classificação final.
- Não adiciona visão executiva, documentos, cards ou novos painéis.
- Não altera lógica, API ou validador jurídico.


## UI 3.7.0 — classificação final em destaque
- Mantém o template original da v3.6.9.
- Altera somente o bloco de classificação final.
- Adiciona ícone contextual e contadores dos 15 pontos no próprio bloco.
- Cores distintas para enquadrável, parcialmente enquadrável, inconclusivo e não enquadrável.
- Não adiciona documentos, painéis extras ou nova visão de checklist.
- Não altera o validador jurídico.


## UI 3.7.1 — comparativo restaurado
- Corrige regressão da v3.7.0 em `renderCase()`.
- Mantém o novo destaque visual da classificação final.
- Restaura resumo, grade dos 15 pontos, filtros e quadro comparativo completo.
- Restaura as evidências “NA MP” × “NO CONTRATO / LAUDO” e seus indicadores de verificação.
- Mantém o checklist resolutivo e demais partes do template anterior.
- Não altera API nem validador jurídico.


## UI 3.7.2 — cores funcionais
- ATENDE/ATINGE em verde.
- PARCIAL em amarelo.
- ATENÇÃO em vermelho.
- Histórico: enquadrável verde, não enquadrável vermelho, parcialmente enquadrável amarelo e inconclusivo roxo.
- O pontinho e a borda do item ativo acompanham a classificação no histórico.
- Mantém comparativo, checklist, classificação destacada e validador jurídico intactos.


## UI 3.7.3 — correção definitiva das cores
- Corrige os seletores para os badges reais `.pill.v-atinge`, `.pill.v-parcial` e `.pill.v-atencao`.
- ATINGE/ATENDE fica sempre verde, PARCIAL sempre amarelo e ATENÇÃO sempre vermelho.
- Injeta a classe real da classificação nos cards e badges do histórico.
- Histórico: enquadrável verde, não enquadrável vermelho, parcialmente enquadrável amarelo e inconclusivo roxo.
- Pontos e bordas do item ativo acompanham a classificação.
- Mantém comparativo, checklist, hero de classificação e validador jurídico intactos.


## UI 3.7.4 — status visual coerente
- Corrige o caso em que `display_label="ATENÇÃO"` era exibido com a cor de `verdict="parcial"`.
- A cor agora segue prioritariamente o rótulo visível da análise.
- ATINGE/ATENDE = verde, PARCIAL = amarelo, ATENÇÃO = vermelho.
- Contadores e filtros usam a mesma classificação visual.
- Mantém as cores do histórico da v3.7.3.
- Não altera backend, API ou validador jurídico.


## v3.8.0 — correção estrutural da taxonomia

A v3.8 separa explicitamente:

- aplicabilidade;
- suficiência documental;
- resultado jurídico;
- status de exibição.

O quality gate passa a rejeitar contradições como `legal_result=nao_aplicavel` com `verdict=parcial`.
`evidence_status=dispensado` foi criado para pontos juridicamente não aplicáveis.
O `display_status` é derivado/validado pelo backend e `verdict` permanece somente para compatibilidade.

Após o deploy, atualize a GPT Action usando `openapi.yaml` desta versão e atualize as instruções com `GPT_INSTRUCTIONS.md`.

Regressão recomendada antes da bateria completa: TEST-004, TEST-005, TEST-006 e TEST-007.


## v3.8.1 — REGRESSION FIX TEST-004

- `verdict` passou a ser efetivamente legado: não reprova mais o quality gate por divergência com a taxonomia nova e é normalizado pelo backend.
- P5/P12/P15: evento/documento futuro ainda não exigível não deve ser convertido em deficiência documental atual.
- P15: a data da operação originária não pode substituir a data da futura contratação; a janela legal deve ser registrada sem criar `PARCIAL` apenas porque a contratação futura ainda não ocorreu.
- Regressão prioritária após deploy: repetir VEREDICTA-TEST-004 antes de avançar para TEST-005.
