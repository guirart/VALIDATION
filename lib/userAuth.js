const supabaseUrl = () => (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const publicKey = () => process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

function cookies(req){
  const out={};
  String(req.headers.cookie||'').split(';').forEach(part=>{
    const i=part.indexOf('='); if(i<0)return;
    out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());
  });
  return out;
}

function cookie(name,value,maxAge){
  return `${name}=${encodeURIComponent(value||'')}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}; Secure`;
}
export function clearUserCookies(){ return [cookie('veredicta_access','',0),cookie('veredicta_refresh','',0)]; }
function sessionCookies(session){
  return [
    cookie('veredicta_access',session.access_token,Math.max(60,Number(session.expires_in||3600))),
    cookie('veredicta_refresh',session.refresh_token,60*60*24*30)
  ];
}
function assertAuthConfig(){
  if(!supabaseUrl()||!publicKey()) throw new Error('Supabase Auth não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou SUPABASE_ANON_KEY).');
}
async function authFetch(path,options={}){
  assertAuthConfig();
  const r=await fetch(`${supabaseUrl()}/auth/v1/${path}`,{
    ...options,
    headers:{apikey:publicKey(),'Content-Type':'application/json',...(options.headers||{})}
  });
  const text=await r.text(); let data={};
  try{data=text?JSON.parse(text):{}}catch{data={message:text}}
  if(!r.ok){const e=new Error(data.error_description||data.msg||data.message||`Supabase Auth ${r.status}`);e.statusCode=r.status;throw e}
  return data;
}
export async function signIn(email,password){
  return authFetch('token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
}
export async function signUp(email,password,metadata={}){
  return authFetch('signup',{method:'POST',body:JSON.stringify({email,password,data:metadata})});
}
async function refresh(refreshToken){
  return authFetch('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:refreshToken})});
}
async function getUser(accessToken){
  return authFetch('user',{headers:{Authorization:`Bearer ${accessToken}`}});
}
export async function getCurrentUser(req,res,{refreshSession=true}={}){
  const c=cookies(req); let access=c.veredicta_access; const refreshToken=c.veredicta_refresh;
  if(access){
    try{return {user:await getUser(access),accessToken:access,refreshed:false}}catch{}
  }
  if(refreshSession&&refreshToken){
    try{
      const session=await refresh(refreshToken);
      if(res)res.setHeader('Set-Cookie',sessionCookies(session));
      return {user:session.user,accessToken:session.access_token,refreshed:true};
    }catch{}
  }
  return null;
}
export async function requireUser(req,res,json){
  const session=await getCurrentUser(req,res);
  if(session)return session;
  json(res,401,{error:'Não autenticado'}); return null;
}
export function setSessionCookies(res,session){ res.setHeader('Set-Cookie',sessionCookies(session)); }
export function authConfig(){ return {configured:Boolean(supabaseUrl()&&publicKey()),allowSignup:String(process.env.ALLOW_SIGNUP||'true').toLowerCase()==='true'}; }
