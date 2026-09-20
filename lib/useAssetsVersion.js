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
