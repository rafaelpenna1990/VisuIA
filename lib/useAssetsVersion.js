'use client';

import { useState, useEffect } from 'react';

// Fetches the current cache-busting version once. Use it like:
//   const v = useAssetsVersion();
//   <img src={`/api/assets/logo.png?v=${v}`} />
// Starts at 1 so the very first render already has a valid (if
// possibly-stale) URL instead of an empty one.
export function useAssetsVersion() {
  const [version, setVersion] = useState(1);
  useEffect(() => {
    fetch('/api/assets-version')
      .then((res) => res.json())
      .then((data) => setVersion(data.version || 1))
      .catch(() => {});
  }, []);
  return version;
}

// Igual ao useAssetsVersion, mas também diz quando a versão REAL já chegou
// do servidor (ready). Quem carrega arquivos pesados (como os vídeos de
// fundo) deve esperar o ready: começar com a versão provisória "1" e trocar
// depois faz o navegador baixar o arquivo duas vezes.
export function useAssetsVersionState() {
  const [state, setState] = useState({ version: 1, ready: false });
  useEffect(() => {
    let cancelled = false;
    fetch('/api/assets-version')
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setState({ version: data.version || 1, ready: true }); })
      .catch(() => { if (!cancelled) setState({ version: 1, ready: true }); });
    return () => { cancelled = true; };
  }, []);
  return state;
}
