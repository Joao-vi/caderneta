import { rotuloDoPlano } from '../../domain/fichaBtc.js';
import { fmtBTC, fmtNum, fmtPct, fmtUSD } from '../../domain/formato.js';
import { rotuloData } from '../ui.jsx';

const th = 'border-b border-line bg-paper-alt px-3 py-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft';
const td = 'border-b border-line px-3 py-3 text-[13.5px]';
const num = `${td} text-right font-mono tabular`;

const COLUNAS = [
  'Plano', 'Aportes', 'Aportado', 'Preço médio', 'Bitcoin', 'Patrimônio', 'Múltiplo', 'a.a.',
];

function Nome({ ficha }) {
  return (
    <td className={td}>
      <span className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: ficha.color }} />
        <span>
          {ficha.nome}
          <span className="block font-mono text-[11px] text-ink-soft">
            {rotuloDoPlano(ficha.frequencia, ficha.dia)}
          </span>
        </span>
      </span>
    </td>
  );
}

export default function TabelaBtc({ sims }) {
  // a referência do "quanto isso custou": a ficha que acumulou mais bitcoin
  // por dólar, ou seja, a que pagou o menor preço médio
  const melhor = Math.min(...sims.map((s) => s.resumo.precoMedio));

  return (
    <section className="mt-9" aria-labelledby="titulo-tabela-btc">
      <h2 id="titulo-tabela-btc" className="mb-4 text-[22px]">Raio-x dos planos</h2>

      <div className="overflow-x-auto rounded-sheet border border-line bg-card" style={{ boxShadow: 'var(--shadow-sheet)' }}>
        <table aria-label="Raio-x dos planos de aporte" className="w-full min-w-[840px] border-collapse">
          <thead>
            <tr>
              {COLUNAS.map((c, i) => (
                <th key={c} className={`${th} ${i === 0 ? 'text-left' : 'text-right'}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sims.map(({ ficha, resumo }) => (
              <tr key={ficha.id}>
                <Nome ficha={ficha} />
                <td className={num}>{fmtNum(resumo.nAportes)}</td>
                <td className={num}>{fmtUSD(resumo.aportado, 0)}</td>
                <td className={num}>
                  {fmtUSD(resumo.precoMedio, 0)}
                  {resumo.precoMedio > melhor && (
                    <span className="block text-[11px] text-brick">
                      +{fmtPct((resumo.precoMedio / melhor - 1) * 100, 2)}
                    </span>
                  )}
                </td>
                <td className={num}>{fmtNum(resumo.btc, 5)}</td>
                <td className={num}>{fmtUSD(resumo.patrimonio, 0)}</td>
                <td className={num}>{fmtNum(resumo.multiplo, 2)}×</td>
                <td className={`${num} font-semibold text-green-deep`}>{fmtPct(resumo.rentAnual, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {sims.map(({ ficha, resumo }) => (
          <div key={ficha.id} className="rounded-sheet border border-line bg-card p-4" style={{ boxShadow: 'var(--shadow-sheet)' }}>
            <div className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold">
              <span className="inline-block h-2.5 w-2.5 rounded-[1px]" style={{ background: ficha.color }} />
              {ficha.nome}
            </div>
            <dl className="text-[12.5px] text-ink-soft">
              <div className="flex justify-between gap-3 py-0.5">
                <dt>Compra mais barata</dt>
                <dd className="font-mono tabular text-ink">
                  {fmtUSD(resumo.melhor.preco, 0)} <span className="text-ink-soft">em {rotuloData(resumo.melhor.data)}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <dt>Compra mais cara</dt>
                <dd className="font-mono tabular text-ink">
                  {fmtUSD(resumo.pior.preco, 0)} <span className="text-ink-soft">em {rotuloData(resumo.pior.data)}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <dt>Maior queda</dt>
                <dd className="font-mono tabular text-brick">
                  − {fmtPct(resumo.quedaMaxima, 0)} <span className="text-ink-soft">até {rotuloData(resumo.fundoEm)}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <dt>Acumulado</dt>
                <dd className="font-mono tabular text-ink">{fmtBTC(resumo.btc)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
