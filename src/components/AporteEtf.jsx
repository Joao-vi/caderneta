import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  fracaoSorteada, primeiroMesDisponivel, proximoMes, simularAporteMensal,
} from '../domain/aporteEtf.js';
import { carregarParamsEtf, salvarParamsEtf } from '../domain/armazenamento.js';
import { fmtBRL, fmtNum, fmtPct } from '../domain/formato.js';
import { ETFS, useDadosEtf } from '../hooks/useDadosEtf.js';
import { eixoBase } from './chartSetup.js';
import {
  Campo, Painel, Seg, SeletorMes, Select, UnitInput, rotuloData, rotuloMes,
} from './ui.jsx';

const CORES = {
  IVVB11: '#1E5B41', NASD11: '#2B4C6F', cdi: '#B8862E', aportado: '#4B5B50', retirado: '#A23B2E',
};
const NOMES = { IVVB11: 'IVVB11 · S&P 500', NASD11: 'NASD11 · Nasdaq-100' };

function mesesAtras(n) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const PADRAO = {
  ativos: 'IVVB11',
  aporte: 1000,
  inicio: mesesAtras(60),
  regularidade: 'fixo',
  chancePular: 20,
  minimo: 50,
  semente: 1,
  parar: false,
  parada: mesesAtras(24),
  retirar: false,
  retiradaInicio: mesesAtras(12),
  retiradaModo: 'pct',
  retiradaPct: 4,
  retiradaFixo: 3000,
  corrigir: true,
};

const entre = (v, min, max) => (v < min ? min : v > max ? max : v);

/** Linhas verticais nas datas em que os aportes param e as retiradas começam. */
const marcos = {
  id: 'marcos',
  afterDatasetsDraw(chart, _args, opcoes) {
    const { top, bottom } = chart.chartArea;
    const { ctx } = chart;
    (opcoes.lista ?? []).forEach(({ indice, texto, cor }, i) => {
      const x = chart.scales.x.getPixelForValue(indice);
      ctx.save();
      ctx.strokeStyle = cor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.fillStyle = cor;
      ctx.font = '600 11px "IBM Plex Sans", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(texto, x - 6, top + 12 + i * 14);
      ctx.restore();
    });
  },
};

/** A parada só conta como parada se veio antes das retiradas (que também encerram os aportes). */
function paradaDe(sim) {
  const { noParar, noRetirar } = sim;
  return noParar && (!noRetirar || noParar.data < noRetirar.data) ? noParar : null;
}

function Traco({ cor, tracejado }) {
  return (
    <span
      className={`inline-block h-0 w-4 border-t-[3px] ${tracejado ? 'border-dashed' : ''}`}
      style={{ borderColor: cor }}
    />
  );
}

const th = 'border-b border-line bg-paper-alt px-3 py-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft';
const td = 'border-b border-line px-3 py-3 text-[13.5px]';
const num = `${td} text-right font-mono tabular`;

