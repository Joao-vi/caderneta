/**
 * Aporte recorrente em bitcoin sobre o histórico real de cotações, em dólar.
 *
 * O usuário informa um **orçamento mensal** e uma frequência; o valor de cada
 * aporte é o orçamento dividido pelo número de aportes que cabem no mês, para
 * que mensal, semanal e diário gastem o mesmo dinheiro no mesmo período. Sem
 * essa normalização a comparação não seria entre frequências, seria entre
 * quantias — e a que aportasse mais, ganharia.
 *
 * Tudo em USD e tudo bruto: sem IR, spread de corretora ou taxa de rede. Não
 * há benchmark de renda fixa aqui de propósito — o CDI é em reais, e comparar
 * com ele misturaria o efeito do câmbio com o efeito do ativo.
 */
import { APORTES_POR_ANO, calendarioDeAportes, diasNoMes } from './calendario.js';
import { tirAnual } from './tir.js';

/** Quanto sai em cada aporte para o orçamento mensal fechar. */
export function valorPorAporte(orcamentoMensal, frequencia) {
  return (orcamentoMensal * 12) / APORTES_POR_ANO[frequencia];
}

/**
 * Caminha a série dia a dia a partir do primeiro aporte, comprando nas datas
 * do calendário. Devolve um ponto por dia — é o que permite sobrepor no mesmo
 * eixo fichas de frequências diferentes, que não compartilham datas de compra.
 */
function acumular(precos, eventos, valor) {
  if (!eventos.length) return { serie: [], btc: 0, aportado: 0, fluxos: [] };

  const compraEm = new Map(eventos.map((e) => [e.data, e]));
  const desde = eventos[0].data;
  const serie = [];
  const fluxos = [];
  let btc = 0;
  let aportado = 0;

  for (const [data, preco] of precos) {
    if (data < desde) continue;
    if (compraEm.has(data)) {
      btc += valor / preco;
      aportado += valor;
      fluxos.push({ data, valor });
    }
    // `multiplo` é o patrimônio por dólar aportado. É a única forma justa de
    // comparar planos: a série raramente acaba num fim de período, então duas
    // frequências gastam totais ligeiramente diferentes, e em valor absoluto
    // quem gastou mais "ganha" sem ter escolhido melhor.
    serie.push({
      data, preco, btc, aportado, patrimonio: btc * preco, multiplo: (btc * preco) / aportado,
    });
  }
  return { serie, btc, aportado, fluxos };
}

/** Maior queda do patrimônio de um pico até o vale seguinte, em %. */
export function quedaMaxima(serie) {
  let pico = 0;
  let queda = 0;
  let fundo = null;
  for (const p of serie) {
    if (p.patrimonio > pico) pico = p.patrimonio;
    if (pico <= 0) continue;
    const atual = (1 - p.patrimonio / pico) * 100;
    if (atual > queda) {
      queda = atual;
      fundo = p.data;
    }
  }
  return { queda, fundo };
}

/**
 * Média aritmética dos preços do período — a régua do preço médio pago.
 *
 * Comprar sempre o mesmo valor em dólar faz o preço médio pago ser a média
 * *harmônica* dos preços das datas de compra, que é sempre menor ou igual à
 * aritmética das mesmas datas. Esse é o único ganho do aporte recorrente que
 * vale como teorema, e não como palpite: não é que ele acerte o fundo, é que
 * compra mais moeda quando está barato.
 *
 * Só no aporte diário os dois conjuntos de datas coincidem e a desigualdade é
 * garantida. No mensal e no semanal isto aqui é o preço médio do *mercado* no
 * período, que é uma régua honesta — mas não um teorema.
 */
export function precoMedioDoPeriodo(serie) {
  if (!serie.length) return 0;
  return serie.reduce((soma, p) => soma + p.preco, 0) / serie.length;
}

/**
 * Simula um plano de aportes. `frequencia` é 'mensal' | 'semanal' | 'diaria';
 * `dia` é o dia do mês (1–31) ou da semana (0–6), ou `null` para "tanto faz".
 */
export function simularAporteBtc({ precos, frequencia, dia = null, inicio = null, orcamentoMensal }) {
  const valor = valorPorAporte(orcamentoMensal, frequencia);
  const eventos = calendarioDeAportes(precos, { frequencia, dia, inicio });
  const { serie, btc, aportado, fluxos } = acumular(precos, eventos, valor);

  if (!serie.length) {
    return { eventos, serie, valor, resumo: null };
  }

  const fim = serie[serie.length - 1];
  const precos_ = eventos.map((e) => e.preco);
  const barato = Math.min(...precos_);
  const caro = Math.max(...precos_);
  const { queda, fundo } = quedaMaxima(serie);

  return {
    eventos,
    serie,
    valor,
    resumo: {
      nAportes: eventos.length,
      primeiro: eventos[0].data,
      ultimo: fim.data,
      aportado,
      btc,
      patrimonio: fim.patrimonio,
      ganho: fim.patrimonio - aportado,
      precoFinal: fim.preco,
      precoMedio: btc > 0 ? aportado / btc : 0,
      precoMedioMercado: precoMedioDoPeriodo(serie),
      melhor: eventos.find((e) => e.preco === barato),
      pior: eventos.find((e) => e.preco === caro),
      quedaMaxima: queda,
      fundoEm: fundo,
      multiplo: fim.multiplo,
      rentTotal: aportado > 0 ? (fim.patrimonio / aportado - 1) * 100 : 0,
      rentAnual: tirAnual(fluxos, fim.data, fim.patrimonio),
    },
  };
}

