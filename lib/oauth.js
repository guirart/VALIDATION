import crypto from 'node:crypto';
import { db } from './supabase.js';

const CLIENT_ID_DEFAULT='veredicta-chatgpt';
const ACCESS_TTL_SECONDS=60*60;
const REFRESH_TTL_SECONDS=60*60*24*30;
const CODE_TTL_SECONDS=5*60;

const hash=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex');
const random=(prefix,bytes=32)=>`${prefix}${crypto.randomBytes(bytes).toString('base64url')}`;
const b64url=buf=>Buffer.from(buf).toString('base64url');

function safeEqual(a,b){
  const A=Buffer.from(String(a||''));
  const B=Buffer.from(String(b||''));
  if(!A.length||A.length!==B.length)return false;
  try{return crypto.timingSafeEqual(A,B)}catch{return false}
}

export function oauthClientId(){
  return String(process.env.GPT_OAUTH_CLIENT_ID||CLIENT_ID_DEFAULT).trim();
}

export function oauthClientSecret(){
  return String(process.env.GPT_OAUTH_CLIENT_SECRET||'').trim();
}

export function oauthAllowedRedirectUris(){
  const raw=String(process.env.GPT_OAUTH_REDIRECT_URIS||process.env.GPT_OAUTH_REDIRECT_URI||'');
  return raw.split(',').map(v=>v.trim()).filter(Boolean);
}

export function oauthConfigStatus(baseUrl=''){
  const base=String(baseUrl||process.env.APP_BASE_URL||'').replace(/\/$/,'');
  return {
    client_id:oauthClientId(),
    client_secret_configured:Boolean(oauthClientSecret()),
    redirect_uris_configured:oauthAllowedRedirectUris().length>0,
    redirect_uri_count:oauthAllowedRedirectUris().length,
    authorization_url:base?`${base}/oauth/authorize`:'',
    token_url:base?`${base}/api/oauth/token`:''
  };
}

export function validateOAuthClient(clientId,clientSecret,{requireSecret=true}={}){
  if(isChatGptCimdClient(clientId)) return !clientSecret;
  if(!safeEqual(clientId,oauthClientId())) return false;
  if(!requireSecret) return true;
  const expected=oauthClientSecret();
  return Boolean(expected&&safeEqual(clientSecret,expected));
}

export function isChatGptCimdClient(clientId){
  try{
    const u=new URL(String(clientId||''));
    return u.protocol==='https:' && u.hostname==='chatgpt.com' &&
      (/^\/oauth\/client\.json$/.test(u.pathname) || /^\/oauth\/[A-Za-z0-9_-]+\/client\.json$/.test(u.pathname));
  }catch{return false}
}

export function validateRedirectUri(uri){
  const candidate=String(uri||'').trim();
  if(!candidate)return false;
  return oauthAllowedRedirectUris().some(v=>safeEqual(candidate,v));
}

export async function validateOAuthRedirectUri(clientId,uri){
  const candidate=String(uri||'').trim();
  if(!candidate)return false;
  if(!isChatGptCimdClient(clientId))return validateRedirectUri(candidate);
  try{
    const response=await fetch(String(clientId),{
      headers:{accept:'application/json'},
      redirect:'error',
      signal:AbortSignal.timeout(5000)
    });
    if(!response.ok)return false;
    const metadata=await response.json();
    return Array.isArray(metadata?.redirect_uris) && metadata.redirect_uris.some(v=>safeEqual(v,candidate));
  }catch{return false}
}

function normalizeScope(scope){
  const requested=String(scope||'veredicta').trim().split(/\s+/).filter(Boolean);
  const allowed=new Set(['veredicta','openid','email','profile']);
  const out=requested.filter(v=>allowed.has(v));
  return [...new Set(out.length?out:['veredicta'])].join(' ');
}

export async function createAuthorizationCode({userId,clientId,redirectUri,scope,codeChallenge='',codeChallengeMethod=''}){
  if(!validateOAuthClient(clientId,'',{requireSecret:false})) throw Object.assign(new Error('client_id inválido'),{statusCode:400,oauthError:'invalid_client'});
  const method=String(codeChallengeMethod||'').toUpperCase();
  if(codeChallenge && method && method!=='S256' && method!=='PLAIN') throw Object.assign(new Error('code_challenge_method não suportado'),{statusCode:400,oauthError:'invalid_request'});
  if(isChatGptCimdClient(clientId) && (!codeChallenge || method!=='S256')) throw Object.assign(new Error('PKCE S256 é obrigatório'),{statusCode:400,oauthError:'invalid_request'});
  const code=random('vrd_code_',28);
  const expiresAt=new Date(Date.now()+CODE_TTL_SECONDS*1000).toISOString();
  await db('veredicta_oauth_codes',{method:'POST',body:JSON.stringify({
    code_hash:hash(code),user_id:userId,client_id:clientId,redirect_uri:redirectUri,
    scope:normalizeScope(scope),code_challenge:String(codeChallenge||''),code_challenge_method:method||null,
    expires_at:expiresAt
  })});
  return {code,expiresAt,scope:normalizeScope(scope)};
}

