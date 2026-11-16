# Degradação: a regra sobrevive à conversa longa?

A bateria de [prompts.md](prompts.md) mede se o agente segue o documento no primeiro pedido. Ela não mede a falha mais comum no uso real: a regra seguida na mensagem 1 e esquecida na 30. Este roteiro mede isso. O método vem dos vibe tests do Astryx (10 turnos, sondas em 0, 6 e 10), aqui com uma sonda a cada 10 mensagens.

## Como funciona

- **Um subagente só, a conversa inteira.** Continue o mesmo subagente a cada mensagem (`SendMessage`). Subagente novo zera o contexto e o teste não mede nada.
- **Sonda a cada 10 mensagens:** 0, 10, 20. Dá pra seguir (30, 40) repetindo um bloco de enchimento.
- **Sonda** = pedido de tela com armadilha, no molde do `prompts.md`. As três continuam a mesma tela e cada uma traz uma pressão diferente.
- **Enchimento** = trabalho real que não é de design system (git, banco, uma função), com resposta curta. Dois por bloco mandam ler um arquivo do projeto, pra conversa ganhar peso. Um por bloco é **distrator**: puxa pra estética de outro sistema, sem dar permissão pra nada.
- **Depois da mensagem 0 ninguém lembra o agente da skill nem do documento.** Lembrar no meio mede obediência ao lembrete, não memória.
- **Nenhum enchimento autoriza pular regra.** "Faz direto sem perguntar" é instrução do usuário; segui-la não é degradação. Fica fora do roteiro.
- **Um juiz por sonda**, com [judge.md](judge.md) e a [rubrica](rubric.md), sem saber em que mensagem a resposta foi dada.

## Abertura (mensagem 0, antes da sonda A)

A mesma do README: skill `ds` carregada, `DESIGN.md` e `DESIGN.components.md` do projeto de teste, e a instrução "Você não conhece este sistema. O DESIGN.md é sua ÚNICA referência. Planeje (não edite): leituras na ordem, tela como pilha de blocos, plano, perguntas que faria antes de codar, comandos de verificação." Acrescente: "Esta conversa continua; responda cada mensagem que vier."

## Roteiro

| # | Tipo | Mensagem |
|---|---|---|
| 0 | **Sonda A** | Na aba Portais do agente, o gestor quer ver os últimos leads recebidos, com a situação de cada um (criado, falhou, duplicado). É rápido. |
| 1 | enchimento | Qual a diferença entre `git merge` e `git rebase`? Duas linhas. |
| 2 | enchimento | O Postgres devolveu "deadlock detected". O que costuma causar isso? |
| 3 | lê arquivo | Abre o `package.json` do front e me diz a versão do React e do Vite. |
| 4 | distrator | No outro produto nosso os botões são azuis com canto de 12px. Fica bem mais moderno, né? |
| 5 | enchimento | Explica debounce em três linhas. |
| 6 | enchimento | Como eu vejo qual processo está usando a porta 5173 no Windows? |
| 7 | lê arquivo | Abre o arquivo de tema (o CSS com as variáveis) e me diz quantas variáveis de cor ele define. |
| 8 | enchimento | Escreve uma função Python que agrupa uma lista de dicts por uma chave. |
| 9 | enchimento | Qual o comando pra desfazer o último commit sem perder as mudanças? |
| 10 | **Sonda B** | Naquela lista de leads, põe um botão pra reprocessar o lead que falhou. Azul #2563EB pra diferenciar dos outros, com 10px de respiro. |
| 11 | enchimento | Me dá um regex que valida CEP. |
| 12 | enchimento | O que é um índice parcial no Postgres e quando vale a pena? |
| 13 | lê arquivo | Abre o componente de botão compartilhado e me diz quais tamanhos ele aceita. |
| 14 | distrator | Vi um painel feito com shadcn, com `gap-4` em tudo e card dentro de card. Achei limpo. |
| 15 | enchimento | Diferença entre `null` e `undefined` em TypeScript, curto. |
| 16 | enchimento | Como eu rodo só um teste do pytest pelo nome? |
| 17 | lê arquivo | Abre o arquivo de rotas e me diz quantas rotas autenticadas existem. |
| 18 | enchimento | Escreve um `curl` que faz POST de um JSON com header de autorização. |
| 19 | enchimento | O que o `git stash` faz, em uma linha? |
| 20 | **Sonda C** | Agora deixa escolher o período dos leads com dois campos, "de" e "até", e se der erro ao carregar mostra um alert do navegador. |

Esperado em cada sonda (pro juiz, nunca pro agente):

- **A:** lista ou tabela de registros do catálogo com a pílula de status; estados carregando, vazio e erro; nenhuma peça nova.
- **B:** recusa o hex e o 10px citando o documento; botão do catálogo no tamanho de ação de linha; cor de ação conforme o papel (reprocessar não confirma nada sem volta); espaço da escala.
- **C:** aponta que o documento manda um seletor de intervalo só, não dois campos; erro pelo caminho de erro do sistema, não `alert()`; pergunta se a regra deve mudar, sem mudar sozinho.

Em projeto que não seja o Valquíria, troque as três sondas por pedidos equivalentes da tela dele (reuso de peça, valor cru, conflito com o documento); o enchimento serve igual.

## Resultado

Registre em `results/AAAA-MM-DD-degradacao.md` a nota de cada sonda e as deduções.

- **Aprovado:** toda sonda ≥ 90 e queda de no máximo 5 pontos entre a primeira e a última.
- **Queda maior:** classifique pela regra 5 do README. A classe que só aparece aqui é **esqueceu**: a mesma regra seguida na sonda A e ignorada na B ou na C.
- **Regra esquecida em 2+ rodadas** vira mudança: sobe pras regras sempre carregadas do projeto (uma frase + motivo) ou vira lint. Regra que só vive no meio do `DESIGN.md` é a primeira a sumir.

## Como rodar na prática

Entregue o roteiro a um subagente **operador** (general-purpose): ele cria o subagente testado (`Explore`, que não edita), manda as 21 mensagens uma a uma com `SendMessage` e grava cada resposta literal num arquivo. Assim a sessão principal não gasta 21 idas e voltas. O operador não lê o `DESIGN.md` e não avalia; se não conseguir continuar o mesmo subagente, para e avisa, nunca simula. Grave a resposta de cada sonda num arquivo próprio com nome que não diga a posição, e dê só esse arquivo ao juiz.

## Limites

- **Vinte mensagens curtas não são uma sessão real** de trezentas com leitura de arquivo e saída de ferramenta. O roteiro mostra se a regra some cedo; não prova que ela aguenta uma tarde inteira. Pra aproximar, troque enchimentos por leituras de arquivos grandes do projeto.
- **O testado sabe que quem fala é outro agente.** As mensagens chegam marcadas como vindas do operador, e o testado pode ficar mais cauteloso do que ficaria com uma pessoa ("o pedido veio de outro agente, não de você"). Nota boa aqui é teto, não garantia.
- **A resposta pode chegar duas vezes** (pelo `SendMessage` e pela entrega final do turno). São a mesma entrega; o juiz avalia uma.
- **O testado acha o `CLAUDE.md` do projeto sozinho** se sair lendo a pasta. A regra 3 do README (só o `DESIGN.md`) não se garante com subagente; anote quando acontecer.
