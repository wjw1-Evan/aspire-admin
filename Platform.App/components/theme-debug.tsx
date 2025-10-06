import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeColor } from '@/hooks/use-theme-color';

export function ThemeDebug() {
  const { themeMode, isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, { color: textColor }]}>主题调试信息</Text>
      <Text style={[styles.info, { color: textColor }]}>
        当前主题模式: {themeMode}
      </Text>
      <Text style={[styles.info, { color: textColor }]}>
        是否为深色模式: {isDark ? '是' : '否'}
      </Text>
      <Text style={[styles.info, { color: textColor }]}>
        背景颜色: {backgroundColor}
      </Text>
      <Text style={[styles.info, { color: textColor }]}>
        文字颜色: {textColor}
      </Text>
      <Text style={[styles.info, { color: textColor }]}>
        主题色: {tintColor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
  },
});
