const FAIXAS = [
  ['Até 180 dias', '22,5%'],
  ['181 a 360 dias', '20,0%'],
  ['361 a 720 dias', '17,5%'],
  ['Acima de 720 dias', '15,0%'],
];

const card = 'rounded-sheet border border-line bg-card px-6 py-5';
const sombra = { boxShadow: 'var(--shadow-sheet)' };
const texto = 'text-[12.5px] text-ink-soft';

function Card({ titulo, children }) {
  return (
    <div className={card} style={sombra}>
      <h3 className="mb-3 text-base">{titulo}</h3>
      {children}
    </div>
  );
}

function TabelaIR() {
  return (
    <Card titulo="Tabela regressiva de IR — renda fixa">
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
      <p className={`mt-3.5 ${texto}`}>
        Incide só sobre o rendimento, nunca sobre o capital aplicado. Vale para CDB, LC,
        Tesouro Direto e debêntures comuns — LCI, LCA, CRI, CRA e poupança são isentos.
        Confira sempre a alíquota vigente em{' '}
        <a className="text-green underline" href="https://www.gov.br/receitafederal" target="_blank" rel="noopener noreferrer">
          receita federal
        </a>
        , pois esta calculadora não substitui a fonte oficial.
      </p>
    </Card>
  );
}

const CONTEUDO = {
  'renda-fixa': (
    <>
      <TabelaIR />
      <Card titulo="Como esta calculadora pensa">
        <p className={texto}>
          Juros compostos sobre dias corridos (base 365). Cada aporte é um lote com relógio de
          IR próprio, então uma ficha com aportes tem alíquota efetiva, não uma faixa da tabela.
          O IOF regressivo entra em resgates com menos de 30 dias, sobre o rendimento e antes do
          IR. Com rolagem, o líquido de cada vencimento vira o capital do ciclo seguinte — o que
          num isento não custa nada e num tributado prende a alíquota na faixa do ciclo curto. A
          rentabilidade anual é a TIR do fluxo, para que fichas com e sem aporte sejam comparáveis.
        </p>
      </Card>
    </>
  ),

  etfs: (
    <>
      <Card titulo="De onde vêm os números">
        <p className={texto}>
          Cotações de fechamento ajustado do{' '}
          <a className="text-green underline" href="https://finance.yahoo.com" target="_blank" rel="noopener noreferrer">
            Yahoo Finance
          </a>
          , CDI e IPCA das séries 12 e 433 do{' '}
          <a className="text-green underline" href="https://www.bcb.gov.br/estatisticas/sgs" target="_blank" rel="noopener noreferrer">
            SGS do Banco Central
          </a>
          . Os arquivos são gerados no build e servidos junto com a página, atualizados
          diariamente após o fechamento — o navegador não fala com nenhuma dessas fontes.
        </p>
      </Card>
      <Card titulo="O que a simulação ignora">
        <p className={texto}>
          Tudo é bruto: não há IR sobre o ganho de capital, corretagem, custódia nem taxa de
          administração além da que já está embutida na cota do ETF. O aporte cai no primeiro
          pregão de cada mês, em cotas fracionárias. O CDI ao lado recebe o mesmo dinheiro nas
          mesmas datas, o que o torna régua e não previsão.
        </p>
      </Card>
    </>
  ),

  bitcoin: (
    <>
      <Card titulo="De onde vêm os números">
        <p className={texto}>
          Fechamento diário do par BTC-USD no{' '}
          <a className="text-green underline" href="https://finance.yahoo.com/quote/BTC-USD" target="_blank" rel="noopener noreferrer">
            Yahoo Finance
          </a>
          , desde setembro de 2014, em dólar e sem conversão. O arquivo é gerado no build e
          atualizado diariamente — inclusive no fim de semana, porque o bitcoin não fecha.
        </p>
      </Card>
      <Card titulo="Como esta simulação pensa">
        <p className={texto}>
          O orçamento é mensal e se divide pelo número de aportes que cabem no período, para que
          mensal, semanal e diário gastem o mesmo dinheiro — sem isso a comparação seria entre
          quantias, não entre frequências. Tudo bruto: sem IR, spread de corretora ou taxa de
          rede. Não há CDI ao lado de propósito: ele é em reais, e a comparação misturaria o
          efeito do câmbio com o do ativo. Comprar sempre o mesmo valor faz o preço médio pago
          ser a média harmônica dos preços, que é sempre menor ou igual à aritmética — esse é o
          único ganho do método que vale como teorema, e não como palpite.
        </p>
      </Card>
    </>
  ),
};

export default function Referencias({ aba = 'renda-fixa' }) {
  return (
    <div className="mt-11 grid gap-5 md:grid-cols-[1.1fr_1fr]">
      {CONTEUDO[aba] ?? CONTEUDO['renda-fixa']}
    </div>
  );
}
