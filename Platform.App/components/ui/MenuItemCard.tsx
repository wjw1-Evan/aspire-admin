import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';

interface MenuItemCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  onPress: () => void;
  badge?: number;
}

export default function MenuItemCard({
  icon,
  title,
  description,
  onPress,
  badge,
}: MenuItemCardProps) {
  const { colors, isDark } = useTheme();

  const cardBg = isDark
    ? 'rgba(28,28,30,0.85)'
    : 'rgba(250, 250, 250, 0.85)';

  const styles = useMemo(() => StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: AppStyles.spacing.md,
      marginBottom: AppStyles.spacing.sm,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: AppStyles.spacing.md,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      marginBottom: description ? 2 : 0,
    },
    description: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    badge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginRight: AppStyles.spacing.sm,
    },
    badgeText: {
      fontSize: AppStyles.fontSize.xs,
      fontWeight: '600',
      color: '#fff',
    },
    arrow: {
      marginLeft: 4,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={22} color={colors.text} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <View style={styles.rightSection}>
        {badge !== undefined && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} style={styles.arrow} />
      </View>
    </TouchableOpacity>
  );
}
