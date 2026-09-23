import {
  alvoDoMes, ancoraDaSemana, calendarioDeAportes, diaDaSemana, diasNoMes,
  primeiroPeriodoDisponivel,
} from './calendario.js';

/** Série 24/7, como a do bitcoin: um preço por dia corrido. */
function diario(de, ate, preco = (i) => 100 + i) {
  const precos = [];
  for (let t = Date.parse(de), i = 0; t <= Date.parse(ate); t += 86400000, i += 1) {
    precos.push([new Date(t).toISOString().slice(0, 10), preco(i)]);
  }
  return precos;
}

// Série de pregão, com buracos de fim de semana e feriado.
const B3 = [
  ['2024-01-02', 10], // 1º de jan é feriado
  ['2024-01-03', 11],
  ['2024-01-15', 12],
  ['2024-01-31', 13],
  ['2024-02-01', 20],
  ['2024-02-15', 21],
  ['2024-02-29', 22],
  ['2024-03-04', 25],
  ['2024-03-15', 30],
];

describe('utilitários de data', () => {
  it('lê o dia da semana em UTC, sem depender do fuso da máquina', () => {
    expect(diaDaSemana('2024-01-01')).toBe(1); // segunda
    expect(diaDaSemana('2024-01-07')).toBe(0); // domingo
  });

  it('conhece o tamanho do mês, inclusive em ano bissexto', () => {
    expect(diasNoMes('2024-02')).toBe(29);
    expect(diasNoMes('2023-02')).toBe(28);
    expect(diasNoMes('2024-04')).toBe(30);
    expect(diasNoMes('2024-12')).toBe(31);
  });

  it('prende o dia ao fim do mês: não existe 31 de fevereiro', () => {
    expect(alvoDoMes('2024-02', 31)).toBe('2024-02-29');
    expect(alvoDoMes('2023-02', 31)).toBe('2023-02-28');
    expect(alvoDoMes('2024-01', 31)).toBe('2024-01-31');
    expect(alvoDoMes('2024-03', 7)).toBe('2024-03-07');
  });

  it('ancora a semana na última ocorrência do dia escolhido', () => {
    // 2024-01-03 é quarta; a segunda anterior é 01/01
    expect(ancoraDaSemana('2024-01-03', 1)).toBe('2024-01-01');
    // na própria âncora, ela mesma
    expect(ancoraDaSemana('2024-01-01', 1)).toBe('2024-01-01');
    // quinta anterior a uma quarta é a da semana passada
    expect(ancoraDaSemana('2024-01-03', 4)).toBe('2023-12-28');
  });
});

describe('calendário mensal', () => {
  it('sem dia escolhido, pega o primeiro pregão de cada mês', () => {
    expect(calendarioDeAportes(B3, { frequencia: 'mensal' }).map((e) => e.data))
      .toEqual(['2024-01-02', '2024-02-01', '2024-03-04']);
  });

  it('com dia escolhido, cai na primeira cotação a partir dele', () => {
    expect(calendarioDeAportes(B3, { frequencia: 'mensal', dia: 10 }).map((e) => e.data))
      .toEqual(['2024-01-15', '2024-02-15', '2024-03-15']);
  });

  it('o dia 31 vira o último pregão do mês quando o mês é mais curto', () => {
    const eventos = calendarioDeAportes(B3, { frequencia: 'mensal', dia: 31 });
    // fev/2024 tem 29 dias e há cotação no dia 29; mar só vai até o dia 15
    expect(eventos.map((e) => e.data)).toEqual(['2024-01-31', '2024-02-29', '2024-03-15']);
  });

  it('pula o mês de estreia quando a série não cobre a data-alvo', () => {
    const precos = [['2024-01-20', 10], ['2024-02-05', 11]];
    // o dia 5 de janeiro não existia: janeiro não conta
    expect(calendarioDeAportes(precos, { frequencia: 'mensal', dia: 5 }).map((e) => e.data))
      .toEqual(['2024-02-05']);
    // já o dia 25 existia
    expect(calendarioDeAportes(precos, { frequencia: 'mensal', dia: 25 })[0].data)
      .toBe('2024-01-20');
  });

  it('um aporte por mês, nunca dois, mesmo com muitas cotações', () => {
    const eventos = calendarioDeAportes(diario('2024-01-01', '2024-06-30'), {
      frequencia: 'mensal', dia: 15,
    });
    expect(eventos).toHaveLength(6);
    expect(eventos.map((e) => e.data.slice(8))).toEqual(['15', '15', '15', '15', '15', '15']);
  });

  it('marca o período com o mês, para o sorteio ser estável', () => {
    expect(calendarioDeAportes(B3, { frequencia: 'mensal', dia: 10 }).map((e) => e.periodo))
      .toEqual(['2024-01', '2024-02', '2024-03']);
  });
});

