import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';

interface StatOverviewCardProps {
  title: string;
  items: {
    label: string;
    value: number | string;
    color?: string;
    icon?: keyof typeof Ionicons.glyphMap;
  }[];
}

export default function StatOverviewCard({ title, items }: StatOverviewCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: AppStyles.borderRadius.lg,
      padding: AppStyles.spacing.md,
      marginBottom: AppStyles.spacing.md,
      ...AppStyles.shadows.md,
    },
    title: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: AppStyles.spacing.md,
    },
    grid: {},
    item: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: AppStyles.spacing.sm,
    },
    itemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    itemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemIcon: {
      marginRight: AppStyles.spacing.sm,
    },
    itemLabel: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
    },
    itemValue: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
    },
  }), [colors]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.grid}>
        {items.map((item, index) => (
          <View key={index} style={[styles.item, index < items.length - 1 && styles.itemBorder]}>
            <View style={styles.itemLeft}>
              {item.icon && (
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={item.color || colors.primary}
                  style={styles.itemIcon}
                />
              )}
              <Text style={styles.itemLabel}>{item.label}</Text>
            </View>
            <Text style={[styles.itemValue, { color: item.color || colors.text }]}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
