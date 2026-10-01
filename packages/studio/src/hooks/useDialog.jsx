"use client";

import { useState, useCallback, useRef } from 'react';

// Substitui os pop-ups nativos do navegador (window.alert / window.confirm /
// window.prompt) por um modal com a cara da VisuIA, sem precisar de um
// Provider na raiz do app — cada componente chama o hook e renderiza
// {dialog} uma vez no seu próprio JSX.
//
// Uso:
//   const { alert, confirm, prompt, dialog } = useDialog();
//   ...
//   await alert('Mensagem');
//   const ok = await confirm('Tem certeza?');
//   const nome = await prompt('Nome da coleção:', 'valor inicial');
//   ...
//   return <div>{dialog}{...resto do componente}</div>;
//
// As três funções retornam uma Promise, então todo call-site precisa de
// `await` — sem isso, `if (!confirm(...))` nunca funcionaria, já que uma
// Promise é sempre "truthy".
export function useDialog() {
  const [state, setState] = useState(null); // { type, message, defaultValue } | null
  const resolverRef = useRef(null);

  const open = useCallback((type, message, defaultValue) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ type, message, defaultValue: defaultValue ?? '' });
    });
  }, []);

  const alertFn = useCallback((message) => open('alert', message), [open]);
  const confirmFn = useCallback((message) => open('confirm', message), [open]);
  const promptFn = useCallback((message, defaultValue) => open('prompt', message, defaultValue), [open]);

  const close = useCallback((result) => {
    if (resolverRef.current) resolverRef.current(result);
    resolverRef.current = null;
    setState(null);
  }, []);

  const dialog = state ? <DialogModal state={state} onClose={close} /> : null;

  return { alert: alertFn, confirm: confirmFn, prompt: promptFn, dialog };
}

function DialogModal({ state, onClose }) {
  const [value, setValue] = useState(state.defaultValue || '');

  const handleConfirm = () => {
    if (state.type === 'prompt') onClose(value.trim() ? value.trim() : null);
    else onClose(true);
  };

  const handleCancel = () => {
    if (state.type === 'alert') onClose(true);
    else if (state.type === 'confirm') onClose(false);
    else onClose(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={handleCancel}
    >
      <div
        className="bg-[#141720] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-3xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white text-sm leading-relaxed whitespace-pre-line mb-5">{state.message}</p>

        {state.type === 'prompt' && (
          <input
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
              if (e.key === 'Escape') handleCancel();
            }}
            className="w-full mb-5 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary/50"
          />
        )}

        <div className="flex gap-2 justify-end">
          {state.type !== 'alert' && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-white/50 hover:text-white text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            autoFocus={state.type !== 'prompt'}
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg bg-primary text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            {state.type === 'alert' ? 'OK' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
