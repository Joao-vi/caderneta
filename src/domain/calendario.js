/**
 * Quando os aportes acontecem, sobre uma série de preços [[isoData, preco]].
 *
 * Três frequências, e em todas a regra é a mesma: existe uma *data-alvo* por
 * período e o aporte cai na primeira cotação a partir dela. Na B3 isso pula
 * feriado e fim de semana; no bitcoin, que negocia todo dia, a data-alvo é
 * sempre a própria.
 *
 * Um período só conta se a série cobre a data-alvo dele. Sem essa guarda, um
 * ETF que estreou no dia 20 registraria um "aporte do dia 5" no dia 20 e
 * inventaria uma compra que não daria para fazer.
 */
export const FREQUENCIAS = ['mensal', 'semanal', 'diaria'];

/** Quantos aportes cabem num ano. É o que normaliza o orçamento entre frequências. */
export const APORTES_POR_ANO = { mensal: 12, semanal: 52, diaria: 365 };

const DIA_MS = 86400000;

const diaDoMes = (iso) => Number(iso.slice(8, 10));
const mesDe = (iso) => iso.slice(0, 7);

/** Dia da semana em UTC: 0 domingo … 6 sábado. Sem fuso, a data ISO é a verdade. */
export function diaDaSemana(iso) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** Quantos dias tem o mês de 'YYYY-MM'. */
export function diasNoMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/**
 * Data da última ocorrência de `dia` da semana em `iso`, inclusive. É a chave
 * da semana: todas as cotações entre uma âncora e a seguinte caem no mesmo
 * período, então feriado na âncora empurra o aporte sem duplicar a semana.
 */
export function ancoraDaSemana(iso, dia) {
  const recuo = (diaDaSemana(iso) - dia + 7) % 7;
  return new Date(Date.parse(iso) - recuo * DIA_MS).toISOString().slice(0, 10);
}

/** Data-alvo do mês, com o dia preso ao fim do mês: não existe 31 de fevereiro. */
export function alvoDoMes(mes, dia) {
  return `${mes}-${String(Math.min(dia, diasNoMes(mes))).padStart(2, '0')}`;
}

function calendarioMensal(precos, dia) {
  // dia === null é "o primeiro pregão do mês", que é o que o módulo de ETF usa.
  // A tolerância de 5 dias existe porque feriado e fim de semana empurram o
  // primeiro pregão para o dia 4 no pior caso (1º de janeiro numa sexta).
  const [primeiraData] = precos[0];
  const porMes = new Map();
  for (const [data, preco] of precos) {
    const mes = mesDe(data);
    if (!porMes.has(mes)) porMes.set(mes, []);
    porMes.get(mes).push([data, preco]);
  }

  const eventos = [];
  for (const [mes, cotacoes] of porMes) {
    if (dia === null) {
      if (mes === mesDe(primeiraData) && diaDoMes(primeiraData) > 5) continue;
      const [data, preco] = cotacoes[0];
      eventos.push({ data, preco, periodo: mes });
      continue;
    }
    const alvo = alvoDoMes(mes, dia);
    if (primeiraData > alvo) continue; // a série ainda não existia na data-alvo
    // a partir do alvo; se o mês acabou antes (feriado no fim), a última do mês
    const [data, preco] = cotacoes.find(([d]) => d >= alvo) ?? cotacoes[cotacoes.length - 1];
    eventos.push({ data, preco, periodo: mes });
  }
  return eventos;
}

function calendarioSemanal(precos, dia) {
  const [primeiraData] = precos[0];
  const eventos = [];
  let ancoraAtual = null;
  for (const [data, preco] of precos) {
    const ancora = ancoraDaSemana(data, dia);
    if (ancora === ancoraAtual) continue;
    ancoraAtual = ancora;
    if (primeiraData > ancora) continue; // semana cortada ao meio pela estreia
    eventos.push({ data, preco, periodo: ancora });
  }
  return eventos;
}

/**
 * Datas de aporte de `precos`, já filtradas por `inicio` ('YYYY-MM').
 *
 * - `mensal` com `dia` 1–31, ou `null` para o primeiro pregão do mês
 * - `semanal` com `dia` 0–6 (domingo a sábado)
 * - `diaria`: toda cotação da série
 */
export function calendarioDeAportes(precos, { frequencia, dia = null, inicio = null }) {
  if (!precos?.length) return [];
  let eventos;
  if (frequencia === 'diaria') {
    eventos = precos.map(([data, preco]) => ({ data, preco, periodo: data }));
  } else if (frequencia === 'semanal') {
    eventos = calendarioSemanal(precos, dia ?? 1);
  } else {
    eventos = calendarioMensal(precos, dia);
  }
  return inicio ? eventos.filter((e) => mesDe(e.data) >= inicio) : eventos;
}

/**
 * Primeiro mês em que dá para aportar com esses parâmetros. Depende do `dia`:
 * num ETF que estreou no dia 20, o aporte do dia 5 só começa no mês seguinte.
 */
export function primeiroPeriodoDisponivel(precos, { frequencia, dia = null }) {
  const [primeiro] = calendarioDeAportes(precos, { frequencia, dia });
  return primeiro ? mesDe(primeiro.data) : null;
}
