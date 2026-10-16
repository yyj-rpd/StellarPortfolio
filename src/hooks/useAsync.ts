import { useEffect, useState } from 'react';
export function useAsync<T>(loader: () => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(loader).then(data => { if (active) setState({ data, loading: false, error: null }); })
      .catch(error => { if (active) setState({ data: null, loading: false, error: error instanceof Error ? error.message : '读取失败，请稍后重试。' }); });
    return () => { active = false; };
  }, [loader, attempt]);
  return { ...state, retry: () => { setState({ data: null, loading: true, error: null }); setAttempt(value => value + 1); } };
}


