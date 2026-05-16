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
  return <Ionicons size={24} {...props} />;
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  const tabBarStyles = useMemo(() => StyleSheet.create({
    tabBar: {
      position: 'absolute',


      height: 72,
      borderRadius: 36,
      borderWidth: 1,

      shadowOpacity: 0,
      shadowColor: 'transparent',
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
      overflow: 'hidden',
      paddingTop: 8,
      margin: 10,

    },
    tabBarBackground: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 36,
      overflow: 'hidden',

    },
    tabBarLabel: {
      fontSize: 11,
      fontWeight: '500',
    },
  }), [isDark]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: isDark ? '#636366' : '#aeaeb2',
        headerShown: false,
        tabBarStyle: tabBarStyles.tabBar,
        tabBarBackground: () => (
          <View style={tabBarStyles.tabBarBackground}>
            <BlurView
              tint={isDark ? 'dark' : 'light'}
              intensity={90}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ),
        tabBarLabelStyle: tabBarStyles.tabBarLabel,
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
