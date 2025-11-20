import React, { useEffect, useState, useCallback, useRef } from 'react';
import { FloatButton, App, Input, Button, Card, Avatar, Spin } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import {
  getOrCreateAssistantSession,
  sendMessage as sendChatMessage,
  getMessages,
  type ChatMessage,
  type ChatSession,
} from '@/services/chat/api';
import { AI_ASSISTANT_ID, AI_ASSISTANT_NAME, AI_ASSISTANT_AVATAR } from '@/constants/ai';

const { TextArea } = Input;

/**
 * AI 助手组件
 * 固定在页面右下角，提供与小科的对话功能
 */
const AiAssistant: React.FC = () => {
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

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
      console.error('初始化会话失败:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [currentUser, initialized]);

  /**
   * 加载消息列表
   */
  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const response = await getMessages(sessionId, { limit: 50 });
      setMessages(response.items);
      
      // 记录最后一条消息ID
      if (response.items.length > 0) {
        const lastMessage = response.items[response.items.length - 1];
        lastMessageIdRef.current = lastMessage.id;
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  }, []);

  /**
   * 轮询获取新消息
   */
  const pollNewMessages = useCallback(async () => {
    if (!session || !open) return;

    try {
      const response = await getMessages(session.id, { limit: 10 });
      const newMessages = response.items.filter(
        (msg) => msg.id !== lastMessageIdRef.current && msg.content
      );

      if (newMessages.length > 0) {
        // 更新最后一条消息ID
        const lastMessage = response.items[response.items.length - 1];
        lastMessageIdRef.current = lastMessage.id;

        // 重新加载所有消息
        await loadMessages(session.id);
      }
    } catch (error) {
      console.error('轮询消息失败:', error);
    }
  }, [session, open, loadMessages]);

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
        console.error('获取会话失败:', error);
        message.error('无法发送消息：会话不存在');
        return;
      }
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setSending(true);

    try {
      // 先添加用户消息到界面（乐观更新）
      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        sessionId: currentSession.id,
        senderId: currentUser?.id || '',
        recipientId: AI_ASSISTANT_ID,
        type: 'Text',
        content: userMessage,
        createdAt: new Date().toISOString(),
      };
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

      // 移除临时消息，添加真实消息
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== optimisticMessage.id);
        return [...filtered, sentMessage];
      });

      // 等待一段时间后轮询获取小科的回复
      setTimeout(() => {
        pollNewMessages();
      }, 2000);
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败');
      // 移除临时消息
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
    } finally {
      setSending(false);
    }
  }, [inputValue, sending, session, currentUser, message, pollNewMessages]);

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
   * 打开对话窗口时加载消息
   */
  useEffect(() => {
    if (open && session && initialized) {
      loadMessages(session.id);
    }
  }, [open, session, initialized, loadMessages]);

  /**
   * 消息更新时滚动到底部
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * 启动轮询
   */
  useEffect(() => {
    if (session && initialized && open) {
      // 每 3 秒轮询一次新消息
      pollTimerRef.current = setInterval(() => {
        pollNewMessages();
      }, 3000);

      return () => {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }
  }, [session, initialized, open, pollNewMessages]);

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
        zIndex: 1000,
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
          bodyStyle={{
            padding: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
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
              <Avatar src={AI_ASSISTANT_AVATAR} size="small" />
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
                {messages.map((msg) => {
                  const isAssistant = msg.senderId === AI_ASSISTANT_ID;
                  const isUser = msg.senderId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
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
                          <Avatar src={AI_ASSISTANT_AVATAR} size="small" />
                        )}
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            backgroundColor: isAssistant ? '#fff' : '#1890ff',
                            color: isAssistant ? '#000' : '#fff',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                            wordBreak: 'break-word',
                          }}
                        >
                          {msg.content}
                        </div>
                        {isUser && (
                          <Avatar src={currentUser.avatar} size="small" />
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
