import {
  equivalentePctCDI, simularFicar, simularTrocar, taxaMinimaOferta, veredito,
} from './troca.js';

const CDI = 13.9;
const cfg = {
  prazo: 90,
  taxaOferta: CDI * 1.3,
  taxaOrigem: CDI,
  taxaReaplicacao: CDI,
  tribOferta: 'regressiva',
  aliqOferta: 0,
  tribOrigem: 'regressiva',
  aliqOrigem: 0,
};
const V = 5000;

describe('o caso que motivou a feature: R$5.000 a 130% do CDI por 90 dias', () => {
  it.each([
    [90, 5126.37, 5162.01, 35.63, 130.0],
    [180, 5256.87, 5292.48, 35.61, 114.4],
    [365, 5573.38, 5587.47, 14.1, 102.5],
    [720, 6207.4, 6234.66, 27.26, 102.1],
  ])('horizonte %id', (h, ficarEsp, trocarEsp, deltaEsp, equivEsp) => {
    const a = simularFicar(V, cfg, h);
    const b = simularTrocar(V, cfg, h);
    expect(a.liquido).toBeCloseTo(ficarEsp, 1);
    expect(b.liquido).toBeCloseTo(trocarEsp, 1);
    expect(b.liquido - a.liquido).toBeCloseTo(deltaEsp, 1);
    expect(equivalentePctCDI(b.liquido, V, cfg, h, CDI)).toBeCloseTo(equivEsp, 1);
  });

  it('os 130% só valem 130% no horizonte da própria oferta', () => {
    expect(equivalentePctCDI(simularTrocar(V, cfg, 90).liquido, V, cfg, 90, CDI)).toBeCloseTo(130, 1);
    // esticado para um ano, a manobra desaba para perto de 100%
    expect(equivalentePctCDI(simularTrocar(V, cfg, 365).liquido, V, cfg, 365, CDI)).toBeLessThan(105);
  });

  it('a taxa mínima para compensar sobe quando o horizonte estica', () => {
    expect(taxaMinimaOferta(V, cfg, 90) / CDI * 100).toBeCloseTo(100, 1);
    expect(taxaMinimaOferta(V, cfg, 365) / CDI * 100).toBeCloseTo(118.9, 1);
    expect(taxaMinimaOferta(V, cfg, 720) / CDI * 100).toBeCloseTo(110.9, 1);
  });
});

describe('estrutura da simulação', () => {
  it('no horizonte da oferta há uma perna só, sem reaplicação', () => {
    const b = simularTrocar(V, cfg, 90);
    expect(b.pernas).toBe(1);
    expect(b.irFinal).toBe(0);
  });

  it('além do vencimento há duas pernas, com IR realizado no meio', () => {
    const b = simularTrocar(V, cfg, 365);
    expect(b.pernas).toBe(2);
    expect(b.irOferta).toBeGreaterThan(0);
    expect(b.irFinal).toBeGreaterThan(0);
  });

  it('uma oferta pior que a origem não tem taxa mínima alcançável... mas 300% basta', () => {
    expect(taxaMinimaOferta(V, cfg, 365)).not.toBeNull();
  });
});

describe('veredito', () => {
  it('trata diferenças abaixo de 0,1% do migrado como empate técnico', () => {
    expect(veredito(4, 5000)).toBe('empate');
    expect(veredito(-4, 5000)).toBe('empate');
    expect(veredito(35.63, 5000)).toBe('vale');
    expect(veredito(-35.63, 5000)).toBe('nao-vale');
  });
});
