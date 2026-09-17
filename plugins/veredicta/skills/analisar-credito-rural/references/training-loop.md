# Loop autônomo `/begin_test` — Veredicta 3.15.2

Use este modo somente em ambiente de teste. O objetivo é obter **100 acertos consecutivos em uma única rodada vencedora**, e não 100 tentativas acumuladas.

## Regra de despacho obrigatória

`/begin_test` possui prioridade sobre o fluxo normal de análise de casos. Depois de validar as fontes, o próximo tool call DEVE ser `iniciar_treinamento_veredicta`.

Não chame `listar_casos_veredicta` antes de iniciar a execução. Não consulte `status=pendente` para decidir se existe trabalho. A fila comum pertence ao fluxo de produção; a fila de treinamento nasce do `run_id`.

Se `listar_casos_veredicta` retornar zero casos por engano durante um `/begin_test`, isso NÃO encerra o teste: volte imediatamente ao fluxo correto chamando `iniciar_treinamento_veredicta`.

## Identidade e isolamento

- Cada `/begin_test` cria um `run_id` UUID persistente.
- Cada caso é identificado exclusivamente por `case.id` UUID e `run_id`.
- `title`, `client_name`, produtor, nomes das partes, texto e posição não identificam nem deduplicam casos.
- O gabarito fica exclusivamente no servidor. Nunca peça nem exponha `expected_classification`, `expected_points`, `generation_facts` ou `generation_seed` ao analista.
- A comparação ocorre somente depois de a análise ter sido gravada.

## Geração

Cada rodada criada pelo backend contém exatamente 100 casos inéditos: 25 enquadráveis, 25 parcialmente enquadráveis, 25 não enquadráveis e 25 inconclusivos. A ordem é embaralhada por seed reproduzível. A seed do run pode constar do relatório técnico; sementes internas de caso e o gabarito não são fornecidos ao analisador.

## Execução obrigatória

1. Consulte `consultar_status_veredicta` e valide app, validator, hashes e conteúdo das fontes.
2. Sem listar casos pendentes, chame `iniciar_treinamento_veredicta` uma única vez e guarde o `run_id`.
3. Chame `proximo_caso_treinamento_veredicta(run_id)`.
4. Analise o dossiê cegamente e faça auditoria adversarial dos 15 pontos.
5. Grave a análise. Prefira o fluxo fracionado: iniciar envio, enviar 15 pontos e finalizar.
6. Somente depois de obter `analysis_id`, chame `registrar_resultado_treinamento_veredicta(run_id, case_id, analysis_id)`.
7. Se `correct=true`, prossiga imediatamente para o próximo caso.
8. Se `correct=false`, não tente corrigir o mesmo caso para preservar a avaliação cega. O backend encerra a rodada, zera `streak` e gera automaticamente uma nova rodada balanceada.
9. Continue sem solicitar novo comando ao usuário até `status=success` ou `status=blocked/regression_detected`.
10. `success` só é válido com `final_streak=100` e confirmação `success_100_100_confirmed=true`.

## Limite operacional

`max_rounds = 400` é fixo. O limite não reduz o critério de aprovação. Se a rodada 400 falhar, o backend retorna `blocked/regression_detected`, `completed=false`.

## Relatório final

Informe no mínimo: `run_id`, seed, attempts, rounds, correct, errors, final_streak, status, distribuição, app_version, validator_version, versões das fontes e confirmação 100/100. Não misture casos históricos com o `run_id` corrente.
