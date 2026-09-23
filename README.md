# Caderneta — renda fixa, ETFs e bitcoin

Três calculadoras que respondem à mesma pergunta por caminhos diferentes: quanto isso
realmente rende, depois de tudo.

**No ar:** https://joao-vi.github.io/caderneta/

## Renda fixa

Compara CDB, LCI/LCA e Tesouro pelo líquido de verdade, depois do IR e do IOF.

- **Fichas comparáveis** — % do CDI ou prefixado, com aportes mensais opcionais.
- **IR lote a lote** — cada aporte tem seu próprio relógio na tabela regressiva, então
  uma ficha com aportes tem alíquota *efetiva*, não uma faixa da tabela.
- **IOF regressivo** para resgates com menos de 30 dias, sobre o rendimento e antes do IR.
- **Rolagem** — reinveste o total a cada vencimento. Num isento não custa nada; num
  tributado prende a alíquota na faixa do ciclo curto e ela nunca desce.
- **Rentabilidade anual por TIR**, para que fichas com e sem aporte sejam comparáveis.
- **"Vale a troca?"** — simula tirar uma fatia de um investimento e colocar numa oferta
  curta com teto, considerando que no vencimento o dinheiro volta.

## ETFs

Quem aportou todo mês em IVVB11 ou NASD11, quanto teria hoje — sobre as cotações reais,
com o CDI recebendo o mesmo dinheiro nas mesmas datas como régua.

- **Regularidade variável** — simula quem pula meses e aporta menos do que planejou,
  com sorteio determinístico: o mesmo cenário sai igual toda vez.
- **Fase de retiradas** — a regra dos 4% ou um valor fixo, corrigido pelo IPCA a cada
  aniversário, para testar se o dinheiro dura.

## Bitcoin

Um mesmo orçamento mensal, dividido em aportes mensais, semanais ou diários sobre a
cotação real em dólar. A ferramenta existe para comparar frequências, e a resposta
honesta é que **a frequência quase não muda nada** — a tela foi desenhada para dizer
isso, não para esconder.

- **Orçamento normalizado** — o valor de cada aporte é o orçamento dividido pelos
  aportes que cabem no período, para que as três frequências gastem o mesmo dinheiro.
  Sem isso a comparação seria entre quantias, não entre frequências.
- **Faixa de ruído** — todas as 39 maneiras de aportar o mesmo orçamento (os 31 dias do
  mês, os 7 da semana e o diário) desenhadas juntas. No histórico real, a melhor pagou
  ~4,7% menos que a pior, e a escolha entre mensal, semanal e diário responde por ~0,4%
  disso: o dia arbitrário do mês pesa dez vezes mais que a frequência, e os dois são
  ruído.
- **Preço médio pago** contra a média do mercado no período. Comprar sempre o mesmo
  valor faz o preço médio ser a média harmônica dos preços, que é sempre menor ou igual
  à aritmética — o único ganho do método que vale como teorema, e não como palpite.
- **Sem CDI ao lado, de propósito** — ele é em reais, e a comparação misturaria o efeito
  do câmbio com o do ativo.

As fichas ficam no `localStorage` do navegador. O histórico de cotações é gerado no
build e servido junto com a página: o navegador não fala com nenhuma fonte externa.

## Estrutura

```
src/
  domain/       regras de negócio, puras — sem React e sem DOM
    tributacao.js   tabela regressiva de IR e IOF
    apuracao.js     lotes, ciclos de rolagem, TIR
    series.js       séries dos gráficos de renda fixa
    troca.js        simulação "vale a troca?"
    ficha.js        criação e sanitização de fichas de renda fixa
    calendario.js   quando os aportes acontecem (mensal, semanal, diário)
    aporteEtf.js    aporte mensal em ETF, CDI como régua, fase de retiradas
    aporteBtc.js    aporte recorrente em bitcoin e a faixa de ruído
    fichaBtc.js     criação e sanitização das fichas de bitcoin
    tir.js          TIR anual de fluxos datados
    armazenamento.js  localStorage
  paginas/      uma por aba: RendaFixa, Etfs, Bitcoin
  components/   React + Tailwind
  hooks/        estado das fichas e carregamento dos dados
scripts/
  atualizar-dados.mjs   baixa cotações, CDI e IPCA e grava public/dados/
```

Todo o cálculo vive em `src/domain`. Os componentes não fazem conta: leem o domínio e
desenham. É o que permite testar a matemática sem montar nada.

`calendario.js` é o ponto de extensão das frequências: ETF e bitcoin pedem as datas de
aporte ao mesmo lugar, cada um com a sua regra.

## Dados

`npm run dados` baixa e grava em `public/dados/`:

| Arquivo | Fonte |
|---|---|
| `IVVB11.json`, `NASD11.json` | Yahoo Finance — fechamento ajustado, em BRL |
| `BTC-USD.json` | Yahoo Finance — fechamento diário, em USD, desde set/2014 |
| `cdi.json` | Banco Central — SGS série 12 (CDI, % a.d.) |
| `ipca.json` | Banco Central — SGS série 433 (IPCA, % a.m.) |

O site é estático e roda só no navegador, e o Yahoo não aceita chamadas de outra origem,
então os dados são buscados no build. O deploy roda num cron diário — todo dia, e não só
nos úteis, porque o bitcoin negocia no fim de semana e a B3 não. Se alguma fonte falhar,
o deploy segue com os arquivos já versionados.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm test         # 258 testes
npm run dados    # atualiza as cotações
npm run build    # build de produção em dist/
```

Os testes cobrem o domínio contra fórmulas fechadas independentes e a aplicação ponta a
ponta com Testing Library.

## Aviso

Ferramenta educacional de simulação, não é recomendação de investimento. Confira sempre
as condições reais junto à instituição financeira e a alíquota vigente na Receita Federal.
