import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import type { AiSuggestion } from '@/types/ai';

interface AiSuggestionBarProps {
  readonly suggestions: AiSuggestion[];
  readonly onSelect: (suggestion: AiSuggestion) => void;
  readonly loading?: boolean;
}

const AiSuggestionBar: React.FC<AiSuggestionBarProps> = ({ suggestions, onSelect, loading }) => {
  if (loading || suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol name="sparkles" size={18} />
        <ThemedText style={styles.headerText}>智能推荐</ThemedText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {suggestions.map(suggestion => (
          <View key={suggestion.id} style={styles.chip}>
            <ThemedText numberOfLines={1} style={styles.chipText} onPress={() => onSelect(suggestion)}>
              {suggestion.content}
            </ThemedText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
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
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
  },
});

export default AiSuggestionBar;


