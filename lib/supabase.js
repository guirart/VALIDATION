const url = () => (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''
).replace(/\/$/, '');

const apiKey = () => (
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''
);

export function supabaseConfigStatus() {
  const keySource = process.env.SUPABASE_SECRET_KEY
    ? 'SUPABASE_SECRET_KEY'
    : process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'SUPABASE_SERVICE_ROLE_KEY'
      : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ? 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
        : null;

  return {
    urlConfigured: Boolean(url()),
    keyConfigured: Boolean(apiKey()),
    publishableMode: keySource === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    urlSource: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? 'NEXT_PUBLIC_SUPABASE_URL'
      : process.env.SUPABASE_URL
        ? 'SUPABASE_URL'
        : null,
    keySource
  };
}

function assertConfig() {
  const status = supabaseConfigStatus();
  if (!status.urlConfigured) {
    throw new Error('Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL na Vercel.');
  }
  if (!status.keyConfigured) {
    throw new Error('Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY na Vercel.');
  }
}

export async function db(path, options = {}) {
  assertConfig();
  const key = apiKey();
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
    const message = data?.message || data?.hint || `Supabase ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`${message}. Se estiver usando NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, execute o schema.sql desta versão no SQL Editor para criar as policies do MVP.`);
    }
    throw new Error(message);
  }
  return data;
}
