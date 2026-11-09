# ds

Skill de Claude Code que faz o agente **operar um design system documentado**: ele le o `DESIGN.md` do projeto antes de qualquer tela, monta a tela como pilha de blocos do catalogo, para e pergunta quando falta peca, usa so tokens, roda um lint parametrizado pelo proprio documento e registra peca nova na mesma entrega.

A skill e o motor; o conteudo mora no `DESIGN.md` de cada projeto. Ela nao tem cor, fonte nem componente proprio: trocar o `DESIGN.md` troca o visual que ela produz.

## Instalar

No Claude Code:

```
/plugin marketplace add AioliaTech/ds
/plugin install ds@ds
```

Ou, sem plugin, copie a pasta `skills/ds` para `~/.claude/skills/ds` (vale para todos os projetos) ou para `.claude/skills/ds` dentro do repo (vale so ali).

## Usar

- Projeto que ja tem `DESIGN.md` no contrato (ver `skills/ds/references/contract.md`): peca uma tela ou um controle; a skill entra sozinha em qualquer trabalho de front. No `CLAUDE.md` do app, uma linha basta: "Qualquer tela, controle ou estilo: invocar a skill `ds` antes de codar."
- Projeto sem `DESIGN.md`: a skill roda o modo bootstrap e deriva o documento do codigo real (tokens, componentes exportados, padroes repetidos), sem inventar.
- Ferramentas (o caminho da skill vem no cabecalho quando ela e invocada; instalada como plugin fica em `~/.claude/plugins/cache/ds/ds/<versao>/skills/ds`):

```
node <skill>/scripts/ds-lint.mjs --init                    # grava o bloco da skill no CLAUDE.md da app (idempotente)
node <skill>/scripts/ds-lint.mjs --doctor                  # saude: documento, tokens, catalogo, blocos, fichas, CLAUDE.md
node <skill>/scripts/ds-lint.mjs --catalog [--json]        # catalogo, blocos, receitas e fichas em texto denso
node <skill>/scripts/ds-lint.mjs --search <termo> [--json] # "tenho peca pra X?"
node <skill>/scripts/ds-lint.mjs <arquivos ou pastas>      # lint do codigo contra o DESIGN.md
node <skill>/scripts/ds-lint.mjs --design DESIGN.md        # confere so o documento
node <skill>/scripts/ds-lint.mjs --self-test
```

- Testar a skill (toda mudanca em SKILL.md, contrato ou lint): `tests/README.md`. Prompts fixos que descrevem a experiencia e nao a solucao, subagente so com o DESIGN.md como referencia, juiz separado com rubrica por deducao.

## O que tem dentro

| Caminho | Papel |
|---|---|
| `skills/ds/SKILL.md` | Os modos (construir, revisar, documentar, bootstrap) e as regras de quando parar |
| `skills/ds/references/contract.md` | O que um `DESIGN.md` precisa ter: frontmatter de tokens + chave `lint`, secoes Catalogo, Blocos, Proibido, A decidir |
| `skills/ds/references/checklist.md` | Seis estados de conteudo, acabamento, acessibilidade de formulario e modal, texto |
| `skills/ds/references/bootstrap.md` | Como criar o `DESIGN.md` a partir do codigo, so com evidencia |
| `skills/ds/templates/` | Esqueleto de `DESIGN.md` e de ficha de componente |
| `skills/ds/scripts/ds-lint.mjs` | Lint em Node, zero dependencias: hex/fonte/raio/espaco/duracao crus, backdrop-filter fora do lugar, caminhos do catalogo, proibicoes em regex |

## Origem

Nasceu em 2026-11 no front do Valquiria (AioliaTech), a partir das cinco camadas descritas por rico (@_heyrico) em "Build the design system and skills your agent can follow": primitivos, tokens semanticos, componentes, blocos, regras e skills.
