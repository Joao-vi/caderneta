import { useCallback, useEffect, useRef, useState } from 'react';
import { carregarEstado, limparEstado, salvarEstado } from '../domain/armazenamento.js';
import { criarFicha } from '../domain/ficha.js';

const CDI_PADRAO = 13.9;

/** Estado das fichas + CDI, espelhado no localStorage a cada mudança. */
export function useFichas() {
  const [items, setItems] = useState([]);
  const [cdi, setCdi] = useState(CDI_PADRAO);
  const seq = useRef(0);
  const hidratado = useRef(false);

  useEffect(() => {
    const salvo = carregarEstado();
    if (salvo) {
      setItems(salvo.items);
      seq.current = salvo.seq;
      if (salvo.cdi !== null) setCdi(salvo.cdi);
    }
    hidratado.current = true;
  }, []);

  // só persiste depois de hidratar, senão o primeiro render apagaria o que estava salvo
  useEffect(() => {
    if (!hidratado.current) return;
    salvarEstado({ items, seq: seq.current, cdi });
  }, [items, cdi]);

  const adicionar = useCallback(
    (form) => {
      setItems((atuais) => {
        seq.current += 1;
        return [...atuais, criarFicha(form, cdi, seq.current, atuais.length)];
      });
    },
    [cdi],
  );

  const remover = useCallback((id) => {
    setItems((atuais) => atuais.filter((i) => i.id !== id));
  }, []);

  const limpar = useCallback(() => {
    setItems([]);
    seq.current = 0;
    limparEstado();
  }, []);

  const alterarCdi = useCallback((valor) => {
    const n = Number(valor);
    setCdi(Number.isFinite(n) ? n : 0);
  }, []);

  return { items, cdi, adicionar, remover, limpar, alterarCdi };
}
