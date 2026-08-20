import { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { horizonteDe } from '../domain/apuracao.js';
import { fmtBRL, fmtNum } from '../domain/formato.js';
import { jurosDoMes, mesesDe, serieValor } from '../domain/series.js';
import { eixoBase } from './chartSetup.js';
import { Seg } from './ui.jsx';

const HINTS = {
  evo: 'Valor total mês a mês até o vencimento de cada ficha',
  bruto: 'Quanto cada ficha rendeu dentro de cada mês, antes dos impostos',
  liquido: 'Do que rendeu no mês, o que sobra após IR e IOF na alíquota daquele momento',
};

function Legenda({ items }) {
  if (!items.length) {
    return <span className="text-[12.5px] text-ink-soft">Adicione fichas para ver o gráfico</span>;
  }
  return items.map((it) => (
    <span key={it.id} className="flex items-center gap-1.5 text-[12.5px] text-ink-soft">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
      {it.name}
    </span>
  ));
}

export default function Projecao({ items }) {
  const [aba, setAba] = useState('evo');
  const [modo, setModo] = useState('bruto');

  const opcoesBase = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: { legend: { display: false } },
  };

  const dadosEvo = {
    datasets: items.map((item) => ({
      label: item.name,
      data: serieValor(item),
      borderColor: item.color,
      backgroundColor: item.color,
      pointRadius: 0,
      borderWidth: 2.5,
      tension: 0.25,
    })),
  };

  const maxMeses = items.length ? Math.max(...items.map(mesesDe)) : 1;
  const labels = Array.from({ length: maxMeses }, (_, k) => k + 1);
  const dadosJuros = {
    labels,
    datasets: items.map((item) => ({
      label: item.name,
      data: labels.map((m) => jurosDoMes(item, m, modo)),
      backgroundColor: item.color,
      borderWidth: 0,
      borderRadius: 2,
      maxBarThickness: 22,
    })),
  };

  const tabBase = 'rounded-t-[4px] border border-line px-5 py-2.5 text-[13.5px] font-semibold transition-colors -mb-px';

  return (
    <section className="mt-11">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[22px]">Projeção</h2>
        <span className="text-[13px] text-ink-soft">{aba === 'evo' ? HINTS.evo : HINTS[modo]}</span>
      </div>

      <div role="tablist" aria-label="Modo de projeção" className="flex gap-[3px]">
        {[
          ['evo', 'Evolução do valor'],
          ['juros', 'Juros por mês'],
        ].map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`${tabBase} ${
              aba === id
                ? 'border-b-card bg-card text-green-deep'
                : 'bg-paper-alt text-ink-soft hover:text-green-deep'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div
        className="rounded-b-sheet rounded-tr-sheet border border-line bg-card p-6"
        style={{ boxShadow: 'var(--shadow-sheet)' }}
      >
        <div className="mb-3.5 flex flex-wrap gap-3.5">
          <Legenda items={items} />
        </div>

        {aba === 'evo' ? (
          <div className="h-[360px]">
            <Line
              data={dadosEvo}
              options={{
                ...opcoesBase,
                plugins: {
                  ...opcoesBase.plugins,
                  tooltip: {
                    callbacks: {
                      title: (t) => `Mês ${t[0].parsed.x}`,
                      label: (c) => `${c.dataset.label}: ${fmtBRL(c.parsed.y)}`,
                    },
                  },
                },
                scales: {
                  x: { type: 'linear', ...eixoBase('Meses') },
                  y: {
                    ...eixoBase('Valor (R$)'),
                    ticks: { callback: (v) => `R$ ${fmtNum(v / 1000)}k` },
                  },
                },
              }}
            />
          </div>
        ) : (
          <>
            <div className="mb-3.5 flex justify-end">
              <div className="w-56">
                <Seg
                  aria-label="Bruto ou líquido"
                  tamanho="sm"
                  valor={modo}
                  onChange={setModo}
                  opcoes={[
                    { valor: 'bruto', rotulo: 'Bruto' },
                    { valor: 'liquido', rotulo: 'Líquido' },
                  ]}
                />
              </div>
            </div>
            <div className="h-[360px]">
              <Bar
                data={dadosJuros}
                options={{
                  ...opcoesBase,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    ...opcoesBase.plugins,
                    tooltip: {
                      callbacks: {
                        title: (t) => `Mês ${t[0].label}`,
                        label: (c) => `${c.dataset.label}: ${fmtBRL(c.parsed.y)}`,
                      },
                    },
                  },
                  scales: {
                    x: { title: { display: true, text: 'Meses' }, grid: { display: false },
                         ticks: { autoSkip: true, maxTicksLimit: 24 } },
                    y: {
                      beginAtZero: true,
                      ...eixoBase(modo === 'bruto' ? 'Juros do mês (R$)' : 'Juros do mês, líquidos (R$)'),
                      ticks: { callback: (v) => `R$ ${fmtNum(v)}` },
                    },
                  },
                }}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
