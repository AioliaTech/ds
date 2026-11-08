# Checklist de revisão

O lint pega valor cru e proibição mecânica. Isto é o que ele não vê. Rode nos arquivos tocados; o que falhar vira correção ou uma linha de justificativa na resposta.

## Estados

Todo bloco que mostra dado tem resposta pra cada linha. O `DESIGN.md` (seção Blocos) pode estreitar; na falta, vale a tabela.

| Estado | O que a tela mostra |
|---|---|
| Carregando | Esqueleto ou indicador no lugar do bloco, nunca a tela pulando quando chega o dado |
| Vazio | Frase do que apareceria aqui e, se houver, a ação pra criar o primeiro |
| Erro | Pelo caminho de erro do sistema (ex. balão); o bloco fica no estado vazio, sem repetir o aviso a cada tentativa |
| Parcial | Lista cortada ou filtrada diz quantos de quantos |
| Sucesso | Confirmação onde a ação aconteceu; o dado novo já aparece |
| Sem permissão | Explica o que falta, sem controle falso |

E a regra do texto: rótulo, pílula e botão dizem o estado **depois** da ação (aprovado não fica "aguardando aprovação").

## Acabamento

- Raio concêntrico: raio interno = raio externo − padding. Mesmo raio dentro e fora parece torto.
- Número que muda (contagem, tempo, dinheiro) em algarismos tabulares.
- Nada de `transition: all` nem `will-change: all`: anime só a propriedade que muda.
- Título com `text-wrap: balance`, parágrafo com `text-wrap: pretty` quando o sistema não tiver outra regra.
- Área de clique no mínimo a altura de controle do `DESIGN.md`; ícone pequeno ganha padding, não fica menor que isso.
- Desabilitado não reage ao mouse; se precisa parecer vivo, fica habilitado e explica no clique o que falta.
- Foco visível em tudo que recebe teclado.
- Movimento respeita `prefers-reduced-motion` e o desligador do sistema, se houver.

## Acessibilidade de formulário e modal

- Rótulo com `htmlFor` apontando pro `id` do campo.
- Erro de campo ligado por `aria-describedby`, e anunciado (`role="alert"` ou `aria-live`).
- Liga/desliga é `button role="switch" aria-checked`, não um `div` com clique.
- Botão só com ícone tem `aria-label` com o verbo.
- `div`/`span` clicável vira `button` (ou recebe `role`, `tabIndex` e tecla).
- Modal: foco entra ao abrir, `Esc` fecha, foco volta pra quem abriu, fundo não recebe tab.
- Dica rica (tooltip) abre também no foco, não só no mouse.

## Texto

- Botão diz a ação ("Adicionar janela"), não "OK".
- Erro diz o que fazer, numa frase.
- Desligado explica a consequência.
- Recurso não pronto: "Em breve" + uma frase; nada de controle que não funciona.
