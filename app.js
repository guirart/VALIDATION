const $ = s => document.querySelector(s);
let cases = [];
let selectedId = null;
let customGptUrl = '';

const CHECKLIST_15 = [
  {point:1,title:'Natureza do instrumento',legal_reference:'art. 1º, caput e art. 7º — regulamentação do CMN',description:'Reconhecer a fase administrativa e a dependência de regulamentação do CMN, sem tratar a MP como substituta da atuação jurídica.'},
  {point:2,title:'Filtro geral cumulativo',legal_reference:'art. 1º, § 1º',description:'Verificar cumulativamente beneficiário, janela 2019–2025, 2+ safras, redução de 30%+, nexo, laudo, categoria da dívida e sujeição à aprovação da instituição.'},
  {point:3,title:'Modalidade excepcional',legal_reference:'art. 1º, § 7º',description:'Verificar 3+ safras, redução de 40%+ e vínculo específico a evento climático extremo.'},
  {point:4,title:'Escopo da dívida abrangida',legal_reference:'art. 1º, I/II/III; art. 6º para CPR',description:'Identificar corretamente custeio, comercialização, industrialização, investimento ou CPR e conferir as datas e condições específicas.'},
  {point:5,title:'Ausência de obrigação bancária',legal_reference:'art. 1º, § 4º, V; art. 3º, I',description:'Não presumir direito subjetivo à contratação; verificar adesão, recusa, tratamento desigual ou exigência não prevista.'},
  {point:6,title:'Processos judiciais ativos',legal_reference:'silêncio da MP quanto a execução em curso',description:'Não presumir suspensão automática de execução, penhora, leilão ou negativação; identificar providências cabíveis.'},
  {point:7,title:'Prorrogação de 30 dias',legal_reference:'art. 4º',description:'Verificar inadimplência em 14/07/2026, vencimento em até 30 dias da publicação e pedido de contratação da nova linha.'},
  {point:8,title:'Suficiência do laudo técnico',legal_reference:'art. 1º, § 1º e § 7º',description:'Conferir evento, safras, atividade financiada, renda esperada x obtida, percentual de redução, nexo causal e critério de renda adotado.'},
  {point:9,title:'Independência técnica / risco de fraude',legal_reference:'art. 9º',description:'Não induzir enquadramento; preservar independência técnica e sinalizar consequências de falsidade ou fraude.'},
  {point:10,title:'Limites cumulativos',legal_reference:'art. 1º, § 4º, I, d; § 7º, VI',description:'Somar operações por mutuário em todas as instituições e aplicar regras complementares quando cabíveis.'},
  {point:11,title:'Linha do art. 2º sem juros protegidos',legal_reference:'art. 2º, § 2º, I',description:'Quando aplicável, alertar que os juros são negociados e comparar custo total antes de presumir vantagem.'},
  {point:12,title:'Garantias e novação',legal_reference:'art. 5º, parágrafo único',description:'Revisar riscos de novação, renúncias, vencimento antecipado e redução/ampliação de garantias.'},
  {point:13,title:'Valores já pagos/indenizados',legal_reference:'art. 3º, II',description:'Separar valores efetivamente pagos ou indenizados da parcela não coberta, sem excluir automaticamente toda a operação.'},
  {point:14,title:'Dívida Ativa da União',legal_reference:'art. 1º, § 9º',description:'Conferir se a operação foi encaminhada à Dívida Ativa da União e aplicar a exclusão quando pertinente.'},
  {point:15,title:'Janela real de 120 dias',legal_reference:'art. 1º, § 4º, IV; art. 62, CF',description:'Controlar o prazo de contratação e distingui-lo do prazo constitucional de vigência/conversão da MP.'}
];



async function api(url, options={}) {
  const res = await fetch(url, { credentials:'same-origin', headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options });
  let body = {};
  try { body = await res.json(); } catch {}
  if (res.status === 401) { showLogin(); throw new Error('Sessão encerrada'); }
  if (!res.ok) throw new Error(body.error || `Erro ${res.status}`);
  return body;
}

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function fmtDate(s){if(!s)return '—'; try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(s));}catch{return s}}
function showLogin(){ $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); }
function showApp(){ $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); }

async function boot(){
  const s = await fetch('/api/auth',{credentials:'same-origin'}).then(r=>r.json());
  if(s.passwordRequired && !s.authenticated) return showLogin();
  showApp(); await loadConfig(); await loadCases();
}

$('#login-form').addEventListener('submit', async e=>{
  e.preventDefault(); $('#login-error').textContent='';
  try { await api('/api/auth',{method:'POST',body:JSON.stringify({password:$('#password').value})}); showApp(); await loadConfig(); await loadCases(); }
  catch(err){ $('#login-error').textContent=err.message; }
});
$('#logout').addEventListener('click', async()=>{ await fetch('/api/auth',{method:'DELETE'}); showLogin(); });
$('#new-case').addEventListener('click',()=>{ selectedId=null; renderCaseList(); $('#empty').classList.add('hidden'); $('#case-panel').classList.add('hidden'); $('#new-panel').classList.remove('hidden'); });

