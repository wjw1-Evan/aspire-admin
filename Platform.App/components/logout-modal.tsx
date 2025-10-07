import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

interface LogoutModalProps {
  visible: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutModal({ visible, loading, onConfirm, onCancel }: LogoutModalProps) {
  const cardBackgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: '#1E293B' },
    'card'
  );
  const borderColor = useThemeColor({}, 'border');
  const errorColor = useThemeColor({}, 'error');
  const textColor = useThemeColor({}, 'text');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <ThemedView style={[styles.modal, { backgroundColor: cardBackgroundColor }]}>
          {/* 图标 */}
          <View style={styles.iconContainer}>
            <IconSymbol name="exclamationmark.triangle.fill" size={48} color={errorColor} />
          </View>

          {/* 标题 */}
          <ThemedText type="title" style={styles.title}>
            确认登出
          </ThemedText>

          {/* 内容 */}
          <ThemedText style={[styles.content, { color: textColor }]}>
            您确定要登出当前账户吗？登出后需要重新登录才能使用应用功能。
          </ThemedText>

          {/* 按钮容器 */}
          <View style={[styles.buttonContainer, { borderTopColor: borderColor }]}>
            {/* 取消按钮 */}
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderRightColor: borderColor }]}
              onPress={onCancel}
              disabled={loading}
            >
              <ThemedText style={[styles.cancelButtonText, { color: textColor }]}>
                取消
              </ThemedText>
            </TouchableOpacity>

            {/* 确认按钮 */}
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: errorColor }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={[styles.confirmButtonText, { color: '#fff' }]}>
                  确认登出
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.25)',
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 16,
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
  cancelButton: {
    borderRightWidth: 1,
    marginRight: 8,
  },
  confirmButton: {
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
