import { STORAGE_KEY, carregarEstado, limparEstado, salvarEstado } from './armazenamento.js';

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