describe('calendário semanal', () => {
  it('numa série 24/7, cai exatamente no dia da semana escolhido', () => {
    const eventos = calendarioDeAportes(diario('2024-01-01', '2024-02-29'), {
      frequencia: 'semanal', dia: 3, // quarta
    });
    expect(eventos.every((e) => diaDaSemana(e.data) === 3)).toBe(true);
    expect(eventos[0].data).toBe('2024-01-03');
    expect(eventos).toHaveLength(9);
  });

  it('empurra para a cotação seguinte quando o dia não tem pregão', () => {
    // 2024-01-29 é segunda e não tem pregão na série: o aporte cai no dia 31
    const eventos = calendarioDeAportes(B3, { frequencia: 'semanal', dia: 1 });
    expect(eventos.find((e) => e.periodo === '2024-01-29').data).toBe('2024-01-31');
  });

  it('descarta a primeira semana da série quando a âncora não está coberta', () => {
    // a série estreia em 02/01, uma terça; a segunda daquela semana não existe
    // no dado, e daí não dá para saber se foi feriado ou se a série só começa
    // ali — então a semana não conta
    const eventos = calendarioDeAportes(B3, { frequencia: 'semanal', dia: 1 });
    expect(eventos.map((e) => e.periodo)).not.toContain('2024-01-01');
  });

  it('não duplica a semana quando o feriado empurra o aporte', () => {
    const eventos = calendarioDeAportes(B3, { frequencia: 'semanal', dia: 1 });
    expect(new Set(eventos.map((e) => e.periodo)).size).toBe(eventos.length);
  });

  it('descarta a semana cortada ao meio pela estreia da série', () => {
    // começa numa quarta; a âncora daquela semana (segunda) não existe na série
    const precos = diario('2024-01-03', '2024-01-20');
    const eventos = calendarioDeAportes(precos, { frequencia: 'semanal', dia: 1 });
    expect(eventos[0].data).toBe('2024-01-08');
  });

  it('cabem 52 ou 53 aportes num ano', () => {
    const eventos = calendarioDeAportes(diario('2024-01-01', '2024-12-31'), {
      frequencia: 'semanal', dia: 1,
    });
    expect(eventos.length).toBeGreaterThanOrEqual(52);
    expect(eventos.length).toBeLessThanOrEqual(53);
  });
});

describe('calendário diário', () => {
  it('usa toda cotação da série', () => {
    const precos = diario('2024-01-01', '2024-01-10');
    expect(calendarioDeAportes(precos, { frequencia: 'diaria' })).toHaveLength(10);
  });

  it('não inventa dia sem cotação numa série de pregão', () => {
    expect(calendarioDeAportes(B3, { frequencia: 'diaria' }).map((e) => e.data))
      .toEqual(B3.map(([d]) => d));
  });
});

describe('início e disponibilidade', () => {
  it('filtra pelo mês de início', () => {
    expect(calendarioDeAportes(B3, { frequencia: 'mensal', inicio: '2024-02' }).map((e) => e.data))
      .toEqual(['2024-02-01', '2024-03-04']);
  });

  it('devolve vazio para série vazia, sem estourar', () => {
    expect(calendarioDeAportes([], { frequencia: 'mensal' })).toEqual([]);
    expect(calendarioDeAportes(undefined, { frequencia: 'diaria' })).toEqual([]);
  });

  it('o primeiro período disponível depende do dia escolhido', () => {
    const precos = [['2024-01-20', 10], ['2024-02-05', 11]];
    expect(primeiroPeriodoDisponivel(precos, { frequencia: 'mensal', dia: 5 })).toBe('2024-02');
    expect(primeiroPeriodoDisponivel(precos, { frequencia: 'mensal', dia: 25 })).toBe('2024-01');
  });
});
