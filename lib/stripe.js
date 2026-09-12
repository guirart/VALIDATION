import crypto from 'node:crypto';

const secret=()=>process.env.STRIPE_SECRET_KEY||'';
const priceId=()=>process.env.STRIPE_PRICE_ID||'';
const webhookSecret=()=>process.env.STRIPE_WEBHOOK_SECRET||'';

export function stripeConfigStatus(){
  return {
    configured:Boolean(secret()&&priceId()),
    secretConfigured:Boolean(secret()),
    priceConfigured:Boolean(priceId()),
    webhookConfigured:Boolean(webhookSecret())
  };
}

function assertStripe(){
  if(!secret()) throw new Error('Stripe não configurado: defina STRIPE_SECRET_KEY na Vercel.');
  if(!priceId()) throw new Error('Stripe não configurado: defina STRIPE_PRICE_ID na Vercel.');
}

async function stripePost(path, params){
  assertStripe();
  const body=new URLSearchParams();
  for(const [k,v] of Object.entries(params||{})) if(v!==undefined&&v!==null&&v!=='') body.append(k,String(v));
  const res=await fetch(`https://api.stripe.com/v1/${path}`,{
    method:'POST',
    headers:{Authorization:`Bearer ${secret()}`,'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok){
    const e=new Error(data?.error?.message||`Stripe ${res.status}`);
    e.statusCode=res.status;
    e.details=data;
    throw e;
  }
  return data;
}


export async function retrieveStripeEvent(eventId){
  if(!secret()) throw new Error('Stripe não configurado: defina STRIPE_SECRET_KEY na Vercel.');
  const res=await fetch(`https://api.stripe.com/v1/events/${encodeURIComponent(eventId)}`,{
    headers:{Authorization:`Bearer ${secret()}`}
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.error?.message||`Stripe ${res.status}`);
  return data;
}
export async function createCheckoutSession({userId,email,name,customerId}){
  const base=(process.env.APP_BASE_URL||'').replace(/\/$/,'');
  if(!base) throw new Error('Defina APP_BASE_URL na Vercel para usar o pagamento.');
  const params={
    mode:'subscription',
    success_url:`${base}/?payment=success`,
    cancel_url:`${base}/?payment=cancelled`,
    'line_items[0][price]':priceId(),
    'line_items[0][quantity]':'1',
    client_reference_id:userId,
    'metadata[veredicta_user_id]':userId,
    'subscription_data[metadata][veredicta_user_id]':userId,
    allow_promotion_codes:'true',
    billing_address_collection:'auto',
    'customer_update[name]':'auto'
  };
  if(customerId) params.customer=customerId;
  else params.customer_email=email;
  if(name) params['metadata[veredicta_name]']=name;
  return stripePost('checkout/sessions',params);
}

export async function createBillingPortalSession({customerId}){
  if(!customerId) throw new Error('Cliente Stripe não localizado para este usuário.');
  const base=(process.env.APP_BASE_URL||'').replace(/\/$/,'');
  return stripePost('billing_portal/sessions',{customer:customerId,return_url:`${base}/`});
}

export function verifyStripeSignature(rawBody, signatureHeader){
  const whsec=webhookSecret();
  if(!whsec) throw new Error('STRIPE_WEBHOOK_SECRET não configurado.');
  const parts=String(signatureHeader||'').split(',').map(x=>x.trim());
  const timestamp=parts.find(x=>x.startsWith('t='))?.slice(2);
  const signatures=parts.filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));
  if(!timestamp||!signatures.length) throw new Error('Assinatura Stripe ausente ou inválida.');
  const age=Math.abs(Math.floor(Date.now()/1000)-Number(timestamp));
  if(!Number.isFinite(age)||age>300) throw new Error('Assinatura Stripe expirada.');
  const expected=crypto.createHmac('sha256',whsec).update(`${timestamp}.${rawBody}`).digest('hex');
  const ok=signatures.some(sig=>{
    try{return sig.length===expected.length&&crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))}catch{return false}
  });
  if(!ok) throw new Error('Assinatura Stripe inválida.');
  return true;
}
