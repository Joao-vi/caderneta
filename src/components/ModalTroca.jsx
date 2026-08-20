import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { aliquotaIR } from '../domain/tributacao.js';
import { dataParaDias, diasParaData, isoDe } from '../domain/datas.js';
import { fmtBRL, fmtPct } from '../domain/formato.js';
import {
  equivalentePctCDI, simularFicar, simularTrocar, taxaMinimaOferta, veredito,
} from '../domain/troca.js';
import { eixoBase } from './chartSetup.js';
import { Campo, Seg, Select, TextInput, UnitInput } from './ui.jsx';

const ROTULO = { vale: 'Vale a troca', 'nao-vale': 'Não vale a troca', empate: 'Dá na mesma' };
const TOM = {
  vale: 'border-green-line bg-green/[0.07] text-green-deep',
  'nao-vale': 'border-[#E0BEB7] bg-brick-soft text-brick',
  empate: 'border-line bg-paper-alt text-ink-soft',
};

export default function ModalTroca({ aberto, items, origemId, cdi, onClose }) {
  const [f, setF] = useState({
    origemId: null, disponivel: 0, nome: '', tipo: 'cdi', pctCDI: 130, pre: 16,
    prazo: 90, prazoModo: 'dias', venc: '', teto: 5000, trib: 'regressiva', aliqFixa: 15,
    horizonte: 90, horizonteModo: 'prazo', reapl: 'origem', reaplPct: 100,
  });
  const set = (campo) => (v) => setF((a) => ({ ...a, [campo]: v }));
  const setEv = (campo) => (e) => set(campo)(e.target.value);

  // ao abrir, a ficha clicada entra como origem já preenchida
  useEffect(() => {
    if (!aberto) return;
    const org = items.find((i) => i.id === origemId) || items[0];
    if (!org) return;
    setF((a) => ({
      ...a, origemId: org.id, disponivel: org.principal,
      horizonteModo: 'prazo', prazoModo: 'dias',
    }));
  }, [aberto, origemId, items]);

  useEffect(() => {
    if (!aberto) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [aberto, onClose]);

  const origem = items.find((i) => i.id === Number(f.origemId)) || items[0];

  const cfg = useMemo(() => {
    if (!origem) return null;
    const prazo = Math.max(1, parseInt(f.prazo, 10) || 1);
    const horizonte = f.horizonteModo === 'prazo' ? prazo : Math.max(1, parseInt(f.horizonte, 10) || prazo);
    const disponivel = Math.max(0, Number(f.disponivel) || 0);
    const teto = Math.max(0, Number(f.teto) || 0);
    return {
      prazo,
      horizonte,
      valor: Math.min(teto, disponivel),
      disponivel,
      teto,
      taxaOferta: f.tipo === 'cdi' ? cdi * ((Number(f.pctCDI) || 0) / 100) : Number(f.pre) || 0,
      taxaOrigem: origem.taxaAnual,
      taxaReaplicacao: f.reapl === 'custom' ? cdi * ((Number(f.reaplPct) || 0) / 100) : origem.taxaAnual,
      tribOferta: f.trib,
      aliqOferta: Number(f.aliqFixa) || 0,
      tribOrigem: origem.trib,
      aliqOrigem: origem.aliqFixa,
    };
  }, [f, origem, cdi]);

  if (!aberto || !origem || !cfg) return null;

  const { valor: V, horizonte: H, prazo } = cfg;
  const invalido = H < prazo;
  const semValor = V <= 0;

  const A = !invalido && !semValor ? simularFicar(V, cfg, H) : null;
  const B = !invalido && !semValor ? simularTrocar(V, cfg, H) : null;
  const delta = A && B ? B.liquido - A.liquido : 0;
  const status = veredito(delta, V);
  const equiv = A && B ? equivalentePctCDI(B.liquido, V, cfg, H, cdi) : null;
  const txMin = A && B ? taxaMinimaOferta(V, cfg, H) : null;

  const notaPrazo = () => {
    if (f.prazoModo === 'data') {
      const d = f.venc ? dataParaDias(f.venc) : null;
      if (d === null) return 'Escolha a data de vencimento.';
      if (d < 1) return <span className="text-brick">A data precisa ser futura.</span>;
      return <>≡ <b className="text-green-deep">{d}</b> dias corridos</>;
    }
    return <>vence em <b className="text-green-deep">{diasParaData(prazo).toLocaleDateString('pt-BR')}</b></>;
  };

  const pontos = [];
  if (A && B) {
    const hMax = Math.max(1095, prazo * 4, H);
    const passo = Math.max(1, Math.round((hMax - prazo) / 70));
    for (let h = prazo; h <= hMax; h += passo) {
      pontos.push({ x: h, y: simularTrocar(V, cfg, h).liquido - simularFicar(V, cfg, h).liquido });
    }
  }

  const Cel = ({ children, className = '' }) => (
    <td className={`border-b border-line px-3 py-2.5 text-right font-mono tabular ${className}`}>{children}</td>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-green-deep/40 p-4 backdrop-blur-[2px] sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="trocaTitulo"
           className="m-auto w-full max-w-[900px] rounded-sheet border border-line bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 rounded-t-[4px] border-b border-line bg-paper-alt px-6 py-5">
          <div>
            <h2 id="trocaTitulo" className="text-[22px]">Vale a troca?</h2>
            <p className="mt-1 max-w-[60ch] text-[13px] text-ink-soft">
              Tirar uma fatia de um investimento para uma oferta curta com teto — considerando
              que, no vencimento, o dinheiro volta.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" title="Fechar"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-card text-sm text-ink-soft hover:border-brick-soft hover:bg-brick-soft hover:text-brick">
            ✕
          </button>
        </div>

        <div className="px-6 pb-7 pt-6">
          <div className="grid gap-7 md:grid-cols-2">
            <div>
              <div className="mb-3 border-b border-green-line pb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-green">
                De — de onde sai o dinheiro
              </div>
              <Campo label="Investimento de origem" htmlFor="tOrigem">
                <Select id="tOrigem" value={String(origem.id)} onChange={setEv('origemId')}>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
              </Campo>
              <Campo label="Valor disponível na origem" htmlFor="tDisponivel">
                <UnitInput id="tDisponivel" type="number" min="0" step="100" unidade="R$"
                           value={f.disponivel} onChange={setEv('disponivel')} />
              </Campo>
              <p className="text-[12.5px] leading-7 text-ink-soft">
                Rende <b className="text-ink">{origem.tag}</b> · <b className="text-ink">{fmtPct(origem.taxaAnual, 2)} a.a.</b>
                <br />
                Tributação: <b className="text-ink">{origem.tribLabel}</b>
              </p>
            </div>

            <div>
              <div className="mb-3 border-b border-green-line pb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-green">
                Para — a oferta
              </div>
              <Campo label="Nome da oferta" htmlFor="tNome">
                <TextInput id="tNome" type="text" value={f.nome} onChange={setEv('nome')} placeholder="Ex.: Promo Banco Y" />
              </Campo>
              <Campo label="Rentabilidade">
                <Seg aria-label="Tipo de rentabilidade da oferta" valor={f.tipo} onChange={set('tipo')}
                     opcoes={[{ valor: 'cdi', rotulo: '% do CDI' }, { valor: 'pre', rotulo: 'Prefixado a.a.' }]} />
              </Campo>
              {f.tipo === 'cdi' ? (
                <Campo label="Percentual do CDI" htmlFor="tPctCDI">
                  <UnitInput id="tPctCDI" type="number" min="0" step="1" unidade="%" value={f.pctCDI} onChange={setEv('pctCDI')} />
                </Campo>
              ) : (
                <Campo label="Taxa prefixada" htmlFor="tPre">
                  <UnitInput id="tPre" type="number" min="0" step="0.1" unidade="% a.a." value={f.pre} onChange={setEv('pre')} />
                </Campo>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="mb-4">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor="tPrazo" className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">Prazo</label>
                    <div className="flex shrink-0 overflow-hidden rounded-[3px] border border-line">
                      {[['dias', 'dias'], ['data', 'vencimento']].map(([v, r]) => (
                        <button key={v} type="button" aria-pressed={f.prazoModo === v}
                          onClick={() => {
                            set('prazoModo')(v);
                            if (v === 'data') set('venc')(isoDe(diasParaData(prazo)));
                          }}
                          className={`border-r border-line px-2 py-0.5 font-mono text-[10.5px] last:border-r-0 ${
                            f.prazoModo === v ? 'bg-green text-white' : 'bg-paper text-ink-soft'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  {f.prazoModo === 'dias' ? (
                    <UnitInput id="tPrazo" type="number" min="1" step="1" unidade="dias" value={f.prazo} onChange={setEv('prazo')} />
                  ) : (
                    <TextInput id="tPrazo" type="date" value={f.venc}
                      onChange={(e) => {
                        set('venc')(e.target.value);
                        const d = dataParaDias(e.target.value);
                        if (d !== null && d >= 1) set('prazo')(d);
                      }} />
                  )}
                  <div className="mt-1.5 font-mono text-[11.5px] text-ink-soft">{notaPrazo()}</div>
                </div>
                <Campo label="Teto de aporte" htmlFor="tTeto">
                  <UnitInput id="tTeto" type="number" min="0" step="100" unidade="R$" value={f.teto} onChange={setEv('teto')} />
                </Campo>
              </div>

              <Campo label="Tributação da oferta" htmlFor="tTrib">
                <Select id="tTrib" value={f.trib} onChange={setEv('trib')}>
                  <option value="regressiva">Tabela regressiva (padrão CDB/Tesouro)</option>
                  <option value="isento">Isento de IR (LCI, LCA, CRI, CRA)</option>
                  <option value="fixo">Alíquota fixa personalizada</option>
                </Select>
              </Campo>
              {f.trib === 'fixo' && (
                <Campo label="Alíquota de IR da oferta" htmlFor="tAliqFixa">
                  <UnitInput id="tAliqFixa" type="number" min="0" max="100" step="0.5" unidade="%" value={f.aliqFixa} onChange={setEv('aliqFixa')} />
                </Campo>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-[3px] border border-dashed border-line bg-paper px-4 py-3 text-[13px] text-ink-soft">
            {semValor ? 'Informe um valor disponível e um teto maiores que zero.' : (
              <>
                Migram <b className="font-mono text-green-deep">{fmtBRL(V)}</b> para {f.nome || 'a oferta'} ·
                {' '}ficam <b className="font-mono text-green-deep">{fmtBRL(cfg.disponivel - V)}</b> rendendo na origem
                {cfg.teto < cfg.disponivel && <em> (limitado pelo teto da oferta)</em>}
              </>
            )}
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <span className="mb-2.5 block text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">
              Horizonte — quando você realmente vai precisar desse dinheiro?
            </span>
            <Seg aria-label="Horizonte" valor={f.horizonteModo}
              onChange={(v) => setF((a) => ({ ...a, horizonteModo: v, horizonte: v === 'prazo' ? prazo : Number(v) }))}
              opcoes={[
                { valor: 'prazo', rotulo: 'No vencimento da oferta' },
                { valor: '180', rotulo: '6 meses' },
                { valor: '365', rotulo: '1 ano' },
                { valor: '720', rotulo: '2 anos' },
              ]} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {/* mostra o texto cru, não o valor coagido: senão limpar o campo o repõe sozinho */}
              <UnitInput type="number" min="1" step="1" unidade="dias" aria-label="Horizonte em dias"
                value={f.horizonteModo === 'prazo' ? prazo : f.horizonte}
                onChange={(e) => setF((a) => ({ ...a, horizonteModo: 'livre', horizonte: e.target.value }))} />
              <div className="flex flex-col justify-center gap-1 text-[12.5px] text-ink-soft">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input type="radio" name="tReapl" checked={f.reapl === 'origem'} onChange={() => set('reapl')('origem')} className="accent-green" />
                  ao vencer, volta para a taxa da origem
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input type="radio" name="tReapl" checked={f.reapl === 'custom'} onChange={() => set('reapl')('custom')} className="accent-green" />
                  volta para
                  <input type="number" min="0" step="1" aria-label="Percentual do CDI na reaplicação" value={f.reaplPct}
                    onChange={setEv('reaplPct')} className="w-14 rounded-[3px] border border-line bg-paper px-1 py-0.5 text-[12.5px]" />
                  % do CDI
                </label>
              </div>
            </div>
          </div>

          {invalido ? (
            <div role="alert" className="mt-6 rounded-sheet border border-[#E0BEB7] bg-brick-soft px-5 py-4 text-[13.5px] text-brick">
              <strong>Horizonte menor que o prazo da oferta.</strong>
              <br />
              O dinheiro fica preso até o dia {prazo} — essas ofertas curtas quase nunca têm
              liquidez. Aumente o horizonte para pelo menos {prazo} dias ou descarte a troca.
            </div>
          ) : semValor ? null : (
            <>
              <div className={`mt-6 flex flex-wrap items-center justify-between gap-4 rounded-sheet border px-5 py-5 ${TOM[status]}`}>
                <div>
                  <div className="font-serif text-[22px] font-semibold">{ROTULO[status]}</div>
                  <div className="mt-0.5 text-[12.5px] text-ink-soft">
                    {status === 'empate'
                      ? `A diferença é menor que 0,1% do valor migrado em ${H} dias — ruído, não decisão.`
                      : `em ${H} dias · ${fmtPct((Math.abs(delta) / V) * 100, 3)} do valor migrado`}
                  </div>
                </div>
                <div className="font-mono text-[26px] font-semibold tabular">
                  {delta >= 0 ? '+' : '−'} {fmtBRL(Math.abs(delta))}
                </div>
              </div>

              {equiv !== null && (
                <div className="mt-4 rounded-sheet bg-green-deep px-5 py-4 text-center text-paper">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] opacity-75">a manobra equivale a</div>
                  <div className="my-0.5 font-serif text-[38px] font-semibold leading-tight">{fmtPct(equiv, 1)} do CDI</div>
                  <div className="text-[12.5px] opacity-80">sobre os {fmtBRL(V)}, no horizonte de {H} dias</div>
                </div>
              )}

              <table className="mt-5 w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-soft">
                    <th className="border-b border-line px-3 py-2.5 text-left" />
                    <th className="border-b border-line px-3 py-2.5 text-right">Ficar parado</th>
                    <th className="border-b border-line px-3 py-2.5 text-right">Trocar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-line px-3 py-2.5 text-left text-ink-soft">Valor migrado</td>
                    <Cel>{fmtBRL(V)}</Cel><Cel>{fmtBRL(V)}</Cel>
                  </tr>
                  <tr>
                    <td className="border-b border-line px-3 py-2.5 text-left text-ink-soft">Rendimento bruto</td>
                    <Cel>{fmtBRL(A.rend)}</Cel><Cel>{fmtBRL(B.rend)}</Cel>
                  </tr>
                  {(A.iof > 0 || B.iof > 0) && (
                    <tr>
                      <td className="border-b border-line px-3 py-2.5 text-left text-ink-soft">IOF</td>
                      <Cel className="text-brick">{A.iof > 0 ? `− ${fmtBRL(A.iof)}` : '—'}</Cel>
                      <Cel className="text-brick">{B.iof > 0 ? `− ${fmtBRL(B.iof)}` : '—'}</Cel>
                    </tr>
                  )}
                  {B.pernas === 2 && (
                    <tr>
                      <td className="border-b border-line px-3 py-2.5 text-left text-ink-soft">
                        IR no resgate da oferta <span className="text-[11.5px] text-brick">(dia {prazo})</span>
                      </td>
                      <Cel>—</Cel><Cel className="text-brick">− {fmtBRL(B.irOferta)}</Cel>
                    </tr>
                  )}
                  <tr>
                    <td className="border-b border-line px-3 py-2.5 text-left text-ink-soft">IR no fim do horizonte</td>
                    <Cel className="text-brick">− {fmtBRL(A.ir)}</Cel>
                    <Cel className="text-brick">− {fmtBRL(B.pernas === 2 ? B.irFinal : B.irOferta)}</Cel>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 text-left text-[15px] font-bold text-green-deep">Valor final líquido</td>
                    <Cel className="text-[15px] font-bold text-green-deep">{fmtBRL(A.liquido)}</Cel>
                    <Cel className="text-[15px] font-bold text-green-deep">{fmtBRL(B.liquido)}</Cel>
                  </tr>
                </tbody>
              </table>

              <div className="mt-4 grid gap-2.5">
                {txMin !== null && (
                  <div className="rounded-r-[3px] border-l-[3px] border-gold bg-paper px-4 py-3 text-[13px] text-ink-soft">
                    Nesse horizonte, a oferta precisaria pagar pelo menos{' '}
                    <b className="font-mono text-ink">
                      {f.tipo === 'cdi' && cdi > 0 ? `${fmtPct((txMin / cdi) * 100, 1)} do CDI` : `${fmtPct(txMin, 2)} a.a.`}
                    </b>{' '}
                    para empatar com ficar parado.
                  </div>
                )}
                {B.pernas === 2 && aliquotaIR(prazo, cfg.tribOferta, cfg.aliqOferta) > aliquotaIR(H, cfg.tribOrigem, cfg.aliqOrigem) && (
                  <div className="rounded-r-[3px] border-l-[3px] border-gold bg-paper px-4 py-3 text-[13px] text-ink-soft">
                    Resgatar no dia {prazo} paga IR de{' '}
                    <b className="font-mono text-ink">{fmtPct(aliquotaIR(prazo, cfg.tribOferta, cfg.aliqOferta), 1)}</b> em vez dos{' '}
                    <b className="font-mono text-ink">{fmtPct(aliquotaIR(H, cfg.tribOrigem, cfg.aliqOrigem), 1)}</b>{' '}
                    que você pagaria ficando parado até o dia {H} — e reinicia a contagem da tabela regressiva.
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                  Ganho da troca conforme o horizonte
                </div>
                <div className="h-[220px]">
                  <Line
                    data={{
                      datasets: [{
                        label: 'Ganho da troca',
                        data: pontos,
                        borderWidth: 2.5, pointRadius: 0, tension: 0.15, borderColor: '#1E5B41',
                        segment: { borderColor: (ctx) => (ctx.p1.parsed.y < 0 ? '#A23B2E' : '#1E5B41') },
                      }],
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      interaction: { mode: 'nearest', intersect: false },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            title: (t) => `Horizonte de ${t[0].parsed.x} dias`,
                            label: (x) => `${x.parsed.y >= 0 ? 'Ganho ' : 'Perda '}${fmtBRL(Math.abs(x.parsed.y))}`,
                          },
                        },
                      },
                      scales: {
                        x: { type: 'linear', ...eixoBase('Horizonte (dias)') },
                        y: { ...eixoBase('Ganho da troca (R$)'), ticks: { callback: (v) => `R$ ${v.toFixed(0)}` } },
                      },
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
