import { useEffect, useState } from 'react';

const DEFAULT_EXPANDED = true;

function readPreference(storageKey: string): boolean {
  if (typeof window === 'undefined') {
    return DEFAULT_EXPANDED;
  }

  const rawValue = window.localStorage.getItem(storageKey);
  if (rawValue === 'true') {
    return false;
  }
  if (rawValue === 'false') {
    return true;
  }
  return DEFAULT_EXPANDED;
}

export function useChatRailPreference(storageKey: string) {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => readPreference(storageKey));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(storageKey, String(!isExpanded));
  }, [isExpanded, storageKey]);

  return {
    isExpanded,
    setIsExpanded,
    toggle: () => setIsExpanded((current) => !current),
  };
}
