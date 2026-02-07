import { PageContainer } from '@/components';
import { useModel, useIntl, useAccess } from '@umijs/max';
import { useRequest } from 'ahooks';
import React, { useState, useEffect, useCallback } from 'react';
import { theme } from 'antd';
import { getUserStatistics, getUserActivityLogs } from '@/services/ant-design-pro/api';
import { getTaskStatistics, getMyTodoTasks } from '@/services/task/api';
import { getCurrentCompany } from '@/services/company';
import { getSystemResources } from '@/services/system/api';
import type { SystemResources } from '@/services/system/api';
import useCommonStyles from '@/hooks/useCommonStyles';

import {
  WelcomeHeader,
  QuickActionsPanel,
  TaskOverviewCard,
  RecentActivitiesCard,
  StatisticsOverview,
  SystemResourcesCard
} from './welcome/components';

const Welcome: React.FC = () => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser as API.CurrentUser;

  const [statistics, setStatistics] = useState<any>(null);
  const [taskStatistics, setTaskStatistics] = useState<import('@/services/task/api').TaskStatistics | null>(null);
  const [todoTasks, setTodoTasks] = useState<import('@/services/task/api').TaskDto[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [loading, setLoading] = useState(true);

  // Resource History for Charts
  const [cpuHistory, setCpuHistory] = useState<{ value: number; time: string }[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<{ value: number; time: string }[]>([]);
  const [diskHistory, setDiskHistory] = useState<{ value: number; time: string }[]>([]);

  // 获取统计数据
  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, companyRes, taskStatsRes, todoTasksRes] = await Promise.all([
        getUserStatistics(),
        getCurrentCompany(),
        getTaskStatistics(),
        getMyTodoTasks()
      ]);

      if (statsRes && statsRes.data) {
        setStatistics(statsRes.data);
      }
      if (companyRes && companyRes.data) {
        setCompanyInfo(companyRes.data);
      }
      if (taskStatsRes && taskStatsRes.data) {
        setTaskStatistics(taskStatsRes.data);
      }
      if (todoTasksRes && todoTasksRes.data) {
        setTodoTasks(todoTasksRes.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取系统资源数据
  const fetchSystemResources = useCallback(async () => {
    try {
      const res = await getSystemResources();
      if (res && res.data) {
        const data = res.data;
        setSystemResources(data);

        // Update history data
        const time = new Date().toLocaleTimeString();

        if (data.cpu) {
          setCpuHistory(prev => {
            const newHistory = [...prev, { value: data.cpu?.usagePercent || 0, time }];
            return newHistory.slice(-20); // Keep last 20 points
          });
        }

        if (data.memory) {
          setMemoryHistory(prev => {
            const newHistory = [...prev, { value: data.memory?.usagePercent || 0, time }];
            return newHistory.slice(-20);
          });
        }

        if (data.disk) {
          setDiskHistory(prev => {
            const newHistory = [...prev, { value: data.disk?.usagePercent || 0, time }];
            return newHistory.slice(-20);
          });
        }
      }
    } catch (error) {
      // 错误由全局错误处理处理，这里只记录但不阻止后续轮询
      console.error('获取系统资源失败:', error);
    }
  }, []);

  // 初始数据加载
  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // 定时轮询系统资源更新（每 5 秒）
  useEffect(() => {
    if (!currentUser) return;

    const performFetch = () => {
      // 只有在页面可见时才进行轮询，节省客户端和服务器资源
      if (document.visibilityState === 'visible') {
        fetchSystemResources();
      }
    };

    // 立即获取一次
    performFetch();

    // 设置定时器，每 5 秒轮询一次（降低频率以减少内存和网络压力）
    const intervalId = setInterval(performFetch, 5000);

    // 监听可见性变化，当回到页面时立即刷新
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSystemResources();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 清理定时器
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, fetchSystemResources]);

  return (
    <PageContainer
      showBreadcrumb={false}
      style={{ background: 'transparent', paddingBlock: 12 }}
    >
      <style>{`
        .ant-breadcrumb, 
        .ant-page-header-breadcrumb,
        .ant-page-header-heading { 
          display: none !important; 
        }
        .ant-page-header {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        .quick-action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important;
          border-color: rgba(0,0,0,0.1) !important;
        }
        .quick-action-card:hover .ant-card-body > div > div:first-child {
          transform: scale(1.1);
        }
      `}</style>
      <div>
        <WelcomeHeader
          currentUser={currentUser}
          companyInfo={companyInfo}
        />

        <div style={{ margin: '12px 0' }} />

        <QuickActionsPanel
          currentUser={currentUser}
        />

        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-8px' }}>
            {/* 任务概览与待办任务 */}
            <div style={{ flex: '1 1 50%', minWidth: '300px', padding: '8px' }}>
              <TaskOverviewCard
                taskStatistics={taskStatistics}
                todoTasks={todoTasks}
                loading={loading}
                currentUser={currentUser}
              />
            </div>

            {/* 最近活动 */}
            <div style={{ flex: '1 1 50%', minWidth: '300px', padding: '8px' }}>
              <RecentActivitiesCard
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>

        <StatisticsOverview
          statistics={statistics}
          loading={loading}
        />

        <SystemResourcesCard
          systemResources={systemResources}
          loading={loading}
          memoryHistory={memoryHistory}
          cpuHistory={cpuHistory}
          diskHistory={diskHistory}
        />
      </div>
    </PageContainer>
  );
};

export default Welcome;