import { aliquotaIR, iofSobre } from './tributacao.js';

describe('aliquotaIR', () => {
  it.each([
    [1, 22.5], [180, 22.5], [181, 20], [360, 20],
    [361, 17.5], [720, 17.5], [721, 15], [3650, 15],
  ])('regressiva: %i dias -> %f%%', (dias, esperado) => {
    expect(aliquotaIR(dias, 'regressiva')).toBe(esperado);
  });

  it('isento é sempre zero, inclusive em prazo curto', () => {
    expect(aliquotaIR(1, 'isento')).toBe(0);
    expect(aliquotaIR(3650, 'isento')).toBe(0);
  });

  it('fixo usa a alíquota informada', () => {
    expect(aliquotaIR(90, 'fixo', 15)).toBe(15);
    expect(aliquotaIR(90, 'fixo', 0)).toBe(0);
  });
});

describe('iofSobre', () => {
  it('não incide a partir do 30º dia', () => {
    expect(iofSobre(100, 30)).toBe(0);
    expect(iofSobre(100, 365)).toBe(0);
  });

  it('morde 64% do rendimento num resgate de 10 dias', () => {
    expect(iofSobre(100, 10)).toBeCloseTo(64, 6);
  });

  it('é quase integral no primeiro dia', () => {
    expect(iofSobre(100, 1)).toBeCloseTo(92.8, 6);
  });

  it('não inventa imposto sobre rendimento negativo ou nulo', () => {
    expect(iofSobre(0, 10)).toBe(0);
    expect(iofSobre(-5, 10)).toBe(0);
  });
});
