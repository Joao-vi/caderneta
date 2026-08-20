/**
 * Regras tributárias de renda fixa. Fonte única: tudo que precisa saber de
 * imposto neste projeto passa por aqui, para que fichas, projeções e a
 * simulação de troca nunca divirjam entre si.
 */

/** Tabela regressiva de IR sobre o rendimento, em % (não sobre o capital). */
export function aliquotaIR(dias, trib, aliqFixa = 0) {
  if (trib === 'isento') return 0;
  if (trib === 'fixo') return aliqFixa || 0;
  if (dias <= 180) return 22.5;
  if (dias <= 360) return 20;
  if (dias <= 720) return 17.5;
  return 15;
}

/**
 * IOF regressivo para resgates com menos de 30 dias, aplicado sobre o
 * rendimento e antes do IR. A partir do 30º dia é zero.
 */
export function iofSobre(rend, dias) {
  if (dias >= 30 || rend <= 0) return 0;
  const fracao = Math.max(0, ((30 - dias) / 30) * 96) / 100;
  return rend * fracao;
}

export const TRIBUTACOES = ['regressiva', 'isento', 'fixo'];

export function rotuloTributacao(trib, aliqFixa) {
  if (trib === 'isento') return 'Isento de IR';
  if (trib === 'fixo') return `IR fixo ${aliqFixa}%`;
  return 'Tabela regressiva';
}
