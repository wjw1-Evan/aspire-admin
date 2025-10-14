import { useState, useCallback } from 'react';
import { message } from 'antd';
import { request } from '@umijs/max';
import type { UserListRequest } from '@/pages/user-management/types';

/**
 * 用户列表管理 Hook
 * 
 * 封装用户列表的获取和搜索逻辑
 * 
 * @example
 * ```tsx
 * const { searchParams, fetchUsers, updateSearchParams } = useUserList();
 * 
 * <ProTable request={fetchUsers} />
 * ```
 */
export function useUserList() {
  const [searchParams, setSearchParams] = useState<UserListRequest>({
    Page: 1,
    PageSize: 10,
    SortBy: 'CreatedAt',
    SortOrder: 'desc',
  });

  /**
   * 获取用户列表
   */
  const fetchUsers = useCallback(
    async (params: any) => {
      const requestData: UserListRequest = {
        Page: params.current || searchParams.Page,
        PageSize: params.pageSize || searchParams.PageSize,
        Search: searchParams.Search,
        RoleIds: searchParams.RoleIds,
        IsActive: searchParams.IsActive,
        SortBy: params.sortBy || searchParams.SortBy,
        SortOrder: params.sortOrder || searchParams.SortOrder,
        StartDate: searchParams.StartDate,
        EndDate: searchParams.EndDate,
      };

      try {
        const response = await request<{ success: boolean; data: any }>('/api/user/list', {
          method: 'POST',
          data: requestData,
        });

        return {
          data: response.data.users || [],
          success: true,
          total: response.data.total || 0,
        };
      } catch (error) {
        console.error('获取用户列表失败:', error);
        message.error('获取用户列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    },
    [searchParams],
  );

  /**
   * 更新搜索参数
   */
  const updateSearchParams = useCallback((params: Partial<UserListRequest>) => {
    setSearchParams((prev) => ({ ...prev, ...params, Page: 1 }));
  }, []);

  /**
   * 重置搜索参数
   */
  const resetSearchParams = useCallback(() => {
    setSearchParams({
      Page: 1,
      PageSize: 10,
      SortBy: 'CreatedAt',
      SortOrder: 'desc',
    });
  }, []);

  return {
    searchParams,
    fetchUsers,
    updateSearchParams,
    resetSearchParams,
  };
}




