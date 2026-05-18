import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TasksLayout() {
  const { t } = useTranslation();
  return <Stack screenOptions={{ headerShown: false }} />;
}
