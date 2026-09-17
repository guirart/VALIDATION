const $ = s => document.querySelector(s);
let currentRole='user';

async function api(url, options={}) {
  const res = await fetch(url, {credentials:'include',headers:{'Content-Type':'application/json', ...(options.headers||{})},...options});
  let body={}; try{body=await res.json()}catch{}
  if(res.status===401){location.href='/';throw new Error('Sessão encerrada')}
  if(!res.ok)throw new Error(body.error||`Erro ${res.status}`);
  return body;
}

async function loadOwners(){
  if(currentRole!=='admin')return;
  const out=await api('/api/admin/users');
  const select=$('#owner-user');
  const users=(out.users||[]).filter(u=>u.status==='active');
  select.innerHTML=users.map(u=>`<option value="${u.id}">${u.name} — ${u.email}</option>`).join('');
  $('#owner-field')?.classList.remove('hidden');
}

async function boot(){
  const session=await fetch('/api/auth',{credentials:'include'}).then(r=>r.json()).catch(()=>({}));
  if(!session.authenticated){location.replace('/');return;}
  const config=await api('/api/config');
  currentRole=config.user?.role||'user';
  $('#new-case-app').classList.remove('hidden');
  await loadOwners();
}

$('#logout').addEventListener('click',async()=>{await fetch('/api/auth',{method:'DELETE',credentials:'include'}).catch(()=>{});location.replace('/')});

$('#new-case-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=$('#save-case'), status=$('#save-status');
  btn.disabled=true;btn.textContent='Cadastrando…';status.className='save-status';status.textContent='';
  try{
    const payload={title:$('#title').value.trim(),client_name:$('#client-name').value.trim(),contract_text:$('#contract-text').value};
    if(currentRole==='admin'&&$('#owner-user')?.value)payload.owner_user_id=$('#owner-user').value;
    const out=await api('/api/cases',{method:'POST',body:JSON.stringify(payload)});
    status.classList.add('success');status.textContent='Caso cadastrado. Abrindo o painel…';
    const id=out?.case?.id;location.href=id?`/?case=${encodeURIComponent(id)}`:'/';
  }catch(err){status.classList.add('failure');status.textContent=err.message;btn.disabled=false;btn.textContent='Cadastrar caso'}
});

function applyTheme(theme){const resolved=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=resolved;localStorage.setItem('veredicta-theme',resolved);const btn=$('#theme-toggle');if(btn){btn.textContent=resolved==='dark'?'☀ Claro':'☾ Escuro';btn.setAttribute('aria-label',resolved==='dark'?'Ativar tema claro':'Ativar tema escuro')}}
function initTheme(){const saved=localStorage.getItem('veredicta-theme')||'light';applyTheme(saved);$('#theme-toggle')?.addEventListener('click',()=>applyTheme((document.documentElement.dataset.theme||'light')==='dark'?'light':'dark'))}
initTheme();
boot().catch(err=>{console.error(err);location.replace('/')});
