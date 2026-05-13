import { useEffect, useRef, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedValue(value), delay);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 命令式防抖函数，适用于简单回调
 */
export function debounce(fn: (...args: any[]) => void, delay: number = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: any[]) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
