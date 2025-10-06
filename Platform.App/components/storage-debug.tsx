import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/themed-button';
import { useThemeColor } from '@/hooks/use-theme-color';
import { StorageCleaner } from '@/utils/storage-cleaner';

export function StorageDebug() {
  const [storageInfo, setStorageInfo] = useState<{
    totalKeys: number;
    userRelatedKeys: string[];
    allKeys: string[];
  } | null>(null);
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: '#1E293B' },
    'card'
  );
  const borderColor = useThemeColor({}, 'border');

  const loadStorageInfo = async () => {
    try {
      const info = await StorageCleaner.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const testClearUserData = async () => {
    try {
      await StorageCleaner.clearUserData();
      Alert.alert('成功', '用户数据已清理');
      loadStorageInfo();
    } catch (error) {
      Alert.alert('错误', `清理失败：${error}`);
    }
  };

  const testClearAllData = async () => {
    Alert.alert(
      '确认清理',
      '这将清除所有应用数据，确定要继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageCleaner.clearAllData();
              Alert.alert('成功', '所有数据已清理');
              loadStorageInfo();
            } catch (error) {
              Alert.alert('错误', `清理失败：${error}`);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadStorageInfo();
  }, []);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedView style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="title" style={styles.title}>
          存储调试工具
        </ThemedText>
        
        <ThemedText style={styles.description}>
          查看和清理本地存储数据
        </ThemedText>

        {storageInfo && (
          <View style={[styles.infoSection, { borderTopColor: borderColor }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              存储信息
            </ThemedText>
            <ThemedText style={styles.infoText}>
              总键数：{storageInfo.totalKeys}
            </ThemedText>
            <ThemedText style={styles.infoText}>
              用户相关键数：{storageInfo.userRelatedKeys.length}
            </ThemedText>
            
            {storageInfo.userRelatedKeys.length > 0 && (
              <View style={styles.keysContainer}>
                <ThemedText style={styles.keysTitle}>用户相关键：</ThemedText>
                {storageInfo.userRelatedKeys.map((key, index) => (
                  <ThemedText key={index} style={styles.keyText}>
                    • {key}
                  </ThemedText>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={[styles.actionsSection, { borderTopColor: borderColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            操作
          </ThemedText>
          
          <ThemedButton
            title="刷新存储信息"
            onPress={loadStorageInfo}
            variant="secondary"
            style={styles.button}
          />
          
          <ThemedButton
            title="清理用户数据"
            onPress={testClearUserData}
            variant="destructive"
            style={styles.button}
          />
          
          <ThemedButton
            title="清理所有数据"
            onPress={testClearAllData}
            variant="destructive"
            style={styles.button}
          />
        </View>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 20,
  },
  infoSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.8,
  },
  keysContainer: {
    marginTop: 8,
  },
  keysTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  keyText: {
    fontSize: 12,
    opacity: 0.7,
    marginLeft: 8,
  },
  actionsSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 16,
  },
  button: {
    marginBottom: 12,
  },
});
