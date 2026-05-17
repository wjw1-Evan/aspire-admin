export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName?: string;
  recipientId?: string;
  type: string;
  content?: string;
  attachment?: ChatAttachmentInfo;
  metadata?: Record<string, any>;
  isRecalled: boolean;
  clientMessageId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatAttachmentInfo {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  thumbnailUrl?: string;
}

export interface ChatSession {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantAvatars?: Record<string, string>;
  lastMessageExcerpt?: string;
  lastMessageId?: string;
  lastMessageAt?: string;
  unreadCounts: Record<string, number>;
  lastReadMessageIds: Record<string, string>;
  topicTags?: string[];
  isMuted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SendChatMessageRequest {
  sessionId: string;
  type: string;
  content?: string;
  recipientId?: string;
  clientMessageId?: string;
  assistantStreaming?: boolean;
}

export interface ChatMessageTimelineResponse {
  items: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ChatMessageChunkPayload {
  sessionId: string;
  messageId: string;
  delta: string;
}

export const ASSISTANT_USER_ID = '64f0000000000000000000aa';
