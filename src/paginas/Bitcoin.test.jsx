import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { STORAGE_KEY_BTC } from '../domain/armazenamento.js';

jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="grafico-linha" />,
  Bar: () => <div data-testid="grafico-barra" />,
}));

/**
 * Série 24/7 sintética: três anos de preço com uma onda larga, para que as
 * escolhas se diferenciem sem depender do histórico real, que muda a cada
 * atualização dos dados.
 */
function serieBtc(dias = 1100) {
  const precos = [];
  for (let i = 0; i < dias; i += 1) {
    const data = new Date(Date.parse('2021-01-01') + i * 86400000).toISOString().slice(0, 10);
    precos.push([data, 30000 + 12000 * Math.sin(i / 55)]);
  }
  return precos;
}

function mockarFetch(precos = serieBtc()) {
  global.fetch = (url) => {
    if (String(url).includes('BTC-USD')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ticker: 'BTC-USD', moeda: 'USD', precos }) });
    }
    return new Promise(() => {}); // as séries do módulo de ETF ficam pendentes
  };
}

const irParaBitcoin = async (user) => {
  await user.click(screen.getByRole('link', { name: 'Bitcoin' }));
  await screen.findByRole('button', { name: 'Comparar as três frequências' });
};

async function abrir() {
  const user = userEvent.setup();
  render(<App />);
  await irParaBitcoin(user);
  return user;
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  mockarFetch();
});

describe('navegação entre os módulos', () => {
  it('abre na renda fixa e troca de aba pelo menu', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/CDB realmente paga/);
    expect(screen.getByLabelText('Nome / instituição')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Bitcoin' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/frequência vale aportar/);
    expect(screen.queryByLabelText('Nome / instituição')).not.toBeInTheDocument();
  });

  it('marca a aba corrente para o leitor de tela', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('link', { name: 'Renda fixa' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('link', { name: 'ETFs' }));
    expect(screen.getByRole('link', { name: 'ETFs' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Renda fixa' })).not.toHaveAttribute('aria-current');
  });

  it('o CDI só aparece onde é usado', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByLabelText('CDI anual')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Bitcoin' }));
    expect(screen.queryByLabelText('CDI anual')).not.toBeInTheDocument();
  });

  it('abre direto na aba do endereço', async () => {
    window.location.hash = '#/bitcoin';
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/frequência vale aportar/);
  });

  it('ignora uma aba inexistente no endereço', () => {
    window.location.hash = '#/cripto-do-momento';
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/CDB realmente paga/);
  });

  it('as referências acompanham a aba', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('table', { name: 'Tabela regressiva de IR' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Bitcoin' }));
    expect(screen.queryByRole('table', { name: 'Tabela regressiva de IR' })).not.toBeInTheDocument();
    expect(screen.getByText(/BTC-USD no/)).toBeInTheDocument();
  });
});

describe('estado inicial do bitcoin', () => {
  it('abre vazio, com o convite ao atalho', async () => {
    await abrir();
    expect(screen.getByText(/Nenhuma projeção ainda/)).toBeInTheDocument();
    expect(screen.getByText('0 projeções')).toBeInTheDocument();
  });

  it('mostra a cotação mais recente no cabeçalho', async () => {
    await abrir();
    expect(screen.getByText('BTC hoje')).toBeInTheDocument();
  });

  it('avisa quando a série não carrega', async () => {
    global.fetch = () => Promise.resolve({ ok: false, status: 500 });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: 'Bitcoin' }));
    expect(await screen.findByText(/Não foi possível carregar o histórico/)).toBeInTheDocument();
  });
});

