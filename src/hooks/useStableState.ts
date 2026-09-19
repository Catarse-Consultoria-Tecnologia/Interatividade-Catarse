import { useCallback, useRef, useState } from "react";

/**
 * Como useState, mas ignora atualizações cujo conteúdo é idêntico ao atual (comparado
 * por JSON.stringify). Evita re-renderizar a árvore inteira do jogo a cada poll/broadcast
 * quando nada realmente mudou — o que, em componentes com popovers/animações abertos
 * (o picker de zona da carta, por exemplo), pode derrubar interações em andamento.
 */
export function useStableState<T>(initial: T | null = null) {
  const [value, setValue] = useState<T | null>(initial);
  const serializedRef = useRef<string | null>(initial ? JSON.stringify(initial) : null);

  const setStable = useCallback((next: T) => {
    const serialized = JSON.stringify(next);
    if (serialized === serializedRef.current) return;
    serializedRef.current = serialized;
    setValue(next);
  }, []);

  return [value, setStable] as const;
}
