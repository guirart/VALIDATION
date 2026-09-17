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

const mutations={
  partial:[[9,'Laudo técnico: ausente para a safra 2024/2025.'],[8,'Os laudos não estabelecem nexo entre os eventos e a atividade financiada.'],[11,'Não foi apresentada declaração sobre outras operações ou limite cumulativo.'],[14,'As garantias ainda não foram avaliadas pela instituição financeira.'],[15,'A nova operação ainda não foi formalizada.']],
  non:[[2,'Natureza da operação: cartão de crédito empresarial sem destinação rural.'],[6,'As três safras apresentaram redução de renda de 10%, 12% e 15%.'],[13,'A devedora está inscrita em Dívida Ativa da União, conforme certidão positiva.'],[10,'As perdas ocorreram em atividade pecuária sem vínculo com as culturas financiadas.'],[15,'A nova operação foi aprovada e assinada em 05/07/2026, antes da publicação da MP.']],
  inconclusive:[[6,'Os percentuais de redução da renda não constam dos documentos apresentados.'],[9,'Há referência a laudo, mas não consta assinatura, habilitação profissional ou ART.'],[12,'Não consta informação sobre seguro, Proagro, indenizações ou amortizações.'],[4,'A situação da operação em 31/05/2026 não consta do dossiê.'],[3,'A fonte dos recursos da operação não consta do instrumento.']]
};

const cases=[]; const gold=[];
for(let i=1;i<=100;i++){
  const external_test_id=`VEREDICTA-REG-002-${String(i).padStart(3,'0')}`;
  let classification='enquadrável', defect=null, expected_points={};
  if(i>25){
    const group=i<=50?'partial':i<=75?'non':'inconclusive';
    const [point,text]=mutations[group][(i-26)%5];
    classification=group==='partial'?'parcialmente enquadrável':group==='non'?'não enquadrável':'inconclusivo';
    defect=text; expected_points[String(point)]={legal_result:group==='inconclusive'?'inconclusivo':'nao_atende'};
  }
  cases.push({external_test_id,title:`Bateria de regressão 002 - Caso ${String(i).padStart(3,'0')}`,client_name:`Cliente de teste ${String(i).padStart(3,'0')}`,contract_text:defect?`${base}\n\nINFORMAÇÃO ESPECÍFICA DO DOSSIÊ\n${defect}`:base});
  gold.push({external_test_id,expected_classification:classification,expected_points,expected_defects:defect?[defect]:[]});
}

fs.mkdirSync(new URL('../tests/fixtures/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../VEREDICTA_100_CASOS_REGRESSAO_V2.json',import.meta.url),JSON.stringify({environment:'test',batch_id:'VEREDICTA-REGRESSAO-100-V2',cases},null,2)+'\n');
fs.writeFileSync(new URL('../tests/fixtures/veredicta-regressao-100-v2-gold.json',import.meta.url),JSON.stringify({batch_id:'VEREDICTA-REGRESSAO-100-V2',gold},null,2)+'\n');
console.log('Gerados 100 casos e gabarito oculto para VEREDICTA-REGRESSAO-100-V2');
