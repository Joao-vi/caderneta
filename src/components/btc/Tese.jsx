import { fmtPct } from '../../domain/formato.js';
import { rotuloDoPlano } from '../../domain/fichaBtc.js';
import { rotuloMes } from '../ui.jsx';
import LequeDeEscolhas from './LequeDeEscolhas.jsx';

/** Uma fonte de ruído, com a barra proporcional às outras. */
function Fonte({ rotulo, valor, maximo, destaque }) {
  const largura = maximo > 0 ? Math.max(2, (valor / maximo) * 100) : 2;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-[13px] ${destaque ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
          {rotulo}
        </span>
        <span className="font-mono text-[13px] font-semibold tabular text-ink">
          {fmtPct(valor, 2)}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-[2px] bg-paper-alt">
        <div
          className="h-1.5 rounded-[2px]"
          style={{ width: `${largura}%`, background: destaque ? 'var(--color-gold)' : 'var(--color-green-line)' }}
        />
      </div>
    </div>
  );
}

/**
 * O recado da tela. A ferramenta existe para comparar frequências, e a
 * resposta honesta é que a frequência quase não muda nada — o dia arbitrário
 * do mês costuma mexer mais, e também é ruído. Dizer isso na cara é o que
 * impede a tela de ensinar alguém a perseguir meio por cento.
 */
export default function Tese({ faixa, ruido, inicio, fichas }) {
  const maximo = Math.max(ruido.porDiaDoMes, ruido.porDiaDaSemana, ruido.entreFrequencias);
  const vencedor = faixa.melhorPlano;
  const desde = inicio ? ` desde ${rotuloMes(`${inicio}-01`)}` : '';

  return (
    <section
      aria-labelledby="titulo-tese-btc"
      className="mt-9 rounded-sheet border border-line bg-card p-6"
      style={{ boxShadow: 'var(--shadow-sheet)' }}
    >
      <div className="grid gap-7 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 id="titulo-tese-btc" className="text-[22px]">
            A frequência importa menos do que parece
          </h2>
          <p className="mt-3 max-w-[62ch] text-[14.5px] text-ink-soft">
            Testando as <strong>{faixa.variantes.length}</strong> maneiras de aportar esse mesmo
            orçamento{desde} — os 31 dias do mês, os 7 da semana e o diário — a melhor pagou{' '}
            <strong>{fmtPct(faixa.spread, 1)}</strong> menos que a pior pelo mesmo bitcoin.
            Escolher entre mensal, semanal e diário responde por{' '}
            <strong>{fmtPct(ruido.entreFrequencias, 2)}</strong> disso.
          </p>
          <p className="mt-3 max-w-[62ch] text-[14.5px] text-ink-soft">
            O <em>dia</em> arbitrário do mês pesa bem mais que a frequência. E pesar mais não é ser
            um sinal: “{rotuloDoPlano(vencedor.frequencia, vencedor.dia)}” foi a melhor escolha
            neste pedaço de passado, e não há razão para que continue sendo no próximo. O que sobra
            de verdade é começar cedo e não parar.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3.5 border-t border-dashed border-line pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            De onde vem a diferença
          </div>
          <Fonte rotulo="Dia do mês escolhido" valor={ruido.porDiaDoMes} maximo={maximo} destaque />
          <Fonte rotulo="Dia da semana escolhido" valor={ruido.porDiaDaSemana} maximo={maximo} />
          <Fonte rotulo="Mensal × semanal × diário" valor={ruido.entreFrequencias} maximo={maximo} />
          <p className="text-[11.5px] text-ink-soft">
            Espalhamento do preço médio pago dentro de cada escolha, com o mesmo orçamento.
          </p>
        </div>
      </div>

      <div className="mt-7 border-t border-dashed border-line pt-6">
        <LequeDeEscolhas faixa={faixa} fichas={fichas} />
      </div>
    </section>
  );
}
