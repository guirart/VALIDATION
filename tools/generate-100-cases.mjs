import fs from 'node:fs';

const base=`INSTRUMENTO PARTICULAR DE CRÉDITO RURAL E RENEGOCIAÇÃO DE OBRIGAÇÕES

Produtora: Mariana Alves Rodrigues. Propriedade: Fazenda Boa Esperança, Rio Verde/GO. Categoria: Pronamp. Credor: Banco Agrovale S.A.
Operação original de custeio de soja e milho, contratada em 20/03/2024, com recursos livres destinados ao crédito rural. Valor original: R$ 780.000,00. Saldo em 31/05/2026: R$ 695.000,00. Operação ativa, com parcelas vencidas desde 20/04/2025.

Safra 2022/2023: estiagem; renda esperada R$ 1.480.000,00; renda obtida R$ 814.000,00; redução de 45%.
Safra 2023/2024: seca e calor extremo; renda esperada R$ 1.560.000,00; renda obtida R$ 811.200,00; redução de 48%.
Safra 2024/2025: estiagem; renda esperada R$ 1.620.000,00; renda obtida R$ 923.400,00; redução de 43%.

Três laudos assinados por engenheiro agrônomo habilitado, com ART, metodologia, produtividade, preços, memória de cálculo e nexo expresso com as culturas financiadas. Instrumento original, aditivos, extrato da dívida, posição em 31/05/2026, comprovantes de aplicação dos recursos e documentos da propriedade disponíveis.

Seguro rural/Proagro: não contratado. Indenizações e amortizações relacionadas às perdas: nenhuma. Dívida Ativa da União: inexistente, conforme certidão negativa válida. Processo judicial sobre a operação: inexistente. Declaração interinstitucional completa comprova que o saldo consolidado permanece dentro do limite aplicável.

Garantias: hipoteca rural registrada e penhor da produção, com avaliação bancária atualizada e sem impedimentos registrais. Nova operação aprovada em 20/07/2026 e assinada em 25/07/2026, dentro dos 120 dias contados da publicação da MP em 15/07/2026.`;

const replace=(source,from,to)=>{
  if(!source.includes(from))throw new Error(`Trecho-base não encontrado: ${from}`);
  return source.replace(from,to);
};
const operation='Operação original de custeio de soja e milho, contratada em 20/03/2024, com recursos livres destinados ao crédito rural. Valor original: R$ 780.000,00. Saldo em 31/05/2026: R$ 695.000,00. Operação ativa, com parcelas vencidas desde 20/04/2025.';
const harvests=`Safra 2022/2023: estiagem; renda esperada R$ 1.480.000,00; renda obtida R$ 814.000,00; redução de 45%.
Safra 2023/2024: seca e calor extremo; renda esperada R$ 1.560.000,00; renda obtida R$ 811.200,00; redução de 48%.
Safra 2024/2025: estiagem; renda esperada R$ 1.620.000,00; renda obtida R$ 923.400,00; redução de 43%.`;
const reports='Três laudos assinados por engenheiro agrônomo habilitado, com ART, metodologia, produtividade, preços, memória de cálculo e nexo expresso com as culturas financiadas. Instrumento original, aditivos, extrato da dívida, posição em 31/05/2026, comprovantes de aplicação dos recursos e documentos da propriedade disponíveis.';
const safeguards='Seguro rural/Proagro: não contratado. Indenizações e amortizações relacionadas às perdas: nenhuma. Dívida Ativa da União: inexistente, conforme certidão negativa válida. Processo judicial sobre a operação: inexistente. Declaração interinstitucional completa comprova que o saldo consolidado permanece dentro do limite aplicável.';
const closing='Garantias: hipoteca rural registrada e penhor da produção, com avaliação bancária atualizada e sem impedimentos registrais. Nova operação aprovada em 20/07/2026 e assinada em 25/07/2026, dentro dos 120 dias contados da publicação da MP em 15/07/2026.';

