import { PageContainer } from '@/components';
import { useModel, useAccess } from '@umijs/max';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { theme, Row, Col, message as antMessage } from 'antd';
import { useMessage } from 'antd/es/message/useMessage';
import { getUserStatistics } from '@/services/ant-design-pro/api';
import { getTaskStatistics, getMyTodoTasks } from '@/services/task/api';
import { getCurrentCompany } from '@/services/company';
import { getSystemResources } from '@/services/system/api';
import type { SystemResources } from '@/services/system/api';
import { getDocumentStatistics, getPendingDocuments } from '@/services/document/api';
import { saveWelcomeLayout, getWelcomeLayout } from '@/services/welcome/layout';
import type { CardLayoutConfig } from '@/services/welcome/layout';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  Over,
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
    isOver,
  } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    backgroundColor: isOver ? 'rgba(24, 144, 255, 0.05)' : 'transparent',
    borderRadius: '8px',
    padding: isOver ? '8px' : '0px',
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
  const { token } = theme.useToken();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser as API.CurrentUser;
  const [messageApi, contextHolder] = antMessage.useMessage();

  const [statistics, setStatistics] = useState<any>(null);
  const [taskStatistics, setTaskStatistics] = useState<import('@/services/task/api').TaskStatistics | null>(null);
  const [todoTasks, setTodoTasks] = useState<import('@/services/task/api').TaskDto[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [systemResources, setSystemResources] = useState<SystemResources | null>(null);
  const [loading, setLoading] = useState(true);

  const [docStatistics, setDocStatistics] = useState<import('@/services/document/api').DocumentStatistics | null>(null);
  const [pendingDocs, setPendingDocs] = useState<import('@/services/document/api').Document[]>([]);

  const access = useAccess();
  const canAccessApproval = access.canAccessPath('/document/approval');

  const [cpuHistory, setCpuHistory] = useState<{ value: number; time: string }[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<{ value: number; time: string }[]>([]);
  const [diskHistory, setDiskHistory] = useState<{ value: number; time: string }[]>([]);

  const [leftCards, setLeftCards] = useState<string[]>(['task-overview', 'project-list', 'statistics-overview']);
  const [rightCards, setRightCards] = useState<string[]>(['approval-overview', 'iot-events', 'system-resources']);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, companyRes, taskStatsRes, todoTasksRes] = await Promise.all([
        getUserStatistics(),
        getCurrentCompany(),
        getTaskStatistics(),
        getMyTodoTasks()
      ]);

      if (statsRes?.data) setStatistics(statsRes.data);
      if (companyRes?.data) setCompanyInfo(companyRes.data);
      if (taskStatsRes?.data) setTaskStatistics(taskStatsRes.data);
      if (todoTasksRes?.data) setTodoTasks(todoTasksRes.data);

      try {
        const [docStatsRes, pendingDocsRes] = await Promise.all([
          getDocumentStatistics(),
          getPendingDocuments({ page: 1, pageSize: 5 })
        ]);

        if (docStatsRes?.success && docStatsRes.data) setDocStatistics(docStatsRes.data);
        if (pendingDocsRes?.success && pendingDocsRes.data?.list) setPendingDocs(pendingDocsRes.data.list);
      } catch (docError) {
        console.warn('获取审批统计失败', docError);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSystemResources = useCallback(async () => {
    try {
      const res = await getSystemResources();
      if (res?.data) {
        const data = res.data;
        setSystemResources(data);
        const time = new Date().toLocaleTimeString();

        if (data.cpu) {
          setCpuHistory(prev => [...prev, { value: data.cpu?.usagePercent || 0, time }].slice(-20));
        }
        if (data.memory) {
          setMemoryHistory(prev => [...prev, { value: data.memory?.usagePercent || 0, time }].slice(-20));
        }
        if (data.disk) {
          setDiskHistory(prev => [...prev, { value: data.disk?.usagePercent || 0, time }].slice(-20));
        }
      }
    } catch (error) {
      console.error('获取系统资源失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // 加载保存的欢迎页面布局配置
  useEffect(() => {
    const loadWelcomeLayout = async () => {
      try {
        const res = await getWelcomeLayout();
        if (res?.data?.layouts && res.data.layouts.length > 0) {
          const leftCardsList: string[] = [];
          const rightCardsList: string[] = [];

          res.data.layouts.forEach((layout: CardLayoutConfig) => {
            if (layout.visible) {
              if (layout.column === 'left') {
                leftCardsList[layout.order] = layout.cardId;
              } else if (layout.column === 'right') {
                rightCardsList[layout.order] = layout.cardId;
              }
            }
          });

          // 过滤掉 undefined 值
          const filteredLeftCards = leftCardsList.filter(Boolean);
          const filteredRightCards = rightCardsList.filter(Boolean);

          if (filteredLeftCards.length > 0) {
            setLeftCards(filteredLeftCards);
          }
          if (filteredRightCards.length > 0) {
            setRightCards(filteredRightCards);
          }
        }
      } catch (error) {
        console.warn('加载欢迎页面布局失败:', error);
      }
    };

    loadWelcomeLayout();
  }, []);

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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeInLeft = leftCards.includes(activeId);
    const overInLeft = leftCards.includes(overId);

    let newLeftCards = leftCards;
    let newRightCards = rightCards;

    if (activeInLeft === overInLeft) {
      if (activeInLeft) {
        const oldIndex = leftCards.indexOf(activeId);
        const newIndex = leftCards.indexOf(overId);
        newLeftCards = arrayMove(leftCards, oldIndex, newIndex);
      } else {
        const oldIndex = rightCards.indexOf(activeId);
        const newIndex = rightCards.indexOf(overId);
        newRightCards = arrayMove(rightCards, oldIndex, newIndex);
      }
    } else {
      if (activeInLeft) {
        const newIndex = rightCards.indexOf(overId);
        newLeftCards = leftCards.filter(id => id !== activeId);
        newRightCards = [
          ...rightCards.slice(0, newIndex),
          activeId,
          ...rightCards.slice(newIndex),
        ];
      } else {
        const newIndex = leftCards.indexOf(overId);
        newRightCards = rightCards.filter(id => id !== activeId);
        newLeftCards = [
          ...leftCards.slice(0, newIndex),
          activeId,
          ...leftCards.slice(newIndex),
        ];
      }
    }

    setLeftCards(newLeftCards);
    setRightCards(newRightCards);

    // 保存布局到后端
    (async () => {
      if (isSavingLayout) return;
      setIsSavingLayout(true);
      try {
        const layouts: CardLayoutConfig[] = [
          ...newLeftCards.map((cardId, index) => ({
            cardId,
            order: index,
            column: 'left' as const,
            visible: true,
          })),
          ...newRightCards.map((cardId, index) => ({
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
        messageApi.success('布局已保存');
      } catch (error) {
        console.warn('保存布局失败:', error);
      } finally {
        setIsSavingLayout(false);
      }
    })();
  }, [leftCards, rightCards, isSavingLayout, canAccessApproval, messageApi]);

  const handleDragStart = useCallback((event: any) => {
    setActiveId(event.active.id);
  }, []);

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
      {contextHolder}
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
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={[...leftCards, ...filteredRightCards]}
              strategy={verticalListSortingStrategy}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {leftCards.map(cardId => renderCard(cardId))}
                  </div>
                </Col>
                <Col xs={24} lg={12}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredRightCards.map(cardId => renderCard(cardId))}
                  </div>
                </Col>
              </Row>
            </SortableContext>
            <DragOverlay>
              {activeId ? (
                <div style={{
                  opacity: 0.7,
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                  padding: '16px',
                  minHeight: '100px',
                  minWidth: '300px',
                }}>
                  拖动中...
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </PageContainer>
  );
};

export default Welcome;
