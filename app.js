const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let cases = [];
let selectedId = null;
let selectedCase = null;
let customGptUrl = '';
let currentFilter = 'all';
let activeCaseView = 'overview';

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

function visualVerdictClass(p){
  if(!p)return 'ausente';
  const explicit=norm(p.display_status||'').trim();
  if(explicit==='atinge'||explicit==='parcial'||explicit==='atencao'||explicit==='nao_consta'||explicit==='nao_se_aplica') return explicit==='nao_se_aplica'||explicit==='nao_consta'?'ausente':explicit;
  const display=norm(p.display_label||'').trim();

  // A cor deve seguir o status que o usuário efetivamente vê na tela.
  if(display==='atinge'||display==='atende'||display==='atendido'||display==='atingido') return 'atinge';
  if(display==='parcial'||display.includes('parcial')) return 'parcial';
  if(display==='atencao'||display.includes('atencao')) return 'atencao';
  if(display.includes('nao consta')||display.includes('nao se aplica')||display==='ausente') return 'ausente';

  return verdictClass(p.verdict);
}

function latest(arr=[]){return [...arr].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]}

let authState='checking';
let authCheckPromise=null;

async function confirmSession(force=false){
  if(authCheckPromise&&!force)return authCheckPromise;
  authCheckPromise=(async()=>{
    try{
      const res=await fetch('/api/auth',{credentials:'include',cache:'no-store'});
      if(!res.ok)return false;
      const body=await res.json().catch(()=>({}));
      return Boolean(body.authenticated);
    }catch{return false}
    finally{authCheckPromise=null}
  })();
  return authCheckPromise;
}

