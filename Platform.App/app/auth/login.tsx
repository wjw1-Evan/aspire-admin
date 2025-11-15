// 登录页面

import React, { useState, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/themed-button';
import { EnhancedErrorToast } from '@/components/EnhancedErrorToast';
import { InputWithValidation } from '@/components/InputWithValidation';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useLoginAttempts } from '@/hooks/useLoginAttempts';
import { AuthError, AuthErrorType } from '@/types/unified-api';
import ImageCaptcha, { type ImageCaptchaRef } from '@/components/ImageCaptcha';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [showError, setShowError] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState<boolean>(false);
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaAnswer, setCaptchaAnswer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const captchaRef = useRef<ImageCaptchaRef>(null);
  const { login } = useAuth();
  const { 
    recordAttempt, 
    canAttemptLogin, 
    getRemainingAttempts, 
    getLockInfo,
    clearAttempts 
  } = useLoginAttempts();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: '#1E293B' },
    'card'
  );
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  const handleLogin = async () => {
    // 防止重复提交
    if (loading) {
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError({
        type: AuthErrorType.LOGIN_FAILED,
        message: '请输入用户名和密码',
        retryable: false,
      });
      setShowError(true);
      return;
    }

    // 检查是否可以尝试登录
    if (!canAttemptLogin(username.trim())) {
      const lockInfo = getLockInfo();
      if (lockInfo) {
        setError({
          type: AuthErrorType.LOGIN_FAILED,
          message: lockInfo.reason,
          retryable: false,
        });
        setShowError(true);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      setShowError(false);
      
      await login({
        username: username.trim(),
        password: password.trim(),
        autoLogin: true,
        type: 'account',
        captchaId: showCaptcha ? captchaId : undefined,
        captchaAnswer: showCaptcha ? captchaAnswer : undefined,
      });
      
      // 登录成功，清除尝试记录（非阻塞，避免阻塞跳转）
      void clearAttempts().catch(err => {
        console.warn('清除登录尝试记录失败:', err);
      });
      
      // 登录成功后跳转到主页（使用 setTimeout 确保状态更新完成）
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    } catch (error: any) {
      // 记录失败的登录尝试
      await recordAttempt(username.trim(), false);
      
      // 检查错误是否是 AuthError 类型
      let authError: AuthError;
      if (error && typeof error === 'object' && 'type' in error && 'message' in error) {
        // 如果已经是 AuthError 类型，直接使用
        authError = error as AuthError;
      } else {
        // 如果不是，创建一个新的 AuthError
        const errorMessage = error instanceof Error ? error.message : '登录失败，请稍后重试';
        authError = {
          type: AuthErrorType.LOGIN_FAILED,
          message: errorMessage,
          retryable: true,
        };
      }
      
      // 登录失败后显示验证码
      const errorCode = error?.errorCode || error?.info?.errorCode;
      if (errorCode === 'LOGIN_FAILED' || errorCode === 'CAPTCHA_INVALID' || errorCode === 'CAPTCHA_REQUIRED') {
        setShowCaptcha(true);
        // 非阻塞方式刷新验证码，避免阻塞错误处理
        if (captchaRef.current) {
          void captchaRef.current.refresh().catch(err => {
            console.warn('刷新验证码失败:', err);
          });
        }
      }
      
      setError(authError);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissError = () => {
    setShowError(false);
    setError(null);
  };

  const handleRetryLogin = () => {
    setShowError(false);
    setError(null);
    handleLogin();
  };


  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 增强错误提示组件 */}
      <EnhancedErrorToast
        error={error}
        visible={showError}
        onDismiss={handleDismissError}
        onRetry={error?.retryable ? handleRetryLogin : undefined}
        remainingAttempts={username.trim() ? getRemainingAttempts(username.trim()) : undefined}
        lockInfo={getLockInfo()}
      />
      
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
              editable={true}
              validation={{
                required: true,
                minLength: 2,
                maxLength: 50,
              }}
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
              editable={true}
              validation={{
                required: true,
                minLength: 6,
                maxLength: 100,
              }}
              showValidation={true}
            />

            {showCaptcha && (
              <View style={styles.captchaContainer}>
                <ThemedText style={styles.captchaLabel}>图形验证码</ThemedText>
                <ImageCaptcha
                  ref={captchaRef}
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
  },
  captchaLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
});
