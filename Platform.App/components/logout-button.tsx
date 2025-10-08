import React, { useState } from 'react';
import { TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { LogoutModal } from '@/components/logout-modal';

interface LogoutButtonProps {
  readonly style?: any;
  readonly showIcon?: boolean;
  readonly variant?: 'default' | 'minimal';
}

export function LogoutButton({ 
  style, 
  showIcon = true, 
  variant = 'default' 
}: LogoutButtonProps) {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const errorColor = useThemeColor({}, 'error');

  const handleLogout = () => {
    setModalVisible(true);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const handleConfirm = () => {
    setModalVisible(false);
    performLogout();
  };

  const performLogout = async () => {
    try {
      setLoading(true);
      await logout();
      
      // 登出成功提示
      Alert.alert(
        '登出成功',
        '您已成功登出，所有本地数据已清理，页面将刷新。感谢使用！',
        [
          {
            text: '确定',
            onPress: () => {
              // 页面会自动跳转到登录页面，因为认证状态已更新
            },
          },
        ]
      );
    } catch (error) {
      console.error('LogoutButton: Logout error:', error);
      
      // 登出失败处理
      Alert.alert(
        '登出失败',
        '登出过程中出现错误，但本地数据已清理。请检查网络连接后重试。',
        [
          {
            text: '重试',
            onPress: () => {
              performLogout();
            },
          },
          {
            text: '确定',
            style: 'cancel',
            onPress: () => {
              // 即使登出失败，本地数据也已清理，页面会自动跳转
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'minimal') {
    return (
      <>
        <TouchableOpacity
          style={[styles.minimalButton, style]}
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={errorColor} size="small" />
          ) : (
            <ThemedText style={[styles.minimalText, { color: errorColor }]}>
              登出
            </ThemedText>
          )}
        </TouchableOpacity>

        {/* 登出确认模态对话框 */}
        <LogoutModal
          visible={modalVisible}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.defaultButton,
          { backgroundColor: errorColor },
          loading && styles.disabledButton,
          style,
        ]}
        onPress={handleLogout}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          showIcon && <IconSymbol name="power" size={20} color="#fff" />
        )}
        <ThemedText style={[styles.buttonText, { color: '#fff' }]}>
          {loading ? '登出中...' : '登出'}
        </ThemedText>
      </TouchableOpacity>

      {/* 登出确认模态对话框 */}
      <LogoutModal
        visible={modalVisible}
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  defaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 10,
  },
  minimalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  minimalText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
