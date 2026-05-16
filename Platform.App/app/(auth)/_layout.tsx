import { Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

export default function AuthLayout() {
    const { colors } = useTheme();
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
                    title: '登录',
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="register"
                options={{
                    title: '注册',
                }}
            />
        </Stack>
    );
}
