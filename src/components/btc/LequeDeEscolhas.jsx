import { rotuloDoPlano } from '../../domain/fichaBtc.js';
import { fmtPct, fmtUSD } from '../../domain/formato.js';

const LINHAS = [
  { frequencia: 'mensal', rotulo: 'Mensal' },
  { frequencia: 'semanal', rotulo: 'Semanal' },
  { frequencia: 'diaria', rotulo: 'Diário' },
];

const mesma = (ficha, v) =>
  ficha.frequencia === v.frequencia && (ficha.dia ?? null) === (v.dia ?? null);

function Ponto({ esquerda, cor, titulo }) {
  const escolhida = Boolean(cor);
  return (
    <span
      title={titulo}
      className="absolute top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{
        left: `${esquerda}%`,
        width: escolhida ? 13 : 11,
        height: escolhida ? 13 : 11,
        // o anel na cor da superfície separa pontos sobrepostos sem contorná-los
        background: cor ?? 'rgba(75, 91, 80, 0.32)',
        boxShadow: `0 0 0 2px var(--color-card)`,
      }}
    />
  );
}

/**
 * Uma linha por frequência, um ponto por escolha possível, posicionado pelo
 * preço médio que aquela escolha pagou.
 *
 * É esta a forma certa para a pergunta. No gráfico de linha a diferença entre
 * as escolhas — uns poucos por cento — some atrás da variação do preço do
 * bitcoin, que multiplica por três. Aqui o eixo inteiro *é* a diferença entre
 * as escolhas, e as três nuvens aparecem empilhadas umas sobre as outras: é o
 * desenho do argumento, não uma ilustração dele.
 *
 * Em HTML e não em SVG porque num `viewBox` o texto encolhe junto com o
 * desenho, e no celular os rótulos ficariam ilegíveis.
 */
export default function LequeDeEscolhas({ faixa, fichas }) {
  const precos = faixa.variantes.map((v) => v.resumo.precoMedio);
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  const vao = max - min;
  const posicao = (p) => (vao > 0 ? ((p - min) / vao) * 100 : 50);

  const fichaDe = (v) => fichas.find((f) => mesma(f, v));

  return (
    <figure className="m-0">
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft">
          Todas as escolhas possíveis, pelo preço médio que pagaram
        </span>
        <span className="text-[11.5px] text-ink-soft">
          da melhor à pior, {fmtPct(faixa.spread, 1)}
        </span>
      </figcaption>

      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
        {LINHAS.map((linha) => {
          const variantes = faixa.variantes.filter((v) => v.frequencia === linha.frequencia);
          if (!variantes.length) return null;
          return (
            <div key={linha.frequencia} className="contents">
              <span className="text-right text-[13px] text-ink">{linha.rotulo}</span>
              <span className="relative block h-7 px-[7px]">
                <span className="absolute inset-x-[7px] top-1/2 block h-px -translate-y-1/2 bg-grid" />
                <span className="relative block h-full">
                  {variantes.map((v) => {
                    const ficha = fichaDe(v);
                    return (
                      <Ponto
                        key={`${v.frequencia}-${v.dia}`}
                        esquerda={posicao(v.resumo.precoMedio)}
                        cor={ficha?.color}
                        titulo={`${ficha ? `${ficha.nome} — ` : ''}${rotuloDoPlano(v.frequencia, v.dia)}: ${fmtUSD(v.resumo.precoMedio, 0)}`}
                      />
                    );
                  })}
                </span>
              </span>
            </div>
          );
        })}

        <span />
        <div className="mt-1 border-t border-line pt-1.5">
          <div className="flex justify-between gap-3 font-mono text-[11.5px] text-ink-soft">
            <span>{fmtUSD(min, 0)}</span>
            <span className="font-sans">preço médio pago — à esquerda é mais barato</span>
            <span>{fmtUSD(max, 0)}</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[12px] text-ink-soft">
        Cada ponto é uma forma de aportar o mesmo orçamento; os coloridos são as suas. As três
        linhas cobrem quase a mesma faixa — trocar de frequência move menos que trocar o dia.
      </p>
    </figure>
  );
}
