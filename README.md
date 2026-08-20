# Caderneta — comparador de CDB e renda fixa

Calculadora de renda fixa em um único arquivo HTML, sem build e sem backend.
Compara CDB, LCI/LCA e Tesouro pelo líquido de verdade, depois do IR e do IOF.

## O que ela faz

- **Fichas comparáveis** — % do CDI ou prefixado, com aportes mensais opcionais.
- **IR lote a lote** — cada aporte tem seu próprio relógio na tabela regressiva,
  então a alíquota efetiva de uma ficha com aportes não é uma faixa da tabela.
- **IOF regressivo** para resgates com menos de 30 dias, aplicado antes do IR.
- **Rentabilidade anual por TIR**, para que fichas com e sem aporte sejam comparáveis.
- **Projeção** em duas abas: evolução do valor e juros gerados mês a mês,
  estes com alternância entre bruto e líquido.
- **"Vale a troca?"** — simula tirar uma fatia de um investimento e colocar numa
  oferta curta com teto, considerando que no vencimento o dinheiro volta. Mostra
  quanto a manobra realmente vale em % do CDI e qual taxa mínima compensaria.

As fichas ficam salvas no `localStorage` do próprio navegador. Nada é enviado a lugar nenhum.

## Rodando localmente

Abra o `index.html` no navegador. Só isso.

## Aviso

Ferramenta educacional de simulação, não é recomendação de investimento.
Confira sempre as condições reais junto à instituição financeira e a alíquota
vigente na Receita Federal.
