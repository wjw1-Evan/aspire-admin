import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

import { useTheme } from '@/contexts/ThemeContext';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={22} {...props} />;
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  const tabBarStyles = useMemo(() => StyleSheet.create({
    tabBar: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 20,
      height: 68,
      borderRadius: 34,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
      overflow: 'hidden',
      elevation: 0,
      backgroundColor: 'transparent',
      paddingBottom: 8,
      paddingTop: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 12,
      ...Platform.select({
        web: {
          position: 'relative' as const,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 0,
          borderWidth: 0,
          shadowColor: 'transparent',
        },
        default: {},
      }),
    },
    tabBarBackground: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 34,
      overflow: 'hidden',
    },
    tabBarLabel: {
      fontSize: 10,
      fontWeight: '500',
      marginTop: 2,
    },
  }), [isDark]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: isDark ? '#8e8e93' : '#999999',
        headerShown: false,
        tabBarStyle: tabBarStyles.tabBar,
        tabBarBackground: () => (
          <View style={tabBarStyles.tabBarBackground}>
            <BlurView
              tint={isDark ? 'dark' : 'light'}
              intensity={isDark ? 60 : 80}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ),
        tabBarLabelStyle: tabBarStyles.tabBarLabel,
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: '任务',
          tabBarIcon: ({ color }) => <TabBarIcon name="checkmark-done-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: '项目',
          tabBarIcon: ({ color }) => <TabBarIcon name="folder-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
