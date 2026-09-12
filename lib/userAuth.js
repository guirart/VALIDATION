const supabaseUrl = () => (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).replace(/\/$/, '');

const serverKey = () => (
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''
);

const publicKey = () => (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  serverKey()
);

function assertAuthConfig(){
  if(!supabaseUrl()) throw new Error('Supabase Auth não configurado: falta SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL.');
  if(!serverKey()) throw new Error('Supabase Auth não configurado: falta SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY.');
}

async function authFetch(path, {method='POST', body, admin=false}={}){
  assertAuthConfig();
  const key = admin ? serverKey() : publicKey();
  if(!key) throw new Error('Chave do Supabase Auth não configurada.');
  const res = await fetch(`${supabaseUrl()}/auth/v1/${path}`, {
    method,
    headers:{
      apikey:key,
      Authorization:`Bearer ${admin ? serverKey() : key}`,
      'Content-Type':'application/json'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data={};
  try{ data=text?JSON.parse(text):{} }catch{ data={message:text} }
  if(!res.ok){
    const e=new Error(data?.msg || data?.message || data?.error_description || data?.error || `Supabase Auth ${res.status}`);
    e.statusCode=res.status;
    e.details=data;
    throw e;
  }
  return data;
}

export async function signUpUser({email,password,name}){
  const redirectBase=(process.env.APP_BASE_URL||'').replace(/\/$/,'');
  const body={email,password,data:{name}};
  const path=redirectBase?`signup?redirect_to=${encodeURIComponent(`${redirectBase}/?email_confirmed=1`)}`:'signup';
  return authFetch(path,{body});
}

export async function signInUser({email,password}){
  return authFetch('token?grant_type=password',{body:{email,password}});
}

export async function recoverPassword(email){
  const redirectBase=(process.env.APP_BASE_URL||'').replace(/\/$/,'');
  const body={email};
  if(redirectBase) body.redirect_to=`${redirectBase}/?recovery=1`;
  return authFetch('recover',{body});
}

export async function deleteAuthUser(userId){
  if(!userId) return;
  return authFetch(`admin/users/${encodeURIComponent(userId)}`,{method:'DELETE',admin:true});
}

export async function getAuthUser(accessToken){
  assertAuthConfig();
  const key=publicKey();
  const res=await fetch(`${supabaseUrl()}/auth/v1/user`,{
    headers:{apikey:key,Authorization:`Bearer ${accessToken}`}
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.message||'Sessão Supabase inválida');
  return data;
}
