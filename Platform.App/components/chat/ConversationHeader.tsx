import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ChatSession } from '@/types/chat';
import { HubConnectionState } from '@microsoft/signalr';

interface ConversationHeaderProps {
  readonly session: ChatSession;
  readonly connectionState?: HubConnectionState;
  readonly onStartCall?: () => void;
  readonly onMore?: () => void;
  readonly onBack?: () => void;
  readonly title?: string;
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
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  const displayTitle = title || session.topicTags?.[0] || `会话 ${session.id.slice(0, 6)}`;
  const peersDescription = session.participants.join('、');
  const stateLabel =
    connectionState !== undefined ? connectionStateText[connectionState] : undefined;

  return (
    <ThemedView style={styles.container}>
      <Pressable onPress={handleBack} style={styles.iconButton} hitSlop={12}>
        <IconSymbol name="chevron.left" size={22} />
      </Pressable>
      <View style={styles.infoContainer}>
        <ThemedText type="subtitle" style={styles.title} numberOfLines={1}>
          {displayTitle}
        </ThemedText>
        <ThemedText style={styles.subtitle} numberOfLines={1}>
          {peersDescription}
        </ThemedText>
        {stateLabel && (
          <ThemedText style={styles.connection} numberOfLines={1}>
            {stateLabel}
          </ThemedText>
        )}
      </View>
      <View style={styles.actions}>
        {onStartCall && (
          <Pressable onPress={onStartCall} style={styles.iconButton} hitSlop={12}>
            <IconSymbol name="phone.fill" size={20} />
          </Pressable>
        )}
        {onMore && (
          <Pressable onPress={onMore} style={styles.iconButton} hitSlop={12}>
            <IconSymbol name="ellipsis" size={20} />
          </Pressable>
        )}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  connection: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
  },
});

export default ConversationHeader;


