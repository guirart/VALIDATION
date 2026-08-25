const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let cases = [];
let selectedId = null;
let selectedCase = null;
let customGptUrl = '';
let currentFilter = 'all';

const CHECKLIST_15 = [
  {point:1,title:'Natureza do instrumento',legal_reference:'art. 1º, caput / art. 7º',description:'A MP cria uma via administrativa e depende de regulamentação; não substitui a análise jurídica nem promete automatismos.',resolve:'Confirmar a natureza do instrumento e registrar que a MP autoriza linhas de composição, sem transformar o enquadramento técnico em aprovação automática. Conferir a regulamentação do CMN vigente.'},
  {point:2,title:'Filtro geral cumulativo',legal_reference:'art. 1º, § 1º',description:'Beneficiário, janela 2019–2025, 2+ safras, redução mínima de 30%, nexo com a atividade financiada e laudo.',resolve:'Completar a prova do filtro geral: identificação do beneficiário, duas ou mais safras no período, percentuais de perda, renda esperada x obtida, nexo e laudo habilitado.'},
  {point:3,title:'Modalidade excepcional',legal_reference:'art. 1º, § 7º',description:'Exige 3+ safras, evento climático extremo e redução mínima de 40%.',resolve:'Se a excepcional não fechar, testar expressamente a modalidade geral do ponto 2. Para a excepcional, obter prova de três ou mais safras, causa climática elegível e queda de pelo menos 40%.'},
  {point:4,title:'Escopo da dívida abrangida',legal_reference:'art. 1º, I/II/III; art. 6º',description:'Classificar corretamente custeio/comercialização/industrialização, investimento ou CPR e conferir datas.',resolve:'Identificar a modalidade exata da dívida, datas de contratação/renegociação/inadimplência, fonte de recursos e, se CPR, quem é o credor e como o título foi registrado.'},
  {point:5,title:'Ausência de obrigação bancária',legal_reference:'art. 1º, § 4º, V',description:'A instituição mantém o risco da nova operação; enquadramento não equivale a crédito obrigatório.',resolve:'Protocolar pedido completo e exigir análise motivada. Documentar recusa genérica, tratamento desigual ou exigência não prevista, sem formular a tese simplista de aprovação automática.'},
  {point:6,title:'Processos judiciais ativos',legal_reference:'silêncio da MP',description:'Não existe suspensão automática de execução, penhora, leilão ou negativação.',resolve:'Mapear execuções e medidas em curso. Avaliar comunicação do fato superveniente, pedido consensual de suspensão, audiência de conciliação e preservação da atividade produtiva.'},
  {point:7,title:'Prorrogação de 30 dias',legal_reference:'art. 4º',description:'Verificar literalmente os requisitos do art. 4º, inclusive a situação de ADIMPLÊNCIA na data prevista pela norma, o vencimento da operação e o pedido da nova linha.',resolve:'Conferir documentalmente a situação de ADIMPLÊNCIA na data exigida pelo art. 4º, bem como o vencimento e os demais requisitos legais. Não presumir adimplência ou inadimplência; se faltar prova, registrar como não comprovado e solicitar extrato ou declaração da instituição financeira.'},
  {point:8,title:'Suficiência do laudo técnico',legal_reference:'art. 1º, § 1º / § 7º',description:'O laudo deve demonstrar evento, safras, atividade, renda, percentuais e nexo causal.',resolve:'Solicitar laudo técnico específico contendo produtividade esperada e obtida, área, preço, renda bruta esperada e efetiva, metodologia, safras afetadas e nexo com a operação.'},
  {point:9,title:'Independência técnica / risco de fraude',legal_reference:'art. 9º',description:'O laudo não pode ser produzido para “encaixar” o produtor.',resolve:'Corrigir inconsistências documentais com autonomia do profissional habilitado. Não orientar alteração artificial de percentuais ou fatos; documentar divergências e sua explicação técnica.'},
  {point:10,title:'Limites cumulativos',legal_reference:'art. 1º, § 4º, I, d / § 7º, VI',description:'O teto é cumulativo por mutuário, inclusive entre instituições.',resolve:'Levantar todas as operações do produtor em todas as instituições, respectivos saldos, programas, garantias e situação. Somar contra o teto global aplicável.'},
  {point:11,title:'Linha do art. 2º sem juros protegidos',legal_reference:'art. 2º, § 2º, I',description:'Pode cobrir excedentes, mas a taxa é negociada.',resolve:'Se houver valor excedente, testar a linha do art. 2º e comparar taxa atual, encargos, nova taxa, prazo, carência, garantias e custo total antes de recomendar contratação.'},
  {point:12,title:'Garantias e novação',legal_reference:'art. 5º, parágrafo único',description:'A nova operação pode reduzir ou ampliar garantias e alterar relações jurídicas.',resolve:'Obter matrícula e avaliação atualizadas das garantias. Revisar minuta da nova operação para novação, confissão, renúncias, vencimento antecipado e reforço ou liberação de garantias.'},
  {point:13,title:'Valores já pagos/indenizados',legal_reference:'art. 3º, II',description:'Valores já liquidados ou cobertos não podem ser contados novamente.',resolve:'Reunir apólices, Proagro e comprovantes. Separar a parcela efetivamente indenizada da parcela não coberta, franquias e prejuízo excedente, evitando dupla contagem.'},
  {point:14,title:'Dívida Ativa da União',legal_reference:'art. 1º, § 9º',description:'Operação encaminhada à DAU fica fora do mecanismo do art. 1º.',resolve:'Obter certidão e documentação da situação da dívida. Se encaminhada à DAU, registrar a exclusão e avaliar a estratégia jurídica adequada fora desta via.'},
  {point:15,title:'Janela real de 120 dias',legal_reference:'art. 1º, § 4º, IV / art. 62 CF',description:'O prazo do beneficiário não se confunde com a vigência constitucional da MP.',resolve:'Registrar a data de publicação, calcular o prazo de contratação, documentar a data do protocolo e acompanhar separadamente eventual conversão, alteração ou perda de eficácia da MP.'}
];

