import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { WeChatCard } from '@/components/ui/wx-card';
import { WeChatListItem } from '@/components/ui/wx-list-item';
import { useTheme } from '@/contexts/ThemeContext';

interface ExploreTile {
  readonly title: string;
  readonly description: string;
  readonly icon: IconSymbolName;
  readonly route: Href;
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
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { gap: theme.spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <WeChatCard
          padding="lg"
          bordered={false}
          style={{
            backgroundColor: theme.colors.accentMuted,
            gap: theme.spacing.sm,
          }}
        >
          <IconSymbol name="safari.fill" size={56} color={theme.colors.accent} />
          <ThemedText type="display" style={styles.heroTitle}>发现更多精彩</ThemedText>
          <ThemedText type="caption" style={[styles.heroSubtitle, { color: theme.colors.secondaryText }]}> 
            打开社交通道，快速拓展人脉、寻找灵感，让工作与交流更高效。
          </ThemedText>
        </WeChatCard>

        <WeChatCard style={styles.listCard}>
          {tiles.map(tile => (
            <WeChatListItem
              key={tile.title}
              title={tile.title}
              description={tile.description}
              icon={tile.icon}
              onPress={() => router.push(tile.route)}
            />
          ))}
        </WeChatCard>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroTitle: {
    textAlign: 'left',
  },
  heroSubtitle: {
    lineHeight: 20,
  },
  listCard: {
    paddingVertical: 0,
    overflow: 'hidden',
  },
});
