import React, { useState, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View, KeyboardAvoidingView, Platform } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';

interface RoleDefinitionModalProps {
  readonly visible: boolean;
  readonly sessionId: string;
  readonly onClose: () => void;
  readonly onSuccess?: () => void;
}

const DEFAULT_ROLE_DEFINITION = '你是小科，请使用简体中文提供简洁、专业且友好的回复。';

export function RoleDefinitionModal({ visible, sessionId, onClose, onSuccess }: RoleDefinitionModalProps) {
  const { theme } = useTheme();
  const { reportError } = useAuth();
  const [roleDefinition, setRoleDefinition] = useState(DEFAULT_ROLE_DEFINITION);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setInitialLoading(true);
      const loadRoleDefinition = async () => {
        try {
          const stored = await authService.getAiRoleDefinition();
          if (__DEV__) {
            console.log('Loaded role definition:', stored);
          }
          // 确保设置的是实际获取到的值，而不是默认值
          setRoleDefinition(stored || DEFAULT_ROLE_DEFINITION);
        } catch (error) {
          console.error('加载角色定义失败:', error);
          setRoleDefinition(DEFAULT_ROLE_DEFINITION);
        } finally {
          setInitialLoading(false);
        }
      };
      loadRoleDefinition();
    } else {
      // 弹窗关闭时重置状态
      setRoleDefinition(DEFAULT_ROLE_DEFINITION);
      setInitialLoading(true);
    }
  }, [visible]);

  const handleSave = async () => {
    const trimmed = roleDefinition.trim() || DEFAULT_ROLE_DEFINITION;
    
    try {
      setLoading(true);
      await authService.updateAiRoleDefinition(trimmed);
      
      // 保存成功后，通知父组件更新并关闭弹窗
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('保存角色定义失败:', error);
      // 错误由全局错误处理统一处理，这里报告错误
      reportError(error);
      // 不关闭弹窗，让用户可以重试
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRoleDefinition(DEFAULT_ROLE_DEFINITION);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <View />
        </Pressable>
        <ThemedView style={[styles.modal, { backgroundColor: theme.colors.card }]}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              小科角色定义
            </ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={12}>
              <IconSymbol name="xmark" size={20} color={theme.colors.icon} />
            </Pressable>
          </View>

          <ThemedText style={[styles.description, { color: theme.colors.secondaryText }]}>
            设置小科在这个对话中的角色定义和行为方式。这将影响小科如何回复你的消息。
          </ThemedText>

          <View style={[styles.inputContainer, { borderColor: theme.colors.border }]}>
            {initialLoading ? (
              <View style={styles.loadingContainer}>
                <ThemedText style={[styles.loadingText, { color: theme.colors.secondaryText }]}>
                  加载中...
                </ThemedText>
              </View>
            ) : (
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={roleDefinition}
                onChangeText={setRoleDefinition}
                placeholder="输入角色定义..."
                placeholderTextColor={theme.colors.placeholderText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!loading}
              />
            )}
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleReset}
              style={[styles.button, styles.resetButton, { borderColor: theme.colors.border }]}
              disabled={loading}
            >
              <ThemedText style={[styles.resetButtonText, { color: theme.colors.text }]}>
                重置
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.button, styles.saveButton, { backgroundColor: theme.colors.accent }]}
              disabled={loading}
            >
              <ThemedText style={[styles.saveButtonText, { color: '#FFFFFF' }]}>
                {loading ? '保存中...' : '保存'}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    minHeight: 120,
  },
  input: {
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  resetButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  saveButton: {
    // backgroundColor set via style prop
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  loadingText: {
    fontSize: 14,
  },
});

