const $=s=>document.querySelector(s);
async function api(url,options={}){
  const res=await fetch(url,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  let body={};try{body=await res.json()}catch{}
  if(res.status===401){location.replace('/');throw new Error('Sessão encerrada')}
  if(res.status===403){location.replace('/');throw new Error('Acesso administrativo restrito')}
  if(!res.ok)throw new Error(body.error||`Erro ${res.status}`);
  return body;
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function when(v){if(!v)return 'Nunca';try{return new Date(v).toLocaleString('pt-BR')}catch{return 'Nunca'}}
function subscriptionLabel(v,role){if(role==='admin'||v==='admin_exempt')return ['Isento','pill-good'];const s=String(v||'pending').toLowerCase();if(['active','trialing'].includes(s))return ['Adimplente','pill-good'];if(['past_due','unpaid'].includes(s))return ['Em atraso','pill-bad'];if(['canceled','incomplete_expired'].includes(s))return ['Cancelada','pill-bad'];return ['Pendente','pill-warn']}
function statusLabel(v){return v==='active'?['Ativa','pill-good']:['Suspensa','pill-bad']}

function render(out){
  const users=out.users||[];
  $('#stat-total').textContent=users.length;
  $('#stat-active').textContent=users.filter(u=>u.status==='active').length;
  $('#stat-paid').textContent=users.filter(u=>u.role==='admin'||['active','trialing','admin_exempt'].includes(String(u.subscription_status||''))).length;
  $('#stat-gpt').textContent=users.filter(u=>u.gpt?.connected).length;
  $('#migration-warning').classList.toggle('hidden',!out.migration_required);

  const oauth=out.oauth||{};
  const oauthReady=Boolean(oauth.client_secret_configured&&oauth.redirect_uris_configured&&!out.migration_required);
  $('#oauth-dot').className=`status-dot ${oauthReady?'ok':'warn'}`;
  $('#oauth-badge').textContent=oauthReady?'pronto para conectar':'configuração pendente';
  $('#oauth-badge').className=`pill-admin ${oauthReady?'pill-good':'pill-warn'}`;
  $('#oauth-description').textContent=oauthReady
    ?'O GPT pode identificar cada usuário pelo login do Veredicta. As chaves manuais permanecem apenas como compatibilidade legada.'
    :'Para ativar o OAuth do GPT, conclua a migration v3.11 e configure o Client Secret e a URL de retorno do ChatGPT na Vercel.';
  $('#oauth-meta').innerHTML=`Client ID: <code>${esc(oauth.client_id||'—')}</code><br>Authorization URL: <code>${esc(oauth.authorization_url||'—')}</code><br>Token URL: <code>${esc(oauth.token_url||'—')}</code>`;

  const monitor=out.legal_monitor||{};
  const last=monitor.last_check;
  $('#legal-last-check').innerHTML=last
    ? `Última conferência oficial: <strong>${esc(when(last.checked_at))}</strong> · Fonte: <strong>Congresso Nacional</strong> · ${last.changed?'alteração detectada':'sem alteração detectada'}`
    : 'Nenhuma conferência oficial registrada ainda.';
  const legislation=out.legal_sources_in_use?.legislation||[];
  const interpretive=out.legal_sources_in_use?.interpretive_sources||[];
  $('#legal-sources').innerHTML=[...legislation,...interpretive].map(src=>`<div class="legal-card">
    <b>${esc(src.name)}</b>
    <small>${esc(src.type)} · ${src.enforced_in_analysis?'USADA E VALIDADA NA ANÁLISE':'somente informativa'}</small>
    <small>Versão: ${esc(src.version||'—')}</small>
    <small>SHA-256: <code>${esc(src.sha256||'—')}</code></small>
    <small>${esc(src.enforcement||'')}</small>
    ${src.official_url?`<small><a href="${esc(src.official_url)}" target="_blank" rel="noopener">Abrir fonte oficial</a></small>`:''}
  </div>`).join('');

  $('#users-list').innerHTML=users.map(u=>{
    const [sub,subClass]=subscriptionLabel(u.subscription_status,u.role);
    const [status,statusClass]=statusLabel(u.status);
    const gpt=u.gpt?.connected?'Conectado':'Não conectado';
    return `<article class="user-row">
      <div class="user-main"><b>${esc(u.name)}</b><span>${esc(u.email)}</span></div>
      <div class="cell"><span class="cell-label">Perfil</span><strong>${u.role==='admin'?'Administrador':'Usuário'}</strong></div>
      <div class="cell"><span class="cell-label">Conta</span><strong class="${statusClass}">${status}</strong></div>
      <div class="cell"><span class="cell-label">Assinatura</span><strong class="${subClass}">${sub}</strong></div>
      <div class="cell"><span class="cell-label">GPT</span><strong class="${u.gpt?.connected?'pill-good':'pill-warn'}">${gpt}</strong><small>Último uso: ${esc(when(u.gpt?.last_used_at))}</small></div>
      <div class="actions">
        ${u.gpt?.connected||u.gpt?.legacy_keys?`<button class="btn btn-outline revoke-gpt" data-id="${u.id}">Revogar GPT</button>`:''}
        <button class="btn btn-outline status ${u.status==='active'?'danger-btn':''}" data-id="${u.id}" data-status="${u.status==='active'?'suspended':'active'}">${u.status==='active'?'Suspender':'Reativar'}</button>
      </div>
    </article>`
  }).join('')||'<div class="empty">Nenhum usuário cadastrado.</div>';
}

async function loadUsers(){render(await api('/api/admin/users'))}
$('#refresh-users').addEventListener('click',()=>loadUsers().catch(e=>alert(e.message)));
$('#users-list').addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  try{
    if(b.classList.contains('revoke-gpt')){
      if(!confirm('Desconectar o GPT deste usuário? Ele precisará conectar a conta novamente no ChatGPT.'))return;
      await api('/api/admin/users',{method:'POST',body:JSON.stringify({operation:'revoke_gpt',user_id:b.dataset.id})});
    }
    if(b.classList.contains('status')){
      const suspending=b.dataset.status==='suspended';
      if(suspending&&!confirm('Suspender esta conta? O acesso ao site e ao GPT será bloqueado.'))return;
      await api('/api/admin/users',{method:'POST',body:JSON.stringify({operation:'set_status',user_id:b.dataset.id,status:b.dataset.status})});
    }
    await loadUsers();
  }catch(err){alert(err.message)}
});
$('#logout').addEventListener('click',async()=>{await fetch('/api/auth',{method:'DELETE',credentials:'include'}).catch(()=>{});location.replace('/')});
(async()=>{try{const r=await fetch('/api/auth',{credentials:'include'});const s=await r.json();if(!s.authenticated||s.user?.role!=='admin'){location.replace('/');return}$('#users-app').classList.remove('hidden');await loadUsers()}catch(e){console.error(e);location.replace('/')}})();
