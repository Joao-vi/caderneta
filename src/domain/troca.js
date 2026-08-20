import { aliquotaIR, iofSobre } from './tributacao.js';

/**
 * "Vale a troca?" — tirar uma fatia de um investimento e colocar numa oferta
 * curta com teto, sabendo que no vencimento o dinheiro volta.
 *
 * A comparação é sobre um HORIZONTE COMUM, não sobre os vencimentos de cada
 * um. É isso que revela o custo escondido: resgatar no dia 90 paga IR na
 * faixa mais cara e reinicia a contagem da tabela regressiva, e o ganho da
 * oferta só age durante o prazo dela.
 */

/** Aplica uma taxa por um prazo e devolve o líquido já com IOF e IR. */
export function evolui(valor, taxaAnual, dias, trib, aliqFixa = 0) {
  const bruto = valor * (1 + taxaAnual / 100) ** (dias / 365);
  const rend = bruto - valor;
  const iof = iofSobre(rend, dias);
  const ir = Math.max(0, rend - iof) * (aliquotaIR(dias, trib, aliqFixa) / 100);
  return { bruto, rend, iof, ir, liquido: valor + rend - iof - ir };
}

/** Cenário A: o dinheiro não sai do lugar até o fim do horizonte. */
export function simularFicar(valor, cfg, horizonte) {
  return evolui(valor, cfg.taxaOrigem, horizonte, cfg.tribOrigem, cfg.aliqOrigem);
}

/** Cenário B: vai para a oferta, resgata no vencimento e volta. */
export function simularTrocar(valor, cfg, horizonte, taxaOferta) {
  const taxa = taxaOferta === undefined ? cfg.taxaOferta : taxaOferta;
  const p1 = evolui(valor, taxa, cfg.prazo, cfg.tribOferta, cfg.aliqOferta);
  if (horizonte <= cfg.prazo) {
    return { rend: p1.rend, iof: p1.iof, irOferta: p1.ir, irFinal: 0, liquido: p1.liquido, pernas: 1 };
  }
  const p2 = evolui(
    p1.liquido,
    cfg.taxaReaplicacao,
    horizonte - cfg.prazo,
    cfg.tribOrigem,
    cfg.aliqOrigem,
  );
  return {
    rend: p1.rend + p2.rend,
    iof: p1.iof + p2.iof,
    irOferta: p1.ir,
    irFinal: p2.ir,
    liquido: p2.liquido,
    pernas: 2,
  };
}

/**
 * Que % do CDI, parado na origem, daria o mesmo líquido da manobra?
 * É o número que desmascara os "130%": esticado o horizonte, ele desaba.
 */
export function equivalentePctCDI(alvo, valor, cfg, horizonte, cdi) {
  if (cdi <= 0) return null;
  let lo = 0;
  let hi = 10;
  for (let k = 0; k < 80; k += 1) {
    const meio = (lo + hi) / 2;
    const liq = evolui(valor, cdi * meio, horizonte, cfg.tribOrigem, cfg.aliqOrigem).liquido;
    if (liq < alvo) lo = meio;
    else hi = meio;
  }
  return lo * 100;
}

/** Taxa mínima (% a.a.) que a oferta precisaria pagar para empatar. */
export function taxaMinimaOferta(valor, cfg, horizonte) {
  const alvo = simularFicar(valor, cfg, horizonte).liquido;
  let lo = 0;
  let hi = 300;
  if (simularTrocar(valor, cfg, horizonte, hi).liquido < alvo) return null;
  for (let k = 0; k < 80; k += 1) {
    const meio = (lo + hi) / 2;
    if (simularTrocar(valor, cfg, horizonte, meio).liquido < alvo) lo = meio;
    else hi = meio;
  }
  return hi;
}

/** Faixa de empate técnico: abaixo disso a diferença é ruído, não decisão. */
export const LIMIAR_EMPATE = 0.001;

export function veredito(delta, valor) {
  const limiar = valor * LIMIAR_EMPATE;
  if (delta > limiar) return 'vale';
  if (delta < -limiar) return 'nao-vale';
  return 'empate';
}
