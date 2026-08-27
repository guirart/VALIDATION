const guestModeNewCase=true;
const $ = s => document.querySelector(s);

async function api(url, options={}) {
  const res = await fetch(url, {
    credentials:'same-origin',
    headers:{'Content-Type':'application/json', ...(options.headers||{})},
    ...options
  });
  let body = {};
  try { body = await res.json(); } catch {}
  if (res.status === 401) {
    showLogin();
    throw new Error('Sessão encerrada');
  }
  if (!res.ok) throw new Error(body.error || `Erro ${res.status}`);
  return body;
}

function showLogin(){ location.href='/login.html'; }

function showApp(){ $('#new-case-app').classList.remove('hidden'); }

async function boot() {
  const session = await fetch('/api/auth',{credentials:'same-origin'}).then(r=>r.json());
  if (!session.authenticated) return showLogin();
  showApp();
}


$('#logout').addEventListener('click', async () => {
  await fetch('/api/auth',{method:'DELETE', credentials:'same-origin'});
  location.href='/login.html';
});

$('#new-case-form').addEventListener('submit', async e => {
  e.preventDefault();

  const btn = $('#save-case');
  const status = $('#save-status');

  btn.disabled = true;
  btn.textContent = 'Cadastrando…';
  status.className = 'save-status';
  status.textContent = '';

  try {
    const out = await api('/api/cases',{
      method:'POST',
      body:JSON.stringify({
        title: $('#title').value.trim(),
        client_name: $('#client-name').value.trim(),
        contract_text: $('#contract-text').value
      })
    });

    status.classList.add('success');
    status.textContent = 'Caso cadastrado. Abrindo o painel…';

    const id = out?.case?.id;
    window.location.href = id ? `/?case=${encodeURIComponent(id)}` : '/';
  } catch (err) {
    status.classList.add('failure');
    status.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Cadastrar caso';
  }
});

boot().catch(err => {
  console.error(err);
  location.href='/login.html';
});


function applyTheme(theme){
  const resolved = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolved;
  localStorage.setItem('veredicta-theme', resolved);
  const btn = document.querySelector('#theme-toggle');
  if(btn){
    btn.textContent = resolved === 'dark' ? '☀ Claro' : '☾ Escuro';
    btn.setAttribute('aria-label', resolved === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro');
  }
}

function initTheme(){
  const saved = localStorage.getItem('veredicta-theme') || 'light';
  applyTheme(saved);
  document.querySelector('#theme-toggle')?.addEventListener('click', ()=>{
    const current = document.documentElement.dataset.theme || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

initTheme();
