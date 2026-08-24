const $ = s => document.querySelector(s);
let cases = [];
let selectedId = null;
let customGptUrl = '';


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
function verdictClass(v){return ['atinge','parcial','atenção','ausente'].includes(v)?v:'ausente'}
function renderCase(c){
  const a=latest(c.analyses||[]), r=latest(c.reviews||[]);
  const meta=`<div class="meta-grid"><div class="meta"><span>Status</span><b>${esc(c.status)}</b></div><div class="meta"><span>Cliente</span><b>${esc(c.client_name||'—')}</b></div><div class="meta"><span>Criado</span><b>${fmtDate(c.created_at)}</b></div><div class="meta"><span>Revisão</span><b>${r?esc(r.decision):'pendente'}</b></div></div>`;
  let html=`<div class="section-head"><div><div class="eyebrow">CASO</div><h2>${esc(c.title)}</h2></div><button id="analyze-btn" class="primary">${a?'Reanalisar no GPT':'Analisar no GPT'}</button></div>${meta}`;
  if(!a){html+=`<div class="panel" style="padding:20px"><h3>Ainda não analisado</h3><p>O contrato já está no app. A análise é feita dentro do seu GPT personalizado, que busca este caso por Action, executa analista + auditor e grava o resultado de volta aqui.</p><p><code>Analise o caso ${esc(c.id)}.</code></p></div>`}
  else{
    const aj=a.analyst_json||{}; const au=a.audit_json||{};
    html+=`<div class="analysis-summary"><div class="eyebrow">CLASSIFICAÇÃO FINAL</div><h2>${esc(a.final_classification)}</h2><p>${esc(aj.summary||au.summary||'')}</p><div class="status">auditor: ${esc(a.auditor_recommendation)}</div> <div class="status">quality gate: ${a.quality_gate?'aprovado':'bloqueado'}</div></div>`;
    if((a.validation_errors||[]).length) html+=`<div class="warning"><b>Validador determinístico encontrou:</b><br>${(a.validation_errors||[]).map(esc).join('<br>')}</div>`;
    html+=`<div class="points">${(aj.points||[]).map(p=>`<details class="point"><summary><span class="point-num">${String(p.number).padStart(2,'0')}</span><span><b>${esc(p.title)}</b><br><small>${esc(p.legal_reference||'')}</small></span><span class="pill v-${verdictClass(p.verdict)}">${esc(p.display_label||p.verdict)}</span></summary><div class="point-body"><div class="evidence"><div class="quote"><small>NA MP</small><p>“${esc(p.mp_quote)}”</p><span class="${p.mp_quote_verified?'verified':'not-verified'}">${p.mp_quote_verified?'✓ citação verificada':'✕ não verificada'}</span></div><div class="quote"><small>NO CONTRATO/LAUDO</small><p>“${esc(p.contract_quote)}”</p><span class="${p.contract_quote_verified?'verified':'not-verified'}">${p.contract_quote_verified?'✓ citação verificada':'✕ não verificada'}</span></div></div><p><b>Por quê:</b> ${esc(p.reasoning)}</p></div></details>`).join('')}</div>`;
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
