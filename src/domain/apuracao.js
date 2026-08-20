import { aliquotaIR, iofSobre } from './tributacao.js';

/**
 * Apuração de uma ficha de renda fixa.
 *
 * Dois conceitos carregam quase toda a complexidade:
 *
 * 1. LOTE — cada aporte tem seu próprio relógio de IR. Numa ficha de 720 dias
 *    o capital inicial fica 720 dias (17,5%) e o aporte do mês 23 fica 30
 *    (22,5%). Apurar o agregado numa faixa só erra o imposto.
 *
 * 2. CICLO — com rolagem, ao vencer o líquido vira o capital do ciclo
 *    seguinte. O imposto pago ali é definitivo e reduz o que segue rendendo.
 *    Num isento isso não custa nada; num tributado, prende a alíquota na
 *    faixa do ciclo curto e ela nunca desce.
 */

/** Sem rolagem, o horizonte é o próprio prazo. */
export function horizonteDe(item) {
  return item.rolar ? Math.max(item.prazo, item.horizonte || item.prazo) : item.prazo;
}

/** Lotes vivos dentro de um ciclo, `dia` dias após sua abertura. */
export function lotesAte(item, dia) {
  const lotes = [];
  if (item.principal > 0) lotes.push({ valor: item.principal, dias: dia });
  const aporte = item.aporte || 0;
  if (aporte > 0) {
    for (let d = 30; d < item.prazo && d <= dia; d += 30) {
      lotes.push({ valor: aporte, dias: dia - d });
    }
  }
  return lotes;
}

/** Apura UM ciclo isolado, `dia` dias após sua abertura. */
export function apuraCiclo(item, dia) {
  let aportado = 0;
  let rend = 0;
  let iof = 0;
  let ir = 0;
  for (const lote of lotesAte(item, dia)) {
    const bruto = lote.valor * (1 + item.taxaAnual / 100) ** (lote.dias / 365);
    const r = bruto - lote.valor;
    const i = iofSobre(r, lote.dias);
    aportado += lote.valor;
    rend += r;
    iof += i;
    ir += Math.max(0, r - i) * (aliquotaIR(lote.dias, item.trib, item.aliqFixa) / 100);
  }
  return { aportado, rend, iof, ir, liquido: aportado + rend - iof - ir };
}

/**
 * Apura a posição inteira num dia qualquer, percorrendo a linha do tempo em
 * ciclos.
 *
 * `posicao` é o que está na conta: só o imposto já realizado numa rolagem
 * saiu de lá. `liquido` é o que sobraria resgatando naquele dia, também
 * descontado o imposto ainda pendente do ciclo em aberto. A distinção evita
 * que a curva de evolução despenque no resgate final.
 */
export function apuraAte(item, dia) {
  const horizonte = horizonteDe(item);
  const ate = Math.max(0, Math.min(dia, horizonte));
  const ciclo = Math.max(1, item.prazo);

  let capital = item.principal;
  let aportado = item.principal;
  let rend = 0;
  let iofRolagem = 0;
  let irRolagem = 0;
  let iofPendente = 0;
  let irPendente = 0;
  let inicio = 0;

  while (inicio < ate) {
    const fim = Math.min(inicio + ciclo, horizonte);
    // só há rolagem em vencimento intermediário; o último é resgate
    const rola = ate >= fim && fim < horizonte;
    const sub = {
      principal: capital,
      aporte: item.aporte,
      prazo: fim - inicio,
      taxaAnual: item.taxaAnual,
      trib: item.trib,
      aliqFixa: item.aliqFixa,
    };
    const ciclado = apuraCiclo(sub, Math.min(ate, fim) - inicio);

    aportado += ciclado.aportado - capital; // só os aportes novos do ciclo
    rend += ciclado.rend;

    if (!rola) {
      iofPendente = ciclado.iof;
      irPendente = ciclado.ir;
      break;
    }
    iofRolagem += ciclado.iof;
    irRolagem += ciclado.ir;
    capital = ciclado.liquido;
    inicio = fim;
  }

  const posicao = aportado + rend - iofRolagem - irRolagem;
  return {
    aportado,
    rend,
    iof: iofRolagem + iofPendente,
    ir: irRolagem + irPendente,
    posicao,
    liquido: posicao - iofPendente - irPendente,
  };
}

/**
 * Com aportes ou rolagem, (líquido/aportado)^(365/prazo) mente: o dinheiro do
 * último mês não trabalhou o prazo inteiro. A taxa anual honesta é a TIR do
 * fluxo de caixa real até o horizonte.
 */
export function taxaLiquidaAnual(item, liquido) {
  const horizonte = horizonteDe(item);
  const fluxos = lotesAte(
    { principal: item.principal, aporte: item.aporte, prazo: horizonte },
    horizonte,
  );
  if (!fluxos.length) return 0;
  if (liquido <= 0) return -100;

  const valorFuturo = (r) =>
    fluxos.reduce((soma, l) => soma + l.valor * (1 + r) ** (l.dias / 365), 0);

  let lo = -0.99;
  let hi = 10;
  for (let k = 0; k < 200; k += 1) {
    const meio = (lo + hi) / 2;
    if (valorFuturo(meio) < liquido) lo = meio;
    else hi = meio;
  }
  return ((lo + hi) / 2) * 100;
}

/** Resultado completo de uma ficha no seu horizonte. */
export function calcular(item, cdi) {
  const a = apuraAte(item, horizonteDe(item));
  // com aportes ou rolagem a alíquota vira média ponderada dos lotes
  const aliqIR =
    a.rend > 0
      ? (a.ir / a.rend) * 100
      : aliquotaIR(horizonteDe(item), item.trib, item.aliqFixa);
  const rentLiqTotal = a.aportado > 0 ? (a.liquido / a.aportado - 1) * 100 : 0;
  const rentLiqAnual = taxaLiquidaAnual(item, a.liquido);
  const pctCDILiquido = cdi > 0 ? (rentLiqAnual / cdi) * 100 : 0;

  return {
    aportado: a.aportado,
    posicao: a.posicao,
    rendBruto: a.rend,
    iof: a.iof,
    aliqIR,
    ir: a.ir,
    liquido: a.liquido,
    rentLiqTotal,
    rentLiqAnual,
    pctCDILiquido,
  };
}
