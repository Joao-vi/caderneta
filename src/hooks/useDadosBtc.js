import { useEffect, useState } from 'react';

export const TICKER_BTC = 'BTC-USD';

/**
 * Carrega o histórico do bitcoin gerado por scripts/atualizar-dados.mjs. O
 * caminho é relativo à página, então funciona tanto no dev quanto em /caderneta/.
 */
export function useDadosBtc() {
  const [estado, setEstado] = useState({ status: 'carregando', dados: null });

  useEffect(() => {
    let vivo = true;
    fetch(`dados/${TICKER_BTC}.json`)
      .then((resp) => {
        if (!resp.ok) throw new Error(`${resp.status} em ${TICKER_BTC}`);
        return resp.json();
      })
      .then((dados) => {
        if (!vivo) return;
        if (!Array.isArray(dados?.precos) || !dados.precos.length) throw new Error('série vazia');
        setEstado({ status: 'ok', dados });
      })
      .catch(() => vivo && setEstado({ status: 'erro', dados: null }));

    return () => { vivo = false; };
  }, []);

  return estado;
}
