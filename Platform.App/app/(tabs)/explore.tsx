import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ExploreTile {
  title: string;
  description: string;
  icon: string;
  route: string;
}

const tiles: ExploreTile[] = [
  {
    title: '附近的人',
    description: '发现身边的实时动态，向附近的同事或伙伴发起聊天。',
    icon: 'mappin.and.ellipse',
    route: '/people/nearby',
  },
  {
    title: '智能推荐',
    description: '让 AI 快速匹配与你兴趣相投的好友或业务联系人。',
    icon: 'sparkles',
    route: '/people/recommend',
  },
  {
    title: '消息中心',
    description: '集中查看所有会话，一键返回聊天列表开始沟通。',
    icon: 'bubble.left.and.bubble.right.fill',
    route: '/(tabs)/chat',
  },
];

export default function ExploreScreen() {
  const router = useRouter();
  const heroBackground = useThemeColor({ light: '#e0f2ff', dark: '#0f172a' }, 'card');
  const heroText = useThemeColor({ light: '#0f172a', dark: '#e2e8f0' }, 'text');
  const tileBackground = useThemeColor({ light: '#f8fafc', dark: '#1f2937' }, 'card');
  const accent = useThemeColor({ light: '#0ea5e9', dark: '#38bdf8' }, 'tint');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={[styles.hero, { backgroundColor: heroBackground }] }>
        <IconSymbol name="safari.fill" size={64} color={accent} />
        <ThemedText type="title" style={[styles.heroTitle, { color: heroText }]}>发现更多精彩</ThemedText>
        <ThemedText style={[styles.heroSubtitle, { color: heroText, opacity: 0.75 }] }>
          打开社交通道，快速拓展人脉、寻找灵感，让工作与交流更高效。
        </ThemedText>
      </ThemedView>

      {tiles.map(tile => (
        <ThemedView key={tile.route} style={[styles.tile, { backgroundColor: tileBackground }] }>
          <IconSymbol name={tile.icon as any} size={28} color={accent} />
          <ThemedText type="subtitle" style={styles.tileTitle}>
            {tile.title}
          </ThemedText>
          <ThemedText style={styles.tileDescription}>{tile.description}</ThemedText>
          <ThemedText style={[styles.tileAction, { color: accent }]} onPress={() => router.push(tile.route)}>
            立即前往 →
          </ThemedText>
        </ThemedView>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  hero: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  tile: {
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  tileTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tileDescription: {
    fontSize: 14,
    opacity: 0.75,
  },
  tileAction: {
    marginTop: 12,
    fontSize: 14,
  },
});
