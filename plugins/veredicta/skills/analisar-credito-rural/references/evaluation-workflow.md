# Avaliação de regressão

O gabarito fica fora dos contratos. Durante a análise, nunca leia nem use arquivos com `gold` no nome. Primeiro conclua e salve todas as análises; somente depois execute a comparação.

1. Importe `VEREDICTA_100_CASOS_REGRESSAO_V2.json` no ambiente de teste.
2. Analise os casos usando somente os dossiês e fontes jurídicas.
3. Exporte resultados em JSON com `external_test_id`, `final_classification` e `points`.
4. Execute `node tools/evaluate-battery.mjs resultados.json`.
5. Revise falsos positivos, falsos negativos e divergências por ponto antes de alterar a skill ou o validador.

`quality_gate` mede validade estrutural; não deve ser tratado como acerto jurídico.
