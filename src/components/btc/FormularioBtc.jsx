import { useState } from 'react';
import { valorPorAporte } from '../../domain/aporteBtc.js';
import { DIAS_DA_SEMANA, avisoDoDia, diaValido } from '../../domain/fichaBtc.js';
import { fmtUSD } from '../../domain/formato.js';
import { Campo, Painel, Seg, SeletorMes, Select, TextInput, UnitInput } from '../ui.jsx';

const PADRAO = {
  nome: '',
  orcamentoMensal: 600,
  frequencia: 'mensal',
  dia: 1,
  diaSemana: 1,
  inicio: null, // preenchido com o padrão da página, que depende da série
};

const APORTES = { mensal: '1 aporte por mês', semanal: '~4,3 aportes por mês', diaria: '~30 aportes por mês' };

export default function FormularioBtc({ onAdd, onAddTrio, primeiroMes, ultimoMes, inicioPadrao }) {
  const [f, setF] = useState({ ...PADRAO, inicio: inicioPadrao });
  const set = (campo) => (v) => setF((atual) => ({ ...atual, [campo]: v }));

  const inicio = f.inicio < primeiroMes ? primeiroMes : f.inicio > ultimoMes ? ultimoMes : f.inicio;
  const orcamento = Number(f.orcamentoMensal) || 0;
  const dia = f.frequencia === 'semanal' ? f.diaSemana : f.dia;
  const aviso = avisoDoDia(f.frequencia, diaValido(f.frequencia, dia));
  const porAporte = valorPorAporte(orcamento, f.frequencia);

  const dados = () => ({ ...f, dia, inicio });

  function enviar(e) {
    e.preventDefault();
    onAdd(dados());
    setF((atual) => ({ ...atual, nome: '' }));
  }

  return (
    <Painel className="p-6">
      <form onSubmit={enviar}>
        <Campo
          label="Orçamento mensal"
          htmlFor="btc-orcamento"
          hint={`${APORTES[f.frequencia]} de ${fmtUSD(porAporte)}`}
        >
          {/* step="any": com um passo fixo o HTML usa `min` como base e
              recusa tudo que não caia na grade — com min=1 e step=50 o próprio
              padrão de 600 seria inválido e o submit falharia calado. */}
          <UnitInput
            id="btc-orcamento"
            type="number"
            min="1"
            step="any"
            unidade="US$"
            value={f.orcamentoMensal}
            onChange={(e) => set('orcamentoMensal')(e.target.value)}
          />
        </Campo>

        <Campo label="Frequência">
          <Seg
            aria-label="Frequência"
            valor={f.frequencia}
            onChange={set('frequencia')}
            opcoes={[
              { valor: 'mensal', rotulo: 'Mensal' },
              { valor: 'semanal', rotulo: 'Semanal' },
              { valor: 'diaria', rotulo: 'Diário' },
            ]}
          />
        </Campo>

        {f.frequencia === 'mensal' && (
          <Campo label="Dia do mês" htmlFor="btc-dia" hint={aviso}>
            <UnitInput
              id="btc-dia"
              type="number"
              min="1"
              max="31"
              step="1"
              value={f.dia}
              onChange={(e) => set('dia')(e.target.value)}
            />
          </Campo>
        )}

        {f.frequencia === 'semanal' && (
          <Campo label="Dia da semana" htmlFor="btc-dia-semana">
            <Select
              id="btc-dia-semana"
              value={f.diaSemana}
              onChange={(e) => set('diaSemana')(Number(e.target.value))}
            >
              {DIAS_DA_SEMANA.map((d) => (
                <option key={d.valor} value={d.valor}>{d.rotulo}</option>
              ))}
            </Select>
          </Campo>
        )}

        {f.frequencia === 'diaria' && (
          <p className="mb-4 rounded-[3px] border border-dashed border-line px-3 py-2.5 text-[12.5px] text-ink-soft">
            O bitcoin negocia todo dia, inclusive fim de semana e feriado — não há dia a escolher.
          </p>
        )}

        <SeletorMes
          rotulo="Primeiro aporte"
          valor={inicio}
          onChange={set('inicio')}
          primeiro={primeiroMes}
          ultimo={ultimoMes}
          hint={f.inicio < primeiroMes ? 'Antes disso não há cotação' : null}
        />

        <Campo label="Nome (opcional)" htmlFor="btc-nome">
          <TextInput
            id="btc-nome"
            type="text"
            maxLength={120}
            placeholder="fica o plano, se vazio"
            value={f.nome}
            onChange={(e) => set('nome')(e.target.value)}
          />
        </Campo>

        <button
          type="submit"
          className="w-full rounded-[3px] bg-green px-4 py-3 text-[14.5px] font-semibold text-white hover:bg-green-deep"
        >
          Adicionar à comparação
        </button>

        <button
          type="button"
          onClick={() => onAddTrio(dados())}
          className="mt-2 w-full rounded-[3px] border border-line bg-paper px-4 py-2.5 text-[13.5px] text-green-deep hover:border-green"
        >
          Comparar as três frequências
        </button>
        <p className="mt-2 text-[11.5px] text-ink-soft">
          Cria mensal, semanal e diário com este mesmo orçamento e a mesma data de início.
        </p>
      </form>
    </Painel>
  );
}
