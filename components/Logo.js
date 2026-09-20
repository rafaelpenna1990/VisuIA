'use client';

import { useState } from 'react';

// Tries logo.png, then .jpg, .jpeg, .webp in order — so whatever format
// the admin uploads just works, without every part of the site having to
// hardcode one specific extension.
const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

export default function Logo({ version, className, alt = 'VisuIA' }) {
  const [i, setI] = useState(0);
  if (i >= EXTENSIONS.length) return null;
  return (
    <img
      src={`/api/assets/logo.${EXTENSIONS[i]}?v=${version}`}
      alt={alt}
      className={className}
      onError={() => setI((prev) => prev + 1)}
    />
  );
}
