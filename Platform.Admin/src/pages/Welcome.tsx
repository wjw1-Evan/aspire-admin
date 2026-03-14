import { PageContainer } from '@/components';
import { useModel, useIntl, useAccess } from '@umijs/max';
import { useRequest } from 'ahooks';
import React, { useState, useEffect, useCallback } from 'react';
import { theme, Row, Col, Space, message } from 'antd';
import { getUserStatistics, getUserActivityLogs } from '@/services/ant-design-pro/api';
import { getTaskStatistics, getMyTodoTasks } from '@/services/task/api';
import { getCurrentCompany } from '@/services/company';
import { getSystemResources } from '@/services/system/api';
import type { SystemResources } from '@/services/system/api';
import { getDocumentStatistics, getPendingDocuments } from '@/services/document/api';
import useCommonStyles from '@/hooks/useCommonStyles';
import { getWelcomeLayout, saveWelcomeLayout } from '@/services/welcome/layout';
import type { CardLayoutConfig } from '@/services/welcome/layout';

import {
  WelcomeHeader,
  QuickActionsPanel,
  TaskOverviewCard,
  StatisticsOverview,
  SystemResourcesCard,
  ApprovalOverviewCard,
  IoTEventAlertsCard,
  ProjectListCard,
  DraggableCardContainer
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

  // 审批相关
  const [docStatistics, setDocStatistics] = useState<import('@/services/document/api').DocumentStatistics | null>(null);
  const [pendingDocs, setPendingDocs] = useState<import('@/services/document/api').Document[]>([]);

  const access = useAccess();
  const canAccessApproval = access.canAccessPath('/document/approval');

  // Resource History for Charts
  const [cpuHistory, setCpuHistory] = useState<{ value: number; time: string }[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<{ value: number; time: string }[]>([]);
  const [diskHistory, setDiskHistory] = useState<{ value: number; time: string }[]>([]);

  // 卡片布局状态
  const [cardLayouts, setCardLayouts] = useState<CardLayoutConfig[]>([]);
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const [isSavingLayout, setIsSavingLayout] = useState(false);

  // 默认卡片配置
  const defaultLayouts: CardLayoutConfig[] = [
    { cardId: 'task-overview', order: 0, column: 'left', visible: true },
    { cardId: 'project-list', order: 1, column: 'left', visible: true },
    { cardId: 'statistics-overview', order: 2, column: 'left', visible: true },
    { cardId: 'approval-overview', order: 0, column: 'right', visible: canAccessApproval },
    { cardId: 'iot-events', order: 1, column: 'right', visible: true },
    { cardId: 'system-resources', order: 2, column: 'right', visible: true },
  ];

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

      // 🚀 优化：审批统计和待处理公文尝试获取
      // 不再严格依赖 canAccessPath，只要是登录状态就尝试请求。
      // 这里的 canAccessApproval 仅用于 UI 模块的显隐。
      try {
        const [docStatsRes, pendingDocsRes] = await Promise.all([
          getDocumentStatistics(),
          getPendingDocuments({ page: 1, pageSize: 5 })
        ]);

        if (docStatsRes?.success && docStatsRes.data) {
          setDocStatistics(docStatsRes.data);
        }
        if (pendingDocsRes?.success && pendingDocsRes.data?.list) {
          setPendingDocs(pendingDocsRes.data.list);
        }
      } catch (docError) {
        // 对于非核心数据的失败，只记录日志不中断流程
        console.warn('Welcome: 获取审批统计失败', docError);
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

  // 加载用户保存的布局配置
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const res = await getWelcomeLayout();
        if (res?.data?.layouts && res.data.layouts.length > 0) {
          setCardLayouts(res.data.layouts);
        } else {
          setCardLayouts(defaultLayouts);
        }
      } catch (error) {
        console.warn('加载布局配置失败，使用默认配置:', error);
        setCardLayouts(defaultLayouts);
      }
    };

    if (currentUser) {
      loadLayout();
    }
  }, [currentUser, canAccessApproval]);

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

  // 处理拖动开始
  const handleDragStart = useCallback((cardId: string, column: 'left' | 'right') => {
    setDraggingCard(cardId);
  }, []);

  // 处理拖动结束
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // 处理放置
  const handleDrop = useCallback((targetCardId: string, targetColumn: 'left' | 'right') => {
    if (!draggingCard) return;

    setCardLayouts(prevLayouts => {
      const newLayouts = [...prevLayouts];
      const draggedIndex = newLayouts.findIndex(l => l.cardId === draggingCard);
      const targetIndex = newLayouts.findIndex(l => l.cardId === targetCardId);

      if (draggedIndex === -1 || targetIndex === -1) return prevLayouts;

      // 交换卡片
      const draggedLayout = newLayouts[draggedIndex];
      const targetLayout = newLayouts[targetIndex];

      // 更新拖动卡片的列和顺序
      draggedLayout.column = targetColumn;
      draggedLayout.order = targetLayout.order;

      // 重新排序同列的卡片
      const sameColumnLayouts = newLayouts.filter(l => l.column === targetColumn);
      sameColumnLayouts.sort((a, b) => a.order - b.order);
      sameColumnLayouts.forEach((layout, index) => {
        layout.order = index;
      });

      // 保存布局到后端
      saveLayoutToBackend(newLayouts);

      return newLayouts;
    });

    setDraggingCard(null);
  }, [draggingCard]);

  // 保存布局到后端
  const saveLayoutToBackend = useCallback(async (layouts: CardLayoutConfig[]) => {
    if (isSavingLayout) return;

    setIsSavingLayout(true);
    try {
      await saveWelcomeLayout({
        layouts,
        updatedAt: new Date().toISOString(),
      });
      message.success('布局已保存');
    } catch (error) {
      console.error('保存布局失败:', error);
      message.error('保存布局失败');
    } finally {
      setIsSavingLayout(false);
    }
  }, [isSavingLayout]);

  // 获取指定列的卡片
  const getCardsForColumn = (column: 'left' | 'right') => {
    return cardLayouts
      .filter(l => l.column === column && l.visible)
      .sort((a, b) => a.order - b.order);
  };

  // 渲染卡片
  const renderCard = (layout: CardLayoutConfig) => {
    const { cardId } = layout;
    const isDragging = draggingCard === cardId;

    const cardProps = {
      loading,
      currentUser,
      taskStatistics,
      todoTasks,
      statistics,
      systemResources,
      memoryHistory,
      cpuHistory,
      diskHistory,
      docStatistics,
      pendingDocs,
    };

    const cardComponent = (() => {
      switch (cardId) {
        case 'task-overview':
          return <TaskOverviewCard {...cardProps} />;
        case 'project-list':
          return <ProjectListCard loading={loading} />;
        case 'statistics-overview':
          return <StatisticsOverview {...cardProps} />;
        case 'approval-overview':
          return canAccessApproval ? (
            <ApprovalOverviewCard
              statistics={docStatistics}
              pendingDocuments={pendingDocs}
              loading={loading}
            />
          ) : null;
        case 'iot-events':
          return <IoTEventAlertsCard loading={loading} />;
        case 'system-resources':
          return <SystemResourcesCard {...cardProps} />;
        default:
          return null;
      }
    })();

    return (
      <DraggableCardContainer
        key={cardId}
        cardId={cardId}
        column={layout.column}
        isDragging={isDragging}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onLayoutChange={setCardLayouts}
      >
        {cardComponent}
      </DraggableCardContainer>
    );
  };

  return (
    <PageContainer
      showBreadcrumb={false}
      style={{ background: 'transparent', paddingBlock: 8 }}
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
          <Row gutter={[16, 16]}>
            {/* 左侧列 */}
            <Col xs={24} lg={12}>
              <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                {getCardsForColumn('left').map(layout => renderCard(layout))}
              </Space>
            </Col>
            {/* 右侧列 */}
            <Col xs={24} lg={12}>
              <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                {getCardsForColumn('right').map(layout => renderCard(layout))}
              </Space>
            </Col>
          </Row>
        </div>
      </div>
    </PageContainer>
  );
};

export default Welcome;
