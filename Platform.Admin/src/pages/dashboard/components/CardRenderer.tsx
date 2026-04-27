/**
 * 卡片渲染器
 * 根据 cardType 和 styleConfig 渲染不同类型的可视化组件，支持动态数据获取
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Typography, Tag, Space, Badge, Progress, Spin } from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined,
  CheckCircleFilled, WarningFilled, CloseCircleFilled, MinusCircleFilled,
  ThunderboltOutlined, VideoCameraOutlined, CarOutlined, AlertOutlined,
  MonitorOutlined, BulbOutlined, BankOutlined, SoundOutlined,
  IdcardOutlined, CoffeeOutlined, SettingOutlined,
} from '@ant-design/icons';
import { request } from '@umijs/max';
import type { DashboardCardDto, StyleConfig } from './types';
import type { ApiResponse } from '@/types';

const { Text, Title } = Typography;

interface CardRendererProps {
  card: DashboardCardDto;
  /** 是否为设计模式（缩小比例） */
  designMode?: boolean;
  /** 容器宽高 */
  width?: number;
  height?: number;
}

/** 数据源配置 */
interface DataSourceConfig {
  module?: string;
  apiPath?: string;
  dataField?: string;
  aggregation?: string;
  groupBy?: string;
  timeRange?: string;
  filters?: Record<string, unknown>;
  static?: boolean;
  staticData?: unknown;
  refreshInterval?: number;
}

/** 解析 styleConfig JSON */
const parseStyleConfig = (config: string): StyleConfig => {
  if (!config) return {};
  try { return JSON.parse(config); } catch { return {}; }
};

/** 解析 dataSource JSON */
const parseDataSource = (config: string): DataSourceConfig => {
  if (!config) return { static: true };
  try { return JSON.parse(config); } catch { return { static: true }; }
};

/** 数据获取 API 映射 */
const MODULE_API_MAP: Record<string, { path: string; method: string }> = {
  task: { path: '/apiservice/api/task/statistics', method: 'GET' },
  user: { path: '/apiservice/api/users/me/statistics', method: 'GET' },
  storage: { path: '/apiservice/api/cloud-storage/statistics', method: 'GET' },
  park: { path: '/apiservice/api/park-management/statistics', method: 'GET' },
  workflow: { path: '/apiservice/api/workflow/statistics', method: 'GET' },
  iot: { path: '/apiservice/api/iot/statistics', method: 'GET' },
  visit: { path: '/apiservice/api/park-management/visit/statistics', method: 'GET' },
  document: { path: '/apiservice/api/documents/statistics', method: 'GET' },
};

/** 获取数据 */
const fetchCardData = async (dataSource: DataSourceConfig): Promise<unknown> => {
  if (dataSource.static) {
    return dataSource.staticData ?? 0;
  }

  const moduleInfo = MODULE_API_MAP[dataSource.module || ''];
  if (!moduleInfo) {
    return 0;
  }

  try {
    const apiPath = dataSource.apiPath || moduleInfo.path;
    const params: Record<string, unknown> = {};

    if (dataSource.timeRange) {
      params.timeRange = dataSource.timeRange;
    }
    if (dataSource.filters) {
      Object.assign(params, dataSource.filters);
    }

    const res = await request<ApiResponse<Record<string, unknown>>>(apiPath, {
      method: moduleInfo.method,
      params: Object.keys(params).length > 0 ? params : undefined,
    });

    if (res.success && res.data) {
      // 提取指定字段
      if (dataSource.dataField) {
        const fieldValue = dataSource.dataField.split('.').reduce((obj, key) => {
          return obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined;
        }, res.data as unknown);
        return fieldValue ?? 0;
      }
      return res.data;
    }
    return 0;
  } catch (error) {
    console.error('[CardRenderer] 数据获取失败:', error);
    return 0;
  }
};

