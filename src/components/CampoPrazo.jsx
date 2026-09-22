import { useState } from 'react'
import { dataParaDias, diasParaData, isoDe } from '../domain/datas.js'
import { Select, TextInput, UnitInput } from './ui.jsx'

/**
 * Prazo expresso em dias ou como data de vencimento.
 *
 * O prazo em dias é a fonte única de verdade e vive no componente pai; a data
 * só escreve nele. O texto digitado fica em estado local em vez de ser
 * derivado dos dias — se fosse derivado, limpar o campo o repor-lhe-ia
 * sozinho e seria impossível digitar outro valor.
 */
export default function CampoPrazo({ id, label, dias, onDiasChange, atalhos }) {
  const [modo, setModo] = useState('dias')
  const [venc, setVenc] = useState('')

  const diasNum = Math.max(1, parseInt(dias, 10) || 1)

  function trocarModo(novo) {
    setModo(novo)
    if (novo === 'data') setVenc(isoDe(diasParaData(diasNum)))
  }

  function escolherData(valor) {
    setVenc(valor)
    const d = dataParaDias(valor)
    if (d !== null && d >= 1) onDiasChange(String(d))
  }

  function aplicarAtalho(valor) {
    onDiasChange(valor)
    if (modo === 'data') setVenc(isoDe(diasParaData(Number(valor))))
  }

  function nota() {
    if (modo === 'dias') {
      return <>vence em <b className="text-green-deep">{diasParaData(diasNum).toLocaleDateString('pt-BR')}</b></>
    }
    const d = venc ? dataParaDias(venc) : null
    if (d === null) return 'Escolha a data de vencimento.'
    if (d < 1) return <span className="text-brick">A data precisa ser futura.</span>
    return <>≡ <b className="text-green-deep">{d}</b> dias corridos</>
  }

  const entrada =
    modo === 'dias' ? (
      <UnitInput
        id={id} type="number" min="1" step="1" unidade="dias"
        aria-describedby={`${id}-nota`}
        value={dias} onChange={(e) => onDiasChange(e.target.value)}
      />
    ) : (
      <TextInput
        id={id} type="date" aria-describedby={`${id}-nota`}
        value={venc} onChange={(e) => escolherData(e.target.value)}
      />
    )

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft">
          {label}
        </label>
        <div className="flex shrink-0 overflow-hidden rounded-[3px] border border-line">
          {[['dias', 'dias'], ['data', 'vencimento']].map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={modo === valor}
              onClick={() => trocarModo(valor)}
              className={`border-r border-line px-2 py-0.5 font-mono text-[10.5px] transition-colors last:border-r-0 ${
                modo === valor ? 'bg-green text-white' : 'bg-paper text-ink-soft hover:text-green-deep'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {atalhos ? (
        <div className="grid grid-cols-2 gap-3">
          {entrada}
          <Select
            aria-label={`Atalhos de ${label.toLowerCase()}`}
            value=""
            onChange={(e) => e.target.value && aplicarAtalho(e.target.value)}
          >
            <option value="">atalhos…</option>
            {atalhos.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </Select>
        </div>
      ) : (
        entrada
      )}

      {/* descrição acessível do campo: quem usa leitor de tela ouve a outra face do prazo */}
      <div id={`${id}-nota`} className="mt-1.5 font-mono text-[11.5px] text-ink-soft">
        {nota()}
      </div>
    </div>
  )
}
