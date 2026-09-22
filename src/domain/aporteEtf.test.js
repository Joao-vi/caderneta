import {
  criaFatorCdi, criaFatorIpca, fracaoSorteada, somaMeses, pregoesDeAporte, primeiroMesDisponivel, simularAporteMensal, tirAnual,
} from './aporteEtf.js';

// Três meses com o dia 1 caindo em fim de semana ou feriado em dois deles.
const PRECOS = [
  ['2024-01-02', 10], // 1º de jan é feriado
  ['2024-01-03', 11],
  ['2024-01-31', 12],
  ['2024-02-01', 20],
  ['2024-02-02', 21],
  ['2024-03-04', 25], // 1º de mar/2024 foi sexta, mas vale o primeiro pregão da série
  ['2024-03-15', 30],
];

const CDI_ZERO = PRECOS.map(([d]) => [d, 0]);

describe('primeiroMesDisponivel', () => {
  it('usa o mês de estreia se a série começa no início do mês', () => {
    expect(primeiroMesDisponivel(PRECOS)).toBe('2024-01');
  });

  it('pula o mês de estreia se o ETF começou no meio dele', () => {
    expect(primeiroMesDisponivel([['2021-05-24', 10], ['2021-06-01', 11]])).toBe('2021-06');
    expect(primeiroMesDisponivel([['2020-12-14', 10]])).toBe('2021-01');
  });
});

describe('pregoesDeAporte', () => {
  it('pega o primeiro pregão de cada mês', () => {
    expect(pregoesDeAporte(PRECOS, '2024-01')).toEqual([
      { data: '2024-01-02', preco: 10 },
      { data: '2024-02-01', preco: 20 },
      { data: '2024-03-04', preco: 25 },
    ]);
  });

  it('começa no mês pedido', () => {
    expect(pregoesDeAporte(PRECOS, '2024-02').map((p) => p.data)).toEqual(['2024-02-01', '2024-03-04']);
  });

  it('não aporta antes de o ETF existir', () => {
    expect(pregoesDeAporte(PRECOS, '2019-06')[0].data).toBe('2024-01-02');
  });
});

describe('criaFatorCdi', () => {
  const taxas = [['2024-01-02', 1], ['2024-01-03', 2], ['2024-01-04', 3]];
  const fator = criaFatorCdi(taxas);

  it('rende as taxas da data de aplicação até a véspera do resgate', () => {
    expect(fator('2024-01-02', '2024-01-04')).toBeCloseTo(1.01 * 1.02, 12);
    expect(fator('2024-01-03', '2024-01-05')).toBeCloseTo(1.02 * 1.03, 12);
  });

  it('é 1 no mesmo dia', () => {
    expect(fator('2024-01-03', '2024-01-03')).toBe(1);
  });

  it('conta dias sem taxa publicada (fim de semana) como sem rendimento', () => {
    expect(fator('2024-01-02', '2024-01-03')).toBeCloseTo(fator('2023-12-30', '2024-01-03'), 12);
  });
});

describe('tirAnual', () => {
  it('10% em exatamente um ano', () => {
    expect(tirAnual([{ data: '2023-01-01', valor: 100 }], '2024-01-01', 110)).toBeCloseTo(10, 6);
  });

  it('zero quando o valor final é o aportado', () => {
    const aportes = [{ data: '2023-01-01', valor: 100 }, { data: '2023-07-01', valor: 100 }];
    expect(tirAnual(aportes, '2024-01-01', 200)).toBeCloseTo(0, 6);
  });

  it('dois aportes: bate com a raiz da equação à mão', () => {
    // 100·(1+r) + 100·(1+r)^(181/365) = 220 → r ≈ 13,6%, conferido abaixo
    const aportes = [{ data: '2023-01-01', valor: 100 }, { data: '2023-07-04', valor: 100 }];
    const r = tirAnual(aportes, '2024-01-01', 220) / 100;
    expect(100 * (1 + r) + 100 * (1 + r) ** (181 / 365)).toBeCloseTo(220, 6);
  });
});

