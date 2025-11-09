import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WeChatCard } from '@/components/ui/wx-card';
import { useNearbyUsers } from '@/hooks/useNearbyUsers';
import { useChat } from '@/contexts/ChatContext';
import { useTheme } from '@/contexts/ThemeContext';
import { NEARBY_SEARCH_DEFAULT_RADIUS } from '@/services/apiConfig';

const formatDistance = (distance: number) => {
  if (distance < 1000) {
    return `${Math.round(distance)} 米`;
  }
  return `${(distance / 1000).toFixed(1)} 公里`;
};

const formatRelativeTime = (input?: string | Date | null) => {
  if (!input) {
    return '刚刚活跃';
  }

  const timestamp = input instanceof Date ? input.getTime() : Date.parse(input);
  if (Number.isNaN(timestamp)) {
    return '刚刚活跃';
  }

  const diffMs = Date.now() - timestamp;
  if (diffMs < 60 * 1000) {
    return '刚刚活跃';
  }

  const diffMinutes = Math.round(diffMs / (60 * 1000));
  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前活跃`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小时前活跃`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} 天前活跃`;
};

export default function NearbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setActiveSession } = useChat();
  const { nearbyUsers, loading, refresh } = useNearbyUsers();

  const radiusRef = useRef<number>(NEARBY_SEARCH_DEFAULT_RADIUS);
  const [radius, setRadius] = useState(radiusRef.current);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const screenBackground = theme.colors.background;
  const cardBackground = theme.colors.card;
  const borderColor = theme.colors.divider;
  const avatarBackground = theme.colors.accentMuted;
  const accentColor = theme.colors.accent;
  const mutedColor = theme.colors.secondaryText;
  const chipInactiveBackground = theme.colors.cardMuted;
  const chipInactiveBorder = 'transparent';
  const chipInactiveText = theme.colors.secondaryText;

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

  const handleRefresh = useCallback(
    async (nextRadius?: number) => {
      if (loading && nextRadius === undefined) {
        return;
      }

      const effectiveRadius = nextRadius ?? radiusRef.current;
      if (nextRadius != null) {
        radiusRef.current = nextRadius;
        setRadius(nextRadius);
      }

      try {
        const result = await refresh({ radiusMeters: effectiveRadius });
        if (result) {
          setLastRefreshAt(new Date());
        }
      } catch (error) {
        console.error('Failed to refresh nearby users:', error);
      }
    },
    [loading, refresh]
  );

  useEffect(() => {
    void handleRefresh(radiusRef.current);
  }, [handleRefresh]);

  const radiusOptions = useMemo(
    () => [
      { label: '500 米', value: 500 },
      { label: '1 公里', value: 1000 },
      { label: '2 公里', value: 2000 },
      { label: '5 公里', value: 5000 },
    ],
    []
  );

  const renderHeader = useMemo(() => {
    return (
      <WeChatCard style={styles.headerCard}>
        <View style={styles.headerRow}>
          <ThemedText type="headline">发现附近的人</ThemedText>
          <Pressable style={styles.refreshButton} onPress={() => void handleRefresh()} disabled={loading}>
            <IconSymbol name="arrow.clockwise" size={18} color={accentColor} />
            <ThemedText type="footnote" style={{ color: accentColor }}>
              {loading ? '刷新中…' : '刷新'}
            </ThemedText>
          </Pressable>
        </View>
        <ThemedText type="caption" style={{ color: mutedColor }}>
          {lastRefreshAt ? `上次刷新 ${formatRelativeTime(lastRefreshAt)}` : '首次加载定位后可查看附近的人'}
        </ThemedText>
        <View style={styles.radiusRow}>
          {radiusOptions.map(option => {
            const isActive = radius === option.value;
            return (
              <Pressable
                key={option.value}
                style={[
                  styles.radiusChip,
                  {
                    backgroundColor: isActive ? accentColor : chipInactiveBackground,
                    borderColor: isActive ? accentColor : chipInactiveBorder,
                  },
                ]}
                onPress={() => void handleRefresh(option.value)}
                disabled={loading && isActive}
              >
                <ThemedText type="caption" style={{ color: isActive ? theme.colors.accentContrastText : chipInactiveText }}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </WeChatCard>
    );
  }, [accentColor, chipInactiveBackground, chipInactiveBorder, chipInactiveText, handleRefresh, lastRefreshAt, loading, mutedColor, radius, radiusOptions, theme.colors.accentContrastText]);

  const renderItem = useCallback(
    ({ item }: { item: typeof nearbyUsers[number] }) => {
      const lastActiveLabel = formatRelativeTime(item.lastActiveAt);
      const interests = item.interests?.length ? item.interests.join('、') : undefined;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: pressed ? theme.colors.highlight : cardBackground,
              borderColor: borderColor,
            },
          ]}
          onPress={() => handleStartChat(item.sessionId)}
        >
          <View style={[styles.avatar, { backgroundColor: avatarBackground }]}>
            <IconSymbol name="mappin.and.ellipse" size={24} color={accentColor} />
          </View>
          <View style={styles.cardContent}>
            <ThemedText type="bodyStrong" style={styles.cardTitle} numberOfLines={1}>
              {item.displayName}
            </ThemedText>
            <ThemedText type="caption" style={[styles.cardSubtitle, { color: mutedColor }]} numberOfLines={1}>
              距离你 {formatDistance(item.distanceMeters)} · {lastActiveLabel}
            </ThemedText>
            {interests ? (
              <ThemedText type="footnote" style={[styles.cardTag, { color: accentColor }]} numberOfLines={1}>
                兴趣：{interests}
              </ThemedText>
            ) : null}
          </View>
          <IconSymbol name="chevron.right" size={18} color={mutedColor} />
        </Pressable>
      );
    }, [accentColor, avatarBackground, borderColor, cardBackground, handleStartChat, mutedColor, theme.colors.highlight]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: screenBackground, paddingTop: insets.top }]}>
      <View style={[styles.navBar, { backgroundColor: theme.colors.navBar, borderBottomColor: theme.colors.navBorder }]}>
        <Pressable
          style={styles.navButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/explore')}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <IconSymbol name="chevron.left" size={20} color={theme.colors.icon} />
        </Pressable>
        <ThemedText type="headline" style={styles.navTitle}>
          附近的人
        </ThemedText>
        <View style={styles.navPlaceholder} />
      </View>
      <FlatList
        data={nearbyUsers}
        keyExtractor={item => item.userId}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={accentColor} />
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="location.slash" size={48} color={mutedColor} />
              <ThemedText style={styles.emptyTitle}>附近暂时没有活跃用户</ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: mutedColor }]}>稍后再刷新或扩大搜索范围</ThemedText>
            </View>
          )
        }
        refreshing={loading}
        onRefresh={() => void handleRefresh()}
        contentContainerStyle={
          nearbyUsers.length === 0
            ? [styles.listContent, styles.emptyContainer]
            : styles.listContent
        }
        style={{ backgroundColor: screenBackground }}
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navButton: {
    padding: 8,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  navPlaceholder: {
    width: 32,
  },
  listContent: {
    paddingBottom: 24,
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '500',
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radiusChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  radiusChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
  },
  cardTag: {
    fontSize: 12,
    marginTop: 2,
  },
  loader: {
    marginTop: 32,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});
