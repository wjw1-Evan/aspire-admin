import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorView({
  message = '加载失败，请稍后重试',
  onRetry,
}: ErrorViewProps) {
  const { colors } = useTheme();
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
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Ionicons name="refresh" size={16} color={colors.cardBackground} style={{ marginRight: 6 }} />
          <Text style={styles.buttonText}>重试</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
