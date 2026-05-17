import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
  Animated, Easing,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-native-markdown-display';
import Toast from 'react-native-toast-message';

import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { xiaokeService } from '../../services/xiaokeService';
import { sseService } from '../../services/sseService';
import {
  ChatMessage,
  ChatSession,
  SendChatMessageRequest,
  ChatMessageChunkPayload,
  ASSISTANT_USER_ID,
} from '../../types/xiaoke';

const SUGGESTIONS = [
  '你好',
  '帮我分析一下数据',
  '今天有什么任务',
];

function TypingDots() {
  const { colors } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const anim1 = animate(dot1, 0);
    const anim2 = animate(dot2, 200);
    const anim3 = animate(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  const opacity = (dot: Animated.Value) =>
    dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4 }}>
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSecondary, marginRight: 4, opacity: opacity(dot1) }} />
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSecondary, marginRight: 4, opacity: opacity(dot2) }} />
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSecondary, opacity: opacity(dot3) }} />
    </View>
  );
}

export default function XiaokeChatScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    messagesContainer: {
      flex: 1,
    },
    messagesContent: {
      paddingHorizontal: AppStyles.spacing.md,
      paddingTop: AppStyles.spacing.md,
      paddingBottom: AppStyles.spacing.sm,
    },
    messageRow: {
      marginBottom: AppStyles.spacing.md,
      flexDirection: 'row',
    },
    userMessageRow: {
      justifyContent: 'flex-end',
    },
    aiMessageRow: {
      justifyContent: 'flex-start',
    },
    avatarContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: AppStyles.spacing.sm,
      alignSelf: 'flex-end',
    },
    avatarText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    bubbleWrapper: {
      maxWidth: '78%',
    },
    userBubble: {
      backgroundColor: colors.primary,
      borderRadius: 18,
      borderBottomRightRadius: 4,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    aiBubble: {
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      borderBottomLeftRadius: 4,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userBubbleText: {
      fontSize: 16,
      color: colors.white,
      lineHeight: 22,
    },
    aiBubbleText: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
    },
    senderName: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 4,
      marginLeft: 2,
    },
    errorBubble: {
      borderColor: colors.error,
      borderWidth: 1,
    },
    retryButton: {
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
    },
    retryText: {
      fontSize: 13,
      color: colors.error,
      marginLeft: 4,
      fontWeight: '500',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: AppStyles.spacing.xl,
      paddingBottom: 60,
    },
    emptyAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: AppStyles.spacing.md,
    },
    emptyTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: AppStyles.spacing.sm,
    },
    emptyDesc: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: AppStyles.spacing.lg,
    },
    suggestionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: AppStyles.spacing.sm,
      paddingHorizontal: AppStyles.spacing.lg,
    },
    suggestionChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    suggestionChipText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
    },
    inputContainer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: AppStyles.spacing.md,
      paddingVertical: AppStyles.spacing.sm,
      paddingBottom: insets.bottom > 0 ? insets.bottom : AppStyles.spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    inputWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: colors.background,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 8 : 4,
      marginRight: AppStyles.spacing.sm,
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      maxHeight: 100,
      paddingVertical: 10,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
  }), [colors, insets.bottom]);

  const markdownStyles = useMemo(() => ({
    body: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 22,
    },
    heading1: { fontSize: 20, fontWeight: '700' as const, color: colors.text, marginBottom: 8, marginTop: 4 },
    heading2: { fontSize: 18, fontWeight: '700' as const, color: colors.text, marginBottom: 6, marginTop: 4 },
    heading3: { fontSize: 16, fontWeight: '600' as const, color: colors.text, marginBottom: 4, marginTop: 4 },
    paragraph: { marginVertical: 2, lineHeight: 22 },
    link: { color: colors.primary, textDecorationLine: 'underline' as const },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: 12,
      marginVertical: 6,
      opacity: 0.8,
    },
    code_inline: {
      backgroundColor: isDark ? '#333' : '#f0f0f0',
      color: colors.text,
      paddingHorizontal: 4,
      borderRadius: 3,
      fontSize: 14,
    },
    code_block: {
      backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
      color: colors.text,
      padding: 12,
      borderRadius: 8,
      marginVertical: 6,
      fontSize: 13,
      fontFamily: 'monospace',
    },
    fence: {
      backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5',
      color: colors.text,
      padding: 12,
      borderRadius: 8,
      marginVertical: 6,
      fontSize: 13,
      fontFamily: 'monospace',
    },
    table: { borderWidth: 1, borderColor: colors.border, marginVertical: 6 },
    th: { padding: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, fontWeight: '600' as const },
    td: { padding: 8, borderWidth: 1, borderColor: colors.border },
    hr: { marginVertical: 10, backgroundColor: colors.border, height: 1 },
    list_item: { marginVertical: 2, lineHeight: 22 },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
  }), [colors, isDark]);

  const scrollRef = useRef<ScrollView>(null);
  const sessionIdRef = useRef<string>('');
  const streamingIdRef = useRef<string | null>(null);
  const isInitialLoad = useRef(true);

  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiResponding, setAiResponding] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated });
    }, 50);
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => {
      const exists = prev.find(m => m.id === msg.id);
      if (exists) return prev.map(m => m.id === msg.id ? msg : m);
      return [...prev, msg];
    });
  }, []);

  const initChat = useCallback(async () => {
    try {
      setLoading(true);
      const res = await xiaokeService.getAssistantSession();
      if (!res.success || !res.data) {
        Toast.show({
          type: 'error',
          text1: t('common.error'),
          text2: res.message || t('common.network_error'),
          position: 'top',
          visibilityTime: 3000,
        });
        setLoading(false);
        return;
      }
      const sessionData = res.data;
      setSession(sessionData);
      sessionIdRef.current = sessionData.id;

      sseService.setChatHandlers({
        onReceiveMessage: (payload: { sessionId: string; message: ChatMessage }) => {
          if (payload.sessionId !== sessionIdRef.current) return;
          const msg = payload.message;
          if (msg.senderId !== ASSISTANT_USER_ID) return;
          const isStreaming = msg.metadata?.streaming === true;
          if (isStreaming) {
            setAiResponding(true);
            streamingIdRef.current = msg.id;
          } else {
            setMessages(prev => {
              const idx = prev.findIndex(m => m.id === msg.id);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = msg;
                return updated;
              }
              return [...prev, msg];
            });
            setAiResponding(false);
            streamingIdRef.current = null;
          }
        },
        onMessageChunk: (data: ChatMessageChunkPayload) => {
          if (data.sessionId !== sessionIdRef.current) return;
          setMessages(prev => {
            const idx = prev.findIndex(m => m.id === data.messageId);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                content: (updated[idx].content || '') + data.delta,
              };
              return updated;
            }
            streamingIdRef.current = data.messageId;
            return [...prev, {
              id: data.messageId,
              sessionId: data.sessionId,
              senderId: ASSISTANT_USER_ID,
              senderName: '小科',
              type: 'Text',
              content: data.delta,
              isRecalled: false,
              createdAt: new Date().toISOString(),
            }];
          });
          if (data.delta) {
            setAiResponding(false);
          }
        },
        onMessageComplete: (payload: { sessionId: string; message: ChatMessage }) => {
          if (payload.sessionId !== sessionIdRef.current) return;
          const msg = payload.message;
          setAiResponding(false);
          streamingIdRef.current = null;
          setMessages(prev => {
            const idx = prev.findIndex(m => m.id === msg.id);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = msg;
              return updated;
            }
            return [...prev, msg];
          });
        },
      });
      sseService.ensureConnected();

      const msgRes = await xiaokeService.getMessages(sessionData.id, { limit: 50 });
      if (msgRes.success && msgRes.data) {
        setMessages(msgRes.data.items);
      }
      setLoading(false);

    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: err?.message || t('common.network_error'),
        position: 'top',
        visibilityTime: 3000,
      });
      setLoading(false);
    }
  }, [t, addMessage]);

  useEffect(() => {
    initChat();
    return () => {
      sseService.clearChatHandlers();
    };
  }, []);

  useEffect(() => {
    if (!loading && shouldAutoScroll && messages.length > 0) {
      scrollToBottom(!isInitialLoad.current);
      isInitialLoad.current = false;
    }
  }, [messages, shouldAutoScroll, scrollToBottom, loading]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending || !session || aiResponding) return;

    setInputText('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempId,
      sessionId: session.id,
      senderId: '',
      senderName: '',
      type: 'Text',
      content: text,
      isRecalled: false,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);

    try {
      const payload: SendChatMessageRequest = {
        sessionId: session.id,
        type: 'Text',
        content: text,
        clientMessageId: tempId,
      };
      const res = await xiaokeService.sendMessage(payload);
      if (res.success && res.data) {
        setMessages(prev => prev.map(m => m.id === tempId ? res.data! : m));
      } else {
        setMessages(prev => prev.map(m =>
          m.id === tempId ? { ...m, isRecalled: true } : m,
        ));
        Toast.show({
          type: 'error',
          text1: t('common.error'),
          text2: res.message || t('common.network_error'),
          position: 'top',
          visibilityTime: 3000,
        });
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, isRecalled: true } : m,
      ));
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: err?.message || t('common.network_error'),
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setSending(false);
    }
  }, [inputText, sending, session, aiResponding, t, addMessage]);

  const handleRetry = useCallback(async (failedMsg: ChatMessage) => {
    if (!session) return;
    setMessages(prev => prev.filter(m => m.id !== failedMsg.id));
    setInputText(failedMsg.content || '');
  }, [session]);

  const handleNewChat = useCallback(async () => {
    try {
      const res = await xiaokeService.createNewAssistantSession();
      if (res.success && res.data) {
        setSession(res.data);
        sessionIdRef.current = res.data.id;
        setMessages([]);
        streamingIdRef.current = null;
        setAiResponding(false);
        scrollToBottom(false);
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: err?.message || t('common.network_error'),
        position: 'top',
        visibilityTime: 3000,
      });
    }
  }, [t, scrollToBottom]);

  const handleSuggestion = useCallback((text: string) => {
    setInputText(text);
  }, []);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 60;
    setShouldAutoScroll(atBottom);
  }, []);

  const isResponding = aiResponding || sending;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: '小科' }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 14 }}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '小科',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleNewChat}
              style={{ marginRight: 4 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 && !aiResponding ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.emptyContainer}>
              <View style={styles.emptyAvatar}>
                <Ionicons name="chatbubbles" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>小科</Text>
              <Text style={styles.emptyDesc}>
                你好！我是小科，你的智能AI助手。{'\n'}有什么可以帮助你的吗？
              </Text>
              <View style={styles.suggestionRow}>
                {SUGGESTIONS.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestion(s)}
                  >
                    <Text style={styles.suggestionChipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const isUser = msg.senderId !== ASSISTANT_USER_ID;
              const isFailed = msg.isRecalled && isUser;

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.userMessageRow : styles.aiMessageRow,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarText}>科</Text>
                    </View>
                  )}
                  <View style={styles.bubbleWrapper}>
                    {!isUser && (
                      <Text style={styles.senderName}>小科</Text>
                    )}
                    <View
                      style={[
                        isUser ? styles.userBubble : styles.aiBubble,
                        isFailed && styles.errorBubble,
                      ]}
                    >
                      {isUser ? (
                        <Text style={styles.userBubbleText} selectable>
                          {msg.content}
                        </Text>
                      ) : (
                        <Markdown style={markdownStyles}>
                          {msg.content || ''}
                        </Markdown>
                      )}
                    </View>
                    {isFailed && (
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => handleRetry(msg)}
                      >
                        <Ionicons name="refresh" size={14} color={colors.error} />
                        <Text style={styles.retryText}>重试</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
            {aiResponding && (
              <View style={[styles.messageRow, styles.aiMessageRow]}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>科</Text>
                </View>
                <View style={styles.bubbleWrapper}>
                  <Text style={styles.senderName}>小科</Text>
                  <View style={styles.aiBubble}>
                    <TypingDots />
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="输入消息..."
              placeholderTextColor={colors.textTertiary}
              multiline
              editable={!isResponding}
              onContentSizeChange={() => scrollToBottom()}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isResponding) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isResponding}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons
                name="arrow-up"
                size={22}
                color={colors.white}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
