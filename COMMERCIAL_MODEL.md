# Modelo comercial do Veredicta

## Produto

O produto vendido é composto por:

1. **Skill Veredicta**: regras de análise, auditoria adversarial e referências jurídicas.
2. **Servidor MCP**: conecta o ambiente do cliente às ferramentas do Veredicta.
3. **Aplicativo Veredicta**: cadastro de casos, histórico, cobrança e revisão humana.

A skill não contém dados de clientes nem credenciais. Cada cliente autoriza a própria conta por OAuth.

## Experiência do cliente

1. O cliente contrata um plano.
2. Cria ou recebe uma conta individual no Veredicta.
3. Instala o pacote `plugins/veredicta` em um cliente compatível.
4. Conecta `https://validation-six-tawny.vercel.app/mcp`.
5. Autoriza o acesso à conta Veredicta.
6. Cadastra contratos no aplicativo e pede a análise pela skill.
7. Consulta os resultados e encaminha-os para revisão humana.

## Isolamento e segurança

- O token OAuth identifica o usuário em cada chamada.
- Casos, análises e históricos são filtrados pelo `owner_id` no servidor.
- A skill nunca deve receber uma chave compartilhada entre clientes.
- A autorização e a assinatura são verificadas no backend; instruções do modelo não são controle de acesso.
- A ferramenta de envio grava análises, mas não cria nem exclui casos.

## Planos sugeridos

| Plano | Público | Controle inicial |
|---|---|---|
| Individual | advogado autônomo | 1 usuário e limite mensal de análises |
| Escritório | equipe jurídica | usuários vinculados à mesma organização |
| Corporativo | instituição | limite e regras definidos em contrato |

O Stripe já está integrado para assinatura. Para impor limites por plano, o próximo passo é adicionar `plan_code`, `monthly_analysis_limit` e um contador mensal no banco, verificando o consumo antes de `POST /api/gpt/analysis`.

## Distribuição

O pacote distribuível é a pasta `plugins/veredicta`. O arquivo `.mcp.json` aponta para o servidor hospedado e o manifesto aponta para a skill jurídica. Atualizações da skill devem ser versionadas e publicadas junto com uma nova versão do plugin.

## Checklist antes de vender

- [ ] Aplicar todas as migrations do Supabase em produção.
- [ ] Configurar `APP_BASE_URL`, Stripe e OAuth na Vercel.
- [ ] Testar duas contas em paralelo e confirmar que não há vazamento de casos.
- [ ] Definir os limites de cada plano.
- [ ] Criar termos de uso, política de privacidade e aviso de revisão humana.
- [ ] Distribuir o pacote apenas após confirmar o domínio e o fluxo OAuth.
