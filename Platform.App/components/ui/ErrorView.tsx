import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../../constants/AppStyles';

interface ErrorViewProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorView({
  message = '加载失败，请稍后重试',
  onRetry,
}: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={56} color={AppStyles.colors.error} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.buttonText}>重试</Text>
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
    padding: AppStyles.spacing.xl * 2,
    backgroundColor: AppStyles.colors.background,
  },
  message: {
    fontSize: AppStyles.fontSize.md,
    color: AppStyles.colors.textSecondary,
    textAlign: 'center',
    marginTop: AppStyles.spacing.md,
    lineHeight: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
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
