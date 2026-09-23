import './components/chartSetup.js';
import { useAba } from './components/Abas.jsx';
import Hero, { DiscoCdi, Medalhao } from './components/Hero.jsx';
import Referencias from './components/Referencias.jsx';
import Bitcoin from './paginas/Bitcoin.jsx';
import Etfs from './paginas/Etfs.jsx';
import RendaFixa from './paginas/RendaFixa.jsx';
import { fmtUSD } from './domain/formato.js';
import { useDadosBtc } from './hooks/useDadosBtc.js';
import { useFichas } from './hooks/useFichas.js';
import { useFichasBtc } from './hooks/useFichasBtc.js';
import { rotuloData } from './components/ui.jsx';

const destaque = (texto) => <em className="font-medium italic text-gold">{texto}</em>;

export default function App() {
  const [aba, irPara] = useAba();
  const fixa = useFichas();
  const btc = useFichasBtc();
  const dadosBtc = useDadosBtc();

  const ultimo = dadosBtc.dados?.precos?.at(-1) ?? null;

  const cabecalhos = {
    'renda-fixa': {
      tag: 'comparador de renda fixa',
      titulo: <>Quanto o seu {destaque('CDB')} realmente&nbsp;paga.</>,
      subtitulo: 'Monte fichas de CDB, LCI/LCA ou Tesouro, ajuste prazo e tributação, e compare o '
        + 'líquido de verdade — depois do IR e do IOF.',
      medalhao: <DiscoCdi cdi={fixa.cdi} onCdiChange={fixa.alterarCdi} />,
    },
    etfs: {
      tag: 'aporte mensal em ETF',
      titulo: <>Quem aportou {destaque('todo mês')}, quanto teria&nbsp;hoje.</>,
      subtitulo: 'Simula aportes mensais em IVVB11 e NASD11 sobre as cotações reais, com o CDI '
        + 'nas mesmas datas como régua — e uma fase de retiradas para testar se o dinheiro dura.',
      medalhao: null,
    },
    bitcoin: {
      tag: 'aportes em bitcoin',
      titulo: <>Com que {destaque('frequência')} vale&nbsp;aportar?</>,
      subtitulo: 'Um mesmo orçamento, dividido em aportes mensais, semanais ou diários sobre a '
        + 'cotação real em dólar. A resposta é menos empolgante do que parece — e é o ponto.',
      medalhao: ultimo ? (
        <Medalhao
          rotulo="BTC hoje"
          valor={fmtUSD(ultimo[1], 0).replace(/\s/g, ' ')}
          rodape={`em ${rotuloData(ultimo[0])}`}
        />
      ) : null,
    },
  };

  return (
    <>
      <Hero aba={aba} onAba={irPara} {...cabecalhos[aba]} />

      <main className="mx-auto max-w-[1180px] px-6 pb-20 pt-10">
        {aba === 'renda-fixa' && (
          <RendaFixa
            items={fixa.items}
            cdi={fixa.cdi}
            adicionar={fixa.adicionar}
            remover={fixa.remover}
            limpar={fixa.limpar}
          />
        )}

        {aba === 'etfs' && <Etfs />}

        {aba === 'bitcoin' && (
          <Bitcoin
            status={dadosBtc.status}
            dados={dadosBtc.dados}
            items={btc.items}
            adicionar={btc.adicionar}
            adicionarTrio={btc.adicionarTrio}
            remover={btc.remover}
            limpar={btc.limpar}
          />
        )}

        <Referencias aba={aba} />
      </main>

      <footer className="px-6 pb-12 pt-8 text-center text-xs text-ink-soft">
        Ferramenta educacional de simulação — não é recomendação de investimento. Confira sempre
        as condições reais junto à instituição financeira.
      </footer>
    </>
  );
}
