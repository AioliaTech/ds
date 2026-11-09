# Testar a skill

A instrução que o agente ignora não é instrução. Toda mudança no `SKILL.md`, no contrato ou no lint passa por aqui antes do commit. Método emprestado dos vibe tests do Astryx (Meta), reduzido ao que cabe num repo pequeno.

## Regras

1. **Os prompts descrevem a experiência, nunca a solução.** "Tela onde o usuário expande cada pergunta", não "accordion". Se o prompt nomeia a peça, o teste mede obediência, não julgamento.
2. **Mesmos prompts, sempre.** Os de [prompts.md](prompts.md). Mudou um prompt, é outro teste; não compare com rodadas anteriores.
3. **O agente testado só tem o `DESIGN.md`.** O subagente recebe o documento (e `DESIGN.components.md`) como única referência, sem `CLAUDE.md`, sem histórico da conversa. Senão o teste mede memória, não a skill.
4. **Quem gera não avalia.** Um segundo subagente, com [judge.md](judge.md) e a [rubrica](rubric.md), dá a nota. Autoavaliação esconde a diferença entre as rodadas.
5. **Uma falha não muda o prompt.** Antes de mexer na skill, classifique a falha: *não procurou* (não leu o catálogo), *procurou e ignorou*, *procurou a coisa errada*, *a saída do lint confundiu*, *preguiça*. Só padrão que se repete em 2+ rodadas vira mudança; e a mudança se reproduz contra a falha antes de ir pro commit.

## Como rodar

Sem automação; são dois subagentes por prompt, no Claude Code.

1. Para cada prompt de `prompts.md`, abra um subagente (Explore ou general-purpose, sem Edit/Write) com:
   - a skill `ds` carregada (o SKILL.md e as references);
   - o `DESIGN.md` e o `DESIGN.components.md` do projeto de teste (o do Valquíria serve: `apps/frontend/`);
   - a instrução: "Você não conhece este sistema. O DESIGN.md é sua ÚNICA referência. Planeje (não edite): leituras na ordem, tela como pilha de blocos, plano, perguntas que faria antes de codar, comandos de verificação."
2. Para cada resposta, abra um segundo subagente com `judge.md` preenchido (prompt + resposta + rubrica) e peça a nota e as deduções, cada uma citando a linha da resposta.
3. Registre em `results/AAAA-MM-DD.md`: prompt, nota, deduções, classe da falha (regra 5). Aprovado = todos os prompts ≥ 90.

Duas rodadas por prompt bastam pra ver se uma falha é padrão. Três subagentes em paralelo por prompt, como o Astryx faz, só quando a mudança na skill for grande.

## Condições

Quando quiser medir o efeito da skill e não só a conformidade: rode a mesma bateria em duas condições, **com** a skill e **sem** (só o `DESIGN.md`). O juiz vê as duas sem saber qual é qual. Se a nota não separa, a skill não está fazendo nada que o documento sozinho não faça.
