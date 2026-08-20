import { apuraAte, calcular, horizonteDe, taxaLiquidaAnual } from './apuracao.js';

const CDI = 13.9;
const ficha = (o = {}) => ({
  principal: 10000, aporte: 0, prazo: 720, rolar: false, horizonte: 720,
  taxaAnual: CDI, trib: 'regressiva', aliqFixa: 0, ...o,
});

// referência independente: fórmula fechada, válida só sem aporte e sem rolagem
function liquidoSimples(principal, taxaAnual, prazo, trib = 'regressiva') {
  const bruto = principal * (1 + taxaAnual / 100) ** (prazo / 365);
  const rend = bruto - principal;
  const iof = prazo < 30 ? rend * (((30 - prazo) / 30) * 96) / 100 : 0;
  const aliq = trib === 'isento' ? 0
    : prazo <= 180 ? 22.5 : prazo <= 360 ? 20 : prazo <= 720 ? 17.5 : 15;
  return principal + rend - iof - (rend - iof) * (aliq / 100);
}

describe('ficha simples (sem aporte, sem rolagem)', () => {
  it.each([20, 90, 365, 720, 1095])('bate com a fórmula fechada em %i dias', (prazo) => {
    const it = ficha({ prazo, horizonte: prazo, taxaAnual: CDI * 1.3 });
    expect(calcular(it, CDI).liquido).toBeCloseTo(liquidoSimples(10000, CDI * 1.3, prazo), 6);
  });

  it('a TIR reduz à fórmula fechada quando há um único fluxo', () => {
    const it = ficha({ prazo: 720, taxaAnual: CDI * 1.3 });
    const liq = calcular(it, CDI).liquido;
    expect(calcular(it, CDI).rentLiqAnual).toBeCloseTo(((liq / 10000) ** (365 / 720) - 1) * 100, 8);
  });

  it('horizonte é ignorado quando rolar=false', () => {
    const a = calcular(ficha({ prazo: 365, horizonte: 365 }), CDI);
    const b = calcular(ficha({ prazo: 365, horizonte: 9999 }), CDI);
    expect(a.liquido).toBe(b.liquido);
    expect(horizonteDe(ficha({ prazo: 365, horizonte: 9999 }))).toBe(365);
  });
});

describe('aportes mensais: cada lote tem seu próprio relógio de IR', () => {
  const comAporte = ficha({ principal: 0, aporte: 1000, prazo: 720, taxaAnual: CDI * 1.3 });

  it('soma 23 aportes (dias 30 a 690)', () => {
    expect(calcular(comAporte, CDI).aportado).toBeCloseTo(23000, 6);
  });

  it('a alíquota efetiva fica entre a faixa do lote mais novo e a do mais velho', () => {
    const r = calcular(comAporte, CDI);
    expect(r.aliqIR).toBeGreaterThan(17.5);
    expect(r.aliqIR).toBeLessThan(22.5);
    expect(r.aliqIR).toBeCloseTo(18.35, 1);
  });

  it('apurar numa faixa única superestimaria o líquido', () => {
    const r = calcular(comAporte, CDI);
    const ingenuo = r.aportado + r.rendBruto - r.rendBruto * 0.175;
    expect(ingenuo).toBeGreaterThan(r.liquido);
    expect(ingenuo - r.liquido).toBeCloseTo(35.59, 1);
  });

  it('a TIR de um isento com aportes é a própria taxa nominal', () => {
    const puro = ficha({ principal: 0, aporte: 1000, prazo: 720, trib: 'isento', taxaAnual: CDI });
    expect(calcular(puro, CDI).rentLiqAnual).toBeCloseTo(CDI, 2);
  });

  it('cobra IOF no lote que fica menos de 30 dias', () => {
    const curto = ficha({ principal: 0, aporte: 1000, prazo: 100, horizonte: 100 });
    expect(calcular(curto, CDI).iof).toBeGreaterThan(0);
  });
});

describe('rolagem', () => {
  it('rolar um ISENTO não custa nada: 8 ciclos de 90d == um único de 720d', () => {
    const rolada = ficha({ prazo: 90, rolar: true, horizonte: 720, trib: 'isento', taxaAnual: CDI * 0.95 });
    const unica = ficha({ prazo: 720, trib: 'isento', taxaAnual: CDI * 0.95 });
    expect(calcular(rolada, CDI).liquido).toBeCloseTo(calcular(unica, CDI).liquido, 6);
    expect(calcular(rolada, CDI).liquido).toBeCloseTo(12771.9, 1);
    expect(calcular(rolada, CDI).ir).toBe(0);
  });

  it('rolar um TRIBUTADO prende a alíquota em 22,5% e nunca alcança os 17,5%', () => {
    const rolada = calcular(ficha({ prazo: 90, rolar: true, horizonte: 720 }), CDI);
    const unica = calcular(ficha({ prazo: 720 }), CDI);
    expect(rolada.aliqIR).toBeCloseTo(22.5, 6);
    expect(unica.aliqIR).toBeCloseTo(17.5, 6);
    expect(rolada.liquido).toBeCloseTo(12210.17, 1);
    expect(unica.liquido).toBeCloseTo(12414.8, 1);
    expect(unica.liquido - rolada.liquido).toBeCloseTo(204.63, 1);
  });

  it('um toco final de menos de 30 dias paga IOF', () => {
    // horizonte 100 com ciclo 90 deixa um toco de 10 dias
    const it = ficha({ prazo: 90, rolar: true, horizonte: 100, trib: 'isento' });
    const r = calcular(it, CDI);
    const cap90 = 10000 * (1 + CDI / 100) ** (90 / 365);
    const rendToco = cap90 * ((1 + CDI / 100) ** (10 / 365) - 1);
    const iof = (rendToco * ((30 - 10) / 30) * 96) / 100;
    expect(r.iof).toBeCloseTo(iof, 6);
    expect(r.liquido).toBeCloseTo(cap90 + rendToco - iof, 6);
  });

  it('sem toco (horizonte múltiplo do ciclo) um isento rende como dias corridos', () => {
    const it = ficha({ prazo: 90, rolar: true, horizonte: 180, trib: 'isento' });
    expect(calcular(it, CDI).iof).toBe(0);
    expect(calcular(it, CDI).liquido).toBeCloseTo(10000 * (1 + CDI / 100) ** (180 / 365), 6);
  });

  it('a TIR de uma rolagem isenta é a taxa nominal', () => {
    const it = ficha({ prazo: 90, rolar: true, horizonte: 720, trib: 'isento' });
    expect(calcular(it, CDI).rentLiqAnual).toBeCloseTo(CDI, 2);
  });
});

describe('posicao vs liquido', () => {
  it('sem rolagem a posição é bruta: o imposto do resgate fica pendente', () => {
    const it = ficha({ prazo: 720, taxaAnual: CDI * 1.3 });
    const a = apuraAte(it, 720);
    expect(a.posicao).toBeCloseTo(a.aportado + a.rend, 6);
    expect(a.liquido).toBeLessThan(a.posicao);
  });

  it('com rolagem a posição já carrega o imposto pago nos vencimentos', () => {
    const it = ficha({ prazo: 90, rolar: true, horizonte: 720 });
    const a = apuraAte(it, 720);
    expect(a.posicao).toBeLessThan(a.aportado + a.rend);
  });

  it('no dia zero a posição é o capital inicial', () => {
    expect(apuraAte(ficha(), 0).posicao).toBe(10000);
  });
});

describe('taxaLiquidaAnual', () => {
  it('devolve -100 para líquido não positivo', () => {
    expect(taxaLiquidaAnual(ficha(), 0)).toBe(-100);
  });
});
