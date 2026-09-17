---
name: analisar-credito-rural
description: Analisa no Veredicta contratos e dossiês de crédito rural relacionados à MP nº 1.376/2026, com 15 pontos, auditoria adversarial e revisão humana obrigatória. Use quando o usuário pedir para localizar, analisar, auditar ou consultar o histórico de um caso Veredicta.
---

# Analisar crédito rural no Veredicta

Use exclusivamente os casos recuperados pelas ferramentas do Veredicta. Um contrato fornecido apenas na conversa não é um caso oficial e deve ser cadastrado no aplicativo antes da análise.

## Fluxo

1. Na primeira análise da conversa, chame `consultar_status_veredicta` e confirme as versões retornadas.
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

Não crie, edite nem exclua casos. O plugin pode consultar dados e enviar uma nova análise auditada.