describe('simularAporteMensal', () => {
  const sim = simularAporteMensal({ precos: PRECOS, taxasCdi: CDI_ZERO, inicio: '2024-01', aporte: 100 });

  it('compra cotas fracionárias ao preço do primeiro pregão', () => {
    // 100/10 + 100/20 + 100/25 = 10 + 5 + 4 = 19 cotas
    expect(sim.pontos.map((p) => p.cotas)).toEqual([10, 15, 19, 19]);
  });

  it('marca o patrimônio logo após cada compra e no último fechamento', () => {
    expect(sim.pontos.map((p) => [p.data, p.aportado, p.patrimonio])).toEqual([
      ['2024-01-02', 100, 100],
      ['2024-02-01', 200, 300],
      ['2024-03-04', 300, 475],
      ['2024-03-15', 300, 570], // 19 cotas × 30
    ]);
  });

  it('resume no último fechamento', () => {
    expect(sim.dataFinal).toBe('2024-03-15');
    expect(sim.etf.aportado).toBe(300);
    expect(sim.etf.patrimonio).toBe(570);
    expect(sim.etf.ganho).toBe(270);
    expect(sim.etf.rentTotal).toBeCloseTo(90, 10);
    expect(sim.etf.rentAnual).toBeGreaterThan(0);
  });

  it('com CDI zero, o CDI devolve exatamente o aportado', () => {
    expect(sim.pontos.map((p) => p.cdi)).toEqual([100, 200, 300, 300]);
    expect(sim.cdi.rentAnual).toBeCloseTo(0, 6);
  });

  it('corrige cada aporte pelo CDI desde a sua própria data', () => {
    const taxas = PRECOS.map(([d]) => [d, 1]); // 1% por pregão, para ficar legível
    const s = simularAporteMensal({ precos: PRECOS, taxasCdi: taxas, inicio: '2024-01', aporte: 100 });
    // pregões antes de 15/03: aporte de jan passa por 6, fev por 3, mar por 1
    expect(s.cdi.patrimonio).toBeCloseTo(100 * (1.01 ** 6 + 1.01 ** 3 + 1.01), 10);
  });

  it('não duplica o ponto final quando o último pregão é dia de aporte', () => {
    const precos = PRECOS.slice(0, 6); // termina em 2024-03-04
    const s = simularAporteMensal({ precos, taxasCdi: CDI_ZERO, inicio: '2024-01', aporte: 100 });
    expect(s.pontos).toHaveLength(3);
    expect(s.etf.patrimonio).toBe(475);
  });

  it('preço constante: patrimônio igual ao aportado e TIR zero', () => {
    const precos = PRECOS.map(([d]) => [d, 50]);
    const s = simularAporteMensal({ precos, taxasCdi: CDI_ZERO, inicio: '2024-01', aporte: 100 });
    expect(s.etf.patrimonio).toBeCloseTo(300, 10);
    expect(s.etf.rentAnual).toBeCloseTo(0, 6);
  });
});

describe('fracaoSorteada', () => {
  const meses = Array.from({ length: 600 }, (_, i) => `${2000 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`);
  const cfg = { semente: 7, chancePular: 0.2, minimo: 0.5 };

  it('é determinística: mesma semente e mês, mesma fração', () => {
    expect(meses.map((m) => fracaoSorteada(m, cfg))).toEqual(meses.map((m) => fracaoSorteada(m, cfg)));
  });

  it('muda com a semente', () => {
    const outra = meses.map((m) => fracaoSorteada(m, { ...cfg, semente: 8 }));
    expect(outra).not.toEqual(meses.map((m) => fracaoSorteada(m, cfg)));
  });

  it('é zero ou fica entre o mínimo e 100%, em degraus de 5%', () => {
    for (const m of meses) {
      const f = fracaoSorteada(m, cfg);
      if (f === 0) continue;
      expect(f).toBeGreaterThanOrEqual(0.5);
      expect(f).toBeLessThanOrEqual(1);
      expect(Math.round(f * 20)).toBeCloseTo(f * 20, 10);
    }
  });

  it('pula meses na proporção pedida', () => {
    const pulados = meses.filter((m) => fracaoSorteada(m, cfg) === 0).length / meses.length;
    expect(pulados).toBeGreaterThan(0.14);
    expect(pulados).toBeLessThan(0.26);
  });

  it('sem chance de pular e mínimo 100% vira o investidor disciplinado', () => {
    expect(meses.every((m) => fracaoSorteada(m, { semente: 1, chancePular: 0, minimo: 1 }) === 1)).toBe(true);
  });
});

