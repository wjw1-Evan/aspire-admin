import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { FloatButton, App, Input, Button, Card, Avatar, Spin, Dropdown } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined, AudioOutlined, AudioMutedOutlined, PlusOutlined } from '@ant-design/icons';
import { useModel, useIntl } from '@umijs/max';
import { marked } from 'marked';
import {
  getOrCreateAssistantSession,
  sendMessage,
  getMessages,
  getSessions,
  createNewAssistantSession,
  getSession,
} from '@/services/chat/api';
import { useSseConnection } from '@/hooks/useSseConnection';
import type { ChatMessage, ChatSession } from '@/services/chat/api';
import { AI_ASSISTANT_ID, AI_ASSISTANT_NAME, AI_ASSISTANT_AVATAR } from '@/constants/ai';
import { getUserAvatar } from '@/utils/avatar';

const { TextArea } = Input;

/**
 * 打字机效果内容组件
 */
const TypewriterContent: React.FC<{ content: string; isStreaming: boolean; onUpdate?: () => void }> = ({
  content,
  isStreaming,
  onUpdate,
}) => {
  const [displayContent, setDisplayContent] = useState('');

  // Markdown 全局样式注入
  useEffect(() => {
    const styleId = 'ai-assistant-markdown-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .markdown-body p { margin-bottom: 8px; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body ul, .markdown-body ol { padding-left: 20px; margin-bottom: 8px; list-style: initial; }
        .markdown-body code { background: #f0f0f0; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
        .markdown-body pre { background: #f0f0f0; padding: 12px; border-radius: 8px; overflow-x: auto; margin-bottom: 8px; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { margin-top: 12px; margin-bottom: 8px; }
        .markdown-body blockquote { border-left: 4px solid #ddd; padding-left: 12px; color: #666; margin: 8px 0; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayContent(content);
      return;
    }

    // 流式内容直接实时显示（无延迟）
    if (content !== displayContent) {
      setDisplayContent(content);
    }
  }, [content, isStreaming, displayContent]);

  // 当内容更新时通知父组件（用于滚动）
  useEffect(() => {
    onUpdate?.();
  }, [displayContent, onUpdate]);

  const html = useMemo(() => {
    try {
      return { __html: marked.parse(displayContent || '') as string };
    } catch (e) {
      return { __html: displayContent || '' };
    }
  }, [displayContent]);

  return (
    <div
      className="markdown-body"
      style={{
        fontSize: '14px',
        lineHeight: '1.6',
      }}
      dangerouslySetInnerHTML={html}
    />
  );
};

interface AiAssistantProps {
  defaultOpen?: boolean;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ defaultOpen }) => {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const currentUser = initialState?.currentUser;
  const { message } = App.useApp();

  const [session, setSession] = useState<ChatSession | null>(null);
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const initialInputValueRef = useRef<string>('');
  const currentTranscriptRef = useRef<string>('');

  // 对话框尺寸状态
  const isFullScreen = defaultOpen === true;
  const [dialogSize, setDialogSize] = useState(isFullScreen ? { width: '100%' as any, height: '100%' as any } : { width: 400, height: 600 });

  // 会话列表状态
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // 初始化全局 SSE 连接 (用于监听通知、会话更新等实时事件)
  const sse = useSseConnection({
    autoConnect: true,
    onError: (err) => console.warn('[AiAssistant] 全局 SSE 异常:', err),
  });

  const dialogRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [streamingMessages, setStreamingMessages] = useState<Record<string, string>>({});

  // 监听 SessionUpdated 事件（会话信息更新，如 AI 标题生成完成）
  useEffect(() => {
    const unsub = sse.on<any>('SessionUpdated', (data) => {
      if (!data?.session) return;
      const updatedSession = data.session as ChatSession;

      setSessions((prev) => prev.map((s) =>
        s.id === updatedSession.id ? { ...s, ...updatedSession } : s,
      ));

      setSession((prev) =>
        prev?.id === updatedSession.id ? { ...prev, ...updatedSession } : prev,
      );
    });

    return () => unsub();
  }, [sse]);

  // 监听 chat-response 事件（AI 回复）
  useEffect(() => {
    if (!session?.id || !open) return;

    // 监听 ReceiveMessage（AI 回复）
    const unsubReceiveMessage = sse.on<any>('ReceiveMessage', (data) => {
      if (!data || !data.message) return;

      const msg = data.message;
      const isAssistantMessage = msg.senderId === AI_ASSISTANT_ID || msg.metadata?.isAssistant === true;
      if (msg.sessionId === session.id && isAssistantMessage) {
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === msg.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = msg;
            return updated;
          }
          return [...prev, msg];
        });
      }
    });

    // 监听 MessageChunk（AI 回复增量）
    const unsubMessageChunk = sse.on<any>('MessageChunk', (data) => {
      if (!data || !data.messageId || !data.delta) return;

      if (data.sessionId === session.id) {
        const { messageId, delta } = data;
        setStreamingMessages((prev) => {
          const currentContent = prev[messageId] || '';
          return { ...prev, [messageId]: currentContent + delta };
        });
        setMessages((prev) => {
          const messageIndex = prev.findIndex((m) => m.id === messageId);
          if (messageIndex < 0) {
            const tempMessage: ChatMessage = {
              id: messageId,
              sessionId: session.id,
              senderId: AI_ASSISTANT_ID,
              type: 'Text',
              content: '',
              createdAt: new Date().toISOString(),
            };
            return [...prev, tempMessage];
          }
          return prev;
        });
      }
    });

    // 监听 MessageComplete（AI 回复完成）
    const unsubMessageComplete = sse.on<any>('MessageComplete', (data) => {
      if (!data || !data.message) return;

      const msg = data.message;
      if (msg.sessionId === session.id) {
        setStreamingMessages((prev) => {
          const { [msg.id]: _, ...rest } = prev;
          return rest;
        });
        setMessages((prev) => {
          const messageIndex = prev.findIndex((m) => m.id === msg.id);
          let updated: ChatMessage[];
          if (messageIndex >= 0) {
            updated = [...prev];
            updated[messageIndex] = msg;
          } else {
            updated = [...prev, msg];
          }
          return updated;
        });

        // 每次消息完成都刷新会话，确保能捕获到后台生成的标题
        // （SSE SessionUpdated 广播可能因网络原因未到达，此调用作为可靠 fallback）
        getSession(session.id).then((updatedSession) => {
          if (updatedSession) setSession(updatedSession);
        });
      }
    });

    return () => {
      unsubReceiveMessage?.();
      unsubMessageChunk?.();
      unsubMessageComplete?.();
    };
  }, [session?.id, open, sse]);

  // 组件卸载时强制清理所有全局监听器
  useEffect(() => {
    return () => {
      if ((window as any)._aiAssistantCleanup) (window as any)._aiAssistantCleanup();
      if ((window as any)._aiAssistantCleanupHeight) (window as any)._aiAssistantCleanupHeight();
      if ((window as any)._aiAssistantCleanupBoth) (window as any)._aiAssistantCleanupBoth();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  /**
   * 加载消息列表
   */
  const loadMessages = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    try {
      const response = await getMessages(sessionId, { limit: 100 });
      const sortedMessages = [...response.items].sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      });
      setMessages(sortedMessages);
    } catch (error) {
      console.error('[AiAssistant] 加载历史消息失败:', error);
    }
  }, []);

  /**
   * 加载会话列表（仅包含与小科的对话）
   */
  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const result = await getSessions({ page: 1, pageSize: 50 });
      if (result?.queryable) {
        const assistantSessions = result.queryable.filter(
          (s: ChatSession) => s.participants?.includes(AI_ASSISTANT_ID)
        );
        setSessions(assistantSessions);
      }
    } catch (error) {
      console.error('[AiAssistant] 加载会话列表失败:', error);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  /**
   * 切换到指定会话
   */
  const switchToSession = useCallback(async (targetSession: ChatSession) => {
    if (targetSession.id === session?.id) return;
    setSession(targetSession);
    setMessages([]);
    setStreamingMessages({});
    if (open) {
      setMessagesLoading(true);
      await loadMessages(targetSession.id);
      setMessagesLoading(false);
    }
  }, [session?.id, open, loadMessages]);

  /**
   * 创建新对话
   */
  const handleNewConversation = useCallback(async () => {
    try {
      const newSession = await createNewAssistantSession();
      if (newSession) {
        setSession(newSession);
        setMessages([]);
        setStreamingMessages({});
        // 刷新会话列表，将新会话加入
        setSessions((prev) => [newSession, ...prev]);
      }
    } catch (error) {
      console.error('[AiAssistant] 创建新会话失败:', error);
      message.error(intl.formatMessage({ id: 'components.aiAssistant.createSessionFailed' }));
    }
  }, [message, intl]);

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
        if (open) {
          await loadMessages(assistantSession.id);
        }
      }
    } catch (error) {
      console.error('[AiAssistant] 初始化会话失败:', error);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [currentUser, initialized, open, loadMessages]);

  /**
   * 发送消息
   */
  const handleSendMessage = useCallback(async (contentOverride?: string) => {
    const userMessage = (contentOverride ?? inputValue).trim();

    if (!userMessage || sending || !currentUser) {
      return;
    }

    setInputValue('');
    let currentSession = session;

    if (!currentSession) {
      try {
        const assistantSession = await getOrCreateAssistantSession();
        if (assistantSession) {
          currentSession = assistantSession;
          setSession(assistantSession);
        } else {
          message.error(intl.formatMessage({ id: 'components.aiAssistant.sessionNotFound' }));
          setSending(false);
          return;
        }
      } catch {
        message.error(intl.formatMessage({ id: 'components.aiAssistant.sendMessageFailed' }));
        setSending(false);
        return;
      }
    }

    const tempUserId = currentUser?.id || 'temp-user';
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: currentSession.id,
      senderId: tempUserId,
      recipientId: AI_ASSISTANT_ID,
      type: 'Text',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    try {
      setMessages((prev) => [...prev, optimisticMessage]);

      const sentMessage = await sendMessage({
        sessionId: currentSession.id,
        type: 'Text',
        content: userMessage,
        recipientId: AI_ASSISTANT_ID,
      });

      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== optimisticMessage.id);
        const updated = [...filtered, sentMessage];
        return updated.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      });
    } catch {
      message.error(intl.formatMessage({ id: 'components.aiAssistant.sendMessageFailed' }));
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
    } finally {
      setSending(false);
    }
  }, [inputValue, sending, session, currentUser, message, sse]);

  /**
   * 处理录音
   */
  const handleToggleListen = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      message.error(intl.formatMessage({ id: 'components.aiAssistant.voiceNotSupported' }));
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        currentTranscriptRef.current = transcript;
        setInputValue(initialInputValueRef.current + transcript);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          message.error(intl.formatMessage({ id: 'components.aiAssistant.micPermission' }));
        } else {
          message.error(intl.formatMessage({ id: 'components.aiAssistant.voiceError' }) + ': ' + event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        currentTranscriptRef.current = '';
      };

      recognitionRef.current = recognition;
    }

    try {
      initialInputValueRef.current = inputValue;
      currentTranscriptRef.current = '';
      recognitionRef.current.start();
    } catch {
      setIsListening(false);
    }
  }, [isListening, message]);

  /**
   * 处理 Enter 键发送
   */
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isListening) {
          recognitionRef.current?.stop();
          setIsListening(false);
        }
        handleSendMessage();
      }
    },
    [handleSendMessage, isListening]
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
   * 打开对话窗口时加载历史消息和会话列表
   */
  useEffect(() => {
    if (open && session?.id) {
      setMessagesLoading(true);
      loadMessages(session.id).finally(() => setMessagesLoading(false));
      loadSessions();
    }
  }, [open, session?.id, initialized, loadMessages, loadSessions]);

  /**
   * 消息更新时滚动到底部
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 计算显示的消息列表（合并流式内容）
  const displayMessages = useMemo(() => {
    return [...messages]
      .map((msg) => {
        if (msg.senderId === AI_ASSISTANT_ID) {
          const streamingContent = streamingMessages[msg.id];
          if (streamingContent !== undefined) {
            return {
              ...msg,
              content: streamingContent,
            };
          }
        }
        return msg;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      });
  }, [messages, streamingMessages]);

  if (!currentUser) {
    return null;
  }

  return (
    <div
      style={
        isFullScreen
          ? { height: '100%', display: 'flex', flexDirection: 'column' }
          : { position: 'fixed', bottom: 24, right: 24, zIndex: 900 }
      }
    >
      {open ? (
        <Card
          ref={dialogRef}
          style={{
            width: dialogSize.width,
            height: dialogSize.height,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            position: 'relative',
            resize: 'none',
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
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const startX = e.clientX;
              const startWidth = dialogSize.width;

              const handleMouseMove = (e: MouseEvent) => {
                const diffX = startX - e.clientX;
                const newWidth = Math.max(300, Math.min(800, startWidth + diffX));
                setDialogSize(prev => ({ ...prev, width: newWidth }));
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
              document.body.style.cursor = 'ew-resize';
              document.body.style.userSelect = 'none';

              (window as any)._aiAssistantCleanup = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              cursor: 'ew-resize',
              zIndex: 10,
              backgroundColor: 'transparent',
            }}
          />
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const startY = e.clientY;
              const startHeight = dialogSize.height;

              const handleMouseMove = (e: MouseEvent) => {
                const diffY = startY - e.clientY;
                const newHeight = Math.max(400, Math.min(1000, startHeight + diffY));
                setDialogSize(prev => ({ ...prev, height: newHeight }));
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
              document.body.style.cursor = 'ns-resize';
              document.body.style.userSelect = 'none';

              (window as any)._aiAssistantCleanupHeight = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
            }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: 4,
              cursor: 'ns-resize',
              zIndex: 10,
              backgroundColor: 'transparent',
            }}
          />
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const startX = e.clientX;
              const startY = e.clientY;
              const startWidth = dialogSize.width;
              const startHeight = dialogSize.height;

              const handleMouseMove = (e: MouseEvent) => {
                const diffX = startX - e.clientX;
                const diffY = startY - e.clientY;

                const newWidth = Math.max(300, Math.min(800, startWidth + diffX));
                const newHeight = Math.max(400, Math.min(1000, startHeight + diffY));

                setDialogSize({ width: newWidth, height: newHeight });
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
              document.body.style.cursor = 'nwse-resize';
              document.body.style.userSelect = 'none';

              (window as any)._aiAssistantCleanupBoth = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 20,
              height: 20,
              cursor: 'nwse-resize',
              zIndex: 11,
              background: 'linear-gradient(to bottom right, transparent 0%, transparent 40%, #d9d9d9 40%, #d9d9d9 45%, transparent 45%, transparent 55%, #d9d9d9 55%, #d9d9d9 60%, transparent 60%)',
              backgroundSize: '20px 20px',
            }}
          />
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Dropdown
              menu={{
                items: [
                  ...sessions.map((s) => ({
                    key: s.id,
                    label: (
                      <div style={{
                        maxWidth: 240,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                  {s.topicTags?.[0] && s.topicTags[0] !== 'assistant' && s.topicTags[0] !== 'direct'
                    ? s.topicTags[0]
                    : `${AI_ASSISTANT_NAME} ${intl.formatMessage({ id: 'components.aiAssistant.conversation' })}`}
                      </div>
                    ),
                    onClick: () => switchToSession(s),
                    style: s.id === session?.id ? { fontWeight: 600, background: '#e6f4ff' } : undefined,
                  })),
                  { type: 'divider' },
                  {
                    key: 'new',
                    icon: <PlusOutlined />,
                    label: intl.formatMessage({ id: 'components.aiAssistant.newConversation' }),
                    onClick: handleNewConversation,
                  },
                ],
                style: { maxHeight: 300, overflowY: 'auto' },
              }}
              trigger={['click']}
              placement="bottomLeft"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, cursor: 'pointer' }}>
                <Avatar src={AI_ASSISTANT_AVATAR} size={32} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{AI_ASSISTANT_NAME}</div>
                  {session?.topicTags && session.topicTags.length > 0 && session.topicTags[0] !== 'assistant' && session.topicTags[0] !== 'direct' ? (
                    <div style={{
                      fontSize: 12, color: '#999',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
                    }}>
                      {session.topicTags[0]}
                    </div>
                  ) : session ? (
                    <div style={{ fontSize: 12, color: '#bbb' }}>
                      {intl.formatMessage({ id: 'components.aiAssistant.identifying' })}
                    </div>
                  ) : null}
                </div>
              </div>
            </Dropdown>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNewConversation();
                }}
                title={intl.formatMessage({ id: 'components.aiAssistant.newConversation' })}
              />
              {!isFullScreen && (
                <CloseOutlined
                  onClick={() => setOpen(false)}
                  style={{ cursor: 'pointer', fontSize: 16 }}
                />
              )}
            </div>
          </div>

          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              backgroundColor: '#fafafa',
            }}
          >
            {loading || messagesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                <MessageOutlined style={{ fontSize: 48, display: 'block', marginBottom: 16, opacity: 0.3 }} />
                <div style={{ fontSize: 16, marginBottom: 8 }}>{AI_ASSISTANT_NAME}</div>
                <div>{intl.formatMessage({ id: 'components.aiAssistant.empty' })}</div>
              </div>
            ) : (
              <>
                {displayMessages.map((msg, idx) => {
                  const isAssistant = msg.senderId === AI_ASSISTANT_ID;
                  const currentUserId = currentUser?.id;
                  const isUser = currentUserId && msg.senderId === currentUserId;
                  const senderAvatar = isAssistant ? AI_ASSISTANT_AVATAR : getUserAvatar(currentUser?.avatar);
                  const senderName = isAssistant ? AI_ASSISTANT_NAME : (msg.senderName || currentUser?.displayName || currentUser?.username || '我');

                  return (
                    <div
                      key={msg.id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: isAssistant ? 'flex-start' : 'flex-end',
                        marginBottom: 16,
                        alignItems: 'flex-end',
                        gap: 8,
                      }}
                    >
                      {isAssistant && <Avatar src={senderAvatar} size={32} />}
                      <div
                        style={{
                          maxWidth: '70%',
                        }}
                      >
                        {isAssistant && (
                          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{senderName}</div>
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
                          {isAssistant ? (
                            <TypewriterContent
                              content={msg.content || intl.formatMessage({ id: 'components.aiAssistant.thinking' })}
                              isStreaming={msg.id in streamingMessages}
                              onUpdate={scrollToBottom}
                            />
                          ) : (
                            msg.content || ''
                          )}
                          {isAssistant && msg.id in streamingMessages && (
                            <span style={{ opacity: 0.5, marginLeft: 4 }}></span>
                          )}
                        </div>
                      </div>
                      {!isUser && !isAssistant && <Avatar src={senderAvatar} size={32} />}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <div
            style={{
              padding: '16px',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? intl.formatMessage({ id: 'components.aiAssistant.listening' }) : intl.formatMessage({ id: 'components.aiAssistant.inputPlaceholder' })}
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={sending}
                style={{ flex: 1 }}
              />
              <Button
                type={isListening ? "primary" : "default"}
                danger={isListening}
                icon={isListening ? <AudioMutedOutlined /> : <AudioOutlined />}
                onClick={handleToggleListen}
                disabled={sending}
                title={isListening ? intl.formatMessage({ id: 'components.aiAssistant.stopRecording' }) : intl.formatMessage({ id: 'components.aiAssistant.voiceInput' })}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isListening) {
                    recognitionRef.current?.stop();
                    setIsListening(false);
                  }
                  handleSendMessage();
                }}
                loading={sending}
                disabled={!inputValue.trim() || sending}
              >
                {intl.formatMessage({ id: 'components.aiAssistant.send' })}
              </Button>
            </div>
            {isListening && (
              <div style={{ fontSize: '12px', color: '#ff4d4f', textAlign: 'center', animation: 'pulse 1.5s infinite' }}>
                <style>{`
                  @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                  }
                `}</style>
                {intl.formatMessage({ id: 'components.aiAssistant.recording' })}
              </div>
            )}
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
