// 修改密码页面

import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedInput } from '@/components/themed-input';
import { ThemedButton } from '@/components/themed-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/useThemeColor';

const PasswordInput = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  showPassword, 
  onToggleVisibility 
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  showPassword: boolean;
  onToggleVisibility: () => void;
}) => (
  <View style={styles.inputGroup}>
    <ThemedText style={styles.inputLabel}>{label}</ThemedText>
    <View style={styles.passwordInputContainer}>
      <ThemedInput
        style={styles.passwordInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={styles.eyeButton}
        onPress={onToggleVisibility}
      >
        <IconSymbol 
          name={showPassword ? "eye.slash.fill" : "eye.fill"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
    </View>
  </View>
);

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { changePassword } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor(
    { light: '#f8f9fa', dark: '#2c2c2e' },
    'background'
  );

  const validateForm = () => {
    if (!currentPassword.trim()) {
      Alert.alert('错误', '请输入当前密码');
      return false;
    }
    
    if (!newPassword.trim()) {
      Alert.alert('错误', '请输入新密码');
      return false;
    }
    
    if (newPassword.trim().length < 6) {
      Alert.alert('错误', '新密码至少需要6个字符');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('错误', '两次输入的新密码不一致');
      return false;
    }
    
    if (currentPassword === newPassword) {
      Alert.alert('错误', '新密码不能与当前密码相同');
      return false;
    }
    
    return true;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });
      
      // 密码修改成功，显示成功提示并返回
      Alert.alert(
        '成功',
        '密码修改成功，请重新登录',
        [
          {
            text: '确定',
            onPress: () => {
              // 清空表单
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              // 返回上一页
              router.back();
            },
          },
        ]
      );
      // 错误由全局错误处理统一处理，这里不需要 catch
    } catch (error) {
      console.error('Change password error:', error);
      // 错误已被全局错误处理捕获并显示，这里重新抛出确保全局处理能够捕获
      throw error;
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              修改密码
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              为了您的账户安全，请定期更换密码
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.form}>
            <PasswordInput
              label="当前密码"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="请输入当前密码"
              showPassword={showCurrentPassword}
              onToggleVisibility={() => setShowCurrentPassword(!showCurrentPassword)}
            />

            <PasswordInput
              label="新密码"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="请输入新密码（至少6个字符）"
              showPassword={showNewPassword}
              onToggleVisibility={() => setShowNewPassword(!showNewPassword)}
            />

            <PasswordInput
              label="确认新密码"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="请再次输入新密码"
              showPassword={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            <ThemedButton
              title={loading ? "修改中..." : "修改密码"}
              onPress={handleChangePassword}
              disabled={loading}
              style={styles.changeButton}
            />

            <ThemedButton
              title="取消"
              onPress={() => router.back()}
              disabled={loading}
              variant="secondary"
              style={styles.cancelButton}
            />
          </ThemedView>

          <ThemedView style={[styles.tips, { backgroundColor: cardBackgroundColor }]}>
            <ThemedText style={styles.tipsTitle}>密码安全提示：</ThemedText>
            <ThemedText style={styles.tipsText}>• 密码长度至少6个字符</ThemedText>
            <ThemedText style={styles.tipsText}>• 建议使用字母、数字和特殊字符的组合</ThemedText>
            <ThemedText style={styles.tipsText}>• 不要使用过于简单的密码</ThemedText>
            <ThemedText style={styles.tipsText}>• 定期更换密码以保证账户安全</ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  changeButton: {
    marginTop: 20,
  },
  cancelButton: {
    marginTop: 12,
  },
  tips: {
    borderRadius: 8,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    marginBottom: 4,
  },
});
