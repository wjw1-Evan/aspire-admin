// 登录页面

import React, { useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Alert,
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
import { ThemedInput } from '@/components/themed-input';
import { ThemedButton } from '@/components/themed-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: '#1E293B' },
    'card'
  );
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('错误', '请输入用户名和密码');
      return;
    }

    try {
      setLoading(true);
      await login({
        username: username.trim(),
        password: password.trim(),
        autoLogin: true,
        type: 'account',
      });
      
      // 登录成功后跳转到主页
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('登录失败', error instanceof Error ? error.message : '登录失败，请重试');
    } finally {
      setLoading(false);
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
            <View style={styles.inputContainer}>
            <View style={styles.inputLabelContainer}>
              <IconSymbol name="person.fill" size={16} color={useThemeColor({}, 'icon')} />
              <ThemedText style={styles.label}>用户名</ThemedText>
            </View>
              <ThemedInput
                value={username}
                onChangeText={setUsername}
                placeholder="请输入用户名"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
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
                  onChangeText={setPassword}
                  placeholder="请输入密码"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
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

            <ThemedButton
              title={loading ? "登录中..." : "登录"}
              onPress={handleLogin}
              disabled={loading}
              style={styles.loginButton}
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
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
  inputContainer: {
    marginBottom: 20,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  input: {
    borderRadius: 12,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -10 }],
    padding: 5,
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
