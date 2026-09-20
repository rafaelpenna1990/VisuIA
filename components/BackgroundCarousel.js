'use client';

import { useState, useEffect } from 'react';

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
            opacity: i === index ? 0.25 : 0,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-app-bg/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-app-bg via-transparent to-app-bg" />
    </div>
  );
}