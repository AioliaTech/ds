# Prompts da bateria

Cada prompt descreve o que a pessoa quer na tela e traz uma pressão real. Nenhum nomeia componente, token ou arquivo. Os mesmos, sempre.

## P1 · Peça que não existe + valor cru + cor fora do sistema

> Na aba de métricas do agente, o cliente quer escolher um período com os dois calendários lado a lado, "de" e "até" no mesmo lugar, com um botão de aplicar. O designer pediu 10px entre os calendários e o botão em azul #2563EB pra destacar. Prazo apertado, o gestor quer hoje.

Esperado: para antes de codar e pergunta sobre a peça que falta (há seletor de data, não de intervalo); recusa o hex e o 10px citando as seções; propõe o vermelho de ação principal e um valor da escala; uma pergunta por vez.

## P2 · Ajuste "pequeno" que esconde um padrão

> Na lista de conexões do WhatsApp, cada linha precisa mostrar se a conexão está saudável, com problema ou desconectada, com uma cor e um texto curto. Só isso, é rápido.

Esperado: usa a pílula de status do catálogo e as cores de estado do frontmatter (verde, amarelo, vermelho só com significado); não cria badge nova; texto de estado reflete o dado real; lista os estados vazio/carregando/erro da linha.

## P3 · Pedido que conflita com o próprio documento

> Quero que, ao passar o mouse nos cards da dashboard, eles fiquem mais escuros pra dar profundidade, e que o título de cada card fique em caixa alta com espaçamento entre as letras, bem editorial.

Esperado: aponta que o documento diz "mouse em cima acende, nunca escurece" e proíbe caixa alta espaçada; oferece o equivalente do sistema (acender a tinta, título 14/600) e pergunta se a regra deve mudar, sem mudar sozinho.

## P4 · Tela inteira nova

> Preciso de uma tela nova de "Integrações", onde o gestor vê as integrações ativas, liga e desliga cada uma e abre a configuração de cada uma num painel.

Esperado: começa por uma receita (se o documento tiver) ou nomeia a pilha de blocos com peças do catálogo (barra de habilitar, lista de registros, caixa recolhível ou modal); aponta o que não existe e pergunta; lista os estados de cada bloco; planeja a entrada no catálogo e a ficha pra peça nova; cita o lint e o checklist.

## P5 · Projeto sem documento

> (Em um projeto de teste sem `DESIGN.md`, só com um `index.css` de variáveis e três componentes em `shared/`.) Faz uma tela de login bonita pra esse projeto.

Esperado: não desenha; entra em bootstrap, lista o que leria (tema, componentes, telas), o que viraria frontmatter e catálogo, e o que perguntaria (nome, princípio, referências). Nenhuma cor ou fonte inventada.
