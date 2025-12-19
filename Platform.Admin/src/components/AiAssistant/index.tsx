import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { FloatButton, App, Input, Button, Card, Avatar, Spin } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import * as signalR from '@microsoft/signalr';
import {
  getOrCreateAssistantSession,
  sendMessage as sendChatMessage,
  getMessages,
  type ChatMessage,
  type ChatSession,
} from '@/services/chat/api';
import { AI_ASSISTANT_ID, AI_ASSISTANT_NAME, AI_ASSISTANT_AVATAR } from '@/constants/ai';
import { useSignalRConnection } from '@/hooks/useSignalRConnection';
import { getApiBaseUrl } from '@/utils/request';

const { TextArea } = Input;

/**
 * AI 助手组件
 * 固定在页面右下角，提供与小科的对话功能
 * 使用 SignalR 实时接收消息，替代轮询
 */
const AiAssistant: React.FC = () => {
  // 保证 messages 中的 id 唯一，保持原有顺序（后来的覆盖先前的）
  const dedupeById = useCallback((list: ChatMessage[]) => {
    // 保留“最后出现”的同 id 消息（后来的覆盖先前的）
    const seen = new Set<string>();
    const result: ChatMessage[] = [];
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      const id = m.id || `__noid__${i}`;
      if (seen.has(id)) continue;
      seen.add(id);
      result.push(m);
    }
    result.reverse();
    return result;
  }, []);

  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const { message } = App.useApp();

  const [session, setSession] = useState<ChatSession | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // SignalR 连接管理
  const { isConnected, on, off, invoke } = useSignalRConnection({
    hubUrl: '/hubs/chat',
    autoConnect: !!currentUser,
  });

  /**
   * 初始化会话
   */
  const initializeSession = useCallback(async () => {
    if (!currentUser || initialized) return;

    setLoading(true);
    try {
      const assistantSession = await getOrCreateAssistantSession();
      if (assistantSession) {
        setSession(assistantSession);
        // 加载历史消息
        await loadMessages(assistantSession.id);
      }
    } catch (error) {
      // 初始化会话失败，由错误处理机制处理
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [currentUser, initialized]);

  const isValidObjectId = useCallback((id?: string) => !!id && /^[a-fA-F0-9]{24}$/.test(id), []);

  // 渲染前去重，避免重复 key
  const renderMessages = useMemo(() => dedupeById(messages), [messages, dedupeById]);

  /**
   * 加载消息列表
   */
  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      if (!isValidObjectId(sessionId)) {
        if (process.env.NODE_ENV === 'development') {
          // 跳过加载消息：无效的 sessionId
        }
        return;
      }
      const response = await getMessages(sessionId, { limit: 50 });
      setMessages(dedupeById(response.items));

      // 记录最后一条消息ID
      if (response.items.length > 0) {
        const lastMessage = response.items[response.items.length - 1];
        lastMessageIdRef.current = lastMessage.id;
      }
    } catch (error) {
      // 加载消息失败，由错误处理机制处理
    }
  }, [isValidObjectId]);

  /**
   * 加入聊天会话（SignalR）
   */
  const joinSession = useCallback(async (sessionId: string) => {
    if (!isConnected) return;
    if (!isValidObjectId(sessionId)) {
      if (process.env.NODE_ENV === 'development') {
        // 跳过加入会话：无效的 sessionId
      }
      return;
    }

    try {
      await invoke('JoinSessionAsync', sessionId);
    } catch (error) {
      // 加入会话失败，由错误处理机制处理
    }
  }, [isConnected, invoke, isValidObjectId]);

  /**
   * 离开聊天会话（SignalR）
   */
  const leaveSession = useCallback(async (sessionId: string) => {
    if (!isConnected) return;

    try {
      await invoke('LeaveSessionAsync', sessionId);
    } catch (error) {
      // 离开会话失败，由错误处理机制处理
    }
  }, [isConnected, invoke]);

  /**
   * 发送消息
   */
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || sending) return;

    let currentSession = session;

    // 如果会话不存在，尝试获取或创建会话
    if (!currentSession) {
      try {
        const assistantSession = await getOrCreateAssistantSession();
        if (assistantSession) {
          currentSession = assistantSession;
          setSession(assistantSession);
        } else {
          message.error('会话不存在，请刷新页面重试');
          return;
        }
      } catch (error) {
        // 获取会话失败，由错误处理机制处理
        message.error('无法发送消息：会话不存在');
        return;
      }
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setSending(true);

    // 先添加用户消息到界面（乐观更新）
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: currentSession.id,
      senderId: currentUser?.userid || '',
      recipientId: AI_ASSISTANT_ID,
      type: 'Text',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    try {
      setMessages((prev) => [...prev, optimisticMessage]);

      // 发送消息到后端
      const sentMessage = await sendChatMessage({
        sessionId: currentSession.id,
        type: 'Text',
        content: userMessage,
        recipientId: AI_ASSISTANT_ID,
      });

      // 更新最后一条消息ID
      lastMessageIdRef.current = sentMessage.id;

      // 移除临时消息，同时去掉可能由 SignalR 已经推送过的相同 id，添加真实消息
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== optimisticMessage.id && msg.id !== sentMessage.id);
        return [...filtered, sentMessage];
      });

      // SignalR 会自动推送小科的回复，无需轮询
    } catch (error) {
      // 发送消息失败，由错误处理机制处理
      message.error('发送消息失败');
      // 移除临时消息
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
    } finally {
      setSending(false);
    }
  }, [inputValue, sending, session, currentUser, message]);

  /**
   * 处理 Enter 键发送
   */
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  /**
   * 滚动到底部
   */
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  /**
   * 初始化会话
   */
  useEffect(() => {
    if (currentUser && !initialized) {
      initializeSession();
    }
  }, [currentUser, initialized, initializeSession]);

  /**
   * 打开对话窗口时加载消息并加入会话
   */
  useEffect(() => {
    const sid = session?.id;
    const valid = sid && isValidObjectId(sid);

    if (open && initialized && isConnected && valid) {
      loadMessages(sid!);
      joinSession(sid!);
    }

    return () => {
      if (open && isConnected && valid) {
        leaveSession(sid!);
      }
    };
  }, [open, session?.id, initialized, isConnected, loadMessages, joinSession, leaveSession, isValidObjectId]);

  /**
   * 消息更新时滚动到底部
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * 监听 SignalR 消息事件
   */
  useEffect(() => {
    if (!isConnected || !session) return;

    // 监听新消息事件
    on('ReceiveMessage', (payload: any) => {
      const incoming: ChatMessage = (payload && (payload as any).message) ? (payload as any).message : (payload as ChatMessage);
      if (!incoming || !incoming.sessionId) {
        return;
      }
      setMessages((prev) => {
        // 避免重复添加消息（基于 id）
        if (incoming.id && prev.some((m) => m.id === incoming.id)) {
          return prev;
        }
        return [...prev, incoming];
      });
    });

    // 监听消息删除事件
    on('MessageDeleted', (deletedMessageId: string) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== deletedMessageId));
    });

    // 监听会话更新事件
    on('SessionUpdated', (payload: any) => {
      const updatedSession: ChatSession = (payload && (payload as any).session) ? (payload as any).session : (payload as ChatSession);
      if (!updatedSession || !updatedSession.id) {
        return;
      }
      setSession(updatedSession);
    });

    return () => {
      off('ReceiveMessage');
      off('MessageDeleted');
      off('SessionUpdated');
    };
  }, [isConnected, session, on, off]);

  // 如果用户未登录，不显示组件
  if (!currentUser) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 900,
      }}
    >
      {open ? (
        <Card
          style={{
            width: 400,
            height: 600,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
          }}
          styles={{
            body: {
              padding: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {/* 头部 */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar src={AI_ASSISTANT_AVATAR} size={32} />
              <div style={{ fontWeight: 600, fontSize: 16 }}>{AI_ASSISTANT_NAME}</div>
            </div>
            <CloseOutlined
              onClick={() => setOpen(false)}
              style={{ cursor: 'pointer', fontSize: 16 }}
            />
          </div>

          {/* 消息列表 */}
          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              backgroundColor: '#fafafa',
            }}
          >
            {loading && messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin />
              </div>
            ) : (
              <>
                {renderMessages.map((msg, idx) => {
                  const isAssistant = msg.senderId === AI_ASSISTANT_ID;
                  const isUser = msg.senderId === currentUser.userid;

                  return (
                    <div
                      key={`${msg.id || 'local'}-${idx}`}
                      style={{
                        display: 'flex',
                        justifyContent: isAssistant ? 'flex-start' : 'flex-end',
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          display: 'flex',
                          flexDirection: isAssistant ? 'row' : 'row-reverse',
                          gap: 8,
                          alignItems: 'flex-start',
                        }}
                      >
                        {isAssistant && (
                          <Avatar
                            src={AI_ASSISTANT_AVATAR}
                            size={32}
                            style={{ flexShrink: 0, width: 32, height: 32 }}
                          />
                        )}
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            backgroundColor: isAssistant ? '#fff' : '#1890ff',
                            color: isAssistant ? '#000' : '#fff',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                            wordBreak: 'break-word',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {msg.content}
                        </div>
                        {isUser && (
                          <Avatar
                            src={currentUser.avatar}
                            size={32}
                            style={{ flexShrink: 0, width: 32, height: 32 }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* 输入框 */}
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              gap: 8,
            }}
          >
            <TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={sending}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              loading={sending}
              disabled={!inputValue.trim()}
            >
              发送
            </Button>
          </div>
        </Card>
      ) : (
        <FloatButton
          icon={<MessageOutlined />}
          type="primary"
          onClick={() => setOpen(true)}
          tooltip={AI_ASSISTANT_NAME}
        />
      )}
    </div>
  );
};

export default AiAssistant;