/** 状态颜色映射 */
const STATUS_COLORS: Record<string, string> = {
  normal: '#52c41a', online: '#52c41a',
  busy: '#faad14', warning: '#faad14',
  urgent: '#ff4d4f', error: '#ff4d4f', critical: '#ff4d4f',
  offline: '#8c8c8c',
};

/** 状态文本映射 */
const STATUS_TEXT: Record<string, string> = {
  normal: '正常', online: '在线', busy: '繁忙',
  warning: '警告', urgent: '紧急', error: '错误',
  critical: '严重', offline: '离线',
};

/** 图标映射 */
const ICON_MAP: Record<string, React.ReactNode> = {
  thunder: <ThunderboltOutlined />,
  video: <VideoCameraOutlined />,
  car: <CarOutlined />,
  alert: <AlertOutlined />,
  monitor: <MonitorOutlined />,
  bulb: <BulbOutlined />,
  bank: <BankOutlined />,
  sound: <SoundOutlined />,
  idcard: <IdcardOutlined />,
  coffee: <CoffeeOutlined />,
  setting: <SettingOutlined />,
};

/** 深色主题基础色 */
const DARK_THEME = {
  bg: 'transparent',
  text: '#e0e6f1',
  subText: '#8b95a8',
  border: 'rgba(255,255,255,0.08)',
  cardBg: 'rgba(14, 30, 60, 0.6)',
  axisLine: 'rgba(255,255,255,0.1)',
  splitLine: 'rgba(255,255,255,0.05)',
};

/** 通用图表基础选项 */
const getBaseChartOption = () => ({
  backgroundColor: 'transparent',
  textStyle: { color: DARK_THEME.text, fontFamily: 'inherit' },
  grid: { top: 40, right: 20, bottom: 30, left: 50, containLabel: false },
});

// ─── 各类型渲染器 ──────────────────────────────────────

/** 统计指标卡 */
const StatisticCard: React.FC<{ style: StyleConfig; value?: unknown }> = ({ style, value }) => {
  const {
    prefix = '', suffix = '', valueColor = '#00d4ff', valueSize = 36,
    icon, iconColor = '#00d4ff', trend, trendValue, trendColor,
    description = '', textColor = DARK_THEME.subText,
  } = style;
  const displayValue = value !== undefined ? value : style.centerValue;
  const formattedValue = typeof displayValue === 'number'
    ? displayValue.toLocaleString()
    : (displayValue != null ? String(displayValue) : '0');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '8px 4px' }}>
      {icon && (
        <div style={{ marginBottom: 6 }}>
          <span style={{ color: iconColor, fontSize: 18 }}>{ICON_MAP[icon] || icon}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
        {prefix && <Text style={{ color: valueColor, fontSize: valueSize * 0.6 }}>{prefix}</Text>}
        <span style={{ color: valueColor, fontSize: valueSize, fontWeight: 700, lineHeight: 1.1, fontFamily: "'DIN Alternate', 'Roboto Mono', monospace" }}>
          {formattedValue}
        </span>
        {suffix && <Text style={{ color: textColor, fontSize: 13 }}>{suffix}</Text>}
        {trend && trend !== 'none' && (
          <span style={{ color: trendColor || (trend === 'up' ? '#52c41a' : '#ff4d4f'), fontSize: 13, marginLeft: 4 }}>
            {trend === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {trendValue}
          </span>
        )}
      </div>
      {description && <Text style={{ color: textColor, fontSize: 12, marginTop: 4 }}>{description}</Text>}
    </div>
  );
};

/** 仪表盘 */
const GaugeChart: React.FC<{ style: StyleConfig; width?: number; height?: number }> = ({ style, width, height }) => {
  const {
    min = 0, max = 100, unit = '', splitNumber = 5,
    colorStops = [
      { offset: 0.3, color: '#52c41a' },
      { offset: 0.7, color: '#faad14' },
      { offset: 1, color: '#ff4d4f' },
    ],
    gaugeStyle = 'default',
  } = style;
  const value = parseFloat(style.centerValue || '50');

  const option: Record<string, unknown> = {
    ...getBaseChartOption(),
    series: [{
      type: 'gauge',
      min, max, splitNumber,
      radius: '90%',
      center: ['50%', '55%'],
      startAngle: 220, endAngle: -40,
      axisLine: {
        lineStyle: {
          width: gaugeStyle === 'simple' ? 10 : 18,
          color: colorStops.map((c: { offset: number; color: string }) => [c.offset, c.color]),
        },
      },
      pointer: {
        length: '60%', width: 4,
        itemStyle: { color: '#00d4ff' },
      },
      axisTick: { show: false },
      splitLine: { length: 10, lineStyle: { color: 'rgba(255,255,255,0.3)', width: 1 } },
      axisLabel: { distance: 15, color: DARK_THEME.subText, fontSize: 10 },
      detail: {
        valueAnimation: true,
        formatter: `{value}${unit}`,
        color: '#fff', fontSize: 18, fontWeight: 700,
        offsetCenter: [0, '70%'],
      },
      data: [{ value }],
    }],
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ width: width || undefined, height: height || undefined, renderer: 'svg' }} />;
};

