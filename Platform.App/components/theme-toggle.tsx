import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  style?: any;
}

export function ThemeToggle({ size = 'medium', showLabel = false, style }: ThemeToggleProps) {
  const { isDark, toggleTheme, themeMode } = useTheme();
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const getIconSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 32;
      default: return 24;
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small': return 36;
      case 'large': return 56;
      default: return 44;
    }
  };

  const getLabel = () => {
    if (themeMode === 'system') return '跟随系统';
    return isDark ? '深色模式' : '浅色模式';
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor,
          width: getButtonSize(),
          height: getButtonSize(),
        },
        style,
      ]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <IconSymbol
          name={isDark ? 'sun.max.fill' : 'moon.fill'}
          size={getIconSize()}
          color={tintColor}
        />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: textColor }]}>
          {getLabel()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.1)',
    elevation: 5,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
