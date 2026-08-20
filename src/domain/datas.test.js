import { dataParaDias, diasParaData, isoDe } from './datas.js';

const hoje = new Date(2026, 7, 20); // 20/08/2026

describe('conversão prazo <-> vencimento', () => {
  it.each([1, 30, 90, 134, 365, 366, 720, 1095, 2000])(
    'round-trip de %i dias volta idêntico',
    (dias) => {
      expect(dataParaDias(isoDe(diasParaData(dias, hoje)), hoje)).toBe(dias);
    },
  );

  it('atravessa virada de ano e ano bissexto', () => {
    expect(isoDe(diasParaData(134, hoje))).toBe('2027-01-01');
    expect(isoDe(diasParaData(720, hoje))).toBe('2028-08-09'); // passa por fev/2028
    expect(isoDe(diasParaData(2000, hoje))).toBe('2032-02-10');
  });

  it('rejeita entrada inválida', () => {
    expect(dataParaDias('', hoje)).toBeNull();
    expect(dataParaDias('não é data', hoje)).toBeNull();
    expect(dataParaDias(null, hoje)).toBeNull();
  });

  it('datas passadas e hoje não viram prazo positivo', () => {
    expect(dataParaDias('2026-08-19', hoje)).toBe(-1);
    expect(dataParaDias('2026-08-20', hoje)).toBe(0);
  });
});
