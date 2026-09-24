# Registro de fontes jurídicas do Veredicta

Este registro define a arquitetura normativa obrigatória do pipeline. Fontes normativas só podem ser tratadas como vigentes após conferência em fonte oficial.

## Núcleo obrigatório

1. Medida Provisória nº 1.376/2026
   Fonte de vigência e tramitação: Congresso Nacional.
   URL: https://www.congressonacional.leg.br/materias/medidas-provisorias/-/mpv/175190
   Papel: norma principal. O texto integral local é usado para validação literal de `mp_quote`.

2. Resolução CMN nº 5.330/2026
   Fonte: Banco Central do Brasil / Conselho Monetário Nacional.
   URL: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=5330&tipo=RESOLU%C3%87%C3%83O+CMN
   Papel: regulamentação operacional da MP 1.376/2026. Deve ser considerada em toda conclusão sobre contratação, condições operacionais, recursos, limites ou execução da linha.

3. Resolução CMN nº 5.334/2026
   Fonte: Banco Central do Brasil / Conselho Monetário Nacional.
   URL: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=5334&tipo=RESOLU%C3%87%C3%83O+CMN
   Papel: norma modificadora/complementar da Resolução CMN 5.330/2026. Deve ser lida em conjunto com a redação vigente da 5.330.

## Fontes condicionais

4. Resolução CMN nº 5.340/2026
   Fonte: Banco Central do Brasil / Conselho Monetário Nacional.
   Papel: norma vinculada. Aplicar somente quando o dispositivo e o caso concreto demonstrarem pertinência.

5. Manual de Crédito Rural (MCR)
   Fonte: Banco Central do Brasil.
   Papel: aplicar os capítulos vigentes pertinentes à modalidade, fonte de recursos, Pronaf, Pronamp, Fundos Constitucionais ou operação analisada.

6. Lei nº 8.929/1994
   Fonte oficial: legislação federal.
   Papel: obrigatória quando o caso envolver Cédula de Produto Rural (CPR).

7. Lei nº 4.595/1964
   Fonte oficial: legislação federal.
   Papel: aplicar quando necessária à competência/regulação do CMN e do sistema financeiro.

8. Lei nº 12.351/2010
   Fonte oficial: legislação federal.
   Papel: aplicar quando houver questão pertinente ao Fundo Social.

9. Medida Provisória nº 1.314/2025
   Fonte oficial: Congresso Nacional/legislação federal.
   Papel: verificar quando a hipótese de exclusão ou interação prevista pela MP 1.376/2026 for relevante.

## Regra do pipeline

Antes de analisar:
- confirmar a vigência da MP 1.376/2026 no Congresso Nacional;
- confirmar que a regulamentação CMN obrigatória não foi revogada/substituída;
- identificar as fontes condicionais aplicáveis aos fatos;
- registrar as fontes efetivamente utilizadas e suas versões;
- bloquear a análise quando uma fonte obrigatória não puder ser confirmada;
- nunca usar notícia, blog, Jusbrasil ou fonte secundária para determinar vigência ou redação normativa.
