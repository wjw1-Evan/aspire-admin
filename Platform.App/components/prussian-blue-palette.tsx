import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ColorSwatchProps {
  name: string;
  color: string;
  description?: string;
}

const ColorSwatch = ({ name, color, description }: ColorSwatchProps) => (
  <View style={styles.colorSwatch}>
    <View style={[styles.colorBox, { backgroundColor: color }]} />
    <View style={styles.colorInfo}>
      <ThemedText style={styles.colorName}>{name}</ThemedText>
      <ThemedText style={styles.colorValue}>{color}</ThemedText>
      {description && (
        <ThemedText style={styles.colorDescription}>{description}</ThemedText>
      )}
    </View>
  </View>
);

export function PrussianBluePalette() {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: '#1E293B' },
    'card'
  );
  const borderColor = useThemeColor({}, 'border');

  // 普鲁士蓝色系展示
  const prussianBlueColors = [
    { name: '普鲁士蓝', color: '#003A6B', description: '主色调' },
    { name: '普鲁士蓝浅色', color: '#4A90E2', description: '深色模式主色' },
    { name: '深黑色', color: '#1A1A1A', description: '文字颜色' },
    { name: '浅灰蓝', color: '#F5F7FA', description: '浅色背景' },
    { name: '深普鲁士蓝', color: '#0F172A', description: '深色背景' },
    { name: '普鲁士蓝中灰', color: '#5A6C7D', description: '图标颜色' },
    { name: '普鲁士蓝浅灰', color: '#8A9BA8', description: '未选中图标' },
    { name: '浅灰白', color: '#F1F5F9', description: '深色模式文字' },
    { name: '普鲁士蓝中浅色', color: '#94A3B8', description: '深色模式图标' },
    { name: '普鲁士蓝浅边框', color: '#D1D9E0', description: '边框颜色' },
    { name: '普鲁士蓝深边框', color: '#334155', description: '深色边框' },
    { name: '翠绿色', color: '#10B981', description: '成功色' },
    { name: '琥珀色', color: '#F59E0B', description: '警告色' },
    { name: '红色', color: '#EF4444', description: '错误色' },
    { name: '蓝色', color: '#3B82F6', description: '信息色' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={[styles.content, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="title" style={styles.title}>
          普鲁士蓝配色方案
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          深沉专业、权威稳重的配色风格，为应用带来专业可信的视觉体验
        </ThemedText>

        <View style={styles.colorGrid}>
          {prussianBlueColors.map((color, index) => (
            <ColorSwatch
              key={index}
              name={color.name}
              color={color.color}
              description={color.description}
            />
          ))}
        </View>

        <ThemedView style={[styles.infoSection, { borderTopColor: borderColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            普鲁士蓝特点
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • 权威感：深沉稳重的色彩传达专业可信的形象{'\n'}
            • 专业感：适合企业级应用和商务场景{'\n'}
            • 对比度：高对比度确保文字清晰可读{'\n'}
            • 现代感：符合现代企业设计美学{'\n'}
            • 适配性：在浅色和深色模式下都有良好表现
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.infoSection, { borderTopColor: borderColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            应用场景
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • 企业级应用：专业、权威的商务风格{'\n'}
            • 管理后台：清晰的信息层次和操作引导{'\n'}
            • 金融应用：传达稳定可信的品牌形象{'\n'}
            • 政府应用：体现权威性和专业性
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.infoSection, { borderTopColor: borderColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            色彩心理学
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • 普鲁士蓝传达稳定、可靠、专业的品牌形象{'\n'}
            • 深色调营造严肃、权威的商务氛围{'\n'}
            • 高对比度设计确保信息的清晰传达{'\n'}
            • 适合需要建立用户信任的应用场景
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 24,
    lineHeight: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  colorSwatch: {
    width: '48%',
    marginBottom: 16,
  },
  colorBox: {
    width: '100%',
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  colorInfo: {
    paddingHorizontal: 4,
  },
  colorName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  colorValue: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  colorDescription: {
    fontSize: 11,
    opacity: 0.6,
  },
  infoSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
});
