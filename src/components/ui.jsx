/** Primitivas visuais compartilhadas, para não repetir classe solta pelos formulários. */

export function Campo({ label, htmlFor, children, hint }) {
  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-ink-soft"
        >
          {label}
        </label>
      )}
      {children}
      {hint && <div className="mt-1.5 font-mono text-[11.5px] text-ink-soft">{hint}</div>}
    </div>
  );
}

const inputBase =
  'w-full rounded-[3px] border border-line bg-paper px-3 py-2.5 text-[14.5px] text-ink ' +
  'focus:border-green focus:bg-card';

export function UnitInput({ unidade, className = '', ...props }) {
  return (
    <div className="relative">
      <input className={`${inputBase} ${className}`} {...props} />
      {unidade && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">
          {unidade}
        </span>
      )}
    </div>
  );
}

export function TextInput(props) {
  return <input className={inputBase} {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className={inputBase} {...props}>
      {children}
    </select>
  );
}

/** Grupo de botões segmentado. `opcoes` = [{ valor, rotulo }]. */
export function Seg({ opcoes, valor, onChange, tamanho = 'md', 'aria-label': ariaLabel }) {
  const pad = tamanho === 'sm' ? 'px-4 py-1.5 text-xs' : 'px-1.5 py-2.5 text-[12.5px]';
  return (
    <div role="group" aria-label={ariaLabel} className="flex overflow-hidden rounded-[3px] border border-line">
      {opcoes.map((o, i) => (
        <button
          key={o.valor}
          type="button"
          aria-pressed={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={[
            'flex-1 border-r border-line transition-colors last:border-r-0',
            pad,
            valor === o.valor ? 'bg-green text-white' : 'bg-paper text-ink-soft hover:text-green-deep',
          ].join(' ')}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export function Painel({ children, className = '' }) {
  return (
    <div
      className={`rounded-sheet border border-line bg-card shadow-sheet ${className}`}
      style={{ boxShadow: 'var(--shadow-sheet)' }}
    >
      {children}
    </div>
  );
}

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** '2024-03-15' -> 'mar/24'. Aceita também 'YYYY-MM'. */
export const rotuloMes = (iso) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`;

/** '2024-03-15' -> '15/03/2024'. */
export const rotuloData = (iso) => iso.split('-').reverse().join('/');

/** Par mês/ano para escolher um 'YYYY-MM' dentro de um intervalo disponível. */
export function SeletorMes({ rotulo, valor, onChange, primeiro, ultimo, hint }) {
  const [ano, mes] = valor.split('-');
  const anos = [];
  for (let a = Number(primeiro.slice(0, 4)); a <= Number(ultimo.slice(0, 4)); a += 1) anos.push(a);
  return (
    <Campo label={rotulo} hint={hint}>
      <div className="grid grid-cols-2 gap-2">
        <Select aria-label={`Mês: ${rotulo}`} value={mes} onChange={(e) => onChange(`${ano}-${e.target.value}`)}>
          {MESES.map((m, i) => {
            const v = String(i + 1).padStart(2, '0');
            return <option key={v} value={v}>{m}</option>;
          })}
        </Select>
        <Select aria-label={`Ano: ${rotulo}`} value={ano} onChange={(e) => onChange(`${e.target.value}-${mes}`)}>
          {anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
      </div>
    </Campo>
  );
}
