import { useState } from 'react';
import FichaCard from '../components/FichaCard.jsx';
import FormularioFicha from '../components/FormularioFicha.jsx';
import ModalTroca from '../components/ModalTroca.jsx';
import Projecao from '../components/Projecao.jsx';
import TabelaComparativa from '../components/TabelaComparativa.jsx';

export default function RendaFixa({ items, cdi, adicionar, remover, limpar }) {
  const [trocaId, setTrocaId] = useState(null);

  function confirmarLimpeza() {
    if (window.confirm('Apagar todas as fichas salvas neste navegador?')) limpar();
  }

  return (
    <>
      <div className="grid items-start gap-7 lg:grid-cols-[340px_1fr]">
        <FormularioFicha onAdd={adicionar} />

        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[22px]">Suas fichas</h2>
            <span className="flex items-center gap-3 font-mono text-xs text-ink-soft">
              <span>{items.length} {items.length === 1 ? 'investimento' : 'investimentos'}</span>
              {items.length > 0 && (
                <button type="button" onClick={confirmarLimpeza}
                        className="text-ink-soft underline underline-offset-2 hover:text-brick">
                  limpar tudo
                </button>
              )}
            </span>
          </div>

          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(270px,1fr))]">
            {items.length === 0 ? (
              <div className="col-span-full rounded-sheet border border-dashed border-line bg-card px-6 py-10 text-center text-ink-soft">
                Nenhuma ficha ainda. Preencha o formulário ao lado e clique em{' '}
                <strong>“Adicionar à comparação”</strong>.
              </div>
            ) : (
              items.map((item) => (
                <FichaCard key={item.id} item={item} cdi={cdi} onRemove={remover} onTroca={setTrocaId} />
              ))
            )}
          </div>
        </div>
      </div>

      <Projecao items={items} />
      <TabelaComparativa items={items} cdi={cdi} />

      <ModalTroca
        aberto={trocaId !== null && items.length > 0}
        items={items}
        origemId={trocaId}
        cdi={cdi}
        onClose={() => setTrocaId(null)}
      />
    </>
  );
}