describe('simularAporteMensal com variabilidade e parada', () => {
  const base = { precos: PRECOS, taxasCdi: CDI_ZERO, inicio: '2024-01', aporte: 100 };

  it('aporta a fração de cada mês e pula os meses zerados', () => {
    const fracoes = { '2024-01': 0.5, '2024-02': 0, '2024-03': 1 };
    const s = simularAporteMensal({ ...base, fracao: (m) => fracoes[m] });
    // 50/10 = 5 cotas em jan, nada em fev, 100/25 = 4 em mar → 9 × 30
    expect(s.pontos.map((p) => p.aporteMes)).toEqual([50, 0, 100, 0]);
    expect(s.pontos.map((p) => p.cotas)).toEqual([5, 5, 9, 9]);
    expect(s.etf.aportado).toBe(150);
    expect(s.etf.patrimonio).toBe(270);
    expect(s.planejado).toBe(300);
    expect(s.mesesComAporte).toBe(2);
  });

  it('o mês pulado ainda aparece na curva, só sem compra', () => {
    const s = simularAporteMensal({ ...base, fracao: (m) => (m === '2024-02' ? 0 : 1) });
    expect(s.pontos[1]).toMatchObject({ data: '2024-02-01', aporteMes: 0, aportado: 100, patrimonio: 200 });
  });

  it('depois da parada não aporta mais, mas segue marcando o patrimônio', () => {
    const s = simularAporteMensal({ ...base, parada: '2024-02' });
    expect(s.pontos.map((p) => [p.data, p.aporteMes, p.parou, p.patrimonio])).toEqual([
      ['2024-01-02', 100, false, 100],
      ['2024-02-01', 0, true, 200], // 10 cotas × 20
      ['2024-03-04', 0, true, 250],
      ['2024-03-15', 0, true, 300],
    ]);
    expect(s.planejado).toBe(100);
    expect(s.noParar).toMatchObject({ data: '2024-02-01', patrimonio: 200 });
    expect(s.etf).toMatchObject({ aportado: 100, patrimonio: 300 });
  });

  it('o CDI também para de receber aportes', () => {
    const taxas = PRECOS.map(([d]) => [d, 1]);
    const s = simularAporteMensal({ ...base, taxasCdi: taxas, parada: '2024-02' });
    expect(s.cdi.patrimonio).toBeCloseTo(100 * 1.01 ** 6, 10);
  });

  it('sem parada no período, noParar é null', () => {
    expect(simularAporteMensal({ ...base, parada: '2030-01' }).noParar).toBeNull();
    expect(simularAporteMensal(base).noParar).toBeNull();
  });

  it('parada no primeiro mês: nada aportado, sem quebrar', () => {
    const s = simularAporteMensal({ ...base, parada: '2024-01' });
    expect(s.etf).toMatchObject({ aportado: 0, patrimonio: 0, rentTotal: 0, rentAnual: 0 });
  });
});

describe('somaMeses e criaFatorIpca', () => {
  it('soma meses atravessando o ano', () => {
    expect(somaMeses('2024-11', 3)).toBe('2025-02');
    expect(somaMeses('2024-01', 24)).toBe('2026-01');
    expect(somaMeses('2024-01', 0)).toBe('2024-01');
  });

  it('acumula o IPCA do mês inicial até a véspera do final', () => {
    const fator = criaFatorIpca([['2024-01', 1], ['2024-02', 2], ['2024-03', 3]]);
    expect(fator('2024-01', '2024-03')).toBeCloseTo(1.01 * 1.02, 12);
    expect(fator('2024-02', '2024-02')).toBe(1);
  });

  it('mês ainda não divulgado conta como inflação zero', () => {
    const fator = criaFatorIpca([['2024-01', 1]]);
    expect(fator('2024-01', '2024-06')).toBeCloseTo(1.01, 12);
  });
});

describe('tirAnual com saques', () => {
  it('aplicou 100, sacou 110 um ano depois e zerou: 10% a.a.', () => {
    const fluxos = [{ data: '2023-01-01', valor: 100 }, { data: '2024-01-01', valor: -110 }];
    expect(tirAnual(fluxos, '2024-01-01', 0)).toBeCloseTo(10, 6);
  });

  it('saque parcial entra na conta junto com o que sobrou', () => {
    // 100 viram 121 em dois anos a 10%: sacar 55 no ano 1 deixa 60,5 no ano 2
    const fluxos = [{ data: '2023-01-01', valor: 100 }, { data: '2024-01-01', valor: -55 }];
    expect(tirAnual(fluxos, '2024-12-31', 60.5)).toBeCloseTo(10, 1);
  });
});

