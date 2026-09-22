/**
 * Aporte mensal em ETF sobre o histórico real de cotações.
 *
 * Todo mês, no primeiro pregão, compra-se ao fechamento ajustado daquele dia
 * (cotas fracionárias: interessa o patrimônio, não o lote). Quanto se compra é
 * o aporte planejado vezes a fração daquele mês — 1 para quem é disciplinado,
 * sorteada para quem não é — e zero a partir da parada. O mesmo dinheiro, nas
 * mesmas datas, vai para 100% do CDI como régua de comparação.
 *
 * Tudo é bruto: sem IR, corretagem, custódia ou taxa de administração além da
 * que já está embutida na cota do ETF.
 *
 * Séries de entrada vêm de public/dados: [[isoData, valor], ...] em ordem.
 */
const DIA_MS = 86400000;

const mesDe = (iso) => iso.slice(0, 7);

/** 'YYYY-MM' somado de n meses. */
export function somaMeses(mes, n) {
  const [a, m] = mes.split('-').map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

function mesesEntre(mesA, mesB) {
  const [aA, mA] = mesA.split('-').map(Number);
  const [aB, mB] = mesB.split('-').map(Number);
  return (aB - aA) * 12 + (mB - mA);
}

export function proximoMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
}

function diasEntre(isoA, isoB) {
  return Math.round((Date.parse(isoB) - Date.parse(isoA)) / DIA_MS);
}

/**
 * Primeiro mês com aporte possível. Se o ETF estreou no meio do mês, aquele
 * mês não tem "primeiro pregão" — o primeiro aporte honesto é no seguinte.
 * Até o dia 5 ainda conta: feriado e fim de semana empurram o primeiro pregão
 * do mês para o dia 4 no pior caso (1º de janeiro numa sexta).
 */
export function primeiroMesDisponivel(precos) {
  const [primeiraData] = precos[0];
  const mes = mesDe(primeiraData);
  return Number(primeiraData.slice(8)) <= 5 ? mes : proximoMes(mes);
}

/** Primeiro pregão de cada mês, de `inicio` ('YYYY-MM') até o fim da série. */
export function pregoesDeAporte(precos, inicio) {
  const primeiro = primeiroMesDisponivel(precos);
  const desde = inicio > primeiro ? inicio : primeiro;
  const pregoes = [];
  let mesAtual = null;
  for (const [data, preco] of precos) {
    const mes = mesDe(data);
    if (mes < desde || mes === mesAtual) continue;
    mesAtual = mes;
    pregoes.push({ data, preco });
  }
  return pregoes;
}

/**
 * Fator do CDI entre duas datas. O CDI de um dia remunera a noite seguinte:
 * quem aplica em A e olha o saldo em B ganhou as taxas de A até a véspera de B.
 */
export function criaFatorCdi(taxas) {
  const datas = taxas.map(([d]) => d);
  // acumulado[i] = produto das taxas estritamente anteriores a datas[i]
  const acumulado = [1];
  taxas.forEach(([, taxa], i) => acumulado.push(acumulado[i] * (1 + taxa / 100)));

  const indice = (iso) => {
    let lo = 0;
    let hi = datas.length;
    while (lo < hi) {
      const meio = (lo + hi) >> 1;
      if (datas[meio] < iso) lo = meio + 1;
      else hi = meio;
    }
    return acumulado[lo];
  };
  return (isoA, isoB) => indice(isoB) / indice(isoA);
}

/**
 * TIR anual (base 365) de fluxos datados que valem `valorFinal` em `dataFinal`.
 * Aporte é valor positivo, saque é negativo. Como os saques sempre vêm depois
 * dos aportes, o valor futuro cresce com a taxa e a bisseção converge.
 */
export function tirAnual(fluxos, dataFinal, valorFinal) {
  if (!fluxos.length) return 0;
  const saques = fluxos.some((f) => f.valor < 0);
  if (valorFinal <= 0 && !saques) return -100;

  const valorFuturo = (r) =>
    fluxos.reduce((soma, a) => soma + a.valor * (1 + r) ** (diasEntre(a.data, dataFinal) / 365), 0);

  let lo = -0.99;
  let hi = 10;
  for (let k = 0; k < 200; k += 1) {
    const meio = (lo + hi) / 2;
    if (valorFuturo(meio) < valorFinal) lo = meio;
    else hi = meio;
  }
  return ((lo + hi) / 2) * 100;
}