/** 环形图 */
const RingChart: React.FC<{ style: StyleConfig; width?: number; height?: number }> = ({ style, width, height }) => {
  const {
    pieData = [], innerRadius = '55%', outerRadius = '75%',
    centerText = '', centerValue = '', showLegend = true, legendPosition = 'right',
  } = style;

  const defaultColors = ['#00d4ff', '#36cbcb', '#4ecb73', '#fbd437', '#f2637b', '#975fe4'];

  const option: Record<string, unknown> = {
    ...getBaseChartOption(),
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: showLegend ? {
      orient: legendPosition === 'right' || legendPosition === 'left' ? 'vertical' : 'horizontal',
      [legendPosition]: 10,
      top: 'center',
      textStyle: { color: DARK_THEME.text, fontSize: 11 },
      icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 8,
    } : undefined,
    series: [{
      type: 'pie',
      radius: [innerRadius, outerRadius],
      center: showLegend && (legendPosition === 'right') ? ['35%', '50%'] : ['50%', '50%'],
      avoidLabelOverlap: false,
      label: { show: false },
      emphasis: { label: { show: false } },
      data: pieData.map((d: { name: string; value: number; color?: string }, i: number) => ({
        name: d.name, value: d.value,
        itemStyle: { color: d.color || defaultColors[i % defaultColors.length] },
      })),
    }],
    graphic: (centerText || centerValue) ? [{
      type: 'group', left: 'center', top: 'center',
      children: [
        { type: 'text', style: { text: centerValue, fill: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center', x: showLegend && legendPosition === 'right' ? -60 : 0 } },
        { type: 'text', style: { text: centerText, fill: DARK_THEME.subText, fontSize: 11, textAlign: 'center', x: showLegend && legendPosition === 'right' ? -60 : 0, y: 22 } },
      ],
    }] : undefined,
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ width: width || undefined, height: height || undefined, renderer: 'svg' }} />;
};

/** 折线图/面积图 */
const LineAreaChart: React.FC<{ style: StyleConfig; isArea?: boolean; width?: number; height?: number }> = ({ style, isArea = false, width, height }) => {
  const {
    xAxisData = [], seriesData = [], showLegend = true, smooth = true,
    gridTop = 40, gridBottom = 30,
  } = style;
  const defaultColors = ['#00d4ff', '#36cbcb', '#4ecb73', '#fbd437', '#f2637b'];

  const option: Record<string, unknown> = {
    ...getBaseChartOption(),
    grid: { top: gridTop, right: 20, bottom: gridBottom, left: 50, containLabel: false },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.7)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff', fontSize: 12 } },
    legend: showLegend ? {
      top: 5, right: 10,
      textStyle: { color: DARK_THEME.text, fontSize: 11 },
      icon: 'line', itemWidth: 16, itemHeight: 2,
    } : undefined,
    xAxis: {
      type: 'category', data: xAxisData, boundaryGap: false,
      axisLine: { lineStyle: { color: DARK_THEME.axisLine } },
      axisLabel: { color: DARK_THEME.subText, fontSize: 10 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: DARK_THEME.subText, fontSize: 10 },
      splitLine: { lineStyle: { color: DARK_THEME.splitLine } },
    },
    series: seriesData.map((s: { name: string; data: number[]; color?: string }, i: number) => ({
      name: s.name, type: 'line', data: s.data, smooth,
      symbol: 'circle', symbolSize: 4,
      lineStyle: { color: s.color || defaultColors[i % defaultColors.length], width: 2 },
      itemStyle: { color: s.color || defaultColors[i % defaultColors.length] },
      areaStyle: isArea ? {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: (s.color || defaultColors[i % defaultColors.length]) + '40' },
            { offset: 1, color: (s.color || defaultColors[i % defaultColors.length]) + '05' },
          ],
        },
      } : undefined,
    })),
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ width: width || undefined, height: height || undefined, renderer: 'svg' }} />;
};

