/**
 * Conversão entre prazo em dias e data de vencimento. O prazo em dias é a
 * fonte única de verdade em toda a aplicação; a data apenas escreve nele.
 */
const DIA_MS = 86400000;

export function hojeMeiaNoite() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "2026-11-18" -> dias corridos a partir de hoje. null se inválida. */
export function dataParaDias(iso, hoje = hojeMeiaNoite()) {
  const [ano, mes, dia] = String(iso).split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  return Math.round((new Date(ano, mes - 1, dia) - hoje) / DIA_MS);
}

export function diasParaData(dias, hoje = hojeMeiaNoite()) {
  const d = new Date(hoje);
  d.setDate(d.getDate() + dias);
  return d;
}

export function isoDe(data) {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}
