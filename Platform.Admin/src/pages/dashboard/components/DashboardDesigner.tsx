/**
 * 看板设计器
 * 基于 Ant Design Splitter 的可视化拖拽看板设计器
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Splitter } from 'antd';
import { Button, Space, message, Tooltip, Popconfirm, Spin, Empty, Typography, Select } from 'antd';
import {
  PlusOutlined, SaveOutlined, DeleteOutlined,
  EditOutlined, FullscreenOutlined, CopyOutlined, HolderOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import CardRenderer from './CardRenderer';
import CardConfigForm from './CardConfigForm';
import type { DashboardCardDto, DashboardDto } from './types';
import type { ApiResponse } from '@/types';

const { Text } = Typography;

/** 默认卡片尺寸 */
const DEFAULT_CARD_SIZE: Record<string, { w: number; h: number }> = {
  header: { w: 12, h: 2 },
  clock: { w: 4, h: 2 },
  statusBar: { w: 12, h: 2 },
  statistic: { w: 3, h: 3 },
  gauge: { w: 3, h: 4 },
  ring: { w: 4, h: 5 },
  lineChart: { w: 6, h: 4 },
  barChart: { w: 6, h: 4 },
  areaChart: { w: 6, h: 4 },
  pieChart: { w: 4, h: 5 },
  radarChart: { w: 5, h: 5 },
  statusGrid: { w: 6, h: 4 },
  functionModule: { w: 6, h: 4 },
  alertList: { w: 6, h: 5 },
  progressBar: { w: 4, h: 2 },
  text: { w: 4, h: 3 },
  image: { w: 4, h: 4 },
  table: { w: 8, h: 5 },
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

/** 列数据结构 */
interface Column {
  id: string;
  cardIds: string[];
}

/** 卡片在列中的位置 */
interface CardPosition {
  cardId: string;
  columnId: string;
  order: number;
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
  const [columns, setColumns] = useState<Column[]>([{ id: 'col-1', cardIds: [] }]);
  const [columnSizes, setColumnSizes] = useState<string>('100%');

  /** 加载看板数据 */
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const res = await api.getDashboard(dashboardId);
    if (res.success && res.data) {
      setDashboard(res.data);
      setCards(res.data.cards || []);
    }
    setLoading(false);
  }, [dashboardId]);

  useEffect(() => {
    if (dashboardId) loadDashboard();
  }, [dashboardId, loadDashboard]);

  /** 保存布局 */
  const handleSave = useCallback(async () => {
    setSaving(true);
    const positions: { cardId: string; positionX: number; positionY: number; width: number; height: number }[] = [];
    columns.forEach((col, colIndex) => {
      col.cardIds.forEach((cardId, cardIndex) => {
        const card = cards.find(c => c.id === cardId);
        if (card) {
          positions.push({
            cardId,
            positionX: colIndex,
            positionY: cardIndex,
            width: card.width || 4,
            height: card.height || 4,
          });
        }
      });
    });
    const res = await api.reorderCards(dashboardId, positions);
    if (res.success) {
      message.success('布局已保存');
      setHasChanges(false);
    } else {
      message.error('保存失败');
    }
    setSaving(false);
  }, [dashboardId, columns, cards]);

  /** 添加/编辑卡片 */
  const handleCardFinish = useCallback(async (values: { title: string; cardType: string; styleConfig: string; dataSource: string }) => {
    if (editingCard) {
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

  /** 添加新列 */
  const handleAddColumn = useCallback(() => {
    setColumns(prev => [...prev, { id: `col-${Date.now()}`, cardIds: [] }]);
    setHasChanges(true);
  }, []);

  /** 删除列 */
  const handleDeleteColumn = useCallback((columnId: string) => {
    if (columns.length <= 1) {
      message.warning('至少保留一列');
      return;
    }
    setColumns(prev => prev.filter(col => col.id !== columnId));
    setHasChanges(true);
  }, [columns]);

  /** 将卡片移动到指定列 */
  const handleMoveCardToColumn = useCallback((cardId: string, targetColumnId: string) => {
    setColumns(prev => prev.map(col => {
      if (col.id === targetColumnId) {
        if (col.cardIds.includes(cardId)) return col;
        return { ...col, cardIds: [...col.cardIds, cardId] };
      }
      return { ...col, cardIds: col.cardIds.filter(id => id !== cardId) };
    }));
    setHasChanges(true);
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  if (!dashboard) {
    return <Empty description="看板不存在" />;
  }

  /** 根据布局类型生成 Splitter 尺寸 */
  const getSplitterSizes = () => {
    const count = columns.length;
    if (count === 1) return '100%';
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    return columns.map((_, i) => i === 0 ? `${base + remainder}%` : `${base}%`).join(' ');
  };

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
          <Button icon={<PlusOutlined />} onClick={handleAddColumn}>添加列</Button>
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

      {/* 画布 - Splitter 多列布局 */}
      <div style={{
        flex: 1, overflow: 'hidden', background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)',
      }}>
        {cards.length === 0 && columns.every(c => c.cardIds.length === 0) ? (
          <div style={{ textAlign: 'center', paddingTop: 100 }}>
            <Empty
              description={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>暂无卡片，点击"添加卡片"开始设计</Text>}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <Splitter>
            {columns.map((col, index) => (
              <Splitter.Panel key={col.id} min={20}>
                <div style={{
                  height: '100%', padding: 16, overflowY: 'auto',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 12, color: '#e0e6f1',
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: 500 }}>列 {index + 1}</Text>
                    <Space size={4}>
                      {columns.length > 1 && (
                        <Button type="text" size="small" danger icon={<DeleteOutlined />}
                          onClick={() => handleDeleteColumn(col.id)} />
                      )}
                    </Space>
                  </div>

                  {/* 列中的卡片 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {col.cardIds.map(cardId => {
                      const card = cards.find(c => c.id === cardId);
                      if (!card) return null;
                      return (
                        <div
                          key={card.id}
                          style={{
                            cursor: 'move', position: 'relative', borderRadius: 8,
                            outline: selectedCardId === card.id ? '2px solid #1890ff' : 'none',
                            outlineOffset: 2,
                          }}
                          onClick={() => setSelectedCardId(card.id)}
                        >
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

                          {/* 移动到其他列的下拉 */}
                          <div
                            style={{
                              position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
                              display: 'none', background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '2px 8px',
                              zIndex: 10,
                            }}
                            className="column-selector"
                          >
                            <Select
                              size="small"
                              placeholder="移动到"
                              style={{ width: 100 }}
                              options={columns
                                .filter(c => c.id !== col.id)
                                .map((c, i) => ({ label: `列 ${columns.findIndex(x => x.id === c.id) + 1}`, value: c.id }))}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(value) => {
                                handleMoveCardToColumn(card.id, value);
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Splitter.Panel>
            ))}
          </Splitter>
        )}
      </div>

      {/* 卡片配置表单 */}
      <CardConfigForm
        open={cardFormOpen}
        onOpenChange={(open) => { if (!open) { setCardFormOpen(false); setEditingCard(null); } else { setCardFormOpen(true); } }}
        editingCard={editingCard}
        onFinish={handleCardFinish}
      />

      {/* CSS: 悬浮操作栏和列选择器在hover时显示 */}
      <style>{`
        .dashboard-designer-grid .react-grid-item:hover .card-toolbar,
        .card-toolbar:hover,
        .column-selector:hover {
          display: flex !important;
        }
        .column-selector {
          display: none !important;
        }
        .card-toolbar {
          display: none !important;
        }
        div:hover > .column-selector {
          display: flex !important;
        }
      `}</style>
    </div>
  );
};

export default React.memo(DashboardDesigner);