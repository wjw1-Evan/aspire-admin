import { StyleSheet, ScrollView, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemeDebug } from '@/components/theme-debug';
import { PrussianBluePalette } from '@/components/prussian-blue-palette';
import { StorageDebug } from '@/components/storage-debug';

export default function HomeScreen() {
  const { user } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: '#1E293B' },
    'card'
  );
  const borderColor = useThemeColor({}, 'border');

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      {/* 欢迎区域 */}
      <ThemedView style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <ThemedText type="title" style={styles.welcomeTitle}>
            欢迎回来！
          </ThemedText>
          <ThemedText style={styles.welcomeSubtitle}>
            {user?.name || user?.userid || '用户'}
          </ThemedText>
        </View>
      </ThemedView>

      {/* 用户信息卡片 */}
      <ThemedView style={[styles.userCard, { backgroundColor: cardBackgroundColor }]}>
        <View style={styles.cardHeader}>
          <IconSymbol name="person.circle.fill" size={24} color={useThemeColor({}, 'tint')} />
          <ThemedText type="subtitle" style={styles.cardTitle}>
            个人信息
          </ThemedText>
        </View>
        <View style={styles.userInfo}>
          <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
            <ThemedText style={styles.infoLabel}>用户名</ThemedText>
            <ThemedText style={styles.infoValue}>
              {user?.name || user?.userid || '未知'}
            </ThemedText>
          </View>
          {user?.email && (
            <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
              <ThemedText style={styles.infoLabel}>邮箱</ThemedText>
              <ThemedText style={styles.infoValue}>{user.email}</ThemedText>
            </View>
          )}
          {user?.title && (
            <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
              <ThemedText style={styles.infoLabel}>职位</ThemedText>
              <ThemedText style={styles.infoValue}>{user.title}</ThemedText>
            </View>
          )}
        </View>
      </ThemedView>

      {/* 应用信息 */}
      <ThemedView style={[styles.appInfoCard, { backgroundColor: cardBackgroundColor }]}>
        <View style={styles.cardHeader}>
          <IconSymbol name="info.circle.fill" size={24} color={useThemeColor({}, 'success')} />
          <ThemedText type="subtitle" style={styles.cardTitle}>
            应用信息
          </ThemedText>
        </View>
        <ThemedText style={styles.appDescription}>
          基于 .NET Aspire 构建的现代化微服务管理平台，提供用户管理、API 网关和移动端应用等功能。
        </ThemedText>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={16} color={useThemeColor({}, 'success')} />
            <ThemedText style={styles.featureText}>用户认证与管理</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={16} color={useThemeColor({}, 'success')} />
            <ThemedText style={styles.featureText}>微服务架构</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={16} color={useThemeColor({}, 'success')} />
            <ThemedText style={styles.featureText}>跨平台支持</ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* 快速操作 */}
      <ThemedView style={[styles.quickActionsCard, { backgroundColor: cardBackgroundColor }]}>
        <View style={styles.cardHeader}>
          <IconSymbol name="bolt.fill" size={24} color={useThemeColor({}, 'warning')} />
          <ThemedText type="subtitle" style={styles.cardTitle}>
            快速操作
          </ThemedText>
        </View>
        <ThemedText style={styles.quickActionsDescription}>
          点击底部导航栏访问更多功能
        </ThemedText>
        <View style={styles.quickActionsList}>
          <View style={styles.quickActionItem}>
            <IconSymbol name="person.fill" size={20} color={useThemeColor({}, 'tint')} />
            <ThemedText style={styles.quickActionText}>个人中心</ThemedText>
          </View>
          <View style={styles.quickActionItem}>
            <IconSymbol name="paperplane.fill" size={20} color={useThemeColor({}, 'tint')} />
            <ThemedText style={styles.quickActionText}>探索功能</ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* 主题调试信息 */}
      <ThemeDebug />

      {/* 普鲁士蓝配色展示 */}
      <PrussianBluePalette />

      {/* 存储调试工具 */}
      <StorageDebug />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeSection: {
    padding: 24,
    marginBottom: 12,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  userCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  appInfoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
  },
  quickActionsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  userInfo: {
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  appDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
  },
  quickActionsDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  quickActionsList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionText: {
    fontSize: 12,
    marginTop: 4,
  },
});