const GENERIC_DOCS = [
  ['identificacao','Obter identificação individual completa do produtor/cooperativa — nome, CPF/CNPJ, propriedade rural (matrícula/CCIR) e categoria declarada (Pronaf, Pronamp ou demais produtores).'],
  ['instrumento','Reunir a cópia integral do instrumento de crédito (CCR, CPR, contrato de mútuo etc.), incluindo aditivos, renegociações e prorrogações anteriores — não apenas o resumo ou a última via.'],
  ['credor','Obter extrato ou declaração da instituição credora confirmando datas de contratação, renegociação e a situação de adimplência/inadimplência nas datas relevantes da MP.'],
  ['laudo','Exigir laudo técnico específico de perda de safra/renda — produtividade esperada e obtida, área, preço, metodologia e nexo causal explícito com a operação financiada.'],
  ['seguro','Reunir apólices de seguro rural/Proagro e comprovantes de indenização eventualmente já recebida sobre as mesmas safras alegadas no laudo.'],
  ['dau','Obter certidão de situação na Dívida Ativa da União (PGFN), emitida o mais próximo possível da data do pedido.'],
  ['judicial','Obter certidões de distribuição cível e documentos de execuções, protestos e ações em curso relacionadas ao produtor e à dívida.'],
  ['garantias','Reunir matrícula atualizada e avaliação dos bens oferecidos em garantia (hipoteca, alienação fiduciária etc.).']
];

function esc(s=''){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function fmtDate(s){if(!s)return '—';try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(s));}catch{return s}}
function norm(v=''){return String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function verdictClass(v){const n=norm(v);return ['atinge','parcial','atencao','ausente'].includes(n)?n:'ausente'}
function verdictLabel(v,display=''){const n=verdictClass(v); if(display)return display; return ({atinge:'atinge',parcial:'parcial',atencao:'atenção',ausente:'não consta'})[n]}
function latest(arr=[]){return [...arr].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]}

async function api(url, options={}){
  const res=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  let body={};try{body=await res.json()}catch{}
  if(res.status===401){showLogin();throw new Error('Sessão encerrada')}
  if(!res.ok)throw new Error(body.error||`Erro ${res.status}`);
  return body;
}
function showLogin(){$('#app').classList.add('hidden');$('#login').classList.remove('hidden')}
function showApp(){$('#login').classList.add('hidden');$('#app').classList.remove('hidden')}

