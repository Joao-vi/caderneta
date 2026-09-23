import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { fmtNum, fmtPct, fmtUSD } from '../../domain/formato.js';
import { eixoBase } from '../chartSetup.js';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloMes = (iso) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`;
const rotuloData = (iso) => iso.split('-').reverse().join('/');

const FAIXA = 'rgba(75, 91, 80, 0.16)';
const REFERENCIA = '#4B5B50';

/**
 * A série é diária e cobre anos: são milhares de pontos por ficha, muito mais
 * do que cabe em pixels. Reduz a um passo fixo, guardando sempre a última data
 * — é ela que carrega o resultado que a tabela mostra.
 */
function reduzir(datas, maximo = 420) {
  if (datas.length <= maximo) return datas;
  const passo = Math.ceil(datas.length / maximo);
  const saida = datas.filter((_, i) => i % passo === 0);
  if (saida[saida.length - 1] !== datas[datas.length - 1]) saida.push(datas[datas.length - 1]);
  return saida;
}

function Traco({ cor, tracejado, bloco }) {
  if (bloco) {
    return <span className="inline-block h-3 w-4 rounded-[1px]" style={{ background: cor }} />;
  }
  return (
    <span
      className={`inline-block h-0 w-4 border-t-[3px] ${tracejado ? 'border-dashed' : ''}`}
      style={{ borderColor: cor }}
    />
  );
}

function Legenda({ itens }) {
  return (
    <div className="mb-3.5 flex flex-wrap gap-x-3.5 gap-y-1.5">
      {itens.map(({ nome, cor, tracejado, bloco }) => (
        <span key={nome} className="flex items-center gap-1.5 text-[12.5px] text-ink-soft">
          <Traco cor={cor} tracejado={tracejado} bloco={bloco} />
          {nome}
        </span>
      ))}
    </div>
  );
}

const ABAS = [
  { id: 'patrimonio', rotulo: 'Patrimônio' },
  { id: 'multiplo', rotulo: 'Múltiplo do investido' },
];

export default function GraficoBtc({ sims, faixa, mesmoPlanoDeCaixa }) {
  const [vista, setVista] = useState('patrimonio');
  const multiplo = vista === 'multiplo';

  const todas = [...new Set(sims.flatMap((s) => s.serie.map((p) => p.data)))].sort();
  const datas = reduzir(todas);

  const serieDe = (pontos, campo) => {
    const porData = new Map(pontos.map((p) => [p.data, p[campo]]));
    return datas.map((d) => porData.get(d) ?? null);
  };

  const linha = { pointRadius: 0, pointHoverRadius: 4, borderWidth: 2, tension: 0.15, spanGaps: false };

  // A faixa entra primeiro, para ficar atrás das linhas. São dois datasets
  // porque o preenchimento do Chart.js é sempre entre um dataset e outro.
  const faixaDatasets = multiplo && faixa ? [
    {
      ...linha,
      label: 'Faixa',
      data: serieDe(faixa.envelope, 'maximo'),
      borderWidth: 0,
      backgroundColor: FAIXA,
      fill: '+1',
      order: 10,
    },
    {
      ...linha,
      label: 'FaixaMin',
      data: serieDe(faixa.envelope, 'minimo'),
      borderWidth: 0,
      fill: false,
      order: 10,
    },
  ] : [];

  const fichas = sims.map((s) => ({
    ...linha,
    label: s.ficha.nome,
    data: serieDe(s.serie, multiplo ? 'multiplo' : 'patrimonio'),
    borderColor: s.ficha.color,
    backgroundColor: s.ficha.color,
    order: 1,
  }));

  // No patrimônio, a régua é o dinheiro que entrou. Só faz sentido desenhá-la
  // quando todas as fichas aportam o mesmo: com orçamentos diferentes seriam
  // várias réguas, e uma só mentiria sobre as outras.
  const aportado = !multiplo && mesmoPlanoDeCaixa ? [{
    ...linha,
    label: 'Total aportado',
    data: serieDe(sims[0].serie, 'aportado'),
    borderColor: REFERENCIA,
    backgroundColor: REFERENCIA,
    borderWidth: 1.5,
    borderDash: [2, 3],
    tension: 0,
    order: 2,
  }] : [];

  // No múltiplo, a régua é o 1,0: abaixo dela o plano está no prejuízo.
  const empate = multiplo ? [{
    ...linha,
    label: 'Empate (1,00×)',
    data: datas.map(() => 1),
    borderColor: REFERENCIA,
    backgroundColor: REFERENCIA,
    borderWidth: 1.5,
    borderDash: [2, 3],
    tension: 0,
    order: 2,
  }] : [];

  const legenda = [
    ...sims.map((s) => ({ nome: s.ficha.nome, cor: s.ficha.color })),
    ...(multiplo && faixa
      ? [{ nome: 'Todas as outras escolhas possíveis', cor: FAIXA, bloco: true }]
      : []),
    ...(aportado.length ? [{ nome: 'Total aportado', cor: REFERENCIA, tracejado: true }] : []),
    ...(empate.length ? [{ nome: 'Empate (1,00×)', cor: REFERENCIA, tracejado: true }] : []),
  ];

  const valor = (v) => (multiplo ? `${fmtNum(v, 3)}×` : fmtUSD(v, 0));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Vista do gráfico" className="flex gap-1">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={vista === a.id}
              onClick={() => setVista(a.id)}
              className={[
                'rounded-[3px] px-3.5 py-1.5 text-[13px] transition-colors',
                vista === a.id
                  ? 'bg-green text-white'
                  : 'border border-line bg-paper text-ink-soft hover:text-green-deep',
              ].join(' ')}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
        <p className="max-w-[46ch] text-[12.5px] text-ink-soft">
          {multiplo
            ? 'Quanto virou cada dólar aportado. É aqui que as escolhas se comparam de forma justa — o eixo já desconta quem aportou mais.'
            : 'Quanto haveria na conta, em dólar, a cada dia.'}
        </p>
      </div>

      <Legenda itens={legenda} />

      <div className="h-[380px]">
        <Line
          data={{ labels: datas, datasets: [...faixaDatasets, ...fichas, ...aportado, ...empate] }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                filter: (c) => c.dataset.label !== 'FaixaMin',
                callbacks: {
                  title: (t) => rotuloData(t[0].label),
                  label: (c) => {
                    if (c.dataset.label !== 'Faixa') return `${c.dataset.label}: ${valor(c.parsed.y)}`;
                    const i = c.dataIndex;
                    const min = c.chart.data.datasets[1].data[i];
                    return `Faixa: ${valor(min)} a ${valor(c.parsed.y)}`;
                  },
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: {
                  autoSkip: true,
                  maxTicksLimit: 10,
                  maxRotation: 0,
                  callback: (_, i) => rotuloMes(datas[i]),
                },
              },
              y: multiplo
                ? {
                  ...eixoBase('Múltiplo do investido'),
                  ticks: { callback: (v) => `${fmtNum(v, 1)}×` },
                }
                : {
                  ...eixoBase('Patrimônio (US$)'),
                  ticks: { callback: (v) => `$ ${fmtNum(v / 1000)}k` },
                },
            },
          }}
        />
      </div>

      {multiplo && faixa && (
        <p className="mt-3 text-[12.5px] text-ink-soft">
          A faixa cinza cobre as <strong>{faixa.variantes.length}</strong> maneiras de aportar esse
          mesmo orçamento: os 31 dias do mês, os 7 da semana e o diário. Entre a melhor e a pior há{' '}
          <strong>{fmtPct(faixa.spread, 1)}</strong> de diferença no preço médio pago.
        </p>
      )}
    </>
  );
}
