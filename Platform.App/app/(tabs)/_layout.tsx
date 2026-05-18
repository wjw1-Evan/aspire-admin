import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';
import FloatingActionMenu from '@/components/FloatingActionMenu';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} {...props} />;
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const tabBarStyles = useMemo(() => StyleSheet.create({
    tabBar: {
      position: 'absolute',


      height: 72,
      borderRadius: 36,
      borderWidth: 1,

      boxShadow: 'none',
      elevation: 0,
      overflow: 'visible',
      paddingTop: 8,
      margin: 10,
      paddingVertical: 0,

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
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.tint,
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
            title: t('tabs.home'),
            tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: t('tabs.tasks'),
            tabBarIcon: ({ color }) => <TabBarIcon name="checkmark-done-outline" color={color} />,
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            tabBarButton: () => <FloatingActionMenu />,
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: t('tabs.projects'),
            tabBarIcon: ({ color }) => <TabBarIcon name="folder-outline" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t('tabs.profile'),
            tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
          }}
        />
      </Tabs>
      <FloatingActionMenu />
    </>
  );
}
