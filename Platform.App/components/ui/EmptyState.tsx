import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = 'folder-open-outline',
  title,
  message,
  actionText,
  onAction,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const resolvedTitle = title || t('common.empty');
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: AppStyles.spacing.xl * 2,
      paddingHorizontal: AppStyles.spacing.lg,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: AppStyles.spacing.md,
    },
    title: {
      fontSize: AppStyles.fontSize.lg,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: AppStyles.spacing.md,
      textAlign: 'center',
    },
    message: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textTertiary,
      marginTop: AppStyles.spacing.sm,
      textAlign: 'center',
      lineHeight: 20,
    },
    button: {
      marginTop: AppStyles.spacing.lg,
      backgroundColor: colors.primary,
      paddingHorizontal: AppStyles.spacing.lg,
      paddingVertical: AppStyles.spacing.sm + 2,
      borderRadius: AppStyles.borderRadius.md,
    },
    buttonText: {
      color: colors.cardBackground,
      fontSize: AppStyles.fontSize.sm,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={36} color={colors.textTertiary} />
      </View>
      <Text style={styles.title}>{resolvedTitle}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionText && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
