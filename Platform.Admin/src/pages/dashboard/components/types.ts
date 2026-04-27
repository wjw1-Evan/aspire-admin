/**
 * 数据看板组件共享类型定义
 */

/** 卡片类型枚举 */
export type CardType =
  | 'statistic'        // 统计指标卡
  | 'gauge'            // 仪表盘
  | 'ring'             // 环形图/饼图
  | 'lineChart'        // 折线图
  | 'barChart'         // 柱状图
  | 'areaChart'        // 面积图
  | 'pieChart'         // 饼图
  | 'radarChart'       // 雷达图
  | 'statusGrid'       // 状态网格（科室状态等）
  | 'functionModule'   // 功能模块网格
  | 'alertList'        // 告警列表
  | 'progressBar'      // 进度条
  | 'text'             // 富文本
  | 'image'            // 图片
  | 'table'            // 表格
  | 'header'           // 看板标题头
  | 'clock'            // 时钟
  | 'statusBar';       // 底部状态栏

/** 卡片类型分组 */
export const CARD_TYPE_GROUPS = {
  basic: ['statistic', 'text', 'image', 'header', 'clock', 'statusBar'],
  chart: ['gauge', 'ring', 'lineChart', 'barChart', 'areaChart', 'pieChart', 'radarChart'],
  complex: ['statusGrid', 'functionModule', 'alertList', 'progressBar', 'table'],
};

/** 后端返回的卡片DTO */
export interface DashboardCardDto {
  id: string;
  dashboardId?: string;
  cardType: string;
  title: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  dataSource: string;
  styleConfig: string;
  refreshInterval: number;
  lastRefreshAt?: string;
}

/** 后端返回的看板DTO */
export interface DashboardDto {
  id: string;
  name: string;
  description?: string;
  layoutType: string;
  theme: string;
  isPublic: boolean;
  userId: string;
  cards: DashboardCardDto[];
  createdAt?: string;
  updatedAt?: string;
}

/** 样式配置 */
export interface StyleConfig {
  // 通用样式
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
  fontSize?: number;
  fontWeight?: string;
  showTitle?: boolean;
  titleColor?: string;
  titleFontSize?: number;

  // 统计卡片
  prefix?: string;      // 前缀（如 ¥）
  suffix?: string;      // 后缀（如 %、kW）
  valueColor?: string;
  valueSize?: number;
  icon?: string;
  iconColor?: string;
  trend?: 'up' | 'down' | 'none';
  trendValue?: string;
  trendColor?: string;
  description?: string;

  // 仪表盘
  min?: number;
  max?: number;
  unit?: string;
  splitNumber?: number;
  colorStops?: Array<{ offset: number; color: string }>;
  gaugeStyle?: 'default' | 'simple' | 'temperature';

  // 图表通用
  xAxisData?: string[];
  seriesData?: Array<{
    name: string;
    data: number[];
    color?: string;
    type?: string;
  }>;
  legendData?: string[];
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  smooth?: boolean;
  areaStyle?: boolean;
  gridTop?: number;
  gridBottom?: number;

  // 环形图/饼图
  pieData?: Array<{ name: string; value: number; color?: string }>;
  innerRadius?: string;
  outerRadius?: string;
  roseType?: boolean;
  centerText?: string;
  centerValue?: string;

  // 状态网格
  items?: Array<{
    name: string;
    status: 'normal' | 'busy' | 'urgent' | 'offline';
    statusText?: string;
    data?: Record<string, string | number>;
  }>;
  columns?: number;

  // 功能模块
  modules?: Array<{
    name: string;
    icon?: string;
    status: 'online' | 'offline' | 'warning';
    statusText?: string;
    description?: string;
    stats?: string;
  }>;

  // 告警列表
  alerts?: Array<{
    time: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
  }>;

  // 进度条
  progress?: number;
  progressColor?: string;
  showPercent?: boolean;
  strokeWidth?: number;

  // 表格
  tableColumns?: Array<{ title: string; dataIndex: string; width?: number }>;
  tableData?: Array<Record<string, unknown>>;

  // 标题头
  headerTitle?: string;
  headerIcon?: string;
  showClock?: boolean;
  showThemeSwitch?: boolean;

  // 底部状态栏
  statusItems?: Array<{
    icon?: string;
    text: string;
    color?: string;
  }>;

  // 图片
  imageUrl?: string;
  imageFit?: 'cover' | 'contain' | 'fill';

  // 文本
  content?: string;
  textAlign?: 'left' | 'center' | 'right';
}

/** 数据源配置 */
export interface DataSourceConfig {
  module?: string;
  dataType?: string;
  filters?: Record<string, unknown>;
  aggregation?: string;
  groupBy?: string;
  timeRange?: string;
  startTime?: string;
  endTime?: string;
  /** 静态数据模式（不从后端获取） */
  static?: boolean;
}

/** react-grid-layout 布局项 */
export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}