/** 柱状图 */
const BarChart: React.FC<{ style: StyleConfig; width?: number; height?: number }> = ({ style, width, height }) => {
  const {
    xAxisData = [], seriesData = [], showLegend = true,
    gridTop = 40, gridBottom = 30,
  } = style;
  const defaultColors = ['#00d4ff', '#36cbcb', '#4ecb73', '#fbd437', '#f2637b'];

  const option: Record<string, unknown> = {
    ...getBaseChartOption(),
    grid: { top: gridTop, right: 20, bottom: gridBottom, left: 50, containLabel: false },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.7)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff', fontSize: 12 } },
    legend: showLegend ? {
      top: 5, right: 10,
      textStyle: { color: DARK_THEME.text, fontSize: 11 },
      icon: 'rect', itemWidth: 10, itemHeight: 10,
    } : undefined,
    xAxis: {
      type: 'category', data: xAxisData,
      axisLine: { lineStyle: { color: DARK_THEME.axisLine } },
      axisLabel: { color: DARK_THEME.subText, fontSize: 10 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: DARK_THEME.subText, fontSize: 10 },
      splitLine: { lineStyle: { color: DARK_THEME.splitLine } },
    },
    series: seriesData.map((s: { name: string; data: number[]; color?: string }, i: number) => ({
      name: s.name, type: 'bar', data: s.data, barWidth: '40%',
      itemStyle: {
        color: s.color || defaultColors[i % defaultColors.length],
        borderRadius: [3, 3, 0, 0],
      },
    })),
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ width: width || undefined, height: height || undefined, renderer: 'svg' }} />;
};

/** 状态网格（科室状态等） */
const StatusGrid: React.FC<{ style: StyleConfig }> = ({ style }) => {
  const { items = [], columns = 2 } = style;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 8, height: '100%', overflow: 'auto', padding: '4px 0',
    }}>
      {items.map((item: { name: string; status: string; statusText?: string; data?: Record<string, string | number> }, idx: number) => (
        <div key={idx} style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px',
          border: `1px solid ${STATUS_COLORS[item.status] || DARK_THEME.border}20`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ color: '#00d4ff', fontSize: 13, fontWeight: 500 }}>{item.name}</Text>
          </div>
          {item.data && Object.entries(item.data).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: DARK_THEME.subText, marginTop: 2 }}>
              <span>{k}</span><span style={{ color: DARK_THEME.text }}>{v}</span>
            </div>
          ))}
          <Tag color={STATUS_COLORS[item.status]} style={{ marginTop: 4, borderRadius: 4, fontSize: 11, lineHeight: '18px' }}>
            {item.statusText || STATUS_TEXT[item.status] || item.status}
          </Tag>
        </div>
      ))}
    </div>
  );
};

