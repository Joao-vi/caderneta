export const fmtBRL = (v) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const fmtPct = (v, casas = 2) =>
  `${(Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;

export const fmtNum = (v, casas = 0) =>
  (Number.isFinite(v) ? v : 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });
