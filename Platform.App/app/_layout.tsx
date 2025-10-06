import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useTokenValidation } from '@/hooks/use-token-validation';
import { AuthErrorHandler } from '@/components/auth-error-handler';

export const unstable_settings = {
  anchor: '(tabs)',
};

// 认证路由组件
function AuthRouter() {
  const { isAuthenticated, loading } = useAuth();
  const { isDark } = useTheme();
  
  // 启用token验证
  useTokenValidation();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthErrorHandler>
      <Stack screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          [
            <Stack.Screen key="(tabs)" name="(tabs)" />,
            <Stack.Screen key="modal" name="modal" options={{ presentation: 'modal' }} />,
            <Stack.Screen key="profile" name="profile" />,
            <Stack.Screen key="help" name="help" />,
            <Stack.Screen key="about" name="about" />
          ]
        ) : (
          <Stack.Screen name="auth" />
        )}
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </AuthErrorHandler>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthRouter />
      </AuthProvider>
    </ThemeProvider>
  );
}
