// hooks/usePersistentState.js
import { useState, useEffect } from 'react';

export function usePersistentState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue !== null) {
        const parsed = JSON.parse(storedValue);

        // Check if the parsed value matches the type of the default
        if (
          typeof parsed === typeof defaultValue &&
          !(Array.isArray(defaultValue) && !Array.isArray(parsed)) // prevent mismatched arrays
        ) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn(`Failed to load key "${key}" from localStorage:`, error);
    }

    return defaultValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to save key "${key}" to localStorage:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
