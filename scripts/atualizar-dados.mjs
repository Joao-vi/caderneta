/**
 * Baixa o histórico dos ETFs, do CDI e do IPCA e grava JSONs estáticos em public/dados/.
 *
 * O site é estático e roda só no navegador: o Yahoo não aceita chamadas de
 * outra origem (CORS), então os dados são buscados aqui, no build, e servidos
 * junto com a página. Roda no deploy agendado e localmente com `npm run dados`.
 *
 * Se qualquer fonte falhar, sai com erro sem sobrescrever nada: o deploy segue
 * com os arquivos que já estão no repositório.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ETFS = ['IVVB11', 'NASD11'];
const DADOS_DESDE = 2014; // o IVVB11 começa a ser negociado em abr/2014
const DESTINO = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'dados');

const hoje = new Date().toISOString().slice(0, 10);

async function baixarJson(url) {
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (caderneta)' } });
  if (!resp.ok) throw new Error(`${resp.status} em ${url}`);
  return resp.json();
}

/** Fechamento ajustado diário. Sem period1/period2 o Yahoo devolve semanal ou mensal. */
async function baixarEtf(ticker) {
  const agora = Math.floor(Date.now() / 1000);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SA` +
    `?period1=0&period2=${agora}&interval=1d&events=div,split`;
  const r = (await baixarJson(url)).chart?.result?.[0];
  if (!r?.timestamp) throw new Error(`${ticker}: resposta sem série`);

  const offset = r.meta.gmtoffset ?? -10800;
  const fechamentos = r.indicators.adjclose?.[0]?.adjclose ?? r.indicators.quote[0].close;
  const precos = [];
  r.timestamp.forEach((ts, i) => {
    const preco = fechamentos[i];
    if (preco == null) return; // pregão sem negócio
    const data = new Date((ts + offset) * 1000).toISOString().slice(0, 10);
    // o último ponto pode repetir o dia quando o pregão ainda está aberto
    if (precos.length && precos[precos.length - 1][0] === data) precos.pop();
    precos.push([data, Math.round(preco * 10000) / 10000]);
  });
  if (precos.length < 250) throw new Error(`${ticker}: só ${precos.length} pregões`);

  return { ticker, fonte: 'Yahoo Finance — fechamento ajustado', atualizado: hoje, precos };
}

/** Série do SGS como [[isoData, valor]]. O SGS limita séries diárias a 10 anos por consulta, então vai ano a ano. */
async function baixarSgs(serie) {
  const pontos = [];
  for (let ano = DADOS_DESDE; ano <= new Date().getFullYear(); ano += 1) {
    const url =
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=json` +
      `&dataInicial=01/01/${ano}&dataFinal=31/12/${ano}`;
    for (const { data, valor } of await baixarJson(url)) {
      const [d, m, a] = data.split('/');
      pontos.push([`${a}-${m}-${d}`, Number(valor)]);
    }
  }
  return pontos;
}

/** Série 12: CDI diário em % a.d. */
async function baixarCdi() {
  const taxas = await baixarSgs(12);
  if (taxas.length < 250) throw new Error(`CDI: só ${taxas.length} dias`);
  return { fonte: 'Banco Central — SGS série 12 (CDI, % a.d.)', atualizado: hoje, taxas };
}

/** Série 433: IPCA mensal em % a.m., indexado por 'YYYY-MM' (o mês da inflação). */
async function baixarIpca() {
  const taxas = (await baixarSgs(433)).map(([data, valor]) => [data.slice(0, 7), valor]);
  if (taxas.length < 12) throw new Error(`IPCA: só ${taxas.length} meses`);
  return { fonte: 'Banco Central — SGS série 433 (IPCA, % a.m.)', atualizado: hoje, taxas };
}

const arquivos = {
  'cdi.json': await baixarCdi(),
  'ipca.json': await baixarIpca(),
  ...Object.fromEntries(
    await Promise.all(ETFS.map(async (t) => [`${t}.json`, await baixarEtf(t)])),
  ),
};

await mkdir(DESTINO, { recursive: true });
for (const [nome, conteudo] of Object.entries(arquivos)) {
  await writeFile(join(DESTINO, nome), JSON.stringify(conteudo));
  const n = (conteudo.precos ?? conteudo.taxas).length;
  const ultimo = (conteudo.precos ?? conteudo.taxas).at(-1)[0];
  console.log(`${nome}: ${n} pontos, até ${ultimo}`);
}
