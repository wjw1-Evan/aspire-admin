import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { enableScreens } from 'react-native-screens';
enableScreens(true);
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppStyles } from '../constants/AppStyles';
import { AppThemeProvider, useTheme } from '../contexts/ThemeContext';
import { authService } from '../services/authService';
import { initLanguage } from '../utils/i18n';
import { NotificationProvider } from '../contexts/NotificationContext';
import SplashScreenComponent from '../components/SplashScreen';

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
  const [splashAnimationComplete, setSplashAnimationComplete] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  const handleSplashComplete = () => {
    setSplashAnimationComplete(true);
  };

  if (!loaded) {
    return null;
  }

  if (!splashAnimationComplete) {
    return <SplashScreenComponent onAnimationComplete={handleSplashComplete} />;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <AppThemeProvider>
      <NotificationProvider>
        <RootLayoutNavInner />
      </NotificationProvider>
    </AppThemeProvider>
  );
}

function RootLayoutNavInner() {
  const { resolvedTheme, colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check authentication status on app load
  useEffect(() => {
    initLanguage();

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
  const lastNavRef = useRef(0);
  useEffect(() => {
    if (isAuthenticated === null) return;

    const now = Date.now();
    if (now - lastNavRef.current < 1000) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      authService.isAuthenticated().then((hasToken) => {
        if (!hasToken) {
          lastNavRef.current = Date.now();
          router.replace('/login');
        }
      });
    } else if (isAuthenticated && inAuthGroup) {
      lastNavRef.current = now;
      router.replace('/');
    }
  }, [isAuthenticated, segments]);

  const toastStyles = useMemo(() => StyleSheet.create({
    successContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: AppStyles.borderRadius.lg,
      padding: AppStyles.spacing.md,
      minHeight: 60,
      width: '90%',
      maxWidth: 400,
      borderLeftWidth: 4,
      borderLeftColor: colors.success,
      ...AppStyles.shadows.lg,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: AppStyles.borderRadius.lg,
      padding: AppStyles.spacing.md,
      minHeight: 60,
      width: '90%',
      maxWidth: 400,
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
      ...AppStyles.shadows.lg,
    },
    infoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: AppStyles.borderRadius.lg,
      padding: AppStyles.spacing.md,
      minHeight: 60,
      width: '90%',
      maxWidth: 400,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
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
      color: colors.text,
      marginBottom: 2,
    },
    text2: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  }), [colors]);

  return (
    <NavigationThemeProvider value={resolvedTheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ title: t('notifications.title') }} />
        <Stack.Screen name="notifications/[id]" options={{ title: t('notifications.detail'), animation: 'slide_from_right' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="project/[id]" options={{ title: t('projects.detail') }} />
        <Stack.Screen name="project/create" options={{ headerShown: false }} />
        <Stack.Screen name="project/edit/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="task/[id]" options={{ title: t('tasks.detail') }} />
        <Stack.Screen name="task/create" options={{ headerShown: false }} />
        <Stack.Screen name="task/edit/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="task/execute/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="enterprise-service/index" options={{ title: t('enterprise_service.title'), animation: 'slide_from_right' }} />
        <Stack.Screen name="enterprise-service/create" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="enterprise-service/[id]" options={{ title: t('enterprise_service.detail'), animation: 'slide_from_right' }} />
        <Stack.Screen name="enterprise-service/edit/[id]" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="xiaoke/index" options={{ title: t('xiaoke.title'), animation: 'slide_from_right' }} />
      </Stack>
      <Toast
        config={{
          success: ({ text1, text2 }) => (
            <View style={toastStyles.successContainer}>
              <View style={toastStyles.iconContainer}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
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
                <Ionicons name="close-circle" size={24} color={colors.error} />
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
                <Ionicons name="information-circle" size={24} color={colors.primary} />
              </View>
              <View style={toastStyles.textContainer}>
                <Text style={toastStyles.text1}>{text1}</Text>
                {text2 && <Text style={toastStyles.text2}>{text2}</Text>}
              </View>
            </View>
          ),
        }}
      />
    </NavigationThemeProvider>
  );
}



