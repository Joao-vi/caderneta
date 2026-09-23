import { useMemo } from 'react';
import { decomposicaoDoRuido, faixaDeRuido, simularAporteBtc } from '../domain/aporteBtc.js';
import CardBtc from '../components/btc/CardBtc.jsx';
import FormularioBtc from '../components/btc/FormularioBtc.jsx';
import GraficoBtc from '../components/btc/GraficoBtc.jsx';
import TabelaBtc from '../components/btc/TabelaBtc.jsx';
import Tese from '../components/btc/Tese.jsx';

function mesesAtras(n) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const entre = (v, min, max) => (v < min ? min : v > max ? max : v);

export default function Bitcoin({ status, dados, items, adicionar, adicionarTrio, remover, limpar }) {
  const precos = dados?.precos ?? null;

  const primeiroMes = precos ? precos[0][0].slice(0, 7) : null;
  const ultimoMes = precos ? precos[precos.length - 1][0].slice(0, 7) : null;
  const inicioPadrao = precos ? entre(mesesAtras(60), primeiroMes, ultimoMes) : null;

  const sims = useMemo(() => {
    if (!precos) return [];
    return items
      .map((ficha) => ({
        ficha,
        ...simularAporteBtc({
          precos,
          frequencia: ficha.frequencia,
          dia: ficha.dia,
          inicio: ficha.inicio,
          orcamentoMensal: ficha.orcamentoMensal,
        }),
      }))
      .filter((s) => s.resumo !== null);
  }, [items, precos]);

  // A faixa de ruído só é comparável contra um orçamento e um início; com
  // fichas de caixas diferentes ela mediria outra coisa e sairia de cena.
  const caixas = new Set(items.map((f) => `${f.orcamentoMensal}|${f.inicio}`));
  const mesmoPlanoDeCaixa = caixas.size === 1;
  const referencia = items[0];

  const faixa = useMemo(() => {
    if (!precos || !mesmoPlanoDeCaixa || !referencia?.orcamentoMensal) return null;
    return faixaDeRuido({
      precos,
      inicio: referencia.inicio,
      orcamentoMensal: referencia.orcamentoMensal,
    });
  }, [precos, mesmoPlanoDeCaixa, referencia?.inicio, referencia?.orcamentoMensal]);

  const ruido = useMemo(() => decomposicaoDoRuido(faixa), [faixa]);

  function confirmarLimpeza() {
    if (window.confirm('Apagar todas as projeções de bitcoin salvas neste navegador?')) limpar();
  }

  if (status === 'carregando') {
    return <p className="py-20 text-center text-ink-soft">Carregando a cotação do bitcoin…</p>;
  }
  if (status === 'erro') {
    return (
      <p className="py-20 text-center text-brick">
        Não foi possível carregar o histórico do bitcoin. Tente recarregar a página.
      </p>
    );
  }

  return (
    <>
      <div className="grid items-start gap-7 lg:grid-cols-[340px_1fr]">
        <FormularioBtc
          onAdd={adicionar}
          onAddTrio={adicionarTrio}
          primeiroMes={primeiroMes}
          ultimoMes={ultimoMes}
          inicioPadrao={inicioPadrao}
        />

        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[22px]">Suas projeções</h2>
            <span className="flex items-center gap-3 font-mono text-xs text-ink-soft">
              <span>{sims.length} {sims.length === 1 ? 'projeção' : 'projeções'}</span>
              {items.length > 0 && (
                <button type="button" onClick={confirmarLimpeza}
                        className="text-ink-soft underline underline-offset-2 hover:text-brick">
                  limpar tudo
                </button>
              )}
            </span>
          </div>

          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(270px,1fr))]">
            {sims.length === 0 ? (
              <div className="col-span-full rounded-sheet border border-dashed border-line bg-card px-6 py-10 text-center text-ink-soft">
                Nenhuma projeção ainda. Diga quanto tem por mês e clique em{' '}
                <strong>“Comparar as três frequências”</strong> para ver as três de uma vez.
              </div>
            ) : (
              sims.map((sim) => <CardBtc key={sim.ficha.id} sim={sim} onRemove={remover} />)
            )}
          </div>
        </div>
      </div>

      {sims.length > 0 && faixa && ruido && (
        <Tese faixa={faixa} ruido={ruido} inicio={referencia.inicio} fichas={items} />
      )}

      {sims.length > 0 && (
        <section className="mt-9" aria-labelledby="titulo-grafico-btc">
          <h2 id="titulo-grafico-btc" className="mb-4 text-[22px]">Evolução</h2>
          <div className="rounded-sheet border border-line bg-card p-6" style={{ boxShadow: 'var(--shadow-sheet)' }}>
            <GraficoBtc sims={sims} faixa={faixa} mesmoPlanoDeCaixa={mesmoPlanoDeCaixa} />
          </div>
        </section>
      )}

      {sims.length > 0 && <TabelaBtc sims={sims} />}

      {sims.length > 0 && !mesmoPlanoDeCaixa && (
        <p className="mt-5 rounded-sheet border border-dashed border-line bg-card px-5 py-4 text-[13px] text-ink-soft">
          As projeções têm orçamentos ou datas de início diferentes, então a faixa de ruído sai de
          cena — ela só compara escolhas feitas com o mesmo dinheiro no mesmo período. Repare na
          coluna <strong>Aportado</strong> antes de comparar os patrimônios.
        </p>
      )}
    </>
  );
}
