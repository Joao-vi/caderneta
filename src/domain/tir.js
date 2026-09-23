const DIA_MS = 86400000;

export function diasEntre(isoA, isoB) {
  return Math.round((Date.parse(isoB) - Date.parse(isoA)) / DIA_MS);
}

/**
 * TIR anual (base 365) de fluxos datados que valem `valorFinal` em `dataFinal`.
 * Aporte é valor positivo, saque é negativo. Como os saques sempre vêm depois
 * dos aportes, o valor futuro cresce com a taxa e a bisseção converge.
 */
export function tirAnual(fluxos, dataFinal, valorFinal) {
  if (!fluxos.length) return 0;
  const saques = fluxos.some((f) => f.valor < 0);
  if (valorFinal <= 0 && !saques) return -100;

  const valorFuturo = (r) =>
    fluxos.reduce((soma, a) => soma + a.valor * (1 + r) ** (diasEntre(a.data, dataFinal) / 365), 0);

  let lo = -0.99;
  let hi = 10;
  for (let k = 0; k < 200; k += 1) {
    const meio = (lo + hi) / 2;
    if (valorFuturo(meio) < valorFinal) lo = meio;
    else hi = meio;
  }
  return ((lo + hi) / 2) * 100;
}
