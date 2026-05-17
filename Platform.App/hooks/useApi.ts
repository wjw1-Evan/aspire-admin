import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (apiCall: () => Promise<{ success: boolean; data?: T; message?: string }>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiCall();
      if (mountedRef.current) {
        if (response.success) {
          setState({ data: response.data ?? null, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: response.message || '请求失败' });
        }
      }
      return response;
    } catch (err: any) {
      if (mountedRef.current) {
        setState({ data: null, loading: false, error: err?.message || '网络错误' });
      }
      return { success: false, message: err?.message || '网络错误' };
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
