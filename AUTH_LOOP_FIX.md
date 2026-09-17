# Veredicta v3.8.1 — correção do loop login/dashboard

Correção isolada da camada de autenticação/frontend.

- Um `401` isolado não chama mais `showLogin()` imediatamente.
- O frontend confirma `/api/auth` antes de derrubar a sessão visual.
- O login preserva a mensagem real de senha inválida.
- `boot()` não fica disputando estado com requisições paralelas.
- Fetches usam `credentials: include`.
- Cookie de sessão mudou de `SameSite=Strict` para `SameSite=Lax`.
- A versão jurídica/validador permanece 3.8.1.

Após substituir/deployar, faça logout e login novamente para renovar o cookie com os novos atributos.
