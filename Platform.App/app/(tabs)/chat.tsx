import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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
    const unreadBadge = session.unreadCount > 0;
    const currentUserKey = user?.id ?? user?.username;

    const participants = session.participants
      .map(participant => ({
        id: participant,
        name: session.participantNames?.[participant] ?? participant,
      }))
      .filter(participant => participant.name);

    const remoteParticipantEntries = participants.filter(participant => participant.id !== currentUserKey);
    const remoteParticipants = remoteParticipantEntries
      .map(participant => participant.name)
      .filter((name, index, array) => array.indexOf(name) === index);
    const primaryParticipantId = remoteParticipantEntries[0]?.id ?? participants[0]?.id;
    const primaryAvatar = primaryParticipantId ? session.participantAvatars?.[primaryParticipantId] : undefined;

    const sessionTitle =
      remoteParticipants.length === 0
        ? session.topicTags?.[0] ?? session.id
        : remoteParticipants.length === 1
          ? remoteParticipants[0]
          : remoteParticipants.length <= 3
            ? remoteParticipants.join('、')
            : `${remoteParticipants.slice(0, 3).join('、')} 等${remoteParticipants.length}人`;

    const groupSubtitle =
      remoteParticipants.length > 1 ? `成员：${remoteParticipants.join('、')}` : undefined;

    const lastSenderId = lastMessage?.senderId ?? session.lastMessageSenderId;
    const lastSenderName =
      lastSenderId === currentUserKey
        ? '我'
        : (lastSenderId ? session.participantNames?.[lastSenderId] ?? lastSenderId : undefined);

    let preview: string;
    if (lastMessage?.attachment) {
      preview = lastMessage.attachment.mimeType?.startsWith('image/')
        ? '[图片]'
        : `[附件] ${lastMessage.attachment.name}`;
    } else if (lastMessage?.type === 'system') {
      preview = lastMessage.content ?? '[系统消息]';
    } else if (lastMessage?.content) {
      preview = lastMessage.content;
    } else if (session.lastMessageExcerpt) {
      preview = session.lastMessageExcerpt;
    } else {
      preview = '暂无消息';
    }

    const previewText = lastSenderName ? `${lastSenderName}: ${preview}` : preview;

    return (
      <Pressable
        onPress={() => handlePressSession(session.id)}
        android_ripple={{ color: theme.colors.highlight }}
        style={({ pressed }) => [
          styles.sessionItem,
          {
            backgroundColor: pressed ? theme.colors.highlight : theme.colors.listBackground,
            borderBottomColor: theme.colors.divider,
          },
        ]}
      >
        <View style={[styles.sessionAvatar, { backgroundColor: theme.colors.accentMuted }]}>
          {primaryAvatar ? (
            <Image source={{ uri: primaryAvatar }} style={styles.sessionAvatarImage} cachePolicy="memory-disk" />
          ) : (
            <IconSymbol name="person.2.fill" size={28} color={theme.colors.accent} />
          )}
        </View>
        <View style={styles.sessionContent}>
          <View style={styles.sessionHeader}>
            <ThemedText type="bodyStrong" style={styles.sessionTitle} numberOfLines={1}>
              {sessionTitle}
            </ThemedText>
            <ThemedText style={[styles.sessionTime, { color: theme.colors.tertiaryText }]}>
              {formatTimestamp(lastMessage?.createdAt ?? session.lastMessageAt ?? session.updatedAt)}
            </ThemedText>
          </View>
          {groupSubtitle ? (
            <ThemedText style={[styles.sessionSubtitle, { color: theme.colors.secondaryText }]} numberOfLines={1}>
              {groupSubtitle}
            </ThemedText>
          ) : null}
          <ThemedText type="caption" style={[styles.sessionPreview, { color: theme.colors.secondaryText }]} numberOfLines={1}>
            {previewText}
          </ThemedText>
        </View>
        {unreadBadge && (
          <View style={[styles.unreadBadge, { backgroundColor: theme.colors.danger }]}>
            <ThemedText style={[styles.unreadText, { color: theme.colors.accentContrastText }]}>{session.unreadCount}</ThemedText>
          </View>
        )}
      </Pressable>
    );
  }, [handlePressSession, sessions, theme.colors.accent, theme.colors.accentContrastText, theme.colors.accentMuted, theme.colors.danger, theme.colors.divider, theme.colors.highlight, theme.colors.listBackground, theme.colors.secondaryText, theme.colors.tertiaryText, user?.id, user?.username]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={[styles.navBar, { backgroundColor: theme.colors.navBar, borderBottomColor: theme.colors.navBorder }]}>
        <ThemedText type="headline" style={styles.navTitle}>
          对话
        </ThemedText>
        <View style={styles.navActions}>
          <Pressable onPress={() => router.push('/(tabs)/contacts')} hitSlop={8}>
            <IconSymbol name="plus.circle" size={22} color={theme.colors.accent} />
          </Pressable>
        </View>
      </View>
      <FlatList
        data={sessionOrder}
        keyExtractor={item => item}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={sessionsLoading}
            onRefresh={() => loadSessions()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        contentContainerStyle={sessionOrder.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="bubble.left.and.bubble.right" size={48} color={theme.colors.icon} />
            <ThemedText type="headline">暂无会话</ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: theme.colors.secondaryText }]}>去附近或推荐页面寻找新朋友吧</ThemedText>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider }} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: {
    fontWeight: '700',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sessionAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
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
  sessionSubtitle: {
    fontSize: 12,
    marginBottom: 2,
  },
  sessionTitle: {
    fontWeight: '600',
  },
  sessionTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  sessionPreview: {
    fontSize: 13,
    opacity: 0.8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
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
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
});


