'use client';

import { useState } from 'react';

// A visible row of example cards — like a small gallery strip. Each slot
// works with EITHER a photo or a video: drop a file named
// public/carousel/{slug}-1.jpg (or .mp4/.webm) — same for -2 and -3 — and
// it just shows up, no code changes needed. If a .jpg is missing, it
// automatically tries a video with the same name instead.
function ExampleTile({ slug, index }) {
  const [triedVideo, setTriedVideo] = useState(false);
  const base = `/api/assets/carousel/${slug}-${index}`;

  if (triedVideo) {
    return (
      <video
        src={`${base}.mp4`}
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
        onError={(e) => {
          // Neither a jpg nor an mp4 exists for this slot — just show
          // nothing rather than a broken icon.
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <img
      src={`${base}.jpg`}
      alt=""
      className="w-full h-full object-cover"
      onError={() => setTriedVideo(true)}
    />
  );
}

export default function ExampleCarousel({ slug, count = 3 }) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative aspect-square md:aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black"
        >
          <ExampleTile slug={slug} index={i + 1} />
        </div>
      ))}
    </div>
  );
}
