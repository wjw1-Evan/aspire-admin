import React from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

/**
 * 自定义 TabBar 组件
 * 修复 @react-navigation/bottom-tabs 中 props.pointerEvents 已弃用的警告
 * 使用 style.pointerEvents 替代 props.pointerEvents
 */
export function CustomTabBar({ state, descriptors, navigation }: Readonly<BottomTabBarProps>) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.colors.navBar,
          borderTopColor: theme.colors.navBorder,
          // 使用 style.pointerEvents 而不是 props.pointerEvents（根据警告要求）
          pointerEvents: 'box-none',
        },
      ]}>
      {state.routes
        .filter((route) => {
          // 过滤掉 index 路由（重定向页面，不应在 tab bar 中显示）
          return route.name !== 'index';
        })
        .map((route) => {
          const originalIndex = state.routes.findIndex((r) => r.key === route.key);
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel ?? options.title ?? route.name;

          const isFocused = state.index === originalIndex;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const onPressIn = () => {
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        };

        const TabBarIcon = options.tabBarIcon;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            onPressIn={onPressIn}
            style={[
              styles.tabButton,
              {
                // 使用 style.pointerEvents 而不是 props.pointerEvents（根据警告要求）
                pointerEvents: 'auto',
              },
            ]}>
            {TabBarIcon && (
              <TabBarIcon
                focused={isFocused}
                color={isFocused ? theme.colors.tabIconSelected : theme.colors.tabIconDefault}
                size={28}
              />
            )}
            {typeof label === 'string' && (
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? theme.colors.tabIconSelected : theme.colors.tabIconDefault,
                  },
                ]}>
                {label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 88 : 60,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

