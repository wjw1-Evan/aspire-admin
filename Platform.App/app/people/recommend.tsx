import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { aiService } from '@/services/ai';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import type { MatchSuggestion } from '@/types/ai';

export default function RecommendScreen() {
  const { user } = useAuth();
  const { setActiveSession } = useChat();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);

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
    <Pressable style={styles.card} onPress={() => handleStartChat(item)}>
      <View style={styles.avatarPlaceholder}>
        <IconSymbol name="person.crop.circle" size={36} />
      </View>
      <View style={styles.cardContent}>
        <ThemedText type="subtitle" style={styles.cardTitle} numberOfLines={1}>
          {item.displayName}
        </ThemedText>
        {item.bio && (
          <ThemedText style={styles.cardSubtitle} numberOfLines={2}>
            {item.bio}
          </ThemedText>
        )}
        {item.sharedInterests && item.sharedInterests.length > 0 && (
          <ThemedText style={styles.cardTag} numberOfLines={1}>
            共同兴趣：{item.sharedInterests.join('、')}
          </ThemedText>
        )}
      </View>
      <View style={styles.scoreBadge}>
        <ThemedText style={styles.scoreText}>{Math.round(item.matchScore * 100)}%</ThemedText>
      </View>
    </Pressable>
  ), [handleStartChat]);

  if (loading && suggestions.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable style={styles.retryButton} onPress={() => loadSuggestions()}>
          <ThemedText>重试</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={suggestions}
        keyExtractor={item => item.userId}
        renderItem={renderItem}
        contentContainerStyle={suggestions.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol name="sparkles" size={48} />
            <ThemedText style={styles.emptyTitle}>暂无推荐</ThemedText>
            <ThemedText style={styles.emptySubtitle}>稍后再试，或完善个人信息提高匹配度。</ThemedText>
          </View>
        }
        refreshing={loading}
        onRefresh={() => loadSuggestions()}
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
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0f2fe',
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
  scoreBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 12,
  },
  scoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});


