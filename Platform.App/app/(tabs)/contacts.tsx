import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import type { JSX } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PageHeader } from '@/components/PageHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useChat } from '@/contexts/ChatContext';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';
import type { FriendRequestItem, FriendSearchResult, FriendSummary } from '@/types/friends';
import { AI_ASSISTANT_AVATAR, AI_ASSISTANT_ID, AI_ASSISTANT_NAME } from '@/constants/ai';
import dayjs from 'dayjs';

const errorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
};

const NAV_BAR_HEIGHT = 52;

function FriendRequestItemRow({
  item,
  onApprove,
  onReject,
  disabled,
  accentColor,
  dangerColor,
  mutedColor,
  accentSoftColor,
}: {
  item: FriendRequestItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  disabled?: boolean;
  accentColor: string;
  dangerColor: string;
  mutedColor: string;
  accentSoftColor: string;
}) {
  return (
    <ThemedView style={[styles.requestItem, { backgroundColor: accentSoftColor }] }>
      <View style={styles.requestInfo}>
        <ThemedText style={styles.requestName} numberOfLines={1}>
          {item.requesterDisplayName ?? item.requesterUsername}
        </ThemedText>
        {item.message ? (
          <ThemedText style={[styles.requestMessage, { color: mutedColor }]} numberOfLines={2}>
            {item.message}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.requestActions}>
        <Pressable
          disabled={disabled}
          style={[styles.requestButton, { backgroundColor: accentColor }, disabled && styles.buttonDisabled]}
          onPress={() => onApprove(item.id)}>
          <ThemedText style={styles.requestButtonText}>接受</ThemedText>
        </Pressable>
        <Pressable
          disabled={disabled}
          style={[styles.requestButton, { backgroundColor: dangerColor }, disabled && styles.buttonDisabled]}
          onPress={() => onReject(item.id)}>
          <ThemedText style={styles.requestButtonText}>拒绝</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function FriendSearchCard({
  result,
  onStartChat,
  onSendRequest,
  loading,
  accentColor,
  cardColor,
  mutedColor,
  accentSoftColor,
}: {
  result: FriendSearchResult;
  onStartChat: (userId: string) => void;
  onSendRequest: (userId: string) => void;
  loading?: boolean;
  accentColor: string;
  cardColor: string;
  mutedColor: string;
  accentSoftColor: string;
}) {
  const statusLabel = useMemo(() => {
    if (result.isFriend) {
      return '已是好友';
    }
    if (result.hasPendingRequest) {
      return result.isIncomingRequest ? '对方向你发起请求' : '等待对方确认';
    }
    return null;
  }, [result]);

  return (
    <ThemedView style={[styles.searchCard, { backgroundColor: cardColor }] }>
      <View style={styles.searchCardHeader}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: accentSoftColor }]}>
          <IconSymbol name="person.crop.circle" size={32} color={accentColor} />
        </View>
        <View style={styles.searchCardInfo}>
          <Pressable
            disabled={loading}
            hitSlop={8}
            onPress={() => {
              if (result.isFriend) {
                onStartChat(result.userId);
              } else if (!result.hasPendingRequest) {
                onSendRequest(result.userId);
              }
            }}>
            <ThemedText style={styles.friendName} numberOfLines={1}>
              {result.displayName ?? result.username}
            </ThemedText>
          </Pressable>
          {result.phoneNumber ? (
            <ThemedText style={[styles.friendMeta, { color: mutedColor }]}>{result.phoneNumber}</ThemedText>
          ) : null}
          {statusLabel ? (
            <ThemedText style={[styles.friendMeta, { color: mutedColor }]}>{statusLabel}</ThemedText>
          ) : null}
        </View>
      </View>
      <View style={styles.searchCardActions}>
        {result.isFriend ? (
          <Pressable
            style={[styles.primaryButton, styles.fullWidthButton, { backgroundColor: accentColor }]}
            onPress={() => onStartChat(result.userId)}>
            <ThemedText style={styles.primaryButtonText}>发消息</ThemedText>
          </Pressable>
        ) : result.hasPendingRequest ? (
          <ThemedText style={[styles.pendingText, { color: mutedColor }]}>
            {result.isIncomingRequest ? '请在下方处理好友请求' : '等待对方确认'}
          </ThemedText>
        ) : (
          <Pressable
            disabled={loading}
            style={[
              styles.primaryButton,
              styles.fullWidthButton,
              { backgroundColor: accentColor },
              loading && styles.buttonDisabled,
            ]}
            onPress={() => onSendRequest(result.userId)}>
            <ThemedText style={styles.primaryButtonText}>添加好友</ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );
}

export default function ContactsScreen(): JSX.Element {
  const {
    friends,
    friendsLoading,
    loadFriends,
    refreshFriends,
    incomingRequests,
    outgoingRequests,
    requestsLoading,
    loadRequests,
    approveRequest,
    rejectRequest,
    searchResults,
    searchLoading,
    searchByQuery,
    clearSearch,
    sendFriendRequest,
    ensureSession,
  } = useFriends();

  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [addFriendVisible, setAddFriendVisible] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const router = useRouter();
  const { sessions, loadSessions, setActiveSession, upsertSession } = useChat();
  const { theme } = useTheme();
  const { user, reportError } = useAuth();
  const insets = useSafeAreaInsets();
  const colors = theme.colors;
  const accentSoftColor = colors.accentMuted;
  const currentUserId = useMemo(() => user?.id ?? user?.username ?? '', [user?.id, user?.username]);

  const handleInitialLoad = useCallback(async () => {
    try {
      // 使用 Promise.allSettled 允许部分操作失败
      const [friendsResult, requestsResult] = await Promise.allSettled([
        loadFriends(),
        loadRequests(),
      ]);
      
      if (friendsResult.status === 'rejected') {
        console.error('加载好友列表失败', friendsResult.reason);
      }
      if (requestsResult.status === 'rejected') {
        console.error('加载好友请求失败', requestsResult.reason);
      }
      
      // 如果两个都失败，将错误报告到全局错误处理
      if (friendsResult.status === 'rejected' && requestsResult.status === 'rejected') {
        reportError(friendsResult.reason);
      }
    } catch (error) {
      console.error('加载通讯录失败', error);
      // 错误由全局错误处理统一处理，这里报告错误
      reportError(error);
    }
  }, [loadFriends, loadRequests, reportError]);

  useFocusEffect(
    useCallback(() => {
      void handleInitialLoad();
    }, [handleInitialLoad])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // 使用 Promise.allSettled 允许部分操作失败
      const [friendsResult, requestsResult] = await Promise.allSettled([
        refreshFriends(),
        loadRequests(),
      ]);
      
      if (friendsResult.status === 'rejected') {
        console.error('刷新好友列表失败', friendsResult.reason);
      }
      if (requestsResult.status === 'rejected') {
        console.error('刷新好友请求失败', requestsResult.reason);
      }
      
      // 如果两个都失败，将错误报告到全局错误处理
      if (friendsResult.status === 'rejected' && requestsResult.status === 'rejected') {
        reportError(friendsResult.reason);
      }
    } catch (error) {
      console.error('刷新通讯录失败', error);
      // 错误由全局错误处理统一处理，这里报告错误
      reportError(error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshFriends, loadRequests, reportError]);

  const toggleMenu = useCallback(() => {
    setMenuVisible(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const handleOpenAddFriendModal = useCallback(() => {
    setSearchQuery('');
    setAddFriendVisible(true);
    closeMenu();
  }, [closeMenu]);

  const handleCloseAddFriendModal = useCallback(() => {
    setAddFriendVisible(false);
  }, []);

  const handleQuerySearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) {
      // 这是客户端验证错误，可以保留本地处理
      Alert.alert('提示', '请输入手机号或姓名/用户名');
      return;
    }
    try {
      setHasSearched(true);
      await searchByQuery(query);
    } catch (error) {
      console.error('搜索用户失败', error);
      // 错误由全局错误处理统一处理，这里报告错误
      reportError(error);
    }
  }, [searchByQuery, searchQuery, reportError]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setHasSearched(false);
    clearSearch();
  }, [clearSearch]);

  const handleSendRequest = useCallback(
    async (targetUserId: string) => {
      setSubmitting(true);
      try {
        await sendFriendRequest({ targetUserId });
        // 成功提示可以保留（这是成功消息，不是错误）
        Alert.alert('好友请求已发送', '等待对方确认即可开始聊天');
      } catch (error) {
        console.error('发送好友请求失败', error);
        // 错误由全局错误处理统一处理，这里报告错误
        reportError(error);
      } finally {
        setSubmitting(false);
      }
    },
    [sendFriendRequest, reportError]
  );

  const handleApprove = useCallback(
    async (requestId: string) => {
      try {
        await approveRequest(requestId);
        // 成功提示可以保留（这是成功消息，不是错误）
        Alert.alert('已添加好友', '可以开始聊天啦');
      } catch (error) {
        console.error('接受好友请求失败', error);
        // 错误由全局错误处理统一处理，这里报告错误
        reportError(error);
      }
    },
    [approveRequest, reportError]
  );

  const handleReject = useCallback(
    async (requestId: string) => {
      try {
        await rejectRequest(requestId);
        // 成功提示可以保留（这是成功消息，不是错误）
        Alert.alert('已处理', '已拒绝该好友请求');
      } catch (error) {
        console.error('拒绝好友请求失败', error);
        // 错误由全局错误处理统一处理，这里报告错误
        reportError(error);
      }
    },
    [rejectRequest, reportError]
  );

  const sessionLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    Object.values(sessions).forEach(session => {
      session.participants.forEach(participantId => {
        if (participantId && participantId !== currentUserId && !lookup.has(participantId)) {
          lookup.set(participantId, session.id);
        }
      });
    });
    return lookup;
  }, [currentUserId, sessions]);

  const handleOpenChat = useCallback(
    async (friend: FriendSummary) => {
      try {
        const existingSessionId = friend.sessionId ?? sessionLookup.get(friend.userId);
        const ensuredSession = existingSessionId ? { sessionId: existingSessionId } : await ensureSession(friend.userId);
        const targetSessionId = ensuredSession.sessionId;

        if (!targetSessionId) {
          throw new Error('未能获取到会话标识');
        }

        if (!sessions[targetSessionId]) {
          const now = new Date().toISOString();
          const participantNames: Record<string, string> = {};
          if (currentUserId) {
            participantNames[currentUserId] = user?.displayName ?? user?.username ?? currentUserId;
          }
          participantNames[friend.userId] = friend.displayName ?? friend.username;

          upsertSession({
            id: targetSessionId,
            participants: [currentUserId, friend.userId].filter((id): id is string => Boolean(id)),
            participantNames,
            unreadCounts: currentUserId ? { [currentUserId]: 0 } : {},
            topicTags: friend.displayName ? [friend.displayName] : undefined,
            lastMessageExcerpt: '',
            createdAt: now,
            updatedAt: now,
          });

          await loadSessions();
        }

        setActiveSession(targetSessionId);
        router.push({ pathname: '/chat/[sessionId]', params: { sessionId: targetSessionId } });
      } catch (error) {
        console.error('打开聊天失败', error);
        // 错误由全局错误处理统一处理，这里报告错误
        reportError(error);
      }
    },
    [currentUserId, ensureSession, loadSessions, router, sessionLookup, sessions, setActiveSession, upsertSession, user?.displayName, user?.username, reportError]
  );

  const sortedFriends = useMemo(() => {
    const enrichedFriends = friends.map(friend => ({
      ...friend,
      sessionId: friend.sessionId ?? sessionLookup.get(friend.userId),
    }));

    const assistant = enrichedFriends.find(friend => friend.userId === AI_ASSISTANT_ID);
    const others = enrichedFriends.filter(friend => friend.userId !== AI_ASSISTANT_ID);

    const assistantEntry: FriendSummary =
      assistant ?? {
        userId: AI_ASSISTANT_ID,
        username: AI_ASSISTANT_NAME,
        displayName: AI_ASSISTANT_NAME,
        friendshipId: AI_ASSISTANT_ID,
        sessionId: sessionLookup.get(AI_ASSISTANT_ID),
      };

    return [assistantEntry, ...others];
  }, [friends, sessionLookup]);

  const renderFriendItem = useCallback(({ item }: { item: FriendSummary }) => {
    const isAssistant = item.userId === AI_ASSISTANT_ID;
    return (
      <Pressable style={[styles.friendItem, { borderBottomColor: colors.border }]} onPress={() => handleOpenChat(item)}>
        <View
          style={[styles.avatarPlaceholderSmall, { backgroundColor: accentSoftColor }]}
        >
          {isAssistant ? (
            <Image source={{ uri: AI_ASSISTANT_AVATAR }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <IconSymbol name="person.circle.fill" size={32} color={colors.accent} />
          )}
        </View>
        <View style={styles.friendInfo}>
          <ThemedText style={styles.friendName} numberOfLines={1}>
            {isAssistant ? AI_ASSISTANT_NAME : item.displayName}
          </ThemedText>
          {isAssistant ? (
            <ThemedText style={[styles.friendMeta, styles.assistantMeta, { color: colors.tabIconDefault }]}>内置智能助手 · 系统自动保留</ThemedText>
          ) : (
            <>
              {item.phoneNumber ? (
                <ThemedText style={[styles.friendMeta, { color: colors.tabIconDefault }]}>电话：{item.phoneNumber}</ThemedText>
              ) : null}
              <ThemedText style={[styles.friendMeta, { color: colors.tabIconDefault }]}>添加时间：{dayjs(item.createdAt).format('YYYY-MM-DD')}</ThemedText>
            </>
          )}
        </View>
        <IconSymbol name="chevron.right" size={18} color={colors.icon} />
      </Pressable>
    );
  }, [accentSoftColor, colors, handleOpenChat]);

  const listHeader = useMemo(() => (
    <View>
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText style={styles.sectionTitle}>新的好友</ThemedText>
          {requestsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
        </View>
        {incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
          <ThemedText style={styles.emptyText}>暂无新的好友请求</ThemedText>
        ) : (
          <View>
            {incomingRequests.map(request => (
              <FriendRequestItemRow
                key={request.id}
                item={request}
                onApprove={handleApprove}
                onReject={handleReject}
                disabled={requestsLoading}
                accentColor={colors.success}
                dangerColor={colors.error}
                mutedColor={colors.tabIconDefault}
                accentSoftColor={accentSoftColor}
              />
            ))}
            {outgoingRequests.length > 0 ? (
              <View style={styles.outgoingContainer}>
                <ThemedText style={styles.outgoingTitle}>我发出的请求</ThemedText>
                {outgoingRequests.map(request => (
                  <View key={request.id} style={styles.outgoingItem}>
                    <IconSymbol name="hourglass" size={16} color={colors.icon} />
                    <ThemedText
                      style={[styles.outgoingText, { color: colors.tabIconDefault }]}
                      numberOfLines={1}>
                      已向 {request.targetDisplayName ?? request.targetUsername} 发送请求
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  ), [
    accentSoftColor,
    colors,
    handleApprove,
    handleReject,
    incomingRequests,
    outgoingRequests,
    requestsLoading,
  ]);

  const menuPositionStyle = useMemo(
    () => ({ top: insets.top + NAV_BAR_HEIGHT + 4, right: 16 }),
    [insets.top]
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <PageHeader
        title="通讯录"
        actions={[
          {
            icon: 'plus.circle',
            onPress: toggleMenu,
          },
        ]}
      />

      <FlatList
        data={sortedFriends}
        keyExtractor={item => item.friendshipId || item.userId}
        renderItem={renderFriendItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={
          friendsLoading ? (
            <ActivityIndicator style={styles.loadingIndicator} size="small" color={colors.accent} />
          ) : (
            <ThemedText style={[styles.emptyText, { color: colors.tabIconDefault }]}>还没有好友，快去添加吧～</ThemedText>
          )
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
        onScrollBeginDrag={closeMenu}
        keyboardShouldPersistTaps="handled"
      />

      {menuVisible ? (
        <Pressable style={styles.menuOverlay} onPress={closeMenu}>
          <Pressable
            style={[
              styles.menuContainer,
              menuPositionStyle,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={event => event.stopPropagation()}
          >
            <Pressable style={styles.menuItem} onPress={handleOpenAddFriendModal}>
              <IconSymbol name="person.badge.plus" size={18} color={colors.accent} />
              <ThemedText style={[styles.menuItemText, { color: colors.text }]}>添加好友</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      ) : null}

      <Modal
        visible={addFriendVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAddFriendModal}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseAddFriendModal}>
          <Pressable
            style={[
              styles.addFriendModal,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={event => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>添加好友</ThemedText>
              <Pressable onPress={handleCloseAddFriendModal} hitSlop={8}>
                <IconSymbol name="xmark" size={18} color={colors.tabIconDefault} />
              </Pressable>
            </View>
            <ThemedText style={[styles.modalSubtitle, { color: colors.tabIconDefault }]}>
              请输入手机号或姓名/用户名
            </ThemedText>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="手机 / 姓名 / 用户名"
              placeholderTextColor={colors.tabIconDefault}
              autoCapitalize="none"
              value={searchQuery}
              onChangeText={text => setSearchQuery(text)}
              returnKeyType="search"
              onSubmitEditing={handleQuerySearch}
            />
            <Pressable
              style={[
                styles.modalActionButton,
                { backgroundColor: colors.accent },
                (searchLoading || submitting) && styles.buttonDisabled,
              ]}
              disabled={searchLoading || submitting}
              onPress={handleQuerySearch}
            >
              {searchLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.modalActionButtonText}>搜索</ThemedText>
              )}
            </Pressable>
            {hasSearched ? (
              <View style={styles.modalResults}>
                <ThemedText style={[styles.modalResultsTitle, { color: colors.text }]}>
                  搜索结果
                </ThemedText>
                {searchResults.length > 0 ? (
                  <ScrollView
                    style={[styles.modalResultsList, { borderColor: colors.border }]}
                    contentContainerStyle={styles.modalResultsContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    {searchResults.map(result => (
                      <FriendSearchCard
                        key={`modal-${result.userId}`}
                        result={result}
                        loading={submitting}
                        onStartChat={userId =>
                          handleOpenChat({
                            userId,
                            username: result.username,
                            displayName: result.displayName,
                            phoneNumber: result.phoneNumber,
                            friendshipId: userId,
                          })
                        }
                        onSendRequest={handleSendRequest}
                        accentColor={colors.accent}
                        cardColor={colors.card}
                        mutedColor={colors.tabIconDefault}
                        accentSoftColor={accentSoftColor}
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <ThemedText style={[styles.modalEmptyText, { color: colors.tabIconDefault }]}>
                    未找到符合条件的用户
                  </ThemedText>
                )}
                <Pressable style={styles.clearSearchButton} onPress={handleClearSearch}>
                  <ThemedText style={[styles.clearSearchText, { color: colors.accent }]}>
                    清除搜索结果
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchResults: {
    marginTop: 16,
    gap: 12,
  },
  searchCard: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  searchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchCardInfo: {
    flex: 1,
  },
  searchCardActions: {
    gap: 8,
  },
  clearSearchButton: {
    alignSelf: 'center',
    padding: 6,
  },
  clearSearchText: {
    fontSize: 14,
  },
  searchEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  pendingText: {
    fontSize: 14,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderSmall: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
    gap: 4,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
  },
  friendMeta: {
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
    opacity: 0.1,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 24,
  },
  loadingIndicator: {
    paddingVertical: 20,
  },
  requestItem: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  requestInfo: {
    marginBottom: 12,
    gap: 4,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
  },
  requestMessage: {
    fontSize: 14,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  requestButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  outgoingContainer: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(144,144,159,0.2)',
    paddingTop: 10,
    gap: 8,
  },
  outgoingTitle: {
    fontSize: 14,
  },
  outgoingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  outgoingText: {
    fontSize: 14,
    flex: 1,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    position: 'absolute',
    minWidth: 160,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  addFriendModal: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 12 },
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.12)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalActionButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalResults: {
    gap: 12,
  },
  modalResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalResultsList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    maxHeight: 280,
  },
  modalResultsContent: {
    gap: 12,
  },
  modalEmptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  primaryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: {
    width: '100%',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  assistantMeta: {
    fontWeight: '600',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
  },
});


