import { apuraAte, horizonteDe } from './apuracao.js';

/** Meses cobertos pelo horizonte. `ceil`, não `round`: com round um prazo de
 *  365 dias pararia a curva no dia 360, sem chegar ao vencimento. */
export function mesesDe(item) {
  return Math.max(1, Math.ceil(horizonteDe(item) / 30));
}

/** Evolução da posição mês a mês (o que está na conta). */
export function serieValor(item) {
  const horizonte = horizonteDe(item);
  const pontos = [];
  for (let m = 0; m <= mesesDe(item); m += 1) {
    pontos.push({ x: m, y: apuraAte(item, Math.min(horizonte, m * 30)).posicao });
  }
  return pontos;
}

/**
 * Juros gerados DENTRO de um mês, não o acumulado.
 *
 * No modo líquido é o que sobraria daquele rendimento se a posição inteira
 * fosse resgatada no fim do mês. A soma das barras líquidas não fecha com o
 * líquido final — cada mês é tributado na alíquota da época, não na final —
 * mas a leitura ("rendi X, sobram Y") é a que responde à pergunta.
 */
export function jurosDoMes(item, m, modo = 'bruto') {
  const horizonte = horizonteDe(item);
  const d1 = Math.min(horizonte, (m - 1) * 30);
  const d2 = Math.min(horizonte, m * 30);
  if (d1 >= horizonte) return null; // ficha já venceu: sem barra

  const a1 = apuraAte(item, d1);
  const a2 = apuraAte(item, d2);
  const bruto = a2.rend - a1.rend;
  if (modo === 'bruto') return bruto;

  const sobra = a2.rend > 0 ? (a2.rend - a2.iof - a2.ir) / a2.rend : 1;
  return bruto * sobra;
}
