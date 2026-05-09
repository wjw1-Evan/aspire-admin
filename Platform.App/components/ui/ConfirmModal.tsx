import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../../constants/AppStyles';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  confirmColor = AppStyles.colors.primary,
  icon,
  iconColor,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: (iconColor || AppStyles.colors.primary) + '15' }]}>
              <Ionicons name={icon} size={40} color={iconColor || AppStyles.colors.primary} />
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: confirmColor }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: AppStyles.borderRadius.lg,
    padding: AppStyles.spacing.lg,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppStyles.spacing.md,
  },
  title: {
    fontSize: AppStyles.fontSize.lg,
    fontWeight: 'bold',
    color: AppStyles.colors.text,
    marginBottom: AppStyles.spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: AppStyles.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: AppStyles.spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: AppStyles.spacing.md - 2,
    borderRadius: AppStyles.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelText: {
    fontSize: AppStyles.fontSize.md,
    fontWeight: '600',
    color: AppStyles.colors.textSecondary,
  },
  confirmText: {
    fontSize: AppStyles.fontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
});