async function boot(){
  const s=await fetch('/api/auth',{credentials:'same-origin'}).then(r=>r.json());
  if(s.passwordRequired&&!s.authenticated)return showLogin();
  showApp();await loadConfig();await loadCases();
}
$('#login-form').addEventListener('submit',async e=>{
  e.preventDefault();$('#login-error').textContent='';
  try{await api('/api/auth',{method:'POST',body:JSON.stringify({password:$('#password').value})});showApp();await loadConfig();await loadCases()}
  catch(err){$('#login-error').textContent=err.message}
});
$('#logout').addEventListener('click',async()=>{await fetch('/api/auth',{method:'DELETE'});showLogin()});
$('#refresh').addEventListener('click',async()=>{await loadCases(true)});
$('#sidebar-refresh')?.addEventListener('click',async()=>{await loadCases(true)});
$('#case-search')?.addEventListener('input',()=>renderHistory());

async function loadConfig(){try{const out=await api('/api/config');customGptUrl=out.custom_gpt_url||''}catch{customGptUrl=''}}
async function loadCases(keep=false){
  const out=await api('/api/cases');cases=out.cases||[];
  renderStats();renderTabs();

  const requestedCase = new URLSearchParams(window.location.search).get('case');
  if(requestedCase && cases.some(c=>c.id===requestedCase)){
    selectedId=requestedCase;
    await openCase(requestedCase,false);
    if(!keep){
      const clean = new URL(window.location.href);
      clean.searchParams.delete('case');
      history.replaceState({},'',clean.pathname + clean.search + clean.hash);
    }
  }
  else if(selectedId && cases.some(c=>c.id===selectedId)){await openCase(selectedId,false)}
  else if(cases.length){await openCase(cases[0].id,false)}
  else{selectedId=null;selectedCase=null;renderEmptyCase();renderResolution()}
}
function renderStats(){
  const analyzed=cases.filter(c=>(c.analyses||[]).length).length;
  const reviewed=cases.filter(c=>(c.reviews||[]).length).length;
  const pending=cases.filter(c=>c.status==='pendente'||c.status==='em-analise').length;
  $('#stats').innerHTML=[
    ['AGENTES CONFIGURADOS','2','analista + auditor'],
    ['FONTES DE REFERÊNCIA','2','MP integral + memorando'],
    ['CASOS CADASTRADOS',String(cases.length),`${analyzed} com análise gravada`],
    ['REVISÕES HUMANAS',String(reviewed),`${pending} casos pendentes/em análise`]
  ].map(x=>`<div class="stat-card"><span>${x[0]}</span><b>${x[1]}</b><small>${x[2]}</small></div>`).join('');
  $('#tests-note').textContent=`${cases.length} caso${cases.length===1?'':'s'} nesta instância — navegue pelo histórico lateral`;
}
function renderHistory(){
  const q=norm($('#case-search')?.value||'');
  const filtered=cases.filter(c=>{
    if(!q)return true;
    const a=latest(c.analyses);
    return norm([c.title,c.client_name,c.status,a?.final_classification].join(' ')).includes(q);
  });
  $('#case-history').innerHTML=filtered.length?filtered.map(c=>{
    const a=latest(c.analyses);
    const selected=c.id===selectedId;
    const classification=a?.final_classification||'ainda não analisado';
    return `<button class="history-item ${selected?'active':''}" data-id="${esc(c.id)}">
      <span class="history-dot ${a?'done':'pending'}"></span>
      <span class="history-content">
        <b>${esc(c.title)}</b>
        <small>${esc(c.client_name||'cliente não informado')}</small>
        <span class="history-meta"><em>${esc(shortClass(classification))}</em><time>${fmtDate(c.updated_at||c.created_at)}</time></span>
      </span>
    </button>`;
  }).join(''):`<div class="history-empty">Nenhum caso encontrado.</div>`;
  $$('.history-item').forEach(b=>b.addEventListener('click',()=>openCase(b.dataset.id)));
}
function renderTabs(){ renderHistory(); }
async function openCase(id,rerenderTabs=true){
  selectedId=id;if(rerenderTabs)renderTabs();
  $('#case-view').innerHTML='<div class="loading-card">Carregando caso…</div>';
  try{const out=await api('/api/cases?id='+encodeURIComponent(id));selectedCase=out.case;if($('#analysis-section-title'))$('#analysis-section-title').textContent=selectedCase.title||'Análise selecionada';renderCase();renderResolution();renderTabs()}
  catch(err){$('#case-view').innerHTML=`<div class="error-card">${esc(err.message)}</div>`}
}
function shortClass(v=''){return v.replace('parcialmente enquadrável','parcial').replace('não enquadrável','não enquadrável')}

