import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { FloatButton, App, Input, Button, Card, Avatar, Spin } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined, AudioOutlined, AudioMutedOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import { marked } from 'marked';
import {
  getOrCreateAssistantSession,
  sendMessage,
  getMessages,
} from '@/services/chat/api';
import { useSseConnection } from '@/hooks/useSseConnection';
import type { ChatMessage, ChatSession } from '@/services/chat/api';
import { AI_ASSISTANT_ID, AI_ASSISTANT_NAME, AI_ASSISTANT_AVATAR } from '@/constants/ai';

const { TextArea } = Input;

/**
 * AI 助手组件
 * 使用流式接口发送消息并接收 AI 回复（统一接口）
 */
/**
 * 打字机效果内容组件
 */
const TypewriterContent: React.FC<{ content: string; isStreaming: boolean; onUpdate?: () => void }> = ({
  content,
  isStreaming,
  onUpdate,
}) => {
  const [displayContent, setDisplayContent] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

    // 如果流式内容比当前显示的内容多，则逐步更新
    if (content.length > displayContent.length) {
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setDisplayContent((prev) => {
          if (prev.length < content.length) {
            const next = content.slice(0, prev.length + 1);
            return next;
          }
          if (timerRef.current) clearInterval(timerRef.current);
          return prev;
        });
      }, 20); // 20ms 一个字符，比较平滑
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [content, isStreaming]);

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
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const initialInputValueRef = useRef<string>('');
  const currentTranscriptRef = useRef<string>('');

  // 对话框尺寸状态
  const [dialogSize, setDialogSize] = useState({ width: 400, height: 600 });

  // 初始化全局 SSE 连接 (用于监听通知、会话更新等实时事件)
  const sse = useSseConnection({
    autoConnect: true,
    onError: (err) => console.warn('[AiAssistant] 全局 SSE 异常:', err),
  });

  // 监听 chat-response 事件（AI 回复）
  useEffect(() => {
    if (!session?.id || !open) return;

    const unsubscribe = sse.on<any>('chat-response', (data) => {
      if (!data) return;
      console.log('[AiAssistant] 收到 chat-response:', data);

      if (data.message) {
        // 用户消息
        setMessages((prev) => {
          const updated = [...prev, data.message];
          return updated.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        });
      }

      if (data.sessionId === session.id) {
        // AI 回复开始
        if (data.type === 'AssistantMessageStart' && data.message) {
          const assistantMessage = data.message;
          setStreamingMessages((prev) => ({ ...prev, [assistantMessage.id]: '' }));
          setMessages((prev) => {
            const existingIndex = prev.findIndex((m) => m.id === assistantMessage.id);
            if (existingIndex >= 0) return prev;
            return [...prev, assistantMessage].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
          });
        }

        // AI 回复增量
        if (data.type === 'AssistantMessageChunk' && data.messageId && data.delta) {
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
               recipientId: currentUser?.id || '',
                type: 'Text',
                content: '',
                createdAt: new Date().toISOString(),
              };
              return [...prev, tempMessage].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
            }
            return prev;
          });
        }

        // AI 回复完成
        if (data.type === 'AssistantMessageComplete' && data.message) {
          const completedMessage = data.message;
          setStreamingMessages((prev) => {
            const { [completedMessage.id]: _, ...rest } = prev;
            return rest;
          });
          setMessages((prev) => {
            const messageIndex = prev.findIndex((m) => m.id === completedMessage.id);
            let updated: ChatMessage[];
            if (messageIndex >= 0) {
              updated = [...prev];
              updated[messageIndex] = completedMessage;
            } else {
              updated = [...prev, completedMessage];
            }
            return updated.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
          });
        }
      }

      if (data.error) {
        console.error('[AiAssistant] 发送消息失败:', data.error);
        message.error('发送消息失败: ' + data.error);
      }
    });

    return unsubscribe;
  }, [session?.id, open, sse, currentUser, message]);

  useEffect(() => {
    if (!open) return;
  }, [sse, open, session?.id]);
  const dialogRef = useRef<HTMLDivElement>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  // 存储正在流式传输的消息内容（messageId -> content）
  // 注意：使用状态而不是 ref，确保更新时触发重新渲染
  // 使用普通对象而不是 Map，确保 React 能正确检测变化
  const [streamingMessages, setStreamingMessages] = useState<Record<string, string>>({});

  const isValidObjectId = useCallback((id?: string) => !!id && /^[a-fA-F0-9]{24}$/.test(id), []);

  // 组件卸载时强制清理所有全局监听器，防止面板未关闭即跳转导致的内存泄漏
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
   * 初始化会话
   */
  const initializeSession = useCallback(async () => {
    if (!currentUser || initialized) return;

    setLoading(true);
    try {
      const assistantSession = await getOrCreateAssistantSession();
      if (assistantSession) {
        setSession(assistantSession);
        await loadMessages(assistantSession.id);
      }
    } catch (error) {
      // 初始化失败
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
      if (!isValidObjectId(sessionId)) {
        return;
      }
      const response = await getMessages(sessionId, { limit: 50 });
      // 按创建时间排序，确保消息按时间顺序显示
      const sortedMessages = [...response.items].sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      });
      setMessages(sortedMessages);
    } catch (error) {
      // 加载失败
    }
  }, [isValidObjectId]);


  /**
   * 发送消息
   */
  const handleSendMessage = useCallback(async (contentOverride?: string) => {
    const userMessage = (contentOverride ?? inputValue).trim();

    console.log('[AiAssistant] handleSendMessage 被调用', {
      userMessage,
      sending,
      currentUser: !!currentUser,
    });

    // 注意：用户ID由后端从token中获取，前端只需要检查用户是否登录
    if (!userMessage || sending || !currentUser) {
      console.log('[AiAssistant] 发送消息被阻止:', {
        hasInput: !!userMessage,
        isSending: sending,
        hasUser: !!currentUser,
      });
      return;
    }

    setInputValue('');
    console.log('[AiAssistant] 开始发送消息流程, userMessage:', userMessage);
    let currentSession = session;

    if (!currentSession) {
      try {
        console.log('[AiAssistant] 会话不存在，正在尝试获取或创建助手会话...');
        const assistantSession = await getOrCreateAssistantSession();
        console.log('[AiAssistant] getOrCreateAssistantSession 结果:', assistantSession);
        if (assistantSession) {
          currentSession = assistantSession;
          setSession(assistantSession);
        } else {
          console.error('[AiAssistant] 无法获取或创建助手会话');
          message.error('会话不存在，请刷新页面重试');
          setSending(false);
          return;
        }
      } catch (error) {
        console.error('[AiAssistant] 获取或创建助手会话异常:', error);
        message.error('无法发送消息：会话不存在');
        setSending(false);
        return;
      }
    }

    // 先添加用户消息到界面（乐观更新）
    // 注意：senderId 用于前端显示，实际发送时后端会从token中获取用户ID
    // 这里使用临时ID，等后端返回真实消息后再替换
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
      // 先添加用户消息到界面（乐观更新）
      setMessages((prev) => [...prev, optimisticMessage]);

// 发送消息（通过 SSE 接收 AI 回复）
      console.log('[AiAssistant] 发送消息到后端:', userMessage);

      try {
        // 调用 sendMessage 发送用户消息
        const sentMessage = await sendMessage({
          sessionId: currentSession.id,
          type: 'Text',
          content: userMessage,
          recipientId: AI_ASSISTANT_ID,
        });

        // 替换临时消息为真实消息
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== optimisticMessage.id);
          const updated = [...filtered, sentMessage];
          return updated.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        });
      } catch (error) {
        console.error('[AiAssistant] 发送消息失败:', error);
        message.error('发送消息失败');
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      } finally {
        setSending(false);
      }
    } catch (error) {
      console.error('[AiAssistant] 发送��息异常:', error);
      message.error('发送消息失败');
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
      message.error('当前浏览器不支持语音识别');
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
        // 关键修复：每次从头构建当前会话的完整转录
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        currentTranscriptRef.current = transcript;
        // 将初始值与当前完整转录合并
        setInputValue(initialInputValueRef.current + transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        if (event.error === 'not-allowed') {
          message.error('请允许访问麦克风以使用语音输入');
        } else {
          message.error('语音识别出错: ' + event.error);
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
      initialInputValueRef.current = inputValue; // 记录开始录音时的输入框内容
      currentTranscriptRef.current = '';
      recognitionRef.current.start();
    } catch (e) {
      console.error('启动语音识别失败:', e);
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
        // 如果正在录音，先停止录音
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
   * 打开对话窗口时加载消息
   */
  useEffect(() => {
    const sid = session?.id;
    const valid = sid && isValidObjectId(sid);

    if (open && initialized && valid) {
      loadMessages(sid!);
    }
  }, [open, session?.id, initialized, loadMessages, isValidObjectId]);

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
        // 如果有流式内容，优先使用流式内容（用于 AI 消息）
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
        // 按创建时间排序，确保消息按时间顺序显示
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      });
  }, [messages, streamingMessages]);

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
          ref={dialogRef}
          style={{
            width: dialogSize.width,
            height: dialogSize.height,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            position: 'relative',
            resize: 'none', // 禁用默认的 resize
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
          {/* 左侧调整宽度手柄 */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const startX = e.clientX;
              const startWidth = dialogSize.width;

              const handleMouseMove = (e: MouseEvent) => {
                const diffX = startX - e.clientX; // 向左拖拽增加宽度
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

              // 🛡️ 容错处理：记录到全局以便卸载时强制清理
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
          {/* 上边调整高度手柄 */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const startY = e.clientY;
              const startHeight = dialogSize.height;

              const handleMouseMove = (e: MouseEvent) => {
                const diffY = startY - e.clientY; // 向上拖拽增加高度
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

              // 🛡️ 容错处理
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

          {/* 左上角调整宽度和高度手柄 */}
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const startX = e.clientX;
              const startY = e.clientY;
              const startWidth = dialogSize.width;
              const startHeight = dialogSize.height;

              const handleMouseMove = (e: MouseEvent) => {
                const diffX = startX - e.clientX; // 向左拖拽增加宽度
                const diffY = startY - e.clientY; // 向上拖拽增加高度

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

              // 🛡️ 容错处理
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
                {displayMessages.map((msg, idx) => {
                  const isAssistant = msg.senderId === AI_ASSISTANT_ID;
                  // 判断是否为当前用户的消息（用于前端显示）
                  // 注意：实际用户ID由后端从token中获取，这里只是用于前端显示判断
                  const currentUserId = currentUser?.id;
                  const isUser = currentUserId && msg.senderId === currentUserId;

                  return (
                    <div
                      key={msg.id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: isAssistant ? 'flex-start' : 'flex-end',
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                        }}
                      >
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
                              content={msg.content || ''}
                              isStreaming={msg.id in streamingMessages}
                              onUpdate={scrollToBottom}
                            />
                          ) : (
                            msg.content || ''
                          )}
                          {isAssistant && msg.id in streamingMessages && (
                            <span style={{ opacity: 0.5, marginLeft: 4 }}>▊</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}


              </>
            )}
          </div>

          {/* 输入框 */}
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
                placeholder={isListening ? "正在聆听..." : "输入消息..."}
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
                title={isListening ? "停止录音" : "语音输入"}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[AiAssistant] 发送按钮被点击');
                  if (isListening) {
                    recognitionRef.current?.stop();
                    setIsListening(false);
                  }
                  handleSendMessage();
                }}
                loading={sending}
                disabled={!inputValue.trim() || sending}
              >
                发送
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
                正在录音，请说话...
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
