# Bootstrap: criar o DESIGN.md a partir do código

Princípio: **evidência, não gosto**. Nenhuma linha do documento sem um arquivo que a prove ou uma palavra do usuário. O documento descreve o que o produto é hoje; o que falta vira **A decidir**, não regra.

## Ordem de leitura

1. Arquivo de tema: `:root`, `@theme`, `theme.ts`, `tailwind.config`. Dali saem `colors`, `typography`, `spacing`, `rounded` do frontmatter. Nome da variável = nome da chave.
2. Pasta de componentes compartilhados (`shared/`, `ui/`, `common/`): cada export vira linha do Catálogo. Só o que é exportado e importado por pelo menos uma tela.
3. Três telas representativas (lista, formulário, detalhe). O que aparece em 2+ delas montado das mesmas peças vira Blocos.
4. Padrão repetido 3+ vezes sem componente (mesmo bloco de estilo inline, mesma composição) vira **A decidir**: "promover a componente?".
5. Proibições: só as que o código já aplica (um `eslint` rule, um comentário "nunca X", um helper que substitui o nativo) ou que o usuário disser na conversa.

## O que perguntar ao usuário

Só o qualitativo que o código não contém: nome do produto, uma frase de princípio, referências visuais (com link), e as decisões em aberto da lista A decidir que travam a primeira tela. Não perguntar valor que já está no tema.

## Escrever

Use [templates/DESIGN.template.md](../templates/DESIGN.template.md). Preencha a chave `lint` com o arquivo de tema em `tokens_files` e o que couber em `banned`. Depois:

```
node <skill-dir>/scripts/ds-lint.mjs --design <app>/DESIGN.md        # confere o documento
node <skill-dir>/scripts/ds-lint.mjs <3 telas representativas>        # mede a distância do código ao documento
```

Os achados do segundo comando são a seção de **Pendências** do documento (o que o código ainda não cumpre), não motivo pra afrouxar o documento.

## Atualizar um DESIGN.md que já existe

Nunca reescrever. Ler o documento, conferir contra o tema e os componentes, e mudar só o que divergiu, dizendo o que mudou. Decisão registrada no documento vence a observação do código quando o código está em migração declarada (seção Pendências).
