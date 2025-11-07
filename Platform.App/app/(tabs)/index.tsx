import { ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/(tabs)/chat');
  }, [router]);

  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="small" />
      <ThemedText style={styles.hint}>正在打开聊天界面…</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hint: {
    fontSize: 14,
    opacity: 0.7,
  },
});
