// hooks/usePersistentState.js
import { useState, useEffect } from 'react';

export function usePersistentState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    // Load from localStorage first
    const storedValue = localStorage.getItem(key);
    return storedValue !== null
      ? JSON.parse(storedValue)
      : defaultValue;
  });

  useEffect(() => {
    // Save to localStorage when value changes
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