/** 功能模块网格 */
const FunctionModuleGrid: React.FC<{ style: StyleConfig }> = ({ style }) => {
  const { modules = [], columns = 2 } = style;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: 8, height: '100%', overflow: 'auto', padding: '4px 0',
    }}>
      {modules.map((mod: { name: string; icon?: string; status: string; statusText?: string; description?: string; stats?: string }, idx: number) => (
        <div key={idx} style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: 22, color: STATUS_COLORS[mod.status] || '#00d4ff' }}>
            {mod.icon ? (ICON_MAP[mod.icon] || mod.icon) : <SettingOutlined />}
          </span>
          <Text style={{ color: DARK_THEME.text, fontSize: 12, fontWeight: 500 }}>{mod.name}</Text>
          <Space size={2}>
            <Badge status={mod.status === 'online' ? 'success' : mod.status === 'warning' ? 'warning' : 'default'} />
            <Text style={{ color: STATUS_COLORS[mod.status] || DARK_THEME.subText, fontSize: 10 }}>
              {mod.statusText || STATUS_TEXT[mod.status] || mod.status}
            </Text>
          </Space>
          {mod.description && <Text style={{ color: DARK_THEME.subText, fontSize: 10, textAlign: 'center' }}>{mod.description}</Text>}
          {mod.stats && <Text style={{ color: DARK_THEME.subText, fontSize: 10 }}>{mod.stats}</Text>}
        </div>
      ))}
    </div>
  );
};

/** 告警列表 */
const AlertList: React.FC<{ style: StyleConfig }> = ({ style }) => {
  const { alerts = [] } = style;
  const levelColors: Record<string, string> = {
    info: '#1890ff', warning: '#faad14', error: '#ff4d4f', critical: '#ff0000',
  };
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '4px 0' }}>
      {alerts.map((alert: { time: string; level: string; message: string }, idx: number) => (
        <div key={idx} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
          borderBottom: `1px solid ${DARK_THEME.border}`,
        }}>
          <Tag color={levelColors[alert.level]} style={{ minWidth: 50, textAlign: 'center', borderRadius: 4, fontSize: 12, lineHeight: '22px' }}>
            {alert.time}
          </Tag>
          <Text style={{ color: DARK_THEME.text, fontSize: 13, flex: 1 }}>{alert.message}</Text>
        </div>
      ))}
    </div>
  );
};

/** 进度条卡片 */
const ProgressBarCard: React.FC<{ style: StyleConfig }> = ({ style }) => {
  const { progress = 0, progressColor = '#00d4ff', showPercent = true, description = '' } = style;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '8px 4px' }}>
      <Progress
        percent={progress}
        strokeColor={progressColor}
        trailColor="rgba(255,255,255,0.08)"
        showInfo={showPercent}
        format={(p) => <span style={{ color: '#fff', fontSize: 14 }}>{p}%</span>}
      />
      {description && <Text style={{ color: DARK_THEME.subText, fontSize: 12, marginTop: 4 }}>{description}</Text>}
    </div>
  );
};