/**
 * Gerador determinístico (mulberry32) semeado por um texto. Cada mês tem a sua
 * própria semente, então o sorteio de um mês não depende de quando a
 * simulação começa nem de quantos meses vieram antes.
 */
function aleatorio(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i += 1) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fração do aporte planejado que sai num mês, para quem não é disciplinado.
 * Com probabilidade `chancePular` o mês fica sem aporte; senão aporta entre
 * `minimo` e 100%, em degraus de 5% — ninguém aporta 73,4% do planejado.
 */
export function fracaoSorteada(mes, { semente, chancePular, minimo }) {
  const sorteio = aleatorio(`${semente}:${mes}`);
  if (sorteio() < chancePular) return 0;
  const bruta = minimo + (1 - minimo) * sorteio();
  return Math.min(1, Math.max(minimo, Math.round(bruta * 20) / 20));
}

/**
 * Inflação acumulada de `mesA` (inclusive) a `mesB` (exclusive), a partir do
 * IPCA mensal [['YYYY-MM', % a.m.]]. Mês ainda não divulgado conta como zero:
 * a correção usa o que se sabia na data.
 */
export function criaFatorIpca(ipca) {
  const porMes = new Map(ipca);
  return (mesA, mesB) => {
    let fator = 1;
    for (let m = mesA; m < mesB; m = proximoMes(m)) fator *= 1 + (porMes.get(m) ?? 0) / 100;
    return fator;
  };
}

function resumo(carteira, dataFinal, valorFinal) {
  const { aportado, retirado } = carteira;
  return {
    aportado,
    retirado,
    patrimonio: valorFinal,
    ganho: valorFinal + retirado - aportado,
    rentTotal: aportado > 0 ? ((valorFinal + retirado) / aportado - 1) * 100 : 0,
    rentAnual: tirAnual(carteira.fluxos, dataFinal, valorFinal),
    saqueInicial: carteira.saqueBase,
    saqueAtual: carteira.saqueAtual,
    esgotouEm: carteira.esgotouEm,
  };
}

/**
 * Simula o aporte mensal num ETF e, nas mesmas datas, no CDI.
 *
 * `fracao(mes)` diz quanto do aporte planejado sai em cada mês ('YYYY-MM').
 * `parada` ('YYYY-MM') é o primeiro mês sem aporte; dali em diante o
 * patrimônio só reage ao mercado.
 *
 * `retirada` = { inicio: 'YYYY-MM', modo: 'pct' | 'fixo', valor, corrigir }
 * liga a fase de saques, que também encerra os aportes. No modo 'pct' é a
 * regra dos 4%: o saque do primeiro ano é `valor`% a.a. do patrimônio no
 * início, dividido por 12; no 'fixo', `valor` reais por mês. Com `corrigir`, o
 * saque é reajustado pelo IPCA (`ipca`) a cada aniversário — e não recalculado
 * sobre o patrimônio, que é o que faz da regra um teste de "o dinheiro dura?".
 * ETF e CDI aplicam a mesma regra, cada um sobre o próprio saldo.
 *
 * `pontos` tem um ponto por mês (logo após a eventual compra ou venda) e um
 * ponto final no último fechamento disponível, que é onde o `resumo` é apurado.
 */
