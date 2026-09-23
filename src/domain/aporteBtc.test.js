import {
  decomposicaoDoRuido, faixaDeRuido, precoMedioDoPeriodo, quedaMaxima, simularAporteBtc,
  valorPorAporte,
} from './aporteBtc.js';

/** Série 24/7, como a do bitcoin. `preco(i)` dá o preço do i-ésimo dia. */
function serie(de, dias, preco) {
  const precos = [];
  for (let i = 0; i < dias; i += 1) {
    precos.push([new Date(Date.parse(de) + i * 86400000).toISOString().slice(0, 10), preco(i)]);
  }
  return precos;
}

const constante = (v) => () => v;

describe('valorPorAporte', () => {
  it('divide o orçamento pelos aportes que cabem no período', () => {
    expect(valorPorAporte(600, 'mensal')).toBe(600);
    expect(valorPorAporte(600, 'semanal')).toBeCloseTo((600 * 12) / 52, 10);
    expect(valorPorAporte(600, 'diaria')).toBeCloseTo((600 * 12) / 365, 10);
  });

  it('as três frequências gastam o mesmo num ano', () => {
    const anual = (f) => valorPorAporte(600, f) * { mensal: 12, semanal: 52, diaria: 365 }[f];
    expect(anual('semanal')).toBeCloseTo(anual('mensal'), 8);
    expect(anual('diaria')).toBeCloseTo(anual('mensal'), 8);
  });
});

describe('acumulação', () => {
  it('com preço parado, o bitcoin é exatamente o aportado dividido pelo preço', () => {
    const r = simularAporteBtc({
      precos: serie('2024-01-01', 90, constante(50000)),
      frequencia: 'mensal', dia: 1, orcamentoMensal: 1000,
    });
    expect(r.resumo.nAportes).toBe(3);
    expect(r.resumo.aportado).toBeCloseTo(3000, 10);
    expect(r.resumo.btc).toBeCloseTo(3000 / 50000, 10);
    expect(r.resumo.precoMedio).toBeCloseTo(50000, 6);
    expect(r.resumo.rentTotal).toBeCloseTo(0, 8);
  });

  it('a série diária tem um ponto por dia desde o primeiro aporte', () => {
    const precos = serie('2024-01-01', 100, constante(10));
    const r = simularAporteBtc({
      precos, frequencia: 'mensal', dia: 10, orcamentoMensal: 300,
    });
    // primeiro aporte em 10/01; a série vai daí até o fim
    expect(r.serie[0].data).toBe('2024-01-10');
    expect(r.serie).toHaveLength(91);
    expect(r.serie.at(-1).data).toBe(precos.at(-1)[0]);
  });

  it('não compra nada antes do primeiro aporte', () => {
    const r = simularAporteBtc({
      precos: serie('2024-01-01', 60, constante(10)),
      frequencia: 'mensal', dia: 20, orcamentoMensal: 100,
    });
    expect(r.serie[0].btc).toBeGreaterThan(0); // o primeiro ponto já é o da compra
    expect(r.serie[0].data).toBe('2024-01-20');
  });

  it('devolve resumo nulo quando não sobra nenhuma data de aporte', () => {
    const r = simularAporteBtc({
      precos: serie('2024-01-01', 30, constante(10)),
      frequencia: 'mensal', dia: 1, inicio: '2030-01', orcamentoMensal: 100,
    });
    expect(r.resumo).toBeNull();
    expect(r.serie).toEqual([]);
  });
});

