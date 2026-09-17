# Loop de treinamento `/begin_test`

Use este modo somente em ambiente de teste e com casos sintéticos. O objetivo é alcançar 100 acertos consecutivos, não apenas 100 tentativas.

## Isolamento

- O gerador/coordenador pode acessar o gabarito.
- O analista recebe somente o contrato retornado pelo comando `next`.
- Nunca inclua classificação, defeito esperado ou ponto-alvo no texto enviado ao Veredicta.
- A comparação só ocorre depois que a análise foi gravada.

## Execução

1. Inicie o estado com `node scripts/training-loop.mjs init <estado.json>`.
2. Obtenha o próximo caso com `node scripts/training-loop.mjs next <estado.json>`.
3. Cadastre o contrato com `criar_caso_veredicta`, recupere o UUID e hash, analise e envie a resposta auditada.
4. Salve a resposta em JSON contendo `external_test_id`, `final_classification` e `points`.
5. Registre com `node scripts/training-loop.mjs record <estado.json> <resposta.json>`.
6. Se houver erro, leia somente a `lesson` retornada e aplique-a às rodadas seguintes. Não revele o gabarito integral ao analista.
7. Repita até `completed=true`, que exige `streak=100`.

Antes da primeira rodada, consulte `consultar_status_veredicta` e carregue `sources`. Confirme que versões e hashes coincidem com os campos de status. Se `sources` não existir, tente `consultar_fontes_juridicas_veredicta`. Interrompa se os conteúdos continuarem ausentes ou divergentes. Para baterias sintéticas, prefira `importar_casos_sinteticos_veredicta`: o backend deve devolver um caso pertencente ao mesmo usuário OAuth, com `environment=test` e `synthetic=true`. Não crie uma cópia pelo endpoint comum se a recuperação falhar; isso contaminaria o ambiente de produção.

Um acerto soma um ponto e aumenta a sequência. Um erro subtrai um ponto e zera a sequência. As lições são memória de treinamento, não alteração automática dos pesos do modelo nem publicação automática da skill. Antes de incorporá-las permanentemente, revise-as e rode regressão completa.
