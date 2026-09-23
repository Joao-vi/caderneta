import { useEffect, useState } from 'react';

export const ABAS = [
  { id: 'renda-fixa', rotulo: 'Renda fixa' },
  { id: 'etfs', rotulo: 'ETFs' },
  { id: 'bitcoin', rotulo: 'Bitcoin' },
];

const PADRAO = ABAS[0].id;

const daHash = () => {
  const id = window.location.hash.replace(/^#\/?/, '');
  return ABAS.some((a) => a.id === id) ? id : PADRAO;
};

/**
 * A aba vive no hash da URL, não no estado: o site é estático e servido pelo
 * GitHub Pages, onde não há rota de servidor para `/bitcoin`. Assim o link é
 * compartilhável e o botão de voltar funciona.
 */
export function useAba() {
  const [aba, setAba] = useState(daHash);

  useEffect(() => {
    const ouvir = () => setAba(daHash());
    window.addEventListener('hashchange', ouvir);
    return () => window.removeEventListener('hashchange', ouvir);
  }, []);

  return [aba, (id) => { window.location.hash = `#/${id}`; setAba(id); }];
}

/**
 * Navegação entre os módulos. São links de página, não um `tablist`: cada aba
 * é um endereço próprio, e o leitor de tela deve anunciá-la como navegação.
 */
export default function Abas({ aba, onAba }) {
  return (
    <nav aria-label="Seções" className="mx-auto max-w-[1180px] px-6">
      <ul className="-mb-px flex flex-wrap gap-1">
        {ABAS.map((a) => {
          const ativa = a.id === aba;
          return (
            <li key={a.id}>
              <a
                href={`#/${a.id}`}
                aria-current={ativa ? 'page' : undefined}
                onClick={(e) => { e.preventDefault(); onAba(a.id); }}
                className={[
                  'inline-block border-b-2 px-4 py-2.5 text-[14.5px] transition-colors',
                  ativa
                    ? 'border-green font-semibold text-green-deep'
                    : 'border-transparent text-ink-soft hover:text-green-deep',
                ].join(' ')}
              >
                {a.rotulo}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
