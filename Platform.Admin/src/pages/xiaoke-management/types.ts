// 小科管理相关类型定义
// 从API服务中重新导出类型，方便页面组件使用

export type {
  XiaokeConfig,
  CreateXiaokeConfigRequest,
  UpdateXiaokeConfigRequest,
  XiaokeConfigListResponse,
  ChatHistoryListItem,
  ChatHistoryListResponse,
  ChatHistoryQueryRequest,
  ChatMessage,
  ChatSession,
  ChatHistoryDetailResponse,
} from '@/services/xiaoke/api';
