// 注册页面 - 简化版，使用原生组件

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ErrorMessageBanner } from '@/components/ErrorMessageBanner';
import { FormInput } from '@/components/FormInput';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useCaptcha } from '@/hooks/useCaptcha';
import { getErrorCode, getErrorMessage } from '@/utils/errorUtils';
import ImageCaptcha from '@/components/ImageCaptcha';
import { PLACEHOLDER_IMAGE_URI } from '@/constants/placeholders';

const CAPTCHA_ERROR_CODES = [
  'USER_EXISTS',
  'EMAIL_EXISTS',
  'CAPTCHA_INVALID',
  'CAPTCHA_REQUIRED',
  'SERVER_ERROR',
] as const;

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  USER_EXISTS: {
    title: '注册失败',
    message: '用户名已存在，请使用其他用户名',
  },
  EMAIL_EXISTS: {
    title: '注册失败',
    message: '邮箱已被注册，请使用其他邮箱',
  },
  CAPTCHA_REQUIRED: {
    title: '需要验证码',
    message: '注册失败后需要输入验证码，请在下方的验证码输入框中输入验证码后重试',
  },
  CAPTCHA_INVALID: {
    title: '验证码错误',
    message: '验证码错误，请重新输入验证码',
  },
  SERVER_ERROR: {
    title: '服务器错误',
    message: '服务器异常，请稍后重试或联系管理员',
  },
};

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const { register, clearError: clearAuthError } = useAuth();
  const { errorMessage, showError, clearError } = useErrorMessage();
  const {
    showCaptcha,
    captchaId,
    captchaAnswer,
    captchaKey,
    captchaRef,
    setCaptchaId,
    setCaptchaAnswer,
    enableCaptcha,
    refreshCaptcha,
  } = useCaptcha();

  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1E293B' }, 'card');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const subtextColor = useThemeColor({}, 'icon');

  const handleRegisterError = useCallback(
    async (error: any) => {
      if (__DEV__) {
        console.log('handleRegisterError called with error:', error);
      }

      const errorCode = getErrorCode(error);
      const errorMessage = getErrorMessage(error, '注册失败，请检查输入信息后重试');

      if (errorCode && CAPTCHA_ERROR_CODES.includes(errorCode as any)) {
        enableCaptcha();
        await refreshCaptcha();
      }

      const errorInfo = ERROR_MESSAGES[errorCode || ''] || {
        title: '注册失败',
        message: errorMessage,
      };

      showError(errorInfo.title, errorInfo.message);
    },
    [enableCaptcha, refreshCaptcha, showError]
  );

  const validateForm = useCallback(() => {
    if (!username.trim()) {
      showError('输入错误', '请输入用户名');
      return false;
    }

    if (username.trim().length < 3) {
      showError('输入错误', '用户名至少需要3个字符');
      return false;
    }

    if (!password.trim()) {
      showError('输入错误', '请输入密码');
      return false;
    }

    if (password.trim().length < 6) {
      showError('输入错误', '密码至少需要6个字符');
      return false;
    }

    if (password !== confirmPassword) {
      showError('输入错误', '两次输入的密码不一致');
      return false;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showError('输入错误', '请输入有效的邮箱地址');
      return false;
    }

    if (!agreeToTerms) {
      showError('输入错误', '请同意用户协议和隐私政策');
      return false;
    }

    return true;
  }, [username, password, confirmPassword, email, agreeToTerms, showError]);

  const handleRegister = useCallback(async () => {
    if (loading) return;

    if (!validateForm()) {
      return;
    }

    if (showCaptcha && (!captchaId || !captchaAnswer?.trim())) {
      showError('验证码错误', '请输入图形验证码');
      return;
    }

    clearError();
    clearAuthError();

    try {
      setLoading(true);
      await register({
        username: username.trim(),
        email: email.trim() || undefined,
        password: password.trim(),
        captchaId: showCaptcha ? captchaId : undefined,
        captchaAnswer: showCaptcha ? captchaAnswer : undefined,
      });

      Alert.alert(
        '注册成功',
        '账户创建成功，请登录',
        [
          {
            text: '确定',
            onPress: () => router.replace('/auth/login'),
          },
        ]
      );
    } catch (error: any) {
      if (__DEV__) {
        console.log('Register error caught:', error);
      }
      await handleRegisterError(error);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    validateForm,
    showCaptcha,
    captchaId,
    captchaAnswer,
    clearError,
    clearAuthError,
    register,
    username,
    email,
    password,
    showError,
    handleRegisterError,
  ]);

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
          <Image
            source={{ uri: PLACEHOLDER_IMAGE_URI }}
            style={styles.logo}
            placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
          />
          <Text style={[styles.title, { color: textColor }]}>创建账户</Text>
          <Text style={[styles.subtitle, { color: subtextColor }]}>
            注册新账户以开始使用
          </Text>
        </View>

        {/* 表单卡片 */}
        <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
          <ErrorMessageBanner message={errorMessage} onClose={clearError} />

          <FormInput
            label="用户名 *"
            value={username}
            onChangeText={setUsername}
            placeholder="请输入用户名（至少3个字符）"
            disabled={loading}
            hasError={!!errorMessage}
            onClearError={clearError}
          />

          <FormInput
            label="邮箱"
            type="email"
            value={email}
            onChangeText={setEmail}
            placeholder="请输入邮箱地址（可选）"
            disabled={loading}
            hasError={!!errorMessage}
            onClearError={clearError}
          />

          <FormInput
            label="密码 *"
            type="password"
            value={password}
            onChangeText={setPassword}
            placeholder="请输入密码（至少6个字符）"
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            disabled={loading}
            hasError={!!errorMessage}
            onClearError={clearError}
          />

          <FormInput
            label="确认密码 *"
            type="password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="请再次输入密码"
            showPassword={showConfirmPassword}
            onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={loading}
            hasError={!!errorMessage}
            onClearError={clearError}
          />

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
                type="register"
                placeholder="请输入图形验证码"
              />
            </View>
          )}

          {/* 用户协议同意 */}
          <Pressable
            style={styles.checkboxContainer}
            onPress={() => setAgreeToTerms(!agreeToTerms)}
          >
            <View
              style={[
                styles.checkbox,
                { borderColor: agreeToTerms ? tintColor : borderColor },
                agreeToTerms && { backgroundColor: tintColor },
              ]}
            >
              {agreeToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.termsText, { color: textColor }]}>
              我已阅读并同意{' '}
              <Text style={{ color: tintColor }}>用户协议</Text>
              {' '}和{' '}
              <Text style={{ color: tintColor }}>隐私政策</Text>
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: tintColor },
              pressed && styles.buttonPressed,
              (loading || !agreeToTerms) && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading || !agreeToTerms}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>创建账户</Text>
            )}
          </Pressable>

          {/* 分割线 */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            <Text style={[styles.dividerText, { color: subtextColor }]}>或</Text>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
          </View>

          {/* 登录链接 */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: subtextColor }]}>已有账户？</Text>
            <Link href="/auth/login" asChild>
              <Pressable>
                <Text style={[styles.linkText, { color: tintColor }]}>立即登录</Text>
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
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
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