function Tabela({ rotulo, colunas, children, larga }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table aria-label={rotulo} className={`w-full border-collapse ${larga ? 'min-w-[760px]' : 'min-w-[620px]'}`}>
        <thead>
          <tr>
            {colunas.map((c, i) => (
              <th key={c} className={`${th} ${i === 0 ? 'text-left' : 'text-right'}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Nome({ nome, cor, tracejado }) {
  return (
    <td className={`${td} font-semibold`}>
      <span className="flex items-center gap-2">
        <Traco cor={cor} tracejado={tracejado} />
        {nome}
      </span>
    </td>
  );
}

function Linha({ r, comRetirado, ...nome }) {
  return (
    <tr>
      <Nome {...nome} />
      <td className={num}>{fmtBRL(r.aportado)}</td>
      {comRetirado && <td className={num}>{fmtBRL(r.retirado)}</td>}
      <td className={`${num} font-bold text-green-deep`}>{fmtBRL(r.patrimonio)}</td>
      <td className={`${num} ${r.ganho < 0 ? 'text-brick' : ''}`}>{fmtBRL(r.ganho)}</td>
      <td className={num}>{fmtPct(r.rentTotal, 1)}</td>
      <td className={num}>{fmtPct(r.rentAnual, 2)}</td>
    </tr>
  );
}

function LinhaParada({ naParada, hoje, ...nome }) {
  const variacao = hoje - naParada;
  const pct = naParada > 0 ? (hoje / naParada - 1) * 100 : 0;
  const tom = variacao < 0 ? 'text-brick' : '';
  return (
    <tr>
      <Nome {...nome} />
      <td className={num}>{fmtBRL(naParada)}</td>
      <td className={`${num} font-bold text-green-deep`}>{fmtBRL(hoje)}</td>
      <td className={`${num} ${tom}`}>{fmtBRL(variacao)}</td>
      <td className={`${num} ${tom}`}>{fmtPct(pct, 1)}</td>
    </tr>
  );
}

function LinhaRetirada({ noInicio, r, ...nome }) {
  return (
    <tr>
      <Nome {...nome} />
      <td className={num}>{fmtBRL(noInicio)}</td>
      <td className={num}>{fmtBRL(r.saqueInicial)}</td>
      <td className={num}>{fmtBRL(r.saqueAtual)}</td>
      <td className={num}>{fmtBRL(r.retirado)}</td>
      <td className={`${num} font-bold text-green-deep`}>{fmtBRL(r.patrimonio)}</td>
      <td className={`${td} whitespace-nowrap text-right ${r.esgotouEm ? 'font-semibold text-brick' : 'text-ink-soft'}`}>
        {r.esgotouEm ? `acabou em ${rotuloMes(r.esgotouEm)}` : 'ainda de pé'}
      </td>
    </tr>
  );
}

/** Uma célula por mês: cheia no aporte integral, clara no parcial, vazia no pulado. */
function MapaAportes({ pontos, aporte }) {
  const meses = pontos.filter((p) => !p.final);
  const estado = (p) => {
    if (p.retirando) return 'retirada';
    if (p.parou) return 'depois da parada';
    if (p.aporteMes === 0) return 'pulado';
    return p.aporteMes < aporte ? 'parcial' : '100%';
  };
  const presentes = new Set(meses.map(estado));
  const legenda = [
    ['100%', { background: CORES.IVVB11 }],
    ['parcial', { background: CORES.IVVB11, opacity: 0.45 }],
    ['pulado', { background: 'transparent', border: `1px solid ${CORES.aportado}` }],
    ['depois da parada', { background: 'var(--color-line)' }],
    ['retirada', { background: CORES.retirado, opacity: 0.75 }],
  ].filter(([rotulo]) => presentes.has(rotulo));
  return (
    <div className="mt-5">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">Aportes mês a mês</span>
        <span className="flex flex-wrap gap-3 text-[11.5px] text-ink-soft">
          {legenda.map(([rotulo, estilo]) => (
            <span key={rotulo} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[1px]" style={estilo} />
              {rotulo}
            </span>
          ))}
        </span>
      </div>
      <div
        role="img"
        aria-label="Aportes mês a mês"
        className="grid h-4 gap-px"
        style={{ gridTemplateColumns: `repeat(${meses.length}, minmax(0, 1fr))` }}
      >
        {meses.map((p) => {
          const fracao = p.aporteMes / aporte;
          let estilo = { background: CORES.IVVB11, opacity: 0.25 + 0.75 * fracao };
          let texto = `${fmtPct(fracao * 100, 0)} · ${fmtBRL(p.aporteMes)}`;
          if (p.retirando) {
            estilo = { background: CORES.retirado, opacity: p.saqueMes > 0 ? 0.75 : 0.2 };
            texto = p.saqueMes > 0 ? `saque de ${fmtBRL(p.saqueMes)}` : 'nada mais a sacar';
          } else if (p.parou) {
            estilo = { background: 'var(--color-line)' };
            texto = 'depois da parada';
          } else if (fracao === 0) {
            estilo = { border: `1px solid ${CORES.aportado}`, opacity: 0.5 };
            texto = 'sem aporte';
          }
          return <span key={p.data} title={`${rotuloMes(p.data)}: ${texto}`} className="rounded-[1px]" style={estilo} />;
        })}
      </div>
    </div>
  );
}

function Grafico({ sims, aporte }) {
  const datas = [...new Set(sims.flatMap((s) => s.pontos.map((p) => p.data)))].sort();
  const serie = (pontos, campo) => {
    const porData = new Map(pontos.map((p) => [p.data, p[campo]]));
    return datas.map((d) => porData.get(d) ?? null);
  };
  const pontoEm = new Map(sims[0].pontos.map((p) => [p.data, p]));
  const linha = { pointRadius: 0, pointHoverRadius: 4, borderWidth: 2.5, tension: 0.15, spanGaps: true };
  const parada = paradaDe(sims[0]);
  const { noRetirar } = sims[0];
  // com dois ETFs no modo %, cada um saca um valor diferente: a tabela mostra
  const mostraRetirado = noRetirar && sims.length === 1;

  const data = {
    labels: datas,
    datasets: [
      ...sims.map((s) => ({
        ...linha,
        label: s.ticker,
        data: serie(s.pontos, 'patrimonio'),
        borderColor: CORES[s.ticker],
        backgroundColor: CORES[s.ticker],
      })),
      {
        ...linha,
        label: 'CDI',
        data: serie(sims[0].pontos, 'cdi'),
        borderColor: CORES.cdi,
        backgroundColor: CORES.cdi,
        borderDash: [6, 4],
      },
      {
        ...linha,
        label: 'Total aportado',
        data: serie(sims[0].pontos, 'aportado'),
        borderColor: CORES.aportado,
        backgroundColor: CORES.aportado,
        borderWidth: 1.5,
        borderDash: [2, 3],
        stepped: 'before',
        tension: 0,
      },
      ...(mostraRetirado ? [{
        ...linha,
        label: 'Total retirado',
        data: serie(sims[0].pontos, 'retirado'),
        borderColor: CORES.retirado,
        backgroundColor: CORES.retirado,
        borderWidth: 1.5,
        borderDash: [2, 3],
        stepped: 'before',
        tension: 0,
      }] : []),
    ],
  };

  const legenda = [
    ...sims.map((s) => [s.ticker, CORES[s.ticker], false]),
    ['100% do CDI', CORES.cdi, true],
    ['Total aportado', CORES.aportado, true],
    ...(mostraRetirado ? [['Total retirado', CORES.retirado, true]] : []),
  ];

  const lista = [
    parada && { indice: datas.indexOf(parada.data), texto: 'parou de aportar', cor: CORES.aportado },
    noRetirar && { indice: datas.indexOf(noRetirar.data), texto: 'começou a retirar', cor: CORES.retirado },
  ].filter(Boolean);

  const rodape = (t) => {
    const p = pontoEm.get(t[0].label);
    if (!p || p.final) return '';
    if (p.retirando) {
      const quem = sims.length > 1 ? ` (${sims[0].ticker})` : '';
      return p.saqueMes > 0 ? `Saque do mês${quem}: ${fmtBRL(p.saqueMes)}` : `Nada mais a sacar${quem}`;
    }
    if (p.parou) return 'Sem aporte (depois da parada)';
    if (p.aporteMes === 0) return 'Mês sem aporte';
    return `Aporte do mês: ${fmtBRL(p.aporteMes)} (${fmtPct((p.aporteMes / aporte) * 100, 0)})`;
  };

  return (
    <>
      <div className="mb-3.5 flex flex-wrap gap-3.5">
        {legenda.map(([nome, cor, tracejado]) => (
          <span key={nome} className="flex items-center gap-1.5 text-[12.5px] text-ink-soft">
            <Traco cor={cor} tracejado={tracejado} />
            {nome}
          </span>
        ))}
      </div>
      <div className="h-[360px]">
        <Line
          data={data}
          plugins={[marcos]}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              marcos: { lista },
              tooltip: {
                callbacks: {
                  title: (t) => rotuloData(t[0].label),
                  label: (c) => `${c.dataset.label}: ${fmtBRL(c.parsed.y)}`,
                  footer: rodape,
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: {
                  autoSkip: true,
                  maxTicksLimit: 12,
                  maxRotation: 0,
                  callback: (_, i) => rotuloMes(datas[i]),
                },
              },
              y: {
                ...eixoBase('Patrimônio (R$)'),
                ticks: { callback: (v) => `R$ ${fmtNum(v / 1000)}k` },
              },
            },
          }}
        />
      </div>
    </>
  );
}

function Resultado({ sims, aporte, variavel, retirada }) {
  const [ref] = sims;
  const noParar = paradaDe(ref);
  const { noRetirar } = ref;
  const fimAportes = noParar ?? noRetirar;
  const pctPlanejado = ref.planejado > 0 ? (ref.etf.aportado / ref.planejado) * 100 : 0;
  const mesesPlanejados = Math.round(ref.planejado / aporte);

  return (
    <>
      <p className="mb-4 text-[13.5px] text-ink-soft">
        {ref.mesesComAporte} {ref.mesesComAporte === 1 ? 'aporte' : 'aportes'}
        {variavel ? ` em ${mesesPlanejados} meses` : ` de ${fmtBRL(aporte)}`}, de {rotuloData(ref.pontos[0].data)}
        {noParar ? ` até parar em ${rotuloData(noParar.data)}` : ''}
        {noRetirar ? `; saques mensais desde ${rotuloData(noRetirar.data)}` : ''}
        {fimAportes ? `; valores até o fechamento de ${rotuloData(ref.dataFinal)}.` : ` até o fechamento de ${rotuloData(ref.dataFinal)}.`}
        {variavel && (
          <>
            {' '}Aportou <strong className="text-ink">{fmtBRL(ref.etf.aportado)}</strong> de{' '}
            {fmtBRL(ref.planejado)} planejados ({fmtPct(pctPlanejado, 0)}).
          </>
        )}
      </p>

      <Grafico sims={sims} aporte={aporte} />
      {(variavel || fimAportes) && <MapaAportes pontos={ref.pontos} aporte={aporte} />}

      <Tabela
        rotulo="Resultado do aporte mensal"
        colunas={[
          'Investimento', 'Aportado', ...(noRetirar ? ['Retirado'] : []), 'Patrimônio', 'Ganho', 'Rent. total', 'Rent. a.a.',
        ]}
      >
        {sims.map((s) => (
          <Linha key={s.ticker} nome={NOMES[s.ticker]} cor={CORES[s.ticker]} r={s.etf} comRetirado={!!noRetirar} />
        ))}
        <Linha nome="100% do CDI, mesmas datas" cor={CORES.cdi} tracejado r={ref.cdi} comRetirado={!!noRetirar} />
      </Tabela>

      {noRetirar && (
        <>
          <h3 className="mt-7 text-base">Fase de retiradas</h3>
          <p className="mt-1 text-[13px] text-ink-soft">
            {retirada.modo === 'pct'
              ? `Saque de ${fmtPct(retirada.valor, 1)} a.a. do patrimônio em ${rotuloData(noRetirar.data)}, em parcelas mensais`
              : `Saque de ${fmtBRL(retirada.valor)} por mês`}
            {retirada.corrigir ? ', reajustado pelo IPCA a cada ano.' : ', sem reajuste.'}
            {' '}ETF e CDI seguem a mesma regra, cada um sobre o próprio saldo.
          </p>
          <Tabela
            rotulo="Fase de retiradas"
            larga
            colunas={[
              'Investimento', `Em ${rotuloData(noRetirar.data)}`, '1º saque', 'Saque atual', 'Total retirado', 'Hoje', 'Situação',
            ]}
          >
            {sims.filter((s) => s.noRetirar).map((s) => (
              <LinhaRetirada
                key={s.ticker}
                nome={NOMES[s.ticker]}
                cor={CORES[s.ticker]}
                noInicio={s.noRetirar.patrimonio + s.noRetirar.saqueMes}
                r={s.etf}
              />
            ))}
            <LinhaRetirada
              nome="100% do CDI"
              cor={CORES.cdi}
              tracejado
              noInicio={noRetirar.cdi + noRetirar.saqueCdi}
              r={ref.cdi}
            />
          </Tabela>
        </>
      )}

      {noParar && !noRetirar && (
        <>
          <h3 className="mt-7 text-base">Depois de parar</h3>
          <p className="mt-1 text-[13px] text-ink-soft">
            Sem novos aportes desde {rotuloData(noParar.data)}: quanto o patrimônio mudou só com o mercado.
          </p>
          <Tabela
            rotulo="Depois de parar"
            colunas={['Investimento', `Em ${rotuloData(noParar.data)}`, 'Hoje', 'Variação', 'Variação %']}
          >
            {sims.map((s) => (
              <LinhaParada
                key={s.ticker}
                nome={NOMES[s.ticker]}
                cor={CORES[s.ticker]}
                naParada={paradaDe(s).patrimonio}
                hoje={s.etf.patrimonio}
              />
            ))}
            <LinhaParada
              nome="100% do CDI"
              cor={CORES.cdi}
              tracejado
              naParada={noParar.cdi}
              hoje={ref.cdi.patrimonio}
            />
          </Tabela>
        </>
      )}

      <p className="mt-4 text-[12px] text-ink-soft">
        Compra no fechamento ajustado do primeiro pregão de cada mês, com cotas fracionárias.
        {variavel && ' Os meses sem aporte e os valores parciais são sorteados; cada cenário é reproduzível.'}
        {' '}Valores brutos: sem IR (15% sobre o ganho de ETF, sem isenção), corretagem ou custódia.
        Rentabilidade anual pela TIR dos aportes{noRetirar ? ' e saques' : ''}. Cotações: Yahoo Finance;
        CDI{noRetirar && retirada.corrigir ? ' e IPCA' : ''}: Banco Central.
        Dados até {rotuloData(ref.dataFinal)}.
      </p>
    </>
  );
}

export default function AporteEtf() {
  const { status, dados } = useDadosEtf();
  const [params, setParams] = useState(() => ({ ...PADRAO, ...carregarParamsEtf() }));
  useEffect(() => salvarParamsEtf(params), [params]);

  const alterar = (campo, valor) => setParams((p) => ({ ...p, [campo]: valor }));
  const tickers = params.ativos === 'ambos' ? ETFS : [params.ativos];
  const aporte = Number(params.aporte);
  const variavel = params.regularidade === 'variavel';

  let conteudo;
  let seletores = null;

  if (status === 'carregando') {
    conteudo = <p className="py-16 text-center text-ink-soft">Carregando cotações…</p>;
  } else if (status === 'erro') {
    conteudo = (
      <p className="py-16 text-center text-brick">
        Não foi possível carregar o histórico de cotações. Tente recarregar a página.
      </p>
    );
  } else {
    // com os dois ETFs, a simulação começa quando o mais novo já existia
    const primeiro = tickers.map((t) => primeiroMesDisponivel(dados[t].precos)).sort().at(-1);
    const ultimo = tickers.map((t) => dados[t].precos.at(-1)[0].slice(0, 7)).sort()[0];
    const inicio = entre(params.inicio, primeiro, ultimo);
    // parar no mês do primeiro aporte não deixaria nada para simular
    const paradaMin = proximoMes(inicio);
    const parada = params.parar ? entre(params.parada, paradaMin, ultimo) : null;
    const retiradaInicio = entre(params.retiradaInicio, paradaMin, ultimo);
    const pct = params.retiradaModo === 'pct';
    const valorRetirada = Number(pct ? params.retiradaPct : params.retiradaFixo);
    const retirada = params.retirar && valorRetirada > 0
      ? { inicio: retiradaInicio, modo: params.retiradaModo, valor: valorRetirada, corrigir: params.corrigir }
      : null;
    const check = 'h-4 w-4 accent-[var(--color-green)]';

    seletores = (
      <>
        <SeletorMes
          rotulo="Primeiro aporte"
          valor={inicio}
          onChange={(v) => alterar('inicio', v)}
          primeiro={primeiro}
          ultimo={ultimo}
          hint={params.inicio < primeiro ? `Antes de ${rotuloMes(`${primeiro}-01`)} não há cotação` : null}
        />
        <div className="mb-4 border-t border-dashed border-line pt-4">
          <label className="flex items-center gap-2 text-[13.5px]">
            <input
              type="checkbox"
              checked={params.parar}
              onChange={(e) => alterar('parar', e.target.checked)}
              className={check}
            />
            Parei de aportar
          </label>
        </div>
        {params.parar && (
          <SeletorMes
            rotulo="Sem aportes a partir de"
            valor={parada}
            onChange={(v) => alterar('parada', v)}
            primeiro={paradaMin}
            ultimo={ultimo}
            hint={
              params.parada < paradaMin ? 'A parada precisa ser depois do primeiro aporte'
                : retirada && parada >= retirada.inicio ? 'Os aportes já param quando as retiradas começam'
                  : null
            }
          />
        )}
        <div className="mb-4 border-t border-dashed border-line pt-4">
          <label className="flex items-center gap-2 text-[13.5px]">
            <input
              type="checkbox"
              checked={params.retirar}
              onChange={(e) => alterar('retirar', e.target.checked)}
              className={check}
            />
            Comecei a retirar
          </label>
        </div>
        {params.retirar && (
          <>
            <SeletorMes
              rotulo="Retiradas a partir de"
              valor={retiradaInicio}
              onChange={(v) => alterar('retiradaInicio', v)}
              primeiro={paradaMin}
              ultimo={ultimo}
              hint="Os aportes param nesse mês"
            />
            <Campo label="Quanto retirar">
              <Seg
                aria-label="Modo de retirada"
                valor={params.retiradaModo}
                onChange={(v) => alterar('retiradaModo', v)}
                opcoes={[
                  { valor: 'pct', rotulo: '% ao ano' },
                  { valor: 'fixo', rotulo: 'Valor fixo' },
                ]}
              />
            </Campo>
            <Campo
              htmlFor="valor-retirada"
              hint={pct ? 'Do patrimônio no início, dividido em 12 saques' : 'Sacado todo mês'}
            >
              <UnitInput
                id="valor-retirada"
                aria-label={pct ? 'Retirada anual' : 'Retirada mensal'}
                type="number"
                min="0"
                step={pct ? '0.5' : '100'}
                unidade={pct ? '% a.a.' : 'R$/mês'}
                value={pct ? params.retiradaPct : params.retiradaFixo}
                onChange={(e) => alterar(pct ? 'retiradaPct' : 'retiradaFixo', e.target.value)}
              />
            </Campo>
            <label className="mb-4 flex items-start gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={params.corrigir}
                onChange={(e) => alterar('corrigir', e.target.checked)}
                className={`${check} mt-0.5`}
              />
              Reajustar o saque pelo IPCA a cada ano
            </label>
          </>
        )}
      </>
    );

    if (!(aporte > 0)) {
      conteudo = <p className="py-16 text-center text-ink-soft">Informe um valor de aporte maior que zero.</p>;
    } else {
      const cfg = {
        semente: params.semente,
        chancePular: entre(Number(params.chancePular) || 0, 0, 100) / 100,
        minimo: entre(Number(params.minimo) || 0, 0, 100) / 100,
      };
      const fracao = variavel ? (mes) => fracaoSorteada(mes, cfg) : undefined;
      const sims = tickers.map((ticker) => ({
        ticker,
        ...simularAporteMensal({
          precos: dados[ticker].precos,
          taxasCdi: dados.cdi.taxas,
          ipca: dados.ipca.taxas,
          inicio,
          aporte,
          fracao,
          parada,
          retirada,
        }),
      }));

      conteudo = sims[0].mesesComAporte === 0 ? (
        <p className="py-16 text-center text-ink-soft">
          Nenhum mês com aporte neste cenário. Diminua a chance de pular meses ou sorteie outro.
        </p>
      ) : (
        <Resultado sims={sims} aporte={aporte} variavel={variavel} retirada={retirada} />
      );
    }
  }

  return (
    <section className="mt-11" aria-labelledby="titulo-aporte-etf">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titulo-aporte-etf" className="text-[22px]">Aporte mensal em ETF</h2>
        <span className="text-[13px] text-ink-soft">
          Quanto teria hoje quem investisse todo mês, desde uma data, com as cotações reais
        </span>
      </div>

      <Painel className="grid lg:grid-cols-[260px_1fr]">
        <div className="border-b border-line p-6 lg:border-b-0 lg:border-r">
          <Campo label="ETF">
            <Seg
              aria-label="ETF"
              valor={params.ativos}
              onChange={(v) => alterar('ativos', v)}
              opcoes={[
                { valor: 'IVVB11', rotulo: 'IVVB11' },
                { valor: 'NASD11', rotulo: 'NASD11' },
                { valor: 'ambos', rotulo: 'Os dois' },
              ]}
            />
          </Campo>
          <Campo label="Aporte mensal planejado" htmlFor="aporte-etf">
            <UnitInput
              id="aporte-etf"
              type="number"
              min="1"
              step="50"
              unidade="R$"
              value={params.aporte}
              onChange={(e) => alterar('aporte', e.target.value)}
            />
          </Campo>
          <Campo label="Regularidade">
            <Seg
              aria-label="Regularidade"
              valor={params.regularidade}
              onChange={(v) => alterar('regularidade', v)}
              opcoes={[
                { valor: 'fixo', rotulo: 'Todo mês' },
                { valor: 'variavel', rotulo: 'Variável' },
              ]}
            />
          </Campo>
          {variavel && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Meses sem aporte" htmlFor="chance-pular">
                  <UnitInput
                    id="chance-pular"
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    unidade="%"
                    value={params.chancePular}
                    onChange={(e) => alterar('chancePular', e.target.value)}
                  />
                </Campo>
                <Campo label="Aporte mínimo" htmlFor="minimo">
                  <UnitInput
                    id="minimo"
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    unidade="%"
                    value={params.minimo}
                    onChange={(e) => alterar('minimo', e.target.value)}
                  />
                </Campo>
              </div>
              <p className="-mt-2 mb-3 text-[11.5px] text-ink-soft">
                Nos meses em que aporta, sai entre o mínimo e 100% do planejado.
              </p>
              <button
                type="button"
                onClick={() => alterar('semente', params.semente + 1)}
                className="mb-4 w-full rounded-[3px] border border-line bg-paper px-3 py-2 text-[13px] text-green-deep hover:border-green"
              >
                ↻ Sortear outro cenário
              </button>
            </>
          )}
          {seletores}
        </div>
        <div className="min-w-0 p-6">{conteudo}</div>
      </Painel>
    </section>
  );
}