/** 表格卡片 */
const TableCard: React.FC<{ style: StyleConfig }> = ({ style }) => {
  const { tableColumns = [], tableData = [] } = style;
  return (
    <div style={{ height: '100%', overflow: 'auto', fontSize: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${DARK_THEME.border}` }}>
            {tableColumns.map((col: { title: string; dataIndex: string; width?: number }, i: number) => (
              <th key={i} style={{ color: DARK_THEME.subText, padding: '6px 8px', textAlign: 'left', fontWeight: 500, width: col.width }}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row: Record<string, unknown>, ri: number) => (
            <tr key={ri} style={{ borderBottom: `1px solid ${DARK_THEME.border}` }}>
              {tableColumns.map((col: { title: string; dataIndex: string }, ci: number) => (
                <td key={ci} style={{ color: DARK_THEME.text, padding: '6px 8px' }}>
                  {String(row[col.dataIndex] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/** 看板标题头 */
const HeaderCard: React.FC<{ style: StyleConfig }> = ({ style }) => {
  const {
    headerTitle = '数据看板', headerIcon = '',
    textColor = '#fff', fontSize = 22,
  } = style;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: '100%', padding: '0 16px',
    }}>
      <Space size={12}>
        {headerIcon && <span style={{ fontSize: 24, color: '#00d4ff' }}>{ICON_MAP[headerIcon] || headerIcon}</span>}
        <Title level={4} style={{ color: textColor, fontSize, margin: 0, fontWeight: 700 }}>
          {headerTitle}
        </Title>
      </Space>
    </div>
  );
};

/** 时钟 */
const ClockCard: React.FC<{ style: StyleConfig }> = ({ style }) => {
  const { textColor = '#fff', fontSize = 18 } = style;
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${now.toLocaleTimeString('zh-CN', { hour12: false })} ${weekDays[now.getDay()]}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '100%', padding: '0 16px' }}>
      <Text style={{ color: textColor, fontSize, fontFamily: "'DIN Alternate', 'Roboto Mono', monospace" }}>{dateStr}</Text>
    </div>
  );
};

/** 底部状态栏 */
const StatusBarCard: React.FC<{ style: StyleConfig }> = ({ style }) => {
  const { statusItems = [] } = style;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 32,
    }}>
      {statusItems.map((item: { icon?: string; text: string; color?: string }, idx: number) => (
        <Space key={idx} size={6}>
          {item.icon === 'success' ? <CheckCircleFilled style={{ color: item.color || '#52c41a' }} /> :
           item.icon === 'warning' ? <WarningFilled style={{ color: item.color || '#faad14' }} /> :
           item.icon === 'error' ? <CloseCircleFilled style={{ color: item.color || '#ff4d4f' }} /> :
           <MinusCircleFilled style={{ color: item.color || '#1890ff' }} />}
          <Text style={{ color: DARK_THEME.text, fontSize: 12 }}>{item.text}</Text>
        </Space>
      ))}
    </div>
  );
};

/** 文本卡片 */
const TextCard: React.FC<{ style: StyleConfig }> = ({ style }) => {
  const { content = '', textColor = DARK_THEME.text, fontSize = 14, textAlign = 'left' } = style;
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px 4px' }}>
      <div style={{ color: textColor, fontSize, textAlign, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{content}</div>
    </div>
  );
};

/** 图片卡片 */
const ImageCard: React.FC<{ style: StyleConfig }> = ({ style }) => {
  const { imageUrl = '', imageFit = 'cover' } = style;
  if (!imageUrl) return <div style={{ color: DARK_THEME.subText, textAlign: 'center', paddingTop: 20 }}>请配置图片地址</div>;
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: imageFit }} />
    </div>
  );
};

/** 雷达图 */
const RadarChart: React.FC<{ style: StyleConfig; width?: number; height?: number }> = ({ style, width, height }) => {
  const { legendData = [], seriesData = [] } = style;

  const option: Record<string, unknown> = {
    ...getBaseChartOption(),
    radar: {
      indicator: legendData.map((name: string) => ({ name, max: 100 })),
      axisName: { color: DARK_THEME.subText, fontSize: 11 },
      splitLine: { lineStyle: { color: DARK_THEME.splitLine } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: DARK_THEME.axisLine } },
    },
    series: [{
      type: 'radar',
      data: seriesData.map((s: { name: string; data: number[]; color?: string }) => ({
        value: s.data, name: s.name,
        lineStyle: { color: s.color || '#00d4ff' },
        areaStyle: { color: (s.color || '#00d4ff') + '30' },
        itemStyle: { color: s.color || '#00d4ff' },
      })),
    }],
  };

  return <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ width: width || undefined, height: height || undefined, renderer: 'svg' }} />;
};

// ─── 主渲染器 ────────────────────────────────────────

const CardRenderer: React.FC<CardRendererProps> = ({ card, width, height }) => {
  const styleConfig = useMemo(() => parseStyleConfig(card.styleConfig), [card.styleConfig]);
  const dataSourceConfig = useMemo(() => parseDataSource(card.dataSource), [card.dataSource]);
  const [dynamicValue, setDynamicValue] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(false);

  /** 获取数据 */
  const loadData = useCallback(async () => {
    if (dataSourceConfig.static) {
      setDynamicValue(dataSourceConfig.staticData);
      return;
    }
    setLoading(true);
    try {
      const value = await fetchCardData(dataSourceConfig);
      setDynamicValue(value);
    } finally {
      setLoading(false);
    }
  }, [dataSourceConfig]);

  /** 初始化加载 + 定时刷新 */
  useEffect(() => {
    loadData();
    const refreshInterval = dataSourceConfig.refreshInterval || card.refreshInterval || 300;
    if (refreshInterval > 0 && !dataSourceConfig.static) {
      const timer = setInterval(loadData, refreshInterval * 1000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [loadData, dataSourceConfig, card.refreshInterval]);

  const renderContent = () => {
    if (loading && dynamicValue === undefined) {
      return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="small" /></div>;
    }
    switch (card.cardType) {
      case 'statistic':
        return <StatisticCard style={styleConfig} value={dynamicValue} />;
      case 'gauge':
        return <GaugeChart style={styleConfig} width={width} height={height} />;
      case 'ring':
      case 'pieChart':
        return <RingChart style={styleConfig} width={width} height={height} />;
      case 'lineChart':
        return <LineAreaChart style={styleConfig} width={width} height={height} />;
      case 'areaChart':
        return <LineAreaChart style={styleConfig} isArea width={width} height={height} />;
      case 'barChart':
        return <BarChart style={styleConfig} width={width} height={height} />;
      case 'radarChart':
        return <RadarChart style={styleConfig} width={width} height={height} />;
      case 'statusGrid':
        return <StatusGrid style={styleConfig} />;
      case 'functionModule':
        return <FunctionModuleGrid style={styleConfig} />;
      case 'alertList':
        return <AlertList style={styleConfig} />;
      case 'progressBar':
      case 'progress':
        return <ProgressBarCard style={styleConfig} />;
      case 'table':
        return <TableCard style={styleConfig} />;
      case 'header':
        return <HeaderCard style={styleConfig} />;
      case 'clock':
        return <ClockCard style={styleConfig} />;
      case 'statusBar':
        return <StatusBarCard style={styleConfig} />;
      case 'text':
        return <TextCard style={styleConfig} />;
      case 'image':
        return <ImageCard style={styleConfig} />;
      default:
        return <div style={{ color: DARK_THEME.subText, textAlign: 'center', paddingTop: 16 }}>未知卡片类型: {card.cardType}</div>;
    }
  };

  // 判断是否需要显示标题（header/clock/statusBar 类型不显示）
  const noTitleTypes = ['header', 'clock', 'statusBar'];
  const showTitle = styleConfig.showTitle !== false && !noTitleTypes.includes(card.cardType) && card.title;

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: styleConfig.backgroundColor || DARK_THEME.cardBg,
      borderRadius: styleConfig.borderRadius ?? 8,
      border: `1px solid ${styleConfig.borderColor || DARK_THEME.border}`,
      overflow: 'hidden',
      padding: styleConfig.padding ?? 12,
    }}>
      {showTitle && (
        <div style={{
          fontSize: styleConfig.titleFontSize || 14,
          fontWeight: 600,
          color: styleConfig.titleColor || DARK_THEME.text,
          marginBottom: 8,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {styleConfig.icon && <span style={{ color: styleConfig.iconColor || '#00d4ff' }}>{ICON_MAP[styleConfig.icon] || ''}</span>}
          {card.title}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default React.memo(CardRenderer);
