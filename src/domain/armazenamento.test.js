import {
  STORAGE_KEY, STORAGE_KEY_ETF, carregarEstado, carregarParamsEtf, limparEstado, salvarEstado, salvarParamsEtf,
} from './armazenamento.js';

beforeEach(() => localStorage.clear());

describe('persistência', () => {
  it('salva e recupera o estado', () => {
    const items = [{ id: 1, name: 'CDB', principal: 1000, prazo: 365, trib: 'regressiva', color: '#1E5B41' }];
    expect(salvarEstado({ items, seq: 1, cdi: 13.9 })).toBe(true);
    const lido = carregarEstado();
    expect(lido.items).toHaveLength(1);
    expect(lido.items[0].name).toBe('CDB');
    expect(lido.cdi).toBe(13.9);
    expect(lido.seq).toBe(1);
  });

  it('devolve null sem nada salvo', () => {
    expect(carregarEstado()).toBeNull();
  });

  it('devolve null com JSON corrompido, em vez de lançar', () => {
    localStorage.setItem(STORAGE_KEY, '{isso não é json');
    expect(carregarEstado()).toBeNull();
  });

  it('descarta payload de versão desconhecida', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 99, items: [] }));
    expect(carregarEstado()).toBeNull();
  });

  it('descarta items que não são lista', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, items: 'hack' }));
    expect(carregarEstado()).toBeNull();
  });

  it('filtra fichas inválidas mas mantém as boas', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      v: 1, seq: 3, cdi: 13.9,
      items: [null, { id: 2, name: 'ok', prazo: 365 }, 'lixo'],
    }));
    expect(carregarEstado().items).toHaveLength(1);
  });

  it('recupera seq a partir do maior id quando o salvo está atrasado', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      v: 1, seq: 0, items: [{ id: 7, name: 'x', prazo: 365 }],
    }));
    expect(carregarEstado().seq).toBe(7);
  });

  it('ignora CDI inválido', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, items: [], cdi: 'abc' }));
    expect(carregarEstado().cdi).toBeNull();
  });

  it('não lança quando o localStorage rejeita a escrita', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); };
    expect(salvarEstado({ items: [], seq: 0, cdi: 13.9 })).toBe(false);
    Storage.prototype.setItem = original;
  });

  it('limpar remove a chave', () => {
    salvarEstado({ items: [], seq: 0, cdi: 13.9 });
    limparEstado();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('parâmetros do aporte em ETF', () => {
  const salvo = (dados) => localStorage.setItem(STORAGE_KEY_ETF, JSON.stringify(dados));

  beforeEach(() => localStorage.clear());

  it('devolve vazio sem nada salvo ou com lixo', () => {
    expect(carregarParamsEtf()).toEqual({});
    localStorage.setItem(STORAGE_KEY_ETF, '{quebrado');
    expect(carregarParamsEtf()).toEqual({});
  });

  it('ida e volta preserva os campos válidos', () => {
    const params = {
      ativos: 'ambos', aporte: 500, inicio: '2022-03', regularidade: 'variavel',
      chancePular: 30, minimo: 40, semente: 5, parar: true, parada: '2025-01',
      retirar: true, retiradaInicio: '2025-06', retiradaModo: 'fixo', retiradaPct: 4,
      retiradaFixo: 3000, corrigir: false,
    };
    salvarParamsEtf(params);
    expect(carregarParamsEtf()).toEqual(params);
  });

  it('descarta campo inválido sem perder os outros', () => {
    salvo({
      ativos: 'PETR4', aporte: -1, inicio: '2022-13', regularidade: 'as vezes',
      chancePular: 150, minimo: '', semente: 1.5, parar: 'sim', parada: '2025-02',
      retirar: 1, retiradaInicio: 'jun', retiradaModo: 'tudo', retiradaPct: -4, retiradaFixo: 'x',
    });
    expect(carregarParamsEtf()).toEqual({ parada: '2025-02' });
  });
});
