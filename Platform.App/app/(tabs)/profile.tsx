// 个人中心页面

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  View,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemeSelector } from '@/components/theme-selector';
import { LogoutButton } from '@/components/logout-button';
import { WeChatCard } from '@/components/ui/wx-card';
import { WeChatListItem } from '@/components/ui/wx-list-item';
import { WeChatButton } from '@/components/ui/wx-button';
import type { UpdateProfileParams } from '@/types/unified-api';

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const { themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const heroBackground = useThemeColor({ light: '#e0f2ff', dark: '#0f172a' }, 'card');
  const heroText = useThemeColor({ light: '#0f172a', dark: '#e2e8f0' }, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const tintColor = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'tabIconDefault');
  const placeholderColor = useThemeColor({}, 'placeholder');
  const inputBackground = useThemeColor({ light: '#F9FAFB', dark: '#111827' }, 'card');
  const disabledInputBackground = useThemeColor({ light: '#ECEFF5', dark: '#1F2937' }, 'card');
  const avatarPlaceholder = useThemeColor({ light: '#f0f0f0', dark: '#1f2937' }, 'card');
  const textColor = useThemeColor({}, 'text');

  const switchTrackOff = useThemeColor({ light: '#d1d5db', dark: '#334155' }, 'border');
  const switchThumbOff = useThemeColor({ light: '#f4f3f4', dark: '#1f2937' }, 'card');
  const heroDividerColor = themeMode === 'dark' ? 'rgba(255, 255, 255, 0.28)' : 'rgba(15, 23, 42, 0.1)';

  // 编辑状态下的表单数据
  const [editData, setEditData] = useState<{
    name: string;
    email: string;
    phone: string;
    avatar?: string;
  }>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar,
  });

  useEffect(() => {
    if (!isEditing) {
      setEditData({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        avatar: user?.avatar,
      });
    }
  }, [isEditing, user?.avatar, user?.email, user?.name, user?.phone]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      avatar: user?.avatar,
    });
  }, [user?.avatar, user?.email, user?.name, user?.phone]);

  const pickAvatarImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('提示', '需要访问相册权限才能更换头像，请在系统设置中开启。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
        Alert.alert('提示', '请选择小于 2 MB 的图片');
        return;
      }

      if (!asset.base64) {
        Alert.alert('错误', '读取图片失败，请重试');
        return;
      }

      const mime = asset.mimeType ?? 'image/jpeg';
      const dataUrl = `data:${mime};base64,${asset.base64}`;

      setEditData(prev => ({
        ...prev,
        avatar: dataUrl,
      }));
    } catch (error) {
      console.error('Pick avatar error:', error);
      Alert.alert('错误', '选择头像失败，请重试');
    }
  }, []);

  const handleAvatarPress = useCallback(() => {
    if (!isEditing) {
      handleEdit();
      setTimeout(() => {
        void pickAvatarImage();
      }, 150);
      return;
    }

    void pickAvatarImage();
  }, [handleEdit, isEditing, pickAvatarImage]);

  const handleSave = useCallback(async () => {
    try {
      setLoading(true);
      // 只发送可以修改的字段：name和email，不包含username（用户名不可修改）
      const dataToSend = {
        name: editData.name,
        email: editData.email,
      } as UpdateProfileParams;

      if (editData.avatar !== user?.avatar) {
        dataToSend.avatar = editData.avatar ?? '';
      }
      await updateProfile(dataToSend);
      setIsEditing(false);
      Alert.alert('成功', '个人信息已更新');
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('错误', error instanceof Error ? error.message : '更新失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [editData.avatar, editData.email, editData.name, updateProfile, user?.avatar]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      avatar: user?.avatar,
    });
  }, [user?.avatar, user?.email, user?.name, user?.phone]);

  const themeLabel = useMemo(() => {
    switch (themeMode) {
      case 'light':
        return '当前：浅色模式';
      case 'dark':
        return '当前：深色模式';
      default:
        return '当前：跟随系统';
    }
  }, [themeMode]);

  return (
    <ThemedView style={[styles.container, { backgroundColor, paddingTop: insets.top }]}> 
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WeChatCard style={[styles.heroCard, { backgroundColor: heroBackground }]}> 
          <View style={styles.heroContent}>
            <View style={styles.heroAvatarWrapper}>
              <Image
                source={{ uri: (isEditing ? editData.avatar : user?.avatar) || 'https://via.placeholder.com/120' }}
                style={[styles.heroAvatar, { backgroundColor: avatarPlaceholder }]}
              />
              <TouchableOpacity
                style={[styles.editAvatarButton, { backgroundColor: tintColor }]}
                onPress={handleAvatarPress}
                accessibilityRole="button"
                accessibilityLabel="更换头像"
              >
                <IconSymbol name="camera.fill" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <ThemedText type="title" style={[styles.heroTitle, { color: heroText }]}>
              {user?.name || user?.userid || '未知用户'}
            </ThemedText>
            <ThemedText style={[styles.heroSubtitle, { color: heroText, opacity: 0.75 }]} numberOfLines={2}>
              {user?.title || '欢迎来到 Aspire'}
            </ThemedText>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatItem}>
                <ThemedText style={[styles.heroStatValue, { color: heroText }]}>
                  {user?.createdAt ? new Date(user.createdAt).getFullYear() : '--'}
                </ThemedText>
                <ThemedText style={[styles.heroStatLabel, { color: heroText, opacity: 0.7 }]}>加入年份</ThemedText>
              </View>
              <View style={[styles.heroDivider, { backgroundColor: heroDividerColor }]} />
              <View style={styles.heroStatItem}>
                <ThemedText style={[styles.heroStatValue, { color: heroText }]}>
                  {user?.email ? '已绑定' : '待完善'}
                </ThemedText>
                <ThemedText style={[styles.heroStatLabel, { color: heroText, opacity: 0.7 }]}>邮箱状态</ThemedText>
              </View>
            </View>
          </View>
        </WeChatCard>

        {isEditing ? (
          <WeChatCard>
            <ThemedText style={styles.sectionTitle}>编辑个人信息</ThemedText>
            <View style={styles.avatarEditRow}>
              <Image
                source={{ uri: editData.avatar || user?.avatar || 'https://via.placeholder.com/120' }}
                style={[styles.editAvatarPreview, { backgroundColor: avatarPlaceholder }]}
              />
              <View style={styles.avatarEditActions}>
                <WeChatButton
                  title="更换头像"
                  variant="secondary"
                  onPress={handleAvatarPress}
                  style={[styles.changeAvatarButton, { borderColor: tintColor }]}
                  textStyle={[styles.changeAvatarLabel, { color: tintColor }]}
                />
                <ThemedText style={[styles.avatarHint, { color: mutedColor }]}>建议使用 1:1 图片，支持 JPG/PNG</ThemedText>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>姓名</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, backgroundColor: inputBackground, color: textColor }]}
                value={editData.name}
                onChangeText={text => setEditData({ ...editData, name: text })}
                placeholder="请输入姓名"
                placeholderTextColor={placeholderColor}
                selectionColor={tintColor}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>邮箱</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, backgroundColor: inputBackground, color: textColor }]}
                value={editData.email}
                onChangeText={text => setEditData({ ...editData, email: text })}
                placeholder="请输入邮箱"
                keyboardType="email-address"
                placeholderTextColor={placeholderColor}
                selectionColor={tintColor}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>用户名</ThemedText>
              <TextInput
                style={[styles.input, { borderColor, backgroundColor: disabledInputBackground, color: mutedColor }]}
                value={user?.phone || '未设置'}
                editable={false}
                placeholder="用户名不可修改"
                placeholderTextColor={placeholderColor}
              />
            </View>

            <View style={styles.editButtonRow}>
              <WeChatButton title="取消" variant="secondary" onPress={handleCancel} disabled={loading} />
              <WeChatButton title="保存" onPress={handleSave} loading={loading} />
            </View>
          </WeChatCard>
        ) : (
          <WeChatCard>
            <ThemedText style={styles.sectionTitle}>个人信息</ThemedText>
            <View style={styles.sectionList}>
              <WeChatListItem
                icon="person.fill"
                title="姓名"
                rightIcon={<ThemedText style={[styles.rightValue, { color: mutedColor }]}>{user?.name || user?.userid || '未知'}</ThemedText>}
              />
              <WeChatListItem
                icon="envelope.fill"
                title="邮箱"
                rightIcon={<ThemedText style={[styles.rightValue, { color: mutedColor }]}>{user?.email || '未设置'}</ThemedText>}
              />
              <WeChatListItem
                icon="person.fill"
                title="用户名"
                rightIcon={<ThemedText style={[styles.rightValue, { color: mutedColor }]}>{user?.phone || '未设置'}</ThemedText>}
              />
              <WeChatListItem
                icon="calendar.fill"
                title="注册时间"
                rightIcon={<ThemedText style={[styles.rightValue, { color: mutedColor }]}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}</ThemedText>}
              />
            </View>
            <WeChatButton title="编辑个人信息" onPress={handleEdit} style={styles.sectionButton} />
          </WeChatCard>
        )}

        <WeChatCard>
          <ThemedText style={styles.sectionTitle}>偏好设置</ThemedText>
          <View style={styles.sectionList}>
            <WeChatListItem
              icon="paintbrush.fill"
              title="主题设置"
              description={themeLabel}
              rightIcon={<ThemeSelector />}
            />
            <WeChatListItem
              icon="bell.fill"
              title="推送通知"
              description={notifications ? '开启后接收新消息提醒' : '已关闭消息提醒'}
              rightIcon={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: switchTrackOff, true: `${tintColor}80` }}
                  thumbColor={notifications ? tintColor : switchThumbOff}
                  ios_backgroundColor={switchTrackOff}
                />
              }
            />
            <WeChatListItem
              icon="lock.fill"
              title="修改密码"
              rightIcon={<IconSymbol name="chevron.right" size={16} color={mutedColor} />}
              onPress={() => router.push('/profile/change-password')}
            />
          </View>
        </WeChatCard>

        <WeChatCard>
          <ThemedText style={styles.sectionTitle}>账号与支持</ThemedText>
          <View style={styles.sectionList}>
            <WeChatListItem
              icon="gear"
              title="隐私设置"
              rightIcon={<IconSymbol name="chevron.right" size={16} color={mutedColor} />}
              onPress={() => Alert.alert('提示', '隐私设置功能开发中')}
            />
            <WeChatListItem
              icon="arrow.clockwise"
              title="检查更新"
              rightIcon={<IconSymbol name="chevron.right" size={16} color={mutedColor} />}
              onPress={() => Alert.alert('提示', '当前已是最新版本')}
            />
          </View>
          <View style={styles.logoutContainer}>
            <LogoutButton />
          </View>
        </WeChatCard>
      </ScrollView>
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={tintColor} />
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
    gap: 12,
  },
  heroCard: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderWidth: 0,
  },
  heroContent: {
    alignItems: 'center',
    gap: 12,
  },
  heroAvatarWrapper: {
    position: 'relative',
  },
  heroAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroStatItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  heroStatLabel: {
    fontSize: 12,
  },
  heroDivider: {
    width: 1,
    height: 34,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionList: {
    backgroundColor: 'transparent',
  },
  sectionButton: {
    marginTop: 12,
  },
  rightValue: {
    fontSize: 14,
  },
  avatarEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  editAvatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarEditActions: {
    flex: 1,
    gap: 6,
  },
  changeAvatarButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
  },
  changeAvatarLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  avatarHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputGroup: {
    marginTop: 16,
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  logoutContainer: {
    marginTop: 8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
});
