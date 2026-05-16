import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';

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
  confirmText,
  cancelText,
  confirmColor: confirmColorProp,
  icon,
  iconColor: iconColorProp,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const resolvedConfirmText = confirmText || t('common.confirm');
  const resolvedCancelText = cancelText || t('common.cancel');
  const confirmColor = confirmColorProp ?? colors.primary;
  const iconColor = iconColorProp ?? colors.primary;
  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: AppStyles.spacing.lg,
      width: '85%',
      maxWidth: 360,
      alignItems: 'center',
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: AppStyles.spacing.md,
    },
    title: {
      fontSize: AppStyles.fontSize.lg,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: AppStyles.spacing.sm,
      textAlign: 'center',
    },
    message: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
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
      backgroundColor: colors.borderLight,
    },
    cancelText: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    confirmText: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
      color: colors.cardBackground,
    },
  }), [colors]);

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
            <View style={styles.iconContainer}>
              <Ionicons name={icon} size={32} color={iconColor} />
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
              <Text style={styles.cancelText}>{resolvedCancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: confirmColor }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.cardBackground} />
              ) : (
                <Text style={styles.confirmText}>{resolvedConfirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
