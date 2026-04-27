/**
 * 看板设计器
 * 基于 react-grid-layout 的可视化拖拽看板设计器
 */
import React, { useState, useCallback, useEffect } from 'react';
import { ResponsiveGridLayout as RGL, useContainerWidth } from 'react-grid-layout';
import { Button, Space, message, Tooltip, Popconfirm, Spin, Empty, Typography } from 'antd';
import {
  PlusOutlined, SaveOutlined, DeleteOutlined,
  EditOutlined, FullscreenOutlined, CopyOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import CardRenderer from './CardRenderer';
import CardConfigForm from './CardConfigForm';
import type { DashboardCardDto, DashboardDto, LayoutItem } from './types';
import type { ApiResponse } from '@/types';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const { Text } = Typography;

/** 默认卡片尺寸（按类型） */
const DEFAULT_CARD_SIZE: Record<string, { w: number; h: number }> = {
  header: { w: 12, h: 2 },
  clock: { w: 4, h: 2 },
  statusBar: { w: 12, h: 2 },
  statistic: { w: 3, h: 3 },
  gauge: { w: 3, h: 4 },
  ring: { w: 4, h: 5 },
  pieChart: { w: 4, h: 5 },
  lineChart: { w: 6, h: 5 },
  barChart: { w: 6, h: 5 },
  areaChart: { w: 6, h: 5 },
  radarChart: { w: 4, h: 5 },
  statusGrid: { w: 6, h: 6 },
  functionModule: { w: 4, h: 5 },
  alertList: { w: 6, h: 5 },
  progressBar: { w: 4, h: 2 },
  table: { w: 6, h: 5 },
  text: { w: 4, h: 3 },
  image: { w: 4, h: 4 },
};

/** API */
const api = {
  getDashboard: (id: string) => request<ApiResponse<DashboardDto>>(`/apiservice/api/dashboard/${id}`),
  addCard: (id: string, data: Record<string, unknown>) => request<ApiResponse<DashboardCardDto>>(`/apiservice/api/dashboard/${id}/cards`, { method: 'POST', data }),
  updateCard: (cardId: string, data: Record<string, unknown>) =>
    request<ApiResponse<DashboardCardDto>>(`/apiservice/api/dashboard/cards/${cardId}`, { method: 'PUT', data }),
  deleteCard: (cardId: string) =>
    request<ApiResponse<void>>(`/apiservice/api/dashboard/cards/${cardId}`, { method: 'DELETE' }),
  reorderCards: (dashboardId: string, positions: Array<{ cardId: string; positionX: number; positionY: number; width: number; height: number }>) =>
    request<ApiResponse<void>>(`/apiservice/api/dashboard/${dashboardId}/cards/reorder`, { method: 'POST', data: { cards: positions.map(p => ({ id: p.cardId, positionX: p.positionX, positionY: p.positionY, width: p.width, height: p.height })) } }),
};

interface DashboardDesignerProps {
  dashboardId: string;
  onPreview?: () => void;
  onClose?: () => void;
}

const DashboardDesigner: React.FC<DashboardDesignerProps> = ({ dashboardId, onPreview, onClose }) => {
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [cards, setCards] = useState<DashboardCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<DashboardCardDto | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { containerRef, width: containerWidth } = useContainerWidth({ initialWidth: 1200 });

  // 布局状态
  const [layouts, setLayouts] = useState<Record<string, LayoutItem[]>>({});

  /** 加载看板数据 */
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const res = await api.getDashboard(dashboardId);
    if (res.success && res.data) {
      setDashboard(res.data);
      setCards(res.data.cards || []);
      // 从卡片数据生成布局
      const lg = (res.data.cards || []).map((c: DashboardCardDto): LayoutItem => ({
        i: c.id,
        x: c.positionX || 0,
        y: c.positionY || 0,
        w: c.width || 4,
        h: c.height || 4,
        minW: 2,
        minH: 2,
      }));
      setLayouts({ lg });
    }
    setLoading(false);
  }, [dashboardId]);

  useEffect(() => {
    if (dashboardId) loadDashboard();
  }, [dashboardId, loadDashboard]);

  /** 布局变更 */
  const handleLayoutChange = useCallback((currentLayout: LayoutItem[]) => {
    setLayouts({ lg: currentLayout });
    setHasChanges(true);
  }, []);

  /** 保存布局 */
  const handleSave = useCallback(async () => {
    setSaving(true);
    const lg = layouts.lg || [];
    const positions = lg.map((item: LayoutItem) => ({
      cardId: item.i,
      positionX: item.x,
      positionY: item.y,
      width: item.w,
      height: item.h,
    }));
    const res = await api.reorderCards(dashboardId, positions);
    if (res.success) {
      message.success('布局已保存');
      setHasChanges(false);
    } else {
      message.error('保存失败');
    }
    setSaving(false);
  }, [dashboardId, layouts]);

  /** 添加/编辑卡片 */
  const handleCardFinish = useCallback(async (values: { title: string; cardType: string; styleConfig: string; dataSource: string }) => {
    if (editingCard) {
      // 更新
      const res = await api.updateCard(editingCard.id, {
        title: values.title,
        cardType: values.cardType,
        styleConfig: values.styleConfig,
        dataSource: values.dataSource,
      });
      if (res.success) {
        message.success('卡片已更新');
        setCardFormOpen(false);
        setEditingCard(null);
        await loadDashboard();
        return true;
      }
      message.error('更新失败');
      return false;
    } else {
      // 添加
      const defaultSize = DEFAULT_CARD_SIZE[values.cardType] || { w: 4, h: 4 };
      const res = await api.addCard(dashboardId, {
        title: values.title,
        cardType: values.cardType,
        styleConfig: values.styleConfig,
        dataSource: values.dataSource,
        positionX: 0,
        positionY: 0,
        width: defaultSize.w,
        height: defaultSize.h,
      });
      if (res.success) {
        message.success('卡片已添加');
        setCardFormOpen(false);
        await loadDashboard();
        return true;
      }
      message.error('添加失败');
      return false;
    }
  }, [dashboardId, editingCard, loadDashboard]);

  /** 删除卡片 */
  const handleDeleteCard = useCallback(async (cardId: string) => {
    const res = await api.deleteCard(cardId);
    if (res.success) {
      message.success('卡片已删除');
      setSelectedCardId(null);
      await loadDashboard();
    } else {
      message.error('删除失败');
    }
  }, [loadDashboard]);

  /** 复制卡片 */
  const handleCopyCard = useCallback(async (card: DashboardCardDto) => {
    const defaultSize = DEFAULT_CARD_SIZE[card.cardType] || { w: 4, h: 4 };
    const res = await api.addCard(dashboardId, {
      title: `${card.title} (副本)`,
      cardType: card.cardType,
      styleConfig: card.styleConfig,
      dataSource: card.dataSource,
      positionX: 0,
      positionY: 0,
      width: card.width || defaultSize.w,
      height: card.height || defaultSize.h,
    });
    if (res.success) {
      message.success('卡片已复制');
      await loadDashboard();
    }
  }, [dashboardId, loadDashboard]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (!dashboard) {
    return <Empty description="看板不存在" />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 工具栏 */}
      <div style={{
        padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#fafafa', flexShrink: 0,
      }}>
        <Space>
          <Text strong style={{ fontSize: 16 }}>{dashboard.name}</Text>
          {hasChanges && <Text type="warning" style={{ fontSize: 12 }}>（有未保存的布局变更）</Text>}
        </Space>
        <Space>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => { setEditingCard(null); setCardFormOpen(true); }}>
            添加卡片
          </Button>
          <Button icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={!hasChanges}>
            保存布局
          </Button>
          {onPreview && (
            <Button icon={<FullscreenOutlined />} onClick={onPreview}>
              预览
            </Button>
          )}
        </Space>
      </div>

      {/* 设计画布 */}
      <div ref={containerRef} style={{
        flex: 1, width: '100%', overflow: 'auto', padding: 16,
        background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)',
        minHeight: 500,
      }}>
        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 100 }}>
            <Empty
              description={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>暂无卡片，点击"添加卡片"开始设计</Text>}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <RGL
            className="dashboard-designer-grid"
            style={{ width: '100%' }}
            width={containerWidth || 1200}
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={40}
            onLayoutChange={(currentLayout: LayoutItem[]) => handleLayoutChange(currentLayout)}
            isDraggable
            isResizable
            compactType="vertical"
            margin={[12, 12]}
            containerPadding={[0, 0]}
          >
            {cards.map((card) => (
              <div
                key={card.id}
                style={{
                  cursor: 'move',
                  position: 'relative',
                  borderRadius: 8,
                  outline: selectedCardId === card.id ? '2px solid #1890ff' : 'none',
                  outlineOffset: 2,
                }}
                onClick={() => setSelectedCardId(card.id)}
              >
                {/* 卡片渲染 */}
                <CardRenderer card={card} designMode />

                {/* 悬浮操作栏 */}
                <div
                  className="card-toolbar"
                  style={{
                    position: 'absolute', top: 4, right: 4, display: 'none',
                    background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '2px 4px',
                    zIndex: 10,
                  }}
                >
                  <Space size={2}>
                    <Tooltip title="编辑">
                      <Button type="text" size="small" icon={<EditOutlined style={{ color: '#fff', fontSize: 13 }} />}
                        onClick={(e) => { e.stopPropagation(); setEditingCard(card); setCardFormOpen(true); }} />
                    </Tooltip>
                    <Tooltip title="复制">
                      <Button type="text" size="small" icon={<CopyOutlined style={{ color: '#fff', fontSize: 13 }} />}
                        onClick={(e) => { e.stopPropagation(); handleCopyCard(card); }} />
                    </Tooltip>
                    <Popconfirm title="确定删除此卡片？" onConfirm={() => handleDeleteCard(card.id)}
                      onPopupClick={(e) => e.stopPropagation()}>
                      <Tooltip title="删除">
                        <Button type="text" size="small" icon={<DeleteOutlined style={{ color: '#ff4d4f', fontSize: 13 }} />}
                          onClick={(e) => e.stopPropagation()} />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            ))}
          </RGL>
        )}
      </div>

      {/* 卡片配置表单 */}
      <CardConfigForm
        open={cardFormOpen}
        onOpenChange={(open) => { if (!open) { setCardFormOpen(false); setEditingCard(null); } else { setCardFormOpen(true); } }}
        editingCard={editingCard}
        onFinish={handleCardFinish}
      />

      {/* CSS: 悬浮操作栏在hover时显示 */}
      <style>{`
        .dashboard-designer-grid .react-grid-item:hover .card-toolbar {
          display: flex !important;
        }
        .dashboard-designer-grid .react-grid-item > .react-resizable-handle::after {
          border-color: rgba(255,255,255,0.3) !important;
        }
        .react-grid-placeholder {
          background: rgba(0, 212, 255, 0.15) !important;
          border: 2px dashed rgba(0, 212, 255, 0.4) !important;
          border-radius: 8px !important;
        }
      `}</style>
    </div>
  );
};

export default React.memo(DashboardDesigner);
