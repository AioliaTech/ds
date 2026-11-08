---
name: ds
description: Use when building, changing or reviewing any screen, control, component or style in a frontend that has a DESIGN.md design system (or should have one) - new screen, new control, restyle, "segue o design system", visual drift, raw hex/px/ms in components, or a project with no DESIGN.md that needs one derived from its code.
---

# ds: operar um design system documentado

## Overview

Esta skill é o motor; o conteúdo mora no `DESIGN.md` do projeto. Ela não tem cor, fonte, componente nem estética própria. Trocar o `DESIGN.md` troca o visual que ela produz.

Ordem de verdade quando algo diverge: **código > DESIGN.md > esta skill**. Divergiu, corrige o documento (ou pergunta), nunca inventa um terceiro valor.

Contrato do documento: [references/contract.md](references/contract.md). Checklist de revisão: [references/checklist.md](references/checklist.md). Projeto sem documento: [references/bootstrap.md](references/bootstrap.md).

## Achar o documento

Suba a partir dos arquivos que vai tocar até achar `DESIGN.md` (monorepo: um por app, ex. `apps/frontend/DESIGN.md`). Leia o frontmatter e as seções **Catálogo**, **Blocos**, **Proibido** e **A decidir** antes de abrir qualquer componente. Fichas de componente (`DESIGN.components.md`, se existir) só a da peça que vai usar.

Não achou nenhum `DESIGN.md` → modo **bootstrap**, antes de qualquer tela.

## Modos

| Pedido | Modo |
|---|---|
| Tela, controle, estilo novo ou alterado | **construir** |
| "Revisa", "está no padrão?", PR de front, "ficou com cara de IA" | **revisar** |
| Peça nova que vai se repetir, ou decisão visual tomada na conversa | **documentar** (sempre dentro do construir) |
| Projeto sem `DESIGN.md` | **bootstrap** |

## Construir

1. **Pilha de blocos.** Escreva a tela como lista de blocos nomeados da seção Blocos: "Cabeçalho · Assunto ×3 · Tabela de registros · Paginação". Cada bloco aponta pra uma linha do Catálogo.
2. **Falta peça?** Se um bloco ou controle não está no Catálogo nem nos Blocos: pare antes de codar e diga em uma linha o que falta, a peça mais parecida que existe e o que você faria. Espere a resposta. A exceção é peça de uso único óbvio (um texto, um ícone); aí vai inline com os tokens.
3. **Valores só de token.** Cor, fonte, raio e espaço saem do frontmatter como `var(--token)`; número de layout só da escala `spacing`. Valor que está em **A decidir**: pergunte, não escolha.
4. **Estados vêm junto.** Cada bloco entrega os estados listados na coluna "Estados" da seção Blocos. Sem lista, os seis de [checklist.md](references/checklist.md#estados).
5. **Texto de estado é o estado real.** Rótulo, pílula e botão refletem o dado depois da ação (aprovado não diz "aguardando").
6. **Lint.** `node <skill-dir>/scripts/ds-lint.mjs <arquivos tocados>`. Erro se corrige; aviso se corrige ou se justifica em uma linha na resposta.
7. **Checklist** de [references/checklist.md](references/checklist.md) nos arquivos tocados.
8. **Documentar** se criou peça que vai se repetir ou tomou decisão nova (abaixo).
9. Se o detector do impeccable estiver instalado, os achados dele chegam sozinhos depois de cada edição: trate cada um como erro real, falso positivo com evidência, ou dúvida pra perguntar. Não ignore em silêncio.

## Revisar

Rode o lint e o checklist nos arquivos indicados e devolva uma tabela: `arquivo:linha · regra · o que fazer`, erros primeiro. Dois passos a mais que o lint não vê: cada bloco tem seus estados; cada texto de estado bate com o dado.

## Documentar

Na mesma entrega, no `DESIGN.md`:
- Peça nova reutilizável → linha no Catálogo (`Preciso de | Use`) e, se tiver variantes ou estados, ficha em `DESIGN.components.md` pelo [template](templates/ficha.md).
- Bloco novo → linha em Blocos (onde está definido, do que é feito, estados).
- Decisão nova de regra → uma frase + o motivo, nas regras sempre carregadas do projeto (seu `CLAUDE.md`) ou na seção Proibido.
- Dúvida que ficou aberta → linha em A decidir.

Documente só o que existe no código. Variante descrita e não construída vira pedido fantasma nas próximas telas.

## Bootstrap

Siga [references/bootstrap.md](references/bootstrap.md): tokens do arquivo de tema real, catálogo dos componentes exportados, blocos do que se repete, nenhuma proibição sem evidência no código ou palavra do usuário.

## Red flags: pare e volte ao passo

| Pensamento | Realidade |
|---|---|
| "É um ajuste pequeno, não preciso abrir o DESIGN.md" | Ajuste pequeno é onde o 13.5px entra. Frontmatter e Catálogo custam 30 segundos. |
| "O hex está na paleta, então posso escrever direto" | Hex em componente quebra tema e busca. Só `var(--token)`. |
| "Faço inline só dessa vez e depois viro componente" | "Depois" não existe. Peça repetida vira Catálogo nesta entrega ou vira pergunta. |
| "O catálogo não tem, então crio do meu jeito" | Não tem = parar e perguntar. É a decisão do dono do produto. |
| "Documento quando a feature fechar" | Documento na mesma entrega ou o próximo agente reconstrói do zero. |
| "O valor não decidido, escolho um razoável" | Palpite razoável vira produto. A decidir = perguntar. |

## Com as outras skills

Projeto com `DESIGN.md` não invoca skill de direção visual (frontend-design, ui-ux-pro-max, antiwebslop e afins): elas propõem outra estética. O detector do impeccable, quando instalado, roda por hook e complementa o lint; exceções dele vão por `impeccable hooks ignore-value`, com a seção do `DESIGN.md` na razão.
