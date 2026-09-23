import {
  PALETA_BTC, avisoDoDia, criarFichaBtc, diaValido, normalizarFichaBtc, rotuloDoPlano,
  trioDeFrequencias,
} from './fichaBtc.js';

describe('diaValido', () => {
  it('prende o dia do mês entre 1 e 31', () => {
    expect(diaValido('mensal', 0)).toBe(1);
    expect(diaValido('mensal', 99)).toBe(31);
    expect(diaValido('mensal', 15)).toBe(15);
  });

  it('prende o dia da semana entre 0 e 6', () => {
    expect(diaValido('semanal', -3)).toBe(0);
    expect(diaValido('semanal', 9)).toBe(6);
    expect(diaValido('semanal', 4)).toBe(4);
  });

  it('no diário não há dia a escolher', () => {
    expect(diaValido('diaria', 10)).toBeNull();
  });

  it('vazio e lixo viram nulo, não NaN', () => {
    expect(diaValido('mensal', '')).toBeNull();
    expect(diaValido('mensal', null)).toBeNull();
    expect(diaValido('mensal', 'abc')).toBeNull();
  });
});

describe('rotuloDoPlano', () => {
  it('descreve o plano em uma linha', () => {
    expect(rotuloDoPlano('mensal', 10)).toBe('todo dia 10 do mês');
    expect(rotuloDoPlano('mensal', null)).toBe('todo mês');
    expect(rotuloDoPlano('semanal', 1)).toBe('toda segunda');
    // desambigua do diário, que é "todo dia"
    expect(rotuloDoPlano('mensal', 1)).toBe('todo dia 1 do mês');
    // domingo e sábado são masculinos
    expect(rotuloDoPlano('semanal', 0)).toBe('todo domingo');
    expect(rotuloDoPlano('semanal', 6)).toBe('todo sábado');
    expect(rotuloDoPlano('diaria', null)).toBe('todo dia');
  });
});

describe('avisoDoDia', () => {
  it('avisa só quando o dia não cabe em todo mês', () => {
    expect(avisoDoDia('mensal', 15)).toBeNull();
    expect(avisoDoDia('mensal', 28)).toBeNull();
    expect(avisoDoDia('mensal', 29)).toMatch(/último dia/);
    expect(avisoDoDia('mensal', 31)).toMatch(/último dia/);
  });

  it('não avisa nas outras frequências', () => {
    expect(avisoDoDia('semanal', 6)).toBeNull();
    expect(avisoDoDia('diaria', null)).toBeNull();
  });
});

describe('criarFichaBtc', () => {
  const form = { orcamentoMensal: '600', frequencia: 'mensal', dia: '10', inicio: '2020-09' };

  it('monta a ficha a partir do formulário', () => {
    expect(criarFichaBtc(form, 7, 0)).toEqual({
      id: 7,
      nome: 'todo dia 10 do mês',
      orcamentoMensal: 600,
      frequencia: 'mensal',
      dia: 10,
      inicio: '2020-09',
      color: PALETA_BTC[0],
    });
  });

  it('nomeia sozinha pelo plano quando o campo fica vazio', () => {
    expect(criarFichaBtc({ ...form, nome: '  ' }, 1, 0).nome).toBe('todo dia 10 do mês');
    expect(criarFichaBtc({ ...form, frequencia: 'diaria' }, 1, 0).nome).toBe('todo dia');
  });

  it('recusa frequência desconhecida e orçamento negativo', () => {
    const f = criarFichaBtc({ ...form, frequencia: 'anual', orcamentoMensal: -50 }, 1, 0);
    expect(f.frequencia).toBe('mensal');
    expect(f.orcamentoMensal).toBe(0);
  });

  it('recusa início mal formado', () => {
    expect(criarFichaBtc({ ...form, inicio: '2020-13' }, 1, 0).inicio).toBeNull();
    expect(criarFichaBtc({ ...form, inicio: 'ontem' }, 1, 0).inicio).toBeNull();
  });

  it('dá a cor pelo índice, em ordem e sem repetir antes da hora', () => {
    const cores = PALETA_BTC.map((_, i) => criarFichaBtc(form, i, i).color);
    expect(cores).toEqual(PALETA_BTC);
    expect(criarFichaBtc(form, 99, PALETA_BTC.length).color).toBe(PALETA_BTC[0]);
  });
});

describe('normalizarFichaBtc', () => {
  it('descarta o que não é objeto', () => {
    expect(normalizarFichaBtc(null, 0)).toBeNull();
    expect(normalizarFichaBtc('ficha', 0)).toBeNull();
  });

  it('coage tudo que veio do localStorage', () => {
    const f = normalizarFichaBtc({
      id: '3.7', nome: 'x'.repeat(500), orcamentoMensal: '-9', frequencia: 'trimestral',
      dia: 999, inicio: 'qualquer', color: 'javascript:alert(1)',
    }, 2);
    expect(f.id).toBe(4);
    expect(f.nome).toHaveLength(120);
    expect(f.orcamentoMensal).toBe(0);
    expect(f.frequencia).toBe('mensal');
    expect(f.dia).toBe(31);
    expect(f.inicio).toBeNull();
    expect(f.color).toBe(PALETA_BTC[2]);
  });

  it('mantém uma cor hexadecimal legítima', () => {
    expect(normalizarFichaBtc({ color: '#AbCdEf' }, 0).color).toBe('#AbCdEf');
  });

  it('sobrevive a uma ficha vazia', () => {
    const f = normalizarFichaBtc({}, 0);
    expect(f.frequencia).toBe('mensal');
    expect(f.nome).toBe('todo mês');
  });
});

describe('trioDeFrequencias', () => {
  const form = { orcamentoMensal: 600, dia: 10, diaSemana: 3, inicio: '2021-01' };

  it('cria as três, com o mesmo orçamento e o mesmo início', () => {
    const trio = trioDeFrequencias(form, 10, 0);
    expect(trio.map((f) => f.frequencia)).toEqual(['mensal', 'semanal', 'diaria']);
    expect(trio.every((f) => f.orcamentoMensal === 600 && f.inicio === '2021-01')).toBe(true);
  });

  it('dá ids e cores distintas', () => {
    const trio = trioDeFrequencias(form, 10, 0);
    expect(trio.map((f) => f.id)).toEqual([10, 11, 12]);
    expect(new Set(trio.map((f) => f.color)).size).toBe(3);
  });

  it('cada uma leva o dia que faz sentido para a sua frequência', () => {
    const trio = trioDeFrequencias(form, 1, 0);
    expect(trio.map((f) => f.dia)).toEqual([10, 3, null]);
    expect(trio.map((f) => f.nome)).toEqual(['todo dia 10 do mês', 'toda quarta', 'todo dia']);
  });
});
