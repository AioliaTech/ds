# Contrato do DESIGN.md

Um `DESIGN.md` por app. Frontmatter YAML (o que a máquina lê) + seções em prosa (o que o agente lê). A ordem e o idioma das seções são livres; as obrigatórias são reconhecidas pela palavra no título.

## Frontmatter

Compatível com o formato Google Stitch (que o impeccable e o `@google/design.md` leem). O lint desta skill lê o mesmo bloco mais a chave `lint`.

```yaml
---
name: Nome do produto
description: uma frase sobre o visual
colors:              # nome semântico -> valor; vira a paleta permitida
  surface-app: "#18181A"
  ink: "#EDEDEF"
  brand: "#D93A36"
typography:          # papel -> fontFamily / fontSize / lineHeight
  ui: { fontFamily: "Inter, sans-serif", fontSize: "13px" }
  mono: { fontFamily: "DM Mono, monospace" }
  text-xs: { fontSize: "12px" }
spacing: ["4px", "8px", "12px", "16px", "24px", "32px", "48px"]   # lista ou mapa
rounded: { sm: "4px", md: "6px", lg: "8px", pill: "99px" }
lint:
  tokens_files: ["src/index.css"]      # onde valor cru é permitido (define os tokens)
  allow_hex: ["#fff", "#ffffff"]       # exceções de cor crua em componente
  durations: [150, 200, 260]           # ms permitidos fora dos tokens_files; vazio = não checar
  glass_only_in: ["src/index.css"]     # backdrop-filter só nestes arquivos
  ignore_files: ["src/components/shared/Icons.tsx"]   # fora do lint (logos de terceiros etc.)
  banned:                              # regex (JS) -> mensagem; a proibição da seção Proibido em forma de máquina
    - pattern: '\btitle='
      message: "title nativo: use data-tip (§10)"
    - pattern: '\b(alert|confirm)\('
      message: "diálogo do navegador: use toastError / askConfirm (§10)"
---
```

Regras do frontmatter:
- Toda cor usada em componente existe em `colors` e é referenciada por `var(--<nome>)`; o nome da chave é o nome da variável CSS.
- `spacing` é a única fonte de número de layout (margin, padding, gap). Alturas fixas de controle ficam na prosa.
- O que não está decidido não entra no frontmatter; entra em **A decidir**.

## Seções obrigatórias

| Seção (palavra no título) | O que tem | Forma |
|---|---|---|
| **Catálogo** | "Reaproveitar antes de criar": o que existe e onde | Tabela `Preciso de \| Use`, com o caminho do arquivo em crase, relativo a `src/components/` ou `src/` (ex. `` `shared/TabBar.tsx` ``, `` `lib/` ``). O lint confere que cada caminho existe. |
| **Blocos** | Seções de tela feitas de componentes, que se repetem | Tabela `Bloco \| Definido em \| Feito de \| Estados`. "Estados" lista o que o bloco mostra carregando, vazio, com erro etc. "—" = ainda não definido. |
| **Proibido** | O que nunca entra | Lista, cada item **em par**: a forma proibida e o substituto exato ("hex solto em componente → `var(--token)`"; "`title` nativo → `data-tip`"). Proibição sem substituto faz o agente inventar o terceiro caminho. O que der pra pegar por regex vai também em `lint.banned`. |
| **A decidir** | Valores e padrões ainda em aberto | Lista. Valor aqui = o agente pergunta antes de usar. |

Seções recomendadas:
- **Receitas** (tabela `Receita \| Pilha de blocos \| Exemplo no código`): as telas típicas do produto (aba de formulário, tela de lista, modal grande) como sequência de blocos. Tela nova começa por uma receita, não do zero. O `--catalog` lê a tabela.
- **Árvore de superfície**, dentro de Cor: a escolha de fundo pelo que o elemento **é**, não pelo tom que parece bom ("é hover de linha? → `surface-hover`; é contêiner com conteúdo dentro? → `surface-panel`; é janela por cima de texto? → `surface-card`"). Quatro perguntas acabam com a escolha de cinza no olho.
- Prosa livre: Princípio, Cor, Tipografia, Espaço e forma, Layout, Estados e movimento, Padrões de formulário, Modais, Texto.

## O que entra no documento

- **Teste de cada frase: alguém age sobre ela?** O documento guarda o que se usa (token, peça, bloco, regra). O que se confere depois de pronto (checklist de estados, acabamento, acessibilidade) fica na skill, não no documento. Uma tabela de "coisas pra verificar" no `DESIGN.md` é sinal de que virou relatório.
- **Teste dos seis meses:** "daqui a seis meses, com todo PR citado fechado e esquecido, esta frase ainda diz algo verdadeiro sobre o sistema?" Frase que passa descreve um comportamento, um limite, um padrão, um dono ou uma evidência. "Decidimos", "propomos", link de PR: isso é história, vai pra Pendências ou A decidir (o lint avisa: `doc-narration`).
- **Só o que existe.** Variante descrita e não construída vira pedido fantasma. Estado "—" é melhor que estado inventado.

## Regras sempre carregadas

Regra = **uma frase + o motivo**. O motivo é o que faz o agente acertar o caso que a regra não previu. Elas ficam no arquivo que o agente lê em todo turno (`CLAUDE.md` da app), não no `DESIGN.md`, e apontam pra seção do `DESIGN.md` que detalha. Alvo: 40 a 60 linhas. O `DESIGN.md` inteiro só entra no contexto quando esta skill é invocada.

Como nasce uma regra: o agente erra, você anota o que ele fez, o que queria e por quê. Isso é a regra.

## Fichas de componente (opcional)

`DESIGN.components.md` ao lado do `DESIGN.md`, uma ficha por componente do Catálogo que tem variantes ou estados, pelo [template](../templates/ficha.md). Carregada só quando a peça vai ser usada. Só o que existe no código.

## Ferramentas

| Comando | Faz |
|---|---|
| `node <skill-dir>/scripts/ds-lint.mjs --design <app>/DESIGN.md` | confere frontmatter, seções, caminhos do Catálogo e narração |
| `… --doctor` | saúde do projeto: documento, tokens_files, catálogo, blocos, receitas, fichas, bloco da skill no `CLAUDE.md` |
| `… --init` | grava (ou atualiza) o bloco da skill entre `<!-- ds:start -->` e `<!-- ds:end -->` no `CLAUDE.md` da app |
| `… --catalog [--json]` | catálogo, blocos, receitas e fichas em texto denso |
| `… --search <termo> [--json]` | procura em catálogo, blocos, receitas e fichas; sem resultado = parar e perguntar |
| `… <arquivos>` | lint do código contra o documento |