describe('criar projeções', () => {
  it('adiciona uma ficha e a nomeia pelo plano', async () => {
    const user = await abrir();
    await user.click(screen.getByRole('button', { name: 'Adicionar à comparação' }));

    const card = screen.getByRole('article');
    expect(within(card).getByText('todo dia 1 do mês')).toBeInTheDocument();
    expect(screen.getByText('1 projeção')).toBeInTheDocument();
  });

  it('o atalho cria as três frequências de uma vez', async () => {
    const user = await abrir();
    await user.click(screen.getByRole('button', { name: 'Comparar as três frequências' }));

    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(3);
    expect(screen.getByText('3 projeções')).toBeInTheDocument();
    const nomes = cards.map((c) => within(c).getByRole('heading', { level: 3 }).textContent);
    expect(nomes).toEqual(['todo dia 1 do mês', 'toda segunda', 'todo dia']);
  });

  it('as três gastam praticamente o mesmo dinheiro', async () => {
    const user = await abrir();
    await user.click(screen.getByRole('button', { name: 'Comparar as três frequências' }));

    const tabela = screen.getByRole('table', { name: 'Raio-x dos planos de aporte' });
    const aportados = within(tabela).getAllByRole('row').slice(1)
      .map((linha) => Number(linha.children[2].textContent.replace(/[^\d]/g, '')));
    // A série não acaba num fim de período, então os totais não batem na
    // casa do centavo: cada frequência pode ficar devendo no máximo um dos
    // seus próprios aportes na ponta. O limite honesto é um mês de orçamento,
    // e é por isso que "Aportado" é coluna fixa na tabela.
    const [maior, menor] = [Math.max(...aportados), Math.min(...aportados)];
    expect(maior - menor).toBeLessThan(600);
  });

  it('remove uma projeção pelo botão do card', async () => {
    const user = await abrir();
    await user.click(screen.getByRole('button', { name: 'Adicionar à comparação' }));
    await user.click(screen.getByRole('button', { name: 'Remover todo dia 1 do mês' }));
    expect(screen.getByText(/Nenhuma projeção ainda/)).toBeInTheDocument();
  });
});

describe('campos condicionais do formulário', () => {
  it('o dia muda de natureza conforme a frequência', async () => {
    const user = await abrir();
    expect(screen.getByLabelText('Dia do mês')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Semanal' }));
    expect(screen.queryByLabelText('Dia do mês')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Dia da semana')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Diário' }));
    expect(screen.queryByLabelText('Dia da semana')).not.toBeInTheDocument();
    expect(screen.getByText(/não há dia a escolher/)).toBeInTheDocument();
  });

  it('mostra quanto sai por aporte em cada frequência', async () => {
    const user = await abrir();
    expect(screen.getByText(/1 aporte por mês de US\$ 600/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Semanal' }));
    // 600 × 12 / 52 = 138,46
    expect(screen.getByText(/US\$ 138,46/)).toBeInTheDocument();
  });

  it('avisa sobre o dia que não cabe em todo mês', async () => {
    const user = await abrir();
    const dia = screen.getByLabelText('Dia do mês');
    await user.clear(dia);
    await user.type(dia, '31');
    expect(screen.getByText(/aporte cai no último dia/)).toBeInTheDocument();
  });
});

describe('a tese', () => {
  it('aparece quando as fichas dividem o mesmo orçamento e início', async () => {
    const user = await abrir();
    await user.click(screen.getByRole('button', { name: 'Comparar as três frequências' }));

    expect(screen.getByRole('heading', { name: /A frequência importa menos do que parece/ }))
      .toBeInTheDocument();
    expect(screen.getByText('Dia do mês escolhido')).toBeInTheDocument();
    expect(screen.getByText(/Todas as escolhas possíveis/)).toBeInTheDocument();
  });

  it('sai de cena quando os orçamentos divergem, e explica por quê', async () => {
    const user = await abrir();
    await user.click(screen.getByRole('button', { name: 'Adicionar à comparação' }));

    const orcamento = screen.getByLabelText('Orçamento mensal');
    await user.clear(orcamento);
    await user.type(orcamento, '1200');
    await user.click(screen.getByRole('button', { name: 'Adicionar à comparação' }));

    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: /A frequência importa menos/ })).not.toBeInTheDocument();
    expect(screen.getByText(/a faixa de ruído sai de cena/)).toBeInTheDocument();
  });
});

describe('persistência', () => {
  it('sobrevive a um recarregamento', async () => {
    const user = await abrir();
    await user.click(screen.getByRole('button', { name: 'Adicionar à comparação' }));
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY_BTC)).toContain('mensal'));

    window.location.hash = '#/bitcoin';
    render(<App />);
    expect(await screen.findAllByRole('article')).not.toHaveLength(0);
  });

  it('ignora localStorage corrompido e abre vazio', async () => {
    localStorage.setItem(STORAGE_KEY_BTC, '{corrompido');
    await abrir();
    expect(screen.getByText(/Nenhuma projeção ainda/)).toBeInTheDocument();
  });

  it('não confia no que veio do localStorage', async () => {
    localStorage.setItem(STORAGE_KEY_BTC, JSON.stringify({
      v: 1,
      seq: 1,
      items: [{ id: 1, nome: 'Adulterada', orcamentoMensal: 600, frequencia: 'mensal', dia: 3, inicio: '2021-06', color: 'url(javascript:alert(1))' }],
    }));
    await abrir();
    const barra = screen.getByRole('article').firstChild;
    expect(barra.getAttribute('style')).not.toContain('javascript');
  });
});
