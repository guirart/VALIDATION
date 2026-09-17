const $=s=>document.querySelector(s);
const q=new URLSearchParams(location.search);
const payload={
  response_type:q.get('response_type')||'code',
  client_id:q.get('client_id')||'',
  redirect_uri:q.get('redirect_uri')||'',
  scope:q.get('scope')||'veredicta',
  state:q.get('state')||'',
  code_challenge:q.get('code_challenge')||'',
  code_challenge_method:q.get('code_challenge_method')||''
};
function error(msg){$('#oauth-error').textContent=msg||''}
async function authState(){
  const r=await fetch('/api/auth',{credentials:'include'});const d=await r.json().catch(()=>({}));return d;
}
function showSignedIn(user){
  $('#oauth-login').classList.add('hidden');$('#oauth-user').classList.remove('hidden');$('#oauth-actions').classList.remove('hidden');
  $('#oauth-user').textContent=`Conectando como ${user?.name||user?.email||'usuário'}${user?.email?` · ${user.email}`:''}`;
}
function showLogin(){
  $('#oauth-user').classList.add('hidden');$('#oauth-actions').classList.add('hidden');$('#oauth-login').classList.remove('hidden');
}
async function authorize(decision){
  error('');
  const r=await fetch('/api/oauth/authorize',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,decision})});
  const d=await r.json().catch(()=>({}));
  if(r.status===401){showLogin();throw new Error('Entre na sua conta para continuar.')}
  if(r.status===402){throw new Error(d.error||'Regularize sua assinatura antes de conectar o GPT.')}
  if(!r.ok)throw new Error(d.error_description||d.error||`Erro ${r.status}`);
  if(!d.redirect_to)throw new Error('O Veredicta não retornou a URL de conclusão do OAuth.');
  location.assign(d.redirect_to);
}
$('#oauth-login').addEventListener('submit',async e=>{
  e.preventDefault();error('');
  try{
    const r=await fetch('/api/auth',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('#oauth-email').value.trim(),password:$('#oauth-password').value})});
    const d=await r.json().catch(()=>({}));
    if(r.status===402){if(d.payment_url){location.assign(d.payment_url);return}throw new Error(d.error||'Assinatura sem adimplência ativa.')}
    if(!r.ok)throw new Error(d.error||'Não foi possível entrar.');
    showSignedIn(d.user||{email:$('#oauth-email').value.trim()});
  }catch(e){error(e.message)}
});
$('#oauth-approve').addEventListener('click',()=>authorize('approve').catch(e=>error(e.message)));
$('#oauth-cancel').addEventListener('click',()=>authorize('deny').catch(e=>error(e.message)));
(async()=>{
  if(!payload.client_id||!payload.redirect_uri){error('Solicitação OAuth inválida: client_id ou redirect_uri ausente.');return}
  try{const s=await authState();if(s.authenticated)showSignedIn(s.user);else showLogin()}catch{showLogin()}
})();
