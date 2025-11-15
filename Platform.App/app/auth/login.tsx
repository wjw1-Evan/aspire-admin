// 登录页面

import React, { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/themed-button';
import { InputWithValidation } from '@/components/InputWithValidation';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLoginAttempts } from '@/hooks/useLoginAttempts';
import ImageCaptcha from '@/components/ImageCaptcha';
import { Toast } from '@/components/Toast';

// 需要显示验证码的错误代码
const CAPTCHA_ERROR_CODES = ['LOGIN_FAILED', 'CAPTCHA_INVALID', 'CAPTCHA_REQUIRED'] as const;

// 错误消息映射
const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  CAPTCHA_REQUIRED: {
    title: '需要验证码',
    message: '登录失败后需要输入验证码，请在下方的验证码输入框中输入验证码后重试',
  },
  CAPTCHA_INVALID: {
    title: '验证码错误',
    message: '验证码错误，请重新输入验证码',
  },
  LOGIN_FAILED: {
    title: '登录失败',
    message: '用户名或密码错误，请检查后重试',
  },
};

// 提取错误代码
const getErrorCode = (error: any): string | undefined => {
  return error?.code || error?.errorCode || error?.response?.data?.errorCode;
};

// 提取错误消息
const getErrorMessage = (error: any): string => {
  return (
    error?.response?.data?.errorMessage ||
    error?.info?.errorMessage ||
    error?.errorMessage ||
    error?.message ||
    '登录失败，请重试'
  );
};

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [toast, setToast] = useState<{
    visible: boolean;
    title?: string;
    message: string;
    type?: 'info' | 'success' | 'error' | 'warning';
  }>({
    visible: false,
    message: '',
  });

  const { login } = useAuth();
  const { recordAttempt, canAttemptLogin, getLockInfo, clearAttempts } = useLoginAttempts();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1E293B' }, 'card');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  // 显示验证码
  const enableCaptcha = () => {
    setShowCaptcha(true);
    setCaptchaKey(prev => prev + 1);
    setCaptchaAnswer('');
    setCaptchaId('');
  };

 

  // 显示错误提示
  const showError = (title: string, message: string) => {
    console.log('showError', title, message);
    setToast({
      visible: true,
      title,
      message,
      type: 'error',
    });
  };

  // 处理登录错误
  const handleLoginError = (error: any) => {
    const errorCode = getErrorCode(error);
    const errorMessage = getErrorMessage(error);
    
    // 如果需要显示验证码
    if (errorCode && CAPTCHA_ERROR_CODES.includes(errorCode as any)) {
      enableCaptcha();
    }

    // 获取错误消息
    const errorInfo = ERROR_MESSAGES[errorCode || ''] || {
      title: '登录失败',
      message: errorMessage,
    };

    showError(errorInfo.title, errorInfo.message);
  };

  // 登录处理
  const handleLogin = () => {
    if (loading) return;

    // 输入验证
    if (!username.trim() || !password.trim()) {
      showError('输入错误', '请输入用户名和密码');
      return;
    }

    if (showCaptcha && (!captchaId || !captchaAnswer?.trim())) {
      showError('验证码错误', '请输入图形验证码');
      return;
    }

    // 检查登录尝试限制
    if (!canAttemptLogin(username.trim())) {
      const lockInfo = getLockInfo();
      if (lockInfo) {
        showError('账户已锁定', lockInfo.reason);
        return;
      }
    }

    setLoading(true);
    
    login({
      username: username.trim(),
      password: password.trim(),
      autoLogin: true,
      type: 'account',
      captchaId: showCaptcha ? captchaId : undefined,
      captchaAnswer: showCaptcha ? captchaAnswer : undefined,
    })
      .then((response) => {
        console.log('response', response);
        setLoading(false);
      })
      .catch((error: any) => {
        handleLoginError(error);
        setLoading(false);
      });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 顶部装饰区域 */}
        <View style={styles.decorativeTop}>
          <View style={[styles.circle, styles.circle1, { backgroundColor: tintColor + '20' }]} />
          <View style={[styles.circle, styles.circle2, { backgroundColor: tintColor + '10' }]} />
        </View>

        {/* 主要内容区域 */}
        <ThemedView style={[styles.content, { backgroundColor: cardBackgroundColor }]}>
          {/* Logo 和标题区域 */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: 'https://via.placeholder.com/80x80/007AFF/FFFFFF?text=A' }}
                style={styles.logo}
              />
            </View>
            <ThemedText type="title" style={styles.title}>
              欢迎回来
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              登录您的账户以继续使用 Aspire Admin Platform
            </ThemedText>
          </View>

          {/* 表单区域 */}
          <View style={styles.form}>
            <InputWithValidation
              value={username}
              onChangeText={setUsername}
              label="用户名"
              placeholder="请输入用户名"
              leftIcon="person.fill"
              autoCapitalize="none"
              autoCorrect={false}
              validation={{ required: true, minLength: 2, maxLength: 50 }}
              showValidation={true}
            />

            <InputWithValidation
              value={password}
              onChangeText={setPassword}
              label="密码"
              placeholder="请输入密码"
              leftIcon="lock.fill"
              rightIcon={showPassword ? "eye.slash.fill" : "eye.fill"}
              onRightIconPress={() => setShowPassword(!showPassword)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              validation={{ required: true, minLength: 6, maxLength: 100 }}
              showValidation={true}
            />

            {/* 验证码组件 */}
            {showCaptcha && (
              <View style={styles.captchaContainer}>
                <ThemedText style={styles.captchaLabel}>图形验证码</ThemedText>
                <ImageCaptcha
                  key={`captcha-${captchaKey}`}
                  value={captchaAnswer}
                  onChange={setCaptchaAnswer}
                  onCaptchaIdChange={setCaptchaId}
                  type="login"
                  placeholder="请输入图形验证码"
                />
              </View>
            )}

            <ThemedButton
              title={loading ? '登录中...' : '登录'}
              onPress={handleLogin}
              style={styles.loginButton}
              disabled={loading}
            />

            {/* 忘记密码链接 */}
            <TouchableOpacity style={styles.forgotPassword}>
              <ThemedText style={[styles.forgotPasswordText, { color: tintColor }]}>
                忘记密码？
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* 分割线 */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            <ThemedText style={styles.dividerText}>或</ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
          </View>

          {/* 注册链接 */}
          <View style={styles.footer}>
            <ThemedText style={styles.footerText}>
              还没有账户？{' '}
            </ThemedText>
            <Link href="/auth/register" asChild>
              <TouchableOpacity>
                <ThemedText type="link" style={styles.linkText}>立即注册</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </ThemedView>

        {/* 底部装饰区域 */}
        <View style={styles.decorativeBottom}>
          <View style={[styles.circle, styles.circle3, { backgroundColor: tintColor + '15' }]} />
        </View>
      </ScrollView>

      {/* Toast 提示 */}
      <Toast
        visible={toast.visible}
        title={toast.title}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  decorativeTop: {
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeBottom: {
    height: 80,
    position: 'relative',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
  },
  circle1: {
    width: 120,
    height: 120,
    top: -60,
    right: -30,
  },
  circle2: {
    width: 80,
    height: 80,
    top: 20,
    left: -20,
  },
  circle3: {
    width: 100,
    height: 100,
    bottom: -50,
    right: -25,
  },
  content: {
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 24,
    padding: 32,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  loginButton: {
    marginTop: 8,
    borderRadius: 12,
    height: 50,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  captchaContainer: {
    marginTop: 16,
    marginBottom: 8,
    width: '100%',
    minHeight: 80,
  },
  captchaLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
});
