import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { FloatButton, App, Input, Button, Card, Avatar, Spin } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { useModel } from '@umijs/max';
import {
  getOrCreateAssistantSession,
  sendMessageWithStreaming,
  getMessages,
  type ChatMessage,
  type ChatSession,
} from '@/services/chat/api';
import { AI_ASSISTANT_ID, AI_ASSISTANT_NAME, AI_ASSISTANT_AVATAR } from '@/constants/ai';

const { TextArea } = Input;

/**
 * AI 助手组件
 * 使用流式接口发送消息并接收 AI 回复（统一接口）
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

  // 对话框尺寸状态
  const [dialogSize, setDialogSize] = useState({ width: 400, height: 600 });
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
  const handleSendMessage = useCallback(async () => {
    console.log('[AiAssistant] handleSendMessage 被调用', {
      inputValue: inputValue.trim(),
      sending,
      currentUser: !!currentUser,
    });

    // 注意：用户ID由后端从token中获取，前端只需要检查用户是否登录
    if (!inputValue.trim() || sending || !currentUser) {
      console.log('[AiAssistant] 发送消息被阻止:', {
        hasInput: !!inputValue.trim(),
        isSending: sending,
        hasUser: !!currentUser,
      });
      return;
    }

    console.log('[AiAssistant] 开始发送消息流程');
    let currentSession = session;

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
        message.error('无法发送消息：会话不存在');
        return;
      }
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setSending(true);

    // 先添加用户消息到界面（乐观更新）
    // 注意：senderId 用于前端显示，实际发送时后端会从token中获取用户ID
    // 这里使用临时ID，等后端返回真实消息后再替换
    const tempUserId = currentUser.userid || (currentUser as any)?.id || 'temp-user';
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

      // 使用流式接口发送消息并接收 AI 回复
      console.log('[AiAssistant] 发送消息到后端（流式）:', userMessage);

      // 保存会话 ID，用于回调中验证
      const sessionIdForCallbacks = currentSession.id;

      let userMessageId: string | null = null;
      let assistantMessageId: string | null = null;

      await sendMessageWithStreaming(
        {
          sessionId: currentSession.id,
          type: 'Text',
          content: userMessage,
          recipientId: AI_ASSISTANT_ID,
        },
        {
          // 用户消息已保存
          onUserMessage: (sentMessage) => {
            console.log('[AiAssistant] 用户消息已保存，消息ID:', sentMessage.id);
            userMessageId = sentMessage.id;
            // 替换临时消息为真实消息，并保持排序
            setMessages((prev) => {
              const filtered = prev.filter((msg) => msg.id !== optimisticMessage.id && msg.id !== sentMessage.id);
              const updated = [...filtered, sentMessage];
              // 按创建时间排序
              return updated.sort((a, b) => {
                const timeA = new Date(a.createdAt || 0).getTime();
                const timeB = new Date(b.createdAt || 0).getTime();
                return timeA - timeB;
              });
            });
          },
          // AI 回复开始
          onAssistantStart: (assistantMessage) => {
            console.log('[AiAssistant] AI 回复开始，消息ID:', assistantMessage.id);
            assistantMessageId = assistantMessage.id;
            // 初始化流式内容缓存
            setStreamingMessages((prev) => ({
              ...prev,
              [assistantMessage.id]: assistantMessage.content || '',
            }));
            // 添加 AI 消息到界面，并保持排序
            setMessages((prev) => {
              const existingIndex = prev.findIndex((m) => m.id === assistantMessage.id);
              if (existingIndex >= 0) {
                return prev;
              }
              const updated = [...prev, assistantMessage];
              // 按创建时间排序
              return updated.sort((a, b) => {
                const timeA = new Date(a.createdAt || 0).getTime();
                const timeB = new Date(b.createdAt || 0).getTime();
                return timeA - timeB;
              });
            });
          },
          // AI 回复增量内容
          onAssistantChunk: (sessionId, messageId, delta) => {
            if (!sessionIdForCallbacks || sessionId !== sessionIdForCallbacks || !messageId) {
              return;
            }
            console.log('[AiAssistant] 收到流式增量内容:', { sessionId, messageId, delta, deltaLength: delta.length });

            // 累积流式内容（使用状态，确保触发重新渲染）
            setStreamingMessages((prev) => {
              const currentContent = prev[messageId] || '';
              const newContent = currentContent + delta;
              console.log('[AiAssistant] 收到流式增量，消息ID:', messageId, '增量长度:', delta.length, '累积长度:', newContent.length);
              return {
                ...prev,
                [messageId]: newContent,
              };
            });

            // 确保消息在列表中（如果不在，创建临时消息）
            // 注意：实际内容从 streamingMessages 状态读取，在 useMemo 中合并
            setMessages((prev) => {
              const messageIndex = prev.findIndex((m) => m.id === messageId);
              if (messageIndex < 0) {
                // 如果消息不在列表中，创建一个临时消息用于显示流式内容
                // 这可能在 onAssistantStart 之前发生
                const tempMessage: ChatMessage = {
                  id: messageId,
                  sessionId: sessionId,
                  senderId: AI_ASSISTANT_ID,
                  recipientId: (currentUser?.userid || (currentUser as any)?.id) || '',
                  type: 'Text',
                  content: '', // 初始为空，useMemo 会从 streamingMessages 读取最新值
                  createdAt: new Date().toISOString(),
                };
                const updated = [...prev, tempMessage];
                // 按创建时间排序
                return updated.sort((a, b) => {
                  const timeA = new Date(a.createdAt || 0).getTime();
                  const timeB = new Date(b.createdAt || 0).getTime();
                  return timeA - timeB;
                });
              }
              // 如果消息已存在，不需要更新（useMemo 会从 streamingMessages 读取最新值）
              return prev;
            });
          },
          // AI 回复完成
          onAssistantComplete: (completedMessage) => {
            console.log('[AiAssistant] AI 回复完成，消息ID:', completedMessage.id);
            // 清除流式内容缓存
            setStreamingMessages((prev) => {
              const { [completedMessage.id]: _, ...rest } = prev;
              return rest;
            });
            // 更新完整消息，并保持排序
            setMessages((prev) => {
              const messageIndex = prev.findIndex((m) => m.id === completedMessage.id);
              let updated: ChatMessage[];
              if (messageIndex >= 0) {
                updated = [...prev];
                updated[messageIndex] = completedMessage;
              } else {
                updated = [...prev, completedMessage];
              }
              // 按创建时间排序
              return updated.sort((a, b) => {
                const timeA = new Date(a.createdAt || 0).getTime();
                const timeB = new Date(b.createdAt || 0).getTime();
                return timeA - timeB;
              });
            });
          },
          // 错误处理
          onError: (error) => {
            console.error('[AiAssistant] 发送消息失败:', error);
            message.error('发送消息失败: ' + error);
            setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
          },
        }
      );
    } catch (error) {
      console.error('[AiAssistant] 发送消息异常:', error);
      message.error('发送消息失败');
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
                  const currentUserId = currentUser?.userid || (currentUser as any)?.id;
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
                          {msg.content || ''}
                          {isAssistant && msg.id in streamingMessages && (
                            <span style={{ opacity: 0.5 }}>▊</span>
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[AiAssistant] 发送按钮被点击');
                handleSendMessage();
              }}
              loading={sending}
              disabled={!inputValue.trim() || sending}
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
