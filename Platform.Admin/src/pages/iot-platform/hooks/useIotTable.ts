import { useState, useRef, useCallback } from 'react';


export function useIotTable<T>(fetchFn: (params: any) => Promise<{ success: boolean; data?: { queryable?: T[]; rowCount?: number } }>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const searchParamsRef = useRef<any>({ page: 1, pageSize: 20 });

  const fetchData = useCallback(async () => {
    const params = searchParamsRef.current;
    setLoading(true);
    try {
      const res = await fetchFn(params);
      if (res.success && res.data) {
        setData(res.data.queryable || []);
        setPagination(prev => ({ ...prev, page: params.page ?? prev.page, pageSize: params.pageSize ?? prev.pageSize, total: res.data?.rowCount ?? 0 }));
      } else {
        setData([]);
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    } catch {
      setData([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  const handleSearch = useCallback((params: any) => {
    searchParamsRef.current = { ...searchParamsRef.current, ...params, page: 1 };
    fetchData();
  }, [fetchData]);

  const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
    searchParamsRef.current = {
      ...searchParamsRef.current,
      page: pag.current,
      pageSize: pag.pageSize,
      sortBy: sorter?.field,
      sortOrder: sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined,
    };
    fetchData();
  }, [fetchData]);

  return { data, loading, pagination, searchParamsRef, fetchData, handleSearch, handleTableChange, setData };
}