async function api(url, options={}){
  const res=await fetch(url,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  let body={};try{body=await res.json()}catch{}

  if(res.status===401){
    // O endpoint de login deve preservar a mensagem real (ex.: senha inválida).
    if(url==='/api/auth')throw new Error(body.error||'Não autenticado');

    // Não derruba a interface por um 401 isolado. Confirma a sessão antes.
    const authenticated=await confirmSession(true);
    if(!authenticated){
      authState='unauthenticated';
      showLogin();
      throw new Error('Sessão encerrada');
    }

    // A sessão continua válida: mantenha o dashboard e reporte apenas a falha da chamada.
    throw new Error(body.error||'Falha temporária de autenticação');
  }

  if(!res.ok){
    const err=new Error(body.error||`Erro ${res.status}`);
    err.status=res.status;
    err.body=body;
    throw err;
  }
  return body;
}
function showLogin(message=''){
  if(authState==='authenticated')authState='unauthenticated';
  const app=$('#app');
  const login=$('#login');
  if(app)app.classList.add('hidden');
  if(login)login.classList.remove('hidden');
  const bootError=$('#boot-error');
  if(bootError && message)bootError.textContent=message;
}
function showApp(){
  authState='authenticated';
  const login=$('#login');
  const app=$('#app');
  if(login)login.classList.add('hidden');
  if(app)app.classList.remove('hidden');
  const bootError=$('#boot-error');
  if(bootError)bootError.textContent='';
}

function showRuntimeError(message='Falha ao carregar dados do Veredicta.'){
  let box=document.getElementById('runtime-error-banner');
  if(!box){
    box=document.createElement('div');
    box.id='runtime-error-banner';
    box.style.cssText='position:fixed;left:16px;right:16px;top:16px;z-index:99999;padding:12px 16px;border-radius:10px;background:#7f1d1d;color:#fff;font:600 14px/1.4 system-ui;box-shadow:0 8px 30px rgba(0,0,0,.35)';
    document.body.appendChild(box);
  }
  box.textContent=message;
}
function clearRuntimeError(){
  document.getElementById('runtime-error-banner')?.remove();
}

function setAuthMode(mode){
  const loginMode=mode!=='register';
  $('#tab-login')?.classList.toggle('active',loginMode);
  $('#tab-register')?.classList.toggle('active',!loginMode);
  $('#login-form')?.classList.toggle('hidden',!loginMode);
  $('#register-form')?.classList.toggle('hidden',loginMode);
  $('#login-error').textContent='';
  $('#register-error').textContent='';
  $('#payment-action')?.classList.add('hidden');
}
function showAuthMessage(text,type='info'){
  const el=$('#auth-global-message');
  if(!el)return;
  el.textContent=text||'';
  el.classList.toggle('hidden',!text);
  el.dataset.type=type;
}
async function boot(){
  authState='checking';
  showLogin();
  clearRuntimeError();
  setAuthMode('login');
  const qs=new URLSearchParams(location.search);
  if(qs.get('payment')==='success') showAuthMessage('Pagamento concluído. Se o e-mail já foi confirmado, entre com sua conta.','success');
  if(qs.get('payment')==='cancelled') showAuthMessage('Pagamento cancelado. Sua conta permanece sem acesso até a assinatura ser concluída.','warning');
  if(qs.get('email_confirmed')==='1') showAuthMessage('E-mail confirmado. Conclua o pagamento, se ainda estiver pendente, e depois faça login.','success');
  const authenticated=await confirmSession(true);
  if(!authenticated){
    authState='unauthenticated';
    showLogin();
    return;
  }
  showApp();
  try{
    await loadConfig();
    await loadCases();
  }catch(err){
    console.error('Sessão restaurada, mas falhou o carregamento de dados:',err);
    showRuntimeError('Sessão restaurada. Falha ao carregar dados: '+(err?.message||'erro desconhecido'));
  }
}
$('#tab-login')?.addEventListener('click',()=>setAuthMode('login'));
$('#tab-register')?.addEventListener('click',()=>setAuthMode('register'));

$('#login-form').addEventListener('submit',async e=>{
  e.preventDefault();
  $('#login-error').textContent='';
  $('#payment-action')?.classList.add('hidden');
  try{
    await api('/api/auth',{method:'POST',body:JSON.stringify({
      email:$('#login-email').value,
      password:$('#login-password').value
    })});
    const authenticated=await confirmSession(true);
    if(!authenticated)throw new Error('Login aceito, mas a sessão não foi confirmada. Tente novamente.');
    showApp();
    clearRuntimeError();
    try{
      await loadConfig();
      await loadCases();
    }catch(dataErr){
      console.error('Login OK, mas falhou o carregamento de dados:',dataErr);
      showRuntimeError('Login realizado. Falha ao carregar dados: '+(dataErr?.message||'erro desconhecido'));
    }
  }catch(err){
    authState='unauthenticated';
    showLogin();
    const billingRequired=Boolean(err?.body?.billing_required);
    const paymentUrl=String(err?.body?.payment_url||'');
    const billingError=String(err?.body?.billing_error||'');
    $('#login-error').textContent=billingRequired && billingError
      ? `${err.message} Motivo da cobrança: ${billingError}`
      : err.message;
    if(billingRequired && paymentUrl){
      const a=$('#payment-action');
      a.href=paymentUrl;
      a.classList.remove('hidden');
      $('#login-error').textContent='Assinatura pendente. Redirecionando para o pagamento…';
      setTimeout(()=>{ window.location.assign(paymentUrl); },250);
    }
  }
});

$('#register-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  $('#register-error').textContent='';
  const password=$('#register-password').value;
  const confirm=$('#register-password-confirm').value;
  if(password!==confirm){ $('#register-error').textContent='As senhas não coincidem.'; return; }
  const btn=$('#register-submit');
  const old=btn.textContent;
  btn.disabled=true; btn.textContent='Criando conta…';
  try{
    const out=await api('/api/register',{method:'POST',body:JSON.stringify({
      name:$('#register-name').value,
      email:$('#register-email').value,
      password,
      accept_terms:$('#register-terms').checked
    })});
    showAuthMessage(out.message||'Conta criada. Continue para o pagamento.','success');
    if(out.checkout_url) window.location.href=out.checkout_url;
  }catch(err){
    $('#register-error').textContent=err.message;
  }finally{btn.disabled=false;btn.textContent=old;}
});

