import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';

export interface WeChatListItemProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: IconSymbolName;
  readonly rightIcon?: IconSymbolName | ReactNode;
  readonly onPress?: () => void;
  readonly disabled?: boolean;
  readonly children?: ReactNode;
}

export function WeChatListItem({
  title,
  description,
  icon,
  rightIcon = 'chevron.right',
  onPress,
  disabled = false,
  children,
}: WeChatListItemProps) {
  const { theme } = useTheme();

  const content = (
    <View style={[styles.container, { borderColor: theme.colors.divider }]}> 
      {icon ? (
        <View style={[styles.iconWrapper, { backgroundColor: theme.colors.accentMuted }]}> 
          <IconSymbol name={icon} size={20} color={theme.colors.accent} />
        </View>
      ) : null}
      <View style={styles.textContainer}>
        <ThemedText type="body" style={styles.title}>
          {title}
        </ThemedText>
        {description ? (
          <ThemedText type="caption" lightColor={theme.colors.secondaryText} darkColor={theme.colors.secondaryText}>
            {description}
          </ThemedText>
        ) : null}
        {children}
      </View>
      {typeof rightIcon === 'string' ? (
        <IconSymbol name={rightIcon} size={16} color={theme.colors.secondaryText} />
      ) : (
        rightIcon ?? null
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        android_ripple={{ color: theme.colors.highlight }}
        style={({ pressed }) => [
          { backgroundColor: pressed ? theme.colors.highlight : theme.colors.listBackground },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={{ backgroundColor: theme.colors.listBackground }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontWeight: '600',
  },
});
