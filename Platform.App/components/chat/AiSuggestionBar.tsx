import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import type { AiSuggestion } from '@/types/ai';
import { useThemeColor } from '@/hooks/useThemeColor';

interface AiSuggestionBarProps {
  readonly suggestions: AiSuggestion[];
  readonly onSelect: (suggestion: AiSuggestion) => void;
  readonly loading?: boolean;
  readonly streamingText?: string;
}

const AiSuggestionBar: React.FC<AiSuggestionBarProps> = ({
  suggestions,
  onSelect,
  loading,
  streamingText,
}) => {
  const cardBackground = useThemeColor({ light: '#ffffff', dark: '#1f2937' }, 'card');
  const chipBackground = useThemeColor({ light: '#f3f4f6', dark: '#374151' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#111827' }, 'border');
  const accentColor = useThemeColor({}, 'tint');

  const hasStreaming = Boolean(streamingText && streamingText.trim().length > 0);
  const shouldRenderLoader = loading || hasStreaming;

  if (!shouldRenderLoader && suggestions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: cardBackground, borderColor }]}>
      <View style={styles.header}>
        <IconSymbol name="sparkles" size={18} />
        <ThemedText style={styles.headerText}>智能推荐</ThemedText>
      </View>
      {shouldRenderLoader ? (
        <View style={styles.streamingRow}>
          <ActivityIndicator size="small" color={accentColor} />
          <ThemedText style={styles.streamingText} numberOfLines={2}>
            {streamingText && streamingText.trim().length > 0
              ? streamingText.trim()
              : '正在生成智能推荐…'}
          </ThemedText>
        </View>
      ) : null}
      {suggestions.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {suggestions.map(suggestion => (
            <View key={suggestion.id} style={[styles.chip, { backgroundColor: chipBackground }]}>
              <ThemedText numberOfLines={1} style={styles.chipText} onPress={() => onSelect(suggestion)}>
                {suggestion.content}
              </ThemedText>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    shadowColor: '#00000010',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 4,
  },
  streamingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  streamingText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
  },
});

export default AiSuggestionBar;