$('#forgot-password')?.addEventListener('click',async()=>{
  const email=String($('#login-email').value||'').trim();
  if(!email){ $('#login-error').textContent='Informe seu e-mail para recuperar a senha.'; return; }
  try{
    const out=await api('/api/recover',{method:'POST',body:JSON.stringify({email})});
    showAuthMessage(out.message||'Confira seu e-mail.','success');
  }catch(err){ $('#login-error').textContent=err.message; }
});
$('#logout').addEventListener('click',async()=>{
  await fetch('/api/auth',{method:'DELETE',credentials:'include'}).catch(()=>{});
  authState='unauthenticated';
  showLogin();
});
$('#refresh').addEventListener('click',async()=>{await loadCases(true)});
$('#sidebar-refresh')?.addEventListener('click',async()=>{await loadCases(true)});
$('#case-search')?.addEventListener('input',()=>renderHistory());

async function loadConfig(){try{const out=await api('/api/config');customGptUrl=out.custom_gpt_url||'';const adminLink=document.querySelector('a[href="/admin-users.html"]');if(adminLink)adminLink.style.display=out.user?.role==='admin'?'inline-flex':'none'}catch{customGptUrl=''}}
async function loadCases(keep=false){
  const out=await api('/api/cases');cases=out.cases||[];
  clearRuntimeError();
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
  const stats=$('#stats');
  const analyzed=cases.filter(c=>(c.analyses||[]).length).length;
  const reviewed=cases.filter(c=>(c.reviews||[]).length).length;
  const pending=cases.filter(c=>c.status==='pendente'||c.status==='em-analise').length;
  if(stats)stats.innerHTML=[
    ['AGENTES CONFIGURADOS','2','analista + auditor'],
    ['FONTES DE REFERÊNCIA','2','MP integral + memorando'],
    ['CASOS CADASTRADOS',String(cases.length),`${analyzed} com análise gravada`],
    ['REVISÕES HUMANAS',String(reviewed),`${pending} casos pendentes/em análise`]
  ].map(x=>`<div class="stat-card"><span>${x[0]}</span><b>${x[1]}</b><small>${x[2]}</small></div>`).join('');
  if($('#tests-note')) $('#tests-note').textContent='';
}

function historyClassificationClass(value=''){
  const n=norm(value);
  if(n==='enquadravel') return 'history-class-eligible';
  if(n.includes('parcialmente')) return 'history-class-partial';
  if(n==='inconclusivo') return 'history-class-uncertain';
  if(n.includes('nao enquadravel')) return 'history-class-rejected';
  return 'history-class-neutral';
}

function archiveGroupForCase(c){
  const status=String(c?.status||'').toLowerCase();
  if(status==='concluido')return 'completed';
  if(status==='aguardando-revisao'||status==='requer-correcao')return 'review';
  if(status==='pendente'||status==='em-analise')return 'active';
  return 'other';
}

function historyItemHtml(c){
  const a=latest(c.analyses);
  const selected=c.id===selectedId;
  const classification=a?.final_classification||'ainda não analisado';
  const classCss=historyClassificationClass(classification);
  return `<button class="history-item ${classCss} ${selected?'active':''}" data-id="${esc(c.id)}">
    <span class="history-dot ${a?'done':'pending'}"></span>
    <span class="history-content">
      <b class="history-title">${esc(c.title)}</b>
      <small class="history-uid">UUID ${esc(c.id)}</small>
      <span class="history-meta"><em class="${classCss}">${esc(shortClass(classification))}</em><time>${fmtDate(c.updated_at||c.created_at)}</time></span>
    </span>
  </button>`;
}

