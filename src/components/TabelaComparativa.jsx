import { calcular } from '../domain/apuracao.js';
import { fmtBRL, fmtPct } from '../domain/formato.js';

const COLUNAS = [
  'Ficha', 'Aportado', 'Rend. bruto', 'IOF', 'IR', 'Líquido', 'Rent. líq.', 'Rent. a.a.', '% CDI líq.',
];

export default function TabelaComparativa({ items, cdi }) {
  const linhas = items.map((item) => ({ item, r: calcular(item, cdi) }));
  const melhor = linhas.length ? Math.max(...linhas.map((l) => l.r.liquido)) : 0;

  return (
    <section className="mt-11">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[22px]">Raio-x comparativo</h2>
        <span className="text-[13px] text-ink-soft">No vencimento de cada ficha</span>
      </div>

      <div className="overflow-x-auto rounded-sheet border border-line bg-card" style={{ boxShadow: 'var(--shadow-sheet)' }}>
        <table aria-label="Raio-x comparativo" className="w-full min-w-[880px] border-collapse">
          <thead>
            <tr>
              {COLUNAS.map((c, i) => (
                <th
                  key={c}
                  className={`border-b border-line bg-paper-alt px-4 py-3.5 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft ${i === 0 ? 'text-left' : 'text-right'}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={COLUNAS.length} className="px-4 py-7 text-center text-ink-soft">
                  Adicione fichas para comparar.
                </td>
              </tr>
            ) : (
              linhas.map(({ item, r }) => {
                const eMelhor = r.liquido === melhor && linhas.length > 1;
                const td = 'border-b border-line px-4 py-3.5 text-[13.5px] last:border-b-0';
                const num = `${td} text-right font-mono tabular`;
                return (
                  <tr key={item.id}>
                    <td className={`${td} font-semibold`}>{item.name}</td>
                    <td className={num}>{fmtBRL(r.aportado)}</td>
                    <td className={num}>{fmtBRL(r.rendBruto)}</td>
                    <td className={num}>{r.iof > 0 ? fmtBRL(r.iof) : '—'}</td>
                    <td className={`${num} text-brick`}>{fmtBRL(r.ir)}</td>
                    <td className={`${num} font-bold text-green-deep`}>
                      {fmtBRL(r.liquido)}
                      {eMelhor && <span className="text-gold"> ★</span>}
                    </td>
                    <td className={num}>{fmtPct(r.rentLiqTotal, 2)}</td>
                    <td className={num}>{fmtPct(r.rentLiqAnual, 2)}</td>
                    <td className={num}>{fmtPct(r.pctCDILiquido, 0)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