describe('simularAporteMensal com retiradas', () => {
  const base = { precos: PRECOS, taxasCdi: CDI_ZERO, inicio: '2024-01', aporte: 100 };

  it('valor fixo: vende cotas ao preço do mês e para de aportar', () => {
    const s = simularAporteMensal({
      ...base, retirada: { inicio: '2024-02', modo: 'fixo', valor: 50, corrigir: false },
    });
    // jan: 10 cotas a 10. fev: vale 200, saca 50 → 7,5 cotas. mar: vale 187,5, saca 50 → 5,5 cotas
    expect(s.pontos.map((p) => [p.aporteMes, p.saqueMes, p.cotas])).toEqual([
      [100, 0, 10], [0, 50, 7.5], [0, 50, 5.5], [0, 0, 5.5],
    ]);
    expect(s.etf).toMatchObject({ aportado: 100, retirado: 100, patrimonio: 165, ganho: 165 });
    expect(s.etf.esgotouEm).toBeNull();
    expect(s.noRetirar.data).toBe('2024-02-01');
    expect(s.planejado).toBe(100);
  });

  it('o CDI saca do próprio saldo e registra quando acabou', () => {
    const s = simularAporteMensal({
      ...base, retirada: { inicio: '2024-02', modo: 'fixo', valor: 50, corrigir: false },
    });
    expect(s.pontos.map((p) => p.cdi)).toEqual([100, 50, 0, 0]);
    expect(s.cdi).toMatchObject({ retirado: 100, patrimonio: 0, esgotouEm: '2024-03-04' });
    expect(s.cdi.rentAnual).toBeCloseTo(0, 6);
  });

  it('saque maior que o patrimônio vende tudo e zera', () => {
    const s = simularAporteMensal({
      ...base, retirada: { inicio: '2024-02', modo: 'fixo', valor: 1000, corrigir: false },
    });
    expect(s.pontos.map((p) => p.saqueMes)).toEqual([0, 200, 0, 0]);
    expect(s.etf).toMatchObject({ retirado: 200, patrimonio: 0, esgotouEm: '2024-02-01' });
    // o saque do regulamento continua valendo, mesmo sem saldo para cobri-lo
    expect(s.etf.saqueAtual).toBe(1000);
    expect(s.etf.rentAnual).toBeGreaterThan(0); // 100 viraram 200 em um mês
  });

  it('percentual: a base é o patrimônio no início das retiradas', () => {
    const s = simularAporteMensal({
      ...base, retirada: { inicio: '2024-02', modo: 'pct', valor: 12, corrigir: false },
    });
    // em fev vale 200: 12% a.a. / 12 = 1% ao mês = R$ 2, fixo dali em diante
    expect(s.etf.saqueInicial).toBe(2);
    expect(s.pontos.map((p) => p.saqueMes)).toEqual([0, 2, 2, 0]);
  });

  it('corrige o saque pelo IPCA a cada aniversário, não todo mês', () => {
    const meses = Array.from({ length: 30 }, (_, i) => somaMeses('2020-01', i));
    const precos = meses.map((m) => [`${m}-02`, 10]);
    const s = simularAporteMensal({
      precos,
      taxasCdi: precos.map(([d]) => [d, 0]),
      inicio: '2020-01',
      aporte: 100000,
      retirada: { inicio: '2020-02', modo: 'fixo', valor: 100, corrigir: true },
      ipca: meses.map((m) => [m, 1]),
    });
    const saques = s.pontos.filter((p) => p.retirando).map((p) => p.saqueMes);
    expect(saques.slice(0, 12).every((v) => v === 100)).toBe(true);
    expect(saques[12]).toBeCloseTo(100 * 1.01 ** 12, 10);
    expect(saques[23]).toBeCloseTo(100 * 1.01 ** 12, 10);
    expect(saques[24]).toBeCloseTo(100 * 1.01 ** 24, 10);
    expect(s.etf.saqueInicial).toBe(100);
    expect(s.etf.saqueAtual).toBeCloseTo(100 * 1.01 ** 24, 10);
  });

  it('a parada anterior às retiradas vale; a posterior é absorvida', () => {
    const r = { inicio: '2024-03', modo: 'fixo', valor: 10, corrigir: false };
    const antes = simularAporteMensal({ ...base, parada: '2024-02', retirada: r });
    expect(antes.pontos.map((p) => p.aporteMes)).toEqual([100, 0, 0, 0]);
    const depois = simularAporteMensal({ ...base, parada: '2030-01', retirada: r });
    expect(depois.pontos.map((p) => p.aporteMes)).toEqual([100, 100, 0, 0]);
  });
});
