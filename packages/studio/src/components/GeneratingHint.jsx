import { useState, useEffect } from 'react';

// Small text shown next to the Gerar button while a generation is in
// progress. Video and lip sync genuinely can take a few minutes — without
// this, people assume the app froze and close the tab (losing the credit
// reservation until it times out). Image/Cinema are normally fast, so
// they only escalate if something's unusually slow.
export default function GeneratingHint({ generating, kind }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!generating) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [generating]);

  if (!generating) return null;

  const isSlowKind = kind === 'video' || kind === 'lipsync';
  let text = 'Aguarde, não feche esta página';

  if (isSlowKind && elapsed >= 45) {
    text = 'Ainda processando — vídeos podem levar alguns minutos, isso é normal';
  } else if (isSlowKind && elapsed >= 15) {
    text = 'Gerando vídeo... isso pode levar alguns minutos';
  } else if (!isSlowKind && elapsed >= 20) {
    text = 'Quase lá, um pouco mais de paciência...';
  }

  return <p className="text-[10px] text-white/40">{text}</p>;
}
