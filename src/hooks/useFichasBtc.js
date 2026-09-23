import { useCallback, useEffect, useRef, useState } from 'react';
import { carregarEstadoBtc, limparEstadoBtc, salvarEstadoBtc } from '../domain/armazenamento.js';
import { criarFichaBtc, trioDeFrequencias } from '../domain/fichaBtc.js';

/** Estado das fichas de bitcoin, espelhado no localStorage a cada mudança. */
export function useFichasBtc() {
  const [items, setItems] = useState([]);
  const seq = useRef(0);
  const hidratado = useRef(false);

  useEffect(() => {
    const salvo = carregarEstadoBtc();
    if (salvo) {
      setItems(salvo.items);
      seq.current = salvo.seq;
    }
    hidratado.current = true;
  }, []);

  // só persiste depois de hidratar, senão o primeiro render apagaria o salvo
  useEffect(() => {
    if (!hidratado.current) return;
    salvarEstadoBtc({ items, seq: seq.current });
  }, [items]);

  const adicionar = useCallback((form) => {
    setItems((atuais) => {
      seq.current += 1;
      return [...atuais, criarFichaBtc(form, seq.current, atuais.length)];
    });
  }, []);

  /** O atalho: as três frequências do mesmo orçamento, de uma vez. */
  const adicionarTrio = useCallback((form) => {
    setItems((atuais) => {
      const trio = trioDeFrequencias(form, seq.current + 1, atuais.length);
      seq.current += trio.length;
      return [...atuais, ...trio];
    });
  }, []);

  const remover = useCallback((id) => {
    setItems((atuais) => atuais.filter((i) => i.id !== id));
  }, []);

  const limpar = useCallback(() => {
    setItems([]);
    seq.current = 0;
    limparEstadoBtc();
  }, []);

  return { items, adicionar, adicionarTrio, remover, limpar };
}
