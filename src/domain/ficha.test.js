import { criarFicha, normalizarFicha } from './ficha.js';

describe('criarFicha', () => {
  it('deriva a taxa a partir do percentual do CDI', () => {
    const f = criarFicha({ tipo: 'cdi', pctCDI: 130, principal: 10000, prazo: 720 }, 13.9, 1, 0);
    expect(f.taxaAnual).toBeCloseTo(18.07, 6);
    expect(f.tag).toBe('130% do CDI');
  });

  it('usa a taxa prefixada diretamente', () => {
    const f = criarFicha({ tipo: 'pre', pre: 14.5, prazo: 365 }, 13.9, 1, 0);
    expect(f.taxaAnual).toBe(14.5);
  });

  it('nomeia a ficha quando o campo vem vazio', () => {
    expect(criarFicha({ tipo: 'cdi', pctCDI: 100 }, 13.9, 1, 2).name).toBe('Ficha 3');
  });

  it('horizonte só existe com rolagem, e nunca abaixo do ciclo', () => {
    expect(criarFicha({ tipo: 'cdi', prazo: 90, rolar: false, horizonte: 720 }, 13.9, 1, 0).horizonte).toBe(90);
    expect(criarFicha({ tipo: 'cdi', prazo: 90, rolar: true, horizonte: 30 }, 13.9, 1, 0).horizonte).toBe(90);
    expect(criarFicha({ tipo: 'cdi', prazo: 90, rolar: true, horizonte: 720 }, 13.9, 1, 0).horizonte).toBe(720);
  });
});

describe('normalizarFicha: o localStorage é editável à mão', () => {
  it.each([
    ['null', null],
    ['string crua', 'hack'],
    ['número', 42],
  ])('rejeita %s', (_, raw) => {
    expect(normalizarFicha(raw, 0)).toBeNull();
  });

  it('corrige prazo fora de faixa', () => {
    expect(normalizarFicha({ prazo: 0 }, 0).prazo).toBe(1);
    expect(normalizarFicha({ prazo: -50 }, 0).prazo).toBe(1);
  });

  it('não aceita valores negativos nem NaN', () => {
    const r = normalizarFicha({ principal: -999, aporte: null, taxaAnual: 'xx', prazo: 'abc' }, 0);
    expect(r.principal).toBe(0);
    expect(r.aporte).toBe(0);
    expect(r.taxaAnual).toBe(0);
    expect(r.prazo).toBe(1);
  });

  it('cai para regressiva se a tributação for inventada', () => {
    expect(normalizarFicha({ prazo: 365, trib: 'inventada' }, 0).trib).toBe('regressiva');
  });

  it('limita a alíquota a 100%', () => {
    expect(normalizarFicha({ prazo: 365, trib: 'fixo', aliqFixa: 500 }, 0).aliqFixa).toBe(100);
  });

  it('só aceita cor hexadecimal — ela vai direto para um atributo de estilo', () => {
    const mal = normalizarFicha({ prazo: 365, color: '"><script>alert(1)</script>' }, 0);
    expect(mal.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(normalizarFicha({ prazo: 365, color: '#1E5B41' }, 0).color).toBe('#1E5B41');
  });

  it('trunca nome gigante e preserva o texto para escape no render', () => {
    expect(normalizarFicha({ name: 'A'.repeat(5000), prazo: 365 }, 0).name).toHaveLength(120);
    // React escapa na renderização; aqui só garantimos que nada é executado na leitura
    const xss = normalizarFicha({ name: '<img src=x onerror=alert(1)>', prazo: 365 }, 0);
    expect(typeof xss.name).toBe('string');
  });

  it('preenche rolagem ausente em dados salvos antes da feature', () => {
    const antigo = normalizarFicha({ prazo: 365, principal: 1000 }, 0);
    expect(antigo.rolar).toBe(false);
    expect(antigo.horizonte).toBe(365);
  });
});