describe('preço médio pago', () => {
  // Preços escolhidos para a conta fechar na mão: 100, 50, 200, 100.
  const PRECOS = serie('2024-01-01', 4, (i) => [100, 50, 200, 100][i]);

  it('no aporte diário é a média harmônica dos preços', () => {
    const r = simularAporteBtc({ precos: PRECOS, frequencia: 'diaria', orcamentoMensal: 300 });
    const harmonica = 4 / (1 / 100 + 1 / 50 + 1 / 200 + 1 / 100); // = 88,888…
    expect(r.resumo.precoMedio).toBeCloseTo(harmonica, 8);
    expect(r.resumo.precoMedio).toBeCloseTo(88.888888, 5);
  });

  it('e a harmônica fica abaixo da aritmética — o ganho que o método garante', () => {
    const r = simularAporteBtc({ precos: PRECOS, frequencia: 'diaria', orcamentoMensal: 300 });
    expect(precoMedioDoPeriodo(r.serie)).toBeCloseTo(112.5, 8);
    expect(r.resumo.precoMedio).toBeLessThan(r.resumo.precoMedioMercado);
  });

  it('vale para qualquer série com preço que varia', () => {
    const precos = serie('2024-01-01', 200, (i) => 100 + 60 * Math.sin(i / 9));
    const r = simularAporteBtc({ precos, frequencia: 'diaria', orcamentoMensal: 300 });
    expect(r.resumo.precoMedio).toBeLessThan(r.resumo.precoMedioMercado);
  });

  it('com preço parado as duas médias coincidem', () => {
    const r = simularAporteBtc({
      precos: serie('2024-01-01', 50, constante(70)), frequencia: 'diaria', orcamentoMensal: 300,
    });
    expect(r.resumo.precoMedio).toBeCloseTo(r.resumo.precoMedioMercado, 8);
  });
});

describe('melhor e pior compra', () => {
  it('aponta a data do menor e do maior preço pago', () => {
    const precos = serie('2024-01-01', 4, (i) => [100, 50, 200, 100][i]);
    const { resumo } = simularAporteBtc({ precos, frequencia: 'diaria', orcamentoMensal: 300 });
    expect(resumo.melhor).toMatchObject({ data: '2024-01-02', preco: 50 });
    expect(resumo.pior).toMatchObject({ data: '2024-01-03', preco: 200 });
  });
});

describe('quedaMaxima', () => {
  it('mede do pico até o fundo seguinte', () => {
    const s = [100, 150, 60, 90].map((patrimonio, i) => ({ data: `2024-01-0${i + 1}`, patrimonio }));
    // pico 150, fundo 60: 1 - 60/150 = 60%
    expect(quedaMaxima(s)).toEqual({ queda: 60, fundo: '2024-01-03' });
  });

  it('é zero numa série que só sobe', () => {
    const s = [10, 20, 30].map((patrimonio, i) => ({ data: `2024-01-0${i + 1}`, patrimonio }));
    expect(quedaMaxima(s).queda).toBe(0);
  });

  it('não se confunde com um pico posterior menor', () => {
    const s = [100, 200, 50, 120, 90].map((patrimonio, i) => ({ data: `d${i}`, patrimonio }));
    expect(quedaMaxima(s).queda).toBeCloseTo(75, 8); // 1 - 50/200
  });
});

describe('rentabilidade anual', () => {
  it('um aporte único que dobra em um ano rende ~100% a.a.', () => {
    const precos = [['2023-01-01', 100], ['2024-01-01', 200]];
    const r = simularAporteBtc({ precos, frequencia: 'mensal', dia: 1, orcamentoMensal: 1000 });
    // dois aportes: jan/23 a 100 e jan/24 a 200; o segundo não rendeu nada ainda
    // 1000/100 + 1000/200 = 15 BTC a 200 = 3000, sobre 2000 aportados
    expect(r.resumo.btc).toBeCloseTo(15, 8);
    expect(r.resumo.patrimonio).toBeCloseTo(3000, 8);
    expect(r.resumo.rentAnual).toBeCloseTo(100, 2);
  });
});

