const $=s=>document.querySelector(s);

async function api(url,options={}){
  const res=await fetch(url,{
    credentials:'same-origin',
    headers:{'Content-Type':'application/json',...(options.headers||{})},
    ...options
  });
  let body={};
  try{body=await res.json()}catch{}
  if(res.status===401){showLogin();throw new Error('Sessão encerrada')}
  if(!res.ok)throw new Error(body.error||`Erro ${res.status}`);
  return body;
}
function showLogin(){$('#test-import-app').classList.add('hidden');$('#login').classList.remove('hidden')}
function showApp(){$('#login').classList.add('hidden');$('#test-import-app').classList.remove('hidden')}

function applyTheme(theme){
  const resolved=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=resolved;
  localStorage.setItem('veredicta-theme',resolved);
  const btn=$('#theme-toggle');
  if(btn)btn.textContent=resolved==='dark'?'☀ Claro':'☾ Escuro';
}
function initTheme(){
  applyTheme(localStorage.getItem('veredicta-theme')||'light');
  $('#theme-toggle')?.addEventListener('click',()=>{
    applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  });
}
initTheme();

async function boot(){
  const session=await fetch('/api/auth',{credentials:'same-origin'}).then(r=>r.json());
  if(session.passwordRequired&&!session.authenticated)return showLogin();
  showApp();
}
$('#login-form').addEventListener('submit',async e=>{
  e.preventDefault();$('#login-error').textContent='';
  try{
    await api('/api/auth',{method:'POST',body:JSON.stringify({password:$('#password').value})});
    showApp();
  }catch(err){$('#login-error').textContent=err.message}
});
$('#logout').addEventListener('click',async()=>{
  await fetch('/api/auth',{method:'DELETE',credentials:'same-origin'});showLogin()
});
$('#test-import-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=$('#import-btn'), result=$('#import-result');
  btn.disabled=true;btn.textContent='Importando…';result.textContent='';
  try{
    const payload=JSON.parse($('#test-json').value);
    const out=await api('/api/test-import',{method:'POST',body:JSON.stringify(payload)});
    result.textContent=JSON.stringify(out,null,2);
  }catch(err){
    result.textContent=`ERRO: ${err.message}`;
  }finally{
    btn.disabled=false;btn.textContent='Importar bateria';
  }
});
boot().catch(()=>showLogin());
