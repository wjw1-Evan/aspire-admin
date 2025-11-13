import { useState, useEffect, useCallback } from 'react';
import { request } from '@umijs/max';
import type { UserStatisticsResponse } from '@/pages/user-management/types';

/**
 * 用户统计数据 Hook
 *
 * 封装用户统计信息的获取逻辑
 *
 * @example
 * ```tsx
 * const { statistics, loading, refresh } = useUserStatistics();
 *
 * <UserStatistics statistics={statistics} loading={loading} />
 * <Button onClick={refresh}>刷新</Button>
 * ```
 */
export function useUserStatistics() {
  const [statistics, setStatistics] = useState<UserStatisticsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  /**
   * 获取统计信息
   */
  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await request<{
        success: boolean;
        data: UserStatisticsResponse;
      }>('/api/user/statistics', {
        method: 'GET',
      });
      setStatistics(response.data);
    } catch (error) {
      console.error('获取统计信息失败:', error);
      // 静默失败，不显示错误消息（统计信息不是核心功能）
    } finally {
      setLoading(false);
    }
  }, []);

  // 组件挂载时自动获取
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    loading,
    refresh: fetchStatistics,
  };
}
