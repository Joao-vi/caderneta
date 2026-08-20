import { normalizarFicha } from './ficha.js';

export const STORAGE_KEY = 'caderneta.v1';

/** Nunca lança: em aba anônima ou com cota cheia a calculadora segue sem persistir. */
export function salvarEstado(estado) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, ...estado }));
    return true;
  } catch {
    return false;
  }
}

export function carregarEstado() {
  let dados;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    dados = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!dados || dados.v !== 1 || !Array.isArray(dados.items)) return null;

  const items = dados.items.map(normalizarFicha).filter(Boolean);
  const cdi = Number(dados.cdi);
  return {
    items,
    seq: Math.max(
      Number.isFinite(Number(dados.seq)) ? Math.round(Number(dados.seq)) : 0,
      items.reduce((m, i) => Math.max(m, i.id), 0),
    ),
    cdi: Number.isFinite(cdi) && cdi >= 0 ? cdi : null,
  };
}

export function limparEstado() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nada a fazer */
  }
}
