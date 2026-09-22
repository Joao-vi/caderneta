import { useEffect, useState } from 'react';

export const ETFS = ['IVVB11', 'NASD11'];

/**
 * Carrega os históricos gerados por scripts/atualizar-dados.mjs. O caminho é
 * relativo à página, então funciona tanto no dev quanto em /caderneta/.
 */
export function useDadosEtf() {
  const [estado, setEstado] = useState({ status: 'carregando', dados: null });

  useEffect(() => {
    let vivo = true;
    const baixar = async (nome) => {
      const resp = await fetch(`dados/${nome}.json`);
      if (!resp.ok) throw new Error(`${resp.status} em ${nome}`);
      return resp.json();
    };

    Promise.all(['cdi', 'ipca', ...ETFS].map(baixar))
      .then(([cdi, ipca, ...etfs]) => {
        if (!vivo) return;
        const dados = { cdi, ipca };
        ETFS.forEach((t, i) => { dados[t] = etfs[i]; });
        setEstado({ status: 'ok', dados });
      })
      .catch(() => vivo && setEstado({ status: 'erro', dados: null }));

    return () => { vivo = false; };
  }, []);

  return estado;
}
