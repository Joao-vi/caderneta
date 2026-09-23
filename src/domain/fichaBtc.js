import { FREQUENCIAS, diasNoMes } from './calendario.js';

/**
 * Paleta dos gráficos, derivada das matizes da marca mas com a luminosidade e
 * o croma corrigidos para o fundo claro. As cores da identidade (`--color-green`
 * e companhia) são de texto e de chrome: no gráfico, lado a lado, algumas delas
 * ficam indistinguíveis para quem tem daltonismo. Esta ordem passa nos testes
 * de separação de pares vizinhos, e é por isso que é uma ordem, não um ciclo.
 */
export const PALETA_BTC = [
  '#007d54', // verde
  '#bd871c', // ouro
  '#2a6eb1', // azul
  '#c14f40', // tijolo
  '#8858b0', // roxo
  '#0099a7', // teal
];

export const corDoIndice = (i) => PALETA_BTC[i % PALETA_BTC.length];

const num = (v, padrao = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : padrao;
};

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

// `artigo` porque domingo e sábado são masculinos e o resto da semana é
// feminino: "todo domingo", mas "toda segunda".
export const DIAS_DA_SEMANA = [
  { valor: 0, rotulo: 'domingo', curto: 'dom', artigo: 'todo' },
  { valor: 1, rotulo: 'segunda', curto: 'seg', artigo: 'toda' },
  { valor: 2, rotulo: 'terça', curto: 'ter', artigo: 'toda' },
  { valor: 3, rotulo: 'quarta', curto: 'qua', artigo: 'toda' },
  { valor: 4, rotulo: 'quinta', curto: 'qui', artigo: 'toda' },
  { valor: 5, rotulo: 'sexta', curto: 'sex', artigo: 'toda' },
  { valor: 6, rotulo: 'sábado', curto: 'sáb', artigo: 'todo' },
];

/** O dia só existe no mensal (1–31) e no semanal (0–6); no diário não há o que escolher. */
export function diaValido(frequencia, dia) {
  if (frequencia === 'diaria' || dia === null || dia === undefined || dia === '') return null;
  const n = Math.round(num(dia, NaN));
  if (!Number.isFinite(n)) return null;
  if (frequencia === 'semanal') return Math.min(6, Math.max(0, n));
  return Math.min(31, Math.max(1, n));
}

/**
 * Como a ficha se descreve em uma linha. O mensal diz "do mês" no fim porque
 * sem isso "todo dia 1" fica a um caractere de "todo dia", que é o diário.
 */
export function rotuloDoPlano(frequencia, dia) {
  if (frequencia === 'diaria') return 'todo dia';
  if (frequencia === 'semanal') {
    const d = DIAS_DA_SEMANA.find((x) => x.valor === dia);
    return d ? `${d.artigo} ${d.rotulo}` : 'toda semana';
  }
  return dia === null ? 'todo mês' : `todo dia ${dia} do mês`;
}

/**
 * Aviso para um dia do mês que nem todo mês tem. Não é erro — o aporte cai no
 * último dia do mês curto — mas o usuário precisa saber disso antes de
 * comparar o dia 31 com o dia 15 e achar que a diferença veio da escolha.
 */
export function avisoDoDia(frequencia, dia) {
  if (frequencia !== 'mensal' || dia === null || dia <= 28) return null;
  return `Nos meses mais curtos o aporte cai no último dia (em fevereiro, dia ${diasNoMes('2025-02')}).`;
}

export function criarFichaBtc(form, id, indice) {
  const frequencia = FREQUENCIAS.includes(form.frequencia) ? form.frequencia : 'mensal';
  const dia = diaValido(frequencia, form.dia);
  return {
    id,
    nome: String(form.nome || '').trim() || rotuloDoPlano(frequencia, dia),
    orcamentoMensal: Math.max(0, num(form.orcamentoMensal)),
    frequencia,
    dia,
    inicio: MES.test(form.inicio) ? form.inicio : null,
    color: corDoIndice(indice),
  };
}

/**
 * Normaliza uma ficha vinda do localStorage. O conteúdo de lá é editável à mão
 * pelo DevTools, então nada entra sem coerção — em especial `color`, que vai
 * direto para um atributo de estilo.
 */
export function normalizarFichaBtc(raw, i) {
  if (!raw || typeof raw !== 'object') return null;
  const frequencia = FREQUENCIAS.includes(raw.frequencia) ? raw.frequencia : 'mensal';
  const dia = diaValido(frequencia, raw.dia);
  return {
    id: Math.round(num(raw.id, i + 1)),
    nome: String(raw.nome == null ? rotuloDoPlano(frequencia, dia) : raw.nome).slice(0, 120),
    orcamentoMensal: Math.max(0, num(raw.orcamentoMensal)),
    frequencia,
    dia,
    inicio: MES.test(raw.inicio) ? raw.inicio : null,
    color: /^#[0-9a-fA-F]{6}$/.test(raw.color) ? raw.color : corDoIndice(i),
  };
}

/**
 * As três frequências com o mesmo orçamento e o mesmo início — o atalho que
 * responde à pergunta de uma vez, sem obrigar a montar três fichas na mão.
 */
export function trioDeFrequencias(form, primeiroId, primeiroIndice) {
  return [
    { frequencia: 'mensal', dia: diaValido('mensal', form.dia) },
    { frequencia: 'semanal', dia: diaValido('semanal', form.diaSemana ?? 1) },
    { frequencia: 'diaria', dia: null },
  ].map((plano, k) => criarFichaBtc(
    { ...form, ...plano, nome: '' },
    primeiroId + k,
    primeiroIndice + k,
  ));
}
