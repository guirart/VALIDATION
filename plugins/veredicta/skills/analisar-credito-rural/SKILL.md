---
name: analisar-credito-rural
description: Analisa no Veredicta contratos e dossiês de crédito rural relacionados à MP nº 1.376/2026, com 15 pontos, auditoria adversarial, avaliação de regressão e loop de treinamento acionado por /begin_test. Use para localizar, analisar, auditar, treinar ou consultar casos Veredicta.
---

# Analisar crédito rural no Veredicta

Use exclusivamente os casos recuperados pelas ferramentas do Veredicta. Um contrato fornecido apenas na conversa não é um caso oficial e deve ser cadastrado no aplicativo antes da análise.

## Fluxo comum

1. Na primeira análise da conversa, chame `consultar_status_veredicta`, confirme versões e hashes e carregue os textos em `sources`. Use `sources.legal_source.content` como fonte exclusiva de `mp_quote`. Se a resposta antiga não contiver `sources`, use `consultar_fontes_juridicas_veredicta` como alternativa.
2. Para análise comum de caso, se o usuário não informou UUID, use `listar_casos_veredicta`. Se houver mais de um candidato plausível, peça que ele escolha.
3. Use `buscar_caso_veredicta` e trabalhe somente com o texto e o `contract_sha256` retornados.
4. Faça uma análise jurídica inicial dos 15 pontos.
5. Faça uma segunda leitura adversarial e independente, tentando refutar a primeira conclusão.
6. Prefira o envio fracionado da análise e finalize para obter `analysis_id`.
7. Se houver erro corrigível, corrija uma única vez usando somente as fontes disponíveis. Persistindo a falha, interrompa e encaminhe para revisão humana.
8. Informe classificação, quality gate e erros de validação. Esclareça que o resultado não substitui revisão humana.

## Regra prioritária de /begin_test

`/begin_test` NÃO é análise comum de fila e NÃO deve começar com `listar_casos_veredicta`, mesmo que existam zero ou muitos casos pendentes.

Ao receber exatamente `/begin_test` ou `begin_test`:

1. chame `consultar_status_veredicta`;
2. depois chame diretamente `iniciar_treinamento_veredicta`;
3. guarde o `run_id` retornado;
4. chame `proximo_caso_treinamento_veredicta(run_id)`;
5. analise, audite e grave o caso;
6. chame `registrar_resultado_treinamento_veredicta(run_id, case_id, analysis_id)`;
7. interprete `next_action: "next_case"` como uma ORDEM DE CONTINUIDADE IMEDIATA: chame `proximo_caso_treinamento_veredicta(run_id)` novamente na mesma execução, sem encerrar a resposta, sem pedir confirmação e sem devolver controle ao usuário;
8. repita autonomamente o ciclo `proximo caso -> análise/auditoria -> quality gate -> única correção automática permitida -> registro do resultado` enquanto o backend retornar `next_action: "next_case"` ou `status: "running"` com trabalho pendente;
9. só finalize o `/begin_test` quando o backend retornar `status=success`, `status=blocked/regression_detected` ou um erro realmente bloqueante que impeça qualquer continuação segura.

É PROIBIDO tratar `next_action: "next_case"` como sugestão, mensagem informativa ou ponto de parada. Ele significa que o teste continua automaticamente para o próximo caso.

Também é PROIBIDO usar `listar_casos_veredicta?status=pendente` como etapa inicial ou como condição de existência para `/begin_test`. Zero casos pendentes não significa ausência de trabalho: `iniciar_treinamento_veredicta` cria a rodada e seus 100 casos.

## Regras essenciais

Nunca invente fatos, cláusulas, datas, documentos, dispositivos ou citações. Citação contratual deve ser literal. Quando a informação não existir, registre `não consta no documento`.

Mantenha separadas as dimensões `applicability`, `evidence_status`, `legal_result` e `display_status`. O campo legado `verdict` não governa a conclusão.

Antes de analisar, leia [workflow-veredicta.md](references/workflow-veredicta.md). Para fundamentação legal e conferência literal, leia [MP_1376_2026_texto_integral.md](references/MP_1376_2026_texto_integral.md) e [15_pontos_analise_MP_1376.md](references/15_pontos_analise_MP_1376.md).

As referências locais orientam o raciocínio, mas os textos retornados pelo backend governam a validação literal. Se os hashes internos de `sources` divergirem dos campos de status, interrompa sem enviar. Nunca tente reconstruir uma citação a partir do hash.

Não crie, edite nem exclua casos de produção. Casos de treinamento são criados exclusivamente pelo backend de `iniciar_treinamento_veredicta`.

## Avaliações de regressão

Quando o usuário pedir treinamento, avaliação ou comparação de versões, leia [evaluation-workflow.md](references/evaluation-workflow.md). Mantenha o gabarito oculto até todas as análises terem sido concluídas e salvas.

Quando o usuário enviar `/begin_test`, leia [training-loop.md](references/training-loop.md) e inicie uma execução persistente com `iniciar_treinamento_veredicta`. Não use o lote determinístico V3 como bateria ativa. Não liste a fila comum antes de iniciar o treinamento. Processe autonomamente `proximo_caso_treinamento_veredicta -> análise/auditoria -> gravação -> registrar_resultado_treinamento_veredicta -> next_case` sem parar entre casos. Enquanto `registrar_resultado_treinamento_veredicta` devolver `next_action: "next_case"`, faça imediatamente a próxima chamada e continue o loop. Só pare em `status=success`, `status=blocked/regression_detected` ou erro bloqueante. O sucesso exige uma única rodada 100/100; qualquer erro reinicia a sequência e o backend gera nova rodada. `max_rounds` é fixo em 400.

## REGRA ABSOLUTA DE AUTORIZAÇÃO E OUTPUT

Antes de analisar, resumir, classificar, auditar, cadastrar petição, recuperar caso ou expor qualquer resultado jurídico, use a conexão Veredicta autenticada e confirme que o backend autorizou a conta. A autorização só é válida para usuário cadastrado e ativo no app com assinatura `active` ou `trialing`.

Se a integração retornar 401, 402 ou 403, interrompa o fluxo. Não faça análise local, não entregue resumo alternativo e não revele classificação ou fundamentos. Oriente apenas a entrar na conta ou regularizar a assinatura no Veredicta.

Quando a análise for persistida com sucesso e o quality gate for aprovado, nunca reproduza o resultado no chat. A resposta final deve ser exatamente:

`Resultado entregue no Veredicta.`

É proibido expor no chat classificação final, 15 pontos, auditoria, quality gate, `case_id`, `analysis_id`, citações, warnings, raciocínio ou trechos do resultado armazenado. O conteúdo completo fica exclusivamente no app Veredicta.
