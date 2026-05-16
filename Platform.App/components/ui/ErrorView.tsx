import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorView({
  message,
  onRetry,
}: ErrorViewProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const resolvedMessage = message || t('common.error');
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: AppStyles.spacing.xl * 2,
      backgroundColor: colors.background,
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
    message: {
      fontSize: AppStyles.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: AppStyles.spacing.md,
      lineHeight: 24,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
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
        <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
      </View>
      <Text style={styles.message}>{resolvedMessage}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Ionicons name="refresh" size={16} color={colors.cardBackground} style={{ marginRight: 6 }} />
          <Text style={styles.buttonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
