'use client';

import { useState } from 'react';

function ExampleTile({ slug, index }) {
  const [triedVideo, setTriedVideo] = useState(false);
  const base = `/carousel/${slug}-${index}`;

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