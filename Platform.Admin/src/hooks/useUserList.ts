import { useState, useCallback } from 'react';
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
 * <DataTable request={fetchUsers} />
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
        const response = await request<{ success: boolean; data: any }>(
          '/api/user/list',
          {
            method: 'POST',
            data: requestData,
          },
        );

        // ✅ 兼容后端返回的数据结构（Users 或 users）
        const users = response.data?.users || response.data?.Users || [];
        const total = response.data?.total || response.data?.Total || 0;

        return {
          data: users,
          success: true,
          total: total,
        };
      } catch (error) {
        console.error('获取用户列表失败:', error);
        // 不在这里显示错误消息，让全局错误处理器统一处理
        // 这样可以避免重复显示错误提示
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














