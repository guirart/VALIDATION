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

function showLogin() {
  $('#new-case-app').classList.add('hidden');
  $('#login').classList.remove('hidden');
}

function showApp() {
  $('#login').classList.add('hidden');
  $('#new-case-app').classList.remove('hidden');
}

async function boot() {
  const session = await fetch('/api/auth',{credentials:'same-origin'}).then(r=>r.json());
  if (session.passwordRequired && !session.authenticated) return showLogin();
  showApp();
}

$('#login-form').addEventListener('submit', async e => {
  e.preventDefault();
  $('#login-error').textContent = '';
  try {
    await api('/api/auth',{
      method:'POST',
      body:JSON.stringify({password:$('#password').value})
    });
    showApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
});

$('#logout').addEventListener('click', async () => {
  await fetch('/api/auth',{method:'DELETE', credentials:'same-origin'});
  showLogin();
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
  showLogin();
});
