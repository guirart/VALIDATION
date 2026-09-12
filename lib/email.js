export async function sendWelcomeEmail({to,name}){
  const apiKey=process.env.RESEND_API_KEY||'';
  const from=process.env.WELCOME_EMAIL_FROM||'';
  if(!apiKey||!from){
    console.warn('[email] RESEND_API_KEY/WELCOME_EMAIL_FROM não configurados; e-mail de boas-vindas não enviado.');
    return {skipped:true};
  }
  const res=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      from,
      to:[to],
      subject:'Bem-vindo ao Veredicta',
      html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#191919"><h1 style="font-family:Georgia,serif;color:#8b6419">Bem-vindo ao Veredicta</h1><p>Olá, ${escapeHtml(name||'') || 'usuário'}.</p><p>Seu pagamento foi confirmado e seu acesso ao Veredicta está ativo.</p><p>Você já pode entrar usando o e-mail e a senha cadastrados.</p><p style="margin-top:32px;color:#666">Veredicta<br>Triagem assistida de contratos de crédito rural.</p></div>`
    })
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.message||`Resend ${res.status}`);
  return data;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
