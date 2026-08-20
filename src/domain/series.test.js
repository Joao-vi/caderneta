import { calcular } from './apuracao.js';
import { jurosDoMes, mesesDe, serieValor } from './series.js';

const CDI = 13.9;
const ficha = (o = {}) => ({
  principal: 10000, aporte: 0, prazo: 720, rolar: false, horizonte: 720,
  taxaAnual: CDI, trib: 'regressiva', aliqFixa: 0, ...o,
});

describe('mesesDe', () => {
  it('usa ceil: um prazo de 365 dias precisa chegar ao vencimento', () => {
    // com Math.round a curva parava no dia 360
    expect(mesesDe(ficha({ prazo: 365, horizonte: 365 }))).toBe(13);
    expect(mesesDe(ficha({ prazo: 720 }))).toBe(24);
    expect(mesesDe(ficha({ prazo: 1095, horizonte: 1095 }))).toBe(37);
  });
});

describe('serieValor', () => {
  it('começa no capital inicial e termina no vencimento', () => {
    const it = ficha({ prazo: 365, horizonte: 365, taxaAnual: CDI * 1.3 });
    const s = serieValor(it);
    expect(s[0].y).toBeCloseTo(10000, 6);
    const r = calcular(it, CDI);
    expect(s[s.length - 1].y).toBeCloseTo(r.aportado + r.rendBruto, 6);
  });

  it('sem rolagem a curva sobe até o fim, sem penhasco no resgate', () => {
    const s = serieValor(ficha({ taxaAnual: CDI * 1.3 }));
    for (let i = 1; i < s.length; i += 1) expect(s[i].y).toBeGreaterThan(s[i - 1].y);
  });

  it('com rolagem a curva nunca cai: o imposto só freia o crescimento', () => {
    const s = serieValor(ficha({ prazo: 90, rolar: true, horizonte: 720 }));
    for (let i = 1; i < s.length; i += 1) expect(s[i].y).toBeGreaterThanOrEqual(s[i - 1].y);
  });

  it('a rolagem tributada fica para trás da aplicação travada', () => {
    const rolada = serieValor(ficha({ prazo: 90, rolar: true, horizonte: 720 }));
    const travada = serieValor(ficha({ prazo: 720 }));
    expect(rolada[24].y).toBeLessThan(travada[24].y);
    expect(travada[24].y - rolada[24].y).toBeCloseTo(629.47, 0);
  });
});

describe('jurosDoMes', () => {
  it('a soma dos meses fecha com o rendimento bruto total', () => {
    for (const it of [
      ficha({ taxaAnual: CDI * 1.3 }),
      ficha({ aporte: 1000, taxaAnual: CDI * 1.3 }),
      ficha({ prazo: 90, rolar: true, horizonte: 720, aporte: 500 }),
    ]) {
      let soma = 0;
      for (let m = 1; m <= mesesDe(it); m += 1) soma += jurosDoMes(it, m, 'bruto') || 0;
      expect(soma).toBeCloseTo(calcular(it, CDI).rendBruto, 6);
    }
  });

  it('é o juro do mês, não o acumulado — e cresce com os juros compostos', () => {
    const it = ficha({ taxaAnual: CDI * 1.3 });
    for (let m = 2; m <= 24; m += 1) {
      expect(jurosDoMes(it, m, 'bruto')).toBeGreaterThan(jurosDoMes(it, m - 1, 'bruto'));
    }
  });

  it('o líquido sobe ao cruzar as viradas da tabela regressiva', () => {
    const it = ficha({ taxaAnual: CDI * 1.3 });
    // mês 7 (dia 210) já está na faixa de 20%, o mês 6 (dia 180) ainda em 22,5%
    expect(jurosDoMes(it, 7, 'liquido')).toBeGreaterThan(jurosDoMes(it, 6, 'liquido'));
    expect(jurosDoMes(it, 13, 'liquido')).toBeGreaterThan(jurosDoMes(it, 12, 'liquido'));
  });

  it('líquido nunca passa do bruto, e num isento os dois coincidem', () => {
    const trib = ficha({ taxaAnual: CDI * 1.3 });
    const isento = ficha({ trib: 'isento' });
    for (let m = 1; m <= 24; m += 1) {
      expect(jurosDoMes(trib, m, 'liquido')).toBeLessThan(jurosDoMes(trib, m, 'bruto'));
      expect(jurosDoMes(isento, m, 'liquido')).toBeCloseTo(jurosDoMes(isento, m, 'bruto'), 8);
    }
  });

  it('não gera barra depois do vencimento', () => {
    const curta = ficha({ prazo: 365, horizonte: 365 });
    expect(jurosDoMes(curta, 13, 'bruto')).toBeGreaterThan(0); // mês parcial de 5 dias
    expect(jurosDoMes(curta, 14, 'bruto')).toBeNull();
    expect(jurosDoMes(curta, 24, 'bruto')).toBeNull();
  });

  it('o mês parcial do vencimento é menor que um mês cheio', () => {
    const curta = ficha({ prazo: 365, horizonte: 365 });
    expect(jurosDoMes(curta, 13, 'bruto')).toBeLessThan(jurosDoMes(curta, 12, 'bruto'));
  });
});
