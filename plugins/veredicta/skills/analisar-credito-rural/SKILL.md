---
name: analisar-credito-rural
description: Analisa no Veredicta contratos e dossiês de crédito rural relacionados à MP nº 1.376/2026, com 15 pontos, auditoria adversarial, avaliação de regressão e loop de treinamento acionado por /begin_test. Use para localizar, analisar, auditar, treinar ou consultar casos Veredicta.
---

# Analisar crédito rural no Veredicta

Use exclusivamente os casos recuperados pelas ferramentas do Veredicta. Um contrato fornecido apenas na conversa não é um caso oficial e deve ser cadastrado no aplicativo antes da análise.

## Fluxo

1. Na primeira análise da conversa, chame `consultar_status_veredicta`, confirme versões e hashes e carregue os textos em `sources`. Use `sources.legal_source.content` como fonte exclusiva de `mp_quote`. Se a resposta antiga não contiver `sources`, use `consultar_fontes_juridicas_veredicta` como alternativa.
2. Se o usuário não informou UUID, use `listar_casos_veredicta`. Se houver mais de um candidato plausível, peça que ele escolha.
3. Use `buscar_caso_veredicta` e trabalhe somente com o texto e o `contract_sha256` retornados.
4. Faça uma análise jurídica inicial dos 15 pontos.
5. Faça uma segunda leitura adversarial e independente, tentando refutar a primeira conclusão.
6. Chame `enviar_analise_veredicta` com exatamente 15 pontos e 15 findings.
7. Se houver erro corrigível, corrija uma única vez usando somente as fontes disponíveis. Persistindo a falha, interrompa e encaminhe para revisão humana.
8. Informe classificação, quality gate e erros de validação. Esclareça que o resultado não substitui revisão humana.

## Regras essenciais

Nunca invente fatos, cláusulas, datas, documentos, dispositivos ou citações. Citação contratual deve ser literal. Quando a informação não existir, registre `não consta no documento`.

Mantenha separadas as dimensões `applicability`, `evidence_status`, `legal_result` e `display_status`. O campo legado `verdict` não governa a conclusão.

Antes de analisar, leia [workflow-veredicta.md](references/workflow-veredicta.md). Para fundamentação legal e conferência literal, leia [MP_1376_2026_texto_integral.md](references/MP_1376_2026_texto_integral.md) e [15_pontos_analise_MP_1376.md](references/15_pontos_analise_MP_1376.md).

As referências locais orientam o raciocínio, mas os textos retornados pelo backend governam a validação literal. Se os hashes internos de `sources` divergirem dos campos de status, interrompa sem enviar. Nunca tente reconstruir uma citação a partir do hash.

Não crie, edite nem exclua casos. O plugin pode consultar dados e enviar uma nova análise auditada.

## Avaliações de regressão

Quando o usuário pedir treinamento, avaliação ou comparação de versões, leia [evaluation-workflow.md](references/evaluation-workflow.md). Mantenha o gabarito oculto até todas as análises terem sido concluídas e salvas.

Quando o usuário enviar `/begin_test`, leia [training-loop.md](references/training-loop.md) e inicie uma execução persistente com `iniciar_treinamento_veredicta`. Não use o lote determinístico V3 como bateria ativa. Processe autonomamente `proximo_caso_treinamento_veredicta -> análise/auditoria -> gravação -> registrar_resultado_treinamento_veredicta` até `status=success` ou `status=blocked/regression_detected`. O sucesso exige uma única rodada 100/100; qualquer erro reinicia a sequência e o backend gera nova rodada. `max_rounds` é fixo em 400.
