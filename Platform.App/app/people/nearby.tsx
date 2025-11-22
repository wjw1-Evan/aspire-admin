import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WeChatCard } from '@/components/ui/wx-card';
import { useNearbyUsers } from '@/hooks/useNearbyUsers';
import { useChat } from '@/contexts/ChatContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
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

// 独立的 Header 组件，使用 React.memo 优化以减少重新渲染
interface NearbyHeaderProps {
  loading: boolean;
  lastRefreshAt: Date | null;
  radius: number;
  radiusOptions: Array<{ label: string; value: number }>;
  onRefresh: () => void;
  onRadiusChange: (radius: number) => void;
  accentColor: string;
  chipInactiveBackground: string;
  chipInactiveBorder: string;
  chipInactiveText: string;
  mutedColor: string;
  accentContrastText: string;
}

const NearbyHeader = React.memo<NearbyHeaderProps>(({
  loading,
  lastRefreshAt,
  radius,
  radiusOptions,
  onRefresh,
  onRadiusChange,
  accentColor,
  chipInactiveBackground,
  chipInactiveBorder,
  chipInactiveText,
  mutedColor,
  accentContrastText,
}) => {
  return (
    <WeChatCard style={styles.headerCard}>
      <View style={styles.headerRow}>
        <ThemedText type="headline">发现附近的人</ThemedText>
        <Pressable style={styles.refreshButton} onPress={onRefresh} disabled={loading}>
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
              onPress={() => onRadiusChange(option.value)}
              disabled={loading && isActive}
            >
              <ThemedText type="caption" style={{ color: isActive ? accentContrastText : chipInactiveText }}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </WeChatCard>
  );
});

NearbyHeader.displayName = 'NearbyHeader';

export default function NearbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { setActiveSession } = useChat();
  const { nearbyUsers, loading, refresh } = useNearbyUsers();
  const { reportError } = useAuth();

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
        // 错误由全局错误处理统一处理，这里报告错误
        reportError(error);
      }
    },
    [loading, refresh, reportError]
  );

  // 只在组件挂载时执行一次初始刷新
  useEffect(() => {
    void handleRefresh(radiusRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const radiusOptions = useMemo(
    () => [
      { label: '500 米', value: 500 },
      { label: '1 公里', value: 1000 },
      { label: '2 公里', value: 2000 },
      { label: '5 公里', value: 5000 },
    ],
    []
  );

  // 使用 ref 存储最新的刷新函数，避免回调函数频繁重新创建
  const handleRefreshRef = useRef(handleRefresh);
  useEffect(() => {
    handleRefreshRef.current = handleRefresh;
  }, [handleRefresh]);

  // 稳定的刷新和半径变更处理函数
  const handleRefreshStable = useCallback(() => {
    void handleRefreshRef.current();
  }, []);

  const handleRadiusChange = useCallback((newRadius: number) => {
    void handleRefreshRef.current(newRadius);
  }, []);

  // 使用 useMemo 缓存 header 组件引用
  const renderHeader = useMemo(
    () => (
      <NearbyHeader
        loading={loading}
        lastRefreshAt={lastRefreshAt}
        radius={radius}
        radiusOptions={radiusOptions}
        onRefresh={handleRefreshStable}
        onRadiusChange={handleRadiusChange}
        accentColor={accentColor}
        chipInactiveBackground={chipInactiveBackground}
        chipInactiveBorder={chipInactiveBorder}
        chipInactiveText={chipInactiveText}
        mutedColor={mutedColor}
        accentContrastText={theme.colors.accentContrastText}
      />
    ),
    [loading, lastRefreshAt, radius, radiusOptions, handleRefreshStable, handleRadiusChange, accentColor, chipInactiveBackground, chipInactiveBorder, chipInactiveText, mutedColor, theme.colors.accentContrastText]
  );

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
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void handleRefresh()}
            tintColor={accentColor}
            colors={[accentColor]}
          />
        }
        contentContainerStyle={styles.listContent}
        style={{ backgroundColor: screenBackground }}
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
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
    flexGrow: 1,
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
