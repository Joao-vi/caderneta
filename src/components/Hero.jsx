export default function Hero({ cdi, onCdiChange }) {
  return (
    <header className="relative overflow-hidden border-b border-line px-6 pb-10 pt-14">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-end justify-between gap-8">
        <div>
          <div className="mb-3.5 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-green">
            <span className="h-[7px] w-[7px] rounded-full bg-gold ring-[3px] ring-gold-soft" />
            Caderneta · comparador de renda fixa
          </div>
          <h1 className="text-[clamp(34px,5vw,54px)] font-semibold leading-[1.02] tracking-[-0.01em]">
            Quanto o seu <em className="font-medium not-italic text-gold italic">CDB</em> realmente&nbsp;paga.
          </h1>
          <p className="mt-3.5 max-w-[52ch] text-base text-ink-soft">
            Monte fichas de CDB, LCI/LCA ou Tesouro, ajuste prazo e tributação, e compare o
            líquido de verdade — depois do IR e do IOF.
          </p>
        </div>

        <div className="flex h-[158px] w-[158px] shrink-0 flex-col items-center justify-center rounded-full border-2 border-dashed border-paper/35 bg-green-deep text-center text-paper">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-75">CDI hoje</div>
          <div className="my-0.5 font-serif text-3xl font-semibold">
            {cdi.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
          </div>
          <div className="mt-1 flex items-center gap-1">
            <input
              type="number"
              step="0.01"
              aria-label="CDI anual"
              value={cdi}
              onChange={(e) => onCdiChange(e.target.value)}
              className="w-14 border-0 border-b border-paper/45 bg-transparent py-0.5 text-center font-mono text-[13px] text-paper"
            />
            <span className="text-[10px] opacity-70">% a.a.</span>
          </div>
          <div className="mt-0.5 text-[10px] opacity-70">editável</div>
        </div>
      </div>
    </header>
  );
}
