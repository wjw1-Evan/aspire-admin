// 个人中心页面

import React, { useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemeSelector } from '@/components/theme-selector';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { router } from 'expo-router';
import { LogoutButton } from '@/components/logout-button';

const ProfileItem = ({
  icon,
  title,
  value,
  onPress,
  showArrow = true,
  borderColor
}: {
  icon: 'person.fill' | 'envelope.fill' | 'phone.fill' | 'location.fill' | 'calendar.fill' | 'lock.fill' | 'gear' | 'questionmark.circle.fill' | 'info.circle.fill' | 'arrow.clockwise';
  title: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  borderColor?: string;
}) => (
  <TouchableOpacity 
    style={[styles.profileItem, { borderBottomColor: borderColor }]} 
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.profileItemLeft}>
      <IconSymbol name={icon as any} size={24} color="#666" />
      <ThemedText style={styles.profileItemTitle}>{title}</ThemedText>
    </View>
    <View style={styles.profileItemRight}>
      {value && <ThemedText style={styles.profileItemValue}>{value}</ThemedText>}
      {showArrow && onPress && (
        <IconSymbol name="chevron.right" size={16} color="#999" />
      )}
    </View>
  </TouchableOpacity>
);

const SettingItem = ({
  icon,
  title,
  value,
  onValueChange,
  type = 'switch',
  borderColor
}: {
  icon: 'paintbrush.fill' | 'bell.fill';
  title: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  type?: 'switch' | 'text';
  borderColor?: string;
}) => (
  <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
    <View style={styles.settingItemLeft}>
      <IconSymbol name={icon as any} size={24} color="#666" />
      <ThemedText style={styles.settingItemTitle}>{title}</ThemedText>
    </View>
    <View style={styles.settingItemRight}>
      {type === 'switch' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={value ? '#f5dd4b' : '#f4f3f4'}
        />
      ) : (
        <ThemedText style={styles.settingItemValue}>{value}</ThemedText>
      )}
    </View>
  </View>
);

const ThemeSettingItem = ({ 
  icon, 
  title, 
  themeMode,
  borderColor
}: {
  icon: 'paintbrush.fill';
  title: string;
  themeMode: string;
  borderColor?: string;
}) => {
  const getThemeInfo = (mode: string) => {
    switch (mode) {
      case 'light':
        return { label: '浅色模式', icon: 'sun.max.fill' as const };
      case 'dark':
        return { label: '深色模式', icon: 'moon.fill' as const };
      case 'system':
        return { label: '跟随系统', icon: 'gear' as const };
      default:
        return { label: '跟随系统', icon: 'gear' as const };
    }
  };

  const currentTheme = getThemeInfo(themeMode);

  return (
    <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
      <View style={styles.settingItemLeft}>
        <IconSymbol name={icon as any} size={24} color={useThemeColor({}, 'icon')} />
        <ThemedText style={styles.settingItemTitle}>{title}</ThemedText>
      </View>
      <View style={styles.settingItemRight}>
        <View style={styles.themeInfo}>
          <IconSymbol name={currentTheme.icon as any} size={16} color={useThemeColor({}, 'icon')} />
          <ThemedText style={styles.settingItemValue}>{currentTheme.label}</ThemedText>
        </View>
        <ThemeSelector />
      </View>
    </View>
  );
};

