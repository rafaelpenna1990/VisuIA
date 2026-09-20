'use client';

import { useState } from 'react';
import { useAssetsVersion } from '../lib/useAssetsVersion.js';

// A visible row of example cards — like a small gallery strip. Each slot
// works with ANY common photo or video format: drop a file named
// {slug}-1.(jpg/jpeg/png/webp/mp4/webm) via the admin panel — same for -2
// and -3 — and it just shows up, no code changes needed. Tries each
// extension in turn until one actually exists.
const CANDIDATES = [
  { ext: 'jpg', type: 'image' },
  { ext: 'jpeg', type: 'image' },
  { ext: 'png', type: 'image' },
  { ext: 'webp', type: 'image' },
  { ext: 'mp4', type: 'video' },
  { ext: 'webm', type: 'video' },
];

function ExampleTile({ slug, index, version }) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const base = `/api/assets/carousel/${slug}-${index}`;

  if (candidateIndex >= CANDIDATES.length) return null; // nothing found in any format
  const candidate = CANDIDATES[candidateIndex];
  const advance = () => setCandidateIndex((i) => i + 1);

  if (candidate.type === 'video') {
    return (
      <video
        key={candidate.ext}
        src={`${base}.${candidate.ext}?v=${version}`}
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
        onError={advance}
      />
    );
  }

  return (
    <img
      key={candidate.ext}
      src={`${base}.${candidate.ext}?v=${version}`}
      alt=""
      className="w-full h-full object-cover"
      onError={advance}
    />
  );
}

export default function ExampleCarousel({ slug, count = 3 }) {
  const assetsVersion = useAssetsVersion();
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative aspect-square md:aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black"
        >
          <ExampleTile slug={slug} index={i + 1} version={assetsVersion} />
        </div>
      ))}
    </div>
  );
}
