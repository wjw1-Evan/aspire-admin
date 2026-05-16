import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useTranslation } from 'react-i18next';
import { Text, View } from '@/components/Themed';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('not_found.title') }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t('not_found.message')}</Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t('not_found.go_home')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
