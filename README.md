# Caderneta — comparador de CDB e renda fixa

Compara CDB, LCI/LCA e Tesouro pelo líquido de verdade, depois do IR e do IOF.

**No ar:** https://joao-vi.github.io/caderneta/

## O que ela faz

- **Fichas comparáveis** — % do CDI ou prefixado, com aportes mensais opcionais.
- **IR lote a lote** — cada aporte tem seu próprio relógio na tabela regressiva, então
  uma ficha com aportes tem alíquota *efetiva*, não uma faixa da tabela.
- **IOF regressivo** para resgates com menos de 30 dias, sobre o rendimento e antes do IR.
- **Rolagem** — reinveste o total a cada vencimento. Num isento não custa nada; num
  tributado prende a alíquota na faixa do ciclo curto e ela nunca desce.
- **Rentabilidade anual por TIR**, para que fichas com e sem aporte sejam comparáveis.
- **Projeção** em duas abas: evolução do valor e juros gerados mês a mês, estes com
  alternância entre bruto e líquido.
- **"Vale a troca?"** — simula tirar uma fatia de um investimento e colocar numa oferta
  curta com teto, considerando que no vencimento o dinheiro volta.
- **Aporte mensal em ETF** — quanto teria hoje quem investisse um valor fixo no primeiro
  pregão de cada mês em IVVB11 e/ou NASD11, com as cotações reais, comparado ao mesmo
  dinheiro no CDI. Bruto, com rentabilidade anual pela TIR. Aceita regularidade variável
  (meses pulados e aportes parciais, sorteados de forma reproduzível) e uma data de parada,
  a partir da qual o patrimônio só reage ao mercado. Tem ainda a fase de retiradas: a
  regra dos 4% (ou um valor fixo por mês), com reajuste anual pelo IPCA, mostrando se e
  quando o dinheiro acaba.

As fichas ficam no `localStorage` do navegador. Nada é enviado a lugar nenhum.

As cotações dos ETFs (Yahoo Finance), o CDI diário (Banco Central, SGS 12) e o IPCA mensal
(SGS 433) são baixados por `scripts/atualizar-dados.mjs` e servidos como JSON estático de
`public/dados/`. O deploy roda sozinho nos dias úteis às 20h e atualiza esses dados antes do
build; se as fontes falharem, publica com os arquivos versionados. Para atualizar localmente: `npm run dados`.

## Estrutura

```
src/
  domain/       regras de negócio, puras — sem React e sem DOM
    tributacao.js   tabela regressiva de IR e IOF
    apuracao.js     lotes, ciclos de rolagem, TIR
    series.js       séries dos gráficos
    troca.js        simulação "vale a troca?"
    aporteEtf.js    aporte mensal em ETF sobre o histórico real
    ficha.js        criação e sanitização de fichas
    armazenamento.js  localStorage
  components/   React + Tailwind
  hooks/        estado das fichas
```

Todo o cálculo vive em `src/domain`. Os componentes não fazem conta: leem o domínio e
desenham. É o que permite testar a matemática sem montar nada.

## Desenvolvimento

```bash
npm install
npm run dev      # servidor local
npm run dados    # atualiza cotações e CDI em public/dados
npm test         # 172 testes
npm run build    # build de produção em dist/
```

Os testes cobrem o domínio contra fórmulas fechadas independentes e a aplicação ponta a
ponta com Testing Library.

## Aviso

Ferramenta educacional de simulação, não é recomendação de investimento. Confira sempre
as condições reais junto à instituição financeira e a alíquota vigente na Receita Federal.
