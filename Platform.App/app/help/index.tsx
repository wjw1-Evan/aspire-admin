import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Collapsible } from '@/components/ui/collapsible';

const HelpItem = ({
  icon,
  title,
  onPress,
  showArrow = true,
  borderColor
}: {
  icon: 'envelope.fill' | 'phone.fill' | 'questionmark.circle.fill' | 'info.circle.fill' | 'arrow.clockwise' | 'lock.fill' | 'gear';
  title: string;
  onPress?: () => void;
  showArrow?: boolean;
  borderColor?: string;
}) => (
  <TouchableOpacity
    style={[styles.helpItem, { borderBottomColor: borderColor }]}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.helpItemLeft}>
      <IconSymbol name={icon} size={24} color="#666" />
      <ThemedText style={styles.helpItemTitle}>{title}</ThemedText>
    </View>
    {showArrow && onPress && (
      <IconSymbol name="chevron.right" size={16} color="#999" />
    )}
  </TouchableOpacity>
);

export default function HelpScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor(
    { light: '#fff', dark: '#1c1c1e' },
    'background'
  );
  const borderColor = useThemeColor(
    { light: '#f0f0f0', dark: '#2c2c2e' },
    'icon'
  );

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
          帮助与反馈
        </ThemedText>
        <View style={styles.placeholder} />
      </ThemedView>

      {/* 常见问题 */}
      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }]}>
          常见问题
        </ThemedText>

        <Collapsible title="如何登录账户？">
          <ThemedText style={styles.faqContent}>
            1. 打开应用，在登录页面输入您的用户名和密码{'\n'}
            2. 点击&ldquo;登录&rdquo;按钮{'\n'}
            3. 如果忘记密码，可以联系管理员重置
          </ThemedText>
        </Collapsible>

        <Collapsible title="如何修改个人信息？">
          <ThemedText style={styles.faqContent}>
            1. 进入&ldquo;个人中心&rdquo;页面{'\n'}
            2. 点击&ldquo;编辑个人信息&rdquo;按钮{'\n'}
            3. 修改需要更新的信息{'\n'}
            4. 点击&ldquo;保存&rdquo;按钮完成修改
          </ThemedText>
        </Collapsible>

        <Collapsible title="如何切换主题模式？">
          <ThemedText style={styles.faqContent}>
            1. 进入&ldquo;个人中心&rdquo;页面{'\n'}
            2. 在设置部分找到&ldquo;主题设置&rdquo;{'\n'}
            3. 选择您喜欢的主题模式：浅色、深色或跟随系统
          </ThemedText>
        </Collapsible>

        <Collapsible title="如何修改密码？">
          <ThemedText style={styles.faqContent}>
            1. 进入&ldquo;个人中心&rdquo;页面{'\n'}
            2. 在设置部分点击&ldquo;修改密码&rdquo;{'\n'}
            3. 输入当前密码和新密码{'\n'}
            4. 确认新密码后点击&ldquo;修改密码&rdquo;
          </ThemedText>
        </Collapsible>

        <Collapsible title="应用支持哪些功能？">
          <ThemedText style={styles.faqContent}>
            当前应用支持以下功能：{'\n'}
            • 用户登录和注册{'\n'}
            • 个人信息管理{'\n'}
            • 主题模式切换{'\n'}
            • 密码修改{'\n'}
            • 更多功能正在开发中...
          </ThemedText>
        </Collapsible>
      </ThemedView>

      {/* 联系支持 */}
      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }]}>
          联系支持
        </ThemedText>

        <HelpItem
          icon="envelope.fill"
          title="发送邮件反馈"
          onPress={() => {
            // 这里可以集成邮件发送功能
          }}
          borderColor={borderColor}
        />
        <HelpItem
          icon="phone.fill"
          title="电话支持"
          onPress={() => {
            // 这里可以集成电话拨打功能
          }}
          borderColor={borderColor}
        />
        <HelpItem
          icon="questionmark.circle.fill"
          title="在线客服"
          onPress={() => {
            // 这里可以集成在线客服功能
          }}
          borderColor={borderColor}
        />
      </ThemedView>

      {/* 应用信息 */}
      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }]}>
          应用信息
        </ThemedText>

        <HelpItem
          icon="info.circle.fill"
          title="版本信息"
          onPress={() => router.push('/about')}
          borderColor={borderColor}
        />
        <HelpItem
          icon="arrow.clockwise"
          title="检查更新"
          onPress={() => {
            // 这里可以集成检查更新功能
          }}
          borderColor={borderColor}
        />
        <HelpItem
          icon="lock.fill"
          title="隐私政策"
          onPress={() => {
            // 这里可以集成隐私政策页面
          }}
          borderColor={borderColor}
        />
        <HelpItem
          icon="gear"
          title="使用条款"
          onPress={() => {
            // 这里可以集成使用条款页面
          }}
          borderColor={borderColor}
        />
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
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  helpItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  helpItemTitle: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  faqContent: {
    fontSize: 14,
    lineHeight: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    marginTop: 8,
  },
});
