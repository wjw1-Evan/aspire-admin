import { PageContainer } from '@/components';
import { useModel, useIntl, useAccess } from '@umijs/max';
import { useRequest } from 'ahooks';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { theme, Row, Col, Space, message } from 'antd';
import { getUserStatistics, getUserActivityLogs } from '@/services/ant-design-pro/api';
import { getTaskStatistics, getMyTodoTasks } from '@/services/task/api';
import { getCurrentCompany } from '@/services/company';
import { getSystemResources } from '@/services/system/api';
import type { SystemResources } from '@/services/system/api';
import { getDocumentStatistics, getPendingDocuments } from '@/services/document/api';
import useCommonStyles from '@/hooks/useCommonStyles';
import { saveWelcomeLayout } from '@/services/welcome/layout';
import type { CardLayoutConfig } from '@/services/welcome/layout';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';

import {
  WelcomeHeader,
  QuickActionsPanel,
  TaskOverviewCard,
  StatisticsOverview,
  SystemResourcesCard,
  ApprovalOverviewCard,
  IoTEventAlertsCard,
  ProjectListCard
} from './welcome/components';

// 可排序的卡片包装器
interface SortableCardProps {
  id: string;
  children: React.ReactNode;
}

const SortableCard: React.FC<SortableCardProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

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
  const [leftCards, setLeftCards] = useState<string[]>(['task-overview', 'project-list', 'statistics-overview']);
  const [rightCards, setRightCards] = useState<string[]>(['approval-overview', 'iot-events', 'system-resources']);
  const [isSavingLayout, setIsSavingLayout] = useState(false);

  // dnd-kit 传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

        const time = new Date().toLocaleTimeString();

        if (data.cpu) {
          setCpuHistory(prev => {
            const newHistory = [...prev, { value: data.cpu?.usagePercent || 0, time }];
            return newHistory.slice(-20);
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
      if (document.visibilityState === 'visible') {
        fetchSystemResources();
      }
    };

    performFetch();

    const intervalId = setInterval(performFetch, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSystemResources();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, fetchSystemResources]);

  // 处理拖动结束
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // 判断是否在同一列
    const activeInLeft = leftCards.includes(activeId);
    const overInLeft = leftCards.includes(overId);

    if (activeInLeft === overInLeft) {
      // 同列拖动
      if (activeInLeft) {
        const oldIndex = leftCards.indexOf(activeId);
        const newIndex = leftCards.indexOf(overId);
        setLeftCards(arrayMove(leftCards, oldIndex, newIndex));
      } else {
        const oldIndex = rightCards.indexOf(activeId);
        const newIndex = rightCards.indexOf(overId);
        setRightCards(arrayMove(rightCards, oldIndex, newIndex));
      }
    } else {
      // 跨列拖动
      if (activeInLeft) {
        // 从左列拖到右列
        const oldIndex = leftCards.indexOf(activeId);
        const newIndex = rightCards.indexOf(overId);
        setLeftCards(leftCards.filter(id => id !== activeId));
        setRightCards([
          ...rightCards.slice(0, newIndex),
          activeId,
          ...rightCards.slice(newIndex),
        ]);
      } else {
        // 从右列拖到左列
        const oldIndex = rightCards.indexOf(activeId);
        const newIndex = leftCards.indexOf(overId);
        setRightCards(rightCards.filter(id => id !== activeId));
        setLeftCards([
          ...leftCards.slice(0, newIndex),
          activeId,
          ...leftCards.slice(newIndex),
        ]);
      }
    }

    // 保存布局
    saveLayoutToBackend();
  }, [leftCards, rightCards]);

  // 保存布局到后端
  const saveLayoutToBackend = useCallback(async () => {
    if (isSavingLayout) return;

    setIsSavingLayout(true);
    try {
      const layouts: CardLayoutConfig[] = [
        ...leftCards.map((cardId, index) => ({
          cardId,
          order: index,
          column: 'left' as const,
          visible: true,
        })),
        ...rightCards.map((cardId, index) => ({
          cardId,
          order: index,
          column: 'right' as const,
          visible: cardId === 'approval-overview' ? canAccessApproval : true,
        })),
      ];

      await saveWelcomeLayout({
        layouts,
        updatedAt: new Date().toISOString(),
      });
      message.success('布局已保存');
    } catch (error) {
      console.warn('保存布局失败（后端 API 未实现）:', error);
    } finally {
      setIsSavingLayout(false);
    }
  }, [isSavingLayout, leftCards, rightCards, canAccessApproval]);

  // 渲染卡片
  const renderCard = (cardId: string) => {
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
      <SortableCard key={cardId} id={cardId}>
        {cardComponent}
      </SortableCard>
    );
  };

  // 过滤审批卡片
  const filteredRightCards = useMemo(() => {
    return rightCards.filter(id => {
      if (id === 'approval-overview' && !canAccessApproval) {
        return false;
      }
      return true;
    });
  }, [rightCards, canAccessApproval]);

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Row gutter={[16, 16]}>
              {/* 左侧列 */}
              <Col xs={24} lg={12}>
                <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                  <SortableContext
                    items={leftCards}
                    strategy={verticalListSortingStrategy}
                  >
                    {leftCards.map(cardId => renderCard(cardId))}
                  </SortableContext>
                </Space>
              </Col>
              {/* 右侧列 */}
              <Col xs={24} lg={12}>
                <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                  <SortableContext
                    items={filteredRightCards}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredRightCards.map(cardId => renderCard(cardId))}
                  </SortableContext>
                </Space>
              </Col>
            </Row>
          </DndContext>
        </div>
      </div>
    </PageContainer>
  );
};

export default Welcome;
