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
- Nada de `transition: all` nem `will-change: all`: anime só a propriedade que muda. `will-change` só enquanto anima: animação que para não deixa `will-change` (a camada fica reservada na GPU sem uso).
- Animação sem fim só em sinal único que pede ação (um "ao vivo", um "salvar pendente") ou enquanto carrega; enfeite roda e para. Nunca uma por item de lista: um pulso por linha com 40 linhas são 40 animações redesenhando a tela sem parar. Confira com "Peso da tela", abaixo.
- Desfoque de fundo (`backdrop-filter`): o elemento desfocado vira a raiz do fundo dos filhos, e popover, calendário ou menu aberto dentro dele não desfoca nada. Desfoque em caixa que abre janela dentro vai numa camada atrás (`::before` com `z-index: -1`, a caixa com `position: relative; isolation: isolate`). Aí opacidade, `clip-path`, máscara ou `filter` na própria caixa desligam o desfoque da camada: anime com movimento (transform) e, no carregando, apague os filhos, não a caixa.
- Título com `text-wrap: balance`, parágrafo com `text-wrap: pretty` quando o sistema não tiver outra regra.
- Área de clique no mínimo a altura de controle do `DESIGN.md`; ícone pequeno ganha padding, não fica menor que isso.
- Desabilitado não reage ao mouse; se precisa parecer vivo, fica habilitado e explica no clique o que falta. `disabled` corta o clique, não o hover: regra `:hover` em classe de botão leva `:where(:not(:disabled))` (não soma especificidade) e o cursor volta pra seta. Confira com o script de "No navegador", abaixo.
- Lista que pode passar de uns 100 itens (ou de umas 50 linhas de card) não desenha tudo de uma vez: desenha um lote e cresce ao rolar, ou pagina. Mil linhas na tela travam a página a cada atualização dos dados. Mudou filtro, busca ou ordem: volta ao lote no mesmo render (num efeito depois, a lista inteira ainda desenha uma vez) e a rolagem volta ao topo (parada no fim, o observador do fim dispara em cascata e desenha tudo de novo).
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

## No navegador

O lint lê o código; isto lê a tela. Rode no console em cada tela tocada que tenha controle desabilitado (bloco desligado por um liga/desliga, salvar sem alteração, ponta de paginação). Tem que dar `cursor: 0` e `hover: 0`.

```js
const H=[],W=rs=>{for(const x of rs){if(x.cssRules&&x.cssRules.length)W(x.cssRules);if(!x.selectorText||!x.selectorText.includes(':hover')||![...x.style].some(p=>p!=='cursor'))continue;const S=x.selectorText.split(/,(?![^()]*\))/).map(s=>s.trim()),L=s=>s.split(/\s+(?![^()]*\))/).pop().includes(':hover'),B=S.filter(s=>!L(s));S.filter(L).forEach(s=>H.push([s.replace(/:hover/g,''),B]))}};for(const s of document.styleSheets){try{W(s.cssRules)}catch{}}
const m=(e,s)=>{try{return e.matches(s)}catch{return false}},D=[...document.querySelectorAll('button:disabled,input:disabled,select:disabled,textarea:disabled,[aria-disabled="true"]')].filter(e=>e.getClientRects().length);
({cursor:D.filter(e=>['pointer','grab'].includes(getComputedStyle(e).cursor)).length,hover:D.filter(e=>getComputedStyle(e).pointerEvents!=='none'&&H.some(([t,B])=>m(e,t)&&!B.some(b=>m(e,b)))).length})
```

**Peso da tela.** Com a tela parada (sem carregar nada), rode em cada tela tocada. `semFim` lista as animações que nunca param, por nome: tem que sobrar só o que o `DESIGN.md` permite (um "ao vivo", sinais que pedem ação). Nome repetido N vezes é animação por item de lista. `elementos` na casa das dezenas de milhares é lista desenhada inteira.

```js
const a=document.getAnimations().filter(x=>x.playState==='running'&&x.effect?.getTiming().iterations===Infinity),c={};a.forEach(x=>c[x.animationName]=(c[x.animationName]||0)+1);({semFim:c,elementos:document.querySelectorAll('*').length})
```

`cursor` conta controle desabilitado com mãozinha. `hover` conta controle desabilitado que casa com uma regra `:hover` que mudaria a pintura dele (regra cujo mesmo bloco já vale sem o hover não conta). Ideia dos audits de desabilitado do Astryx; se o `DESIGN.md` do projeto tiver a própria conferência no navegador, este script entra nela.
