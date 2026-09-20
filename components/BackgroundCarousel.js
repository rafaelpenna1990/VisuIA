'use client';

import { useState, useEffect } from 'react';

// A slow-fading background image carousel. Images live as plain files in
// public/carousel/{slug}-1.jpg, {slug}-2.jpg, {slug}-3.jpg — to change
// them, just replace those files (same names) and redeploy. No code
// changes needed.
export default function BackgroundCarousel({ slug, count = 3, intervalMs = 5000 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % count);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(/carousel/${slug}-${i + 1}.jpg)`,
            opacity: i === index ? 0.35 : 0,
          }}
        />
      ))}
      {/* Just enough darkening to keep text on top readable */}
      <div className="absolute inset-0 bg-app-bg/35" />
    </div>
  );
}