function identityWarning(c){
  const text = norm(c?.contract_text || '');
  const client = norm(c?.client_name || '');
  if(!client || client.length < 4 || !text) return '';
  if(text.includes(client)) return '';
  return `<div class="identity-warning"><b>⚠ Verificação de identidade:</b> o nome do cliente cadastrado não foi localizado literalmente no texto do dossiê. Confira se o contrato pertence ao caso correto antes da revisão jurídica.</div>`;
}


function pointsMap(a){return new Map(((a?.analyst_json?.points)||[]).map(p=>[Number(p.point??p.number),p]))}
function findingsMap(a){return new Map(((a?.audit_json?.findings)||[]).map(f=>[Number(f.point),f]))}
function countVerdicts(a){
  const pm=pointsMap(a);const c={atinge:0,parcial:0,atencao:0,ausente:0};
  CHECKLIST_15.forEach(i=>{const p=pm.get(i.point);if(p)c[verdictClass(p.verdict)]++});
  return c;
}
function gridHtml(a){
  const pm=pointsMap(a);const counts=countVerdicts(a);
  return `<div class="memo15">
    <div class="memo15-head"><b>Checklist dos 15 pontos do memorando — status neste contrato</b><span>${counts.atinge} atingidos · ${counts.parcial} parcial · ${counts.atencao} atenção · ${counts.ausente} não consta/não se aplica</span></div>
    <div class="memo-grid">
      ${CHECKLIST_15.map(item=>{
        const p=pm.get(item.point);const v=p?verdictClass(p.verdict):'ausente';const label=p?verdictLabel(p.verdict,p.display_label):'pendente';
        return `<div class="memo-cell"><span class="memo-num">${String(item.point).padStart(2,'0')}</span><span class="memo-title">${esc(item.title)} <i>(${esc(p?.legal_reference||item.legal_reference)})</i></span><span class="pill v-${v}">${esc(label)}</span></div>`
      }).join('')}
      <div class="memo-cell memo-blank"></div>
    </div>
    <div class="memo-note">A grade resume o resultado; o quadro comparativo abaixo mantém os 15 pontos completos com as evidências usadas na análise.</div>
  </div>`;
}
function filterBarHtml(a){
  const c=countVerdicts(a);
  return `<div class="filterbar">
    <div class="filters">
      <button class="filter-chip ${currentFilter==='all'?'active':''}" data-filter="all">Todos <b>(15)</b></button>
      <button class="filter-chip ${currentFilter==='atinge'?'active':''}" data-filter="atinge">Atinge <b>(${c.atinge})</b></button>
      <button class="filter-chip ${currentFilter==='ausente'?'active':''}" data-filter="ausente">Não consta <b>(${c.ausente})</b></button>
      <button class="filter-chip ${currentFilter==='parcial'?'active':''}" data-filter="parcial">Parcial <b>(${c.parcial})</b></button>
      <button class="filter-chip ${currentFilter==='atencao'?'active':''}" data-filter="atencao">Atenção <b>(${c.atencao})</b></button>
    </div>
    <div class="expand-actions"><button data-expand="1">expandir todos</button><button data-expand="0">recolher todos</button></div>
  </div>`;
}
function pointCardsHtml(a){
  const pm=pointsMap(a), fm=findingsMap(a);
  return `<div class="checkpoint-list">${CHECKLIST_15.map(item=>{
    const p=pm.get(item.point);const f=fm.get(item.point);const v=p?verdictClass(p.verdict):'ausente';
    const label=p?verdictLabel(p.verdict,p.display_label):'pendente';
    const hidden=currentFilter!=='all'&&currentFilter!==v?' checkpoint-hidden':'';
    return `<details class="checkpoint${hidden}" data-verdict="${v}">
      <summary><span class="cp-num">${String(item.point).padStart(2,'0')}</span><span class="cp-title">${esc(p?.title||item.title)}${p?.display_label?` — ${esc(p.display_label)}`:''}</span><span class="pill v-${v}">${esc(label)}</span><span class="chev">›</span></summary>
      <div class="cp-body">
        <div class="evidence-grid">
          <div class="evidence-box"><div class="evidence-label">NA MP — ${esc(p?.legal_reference||item.legal_reference)}</div><blockquote>${p?.mp_quote?`“${esc(p.mp_quote)}”`:'Nenhuma citação gravada.'}</blockquote>${p?.mp_quote_verified===true?'<small class="verified">✓ verificada pelo backend</small>':p?.mp_quote_verified===false?'<small class="not-verified">✕ não verificada</small>':''}</div>
          <div class="evidence-box"><div class="evidence-label">NO CONTRATO / LAUDO</div><blockquote>${p?.contract_quote?`“${esc(p.contract_quote)}”`:'Não consta no documento analisado.'}</blockquote>${p?.contract_quote_verified===true?'<small class="verified">✓ verificada pelo backend</small>':p?.contract_quote_verified===false?'<small class="not-verified">✕ não verificada</small>':''}</div>
        </div>
        ${p?.evidence_status||p?.legal_result?`<div class="evidence-result-row"><span><b>Prova:</b> ${esc(p?.evidence_status||'—')}</span><span><b>Resultado jurídico:</b> ${esc(p?.legal_result||'—')}</span></div>`:''}<p class="reasoning"><b>Por quê ${esc(label)}:</b> ${esc(p?.reasoning||item.description)}</p>
        ${f?`<div class="audit-line"><b>Auditoria:</b> ${esc(f.status)}${f.reason?` — ${esc(f.reason)}`:''}</div>`:''}
      </div>
    </details>`
  }).join('')}</div>`;
}
function renderCase(){
  const c=selectedCase;if(!c)return renderEmptyCase();
  const a=latest(c.analyses||[]);const aj=a?.analyst_json||{};const au=a?.audit_json||{};
  let html=`<article class="analysis-sheet">
    <div class="case-head">
      <div><h3>${esc(c.title)}</h3><div class="source-line">caso ${esc(c.id)} · ${esc(c.client_name||'cliente não informado')} · ${esc(c.status)}</div></div>
      <button id="analyze-btn" class="btn btn-outline">${a?'reanalisar no GPT':'analisar no GPT'}</button>
    </div>${identityWarning(c)}`;
  if(a){
    html+=`<div class="final-class"><span>CLASSIFICAÇÃO FINAL</span><strong>${esc(a.final_classification)}</strong></div>
    <div class="summary-box"><p><b>Resumo:</b> ${esc(aj.summary||au.summary||'')}</p><p><b>Auditoria:</b> ${esc(a.auditor_recommendation||'—')} · quality gate ${a.quality_gate?'liberado':'bloqueado'}</p></div>
    ${gridHtml(a)}${filterBarHtml(a)}${pointCardsHtml(a)}
    <div class="report-foot">análise ${esc(a.id)} · fonte ${esc(a.legal_source_version||'não informada')} · memorando ${esc(a.memorandum_version||'não informado')} · criada em ${fmtDate(a.created_at)}</div>`;
  }else{
    html+=`<div class="no-analysis"><h4>Ainda não analisado</h4><p>O caso está salvo. Clique em <b>analisar no GPT</b>; o GPT buscará o contrato pela Action, fará os 15 pontos + auditoria e gravará o resultado aqui.</p><code>Analise o caso ${esc(c.id)}.</code></div>`;
  }
  html+='</article>';
  $('#case-view').innerHTML=html;
  $('#analyze-btn')?.addEventListener('click',()=>openInGpt(c));
  $$('.filter-chip').forEach(b=>b.addEventListener('click',()=>{currentFilter=b.dataset.filter;renderCase()}));
  $$('[data-expand]').forEach(b=>b.addEventListener('click',()=>{$$('.checkpoint:not(.checkpoint-hidden)').forEach(d=>d.open=b.dataset.expand==='1')}));
}
function renderEmptyCase(){
  $('#case-view').innerHTML='<div class="empty-card"><h3>Nenhum caso cadastrado</h3><p>Use o formulário abaixo para criar o primeiro contrato.</p></div>';
}