const variants={
  partial:[
    [9,s=>replace(s,reports,'Dois laudos estão completos. O laudo da safra 2024/2025 não foi apresentado. Instrumento original, aditivos, extrato da dívida e documentos da propriedade estão disponíveis.')],
    [8,s=>replace(s,reports,'Três laudos assinados por profissional habilitado descrevem as perdas, mas não estabelecem nexo entre os eventos climáticos e as culturas financiadas. Os demais documentos estão disponíveis.')],
    [11,s=>replace(s,safeguards,'Seguro rural/Proagro: não contratado. Indenizações e amortizações: nenhuma. Dívida Ativa da União: inexistente. Processo judicial: inexistente. Não foi apresentada declaração sobre outras operações ou limite cumulativo.')],
    [14,s=>replace(s,closing,'Garantias indicadas no instrumento, mas ainda sem avaliação da instituição financeira. Nova operação aprovada em 20/07/2026 e assinada em 25/07/2026.')],
    [15,s=>replace(s,closing,'Garantias regulares e avaliadas. A proposta foi aprovada em 20/07/2026, mas a nova operação ainda não foi formalizada.')]
  ],
  non:[
    [2,s=>replace(s,operation,'Operação de cartão de crédito empresarial sem destinação rural, contratada em 20/03/2024. Saldo em 31/05/2026: R$ 695.000,00.')],
    [6,s=>replace(s,harvests,'Safra 2022/2023: redução de renda de 10%.\nSafra 2023/2024: redução de renda de 12%.\nSafra 2024/2025: redução de renda de 15%.')],
    [13,s=>replace(s,safeguards,'Seguro rural/Proagro: não contratado. Indenizações: nenhuma. A devedora está inscrita em Dívida Ativa da União, conforme certidão positiva. Processo judicial: inexistente. Limite cumulativo comprovado.')],
    [10,s=>replace(s,reports,'Os laudos demonstram perdas exclusivamente na atividade pecuária, sem vínculo com soja, milho ou com a atividade financiada. Os demais documentos estão disponíveis.')],
    [15,s=>replace(s,closing,'Garantias regulares e avaliadas. A nova operação foi aprovada e assinada em 05/07/2026, antes da publicação da MP em 15/07/2026.')]
  ],
  inconclusive:[
    [6,s=>replace(s,harvests,'Os documentos mencionam estiagem nas três safras, mas não informam renda esperada, renda obtida nem percentuais de redução.')],
    [9,s=>replace(s,reports,'Há referência a um laudo técnico, mas não constam assinatura, habilitação profissional, ART ou memória de cálculo. Os demais documentos estão disponíveis.')],
    [12,s=>replace(s,safeguards,'Não consta informação sobre seguro rural, Proagro, indenizações ou amortizações. Dívida Ativa da União: inexistente. Processo judicial: inexistente. Limite cumulativo comprovado.')],
    [4,s=>replace(s,operation,'Operação original de custeio de soja e milho, contratada em 20/03/2024, com recursos livres destinados ao crédito rural. O dossiê não informa saldo nem situação da operação em 31/05/2026.')],
    [3,s=>replace(s,operation,'Operação original de custeio de soja e milho, contratada em 20/03/2024. A fonte dos recursos não consta do instrumento. Saldo em 31/05/2026: R$ 695.000,00; parcelas vencidas desde 20/04/2025.')]
  ]
};

const cases=[]; const gold=[];
for(let i=1;i<=100;i++){
  const external_test_id=`VEREDICTA-REG-003-${String(i).padStart(4,'0')}`;
  const caseBase=base.replace('Credor: Banco Agrovale S.A.','Credor: Banco Agrovale S.A. Instrumento nº CR-2026-'+String(i).padStart(4,'0')+'.');
  let classification='enquadrável', contractText=caseBase, targetPoint=null;
  if(i>25){
    const group=i<=50?'partial':i<=75?'non':'inconclusive';
    const [point,mutate]=variants[group][(i-26)%5];
    contractText=mutate(caseBase); targetPoint=point;
    classification=group==='partial'?'parcialmente enquadrável':group==='non'?'não enquadrável':'inconclusivo';
  }
  cases.push({external_test_id,title:`Bateria de regressão 003 - Caso ${String(i).padStart(3,'0')}`,client_name:`Cliente cego ${String(i).padStart(3,'0')}`,contract_text:contractText});
  gold.push({external_test_id,expected_classification:classification,expected_points:targetPoint?{[String(targetPoint)]:{legal_result:classification==='inconclusivo'?'inconclusivo':'nao_atende'}}:{}});
}

fs.writeFileSync(new URL('../VEREDICTA_100_CASOS_REGRESSAO_V3.json',import.meta.url),JSON.stringify({environment:'test',batch_id:'VEREDICTA-REGRESSAO-100-V3',cases},null,2)+'\n');
fs.writeFileSync(new URL('../tests/fixtures/veredicta-regressao-100-v3-gold.json',import.meta.url),JSON.stringify({batch_id:'VEREDICTA-REGRESSAO-100-V3',gold},null,2)+'\n');
console.log('Gerados 100 casos cegos V3: 25 por classificação, sem contradições por anexação.');
