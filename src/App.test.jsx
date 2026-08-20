import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { STORAGE_KEY } from './domain/armazenamento.js';

// Chart.js precisa de canvas, que o jsdom não implementa. Os gráficos têm
// cobertura própria em series.test.js; aqui interessa o resto da árvore.
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="grafico-linha" />,
  Bar: () => <div data-testid="grafico-barra" />,
}));

const setup = () => ({ user: userEvent.setup(), ...render(<App />) });

async function adicionarFicha(user, nome = 'CDB Teste') {
  await user.clear(screen.getByLabelText('Nome / instituição'));
  await user.type(screen.getByLabelText('Nome / instituição'), nome);
  await user.click(screen.getByRole('button', { name: /Adicionar à comparação/ }));
}

beforeEach(() => localStorage.clear());

describe('estado inicial', () => {
  it('abre vazio, sem fichas semeadas', () => {
    setup();
    expect(screen.getByText(/Nenhuma ficha ainda/)).toBeInTheDocument();
    expect(screen.getByText('0 investimentos')).toBeInTheDocument();
    expect(screen.getByText('Adicione fichas para comparar.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'limpar tudo' })).not.toBeInTheDocument();
  });

  it('mostra o CDI padrão editável', () => {
    setup();
    expect(screen.getByLabelText('CDI anual')).toHaveValue(13.9);
  });
});

describe('adicionar ficha', () => {
  it('calcula o líquido correto e o exibe no card', async () => {
    const { user } = setup();
    // padrões do formulário: R$10.000, 130% do CDI, 720 dias, tabela regressiva
    await adicionarFicha(user);

    const card = screen.getByRole('article');
    expect(within(card).getByText('CDB Teste')).toBeInTheDocument();
    // valor verificado independentemente em apuracao.test.js
    expect(within(card).getByText('R$ 13.198,71')).toBeInTheDocument();
    // rotuloPrazo só escreve "anos" em múltiplos exatos de 365; 720 não é
    expect(within(card).getByText(/130% do CDI · 720 dias/)).toBeInTheDocument();
    expect(screen.getByText('1 investimento')).toBeInTheDocument();
  });

  it('leva a ficha para a tabela comparativa', async () => {
    const { user } = setup();
    await adicionarFicha(user);
    const tabela = screen.getByRole('table', { name: 'Raio-x comparativo' });
    expect(within(tabela).getByText('CDB Teste')).toBeInTheDocument();
    expect(within(tabela).getByText('R$ 10.000,00')).toBeInTheDocument();
  });

  it('nomeia sozinha quando o campo fica vazio', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: /Adicionar à comparação/ }));
    expect(within(screen.getByRole('article')).getByText('Ficha 1')).toBeInTheDocument();
  });

  it('remove a ficha pelo botão do card', async () => {
    const { user } = setup();
    await adicionarFicha(user);
    await user.click(screen.getByRole('button', { name: 'Remover CDB Teste' }));
    expect(screen.getByText(/Nenhuma ficha ainda/)).toBeInTheDocument();
  });
});

