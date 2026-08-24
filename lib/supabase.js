const url = () => (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).replace(/\/$/, '');

const serverKey = () => (
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''
);

const publishableKey = () => (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''
);

export function supabaseConfigStatus() {
  return {
    urlConfigured: Boolean(url()),
    serverKeyConfigured: Boolean(serverKey()),
    publishableKeyConfigured: Boolean(publishableKey()),
    urlSource: process.env.SUPABASE_URL
      ? 'SUPABASE_URL'
      : process.env.NEXT_PUBLIC_SUPABASE_URL
        ? 'NEXT_PUBLIC_SUPABASE_URL'
        : null,
    serverKeySource: process.env.SUPABASE_SECRET_KEY
      ? 'SUPABASE_SECRET_KEY'
      : process.env.SUPABASE_SERVICE_ROLE_KEY
        ? 'SUPABASE_SERVICE_ROLE_KEY'
        : null
  };
}

function assertConfig() {
  const status = supabaseConfigStatus();
  if (!status.urlConfigured) {
    throw new Error('Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL) na Vercel.');
  }
  if (!status.serverKeyConfigured) {
    if (status.publishableKeyConfigured) {
      throw new Error('Supabase conectado, mas falta a chave secreta do servidor. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY é pública e não pode gravar nas tabelas protegidas por RLS. Defina SUPABASE_SECRET_KEY (recomendado) ou SUPABASE_SERVICE_ROLE_KEY na Vercel.');
    }
    throw new Error('Supabase conectado, mas falta SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY.');
  }
}

export async function db(path, options = {}) {
  assertConfig();
  const key = serverKey();
  const res = await fetch(`${url()}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = { message: text }; }
  }

  if (!res.ok) {
    throw new Error(data?.message || data?.hint || `Supabase ${res.status}`);
  }
  return data;
}
