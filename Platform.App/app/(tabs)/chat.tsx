import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) {
    return '';
  }
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export default function ChatTabScreen() {
  const {
    sessions,
    sessionOrder,
    sessionsLoading,
    loadSessions,
    setActiveSession,
  } = useChat();
  const { user } = useAuth();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadSessions().catch(error => console.error('Failed to load sessions:', error));
    }, [loadSessions])
  );

  const handlePressSession = useCallback((sessionId: string) => {
    setActiveSession(sessionId);
    router.push(`/chat/${sessionId}`);
  }, [router, setActiveSession]);

  const renderItem = useCallback(({ item }: { item: string }) => {
    const session = sessions[item];
    if (!session) {
      return null;
    }

    const lastMessage = session.lastMessage;
    const preview =
      lastMessage?.content ??
      (lastMessage?.attachment
        ? `[附件] ${lastMessage.attachment.name}`
        : session.lastMessageExcerpt ?? '暂无消息');
    const unreadBadge = session.unreadCount > 0;
    const remotePeers = session.participants
      .filter(participant => participant !== (user?.id ?? user?.username))
      .map(participant => session.participantNames?.[participant] ?? participant);

    return (
      <Pressable style={styles.sessionItem} onPress={() => handlePressSession(session.id)}>
        <View style={styles.sessionAvatar}>
          <IconSymbol name="person.2.fill" size={28} />
        </View>
        <View style={styles.sessionContent}>
          <View style={styles.sessionHeader}>
            <ThemedText type="subtitle" style={styles.sessionTitle} numberOfLines={1}>
              {remotePeers[0] ?? session.topicTags?.[0] ?? session.id}
            </ThemedText>
            <ThemedText style={styles.sessionTime}>
              {formatTimestamp(lastMessage?.createdAt ?? session.lastMessageAt ?? session.updatedAt)}
            </ThemedText>
          </View>
          <ThemedText style={styles.sessionPreview} numberOfLines={1}>
            {preview}
          </ThemedText>
        </View>
        {unreadBadge && (
          <View style={styles.unreadBadge}>
            <ThemedText style={styles.unreadText}>{session.unreadCount}</ThemedText>
          </View>
        )}
      </Pressable>
    );
  }, [handlePressSession, sessions, user?.id, user?.username]);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sessionOrder}
        keyExtractor={item => item}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={sessionsLoading} onRefresh={() => loadSessions()} />
        }
        contentContainerStyle={sessionOrder.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="bubble.left.and.bubble.right" size={48} />
            <ThemedText style={styles.emptyTitle}>暂无会话</ThemedText>
            <ThemedText style={styles.emptySubtitle}>去附近或推荐页面寻找新朋友吧</ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  sessionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionContent: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  sessionTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  sessionPreview: {
    fontSize: 14,
    opacity: 0.7,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  unreadText: {
    fontSize: 12,
    color: '#fff',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
});


