import { calcular, horizonteDe } from '../domain/apuracao.js';
import { fmtBRL, fmtPct } from '../domain/formato.js';

function rotuloPrazo(dias) {
  if (dias % 365 === 0) {
    const anos = dias / 365;
    return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  }
  return `${dias} dias`;
}

function Linha({ k, v, tom }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 text-[13.5px]">
      <span className="text-ink-soft">{k}</span>
      <span className={`font-mono font-semibold tabular ${tom === 'tax' ? 'text-brick' : ''}`}>{v}</span>
    </div>
  );
}

export default function FichaCard({ item, cdi, onRemove, onTroca }) {
  const r = calcular(item, cdi);
  const horizonte = horizonteDe(item);
  const efetiva = (item.aporte > 0 || item.rolar) && item.trib === 'regressiva';

  return (
    <article className="relative rounded-sheet border border-line bg-card" style={{ boxShadow: 'var(--shadow-sheet)' }}>
      <div className="h-[5px] rounded-t-[4px]" style={{ background: item.color }} />

      <div className="relative px-5 pb-4 pt-4.5">
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Remover ${item.name}`}
          title="Remover"
          className="absolute right-4 top-4 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-line bg-paper text-[13px] leading-none text-ink-soft hover:border-brick-soft hover:bg-brick-soft hover:text-brick"
        >
          ✕
        </button>
        <h3 className="pr-7 font-serif text-[17px] font-semibold">{item.name}</h3>
        <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-soft">
          {item.tag} · {rotuloPrazo(horizonte)}
          {item.rolar && ` · rolando a cada ${item.prazo}d`}
          {item.aporte > 0 && ` · +${fmtBRL(item.aporte)}/mês`}
        </div>
      </div>

      <div className="border-t border-dashed border-line" />

      <div className="px-5 pb-5 pt-4">
        <Linha k={item.aporte > 0 ? 'Total aportado' : 'Aplicado'} v={fmtBRL(r.aportado)} />
        <Linha k="Rendimento bruto" v={fmtBRL(r.rendBruto)} />
        {r.iof > 0 && <Linha k="IOF" v={`− ${fmtBRL(r.iof)}`} tom="tax" />}
        <Linha
          k={`${item.tribLabel} (${efetiva ? 'efetiva ' : ''}${fmtPct(r.aliqIR, 1)})`}
          v={`− ${fmtBRL(r.ir)}`}
          tom="tax"
        />
        <div className="mt-1.5 flex items-baseline justify-between border-t border-line pt-3">
          <span className="font-serif text-sm font-semibold text-ink">Valor líquido</span>
          <span className="font-mono text-[19px] font-semibold tabular text-green-deep">{fmtBRL(r.liquido)}</span>
        </div>

        <button
          type="button"
          onClick={() => onTroca(item.id)}
          className="mt-3.5 w-full rounded-[3px] border border-green-line bg-transparent p-2.5 text-[12.5px] font-semibold text-green transition-colors hover:border-green hover:bg-green hover:text-white"
        >
          ⇄ Vale a troca?
        </button>
      </div>

      <div className="flex items-center justify-between rounded-b-[4px] border-t border-line bg-paper-alt px-5 py-2.5 font-mono text-[11.5px] text-ink-soft">
        <span>rent. líq. {fmtPct(r.rentLiqTotal, 2)}</span>
        <span className="font-semibold text-gold">{fmtPct(r.pctCDILiquido, 0)} do CDI líq.</span>
      </div>
    </article>
  );
}
