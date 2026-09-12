const $ = s => document.querySelector(s);
async function api(url, options={}){
  const res=await fetch(url,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  let body={}; try{body=await res.json()}catch{}
  if(res.status===401){showLogin();throw new Error('Sessão encerrada')}
  if(!res.ok)throw new Error(body.error||`Erro ${res.status}`); return body;
}
function showLogin(){ $('#users-app').classList.add('hidden'); $('#login').classList.remove('hidden') }
function showApp(){ $('#login').classList.add('hidden'); $('#users-app').classList.remove('hidden') }
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function loadUsers(){
  const out=await api('/api/admin/users');
  $('#users-list').innerHTML=(out.users||[]).map(u=>{
    const active=(u.keys||[]).filter(k=>k.status==='active');
    const last=active[0]?.last_used_at?new Date(active[0].last_used_at).toLocaleString('pt-BR'):'Nunca';
    return `<div class="user-row"><div class="user-row-head"><div><b>${esc(u.name)}</b><div class="muted">${esc(u.email)} · ${esc(u.role)}</div></div><span class="${u.status==='active'?'success':'danger'}">${esc(u.status)}</span></div><div class="muted" style="margin-top:8px">Chaves ativas: ${active.length} · Último uso: ${esc(last)}</div><div class="key-actions"><button class="btn btn-outline rotate" data-id="${u.id}">Gerar nova chave</button><button class="btn btn-outline status" data-id="${u.id}" data-status="${u.status==='active'?'suspended':'active'}">${u.status==='active'?'Suspender':'Reativar'}</button></div></div>`;
  }).join('')||'<p>Nenhum usuário.</p>';
}
function revealKey(key){$('#new-key').textContent=key;$('#new-key-wrap').classList.remove('hidden')}
$('#create-user-form').addEventListener('submit',async e=>{e.preventDefault();$('#create-status').textContent='';try{const out=await api('/api/admin/users',{method:'POST',body:JSON.stringify({operation:'create',name:$('#user-name').value.trim(),email:$('#user-email').value.trim(),role:$('#user-role').value})});revealKey(out.api_key);e.target.reset();await loadUsers()}catch(err){$('#create-status').textContent=err.message}})
$('#copy-key').addEventListener('click',()=>navigator.clipboard.writeText($('#new-key').textContent||''));
$('#refresh-users').addEventListener('click',loadUsers);
$('#users-list').addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  try{
    if(b.classList.contains('rotate')){if(!confirm('A chave atual será revogada. Continuar?'))return;const out=await api('/api/admin/users',{method:'POST',body:JSON.stringify({operation:'rotate_key',user_id:b.dataset.id})});revealKey(out.api_key)}
    if(b.classList.contains('status'))await api('/api/admin/users',{method:'POST',body:JSON.stringify({operation:'set_status',user_id:b.dataset.id,status:b.dataset.status})});
    await loadUsers();
  }catch(err){alert(err.message)}
});
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/auth',{method:'POST',body:JSON.stringify({password:$('#password').value})});showApp();await loadUsers()}catch(err){$('#login-error').textContent=err.message}})
$('#logout').addEventListener('click',async()=>{await fetch('/api/auth',{method:'DELETE',credentials:'include'});showLogin()});
(async()=>{try{const s=await fetch('/api/auth',{credentials:'include'}).then(r=>r.json());if(s.passwordRequired&&!s.authenticated)return showLogin();showApp();await loadUsers()}catch(e){console.error(e);showLogin()}})();
