import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';

interface PageHeaderAction {
  readonly icon: IconSymbolName;
  readonly onPress: () => void;
  readonly hitSlop?: number;
}

interface PageHeaderProps {
  readonly title: string;
  readonly actions?: readonly PageHeaderAction[];
  readonly style?: ViewStyle;
}

/**
 * 统一的页面顶部导航栏组件
 * 参考 chat 页面的样式设计
 */
export function PageHeader({ title, actions, style }: Readonly<PageHeaderProps>) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.navBar,
        {
          backgroundColor: theme.colors.navBar,
          borderBottomColor: theme.colors.navBorder,
        },
        style,
      ]}>
      <ThemedText type="headline" style={styles.navTitle}>
        {title}
      </ThemedText>
      {actions && actions.length > 0 && (
        <View style={styles.navActions}>
          {actions.map((action, index) => (
            <Pressable
              key={index}
              onPress={action.onPress}
              hitSlop={action.hitSlop ?? 8}
            >
              <IconSymbol name={action.icon} size={22} color={theme.colors.accent} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navTitle: {
    fontWeight: '700',
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});