describe('campos condicionais do formulário', () => {
  it('troca percentual do CDI por taxa prefixada', async () => {
    const { user } = setup();
    expect(screen.getByLabelText('Percentual do CDI')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prefixado a.a.' }));
    expect(screen.queryByLabelText('Percentual do CDI')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Taxa prefixada')).toBeInTheDocument();
  });

  it('a rolagem revela o horizonte e renomeia o prazo', async () => {
    const { user } = setup();
    expect(screen.queryByLabelText('Horizonte total')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Prazo')).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Reinvestir ao vencer/));
    expect(screen.getByLabelText('Horizonte total')).toBeInTheDocument();
    expect(screen.getByLabelText('Prazo de cada ciclo')).toBeInTheDocument();
  });

  it('a alíquota fixa só aparece na tributação personalizada', async () => {
    const { user } = setup();
    expect(screen.queryByLabelText('Alíquota de IR')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Tributação'), 'fixo');
    expect(screen.getByLabelText('Alíquota de IR')).toBeInTheDocument();
  });
});

describe('rolagem ponta a ponta', () => {
  it('uma LCI isenta rolada rende igual a uma travada de mesmo horizonte', async () => {
    const { user } = setup();
    await user.selectOptions(screen.getByLabelText('Tributação'), 'isento');
    await user.clear(screen.getByLabelText('Percentual do CDI'));
    await user.type(screen.getByLabelText('Percentual do CDI'), '95');
    await user.click(screen.getByLabelText(/Reinvestir ao vencer/));
    await user.clear(screen.getByLabelText('Prazo de cada ciclo'));
    await user.type(screen.getByLabelText('Prazo de cada ciclo'), '90');
    await adicionarFicha(user, 'LCI rolada');

    const card = screen.getByRole('article');
    // mesmo valor de uma LCI única de 720 dias, verificado em apuracao.test.js
    expect(within(card).getByText('R$ 12.771,90')).toBeInTheDocument();
    expect(within(card).getByText(/rolando a cada 90d/)).toBeInTheDocument();
  });
});

describe('projeção', () => {
  it('alterna entre as abas e mostra o controle bruto/líquido só na de juros', async () => {
    const { user } = setup();
    await adicionarFicha(user);

    expect(screen.getByTestId('grafico-linha')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Bruto ou líquido' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Juros por mês' }));
    expect(screen.getByTestId('grafico-barra')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Bruto ou líquido' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Líquido' }));
    expect(screen.getByText(/o que sobra após IR e IOF/)).toBeInTheDocument();
  });
});

describe('modal Vale a troca?', () => {
  it('abre com a ficha como origem e entrega o veredito', async () => {
    const { user } = setup();
    await adicionarFicha(user, 'CDB origem');
    await user.click(screen.getByRole('button', { name: /Vale a troca/ }));

    const modal = screen.getByRole('dialog');
    const origem = within(modal).getByLabelText('Investimento de origem');
    expect(origem).toHaveDisplayValue('CDB origem');
    expect(within(modal).getByText(/a manobra equivale a/)).toBeInTheDocument();
    expect(within(modal).getByRole('heading', { name: 'Vale a troca?' })).toBeInTheDocument();
  });

  it('bloqueia horizonte menor que o prazo da oferta', async () => {
    const { user } = setup();
    await adicionarFicha(user);
    await user.click(screen.getByRole('button', { name: /Vale a troca/ }));

    const modal = screen.getByRole('dialog');
    const horizonte = within(modal).getByLabelText('Horizonte em dias');
    await user.clear(horizonte);
    await user.type(horizonte, '30'); // oferta tem prazo 90
    expect(within(modal).getByRole('alert')).toHaveTextContent(/Horizonte menor que o prazo da oferta/);
  });

  it('fecha com Escape', async () => {
    const { user } = setup();
    await adicionarFicha(user);
    await user.click(screen.getByRole('button', { name: /Vale a troca/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('persistência', () => {
  it('sobrevive a um recarregamento', async () => {
    const { user, unmount } = setup();
    await adicionarFicha(user, 'Ficha persistida');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Ficha persistida');

    unmount();
    render(<App />);
    expect(within(screen.getByRole('article')).getByText('Ficha persistida')).toBeInTheDocument();
  });

  it('não apaga o que estava salvo no primeiro render', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      v: 1, seq: 5, cdi: 11.25,
      items: [{ id: 5, name: 'Salva antes', principal: 1000, prazo: 365, trib: 'isento', taxaAnual: 11, color: '#B8862E' }],
    }));
    render(<App />);
    expect(within(screen.getByRole('article')).getByText('Salva antes')).toBeInTheDocument();
    expect(screen.getByLabelText('CDI anual')).toHaveValue(11.25);
  });

  it('limpar tudo remove as fichas e a chave', async () => {
    const { user } = setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    await adicionarFicha(user);
    await user.click(screen.getByRole('button', { name: 'limpar tudo' }));
    expect(screen.getByText(/Nenhuma ficha ainda/)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('CDB Teste');
    window.confirm.mockRestore();
  });

  it('ignora localStorage corrompido e abre vazio', () => {
    localStorage.setItem(STORAGE_KEY, '{corrompido');
    render(<App />);
    expect(screen.getByText(/Nenhuma ficha ainda/)).toBeInTheDocument();
  });
});
