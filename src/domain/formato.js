export const fmtBRL = (v) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtPct = (v, casas = 2) =>
  `${(Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;

export const fmtNum = (v, casas = 0) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });

/** O módulo de bitcoin é sempre em dólar — a cotação do BTC é cotada em USD. */
export const fmtUSD = (v, casas = 2) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

/** Bitcoin com 6 casas: abaixo disso um aporte pequeno some no arredondamento. */
export const fmtBTC = (v, casas = 6) =>
  `${(Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })} BTC`;
