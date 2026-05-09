import { Stack } from 'expo-router';

export default function TasksLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '任务管理', headerShown: false }} />
    </Stack>
  );
}
