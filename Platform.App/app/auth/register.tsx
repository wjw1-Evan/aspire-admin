// 注册页面

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
import { useThemeColor } from '@/hooks/useThemeColor';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { register } = useAuth();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: '#1E293B' },
    'card'
  );
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');

  const validateForm = () => {
    if (!username.trim()) {
      Alert.alert('错误', '请输入用户名');
      return false;
    }
    
    if (username.trim().length < 3) {
      Alert.alert('错误', '用户名至少需要3个字符');
      return false;
    }
    
    if (!password.trim()) {
      Alert.alert('错误', '请输入密码');
      return false;
    }
    
    if (password.trim().length < 6) {
      Alert.alert('错误', '密码至少需要6个字符');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('错误', '两次输入的密码不一致');
      return false;
    }
    
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('错误', '请输入有效的邮箱地址');
      return false;
    }

    if (!agreeToTerms) {
      Alert.alert('错误', '请同意用户协议和隐私政策');
      return false;
    }
    
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await register({
        username: username.trim(),
        email: email.trim() || undefined,
        password: password.trim(),
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
    } catch (error) {
      Alert.alert('注册失败', error instanceof Error ? error.message : '注册失败，请重试');
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
              创建账户
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              注册新账户以开始使用 Aspire Admin Platform
            </ThemedText>
          </View>

          {/* 表单区域 */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <IconSymbol name="person.fill" size={16} color={useThemeColor({}, 'icon')} />
                <ThemedText style={styles.label}>用户名 *</ThemedText>
              </View>
              <ThemedInput
                value={username}
                onChangeText={setUsername}
                placeholder="请输入用户名（至少3个字符）"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <IconSymbol name="envelope.fill" size={16} color={useThemeColor({}, 'icon')} />
                <ThemedText style={styles.label}>邮箱</ThemedText>
              </View>
              <ThemedInput
                value={email}
                onChangeText={setEmail}
                placeholder="请输入邮箱地址（可选）"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <IconSymbol name="lock.fill" size={16} color={useThemeColor({}, 'icon')} />
                <ThemedText style={styles.label}>密码 *</ThemedText>
              </View>
              <View style={styles.passwordContainer}>
                <ThemedInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="请输入密码（至少6个字符）"
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

            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <IconSymbol name="lock.fill" size={16} color={useThemeColor({}, 'icon')} />
                <ThemedText style={styles.label}>确认密码 *</ThemedText>
              </View>
              <View style={styles.passwordContainer}>
                <ThemedInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="请再次输入密码"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  style={[styles.input, styles.passwordInput]}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <IconSymbol
                    name={showConfirmPassword ? "eye.slash.fill" : "eye.fill"}
                    size={20}
                    color={useThemeColor({}, 'icon')}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* 用户协议同意 */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
              >
                <View style={[styles.checkbox, agreeToTerms && { backgroundColor: tintColor }]}>
                  {agreeToTerms && (
                    <IconSymbol name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <ThemedText style={styles.termsText}>
                  我已阅读并同意{' '}
                  <ThemedText style={[styles.termsText, { color: tintColor }]}>
                    用户协议
                  </ThemedText>
                  {' '}和{' '}
                  <ThemedText style={[styles.termsText, { color: tintColor }]}>
                    隐私政策
                  </ThemedText>
                </ThemedText>
              </TouchableOpacity>
            </View>

            <ThemedButton
              title={loading ? "注册中..." : "创建账户"}
              onPress={handleRegister}
              disabled={loading || !agreeToTerms}
              style={styles.registerButton}
            />

            {/* 分割线 */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
              <ThemedText style={styles.dividerText}>或</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            </View>

            {/* 登录链接 */}
            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                已有账户？{' '}
              </ThemedText>
              <Link href="/auth/login" asChild>
                <TouchableOpacity>
                  <ThemedText type="link" style={styles.linkText}>立即登录</ThemedText>
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
  termsContainer: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  registerButton: {
    marginTop: 8,
    borderRadius: 12,
    height: 50,
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