describe('faixaDeRuido', () => {
  const precos = serie('2022-01-01', 700, (i) => 20000 + 9000 * Math.sin(i / 40));

  it('o envelope contém todas as variantes em toda data', () => {
    const faixa = faixaDeRuido({ precos, orcamentoMensal: 600 });
    const porData = new Map(faixa.envelope.map((p) => [p.data, p]));
    for (const v of faixa.variantes) {
      for (const p of v.serie) {
        const f = porData.get(p.data);
        expect(p.multiplo).toBeGreaterThanOrEqual(f.minimo - 1e-9);
        expect(p.multiplo).toBeLessThanOrEqual(f.maximo + 1e-9);
      }
    }
  });

  it('toda variante começa valendo exatamente 1 no dia do primeiro aporte', () => {
    const faixa = faixaDeRuido({ precos, orcamentoMensal: 600 });
    for (const v of faixa.variantes) expect(v.serie[0].multiplo).toBeCloseTo(1, 10);
  });

  it('cobre os 31 dias do mês, os 7 da semana e o diário', () => {
    const faixa = faixaDeRuido({ precos, orcamentoMensal: 600 });
    expect(faixa.variantes).toHaveLength(39);
    expect(faixa.variantes.filter((v) => v.frequencia === 'mensal')).toHaveLength(31);
    expect(faixa.variantes.filter((v) => v.frequencia === 'semanal')).toHaveLength(7);
    expect(faixa.variantes.filter((v) => v.frequencia === 'diaria')).toHaveLength(1);
  });

  it('o melhor plano pagou mais barato que o pior', () => {
    const faixa = faixaDeRuido({ precos, orcamentoMensal: 600 });
    expect(faixa.melhorPlano.resumo.precoMedio).toBeLessThan(faixa.piorPlano.resumo.precoMedio);
    expect(faixa.spread).toBeGreaterThan(0);
  });

  it('com preço parado não há ruído nenhum: todas empatam', () => {
    // a régua do envelope: se a escolha não pode importar, a faixa tem de
    // fechar. Em valor absoluto ela não fecharia — as variantes gastam totais
    // um pouco diferentes quando a série não acaba num fim de período
    const faixa = faixaDeRuido({
      precos: serie('2022-01-01', 400, constante(30000)), orcamentoMensal: 600,
    });
    expect(faixa.spread).toBeCloseTo(0, 8);
    for (const p of faixa.envelope) expect(p.maximo - p.minimo).toBeCloseTo(0, 10);
  });

  it('devolve nulo quando não há data de aporte possível', () => {
    expect(faixaDeRuido({ precos, inicio: '2030-01', orcamentoMensal: 600 })).toBeNull();
  });
});

describe('decomposicaoDoRuido', () => {
  const precos = serie('2022-01-01', 700, (i) => 20000 + 9000 * Math.sin(i / 40));

  it('separa as três fontes de ruído', () => {
    const d = decomposicaoDoRuido(faixaDeRuido({ precos, orcamentoMensal: 600 }));
    expect(d.porDiaDoMes).toBeGreaterThan(0);
    expect(d.porDiaDaSemana).toBeGreaterThan(0);
    expect(d.entreFrequencias).toBeGreaterThanOrEqual(0);
  });

  it('cada espalhamento cabe dentro do total', () => {
    const faixa = faixaDeRuido({ precos, orcamentoMensal: 600 });
    const d = decomposicaoDoRuido(faixa);
    expect(d.porDiaDoMes).toBeLessThanOrEqual(faixa.spread + 1e-9);
    expect(d.porDiaDaSemana).toBeLessThanOrEqual(faixa.spread + 1e-9);
    expect(d.entreFrequencias).toBeLessThanOrEqual(faixa.spread + 1e-9);
  });

  it('com preço parado não sobra ruído de fonte nenhuma', () => {
    const d = decomposicaoDoRuido(faixaDeRuido({
      precos: serie('2022-01-01', 400, constante(30000)), orcamentoMensal: 600,
    }));
    expect(d.porDiaDoMes).toBeCloseTo(0, 8);
    expect(d.porDiaDaSemana).toBeCloseTo(0, 8);
    expect(d.entreFrequencias).toBeCloseTo(0, 8);
  });

  it('não estoura sem faixa', () => {
    expect(decomposicaoDoRuido(null)).toBeNull();
  });
});
