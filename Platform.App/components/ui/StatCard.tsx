import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../../constants/AppStyles';

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
  color = AppStyles.colors.primary,
  subtitle,
  loading,
}: StatCardProps) {
  return (
    <View style={styles.card}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
      )}
      <Text style={[styles.value, { color }]}>{loading ? '-' : value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppStyles.colors.cardBackground,
    borderRadius: AppStyles.borderRadius.md,
    padding: AppStyles.spacing.md,
    alignItems: 'center',
    minWidth: 80,
    flex: 1,
    ...AppStyles.shadows.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    color: AppStyles.colors.textSecondary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: AppStyles.fontSize.xs,
    color: AppStyles.colors.textTertiary,
    marginTop: 2,
  },
});
