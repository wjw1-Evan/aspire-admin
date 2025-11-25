import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#1890ff',
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