function renderHistory(){
  const q=norm($('#case-search')?.value||'');
  const filtered=cases.filter(c=>{
    if(!q)return true;
    const a=latest(c.analyses);
    return norm([c.id,c.external_test_id,c.title,c.status,a?.final_classification].join(' ')).includes(q);
  });
  const folders=[
    {key:'active',label:'Em andamento'},
    {key:'review',label:'Aguardando revisão'},
    {key:'completed',label:'Casos revisados'},
    {key:'other',label:'Outros casos'}
  ];
  $('#case-history').innerHTML=filtered.length?folders.map(folder=>{
    const items=filtered.filter(c=>archiveGroupForCase(c)===folder.key);
    if(!items.length)return '';
    const shouldOpen=Boolean(q);
    return `<details class="archive-folder" data-folder="${folder.key}" ${shouldOpen?'open':''}>
      <summary><span class="archive-folder-icon" aria-hidden="true"></span><b>${esc(folder.label)}</b><em>${items.length}</em><span class="archive-folder-chevron" aria-hidden="true">›</span></summary>
      <div class="archive-folder-cases">${items.map(historyItemHtml).join('')}</div>
    </details>`;
  }).join(''):`<div class="history-empty">Nenhum caso encontrado no arquivo.</div>`;
  $$('.history-item').forEach(b=>b.addEventListener('click',()=>openCase(b.dataset.id)));
}
function renderTabs(){ renderHistory(); }
async function openCase(id,rerenderTabs=true){
  selectedId=id;if(rerenderTabs)renderTabs();
  $('#case-view').innerHTML='<div class="loading-card">Carregando caso…</div>';
  try{const out=await api('/api/cases?id='+encodeURIComponent(id));selectedCase=out.case;renderCase();renderResolution();renderTabs()}
  catch(err){$('#case-view').innerHTML=`<div class="error-card">${esc(err.message)}</div>`}
}
function shortClass(v=''){return v.replace('parcialmente enquadrável','parcial').replace('não enquadrável','não enquadrável')}

