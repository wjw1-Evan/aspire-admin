import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/useThemeColor';

const contactEntries = [
  {
    icon: 'envelope.fill' as const,
    title: '联系邮箱',
    value: 'support@aspire-admin.com',
    link: 'mailto:support@aspire-admin.com',
  },
  {
    icon: 'phone.fill' as const,
    title: '服务热线',
    value: '+86 400-123-4567',
    link: 'tel:+864001234567',
  },
  {
    icon: 'location.fill' as const,
    title: '办公地址',
    value: '北京市朝阳区望京街道 18 号',
  },
];

const valuePillars = [
  { icon: 'shield.lefthalf.and.lh' as const, label: '安全合规' },
  { icon: 'bolt.fill' as const, label: '高效协同' },
  { icon: 'sparkles' as const, label: '持续创新' },
  { icon: 'globe.asia.australia.fill' as const, label: '全球连接' },
];

export default function AboutScreen(): JSX.Element {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({ light: '#ffffff', dark: '#1f2933' }, 'card');
  const borderColor = useThemeColor({ light: '#e2e8f0', dark: '#2d3643' }, 'border');
  const secondaryText = useThemeColor({ light: '#6b7280', dark: '#94a3b8' }, 'text');
  const accent = useThemeColor({}, 'tint');

  const handleOpenLink = async (url?: string) => {
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('提示', '当前设备无法打开该链接');
      }
    } catch {
      Alert.alert('提示', '打开链接时出现问题，请稍后再试');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor }]} contentInsetAdjustmentBehavior="automatic">
      <ThemedView style={[styles.navbar, { backgroundColor: cardBackgroundColor, borderBottomColor: borderColor }] }>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={20} color={secondaryText} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.navTitle}>关于我们</ThemedText>
        <View style={styles.backButton} />
      </ThemedView>

      <ThemedView style={[styles.hero, { backgroundColor: cardBackgroundColor }]}>
        <View style={[styles.logoWrapper, { borderColor: borderColor }] }>
          <Image
            source={{ uri: 'https://assets.cursor.team/aspire/logo-square.png' }}
            style={styles.logo}
          />
        </View>
        <ThemedText type="title" style={styles.appName}>Aspire Admin Platform</ThemedText>
        <ThemedText style={[styles.appTagline, { color: secondaryText }] }>
          连接企业服务 · 构建实时协作体验
        </ThemedText>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: `${accent}20` }] }>
            <IconSymbol name="sparkles" size={14} color={accent} />
            <ThemedText style={[styles.badgeText, { color: accent }]}>v1.0.0</ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: `${accent}20` }] }>
            <IconSymbol name="clock.badge.checkmark" size={14} color={accent} />
            <ThemedText style={[styles.badgeText, { color: accent }]}>最近更新 · 2025-11</ThemedText>
          </View>
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }] }>
          品牌故事
        </ThemedText>
        <ThemedText style={[styles.description, { color: secondaryText }] }>
          Aspire 团队扎根企业服务领域多年，专注打造实时、可靠的管理平台。我们相信沟通协作的效率，决定着企业的创新速度。
          因此，我们将聊天、好友、智能推荐与微服务治理深度融合，让组织可以在一个平台上完成即时沟通、数据洞察和业务运营。
        </ThemedText>
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }] }>
          核心价值
        </ThemedText>
        <View style={styles.valueGrid}>
          {valuePillars.map(pillar => (
            <View key={pillar.label} style={[styles.valueCard, { borderColor }] }>
              <IconSymbol name={pillar.icon as any} size={20} color={accent} />
              <ThemedText style={styles.valueLabel}>{pillar.label}</ThemedText>
            </View>
          ))}
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }] }>
          产品亮点
        </ThemedText>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <IconSymbol name="bubble.left.and.text.bubble.right.fill" size={18} color={accent} />
            <ThemedText style={[styles.featureText, { color: secondaryText }] }>
              SignalR 实时通信，移动端与后台同步更新
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="person.2.fill" size={18} color={accent} />
            <ThemedText style={[styles.featureText, { color: secondaryText }] }>
              微信式通讯录体验，快捷管理企业好友关系
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="sparkles" size={18} color={accent} />
            <ThemedText style={[styles.featureText, { color: secondaryText }] }>
              AI 智能推荐，精准匹配业务联系人
            </ThemedText>
          </View>
          <View style={styles.featureItem}>
            <IconSymbol name="lock.shield" size={18} color={accent} />
            <ThemedText style={[styles.featureText, { color: secondaryText }] }>
              多租户隔离与审计日志，保障数据安全合规
            </ThemedText>
          </View>
        </View>
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }] }>
          联系我们
        </ThemedText>
        {contactEntries.map(entry => (
          <TouchableOpacity
            key={entry.title}
            style={[styles.contactRow, { borderBottomColor: borderColor }]}
            activeOpacity={entry.link ? 0.7 : 1}
            onPress={() => handleOpenLink(entry.link)}
          >
            <View style={styles.contactLeft}>
              <IconSymbol name={entry.icon} size={20} color={accent} />
              <ThemedText style={styles.contactTitle}>{entry.title}</ThemedText>
            </View>
            <ThemedText style={[styles.contactValue, { color: secondaryText }]} numberOfLines={1}>
              {entry.value}
            </ThemedText>
            {entry.link && <IconSymbol name="arrow.up.right" size={14} color={secondaryText} />}
          </TouchableOpacity>
        ))}
      </ThemedView>

      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor, alignItems: 'center', gap: 6, paddingVertical: 16 }]}>
        <ThemedText style={[styles.footerText, { color: secondaryText }]}>© 2025 Aspire Team. All rights reserved.</ThemedText>
        <ThemedText style={[styles.footerText, { color: secondaryText }]}>遵循 MIT License · 构建于 .NET Aspire 与 Expo</ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  hero: {
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  logoWrapper: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    padding: 8,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
  },
  appTagline: {
    fontSize: 14,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingBottom: 14,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  valueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  valueLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    width: 110,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  contactValue: {
    flex: 1,
    fontSize: 14,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