async function openInGpt(c){
  const command=`Busque o caso ${c.id} (${c.title}) no Veredicta e faça a análise completa seguindo suas instruções. Execute os 15 pontos, a auditoria adversarial e envie a análise auditada de volta ao Veredicta.`;
  try{await navigator.clipboard.writeText(command)}catch{}
  if(customGptUrl){window.open(customGptUrl,'_blank','noopener,noreferrer');alert('GPT aberto. O comando do caso foi copiado para a área de transferência.')}
  else alert('Comando copiado. Abra o seu GPT Veredicta e cole o comando. Configure CUSTOM_GPT_URL na Vercel para abrir automaticamente.');
}


function resolutionStateKey(){return `veredicta_resolution_${selectedId||'global'}`}
function loadResolutionState(){try{return JSON.parse(localStorage.getItem(resolutionStateKey())||'{}')}catch{return {}}}
function saveResolutionState(s){localStorage.setItem(resolutionStateKey(),JSON.stringify(s))}
function groupForPoint(n){
  if([1,2,3].includes(n))return 'ENQUADRAMENTO GERAL (PONTOS 1–3)';
  if([4,5,7,15].includes(n))return 'ESCOPO E PRAZOS (PONTOS 4, 5, 7, 15)';
  if([8,9,13].includes(n))return 'PROVA TÉCNICA E INDENIZAÇÕES (PONTOS 8, 9, 13)';
  if([10,11,12].includes(n))return 'LIMITES, LINHAS E GARANTIAS (PONTOS 10, 11, 12)';
  return 'CONTENCIOSO E EXCLUSÕES (PONTOS 6 E 14)';
}
function renderResolution(){
  const panel=$('#resolution-panel');if(!panel)return;
  const a=latest(selectedCase?.analyses||[]);const pm=pointsMap(a);
  const unresolved=CHECKLIST_15.filter(item=>{const p=pm.get(item.point);return !p||verdictClass(p.verdict)!=='atinge'});
  const state=loadResolutionState();
  const items=[];
  GENERIC_DOCS.forEach(([id,text])=>items.push({id:`doc-${id}`,group:'DOCUMENTAÇÃO GENÉRICA EXIGIDA (TODO CONTRATO, ANTES DE AVALIAR OS 15 PONTOS)',text}));
  unresolved.forEach(item=>items.push({id:`point-${item.point}`,group:groupForPoint(item.point),text:`<b>Ponto ${item.point} — ${esc(item.title)}</b> <i>(${esc(item.legal_reference)})</i>: ${esc(item.resolve)}`}));
  const groups=[...new Set(items.map(i=>i.group))];
  const checked=items.filter(i=>state[i.id]).length;
  const pct=items.length?Math.round(checked/items.length*100):100;
  panel.innerHTML=`<div class="resolution-top">
      <p>Os itens dos pontos 1–15 se ajustam automaticamente ao caso selecionado: pontos com veredito <b>atinge</b> não aparecem aqui.</p>
      <div class="progress-row"><div class="progress"><span style="width:${pct}%"></span></div><b>${checked} / ${items.length} resolvidos</b><button id="clear-resolution">limpar marcações</button></div>
    </div>
    <div class="resolution-list">${groups.map(g=>`<div class="resolve-group"><h4>${esc(g)}</h4>${items.filter(i=>i.group===g).map(i=>`<label class="resolve-item ${state[i.id]?'done':''}"><input type="checkbox" data-resolve="${esc(i.id)}" ${state[i.id]?'checked':''}><span>${i.text}</span></label>`).join('')}</div>`).join('')}</div>`;
  $$('[data-resolve]').forEach(cb=>cb.addEventListener('change',()=>{
    const s=loadResolutionState();s[cb.dataset.resolve]=cb.checked;saveResolutionState(s);renderResolution();
  }));
  $('#clear-resolution')?.addEventListener('click',()=>{localStorage.removeItem(resolutionStateKey());renderResolution()});
}

setInterval(async()=>{
  if(selectedCase && ['pendente','em-analise','aguardando-revisao'].includes(selectedCase.status)){
    try{
      const out=await api('/api/cases?id='+encodeURIComponent(selectedCase.id));
      const oldCount=(selectedCase.analyses||[]).length;
      selectedCase=out.case;
      if((selectedCase.analyses||[]).length!==oldCount){renderCase();renderResolution();await loadCases()}
    }catch{}
  }
},15000);

boot().catch(err=>{console.error(err);showLogin()});


function applyTheme(theme){
  const resolved = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolved;
  localStorage.setItem('veredicta-theme', resolved);
  const btn = document.querySelector('#theme-toggle');
  if(btn){
    btn.textContent = resolved === 'dark' ? '☀ Claro' : '☾ Escuro';
    btn.setAttribute('aria-label', resolved === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
  }
}

function initTheme(){
  const saved = localStorage.getItem('veredicta-theme') || 'light';
  applyTheme(saved);
  document.querySelector('#theme-toggle')?.addEventListener('click', ()=>{
    const current = document.documentElement.dataset.theme || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

initTheme();
