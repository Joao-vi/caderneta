import { fmtBTC, fmtNum, fmtPct, fmtUSD } from '../../domain/formato.js';
import { rotuloDoPlano } from '../../domain/fichaBtc.js';

function Linha({ k, v, tom }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 text-[13.5px]">
      <span className="text-ink-soft">{k}</span>
      <span className={`font-mono font-semibold tabular ${tom === 'perda' ? 'text-brick' : ''}`}>{v}</span>
    </div>
  );
}

export default function CardBtc({ sim, onRemove }) {
  const { ficha, resumo } = sim;
  const desconto = resumo.precoMedioMercado > 0
    ? (1 - resumo.precoMedio / resumo.precoMedioMercado) * 100
    : 0;

  return (
    <article className="relative rounded-sheet border border-line bg-card" style={{ boxShadow: 'var(--shadow-sheet)' }}>
      <div className="h-[5px] rounded-t-[4px]" style={{ background: ficha.color }} />

      <div className="relative px-5 pb-4 pt-4.5">
        <button
          type="button"
          onClick={() => onRemove(ficha.id)}
          aria-label={`Remover ${ficha.nome}`}
          title="Remover"
          className="absolute right-4 top-4 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-line bg-paper text-[13px] leading-none text-ink-soft hover:border-brick-soft hover:bg-brick-soft hover:text-brick"
        >
          ✕
        </button>
        <h3 className="pr-7 font-serif text-[17px] font-semibold">{ficha.nome}</h3>
        <div className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-soft">
          {rotuloDoPlano(ficha.frequencia, ficha.dia)} · {fmtUSD(ficha.orcamentoMensal, 0)}/mês ·{' '}
          {fmtNum(resumo.nAportes)} aportes
        </div>
      </div>

      <div className="border-t border-dashed border-line" />

      <div className="px-5 pb-5 pt-4">
        <Linha k="Total aportado" v={fmtUSD(resumo.aportado, 0)} />
        <Linha k="Preço médio pago" v={fmtUSD(resumo.precoMedio, 0)} />
        <div className="flex items-baseline justify-between pb-1.5 text-[12px] text-ink-soft">
          <span>contra a média de {fmtUSD(resumo.precoMedioMercado, 0)} do período</span>
          <span className={`font-mono tabular font-semibold ${desconto >= 0 ? 'text-green' : 'text-brick'}`}>
            {desconto >= 0 ? '−' : '+'}{fmtPct(Math.abs(desconto), 0)}
          </span>
        </div>
        <Linha
          k="Maior queda no caminho"
          v={`− ${fmtPct(resumo.quedaMaxima, 0)}`}
          tom="perda"
        />

        <div className="mt-1.5 border-t border-line pt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-sm font-semibold text-ink">Patrimônio hoje</span>
            <span className="font-mono text-[19px] font-semibold tabular text-green-deep">
              {fmtUSD(resumo.patrimonio, 0)}
            </span>
          </div>
          <div className="mt-1 text-right font-mono text-[12px] text-ink-soft">
            {fmtBTC(resumo.btc)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-b-[4px] border-t border-line bg-paper-alt px-5 py-2.5 font-mono text-[11.5px] text-ink-soft">
        <span>{fmtNum(resumo.multiplo, 2)}× o investido</span>
        <span className="font-semibold text-gold">{fmtPct(resumo.rentAnual, 1)} a.a.</span>
      </div>
    </article>
  );
}
