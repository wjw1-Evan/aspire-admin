import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ChatSession } from '@/types/chat';
import { HubConnectionState } from '@microsoft/signalr';
import { useTheme } from '@/contexts/ThemeContext';

interface ConversationHeaderProps {
  readonly session: ChatSession;
  readonly connectionState?: HubConnectionState;
  readonly onStartCall?: () => void;
  readonly onMore?: () => void;
  readonly onBack?: () => void;
  readonly title?: string;
  readonly subtitle?: string;
}

const connectionStateText: Record<HubConnectionState, string> = {
  [HubConnectionState.Disconnected]: '未连接',
  [HubConnectionState.Connecting]: '连接中',
  [HubConnectionState.Connected]: '实时连接已建立',
  [HubConnectionState.Reconnecting]: '正在重新连接',
  [HubConnectionState.Disconnecting]: '正在断开连接',
};

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  session,
  connectionState,
  onStartCall,
  onMore,
  onBack,
  title,
  subtitle,
}) => {
  const router = useRouter();
  const { theme } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  const displayTitle = title || session.topicTags?.[0] || `会话 ${session.id.slice(0, 6)}`;
  const peersDescription =
    subtitle ||
    session.participants
      .map(participant => session.participantNames?.[participant] ?? participant)
      .join('、');
  const stateLabel =
    connectionState !== undefined && connectionState !== HubConnectionState.Connected
      ? connectionStateText[connectionState]
      : undefined;

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.navBar, borderBottomColor: theme.colors.navBorder }]}>
      <View style={styles.side}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
          <IconSymbol name="chevron.left" size={22} color={theme.colors.icon} />
          <ThemedText style={[styles.backLabel, { color: theme.colors.secondaryText }]}>返回</ThemedText>
        </Pressable>
      </View>
      <View style={styles.center}>
        <ThemedText type="headline" style={styles.title} numberOfLines={1}>
          {displayTitle}
        </ThemedText>
        {peersDescription ? (
          <ThemedText type="caption" style={[styles.subtitle, { color: theme.colors.secondaryText }]} numberOfLines={1}>
            {peersDescription}
          </ThemedText>
        ) : null}
        {stateLabel ? (
          <ThemedText style={[styles.connection, { color: theme.colors.secondaryText }]} numberOfLines={1}>
            {stateLabel}
          </ThemedText>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideRight]}>
        {onStartCall ? (
          <Pressable onPress={onStartCall} style={styles.iconButton} hitSlop={12}>
            <IconSymbol name="phone.fill" size={20} color={theme.colors.icon} />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
        <Pressable onPress={onMore} style={styles.iconButton} hitSlop={12}>
          <IconSymbol name="ellipsis" size={20} color={theme.colors.icon} />
        </Pressable>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: 84,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backLabel: {
    fontSize: 16,
  },
  title: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
  connection: {
    fontSize: 11,
    marginTop: 2,
  },
  iconButton: {
    padding: 6,
  },
  placeholder: {
    width: 32,
  },
});

export default ConversationHeader;

