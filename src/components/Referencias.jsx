const FAIXAS = [
  ['Até 180 dias', '22,5%'],
  ['181 a 360 dias', '20,0%'],
  ['361 a 720 dias', '17,5%'],
  ['Acima de 720 dias', '15,0%'],
];

export default function Referencias() {
  const card = 'rounded-sheet border border-line bg-card px-6 py-5';
  return (
    <div className="mt-11 grid gap-5 md:grid-cols-[1.1fr_1fr]">
      <div className={card} style={{ boxShadow: 'var(--shadow-sheet)' }}>
        <h3 className="mb-3 text-base">Tabela regressiva de IR — renda fixa</h3>
        <table aria-label="Tabela regressiva de IR" className="w-full border-collapse text-[13px]">
          <tbody>
            {FAIXAS.map(([faixa, aliq]) => (
              <tr key={faixa}>
                <td className="border-b border-dashed border-line py-1.5">{faixa}</td>
                <td className="border-b border-dashed border-line py-1.5 text-right font-mono font-semibold text-brick">
                  {aliq}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3.5 text-[12.5px] text-ink-soft">
          Incide só sobre o rendimento, nunca sobre o capital aplicado. Vale para CDB, LC,
          Tesouro Direto e debêntures comuns — LCI, LCA, CRI, CRA e poupança são isentos.
          Confira sempre a alíquota vigente em{' '}
          <a className="text-green underline" href="https://www.gov.br/receitafederal" target="_blank" rel="noopener noreferrer">
            receita federal
          </a>
          , pois esta calculadora não substitui a fonte oficial.
        </p>
      </div>

      <div className={card} style={{ boxShadow: 'var(--shadow-sheet)' }}>
        <h3 className="mb-3 text-base">Como esta calculadora pensa</h3>
        <p className="text-[12.5px] text-ink-soft">
          Juros compostos sobre dias corridos (base 365). Cada aporte é um lote com relógio de
          IR próprio, então uma ficha com aportes tem alíquota efetiva, não uma faixa da tabela.
          O IOF regressivo entra em resgates com menos de 30 dias, sobre o rendimento e antes do
          IR. Com rolagem, o líquido de cada vencimento vira o capital do ciclo seguinte — o que
          num isento não custa nada e num tributado prende a alíquota na faixa do ciclo curto. A
          rentabilidade anual é a TIR do fluxo, para que fichas com e sem aporte sejam comparáveis.
        </p>
      </div>
    </div>
  );
}
