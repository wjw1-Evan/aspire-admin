import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * 常用表情列表（按类别分组）
 */
const EMOJI_CATEGORIES = [
  {
    name: '表情',
    items: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
  },
  {
    name: '情绪',
    items: ['🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '😎'],
  },
  {
    name: '手势',
    items: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💪'],
  },
  {
    name: '人物',
    items: ['👶', '👦', '👧', '🧒', '👨', '👩', '🧑', '👱‍♂️', '👱', '👱‍♀️', '🧓', '👴', '👵', '🙍', '🙍‍♂️', '🙍‍♀️', '🙎', '🙎‍♂️', '🙎‍♀️', '🙅', '🙅‍♂️', '🙅‍♀️', '🙆', '🙆‍♂️', '🙆‍♀️', '💁', '💁‍♂️', '💁‍♀️', '🙋', '🙋‍♂️'],
  },
  {
    name: '心形',
    items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  },
  {
    name: '动物',
    items: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇'],
  },
  {
    name: '食物',
    items: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞'],
  },
  {
    name: '符号',
    items: ['✅', '❌', '⭕', '❎', '💯', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '🔳', '🔲', '▪️', '▫️', '◾', '◽'],
  },
];

interface EmojiPickerProps {
  readonly onEmojiSelected: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelected }) => {
  const { theme } = useTheme();
  const containerBackground = theme.colors.listBackground;
  const borderColor = theme.colors.border;
  const textColor = theme.colors.text;
  const pressedBackground = theme.colors.highlight;
  const categoryTextColor = theme.colors.secondaryText;

  const handleEmojiPress = useCallback(
    (emoji: string) => {
      onEmojiSelected(emoji);
    },
    [onEmojiSelected]
  );

  const renderEmojiItem = useCallback(
    ({ item }: { item: string }) => (
      <Pressable
        style={({ pressed }) => [
          styles.emojiItem,
          { backgroundColor: pressed ? pressedBackground : 'transparent' },
        ]}
        onPress={() => handleEmojiPress(item)}
        hitSlop={4}
      >
        <ThemedText style={styles.emojiText}>{item}</ThemedText>
      </Pressable>
    ),
    [handleEmojiPress, pressedBackground]
  );

  const renderCategory = useCallback(
    ({ item: category }: { item: (typeof EMOJI_CATEGORIES)[0] }) => (
      <View style={styles.categoryContainer}>
        <ThemedText style={[styles.categoryTitle, { color: categoryTextColor }]} type="caption">
          {category.name}
        </ThemedText>
        <FlatList
          data={category.items}
          renderItem={renderEmojiItem}
          keyExtractor={(emoji, index) => `${category.name}-${emoji}-${index}`}
          numColumns={8}
          scrollEnabled={false}
          contentContainerStyle={styles.emojiGrid}
        />
      </View>
    ),
    [renderEmojiItem, categoryTextColor]
  );

  return (
    <ThemedView
      style={[
        styles.container,
        {
          backgroundColor: containerBackground,
          borderTopColor: borderColor,
        },
      ]}
    >
      <FlatList
        data={EMOJI_CATEGORIES}
        renderItem={renderCategory}
        keyExtractor={category => category.name}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 240,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  emojiGrid: {
    gap: 4,
  },
  emojiItem: {
    width: '12.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 24,
    lineHeight: 28,
  },
});

export default EmojiPicker;

