// 重新设计的主布局组件

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import '@/utils/alertShim';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useTokenValidation } from '@/hooks/useTokenValidation';
import { AuthErrorHandler, NetworkStatusIndicator } from '@/components/AuthErrorHandler';
import { RouteGuard } from '@/components/RouteGuard';
import { useThemeColor } from '@/hooks/useThemeColor';
import { AlertHost } from '@/components/AlertHost';
import { useAutoLocationSync } from '@/hooks/useAutoLocationSync';

export const unstable_settings = {
  anchor: '(tabs)',
};

// 加载组件
function LoadingScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const indicatorColor = useThemeColor({}, 'tint');
  
  return (
    <View style={[styles.loadingContainer, { backgroundColor }]}>
      <ActivityIndicator size="large" color={indicatorColor} />
    </View>
  );
}

// 认证路由组件
function AuthRouter() {
  const { isAuthenticated, loading } = useAuth();
  const { isDark } = useTheme();
  const backgroundColor = useThemeColor({}, 'background');
  
  // 启用token验证和自动刷新
  useTokenValidation();

  // 显示加载状态
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthErrorHandler>
      <RouteGuard
        protectedRoutes={['/(tabs)', '/profile', '/about/index', '/chat', '/people']}
        publicRoutes={['/auth', '/auth/login', '/auth/register']}
        redirectTo="/auth/login"
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
          <View style={[styles.routerContainer, { backgroundColor }]}>
            <LocationSyncManager enabled={isAuthenticated} />
            <AlertHost />
            {/* 网络状态指示器 */}
            <NetworkStatusIndicator />
            
            {/* 路由栈 */}
            {/* Expo Router 会根据文件系统自动注册所有路由（包括嵌套路由） */}
            {/* 注意：所有路由都应该注册，由 RouteGuard 控制访问权限和跳转 */}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="about" />
              <Stack.Screen name="chat" />
              <Stack.Screen name="people" />
            </Stack>
            
            {/* 状态栏 */}
            <StatusBar style={isDark ? 'light' : 'dark'} />
          </View>
        </SafeAreaView>
      </RouteGuard>
    </AuthErrorHandler>
  );
}

// 根布局组件
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ChatProvider>
            <AuthRouter />
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routerContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});

function LocationSyncManager({ enabled }: { enabled: boolean }): null {
  useAutoLocationSync(enabled);
  return null;
}