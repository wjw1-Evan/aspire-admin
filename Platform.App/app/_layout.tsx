import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../constants/AppStyles';

import { useColorScheme } from '@/components/useColorScheme';
import { authService } from '../services/authService';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(auth)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);
    };

    checkAuth();

    // Subscribe to auth state changes
    const listener = (authenticated: boolean) => {
      setIsAuthenticated(authenticated);
    };
    authService.addAuthListener(listener);

    return () => {
      authService.removeAuthListener(listener);
    };
  }, []);

  // Redirect based on authentication status
  useEffect(() => {
    if (isAuthenticated === null) return; // Still checking

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/');
    }
  }, [isAuthenticated, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: '通知中心' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <Toast
        config={{
          success: ({ text1, text2 }) => (
            <View style={toastStyles.successContainer}>
              <View style={toastStyles.iconContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              </View>
              <View style={toastStyles.textContainer}>
                <Text style={toastStyles.text1}>{text1}</Text>
                {text2 && <Text style={toastStyles.text2}>{text2}</Text>}
              </View>
            </View>
          ),
          error: ({ text1, text2 }) => (
            <View style={toastStyles.errorContainer}>
              <View style={toastStyles.iconContainer}>
                <Ionicons name="close-circle" size={24} color="#ff4d4f" />
              </View>
              <View style={toastStyles.textContainer}>
                <Text style={toastStyles.text1}>{text1}</Text>
                {text2 && <Text style={toastStyles.text2}>{text2}</Text>}
              </View>
            </View>
          ),
          info: ({ text1, text2 }) => (
            <View style={toastStyles.infoContainer}>
              <View style={toastStyles.iconContainer}>
                <Ionicons name="information-circle" size={24} color="#667eea" />
              </View>
              <View style={toastStyles.textContainer}>
                <Text style={toastStyles.text1}>{text1}</Text>
                {text2 && <Text style={toastStyles.text2}>{text2}</Text>}
              </View>
            </View>
          ),
        }}
      />
    </ThemeProvider>
  );
}

// Toast 自定义样式（参考退出登录 Modal 的设计风格）
const toastStyles = StyleSheet.create({
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: AppStyles.borderRadius.lg,
    padding: AppStyles.spacing.md,
    minHeight: 60,
    width: '90%',
    maxWidth: 400,
    borderLeftWidth: 4,
    borderLeftColor: AppStyles.colors.success,
    ...AppStyles.shadows.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: AppStyles.borderRadius.lg,
    padding: AppStyles.spacing.md,
    minHeight: 60,
    width: '90%',
    maxWidth: 400,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4d4f',
    ...AppStyles.shadows.lg,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: AppStyles.borderRadius.lg,
    padding: AppStyles.spacing.md,
    minHeight: 60,
    width: '90%',
    maxWidth: 400,
    borderLeftWidth: 4,
    borderLeftColor: AppStyles.colors.primary,
    ...AppStyles.shadows.lg,
  },
  iconContainer: {
    marginRight: AppStyles.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  text1: {
    fontSize: AppStyles.fontSize.md,
    fontWeight: '600',
    color: AppStyles.colors.text,
    marginBottom: 2,
  },
  text2: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.textSecondary,
    lineHeight: 18,
  },
});

