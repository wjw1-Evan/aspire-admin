// 登录页面

import React, { useState, useRef, useEffect } from 'react';
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
import { ThemedInput } from '@/components/themed-input';
import { ThemedButton } from '@/components/themed-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import ImageCaptcha, { type ImageCaptchaRef } from '@/components/ImageCaptcha';
import { PLACEHOLDER_IMAGE_URI } from '@/constants/placeholders';

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
  if (error?.code) {
    return error.code;
  }
  if (error?.errorCode) {
    return error.errorCode;
  }
  if (error?.response?.data?.errorCode) {
    return error.response.data.errorCode;
  }
  if (error?.response?.data?.data?.errorCode) {
    return error.response.data.data.errorCode;
  }
  return undefined;
};

// 提取错误消息
const getErrorMessage = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  if (error?.response?.data?.errorMessage) {
    return error.response.data.errorMessage;
  }
  if (error?.response?.data?.data?.errorMessage) {
    return error.response.data.data.errorMessage;
  }
  if (error?.errorMessage) {
    return error.errorMessage;
  }
  if (error?.info?.errorMessage) {
    return error.info.errorMessage;
  }
  return '登录失败，请重试';
};

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [captchaKey, setCaptchaKey] = useState(0);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captchaRef = useRef<ImageCaptchaRef>(null);

  const { login, loading: authLoading } = useAuth();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#1E293B' }, 'card');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  const errorColor = useThemeColor({ light: '#FF3B30', dark: '#FF6B6B' }, 'error');

  // 显示验证码
  const enableCaptcha = () => {
    setShowCaptcha(true);
    setCaptchaKey(prev => prev + 1);
    setCaptchaAnswer('');
    setCaptchaId('');
  };

  // 清除错误消息
  const clearError = () => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setErrorMessage('');
  };

  // 显示错误提示
  const showError = (title: string, message: string) => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    
    const fullMessage = title ? `${title}: ${message}` : message;
    
    setTimeout(() => {
      setErrorMessage(fullMessage);
      
      // 5秒后自动清除错误消息
      errorTimerRef.current = setTimeout(() => {
        setErrorMessage('');
        errorTimerRef.current = null;
      }, 5000);
    }, 0);
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, []);

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
    if (authLoading) return;

    // 输入验证
    if (!username.trim() || !password.trim()) {
      showError('输入错误', '请输入用户名和密码');
      return;
    }

    if (showCaptcha && (!captchaId || !captchaAnswer?.trim())) {
      showError('验证码错误', '请输入图形验证码');
      return;
    }

    // 清除之前的错误消息
    clearError();
    
    login({
      username: username.trim(),
      password: password.trim(),
      autoLogin: true,
      type: 'account',
      captchaId: showCaptcha ? captchaId : undefined,
      captchaAnswer: showCaptcha ? captchaAnswer : undefined,
    })
      .then((response) => {
        console.log('Login success response:', response);
        // 登录成功，loading 状态会由 authReducer 自动设置为 false
        // RouteGuard 会检测到 isAuthenticated: true，然后跳转到主页
      })
      .catch((error: any) => {
        console.log('Login error caught:', error);
        // 登录失败，显示错误提示
        // AUTH_FAILURE action 会设置 isAuthenticated: false 和 loading: false
        // RouteGuard 会检测到 isAuthenticated: false，不会跳转
        handleLoginError(error);
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
                source={{ uri: PLACEHOLDER_IMAGE_URI }}
                style={styles.logo}
                placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
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
            {/* 错误提示区域 */}
            {errorMessage ? (
              <View 
                style={[
                  styles.errorContainer, 
                  { 
                    backgroundColor: errorColor + '15', 
                    borderColor: errorColor,
                  }
                ]}
              >
                <ThemedText 
                  style={[styles.errorText, { color: errorColor }]}
                  numberOfLines={3}
                >
                  {errorMessage}
                </ThemedText>
                <TouchableOpacity 
                  onPress={clearError} 
                  style={styles.errorCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ThemedText style={[styles.errorCloseText, { color: errorColor }]}>✕</ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ height: 0, marginBottom: 0 }} />
            )}

            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <IconSymbol name="person.fill" size={16} color={useThemeColor({}, 'icon')} />
                <ThemedText style={styles.label}>用户名</ThemedText>
              </View>
              <ThemedInput
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (errorMessage) {
                    clearError();
                  }
                }}
                placeholder="请输入用户名"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!authLoading}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <IconSymbol name="lock.fill" size={16} color={useThemeColor({}, 'icon')} />
                <ThemedText style={styles.label}>密码</ThemedText>
              </View>
              <View style={styles.passwordContainer}>
                <ThemedInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) {
                      clearError();
                    }
                  }}
                  placeholder="请输入密码"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!authLoading}
                  style={[styles.input, styles.passwordInput]}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <IconSymbol
                    name={showPassword ? "eye.slash.fill" : "eye.fill"}
                    size={20}
                    color={useThemeColor({}, 'icon')}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 验证码组件 */}
            {showCaptcha && (
              <View style={styles.captchaContainer}>
                <ThemedText style={styles.captchaLabel}>图形验证码</ThemedText>
                <ImageCaptcha
                  ref={captchaRef}
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
              title={authLoading ? '登录中...' : '登录'}
              onPress={handleLogin}
              style={styles.loginButton}
              disabled={authLoading}
            />

            {/* 忘记密码链接 */}
            <TouchableOpacity style={styles.forgotPassword}>
              <ThemedText style={[styles.forgotPasswordText, { color: tintColor }]}>
                忘记密码？
              </ThemedText>
            </TouchableOpacity>

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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    minHeight: 48,
    width: '100%',
    ...Platform.select({
      web: {
        display: 'flex',
        visibility: 'visible',
        opacity: 1,
      },
    }),
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    marginRight: 8,
  },
  errorCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorCloseText: {
    fontSize: 18,
    fontWeight: '300',
    opacity: 0.8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    width: '100%',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 4,
    zIndex: 1,
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
});

