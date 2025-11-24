// 登录页面 - 基础版

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ErrorMessageBanner } from '@/components/ErrorMessageBanner';
import { FormInput } from '@/components/FormInput';
import { getErrorMessage } from '@/utils/errorUtils';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, loading: authLoading } = useAuth();

  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1E293B' }, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const subtextColor = useThemeColor({}, 'icon');

  // 登录处理
  const handleLogin = async () => {
    // 防止重复提交
    if (authLoading) return;

    // 输入验证
    if (!username.trim() || !password.trim()) {
      setErrorMessage('请输入用户名和密码');
      return;
    }

    // 清除之前的错误
    setErrorMessage('');

    try {
      // 执行登录
      await login({
        username: username.trim(),
        password: password.trim(),
        autoLogin: true,
        type: 'account',
      });
    } catch (error: any) {
      // 显示错误消息
      const message = getErrorMessage(error, '登录失败，请检查用户名和密码后重试');
      setErrorMessage(message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 头部区域 */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>欢迎回来</Text>
          <Text style={[styles.subtitle, { color: subtextColor }]}>
            登录您的账户以继续使用
          </Text>
        </View>

        {/* 表单卡片 */}
        <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          {/* 错误提示 */}
          <ErrorMessageBanner message={errorMessage} onClose={() => setErrorMessage('')} />

          <FormInput
            label="用户名"
            value={username}
            onChangeText={setUsername}
            placeholder="请输入用户名"
            disabled={authLoading}
            hasError={!!errorMessage}
            onClearError={() => setErrorMessage('')}
            onSubmitEditing={handleLogin}
          />

          <FormInput
            label="密码"
            type="password"
            value={password}
            onChangeText={setPassword}
            placeholder="请输入密码"
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            disabled={authLoading}
            hasError={!!errorMessage}
            onClearError={() => setErrorMessage('')}
            onSubmitEditing={handleLogin}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: tintColor },
              pressed && styles.buttonPressed,
              authLoading && styles.buttonDisabled,
            ]}
            onPress={(e) => {
             
              handleLogin();
            }}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>登录</Text>
            )}
          </Pressable>

          {/* 注册链接 */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: subtextColor }]}>还没有账户？</Text>
            <Link href="/auth/register" asChild>
              <Pressable>
                <Text style={[styles.linkText, { color: tintColor }]}>立即注册</Text>
              </Pressable>
            </Link>
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});
