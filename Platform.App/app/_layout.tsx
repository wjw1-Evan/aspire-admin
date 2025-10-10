// 重新设计的主布局组件

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useTokenValidation } from '@/hooks/useTokenValidation';
import { AuthErrorHandler, NetworkStatusIndicator } from '@/components/AuthErrorHandler';
import { RouteGuard } from '@/components/RouteGuard';

export const unstable_settings = {
  anchor: '(tabs)',
};

// 加载组件
function LoadingScreen() {
  const { isDark } = useTheme();
  
  return (
    <View style={[styles.loadingContainer, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <ActivityIndicator size="large" color={isDark ? '#fff' : '#1890ff'} />
    </View>
  );
}

// 认证路由组件
function AuthRouter() {
  const { isAuthenticated, loading } = useAuth();
  const { isDark } = useTheme();
  
  // 启用token验证和自动刷新
  useTokenValidation();

  // 显示加载状态
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AuthErrorHandler>
      <RouteGuard
        protectedRoutes={['/(tabs)', '/profile', '/about/index', '/modal']}
        publicRoutes={['/auth']}
        redirectTo="/auth"
      >
        <View style={{ flex: 1 }}>
          {/* 网络状态指示器 */}
          <NetworkStatusIndicator />
          
          {/* 路由栈 */}
          <Stack screenOptions={{ headerShown: false }}>
            {isAuthenticated ? (
              [
                <Stack.Screen key="(tabs)" name="(tabs)" />,
                <Stack.Screen key="modal" name="modal" options={{ presentation: 'modal' }} />,
                <Stack.Screen key="profile" name="profile" />,
                <Stack.Screen key="about" name="about/index" />
              ]
            ) : (
              <Stack.Screen name="auth" />
            )}
          </Stack>
          
          {/* 状态栏 */}
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </View>
      </RouteGuard>
    </AuthErrorHandler>
  );
}

// 根布局组件
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});