export function simularAporteMensal({
  precos, taxasCdi, inicio, aporte, fracao = () => 1, parada = null, retirada = null, ipca = [],
}) {
  const pregoes = pregoesDeAporte(precos, inicio);
  const [dataFinal, precoFinal] = precos[precos.length - 1];
  const fatorCdi = criaFatorCdi(taxasCdi);
  const inflacao = criaFatorIpca(ipca);
  const fimAportes = [parada, retirada?.inicio].filter(Boolean).sort()[0] ?? null;

  const nova = () => ({
    saldo: 0, aportado: 0, retirado: 0, fluxos: [], saqueBase: null, saqueAtual: null, esgotouEm: null,
  });
  const etf = nova(); // saldo em cotas
  const cdi = nova(); // saldo em reais

  const saqueDoMes = (carteira, valorAtual, mes) => {
    if (carteira.saqueBase === null) {
      carteira.saqueBase = retirada.modo === 'pct' ? (valorAtual * retirada.valor) / 100 / 12 : retirada.valor;
    }
    const anos = Math.floor(mesesEntre(retirada.inicio, mes) / 12);
    const correcao = retirada.corrigir ? inflacao(retirada.inicio, somaMeses(retirada.inicio, 12 * anos)) : 1;
    // o saque do regulamento, mesmo que o saldo já não cubra
    carteira.saqueAtual = carteira.saqueBase * correcao;
    return Math.min(valorAtual, carteira.saqueAtual);
  };

  /** Movimenta a carteira; `unidade` converte reais na unidade do saldo. */
  const movimenta = (carteira, data, valor, unidade) => {
    if (valor === 0) return;
    carteira.fluxos.push({ data, valor });
    if (valor > 0) {
      carteira.aportado += valor;
      carteira.saldo += valor / unidade;
      return;
    }
    const saque = -valor;
    carteira.retirado += saque;
    // vender tudo zera de verdade, sem resíduo de ponto flutuante
    if (saque >= carteira.saldo * unidade * (1 - 1e-12)) {
      carteira.saldo = 0;
      carteira.esgotouEm ??= data;
    } else {
      carteira.saldo -= saque / unidade;
    }
  };

  let planejado = 0;
  let mesesComAporte = 0;
  let dataAnterior = null;
  const pontos = pregoes.map(({ data, preco }) => {
    const mes = mesDe(data);
    if (dataAnterior) cdi.saldo *= fatorCdi(dataAnterior, data);
    dataAnterior = data;

    const parou = fimAportes !== null && mes >= fimAportes;
    const aporteMes = parou ? 0 : aporte * fracao(mes);
    if (!parou) planejado += aporte;
    if (aporteMes > 0) {
      mesesComAporte += 1;
      movimenta(etf, data, aporteMes, preco);
      movimenta(cdi, data, aporteMes, 1);
    }

    const retirando = retirada !== null && mes >= retirada.inicio;
    let saqueMes = 0;
    let saqueCdi = 0;
    if (retirando) {
      saqueMes = saqueDoMes(etf, etf.saldo * preco, mes);
      saqueCdi = saqueDoMes(cdi, cdi.saldo, mes);
      movimenta(etf, data, -saqueMes, preco);
      movimenta(cdi, data, -saqueCdi, 1);
    }

    return {
      data,
      preco,
      cotas: etf.saldo,
      aporteMes,
      parou,
      retirando,
      saqueMes,
      saqueCdi,
      aportado: etf.aportado,
      retirado: etf.retirado,
      retiradoCdi: cdi.retirado,
      patrimonio: etf.saldo * preco,
      cdi: cdi.saldo,
    };
  });

  const ultimo = pontos[pontos.length - 1];
  if (ultimo && ultimo.data !== dataFinal) {
    pontos.push({
      ...ultimo,
      final: true, // não é pregão de aporte, só a marcação no último fechamento
      data: dataFinal,
      preco: precoFinal,
      aporteMes: 0,
      saqueMes: 0,
      saqueCdi: 0,
      patrimonio: etf.saldo * precoFinal,
      cdi: cdi.saldo * fatorCdi(ultimo.data, dataFinal),
    });
  }

  const fim = pontos[pontos.length - 1];
  return {
    pontos,
    dataFinal,
    planejado,
    mesesComAporte,
    noParar: pontos.find((p) => p.parou) ?? null,
    noRetirar: pontos.find((p) => p.retirando) ?? null,
    etf: resumo(etf, dataFinal, fim ? fim.patrimonio : 0),
    cdi: resumo(cdi, dataFinal, fim ? fim.cdi : 0),
  };
}
