import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import type { AiSuggestion } from '@/types/ai';
import { useTheme } from '@/contexts/ThemeContext';

interface AiSuggestionBarProps {
  readonly suggestions: AiSuggestion[];
  readonly onSelect: (suggestion: AiSuggestion) => void;
  readonly loading?: boolean;
  readonly onRefresh?: () => void;
  readonly collapsed?: boolean;
  readonly onToggleCollapse?: () => void;
  readonly notice?: string;
}

const AiSuggestionBar: React.FC<AiSuggestionBarProps> = ({
  suggestions,
  onSelect,
  loading,
  onRefresh,
  collapsed = false,
  onToggleCollapse,
  notice,
}) => {
  const { theme } = useTheme();
  const cardBackground = theme.colors.card;
  const borderColor = theme.colors.border;
  const accentColor = theme.colors.accent;
  const categoryBackground = theme.mode === 'light' ? '#EEF7EB' : '#163022';
  const categoryColor = theme.mode === 'light' ? theme.colors.accent : '#6EE7B7';

  const shouldRenderLoader = Boolean(loading);

  const containerShadowStyle = Platform.select({
    ios: {
      shadowColor: theme.mode === 'light' ? '#00000014' : '#00000066',
      shadowOpacity: theme.mode === 'light' ? 0.12 : 0.28,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    android: {
      elevation: 3,
    },
    web: {
      boxShadow:
        theme.mode === 'light'
          ? '0 12px 32px rgba(15, 23, 42, 0.08)'
          : '0 14px 36px rgba(15, 23, 42, 0.45)',
    },
    default: {},
  });

  const cardShadowStyle = Platform.select({
    ios: {
      shadowColor: theme.mode === 'light' ? '#0000001a' : '#00000075',
      shadowOpacity: theme.mode === 'light' ? 0.16 : 0.32,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow:
        theme.mode === 'light'
          ? '0 16px 36px rgba(15, 23, 42, 0.12)'
          : '0 18px 40px rgba(15, 23, 42, 0.5)',
    },
    default: {},
  });

  return (
    <View style={[styles.container, { backgroundColor: cardBackground, borderColor }, containerShadowStyle]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol name="sparkles" size={18} color={theme.colors.icon} />
          <ThemedText type="caption" style={styles.headerText}>智能推荐</ThemedText>
        </View>
        <View style={styles.headerActions}>
          {onToggleCollapse ? (
            <Pressable
              style={({ pressed }) => [
                styles.iconButton,
                {
                  borderColor,
                  backgroundColor: theme.mode === 'light' ? '#F8F9FB' : '#1F2933',
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              onPress={onToggleCollapse}
              accessibilityRole="button"
              accessibilityLabel={collapsed ? '展开智能推荐' : '收起智能推荐'}
            >
              <IconSymbol name={collapsed ? 'chevron.down' : 'chevron.up'} size={16} color={theme.colors.icon} />
            </Pressable>
          ) : null}
          {onRefresh ? (
          <Pressable
            style={({ pressed }) => [
              styles.iconButton,
              {
                borderColor,
                backgroundColor: theme.mode === 'light' ? '#F8F9FB' : '#1F2933',
                opacity: shouldRenderLoader ? 0.6 : pressed ? 0.75 : 1,
              },
            ]}
            onPress={onRefresh}
            disabled={shouldRenderLoader}
            accessibilityRole="button"
            accessibilityLabel="刷新智能推荐"
          >
            <IconSymbol name="arrow.clockwise" size={16} color={accentColor} />
          </Pressable>
          ) : null}
        </View>
      </View>

      {collapsed ? null : (
        <>
          {shouldRenderLoader ? (
            <View style={styles.streamingRow}>
              <ActivityIndicator size="small" color={accentColor} />
              <ThemedText style={styles.streamingText} numberOfLines={2}>
                小科正在为你准备对话建议，请稍等…
              </ThemedText>
            </View>
          ) : null}
          {suggestions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {suggestions.map(suggestion => {
                const category =
                  suggestion.category ??
                  (suggestion.metadata?.category as string | undefined) ??
                  '智能推荐';
                const styleLabel =
                  suggestion.style ?? (suggestion.metadata?.style as string | undefined);
                const quickTip =
                  suggestion.quickTip ?? (suggestion.metadata?.quickTip as string | undefined);

                return (
                  <Pressable
                    key={suggestion.id}
                    onPress={() => onSelect(suggestion)}
                    style={({ pressed }) => [
                      styles.card,
                      {
                        backgroundColor: cardBackground,
                        borderColor,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                      cardShadowStyle,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`发送推荐回复：${suggestion.content}`}
                    accessibilityHint="单击后将该推荐内容填入输入框"
                  >
                    <View style={[styles.categoryChip, { backgroundColor: categoryBackground }]}>
                      <IconSymbol name="sparkles" size={14} color={categoryColor} />
                      <ThemedText style={[styles.categoryText, { color: categoryColor }]} numberOfLines={1}>
                        {category}
                      </ThemedText>
                      {styleLabel ? (
                        <ThemedText style={[styles.styleText, { color: categoryColor }]} numberOfLines={1}>
                          · {styleLabel}
                        </ThemedText>
                      ) : null}
                    </View>
                    <ThemedText style={styles.contentText} numberOfLines={2}>
                      {suggestion.content}
                    </ThemedText>
                    {quickTip ? (
                      <View style={styles.tipRow}>
                        <IconSymbol name="lightbulb" size={14} color={theme.colors.secondaryText} />
                        <ThemedText
                          style={[styles.tipText, { color: theme.colors.secondaryText }]}
                          numberOfLines={2}
                        >
                          {quickTip}
                        </ThemedText>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : shouldRenderLoader ? null : (
            <View style={[styles.placeholder, { borderColor }]}>
              <IconSymbol name="lightbulb.fill" size={18} color={theme.colors.secondaryText} />
              <ThemedText style={styles.placeholderTitle}>{notice ? '提示' : '暂无智能推荐'}</ThemedText>
              <ThemedText style={[styles.placeholderSubtitle, { color: theme.colors.secondaryText }]}>
                {notice
                  ? notice
                  : onRefresh
                    ? '点击右侧刷新按钮，获取新的对话灵感'
                    : '发送消息后，小科会在这里提供接话建议'}
              </ThemedText>
            </View>
          )}
        </>
      )}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingBottom: 4,
    gap: 12,
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
  placeholder: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  card: {
    width: 190,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 10,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  styleText: {
    fontSize: 11,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});

export default AiSuggestionBar;


