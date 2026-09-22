import { useState } from 'react'
import CampoPrazo from './CampoPrazo.jsx'
import { Campo, Painel, Seg, Select, TextInput, UnitInput } from './ui.jsx'

const INICIAL = {
  name: '',
  principal: 10000,
  aporte: 0,
  tipo: 'cdi',
  pctCDI: 100,
  pre: 14,
  prazo: 720,
  rolar: false,
  horizonte: 720,
  trib: 'regressiva',
  aliqFixa: 15,
}

export default function FormularioFicha({ onAdd }) {
  const [f, setF] = useState(INICIAL)
  const set = (campo) => (v) => setF((atual) => ({ ...atual, [campo]: v }))
  const setEv = (campo) => (e) => set(campo)(e.target.value)

  function submeter(e) {
    e.preventDefault()
    onAdd(f)
    setF((atual) => ({ ...atual, name: '' }))
  }

  return (
    <Painel className="p-6 lg:sticky lg:top-6">
      <form onSubmit={submeter}>
        <h2 className="mb-1 text-xl">Nova ficha</h2>
        <p className="mb-5 text-[13px] text-ink-soft">Adicione um investimento para comparar.</p>

        <Campo
          label="Nome / instituição"
          htmlFor="fName"
        >
          <TextInput
            id="fName"
            type="text"
            value={f.name}
            onChange={setEv('name')}
            placeholder="Ex.: Banco X — CDB 2 anos"
          />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo
            label="Valor inicial"
            htmlFor="fPrincipal"
          >
            <UnitInput
              id="fPrincipal"
              type="number"
              min="0"
              step="100"
              unidade="R$"
              value={f.principal}
              onChange={setEv('principal')}
            />
          </Campo>
          <Campo
            label="Aporte mensal"
            htmlFor="fAporte"
          >
            <UnitInput
              id="fAporte"
              type="number"
              min="0"
              step="100"
              unidade="R$"
              value={f.aporte}
              onChange={setEv('aporte')}
            />
          </Campo>
        </div>

        <Campo label="Rentabilidade">
          <Seg
            aria-label="Tipo de rentabilidade"
            valor={f.tipo}
            onChange={set('tipo')}
            opcoes={[
              { valor: 'cdi', rotulo: '% do CDI' },
              { valor: 'pre', rotulo: 'Prefixado a.a.' },
            ]}
          />
        </Campo>

        {f.tipo === 'cdi' ? (
          <Campo
            label="Percentual do CDI"
            htmlFor="fPctCDI"
          >
            <UnitInput
              id="fPctCDI"
              type="number"
              min="0"
              step="1"
              unidade="%"
              value={f.pctCDI}
              onChange={setEv('pctCDI')}
            />
          </Campo>
        ) : (
          <Campo
            label="Taxa prefixada"
            htmlFor="fPre"
          >
            <UnitInput
              id="fPre"
              type="number"
              min="0"
              step="0.1"
              unidade="% a.a."
              value={f.pre}
              onChange={setEv('pre')}
            />
          </Campo>
        )}

        <CampoPrazo
          id="fPrazo"
          label={f.rolar ? 'Prazo de cada ciclo' : 'Prazo'}
          dias={f.prazo}
          onDiasChange={set('prazo')}
          atalhos={[
            ['30', '30 dias'],
            ['90', '3 meses'],
            ['180', '6 meses'],
            ['365', '1 ano'],
            ['720', '2 anos'],
            ['1095', '3 anos'],
          ]}
        />

        <div className="mb-4">
          <label
            htmlFor="fRolar"
            className="flex cursor-pointer items-center gap-2 text-[13px] text-ink"
          >
            <input
              id="fRolar"
              type="checkbox"
              checked={f.rolar}
              onChange={(e) => set('rolar')(e.target.checked)}
              className="h-[15px] w-[15px] accent-green"
            />
            Reinvestir ao vencer (rolagem)
          </label>
          <p className="mt-1.5 text-[11.5px] text-ink-soft">
            Ao vencer, o total líquido entra num papel igual, repetidamente.
          </p>
        </div>

        {f.rolar && (
          <Campo
            label="Horizonte total"
            htmlFor="fHorizonte"
          >
            <div className="grid grid-cols-2 gap-3">
              <UnitInput
                id="fHorizonte"
                type="number"
                min="1"
                step="1"
                unidade="dias"
                value={f.horizonte}
                onChange={setEv('horizonte')}
              />
              <Select
                aria-label="Atalhos de horizonte"
                value=""
                onChange={(e) => e.target.value && set('horizonte')(e.target.value)}
              >
                <option value="">atalhos…</option>
                <option value="365">1 ano</option>
                <option value="720">2 anos</option>
                <option value="1095">3 anos</option>
                <option value="1825">5 anos</option>
              </Select>
            </div>
          </Campo>
        )}

        <Campo
          label="Tributação"
          htmlFor="fTrib"
        >
          <Select
            id="fTrib"
            value={f.trib}
            onChange={setEv('trib')}
          >
            <option value="regressiva">Tabela regressiva (padrão CDB/Tesouro)</option>
            <option value="isento">Isento de IR (LCI, LCA, CRI, CRA, poupança)</option>
            <option value="fixo">Alíquota fixa personalizada</option>
          </Select>
        </Campo>

        {f.trib === 'fixo' && (
          <Campo
            label="Alíquota de IR"
            htmlFor="fAliqFixa"
          >
            <UnitInput
              id="fAliqFixa"
              type="number"
              min="0"
              max="100"
              step="0.5"
              unidade="%"
              value={f.aliqFixa}
              onChange={setEv('aliqFixa')}
            />
          </Campo>
        )}

        <button
          type="submit"
          className="mt-1.5 w-full rounded-[3px] bg-green p-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-green-deep"
        >
          + Adicionar à comparação
        </button>
      </form>
    </Painel>
  )
}