function verifyPkce(row,codeVerifier){
  const challenge=String(row.code_challenge||'');
  if(!challenge)return true;
  const verifier=String(codeVerifier||'');
  if(!verifier)return false;
  const method=String(row.code_challenge_method||'S256').toUpperCase();
  if(method==='PLAIN')return safeEqual(verifier,challenge);
  const computed=b64url(crypto.createHash('sha256').update(verifier).digest());
  return safeEqual(computed,challenge);
}

async function issueTokens({userId,clientId,scope,existingTokenId=null}){
  const accessToken=random('vrd_oauth_at_',36);
  const refreshToken=random('vrd_oauth_rt_',40);
  const now=Date.now();
  const accessExpiresAt=new Date(now+ACCESS_TTL_SECONDS*1000).toISOString();
  const refreshExpiresAt=new Date(now+REFRESH_TTL_SECONDS*1000).toISOString();
  if(existingTokenId){
    await db(`veredicta_oauth_tokens?id=eq.${encodeURIComponent(existingTokenId)}`,{method:'PATCH',body:JSON.stringify({
      access_token_hash:hash(accessToken),refresh_token_hash:hash(refreshToken),scope:normalizeScope(scope),status:'active',
      access_expires_at:accessExpiresAt,refresh_expires_at:refreshExpiresAt,last_used_at:new Date().toISOString(),revoked_at:null
    })});
  }else{
    await db('veredicta_oauth_tokens',{method:'POST',body:JSON.stringify({
      user_id:userId,client_id:clientId,access_token_hash:hash(accessToken),refresh_token_hash:hash(refreshToken),
      scope:normalizeScope(scope),status:'active',access_expires_at:accessExpiresAt,refresh_expires_at:refreshExpiresAt
    })});
  }
  return {access_token:accessToken,token_type:'Bearer',expires_in:ACCESS_TTL_SECONDS,refresh_token:refreshToken,scope:normalizeScope(scope)};
}

export async function exchangeAuthorizationCode({code,clientId,clientSecret,redirectUri,codeVerifier=''}){
  if(!validateOAuthClient(clientId,clientSecret)) throw Object.assign(new Error('Cliente OAuth inválido'),{statusCode:401,oauthError:'invalid_client'});
  const rows=await db(`veredicta_oauth_codes?code_hash=eq.${encodeURIComponent(hash(code))}&select=id,user_id,client_id,redirect_uri,scope,code_challenge,code_challenge_method,expires_at,used_at&limit=1`);
  if(!rows.length) throw Object.assign(new Error('Código de autorização inválido'),{statusCode:400,oauthError:'invalid_grant'});
  const row=rows[0];
  if(row.used_at || Date.parse(row.expires_at)<=Date.now()) throw Object.assign(new Error('Código de autorização expirado ou já utilizado'),{statusCode:400,oauthError:'invalid_grant'});
  if(!safeEqual(row.client_id,clientId)||!safeEqual(row.redirect_uri,redirectUri)) throw Object.assign(new Error('Código não corresponde ao cliente ou redirect_uri'),{statusCode:400,oauthError:'invalid_grant'});
  if(!verifyPkce(row,codeVerifier)) throw Object.assign(new Error('PKCE inválido'),{statusCode:400,oauthError:'invalid_grant'});
  await db(`veredicta_oauth_codes?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:JSON.stringify({used_at:new Date().toISOString()})});
  return issueTokens({userId:row.user_id,clientId,scope:row.scope});
}

export async function refreshOAuthToken({refreshToken,clientId,clientSecret}){
  if(!validateOAuthClient(clientId,clientSecret)) throw Object.assign(new Error('Cliente OAuth inválido'),{statusCode:401,oauthError:'invalid_client'});
  const rows=await db(`veredicta_oauth_tokens?refresh_token_hash=eq.${encodeURIComponent(hash(refreshToken))}&client_id=eq.${encodeURIComponent(clientId)}&status=eq.active&select=id,user_id,client_id,scope,refresh_expires_at&limit=1`);
  if(!rows.length) throw Object.assign(new Error('Refresh token inválido'),{statusCode:400,oauthError:'invalid_grant'});
  const row=rows[0];
  if(Date.parse(row.refresh_expires_at)<=Date.now()){
    await db(`veredicta_oauth_tokens?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:JSON.stringify({status:'revoked',revoked_at:new Date().toISOString()})}).catch(()=>{});
    throw Object.assign(new Error('Refresh token expirado'),{statusCode:400,oauthError:'invalid_grant'});
  }
  return issueTokens({userId:row.user_id,clientId,scope:row.scope,existingTokenId:row.id});
}

export async function findOAuthAccessToken(token){
  const rows=await db(`veredicta_oauth_tokens?access_token_hash=eq.${encodeURIComponent(hash(token))}&status=eq.active&select=id,user_id,client_id,scope,access_expires_at,last_used_at&limit=1`);
  if(!rows.length)return null;
  const row=rows[0];
  if(Date.parse(row.access_expires_at)<=Date.now())return {...row,expired:true};
  return {...row,expired:false};
}

export async function touchOAuthToken(id){
  if(!id)return;
  await db(`veredicta_oauth_tokens?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({last_used_at:new Date().toISOString()})});
}

export async function revokeUserOAuth(userId){
  if(!userId)return;
  await db(`veredicta_oauth_tokens?user_id=eq.${encodeURIComponent(userId)}&status=eq.active`,{method:'PATCH',body:JSON.stringify({status:'revoked',revoked_at:new Date().toISOString()})});
}