function pointsMap(a){return new Map(((a?.analyst_json?.points)||[]).map(p=>[Number(p.point??p.number),p]))}
function findingsMap(a){return new Map(((a?.audit_json?.findings)||[]).map(f=>[Number(f.point),f]))}
function countVerdicts(a){
  const pm=pointsMap(a);const c={atinge:0,parcial:0,atencao:0,ausente:0};
  CHECKLIST_15.forEach(i=>{const p=pm.get(i.point);if(p)c[visualVerdictClass(p)]++});
  return c;
}
function gridHtml(a){
  const pm=pointsMap(a);const counts=countVerdicts(a);
  return `<div id="case-points" class="memo15">
    <div class="memo15-head"><b>Checklist dos 15 pontos do memorando — status neste contrato</b><span>${counts.atinge} atingidos · ${counts.parcial} parcial · ${counts.atencao} atenção · ${counts.ausente} não consta/não se aplica</span></div>
    <div class="memo-grid">
      ${CHECKLIST_15.map(item=>{
        const p=pm.get(item.point);const v=p?visualVerdictClass(p):'ausente';const label=p?verdictLabel(p.verdict,p.display_label):'pendente';
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
  return `<div id="case-evidence" class="checkpoint-list">${CHECKLIST_15.map(item=>{
    const p=pm.get(item.point);const f=fm.get(item.point);const v=p?visualVerdictClass(p):'ausente';
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

function classificationHeroHtml(a){
  const final=String(a?.final_classification||'').trim();
  const n=norm(final);

  let key='neutral', icon='•', subtitle='Classificação final da análise.';
  if(n==='enquadravel'){
    key='eligible'; icon='✓';
    subtitle='Requisitos analisados compatíveis com o enquadramento.';
  }else if(n.includes('parcialmente')){
    key='partial'; icon='◐';
    subtitle='Há elementos favoráveis, mas permanecem pontos parciais.';
  }else if(n==='inconclusivo'){
    key='uncertain'; icon='?';
    subtitle='A documentação disponível não permite conclusão jurídica segura.';
  }else if(n.includes('nao enquadravel')){
    key='rejected'; icon='×';
    subtitle='Há requisito impeditivo ou incompatibilidade relevante.';
  }

  return `<section class="final-class final-class-hero final-class-${key}">
    <div class="final-class-main">
      <div class="final-class-icon" aria-hidden="true">${esc(icon)}</div>
      <div class="final-class-copy">
        <div class="label">CLASSIFICAÇÃO FINAL</div>
        <strong>${esc(final||'—')}</strong>
        <small>${esc(subtitle)}</small>
      </div>
    </div>
  </section>`;
}

function executiveSummaryHtml(a){
  const c=countVerdicts(a);
  const achievedPercent=Math.round((c.atinge/15)*100);
  const pending=c.parcial+c.atencao+c.ausente;
  const recommendation=String(a?.auditor_recommendation||'não informada');
  const gate=a?.quality_gate===true;
  return `<section class="executive-summary" aria-label="Resumo executivo dos 15 pontos">
    <div class="executive-summary-head">
      <div><span>RESUMO EXECUTIVO</span><h4>${c.atinge} de 15 pontos foram atingidos</h4></div>
      <b class="executive-percent">${achievedPercent}%</b>
    </div>
    <div class="executive-progress" aria-label="${achievedPercent}% dos pontos atingidos"><span style="width:${achievedPercent}%"></span></div>
    <div class="executive-metrics">
      <div class="metric-achieved"><b>${c.atinge}/15</b><span>pontos atingidos</span></div>
      <div class="metric-partial"><b>${c.parcial}</b><span>resultados parciais</span></div>
      <div class="metric-attention"><b>${c.atencao}</b><span>pontos de atenção</span></div>
      <div class="metric-missing"><b>${c.ausente}</b><span>não consta ou não se aplica</span></div>
    </div>
    <div class="executive-status">
      <p><b>Situação geral:</b> ${pending===0?'todos os requisitos analisados foram atendidos':`${pending} ponto${pending===1?' exige':'s exigem'} verificação, complementação ou providência`}.</p>
      <p><b>Quality gate:</b> <span class="${gate?'quality-ok':'quality-blocked'}">${gate?'liberado':'bloqueado'}</span> · <b>Recomendação da auditoria:</b> ${esc(recommendation)}.</p>
    </div>
  </section>`;
}

function renderCase(){
  const c=selectedCase;if(!c)return renderEmptyCase();
  const a=latest(c.analyses||[]);const aj=a?.analyst_json||{};const au=a?.audit_json||{};
  let html=`<div class="case-pages"><article id="case-overview" class="analysis-sheet case-panel" data-case-panel="overview">
    <div class="case-head">
      <div><span class="case-eyebrow">ANÁLISE DO CASO</span><h3>${esc(c.title)}</h3><div class="source-line">UUID ${esc(c.id)} · ${esc(c.status)}</div></div>
      <button id="analyze-btn" class="btn btn-outline">${a?'reanalisar no GPT':'analisar no GPT'}</button>
    </div>`;

  if(a){
    html+=classificationHeroHtml(a);
    html+=executiveSummaryHtml(a);
    html+=`<div class="summary-box">
      <p><b>Resumo:</b> ${esc(aj.summary||au.summary||'')}</p>
      <p><b>Auditoria:</b> ${esc(a.auditor_recommendation||'—')} · quality gate ${a.quality_gate?'liberado':'bloqueado'}</p>
    </div></article>
    <article class="analysis-sheet case-panel" data-case-panel="points">
      <div class="panel-page-head"><span>15 PONTOS</span><h3>Quadro de enquadramento</h3><p>Resultado individual de cada requisito jurídico analisado.</p></div>
      ${gridHtml(a)}
    </article>
    <article class="analysis-sheet case-panel" data-case-panel="evidence">
      <div class="panel-page-head"><span>EVIDÊNCIAS</span><h3>Fontes, fundamentos e auditoria</h3><p>Abra cada ponto para consultar as citações e a verificação adversarial.</p></div>
      ${filterBarHtml(a)}
      ${pointCardsHtml(a)}
      <div class="report-foot">análise ${esc(a.id)} · fonte ${esc(a.legal_source_version||'não informada')} · memorando ${esc(a.memorandum_version||'não informado')} · criada em ${fmtDate(a.created_at)}</div>
    </article>`;
  }else{
    if(String(c.status||'').toLowerCase()==='em-analise'){
      html+=`<div class="no-analysis analysis-progress" role="status" aria-live="polite"><h4>Analisando conforme MP...</h4><p>A análise jurídica está em andamento. Os detalhes intermediários permanecem ocultos e o resultado será exibido aqui quando estiver concluído.</p></div></article>`;
    }else{
      html+=`<div class="no-analysis"><h4>Ainda não analisado</h4><p>O caso está salvo. Clique em <b>analisar no GPT</b>; o GPT buscará o contrato pelo UUID, fará os 15 pontos e gravará o resultado aqui.</p><code>Analise o caso ${esc(c.id)}.</code></div></article>`;
    }
  }
  html+='</div>';
  $('#case-view').innerHTML=html;

  $('#analyze-btn')?.addEventListener('click',()=>openInGpt(c));
  $$('.filter-chip').forEach(b=>b.addEventListener('click',()=>{currentFilter=b.dataset.filter;renderCase()}));
  $$('[data-expand]').forEach(b=>b.addEventListener('click',()=>{$$('.checkpoint:not(.checkpoint-hidden)').forEach(d=>d.open=b.dataset.expand==='1')}));
  applyCaseView();
}

function renderEmptyCase(){
  $('#case-view').innerHTML='<div class="empty-card"><h3>Nenhum caso cadastrado</h3><p>Use o formulário abaixo para criar o primeiro contrato.</p></div>';
}

async function openInGpt(c){
  const command=`Busque exclusivamente pelo UUID ${c.id} no Veredicta e faça a análise completa seguindo suas instruções. Ignore nomes e títulos para fins de identificação. Execute os 15 pontos, a auditoria adversarial e envie a análise auditada de volta ao mesmo UUID.`;
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
  const caseReviewed=String(selectedCase?.status||'').toLowerCase()==='concluido';
  const allResolved=items.length>0 && checked===items.length;
  panel.innerHTML=`<div class="resolution-top">
      <p>Os itens dos pontos 1–15 se ajustam automaticamente ao caso selecionado: pontos com veredito <b>atinge</b> não aparecem aqui.</p>
      <div class="progress-row"><div class="progress"><span style="width:${pct}%"></span></div><b>${checked} / ${items.length} resolvidos</b><button id="clear-resolution" ${caseReviewed?'disabled':''}>limpar marcações</button></div>
      ${caseReviewed
        ? '<div class="review-complete-panel reviewed"><span class="review-complete-icon">✓</span><div><b>Caso revisado</b><small>Este caso já foi encerrado pela revisão humana e está arquivado em “Casos revisados”.</small></div></div>'
        : allResolved
          ? '<div class="review-complete-panel ready"><div><b>Todas as pendências foram marcadas como resolvidas.</b><small>Finalize a revisão humana para mover este caso para a caixa “Casos revisados”.</small></div><button id="complete-review" class="btn btn-primary">Considerar caso revisado</button></div>'
          : ''}
    </div>
    <div class="resolution-list">${groups.map(g=>`<div class="resolve-group"><h4>${esc(g)}</h4>${items.filter(i=>i.group===g).map(i=>`<label class="resolve-item ${state[i.id]?'done':''}"><input type="checkbox" data-resolve="${esc(i.id)}" ${state[i.id]?'checked':''} ${caseReviewed?'disabled':''}><span>${i.text}</span></label>`).join('')}</div>`).join('')}</div>`;
  $('[data-resolve]').forEach(cb=>cb.addEventListener('change',()=>{
    const s=loadResolutionState();s[cb.dataset.resolve]=cb.checked;saveResolutionState(s);renderResolution();
  }));
  $('#clear-resolution')?.addEventListener('click',()=>{localStorage.removeItem(resolutionStateKey());renderResolution()});
  $('#complete-review')?.addEventListener('click',async()=>{
    const button=$('#complete-review');
    if(!selectedCase?.id || !allResolved || !button)return;
    const original=button.textContent;
    button.disabled=true;
    button.textContent='Finalizando revisão…';
    try{
      await api('/api/review',{method:'POST',body:JSON.stringify({case_id:selectedCase.id})});
      await loadCases(true);
      activeCaseView='resolution';
      applyCaseView();
    }catch(err){
      button.disabled=false;
      button.textContent=original;
      alert(err.message||'Não foi possível concluir a revisão.');
    }
  });
  applyCaseView();
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

function renderBootFailure(err){
  console.error('BOOT_ERROR',err);
  authState='unauthenticated';
  const message='Falha ao carregar o Veredicta. Recarregue a página. Se persistir, verifique o Console e a API.';
  showLogin(message);
}

window.addEventListener('error',event=>{
  if(authState==='checking')renderBootFailure(event.error||new Error(event.message||'Erro de inicialização'));
});

window.addEventListener('unhandledrejection',event=>{
  if(authState==='checking')renderBootFailure(event.reason instanceof Error?event.reason:new Error(String(event.reason||'Falha de inicialização')));
});

boot().catch(renderBootFailure);


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

function applyCaseView(){
  const requested=activeCaseView;
  const panel=document.querySelector(`[data-case-panel="${requested}"]`);
  if(requested!=='resolution' && !panel && selectedCase) activeCaseView='overview';
  document.querySelectorAll('[data-case-panel]').forEach(item=>{
    item.classList.toggle('active',item.dataset.casePanel===activeCaseView);
  });
  document.querySelectorAll('.analysis-nav-btn').forEach(item=>{
    const active=item.dataset.caseView===activeCaseView;
    item.classList.toggle('active',active);
    item.setAttribute('aria-selected',String(active));
  });
  const resolution=document.querySelector('#resolution-section');
  if(resolution)resolution.classList.toggle('active-page',activeCaseView==='resolution');
  const caseView=document.querySelector('#case-view');
  if(caseView)caseView.classList.toggle('hidden-page',activeCaseView==='resolution');
  document.querySelector('.compact-info')?.classList.toggle('hidden-page',activeCaseView!=='overview');
}

// As quatro opções são páginas independentes, não atalhos de rolagem.
document.querySelectorAll('.analysis-nav-btn').forEach(button=>{
  button.addEventListener('click',()=>{
    activeCaseView=button.dataset.caseView||'overview';
    applyCaseView();
  });
});






// SIDEBAR_RESIZE_V365 — usa a variável REAL do layout fixo.
(function initResizableHistorySidebar(){
  const root = document.documentElement;
  const sidebar = document.querySelector('.history-sidebar');
  const page = document.querySelector('.workspace > .page');
  const resizer = document.querySelector('#sidebar-resizer');
  const collapseBtn = document.querySelector('#sidebar-collapse');

  if (!sidebar || !page || !resizer || !collapseBtn) return;

  const MIN = 240;
  const MAX = 620;
  const DEFAULT = 304;
  const COLLAPSED = 52;

  const STORAGE_WIDTH = 'veredicta-sidebar-width-v365';
  const STORAGE_COLLAPSED = 'veredicta-sidebar-collapsed-v365';

  const clamp = (value) => Math.min(MAX, Math.max(MIN, Number(value) || DEFAULT));

  function expandedWidth(){
    const raw = getComputedStyle(root).getPropertyValue('--veredicta-sidebar-width');
    return clamp(parseFloat(raw));
  }

  function setExpandedWidth(width, persist=true){
    const next = clamp(width);
    root.style.setProperty('--veredicta-sidebar-width', `${next}px`);
    root.style.setProperty('--sidebar-width', `${next}px`);
    resizer.setAttribute('aria-valuenow', String(Math.round(next)));
    if (persist) localStorage.setItem(STORAGE_WIDTH, String(next));
  }

  function applyLayout(){
    const collapsed = root.classList.contains('sidebar-collapsed');

    if (collapsed) {
      root.style.setProperty('--veredicta-active-sidebar-width', `${COLLAPSED}px`);
    } else {
      root.style.setProperty('--veredicta-active-sidebar-width', `${expandedWidth()}px`);
    }
  }

  function setCollapsed(collapsed, persist=true){
    root.classList.toggle('sidebar-collapsed', collapsed);
    collapseBtn.setAttribute('aria-expanded', String(!collapsed));
    collapseBtn.setAttribute('aria-label', collapsed ? 'Expandir histórico' : 'Minimizar histórico');
    collapseBtn.title = collapsed ? 'Expandir histórico' : 'Minimizar histórico';

    const icon = collapseBtn.querySelector('.sidebar-collapse-icon');
    if (icon) icon.textContent = collapsed ? '›' : '‹';

    applyLayout();

    if (persist) {
      localStorage.setItem(STORAGE_COLLAPSED, collapsed ? '1' : '0');
    }
  }

  const storedWidth = Number(localStorage.getItem(STORAGE_WIDTH));
  setExpandedWidth(Number.isFinite(storedWidth) && storedWidth > 0 ? storedWidth : DEFAULT, false);
  setCollapsed(localStorage.getItem(STORAGE_COLLAPSED) === '1', false);

  collapseBtn.addEventListener('click', () => {
    setCollapsed(!root.classList.contains('sidebar-collapsed'));
  });

  let dragging = false;
  let activePointerId = null;
  let startX = 0;
  let startWidth = DEFAULT;

  function finishDrag(){
    if (!dragging) return;
    dragging = false;
    root.classList.remove('sidebar-resizing');
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');

    if (activePointerId !== null) {
      try { resizer.releasePointerCapture?.(activePointerId); } catch {}
    }

    localStorage.setItem(STORAGE_WIDTH, String(expandedWidth()));
    activePointerId = null;
  }

  resizer.addEventListener('pointerdown', (event) => {
    if (root.classList.contains('sidebar-collapsed')) return;

    // No mouse, somente botão esquerdo inicia o redimensionamento.
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    dragging = true;
    activePointerId = event.pointerId;
    startX = event.clientX;
    startWidth = sidebar.getBoundingClientRect().width;

    root.classList.add('sidebar-resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    resizer.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  resizer.addEventListener('pointermove', (event) => {
    if (!dragging || event.pointerId !== activePointerId) return;

    const next = clamp(startWidth + (event.clientX - startX));
    setExpandedWidth(next, false);
    applyLayout(); // Redimensiona sidebar E painel direito durante o arraste.
  });

  resizer.addEventListener('pointerup', (event) => {
    if (!dragging || event.pointerId !== activePointerId) return;
    finishDrag();
  });

  resizer.addEventListener('pointercancel', finishDrag);
  resizer.addEventListener('lostpointercapture', finishDrag);

  // Alternativa acessível via teclado no próprio separador.
  resizer.addEventListener('keydown', (event) => {
    if (root.classList.contains('sidebar-collapsed')) return;

    let next = null;
    if (event.key === 'ArrowLeft') next = expandedWidth() - 16;
    if (event.key === 'ArrowRight') next = expandedWidth() + 16;
    if (event.key === 'Home') next = MIN;
    if (event.key === 'End') next = MAX;

    if (next !== null) {
      event.preventDefault();
      setExpandedWidth(next);
      applyLayout();
    }
  });

  applyLayout();
})();