/**
 * Todas as variações possíveis do mesmo orçamento: os 31 dias do mês, os 7 da
 * semana e o diário. É a faixa de ruído — a prova visual de que escolher o dia
 * ou a frequência mexe o resultado muito menos do que parece, e que quem
 * ficasse na melhor escolha do passado estaria só sobreajustando a ela.
 *
 * O envelope sai no eixo diário, que é o único que as variantes compartilham, e
 * em **múltiplo do investido**, não em dólar. Em dólar a faixa mediria de
 * quebra a diferença de quanto cada variante gastou — num teste com preço
 * parado, onde a escolha não pode importar, a faixa em dólar ainda abria 6%.
 * Em múltiplo ela fecha em zero, como tem de ser.
 */
export function faixaDeRuido({ precos, inicio = null, orcamentoMensal }) {
  const planos = [
    ...Array.from({ length: 31 }, (_, i) => ({ frequencia: 'mensal', dia: i + 1 })),
    ...Array.from({ length: 7 }, (_, i) => ({ frequencia: 'semanal', dia: i })),
    { frequencia: 'diaria', dia: null },
  ];

  const variantes = planos
    .map((p) => ({ ...p, ...simularAporteBtc({ ...p, precos, inicio, orcamentoMensal }) }))
    .filter((v) => v.resumo !== null);
  if (!variantes.length) return null;

  const porData = new Map();
  for (const v of variantes) {
    for (const p of v.serie) {
      const faixa = porData.get(p.data);
      if (!faixa) porData.set(p.data, { data: p.data, minimo: p.multiplo, maximo: p.multiplo });
      else {
        if (p.multiplo < faixa.minimo) faixa.minimo = p.multiplo;
        if (p.multiplo > faixa.maximo) faixa.maximo = p.multiplo;
      }
    }
  }

  // ranqueado pelo preço médio pago, que já é por dólar: mais barato, melhor
  const porPreco = [...variantes].sort((a, b) => a.resumo.precoMedio - b.resumo.precoMedio);
  const melhorPlano = porPreco[0];
  const piorPlano = porPreco[porPreco.length - 1];

  return {
    envelope: [...porData.values()].sort((a, b) => (a.data < b.data ? -1 : 1)),
    variantes,
    melhorPlano,
    piorPlano,
    // quanto o melhor plano do passado pagou mais barato que o pior, em %
    spread: melhorPlano.resumo.precoMedio > 0
      ? (piorPlano.resumo.precoMedio / melhorPlano.resumo.precoMedio - 1) * 100
      : 0,
  };
}

/** Quantos aportes cabem num mês nessa frequência — para o texto do formulário. */
export function aportesPorMes(frequencia, mes) {
  if (frequencia === 'mensal') return 1;
  if (frequencia === 'semanal') return APORTES_POR_ANO.semanal / 12;
  return mes ? diasNoMes(mes) : APORTES_POR_ANO.diaria / 12;
}

/** Mediana de uma lista de números. */
function mediana(xs) {
  const ordenada = [...xs].sort((a, b) => a - b);
  const meio = Math.floor(ordenada.length / 2);
  return ordenada.length % 2 ? ordenada[meio] : (ordenada[meio - 1] + ordenada[meio]) / 2;
}

const espalhamento = (precos) =>
  (precos.length && Math.min(...precos) > 0 ? (Math.max(...precos) / Math.min(...precos) - 1) * 100 : 0);

/**
 * Separa o ruído em suas fontes: o dia do mês, o dia da semana e a frequência.
 *
 * A frequência é comparada pela *mediana* de cada uma, não pela melhor de cada
 * uma. Comparar as melhores mediria de novo a sorte na escolha do dia, que é
 * justamente o que se quer isolar. O resultado costuma surpreender: o dia
 * arbitrário do mês mexe mais no resultado do que a decisão entre mensal,
 * semanal e diário.
 */
export function decomposicaoDoRuido(faixa) {
  if (!faixa) return null;
  const precoDe = (v) => v.resumo.precoMedio;
  const daFrequencia = (f) => faixa.variantes.filter((v) => v.frequencia === f).map(precoDe);

  const mensais = daFrequencia('mensal');
  const semanais = daFrequencia('semanal');
  const diarios = daFrequencia('diaria');

  return {
    porDiaDoMes: espalhamento(mensais),
    porDiaDaSemana: espalhamento(semanais),
    entreFrequencias: espalhamento(
      [mensais, semanais, diarios].filter((xs) => xs.length).map(mediana),
    ),
  };
}
