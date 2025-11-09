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
        protectedRoutes={['/(tabs)', '/profile', '/about/index', '/modal']}
        publicRoutes={['/auth']}
        redirectTo="/auth"
      >
        <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top', 'left', 'right']}>
          <View style={[styles.routerContainer, { backgroundColor }]}>
            <LocationSyncManager enabled={isAuthenticated} />
            <AlertHost />
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