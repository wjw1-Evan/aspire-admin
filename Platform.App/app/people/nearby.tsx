import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useNearbyUsers } from '@/hooks/useNearbyUsers';
import { useChat } from '@/contexts/ChatContext';

const formatDistance = (distance: number) => {
  if (distance < 1000) {
    return `${Math.round(distance)} 米`;
  }
  return `${(distance / 1000).toFixed(1)} 公里`;
};

export default function NearbyScreen() {
  const router = useRouter();
  const { setActiveSession } = useChat();
  const { nearbyUsers, loading, refresh } = useNearbyUsers();

  const handleStartChat = useCallback(
    (sessionId?: string) => {
      if (sessionId) {
        setActiveSession(sessionId);
        router.push(`/chat/${sessionId}`);
      } else {
        router.push('/(tabs)/chat');
      }
    },
    [router, setActiveSession]
  );

  const renderItem = useCallback(({ item }: { item: typeof nearbyUsers[number] }) => (
    <Pressable style={styles.card} onPress={() => handleStartChat(item.sessionId)}>
      <View style={styles.avatar}>
        <IconSymbol name="mappin.and.ellipse" size={28} />
      </View>
      <View style={styles.cardContent}>
        <ThemedText type="subtitle" style={styles.cardTitle} numberOfLines={1}>
          {item.displayName}
        </ThemedText>
        <ThemedText style={styles.cardSubtitle} numberOfLines={1}>
          距离你 {formatDistance(item.distanceMeters)}
        </ThemedText>
        {item.interests && item.interests.length > 0 && (
          <ThemedText style={styles.cardTag} numberOfLines={1}>
            兴趣：{item.interests.join('、')}
          </ThemedText>
        )}
      </View>
      <IconSymbol name="chevron.right" size={18} />
    </Pressable>
  ), [handleStartChat]);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={nearbyUsers}
        keyExtractor={item => item.userId}
        renderItem={renderItem}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="location.slash" size={48} />
              <ThemedText style={styles.emptyTitle}>附近暂时没有活跃用户</ThemedText>
              <ThemedText style={styles.emptySubtitle}>稍后再刷新或扩大搜索范围</ThemedText>
            </View>
          )
        }
        refreshing={loading}
        onRefresh={() => refresh()}
        contentContainerStyle={nearbyUsers.length === 0 ? styles.emptyContainer : undefined}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    opacity: 0.75,
  },
  cardTag: {
    marginTop: 6,
    fontSize: 12,
    color: '#2563eb',
  },
  loader: {
    marginTop: 32,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
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


