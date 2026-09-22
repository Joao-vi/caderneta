import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { STORAGE_KEY_ETF } from '../domain/armazenamento.js';
import AporteEtf from './AporteEtf.jsx';

jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="grafico-linha" />,
}));

const IVVB11 = {
  precos: [
    ['2024-01-02', 10], ['2024-01-31', 12], ['2024-02-01', 20],
    ['2024-03-04', 25], ['2024-03-15', 30],
  ],
};
// estreia no meio de fevereiro: o primeiro aporte possível é em março
const NASD11 = { precos: [['2024-02-15', 8], ['2024-03-04', 10], ['2024-03-15', 20]] };
const CDI = { taxas: IVVB11.precos.map(([d]) => [d, 0]) };
const IPCA = { taxas: [['2024-01', 0.5], ['2024-02', 0.5]] };
const ARQUIVOS = {
  'dados/cdi.json': CDI, 'dados/ipca.json': IPCA, 'dados/IVVB11.json': IVVB11, 'dados/NASD11.json': NASD11,
};

function servir(arquivos = ARQUIVOS) {
  global.fetch = jest.fn(async (url) => (
    arquivos[url] ? { ok: true, json: async () => arquivos[url] } : { ok: false, status: 404 }
  ));
}

const linhaDe = (nome) => screen.getByRole('row', { name: new RegExp(nome) });

beforeEach(() => localStorage.clear());

it('mostra o carregamento enquanto as cotações não chegam', () => {
  render(<AporteEtf />);
  expect(screen.getByText('Carregando cotações…')).toBeInTheDocument();
});

it('avisa quando o histórico não carrega', async () => {
  servir({});
  render(<AporteEtf />);
  expect(await screen.findByText(/Não foi possível carregar/)).toBeInTheDocument();
});

it('simula o IVVB11 desde o primeiro mês disponível', async () => {
  servir();
  render(<AporteEtf />);

  // padrão: R$ 1.000 desde 5 anos atrás, antes da série → começa em jan/24
  // cotas: 1000/10 + 1000/20 + 1000/25 = 190; × 30 no último fechamento
  const linha = within(await screen.findByRole('row', { name: /IVVB11/ }));
  expect(linha.getByText('R$ 3.000,00')).toBeInTheDocument();
  expect(linha.getByText('R$ 5.700,00')).toBeInTheDocument();
  expect(linha.getByText('R$ 2.700,00')).toBeInTheDocument();
  expect(linha.getByText('90,0%')).toBeInTheDocument();

  expect(within(linhaDe('CDI')).getByText('R$ 3.000,00', { selector: '.text-green-deep' })).toBeInTheDocument();
  expect(screen.getByText(/3 aportes de R\$ 1\.000,00, de 02\/01\/2024 até o fechamento de 15\/03\/2024/))
    .toBeInTheDocument();
  expect(screen.getByText(/Antes de jan\/24 não há cotação/)).toBeInTheDocument();
});

it('com os dois ETFs, começa quando o mais novo já existia', async () => {
  servir();
  const user = userEvent.setup();
  render(<AporteEtf />);
  await screen.findByRole('row', { name: /IVVB11/ });

  await user.click(screen.getByRole('button', { name: 'Os dois' }));

  // março: IVVB11 compra 40 cotas a 25 (→ ×30), NASD11 compra 100 a 10 (→ ×20)
  expect(within(linhaDe('IVVB11')).getByText('R$ 1.200,00')).toBeInTheDocument();
  expect(within(linhaDe('NASD11')).getByText('R$ 2.000,00')).toBeInTheDocument();
  expect(screen.getByText(/Antes de mar\/24 não há cotação/)).toBeInTheDocument();
});

it('recalcula ao mudar o aporte e lembra os parâmetros', async () => {
  servir();
  const user = userEvent.setup();
  render(<AporteEtf />);
  await screen.findByRole('row', { name: /IVVB11/ });

  await user.clear(screen.getByLabelText('Aporte mensal planejado'));
  await user.type(screen.getByLabelText('Aporte mensal planejado'), '100');
  await user.selectOptions(screen.getByLabelText('Mês: Primeiro aporte'), 'fev');

  // fev e mar: 100/20 + 100/25 = 9 cotas × 30
  expect(within(linhaDe('IVVB11')).getByText('R$ 270,00')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY_ETF))).toMatchObject({
    ativos: 'IVVB11', aporte: '100', inicio: '2024-02',
  });
});

