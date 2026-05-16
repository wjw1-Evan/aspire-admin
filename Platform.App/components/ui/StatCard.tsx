import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
  loading?: boolean;
}

export default function StatCard({
  title,
  value,
  icon,
  color: colorProp,
  subtitle,
  loading,
}: StatCardProps) {
  const { colors } = useTheme();
  const color = colorProp ?? colors.primary;
  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: AppStyles.borderRadius.md,
      padding: AppStyles.spacing.md,
      alignItems: 'center',
      minWidth: 80,
      flex: 1,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: AppStyles.spacing.sm,
    },
    value: {
      fontSize: AppStyles.fontSize.xxl,
      fontWeight: 'bold',
      marginBottom: 2,
    },
    title: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textTertiary,
      marginTop: 2,
    },
  }), [colors]);

  return (
    <View style={styles.card}>
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      )}
      <Text style={[styles.value, { color }]}>{loading ? '-' : value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}
