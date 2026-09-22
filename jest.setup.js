import '@testing-library/jest-dom';

// Nenhum teste vai à rede. Por padrão o fetch fica pendente para sempre, então
// a seção de ETF fica em "carregando" sem disparar updates fora de act();
// quem precisa de dados troca global.fetch no próprio teste.
beforeEach(() => {
  global.fetch = () => new Promise(() => {});
});
