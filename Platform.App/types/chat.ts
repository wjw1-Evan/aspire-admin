/**
 * 聊天与服务器推送相关类型定义
 */

export type ChatMessageType = 'text' | 'image' | 'file' | 'system';

export type AttachmentStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

export interface AttachmentMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  /** 服务端返回的可访问地址 */
  url: string;
  thumbnailUri?: string;
  checksum?: string;
  status?: AttachmentStatus;
  uploadedAt?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  recipientId: string;
  type: ChatMessageType;
  content?: string;
  attachment?: AttachmentMetadata;
  createdAt: string;
  updatedAt?: string;
  isLocal?: boolean;
  /**
   * 任意扩展字段，例如 AI 生成标记、撤回状态等。
   */
  metadata?: Record<string, unknown>;
}

export interface ServerChatSession {
  id: string;
  participants: string[];
  participantNames?: Record<string, string>;
  lastMessageId?: string;
  lastMessageExcerpt?: string;
  lastMessageAt?: string;
  unreadCounts?: Record<string, number>;
  topicTags?: string[];
  isMuted?: boolean;
  isBlocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatSession extends ServerChatSession {
  /**
   * 针对当前用户计算后的未读数量
   */
  unreadCount: number;
  /**
   * 最近一条消息（可选）
   */
  lastMessage?: ChatMessage;
}

export interface SessionListResponse {
  items: ServerChatSession[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MessageTimelineResponse {
  items: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface MessageSendRequest {
  sessionId: string;
  type: ChatMessageType;
  content?: string;
  attachmentId?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMessageRealtimePayload {
  sessionId: string;
  message: ChatMessage;
  broadcastAtUtc: string;
}

export interface ChatSessionRealtimePayload {
  session: ServerChatSession;
  broadcastAtUtc: string;
}

export interface ChatMessageDeletedPayload {
  sessionId: string;
  messageId: string;
  deletedAtUtc: string;
}

export interface ChatSessionReadPayload {
  sessionId: string;
  userId: string;
  lastMessageId: string;
  readAtUtc: string;
}

export interface NearbyUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  distanceMeters: number;
  lastActiveAt?: string;
  location?: GeoPoint;
  interests?: string[];
  sessionId?: string;
}

export interface NearbySearchRequest {
  center: GeoPoint;
  radiusMeters?: number;
  limit?: number;
  interests?: string[];
}

export interface NearbySearchResponse {
  items: NearbyUser[];
  total: number;
  nextRefreshAfter?: number;
}


