# Veredicta 3.12: migração de GPT Actions para MCP

O Veredicta mantém os endpoints REST das antigas GPT Actions durante a transição e adiciona um servidor MCP Streamable HTTP em `/mcp`.

## Ferramentas MCP

* `consultar_status_veredicta`
* `listar_casos_veredicta`
* `buscar_caso_veredicta`
* `enviar_analise_veredicta`
* `listar_historico_veredicta`
* `buscar_analise_veredicta`

Todas as ferramentas exigem OAuth e preservam o isolamento por `owner_id`. A análise continua sujeita ao validador do backend e à revisão humana.

## Implantação

1. Faça deploy do repositório na Vercel.
2. Mantenha `APP_BASE_URL` apontando para o domínio público do Veredicta.
3. Mantenha temporariamente as variáveis `GPT_OAUTH_CLIENT_ID`, `GPT_OAUTH_CLIENT_SECRET` e `GPT_OAUTH_REDIRECT_URIS` enquanto as antigas Actions ainda forem usadas.
4. Teste `/.well-known/oauth-protected-resource` e `/.well-known/oauth-authorization-server`.
5. Teste `/mcp` com MCP Inspector.
6. No ChatGPT, ative o modo de desenvolvedor e conecte `https://SEU_DOMINIO/mcp`.
7. Instale o pacote em `plugins/veredicta` para carregar a skill jurídica.

O cliente MCP novo utiliza CIMD do ChatGPT e PKCE S256. O cliente fixo anterior permanece aceito apenas para compatibilidade temporária.
