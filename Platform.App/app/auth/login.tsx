// 登录页面 - 简化版

import React, { useState, useCallback, useRef } from 'react';
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
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ErrorMessageBanner } from '@/components/ErrorMessageBanner';
import { Toast } from '@/components/Toast';
import { FormInput } from '@/components/FormInput';
import { useCaptcha } from '@/hooks/useCaptcha';
import { getErrorCode, getErrorMessage } from '@/utils/errorUtils';
import ImageCaptcha from '@/components/ImageCaptcha';
import { PLACEHOLDER_IMAGE_URI } from '@/constants/placeholders';

const CAPTCHA_ERROR_CODES = ['LOGIN_FAILED', 'CAPTCHA_INVALID', 'CAPTCHA_REQUIRED'] as const;

const ERROR_MESSAGES: Record<string, string> = {
  CAPTCHA_REQUIRED: '登录失败后需要输入验证码，请在下方的验证码输入框中输入验证码后重试',
  CAPTCHA_INVALID: '验证码错误，请重新输入验证码',
  LOGIN_FAILED: '用户名或密码错误，请检查后重试',
};

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { login, loading: authLoading, clearError: clearAuthError } = useAuth();
  const {
    showCaptcha,
    captchaId,
    captchaAnswer,
    captchaKey,
    captchaRef,
    setCaptchaId,
    setCaptchaAnswer,
    enableCaptcha,
  } = useCaptcha();

  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1E293B' }, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const subtextColor = useThemeColor({}, 'icon');

  // 显示错误消息
  const showError = useCallback((message: string) => {
    // 直接设置错误消息（React 会确保在下一个渲染周期更新）
    setErrorMessage(message);
    
    // 使用 requestAnimationFrame 确保在 DOM 更新后滚动
    // 在 React Native 中，这会在下一个渲染帧执行
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    });
  }, []);

  // 清除错误消息
  const clearError = useCallback(() => {
    setErrorMessage('');
  }, []);

  // 处理登录错误
  const handleLoginError = useCallback(
    (error: any) => {
      // 提取错误信息
      const errorCode = error?.code || error?.errorCode || getErrorCode(error);
      const defaultMessage = getErrorMessage(error, '登录失败，请检查用户名和密码后重试');
      
      // 如果需要显示验证码
      if (errorCode && (CAPTCHA_ERROR_CODES as readonly string[]).includes(errorCode)) {
        enableCaptcha();
      }

      // 获取错误消息
      const message = ERROR_MESSAGES[errorCode || ''] || defaultMessage;
      showError(message);
    },
    [enableCaptcha, showError]
  );

  // 登录处理
  const handleLogin = useCallback(async () => {
    // 防止重复提交
    if (authLoading) return;

    // 输入验证
    if (!username.trim() || !password.trim()) {
      showError('请输入用户名和密码');
      return;
    }

    if (showCaptcha && (!captchaId || !captchaAnswer?.trim())) {
      showError('请输入图形验证码');
      return;
    }

    // 清除之前的错误（同步执行，确保立即生效）
    clearError();
    clearAuthError();

    try {
      // 执行登录（使用 async/await 确保错误能正确捕获）
      await login({
        username: username.trim(),
        password: password.trim(),
        autoLogin: true,
        type: 'account',
        captchaId: showCaptcha ? captchaId : undefined,
        captchaAnswer: showCaptcha ? captchaAnswer : undefined,
      });

      // 登录成功，显示成功提示
      setShowSuccess(true);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setShowSuccess(false);
        successTimerRef.current = null;
      }, 2000);
    } catch (error: any) {
      // 处理登录错误（同步调用，React 会确保状态更新）
      handleLoginError(error);
    }
  }, [
    authLoading,
    username,
    password,
    showCaptcha,
    captchaId,
    captchaAnswer,
    clearError,
    clearAuthError,
    login,
    showError,
    handleLoginError,
  ]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 成功提示 */}
      <Toast
        visible={showSuccess}
        message="登录成功，正在跳转..."
        type="success"
        duration={2000}
        onDismiss={() => setShowSuccess(false)}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 头部区域 */}
        <View style={styles.header}>
          <Image
            source={{ uri: PLACEHOLDER_IMAGE_URI }}
            style={styles.logo}
            placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
          />
          <Text style={[styles.title, { color: textColor }]}>欢迎回来</Text>
          <Text style={[styles.subtitle, { color: subtextColor }]}>
            登录您的账户以继续使用
          </Text>
        </View>

        {/* 表单卡片 */}
        <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          {/* 错误提示 */}
          <ErrorMessageBanner message={errorMessage} onClose={clearError} />

          <FormInput
            label="用户名"
            value={username}
            onChangeText={setUsername}
            placeholder="请输入用户名"
            disabled={authLoading}
            hasError={!!errorMessage}
            onClearError={clearError}
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
            onClearError={clearError}
          />

          {/* 验证码组件 */}
          {showCaptcha && (
            <View style={styles.captchaContainer}>
              <Text style={[styles.captchaLabel, { color: textColor }]}>图形验证码</Text>
              <ImageCaptcha
                ref={captchaRef}
                key={`captcha-${captchaKey}`}
                value={captchaAnswer}
                onChange={(text) => {
                  setCaptchaAnswer(text);
                  if (errorMessage) {
                    clearError();
                  }
                }}
                onCaptchaIdChange={setCaptchaId}
                type="login"
                placeholder="请输入图形验证码"
              />
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: tintColor },
              pressed && styles.buttonPressed,
              authLoading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>登录</Text>
            )}
          </Pressable>

          <Pressable style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: tintColor }]}>忘记密码？</Text>
          </Pressable>

          {/* 分割线 */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            <Text style={[styles.dividerText, { color: subtextColor }]}>或</Text>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
          </View>

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
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: 24,
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
  captchaContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  captchaLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
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
    marginLeft: 4,
  },
});
