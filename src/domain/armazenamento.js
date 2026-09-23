import { normalizarFicha } from './ficha.js';
import { normalizarFichaBtc } from './fichaBtc.js';

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

/* ── Aporte mensal em ETF: só os parâmetros do formulário, chave própria ── */

export const STORAGE_KEY_ETF = 'caderneta.aporteEtf.v1';
const ATIVOS_ETF = ['IVVB11', 'NASD11', 'ambos'];

export function salvarParamsEtf(params) {
  try {
    localStorage.setItem(STORAGE_KEY_ETF, JSON.stringify(params));
  } catch {
    /* segue sem persistir */
  }
}

/** Devolve só os campos válidos; o componente completa o resto com os padrões. */
export function carregarParamsEtf() {
  let dados;
  try {
    dados = JSON.parse(localStorage.getItem(STORAGE_KEY_ETF));
  } catch {
    return {};
  }
  if (!dados || typeof dados !== 'object') return {};

  const params = {};
  if (ATIVOS_ETF.includes(dados.ativos)) params.ativos = dados.ativos;
  const aporte = Number(dados.aporte);
  if (Number.isFinite(aporte) && aporte > 0) params.aporte = aporte;
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (mes.test(dados.inicio)) params.inicio = dados.inicio;
  for (const campo of ['parada', 'retiradaInicio']) {
    if (mes.test(dados[campo])) params[campo] = dados[campo];
  }
  for (const campo of ['parar', 'retirar', 'corrigir']) {
    if (typeof dados[campo] === 'boolean') params[campo] = dados[campo];
  }
  if (dados.retiradaModo === 'pct' || dados.retiradaModo === 'fixo') params.retiradaModo = dados.retiradaModo;
  for (const campo of ['retiradaPct', 'retiradaFixo']) {
    const v = Number(dados[campo]);
    if (dados[campo] !== '' && Number.isFinite(v) && v >= 0) params[campo] = v;
  }
  if (dados.regularidade === 'fixo' || dados.regularidade === 'variavel') params.regularidade = dados.regularidade;
  for (const campo of ['chancePular', 'minimo']) {
    const v = Number(dados[campo]);
    if (dados[campo] !== '' && Number.isFinite(v) && v >= 0 && v <= 100) params[campo] = v;
  }
  if (Number.isInteger(dados.semente)) params.semente = dados.semente;
  return params;
}

/* ── Fichas de aporte em bitcoin: lista própria, chave própria ── */

export const STORAGE_KEY_BTC = 'caderneta.btc.v1';

export function salvarEstadoBtc(estado) {
  try {
    localStorage.setItem(STORAGE_KEY_BTC, JSON.stringify({ v: 1, ...estado }));
    return true;
  } catch {
    return false;
  }
}

export function carregarEstadoBtc() {
  let dados;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BTC);
    if (!raw) return null;
    dados = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!dados || dados.v !== 1 || !Array.isArray(dados.items)) return null;

  const items = dados.items.map(normalizarFichaBtc).filter(Boolean);
  return {
    items,
    seq: Math.max(
      Number.isFinite(Number(dados.seq)) ? Math.round(Number(dados.seq)) : 0,
      items.reduce((m, i) => Math.max(m, i.id), 0),
    ),
  };
}

export function limparEstadoBtc() {
  try {
    localStorage.removeItem(STORAGE_KEY_BTC);
  } catch {
    /* nada a fazer */
  }
}
