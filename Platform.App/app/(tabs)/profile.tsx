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
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { isValidEmail } from '@/utils/validationUtils';
import type { UpdateProfileParams } from '@/types/unified-api';

export default function ProfileScreen() {
  const { user, updateProfile, changePassword } = useAuth();
  const { themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  
  // 修改密码表单数据
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
  const errorColor = useThemeColor({}, 'error');

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
      
      // 验证昵称长度（最大50个字符）
      if (editData.name.trim().length > 50) {
        Alert.alert('错误', '昵称长度不能超过50个字符');
        setLoading(false);
        return;
      }
      
      // 验证邮箱格式（如果提供了邮箱）
      if (editData.email.trim() && !isValidEmail(editData.email.trim())) {
        Alert.alert('错误', '请输入有效的邮箱地址');
        setLoading(false);
        return;
      }
      
      // 只发送可以修改的字段：name和email，不包含username（用户名不可修改）
      const dataToSend = {
        name: editData.name.trim(),
        email: editData.email.trim() || undefined,
      } as UpdateProfileParams;

      if (editData.avatar !== user?.avatar) {
        dataToSend.avatar = editData.avatar ?? '';
      }
      await updateProfile(dataToSend);
      setIsEditing(false);
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

  const handleChangePassword = useCallback(async () => {
    // 验证表单
    if (!passwordData.currentPassword.trim()) {
      Alert.alert('错误', '请输入当前密码');
      return;
    }
    
    if (!passwordData.newPassword.trim()) {
      Alert.alert('错误', '请输入新密码');
      return;
    }
    
    if (passwordData.newPassword.trim().length < 6) {
      Alert.alert('错误', '新密码至少需要6个字符');
      return;
    }
    
    if (passwordData.newPassword.trim() !== passwordData.confirmPassword.trim()) {
      Alert.alert('错误', '两次输入的新密码不一致');
      return;
    }
    
    if (passwordData.currentPassword.trim() === passwordData.newPassword.trim()) {
      Alert.alert('错误', '新密码不能与当前密码相同');
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await changePassword({
        currentPassword: passwordData.currentPassword.trim(),
        newPassword: passwordData.newPassword.trim(),
        confirmPassword: passwordData.confirmPassword.trim(),
      });
      
      if (response.success) {
        Alert.alert(
          '成功',
          '密码修改成功，请重新登录',
          [
            {
              text: '确定',
              onPress: () => {
                setIsChangingPassword(false);
                setPasswordData({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                });
              },
            },
          ]
        );
      } else {
        throw new Error(response.errorMessage || '密码修改失败');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert('错误', error instanceof Error ? error.message : '密码修改失败，请重试');
    } finally {
      setPasswordLoading(false);
    }
  }, [passwordData, changePassword]);

  const handleCancelPassword = useCallback(() => {
    setIsChangingPassword(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  }, []);

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
            {/* 头像和编辑按钮区域 */}
            <View style={styles.heroTopRow}>
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
                  <IconSymbol name="camera.fill" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              {!isEditing && (
                <TouchableOpacity
                  style={[styles.heroEditButton, { borderColor: heroText }]}
                  onPress={handleEdit}
                  accessibilityRole="button"
                  accessibilityLabel="编辑个人信息"
                >
                  <IconSymbol name="pencil" size={14} color={heroText} />
                  <ThemedText style={[styles.heroEditButtonText, { color: heroText }]}>编辑</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {/* 用户信息区域 */}
            <View style={styles.heroInfoSection}>
              <ThemedText type="title" style={[styles.heroTitle, { color: heroText }]}>
                {user?.name || '未设置昵称'}
              </ThemedText>
              {user?.username ? (
                <ThemedText style={[styles.heroUsername, { color: heroText, opacity: 0.7 }]} numberOfLines={1}>
                  @{user.username}
                </ThemedText>
              ) : null}
              {user?.email ? (
                <View style={styles.heroEmailRow}>
                  <IconSymbol name="envelope.fill" size={14} color={heroText} style={{ opacity: 0.7 }} />
                  <ThemedText style={[styles.heroEmail, { color: heroText, opacity: 0.8 }]} numberOfLines={1}>
                    {user.email}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {/* 统计信息 */}
            {user?.createdAt && (
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatBadge}>
                  <IconSymbol name="calendar.fill" size={14} color={heroText} style={{ opacity: 0.7 }} />
                  <ThemedText style={[styles.heroStatText, { color: heroText, opacity: 0.8 }]}>
                    {new Date(user.createdAt).getFullYear()} 年加入
                  </ThemedText>
                </View>
              </View>
            )}
          </View>
        </WeChatCard>

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
              onPress={() => setIsChangingPassword(true)}
            />
          </View>
        </WeChatCard>

        <WeChatCard>
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

      {/* 编辑个人信息模态窗体 */}
      <Modal
        visible={isEditing}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleCancel}
            />
            <View
              style={[styles.modalContent, { backgroundColor: backgroundColor }]}
            >
              <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                <ThemedText style={[styles.modalTitle, { color: textColor }]}>编辑个人信息</ThemedText>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={styles.modalCloseButton}
                  accessibilityRole="button"
                  accessibilityLabel="关闭"
                >
                  <IconSymbol name="xmark" size={20} color={textColor} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
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
                  <ThemedText style={styles.inputLabel}>昵称</ThemedText>
                  <TextInput
                    style={[styles.input, { borderColor, backgroundColor: inputBackground, color: textColor }]}
                    value={editData.name}
                    onChangeText={text => {
                      // 限制最大长度为50个字符
                      if (text.length <= 50) {
                        setEditData({ ...editData, name: text });
                      }
                    }}
                    placeholder="请输入昵称（最多50个字符）"
                    placeholderTextColor={placeholderColor}
                    selectionColor={tintColor}
                    maxLength={50}
                  />
                  <ThemedText style={[styles.inputHint, { color: mutedColor }]}>
                    {editData.name.length}/50
                  </ThemedText>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>邮箱</ThemedText>
                  <TextInput
                    style={[styles.input, { borderColor, backgroundColor: inputBackground, color: textColor }]}
                    value={editData.email}
                    onChangeText={text => setEditData({ ...editData, email: text })}
                    placeholder="请输入邮箱（可选）"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor={placeholderColor}
                    selectionColor={tintColor}
                  />
                  {editData.email.trim() && !isValidEmail(editData.email.trim()) && (
                    <ThemedText style={[styles.inputError, { color: errorColor }]}>
                      邮箱格式不正确
                    </ThemedText>
                  )}
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
                <WeChatButton
                  title="取消"
                  variant="secondary"
                  onPress={handleCancel}
                  disabled={loading}
                  style={styles.modalCancelButton}
                />
                <WeChatButton
                  title="保存"
                  onPress={handleSave}
                  loading={loading}
                  style={styles.modalSaveButton}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 修改密码模态窗体 */}
      <Modal
        visible={isChangingPassword}
        transparent
        animationType="slide"
        onRequestClose={handleCancelPassword}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleCancelPassword}
            />
            <View
              style={[styles.modalContent, { backgroundColor: backgroundColor }]}
            >
              <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                <ThemedText style={[styles.modalTitle, { color: textColor }]}>修改密码</ThemedText>
                <TouchableOpacity
                  onPress={handleCancelPassword}
                  style={styles.modalCloseButton}
                  accessibilityRole="button"
                  accessibilityLabel="关闭"
                >
                  <IconSymbol name="xmark" size={20} color={textColor} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>当前密码</ThemedText>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={[styles.passwordInput, { borderColor, backgroundColor: inputBackground, color: textColor }]}
                      value={passwordData.currentPassword}
                      onChangeText={text => setPasswordData({ ...passwordData, currentPassword: text })}
                      placeholder="请输入当前密码"
                      secureTextEntry={!showCurrentPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholderTextColor={placeholderColor}
                      selectionColor={tintColor}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      <IconSymbol
                        name={showCurrentPassword ? "eye.slash.fill" : "eye.fill"}
                        size={20}
                        color={mutedColor}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>新密码</ThemedText>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={[styles.passwordInput, { borderColor, backgroundColor: inputBackground, color: textColor }]}
                      value={passwordData.newPassword}
                      onChangeText={text => setPasswordData({ ...passwordData, newPassword: text })}
                      placeholder="请输入新密码（至少6个字符）"
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholderTextColor={placeholderColor}
                      selectionColor={tintColor}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <IconSymbol
                        name={showNewPassword ? "eye.slash.fill" : "eye.fill"}
                        size={20}
                        color={mutedColor}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>确认新密码</ThemedText>
                  <View style={styles.passwordInputContainer}>
                    <TextInput
                      style={[styles.passwordInput, { borderColor, backgroundColor: inputBackground, color: textColor }]}
                      value={passwordData.confirmPassword}
                      onChangeText={text => setPasswordData({ ...passwordData, confirmPassword: text })}
                      placeholder="请再次输入新密码"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholderTextColor={placeholderColor}
                      selectionColor={tintColor}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <IconSymbol
                        name={showConfirmPassword ? "eye.slash.fill" : "eye.fill"}
                        size={20}
                        color={mutedColor}
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordData.confirmPassword && passwordData.newPassword.trim() !== passwordData.confirmPassword.trim() && (
                    <ThemedText style={[styles.inputError, { color: errorColor }]}>
                      两次输入的密码不一致
                    </ThemedText>
                  )}
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
                <WeChatButton
                  title="取消"
                  variant="secondary"
                  onPress={handleCancelPassword}
                  disabled={passwordLoading}
                  style={styles.modalCancelButton}
                />
                <WeChatButton
                  title="修改密码"
                  onPress={handleChangePassword}
                  loading={passwordLoading}
                  style={styles.modalSaveButton}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
    gap: 16,
  },
  heroCard: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 0,
    marginBottom: 4,
  },
  heroContent: {
    alignItems: 'center',
    gap: 16,
  },
  heroTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  heroAvatarWrapper: {
    position: 'relative',
  },
  heroAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  heroInfoSection: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroUsername: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: 2,
  },
  heroEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  heroEmail: {
    fontSize: 14,
    lineHeight: 18,
  },
  heroStatsRow: {
    marginTop: 4,
  },
  heroStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroStatText: {
    fontSize: 13,
    fontWeight: '500',
  },
  heroEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  heroEditButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionList: {
    backgroundColor: 'transparent',
  },
  logoutContainer: {
    marginTop: 8,
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
  inputHint: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  inputError: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 0,
    flexShrink: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalSaveButton: {
    flex: 1,
  },
});
