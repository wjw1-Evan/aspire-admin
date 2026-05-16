import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';

export default function AuthLayout() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.primary,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Stack.Screen
                name="login"
                options={{
                    title: t('auth.login'),
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="register"
                options={{
                    title: t('auth.register'),
                }}
            />
        </Stack>
    );
}