export default function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const { themeMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: '#1E293B' },
    'card'
  );
  const borderColor = useThemeColor({}, 'border');
  const tintColor = useThemeColor({}, 'tint');

  // 编辑状态下的表单数据
  const [editData, setEditData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // 只发送可以修改的字段：name和email，不包含username（用户名不可修改）
      const dataToSend = {
        name: editData.name,
        email: editData.email,
      };
      await updateProfile(dataToSend);
      setIsEditing(false);
      Alert.alert('成功', '个人信息已更新');
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('错误', error instanceof Error ? error.message : '更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  };



  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      {/* 用户头像和基本信息 */}
      <ThemedView style={[styles.header, { backgroundColor: cardBackgroundColor }]}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user?.avatar || 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editAvatarButton}>
            <IconSymbol name="camera.fill" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <ThemedText type="title" style={styles.userName}>
          {user?.name || user?.userid || '未知用户'}
        </ThemedText>
        <ThemedText style={styles.userTitle}>
          {user?.title || '用户'}
        </ThemedText>
      </ThemedView>

      {/* 个人信息编辑 */}
      {isEditing ? (
        <ThemedView style={[styles.editSection, { backgroundColor: cardBackgroundColor }]}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }]}>
            编辑个人信息
          </ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>姓名</ThemedText>
            <TextInput
              style={styles.input}
              value={editData.name}
              onChangeText={(text) => setEditData({ ...editData, name: text })}
              placeholder="请输入姓名"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>邮箱</ThemedText>
            <TextInput
              style={styles.input}
              value={editData.email}
              onChangeText={(text) => setEditData({ ...editData, email: text })}
              placeholder="请输入邮箱"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>用户名</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: '#f5f5f5' }]}
              value={editData.phone}
              editable={false}
              placeholder="用户名不可修改"
              placeholderTextColor="#999"
            />
          </View>

                 <View style={styles.editButtons}>
                   <TouchableOpacity
                     style={[styles.button, styles.cancelButton, { backgroundColor: borderColor }]}
                     onPress={handleCancel}
                   >
                     <ThemedText style={styles.cancelButtonText}>取消</ThemedText>
                   </TouchableOpacity>
                   <TouchableOpacity
                     style={[styles.button, styles.saveButton, { backgroundColor: tintColor }]}
                     onPress={handleSave}
                     disabled={loading}
                   >
                     {loading ? (
                       <ActivityIndicator color="#fff" size="small" />
                     ) : (
                       <ThemedText style={[styles.saveButtonText, { color: '#fff' }]}>保存</ThemedText>
                     )}
                   </TouchableOpacity>
                 </View>
        </ThemedView>
      ) : (
        <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }]}>
            个人信息
          </ThemedText>
          
          <ProfileItem
            icon="person.fill"
            title="姓名"
            value={user?.name || user?.userid || '未知'}
            borderColor={borderColor}
          />
          <ProfileItem
            icon="envelope.fill"
            title="邮箱"
            value={user?.email || '未设置'}
            borderColor={borderColor}
          />
          <ProfileItem
            icon="person.fill"
            title="用户名"
            value={user?.phone || '未设置'}
            borderColor={borderColor}
          />
          <ProfileItem
            icon="calendar.fill"
            title="注册时间"
            value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
            borderColor={borderColor}
          />

                <TouchableOpacity 
                  style={[styles.editButton, { backgroundColor: tintColor }]} 
                  onPress={handleEdit}
                >
                  <ThemedText style={[styles.editButtonText, { color: '#fff' }]}>编辑个人信息</ThemedText>
                </TouchableOpacity>
        </ThemedView>
      )}

      {/* 设置 */}
      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }]}>
          设置
        </ThemedText>
        
        <ThemeSettingItem
          icon="paintbrush.fill"
          title="主题设置"
          themeMode={themeMode}
          borderColor={borderColor}
        />
        <SettingItem
          icon="bell.fill"
          title="推送通知"
          value={notifications}
          onValueChange={setNotifications}
          borderColor={borderColor}
        />
        <ProfileItem
          icon="lock.fill"
          title="修改密码"
          onPress={() => router.push('/profile/change-password')}
          borderColor={borderColor}
        />
        <ProfileItem
          icon="gear"
          title="隐私设置"
          onPress={() => Alert.alert('提示', '隐私设置功能开发中')}
          borderColor={borderColor}
        />
      </ThemedView>

      {/* 其他功能 */}
      <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { borderBottomColor: borderColor }]}>
          其他
        </ThemedText>
        
        <ProfileItem
          icon="info.circle.fill"
          title="关于我们"
          onPress={() => router.push('/about/index' as any)}
          borderColor={borderColor}
        />
        <ProfileItem
          icon="arrow.clockwise"
          title="检查更新"
          onPress={() => Alert.alert('提示', '当前已是最新版本')}
          borderColor={borderColor}
        />
      </ThemedView>

             {/* 登出按钮 */}
             <ThemedView style={[styles.section, { backgroundColor: cardBackgroundColor }]}>
               <LogoutButton />
             </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 30,
    marginBottom: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userTitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  editSection: {
    marginBottom: 10,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileItemTitle: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  profileItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileItemValue: {
    fontSize: 14,
    opacity: 0.7,
    marginRight: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingItemRight: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  settingItemValue: {
    fontSize: 14,
    opacity: 0.7,
    marginLeft: 4,
  },
  editButton: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    // 背景色将通过主题系统设置
  },
  saveButton: {
    // 背景色将通过主题系统设置
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
