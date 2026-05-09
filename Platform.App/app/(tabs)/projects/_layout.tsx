import { Stack } from 'expo-router';

export default function ProjectsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '项目管理' }} />
    </Stack>
  );
}
