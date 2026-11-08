---
name: <Produto>
description: <uma frase: tipo de produto e caráter visual>
colors:
  surface-app: "#"
  surface-panel: "#"
  ink: "#"
  ink-muted: "#"
  brand: "#"
  ok: "#"
  warn: "#"
  danger: "#"
typography:
  ui: { fontFamily: "<família>, sans-serif", fontSize: "<px>", lineHeight: 1.5 }
  mono: { fontFamily: "<família>, monospace" }
  text-xs: { fontSize: "12px" }
  text-sm: { fontSize: "13px" }
  text-md: { fontSize: "14px" }
spacing: ["4px", "8px", "12px", "16px", "24px", "32px", "48px"]
rounded: { sm: "4px", md: "6px", lg: "8px", pill: "99px" }
lint:
  tokens_files: ["<caminho do arquivo de tema>"]
  allow_hex: []
  durations: []
  glass_only_in: []
  ignore_files: []
  banned: []
---

# Design System: <Produto>

Tokens e classes vivem em `<arquivo de tema>`. Este documento descreve o que **está no código**; se o código mudar, este arquivo muda junto. Regras sempre carregadas (uma frase + motivo) ficam no `CLAUDE.md` desta app.

## 1. Princípio

<Uma frase do que o produto deve parecer e de onde vem a hierarquia (brilho, peso, respiro, cor).>

## 2. Cor

<Papel de cada superfície, de cada brilho de texto, quando a cor de marca aparece, o que verde/amarelo/vermelho significam.>

## 3. Tipografia

<Famílias, escala, pesos, o que vai em mono.>

## 4. Espaço e forma

<Escala de espaço, ritmo vertical, raios, alturas fixas de controle.>

## 5. Estados e movimento

<Hover, foco, desabilitado, carregando; durações e easings; reduced motion.>

## 6. Padrões de formulário e modal

<Como um assunto/seção é estruturado, campo, rótulo, dica, erro, confirmação.>

## 7. Catálogo: reaproveitar antes de criar

| Preciso de | Use |
|---|---|
| Abas | `<caminho>` |
| Modal | `<caminho>` |
| Confirmar uma ação | `<caminho>` |
| Erro pro usuário | `<caminho>` |

## 8. Blocos

| Bloco | Definido em | Feito de | Estados |
|---|---|---|---|
| <nome> | <seção ou arquivo> | <componentes do catálogo> | carregando: … · vazio: … · erro: … |

## 9. Texto

<Voz, botão diz a ação, erro diz o que fazer, desligado explica a consequência.>

## 10. Proibido

- <uma linha, com o motivo quando não for óbvio>

## 11. A decidir

- <valor ou padrão em aberto; o agente pergunta antes de usar>

## 12. Pendências

- <o que o código ainda não cumpre do documento, com data>
