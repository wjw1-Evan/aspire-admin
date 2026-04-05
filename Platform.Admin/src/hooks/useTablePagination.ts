import { useCallback, useRef } from 'react';
import type { PageParams } from '@/types/api-response';

interface UseTablePaginationOptions {
  fetchData: () => Promise<void>;
  initialParams?: PageParams;
}

interface UseTablePaginationReturn {
  searchParamsRef: React.MutableRefObject<PageParams>;
  handleTableChange: (pag: any, _filters: any, sorter: any) => void;
}

export function useTablePagination({
  fetchData,
  initialParams = {},
}: UseTablePaginationOptions): UseTablePaginationReturn {
  const searchParamsRef = useRef<PageParams>(initialParams);

  const handleTableChange = useCallback((pag: any, _filters: any, sorter: any) => {
    const newPage = pag.current;
    const newPageSize = pag.pageSize;
    const sortBy = sorter?.field;
    const sortOrder = sorter?.order === 'ascend' ? 'asc' : sorter?.order === 'descend' ? 'desc' : undefined;

    searchParamsRef.current = {
      ...searchParamsRef.current,
      page: newPage,
      pageSize: newPageSize,
      sortBy,
      sortOrder,
    };
    fetchData();
  }, [fetchData]);

  return { searchParamsRef, handleTableChange };
}
