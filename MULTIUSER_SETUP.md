## v3.9.2 — Login-first + proteção de migração

A página inicial sempre abre no login, mesmo se existir cookie de sessão anterior. Se `cases.owner_id` ainda não existir, o dashboard entra em modo de compatibilidade e informa que a migration multiusuário deve ser executada.

# Configuração do Veredicta v3.9 Multiusuário

## 1. Banco

No Supabase, abra SQL Editor e execute integralmente:

`supabase/migration_v3_9_multiuser.sql`

A migration cria `veredicta_users`, `veredicta_api_keys` e adiciona `owner_id` às tabelas jurídicas. Os casos existentes são atribuídos ao administrador legado para não perder dados.

## 2. Deploy

Publique o ZIP normalmente na Vercel. Mantenha as variáveis do Supabase existentes. `GPT_ACTION_API_KEY` pode permanecer configurada para compatibilidade administrativa, mas não deve ser compartilhada com clientes.

## 3. Criar usuário

Acesse:

`https://SEU-DOMINIO/admin-users.html`

Entre com a senha administrativa do Veredicta e clique em “Criar usuário e chave”. A chave completa é exibida uma única vez. O banco grava somente o SHA-256 da chave.

## 4. Vincular casos

Ao cadastrar um novo caso em `/new-case.html`, selecione o “Usuário GPT responsável”. O caso recebe `owner_id` e passa a ser invisível aos demais usuários da Action.

## 5. GPT pessoal

Para este modelo de distribuição, cada advogado deve ter sua própria cópia do GPT e configurar a autenticação da Action com a chave individual gerada para ele. O cabeçalho utilizado é:

`X-Veredicta-Key: vrd_live_...`

Use o `openapi.yaml` incluído no pacote.

## 6. Isolamento

`/api/gpt/cases`, `/api/gpt/case`, `/api/gpt/analysis`, histórico e detalhe de análise passam a operar somente dentro do `user_id` resolvido pela chave. Tentativas de consultar UUID de outro usuário retornam “não encontrado”.

## 7. Bloqueio e rotação

Em `/admin-users.html` você pode suspender o usuário ou gerar uma nova chave. A rotação revoga todas as chaves ativas anteriores daquele usuário.

## Importante

Esta versão implementa multiusuário e isolamento por chave. Pagamento, criação automática por checkout e e-mail de boas-vindas ainda não estão ligados nesta versão. Eles podem ser adicionados depois usando o mesmo `veredicta_users.id` como vínculo.
