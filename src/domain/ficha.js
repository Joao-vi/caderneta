import { TRIBUTACOES, rotuloTributacao } from './tributacao.js';
import { fmtPct } from './formato.js';

export const PALETA = [
  '#1E5B41', '#B8862E', '#A23B2E', '#2B4C6F', '#6B4226', '#5C7A5C', '#7A4E9E',
];

export const corDoIndice = (i) => PALETA[i % PALETA.length];

const num = (v, padrao = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : padrao;
};

/** Monta uma ficha a partir dos campos do formulário. */
export function criarFicha(form, cdi, id, indice) {
  const principal = Math.max(0, num(form.principal));
  const aporte = Math.max(0, num(form.aporte));
  const prazo = Math.max(1, Math.round(num(form.prazo, 1)));
  const aliqFixa = Math.min(100, Math.max(0, num(form.aliqFixa)));
  const rolar = form.rolar === true;
  const horizonte = rolar ? Math.max(prazo, Math.round(num(form.horizonte, prazo))) : prazo;

  let taxaAnual;
  let tag;
  if (form.tipo === 'cdi') {
    const pct = num(form.pctCDI);
    taxaAnual = cdi * (pct / 100);
    tag = `${fmtPct(pct, 0)} do CDI`;
  } else {
    taxaAnual = num(form.pre);
    tag = `${fmtPct(taxaAnual, 2)} a.a. prefixado`;
  }

  return {
    id,
    name: String(form.name || '').trim() || `Ficha ${indice + 1}`,
    principal,
    aporte,
    prazo,
    rolar,
    horizonte,
    trib: TRIBUTACOES.includes(form.trib) ? form.trib : 'regressiva',
    aliqFixa,
    taxaAnual,
    tag,
    tribLabel: rotuloTributacao(form.trib, aliqFixa),
    color: corDoIndice(indice),
  };
}

/**
 * Normaliza uma ficha vinda do localStorage. O conteúdo de lá é editável à
 * mão pelo DevTools, então nada entra sem coerção — em especial `color`, que
 * vai direto para um atributo de estilo.
 */
export function normalizarFicha(raw, i) {
  if (!raw || typeof raw !== 'object') return null;
  const prazo = Math.max(1, Math.round(num(raw.prazo, 1)));
  return {
    id: Math.round(num(raw.id, i + 1)),
    name: String(raw.name == null ? `Ficha ${i + 1}` : raw.name).slice(0, 120),
    principal: Math.max(0, num(raw.principal)),
    aporte: Math.max(0, num(raw.aporte)),
    prazo,
    rolar: raw.rolar === true,
    horizonte: Math.max(prazo, Math.round(num(raw.horizonte, prazo))),
    trib: TRIBUTACOES.includes(raw.trib) ? raw.trib : 'regressiva',
    aliqFixa: Math.min(100, Math.max(0, num(raw.aliqFixa))),
    taxaAnual: num(raw.taxaAnual),
    tag: String(raw.tag == null ? '' : raw.tag).slice(0, 80),
    tribLabel: String(raw.tribLabel == null ? '' : raw.tribLabel).slice(0, 80),
    color: /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : corDoIndice(i),
  };
}
