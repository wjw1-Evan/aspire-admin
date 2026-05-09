import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../../constants/AppStyles';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = 'folder-open-outline',
  title = '暂无数据',
  message,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color={AppStyles.colors.border} />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionText && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AppStyles.spacing.xl * 2,
    paddingHorizontal: AppStyles.spacing.lg,
  },
  title: {
    fontSize: AppStyles.fontSize.lg,
    fontWeight: '600',
    color: AppStyles.colors.textSecondary,
    marginTop: AppStyles.spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.textTertiary,
    marginTop: AppStyles.spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: AppStyles.spacing.lg,
    backgroundColor: AppStyles.colors.primary,
    paddingHorizontal: AppStyles.spacing.lg,
    paddingVertical: AppStyles.spacing.sm + 2,
    borderRadius: AppStyles.borderRadius.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: AppStyles.fontSize.sm,
    fontWeight: '600',
  },
});
