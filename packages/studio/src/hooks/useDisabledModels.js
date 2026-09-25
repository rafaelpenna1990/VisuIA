import { useState, useEffect } from 'react';

// Fetched once per studio mount — the list of model ids the admin has
// temporarily switched off. Each studio filters its own model arrays
// against this before rendering the picker, so a disabled model simply
// doesn't show up as an option (the server also rejects it directly, as
// a second layer of protection for anyone bypassing the UI).
export function useDisabledModels() {
  const [disabled, setDisabled] = useState([]);
  useEffect(() => {
    fetch('/api/disabled-models')
      .then((res) => res.json())
      .then((data) => setDisabled(data.disabled || []))
      .catch(() => {});
  }, []);
  return disabled;
}

export function filterEnabled(models, disabledIds) {
  if (!disabledIds || disabledIds.length === 0) return models;
  const disabledSet = new Set(disabledIds);
  return models.filter((m) => !disabledSet.has(m.id));
}