$('#case-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=e.submitter; btn.disabled=true; btn.textContent='Salvando…';
  try{
    const out=await api('/api/cases',{method:'POST',body:JSON.stringify({title:$('#title').value,client_name:$('#client-name').value,contract_text:$('#contract-text').value})});
    e.target.reset(); await loadCases(); await openCase(out.case.id);
  }catch(err){alert(err.message)}finally{btn.disabled=false;btn.textContent='Salvar caso'}
});


async function loadConfig(){
  try{const out=await api('/api/config'); customGptUrl=out.custom_gpt_url||'';}catch{customGptUrl='';}
}

async function loadCases(){
  const out=await api('/api/cases'); cases=out.cases||[]; renderCaseList();
}
function renderCaseList(){
  $('#case-list').innerHTML=cases.map(c=>`<button class="case-link ${c.id===selectedId?'active':''}" data-id="${c.id}"><b>${esc(c.title)}</b><small>${esc(c.status)} · ${fmtDate(c.created_at)}</small></button>`).join('');
  document.querySelectorAll('.case-link').forEach(b=>b.addEventListener('click',()=>openCase(b.dataset.id)));
}
async function openCase(id){
  selectedId=id; renderCaseList(); $('#empty').classList.add('hidden'); $('#new-panel').classList.add('hidden'); $('#case-panel').classList.remove('hidden');
  $('#case-panel').innerHTML='<div class="empty-state">Carregando…</div>';
  try{const out=await api('/api/cases?id='+encodeURIComponent(id)); renderCase(out.case)}catch(err){$('#case-panel').innerHTML=`<p class="error">${esc(err.message)}</p>`}
}
function latest(arr=[]){return [...arr].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]}
function verdictClass(v){
  const n=String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  return ['atinge','parcial','atencao','ausente'].includes(n)?n:'ausente';
}
function auditClass(v){
  const n=String(v||'').toLowerCase();
  if(n==='confirmado') return 'audit-ok';
  if(n==='divergente') return 'audit-bad';
  if(n==='não encontrado') return 'audit-missing';
  if(n==='opinião sem precedente') return 'audit-opinion';
  return 'audit-pending';
}
function renderChecklist15(a){
  const aj=a?.analyst_json||{};
  const au=a?.audit_json||{};
  const points=new Map((aj.points||[]).map(p=>[Number(p.point ?? p.number),p]));
  const findings=new Map((au.findings||[]).map(f=>[Number(f.point),f]));
  const counts={atinge:0,parcial:0,atencao:0,ausente:0,pendente:0};
  CHECKLIST_15.forEach(item=>{
    const p=points.get(item.point);
    if(!p){counts.pendente++;return;}
    counts[verdictClass(p.verdict)]++;
  });
  const progress=a ? 15-counts.pendente : 0;
  return `<section class="checklist-section">
    <div class="checklist-head">
      <div><div class="eyebrow">CHECKLIST OBRIGATÓRIO</div><h3>15 pontos da MP nº 1.376/2026</h3><p>Todos os pontos são exibidos sempre. Antes da análise ficam pendentes; depois recebem veredito, evidências, raciocínio e auditoria.</p></div>
      <div class="checklist-progress"><b>${progress}/15</b><span>analisados</span></div>
    </div>
    <div class="checklist-stats">
      <span class="stat-chip v-atinge">${counts.atinge} atinge</span>
      <span class="stat-chip v-parcial">${counts.parcial} parcial</span>
      <span class="stat-chip v-atencao">${counts.atencao} atenção</span>
      <span class="stat-chip v-ausente">${counts.ausente} ausente</span>
      ${counts.pendente?`<span class="stat-chip v-pendente">${counts.pendente} pendente</span>`:''}
    </div>
    <div class="points checklist-points">${CHECKLIST_15.map(item=>{
      const p=points.get(item.point);
      const f=findings.get(item.point);
      const verdict=p?verdictClass(p.verdict):'pendente';
      const label=p?(p.display_label||p.verdict):'pendente';
      const auditLabel=f?(f.status||'pendente'):'pendente';
      return `<details class="point checklist-point" data-point="${item.point}">
        <summary>
          <span class="point-num">${String(item.point).padStart(2,'0')}</span>
          <span><b>${esc(item.title)}</b><br><small>${esc(p?.legal_reference||item.legal_reference)}</small></span>
          <span class="point-badges"><span class="pill v-${verdict}">${esc(label)}</span><span class="audit-pill ${auditClass(auditLabel)}">auditoria: ${esc(auditLabel)}</span></span>
        </summary>
        <div class="point-body">
          <p class="checklist-description">${esc(item.description)}</p>
          ${p?`<div class="evidence"><div class="quote"><small>NA MP</small><p>“${esc(p.mp_quote||'')}”</p><span class="${p.mp_quote_verified?'verified':'not-verified'}">${p.mp_quote_verified?'✓ citação verificada':'✕ citação não verificada'}</span></div><div class="quote"><small>NO CONTRATO/LAUDO</small><p>“${esc(p.contract_quote||'')}”</p><span class="${p.contract_quote_verified?'verified':'not-verified'}">${p.contract_quote_verified?'✓ citação verificada':'✕ citação não verificada'}</span></div></div><p><b>Raciocínio:</b> ${esc(p.reasoning||'')}</p>`:`<div class="pending-box">Este ponto ainda não foi analisado pelo GPT.</div>`}
          ${f?`<div class="audit-box ${auditClass(f.status)}"><b>Auditoria:</b> ${esc(f.status)}${f.reason?` — ${esc(f.reason)}`:''}</div>`:''}
        </div>
      </details>`;
    }).join('')}</div>
  </section>`;
}
function renderCase(c){
  const a=latest(c.analyses||[]), r=latest(c.reviews||[]);
  const meta=`<div class="meta-grid"><div class="meta"><span>Status</span><b>${esc(c.status)}</b></div><div class="meta"><span>Cliente</span><b>${esc(c.client_name||'—')}</b></div><div class="meta"><span>Criado</span><b>${fmtDate(c.created_at)}</b></div><div class="meta"><span>Revisão</span><b>${r?esc(r.decision):'pendente'}</b></div></div>`;
  let html=`<div class="section-head"><div><div class="eyebrow">CASO</div><h2>${esc(c.title)}</h2></div><button id="analyze-btn" class="primary">${a?'Reanalisar no GPT':'Analisar no GPT'}</button></div>${meta}`;
  if(!a){html+=`<div class="panel" style="padding:20px"><h3>Ainda não analisado</h3><p>O contrato já está no app. A análise é feita dentro do seu GPT personalizado, que busca este caso por Action, executa analista + auditor e grava o resultado de volta aqui.</p><p><code>Analise o caso ${esc(c.id)}.</code></p></div>${renderChecklist15(null)}`}
  else{
    const aj=a.analyst_json||{}; const au=a.audit_json||{};
    html+=`<div class="analysis-summary"><div class="eyebrow">CLASSIFICAÇÃO FINAL</div><h2>${esc(a.final_classification)}</h2><p>${esc(aj.summary||au.summary||'')}</p><div class="status">auditor: ${esc(a.auditor_recommendation)}</div> <div class="status">quality gate: ${a.quality_gate?'aprovado':'bloqueado'}</div></div>`;
    if((a.validation_errors||[]).length) html+=`<div class="warning"><b>Validador determinístico encontrou:</b><br>${(a.validation_errors||[]).map(esc).join('<br>')}</div>`;
    html+=renderChecklist15(a);
    html+=`<div class="review"><h3>Revisão humana</h3><p>O resultado só deve ser tratado como concluído após revisão de advogado.</p><div class="form-grid"><label>Nome<input id="reviewer-name" /></label><label>OAB<input id="reviewer-oab" /></label><label class="full">Observações<textarea id="review-notes" rows="4"></textarea></label><div class="full actions"><button class="primary review-btn" data-decision="aprovado">Aprovar revisão</button><button class="review-btn" data-decision="devolver">Devolver para correção</button></div></div></div>`;
  }
  $('#case-panel').innerHTML=html;
  $('#analyze-btn')?.addEventListener('click',()=>openInGpt(c));
  document.querySelectorAll('.review-btn').forEach(b=>b.addEventListener('click',()=>review(c.id,a.id,b.dataset.decision)));
}
async function openInGpt(c){
  const command=`Analise o caso ${c.id} (${c.title}) usando as Actions do Veredicta. Faça a análise completa dos 15 pontos, a auditoria adversarial e grave o resultado no app.`;
  try{await navigator.clipboard.writeText(command);}catch{}
  if(customGptUrl){
    window.open(customGptUrl,'_blank','noopener,noreferrer');
    alert('GPT aberto. O comando do caso foi copiado para a área de transferência.');
  }else{
    alert('Comando copiado para a área de transferência. Abra seu GPT Veredicta e cole o comando. Para abrir automaticamente, configure CUSTOM_GPT_URL na Vercel.');
  }
}
async function review(caseId,analysisId,decision){
  const reviewer_name=$('#reviewer-name').value.trim(); if(!reviewer_name)return alert('Informe o nome do advogado revisor.');
  try{await api('/api/review',{method:'POST',body:JSON.stringify({case_id:caseId,analysis_id:analysisId,reviewer_name,reviewer_oab:$('#reviewer-oab').value,notes:$('#review-notes').value,decision})}); await loadCases(); await openCase(caseId)}catch(err){alert(err.message)}
}
boot().catch(err=>{console.error(err);showLogin()});
