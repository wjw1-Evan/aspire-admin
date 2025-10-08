import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Image } from 'expo-image';

const InfoItem = ({
  icon,
  title,
  value,
  onPress,
  showArrow = false,
  borderColor
}: {
  icon: 'info.circle.fill' | 'person.fill' | 'calendar.fill' | 'arrow.clockwise' | 'envelope.fill' | 'phone.fill' | 'location.fill';
  title: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  borderColor?: string;
}) => (
  <TouchableOpacity
    style={[styles.infoItem, { borderBottomColor: borderColor }]}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.infoItemLeft}>
      <IconSymbol name={icon as any} size={24} color="#666" />
      <ThemedText style={styles.infoItemTitle}>{title}</ThemedText>
    </View>
    <View style={styles.infoItemRight}>
      {value && <ThemedText style={styles.infoItemValue}>{value}</ThemedText>}
      {showArrow && onPress && (
        <IconSymbol name="chevron.right" size={16} color="#999" />
      )}
    </View>
  </TouchableOpacity>
);

export default function AboutScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor(
    { light: '#fff', dark: '#1c1c1e' },
    'background'
  );
  const borderColor = useThemeColor(
    { light: '#f0f0f0', dark: '#2c2c2e' },
    'icon'
  );

  const handleOpenLink = async (url: string, title: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('错误', `无法打开${title}`);
      }
    } catch {
      Alert.alert('错误', `打开${title}时发生错误`);
    }
  };

  const handleCheckUpdate = () => {
    Alert.alert(
      '检查更新',
      '当前已是最新版本 v1.0.0',
      [{ text: '确定' }]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      {/* 页面标题 */}
      <ThemedView style={[styles.header, { backgroundColor: cardBackgroundColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={24} color="#666" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          关于我们
        </ThemedText>
        <View style={styles.placeholder} />
      </ThemedView>

      {/* 应用信息 */}
      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <View style={styles.appInfo}>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://via.placeholder.com/80x80/007AFF/FFFFFF?text=A' }}
              style={styles.logo}
            />
          </View>
          <ThemedText type="title" style={styles.appName}>
            Aspire Admin Platform
          </ThemedText>
          <ThemedText style={styles.appVersion}>
            版本 1.0.0
          </ThemedText>
          <ThemedText style={styles.appDescription}>
            基于 .NET Aspire 构建的现代化微服务管理平台
          </ThemedText>
        </View>
      </ThemedView>

      {/* 版本信息 */}
      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }]}>
          版本信息
        </ThemedText>

        <InfoItem
          icon="info.circle.fill"
          title="当前版本"
          value="1.0.0"
          borderColor={borderColor}
        />
        <InfoItem
          icon="calendar.fill"
          title="发布日期"
          value="2024年1月"
          borderColor={borderColor}
        />
        <InfoItem
          icon="arrow.clockwise"
          title="检查更新"
          onPress={handleCheckUpdate}
          showArrow={true}
          borderColor={borderColor}
        />
      </ThemedView>

      {/* 开发团队 */}
      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }]}>
          开发团队
        </ThemedText>

        <ThemedText style={styles.teamDescription}>
          我们是一支专注于企业级应用开发的团队，致力于为用户提供高效、安全、易用的管理平台。
        </ThemedText>

        <View style={styles.teamFeatures}>
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#34C759" />
            <ThemedText style={styles.featureText}>现代化架构</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#34C759" />
            <ThemedText style={styles.featureText}>微服务设计</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#34C759" />
            <ThemedText style={styles.featureText}>跨平台支持</ThemedText>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#34C759" />
            <ThemedText style={styles.featureText}>安全可靠</ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* 技术栈 */}
      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }]}>
          技术栈
        </ThemedText>

        <View style={styles.techStack}>
          <View style={styles.techCategory}>
            <ThemedText style={styles.techCategoryTitle}>后端</ThemedText>
            <ThemedText style={styles.techItem}>• .NET Aspire</ThemedText>
            <ThemedText style={styles.techItem}>• ASP.NET Core</ThemedText>
            <ThemedText style={styles.techItem}>• Entity Framework</ThemedText>
            <ThemedText style={styles.techItem}>• SQL Server</ThemedText>
          </View>

          <View style={styles.techCategory}>
            <ThemedText style={styles.techCategoryTitle}>前端</ThemedText>
            <ThemedText style={styles.techItem}>• React Native</ThemedText>
            <ThemedText style={styles.techItem}>• Expo</ThemedText>
            <ThemedText style={styles.techItem}>• TypeScript</ThemedText>
            <ThemedText style={styles.techItem}>• React Navigation</ThemedText>
          </View>

          <View style={styles.techCategory}>
            <ThemedText style={styles.techCategoryTitle}>工具</ThemedText>
            <ThemedText style={styles.techItem}>• Visual Studio</ThemedText>
            <ThemedText style={styles.techItem}>• Git</ThemedText>
            <ThemedText style={styles.techItem}>• Docker</ThemedText>
            <ThemedText style={styles.techItem}>• Azure DevOps</ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* 联系方式 */}
      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }]}>
          联系方式
        </ThemedText>

        <InfoItem
          icon="envelope.fill"
          title="邮箱"
          value="support@aspire-admin.com"
          onPress={() => handleOpenLink('mailto:support@aspire-admin.com', '邮箱')}
          showArrow={true}
          borderColor={borderColor}
        />
        <InfoItem
          icon="phone.fill"
          title="电话"
          value="+86 400-123-4567"
          onPress={() => handleOpenLink('tel:+864001234567', '电话')}
          showArrow={true}
          borderColor={borderColor}
        />
        <InfoItem
          icon="location.fill"
          title="地址"
          value="北京市朝阳区"
          borderColor={borderColor}
        />
      </ThemedView>

      {/* 版权信息 */}
      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText style={styles.copyright}>
          © 2024 Aspire Admin Platform. All rights reserved.
        </ThemedText>
        <ThemedText style={styles.copyright}>
          本应用遵循 MIT 开源协议
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  appDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  infoItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  infoItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItemValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  teamDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.8,
  },
  teamFeatures: {
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
  techStack: {
    marginTop: 8,
  },
  techCategory: {
    marginBottom: 16,
  },
  techCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  techItem: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 4,
  },
});
