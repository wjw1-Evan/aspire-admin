/**
 * 看板大屏预览
 * 全屏展示看板，支持深色主题、自动刷新
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import { Button, Spin, Empty, Typography, Tooltip } from 'antd';
import { FullscreenExitOutlined, FullscreenOutlined, EditOutlined } from '@ant-design/icons';
import { request } from '@umijs/max';
import CardRenderer from './CardRenderer';
import type { DashboardCardDto, DashboardDto, LayoutItem } from './types';
import type { ApiResponse } from '@/types';

import 'react-grid-layout/css/styles.css';

const { Text } = Typography;

interface DashboardPreviewProps {
  dashboardId: string;
  /** 是否在独立全屏模式（隐藏顶部操作栏） */
  standalone?: boolean;
  /** 切换到设计模式 */
  onEdit?: () => void;
  /** 关闭预览 */
  onClose?: () => void;
}

const DashboardPreview: React.FC<DashboardPreviewProps> = ({ dashboardId, standalone = false, onEdit, onClose }) => {
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [cards, setCards] = useState<DashboardCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { containerRef: gridContainerRef, width: gridWidth } = useContainerWidth({ initialWidth: 1200 });

  /** 加载看板数据 */
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const res = await request<ApiResponse<DashboardDto>>(`/apiservice/api/dashboard/${dashboardId}`);
    if (res.success && res.data) {
      setDashboard(res.data);
      setCards(res.data.cards || []);
    }
    setLoading(false);
  }, [dashboardId]);

  useEffect(() => {
    if (dashboardId) loadDashboard();
  }, [dashboardId, loadDashboard]);

  /** 自动刷新（找最小的 refreshInterval） */
  useEffect(() => {
    const intervals = cards.filter(c => c.refreshInterval > 0).map(c => c.refreshInterval);
    if (intervals.length === 0) return;
    const minInterval = Math.min(...intervals) * 1000;
    const timer = setInterval(loadDashboard, Math.max(minInterval, 30000)); // 最少30秒
    return () => clearInterval(timer);
  }, [cards, loadDashboard]);

  /** 全屏切换 */
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  /** 监听 fullscreen 变化 */
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  /** 从卡片数据生成布局 */
  const layouts = React.useMemo(() => {
    const lg = cards.map((c): LayoutItem => ({
      i: c.id,
      x: c.positionX || 0,
      y: c.positionY || 0,
      w: c.width || 4,
      h: c.height || 4,
      static: true, // 预览模式不可拖拽
    }));
    return { lg };
  }, [cards]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: '#0a1628' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!dashboard) {
    return <Empty description="看板不存在" />;
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        background: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0a1628 100%)',
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {/* 浮动操作栏 */}
      {!standalone && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 1000,
          display: 'flex', gap: 8,
        }}>
          {onEdit && (
            <Tooltip title="设计模式">
              <Button
                shape="circle" icon={<EditOutlined />}
                onClick={onEdit}
                style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff' }}
              />
            </Tooltip>
          )}
          <Tooltip title={isFullscreen ? '退出全屏' : '全屏'}>
            <Button
              shape="circle"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
              style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff' }}
            />
          </Tooltip>
        </div>
      )}

      {/* 看板内容 */}
      <div ref={gridContainerRef} style={{ padding: 12 }}>
        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 100 }}>
            <Empty
              description={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>看板暂无卡片</Text>}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <ResponsiveGridLayout
            className="dashboard-preview-grid"
            width={gridWidth}
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={40}
            isDraggable={false}
            isResizable={false}
            compactType="vertical"
            margin={[12, 12]}
            containerPadding={[0, 0]}
          >
            {cards.map((card) => (
              <div key={card.id} style={{ borderRadius: 8 }}>
                <CardRenderer card={card} />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      <style>{`
        .dashboard-preview-grid .react-grid-item {
          transition: none !important;
        }
      `}</style>
    </div>
  );
};

export default React.memo(DashboardPreview);
