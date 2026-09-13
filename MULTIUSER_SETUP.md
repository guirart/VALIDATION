# Veredicta multiusuário — arquitetura atual v3.11

## Identidade

Cada pessoa possui uma conta real do Veredicta criada por e-mail e senha. O registro ocorre exclusivamente na página inicial e a assinatura Stripe fica vinculada a essa conta.

## Isolamento

Cada caso possui `owner_id`. O site e a Action consultam apenas os casos do usuário autenticado.

## GPT

A v3.11 substitui a distribuição manual de chaves por OAuth. Quando o usuário usa o GPT, o ChatGPT abre o login do Veredicta e recebe um token individual após autorização.

Fluxo:

`ChatGPT → OAuth Veredicta → login → conta/assinatura → token → API → owner_id`

As antigas `veredicta_api_keys` continuam aceitas somente para transição e não aparecem mais na interface administrativa.

## Administração

`/admin-users.html` permite ver:

- nome e e-mail
- perfil
- status da conta
- assinatura
- conexão do GPT
- último uso

Ações administrativas:

- suspender ou reativar conta
- revogar conexão GPT

A criação de usuários não ocorre no painel administrativo.

## Banco

A base multiusuário continua usando `veredicta_users` e `owner_id`. Para o OAuth execute também:

`supabase/migration_v3_11_gpt_oauth.sql`

## Cobrança

Usuário comum: `active` ou `trialing` libera site e GPT.

Administrador: `role=admin` é isento de cobrança.