it('não simula aporte zerado', async () => {
  servir();
  const user = userEvent.setup();
  render(<AporteEtf />);
  await screen.findByRole('row', { name: /IVVB11/ });

  await user.clear(screen.getByLabelText('Aporte mensal planejado'));
  expect(screen.getByText('Informe um valor de aporte maior que zero.')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

it('parar de aportar: a curva segue só com o mercado', async () => {
  servir();
  const user = userEvent.setup();
  render(<AporteEtf />);
  await screen.findByRole('row', { name: /IVVB11/ });

  await user.click(screen.getByLabelText('Parei de aportar'));
  await user.selectOptions(screen.getByLabelText('Ano: Sem aportes a partir de'), '2024');
  await user.selectOptions(screen.getByLabelText('Mês: Sem aportes a partir de'), 'fev');

  // só jan: 1000/10 = 100 cotas; em 01/02 valem 100 × 20, hoje 100 × 30
  const resultado = screen.getByRole('table', { name: 'Resultado do aporte mensal' });
  expect(within(resultado).getByRole('row', { name: /IVVB11/ })).toHaveTextContent('R$ 3.000,00');
  const depois = within(screen.getByRole('table', { name: 'Depois de parar' }));
  const linha = depois.getByRole('row', { name: /IVVB11/ });
  expect(linha).toHaveTextContent('R$ 2.000,00');
  expect(linha).toHaveTextContent('R$ 1.000,00');
  expect(linha).toHaveTextContent('50,0%');
  expect(screen.getByText(/1 aporte de R\$ 1\.000,00, de 02\/01\/2024 até parar em 01\/02\/2024/)).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Aportes mês a mês' })).toBeInTheDocument();
});

it('parada antes do primeiro aporte é empurrada para o mês seguinte', async () => {
  servir();
  const user = userEvent.setup();
  render(<AporteEtf />);
  await screen.findByRole('row', { name: /IVVB11/ });

  await user.click(screen.getByLabelText('Parei de aportar'));
  await user.selectOptions(screen.getByLabelText('Mês: Sem aportes a partir de'), 'jan');
  expect(screen.getByLabelText('Mês: Sem aportes a partir de')).toHaveValue('02');
});

it('regularidade variável: aporta menos que o planejado e o cenário é reproduzível', async () => {
  servir();
  const user = userEvent.setup();
  const { unmount } = render(<AporteEtf />);
  await screen.findByRole('row', { name: /IVVB11/ });

  await user.click(screen.getByRole('button', { name: 'Variável' }));
  await user.clear(screen.getByLabelText('Aporte mínimo'));
  await user.type(screen.getByLabelText('Aporte mínimo'), '10');
  const resumo = () => screen.getByText(/de R\$ 3\.000,00 planejados/).textContent;
  const primeiro = resumo();
  expect(primeiro).toMatch(/em 3 meses/);

  await user.click(screen.getByRole('button', { name: /Sortear outro cenário/ }));
  await user.click(screen.getByRole('button', { name: /Sortear outro cenário/ }));
  expect(JSON.parse(localStorage.getItem(STORAGE_KEY_ETF)).semente).toBe(3);

  // voltar à semente 1 reproduz o primeiro cenário
  unmount();
  localStorage.setItem(STORAGE_KEY_ETF, JSON.stringify({ regularidade: 'variavel', minimo: 10, semente: 1 }));
  render(<AporteEtf />);
  await screen.findByRole('row', { name: /IVVB11/ });
  expect(resumo()).toBe(primeiro);
});

it('com 100% de meses pulados avisa em vez de simular', async () => {
  servir();
  const user = userEvent.setup();
  render(<AporteEtf />);
  await screen.findByRole('row', { name: /IVVB11/ });

  await user.click(screen.getByRole('button', { name: 'Variável' }));
  await user.clear(screen.getByLabelText('Meses sem aporte'));
  await user.type(screen.getByLabelText('Meses sem aporte'), '100');
  expect(screen.getByText(/Nenhum mês com aporte neste cenário/)).toBeInTheDocument();
});

describe('fase de retiradas', () => {
  async function comecarARetirar(user) {
    render(<AporteEtf />);
    await screen.findByRole('row', { name: /IVVB11/ });
    await user.click(screen.getByLabelText('Comecei a retirar'));
    await user.selectOptions(screen.getByLabelText('Ano: Retiradas a partir de'), '2024');
    await user.selectOptions(screen.getByLabelText('Mês: Retiradas a partir de'), 'fev');
  }

  it('valor fixo: saca todo mês e mostra quando o dinheiro acaba', async () => {
    servir();
    const user = userEvent.setup();
    await comecarARetirar(user);
    await user.click(screen.getByRole('button', { name: 'Valor fixo' }));
    await user.clear(screen.getByLabelText('Retirada mensal'));
    await user.type(screen.getByLabelText('Retirada mensal'), '500');
    await user.click(screen.getByLabelText('Reajustar o saque pelo IPCA a cada ano'));

    // jan: 100 cotas a 10. fev: vale 2.000, saca 500 → 75 cotas. mar: vale 1.875, saca 500 → 55 × 30
    const fase = within(screen.getByRole('table', { name: 'Fase de retiradas' }));
    const etf = fase.getByRole('row', { name: /IVVB11/ });
    expect(etf).toHaveTextContent('R$ 2.000,00');
    expect(etf).toHaveTextContent('R$ 1.000,00');
    expect(etf).toHaveTextContent('R$ 1.650,00');
    expect(etf).toHaveTextContent('ainda de pé');
    // o CDI (zerado) tinha 1.000: dois saques de 500 e acabou
    expect(fase.getByRole('row', { name: /CDI/ })).toHaveTextContent('acabou em mar/24');

    const resultado = within(screen.getByRole('table', { name: 'Resultado do aporte mensal' }));
    expect(resultado.getByRole('columnheader', { name: 'Retirado' })).toBeInTheDocument();
    expect(screen.getByText(/saques mensais desde 01\/02\/2024/)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Depois de parar' })).not.toBeInTheDocument();
  });

  it('regra dos 4%: o saque é 4% a.a. do patrimônio no início, em 12 parcelas', async () => {
    servir();
    const user = userEvent.setup();
    await comecarARetirar(user);

    // 2.000 × 4% / 12 = 6,67 por mês
    const etf = within(screen.getByRole('table', { name: 'Fase de retiradas' })).getByRole('row', { name: /IVVB11/ });
    expect(etf).toHaveTextContent('R$ 6,67');
    expect(screen.getByText(/Saque de 4,0% a.a. do patrimônio em 01\/02\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/reajustado pelo IPCA a cada ano/)).toBeInTheDocument();
  });
});
