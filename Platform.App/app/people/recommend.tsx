import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WeChatCard } from '@/components/ui/wx-card';
import { useTheme } from '@/contexts/ThemeContext';
import { aiService } from '@/services/ai';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import type { MatchSuggestion } from '@/types/ai';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function RecommendScreen() {
  const { user } = useAuth();
  const { setActiveSession } = useChat();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const cardColor = theme.colors.card;
  const accentColor = theme.colors.accent;
  const avatarBackground = theme.colors.accentMuted;
  const badgeTextColor = theme.colors.accentContrastText;
  const mutedColor = theme.colors.secondaryText;
  const retryBackground = theme.colors.cardMuted;
  const backgroundColor = theme.colors.background;

  const loadSuggestions = useCallback(async () => {
    if (!user?.id && !user?.username) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.getMatchSuggestions({
        userId: user?.id ?? user?.username ?? '',
        limit: 20,
      });
      setSuggestions(response.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取推荐失败');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.username]);

  useEffect(() => {
    loadSuggestions().catch(() => undefined);
  }, [loadSuggestions]);

  const handleStartChat = useCallback((suggestion: MatchSuggestion) => {
    if (!suggestion.sessionId) {
      router.push('/(tabs)/chat');
      return;
    }
    setActiveSession(suggestion.sessionId);
    router.push(`/chat/${suggestion.sessionId}`);
  }, [router, setActiveSession]);

  const renderItem = useCallback(({ item }: { item: MatchSuggestion }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? theme.colors.highlight : cardColor,
          borderColor: theme.colors.divider,
        },
      ]}
      onPress={() => handleStartChat(item)}
    >
      <View style={[styles.avatarPlaceholder, { backgroundColor: avatarBackground }]}>
        <IconSymbol name="person.crop.circle" size={36} color={accentColor} />
      </View>
      <View style={styles.cardContent}>
        <ThemedText type="bodyStrong" style={styles.cardTitle} numberOfLines={1}>
          {item.displayName}
        </ThemedText>
        {item.bio && (
          <ThemedText type="caption" style={[styles.cardSubtitle, { color: mutedColor }]} numberOfLines={2}>
            {item.bio}
          </ThemedText>
        )}
        {item.sharedInterests && item.sharedInterests.length > 0 && (
          <ThemedText type="footnote" style={[styles.cardTag, { color: accentColor }]} numberOfLines={1}>
            共同兴趣：{item.sharedInterests.join('、')}
          </ThemedText>
        )}
      </View>
      <View style={[styles.scoreBadge, { backgroundColor: accentColor }]}>
        <ThemedText style={[styles.scoreText, { color: badgeTextColor }]}>{Math.round(item.matchScore * 100)}%</ThemedText>
      </View>
    </Pressable>
  ), [accentColor, avatarBackground, badgeTextColor, cardColor, handleStartChat, mutedColor, theme.colors.divider, theme.colors.highlight]);

  return (
    <ThemedView style={[styles.container, { backgroundColor, paddingTop: insets.top }]}>
      <View style={[styles.navBar, { backgroundColor: theme.colors.navBar, borderBottomColor: theme.colors.navBorder }]}>
        <Pressable
          style={styles.navButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/explore')}
          accessibilityRole="button"
          accessibilityLabel="返回"
        >
          <IconSymbol name="chevron.left" size={20} color={theme.colors.icon} />
        </Pressable>
        <ThemedText type="headline">智能推荐</ThemedText>
        <View style={styles.navPlaceholder} />
      </View>

      {loading && suggestions.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={accentColor} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.centered}>
          <ThemedText style={[styles.errorText, { color: mutedColor }]}>{error}</ThemedText>
          <Pressable style={[styles.retryButton, { backgroundColor: retryBackground }]} onPress={() => loadSuggestions()}>
            <ThemedText>重试</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {!error ? (
        <FlatList
          data={suggestions}
          keyExtractor={item => item.userId}
          renderItem={renderItem}
          contentContainerStyle={suggestions.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol name="sparkles" size={48} color={accentColor} />
              <ThemedText type="headline" style={styles.emptyTitle}>暂无推荐</ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: mutedColor }]}>稍后再试，或完善个人信息提高匹配度。</ThemedText>
            </View>
          }
          refreshing={loading}
          onRefresh={() => loadSuggestions()}
        />
      ) : null}
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
  navPlaceholder: {
    width: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
  scoreBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 12,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});


