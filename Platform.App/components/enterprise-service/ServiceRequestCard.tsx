import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppStyles } from '../../constants/AppStyles';
import { useTheme } from '../../utils/theme';
import { ServiceRequestDto, getPriorityInfo, getStatusInfo } from '../../types/enterprise-service';
import { formatDate } from '../../utils/task';

interface ServiceRequestCardProps {
  request: ServiceRequestDto;
  onPress: (request: ServiceRequestDto) => void;
}

export default function ServiceRequestCard({ request, onPress }: ServiceRequestCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const priorityInfo = getPriorityInfo(request.priority);
  const statusInfo = getStatusInfo(request.status);

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: AppStyles.borderRadius.lg,
      padding: AppStyles.spacing.md,
      marginBottom: AppStyles.spacing.sm,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: AppStyles.spacing.sm,
    },
    title: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
      marginRight: AppStyles.spacing.sm,
    },
    badges: {
      flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    badgeText: {
      fontSize: AppStyles.fontSize.xs,
      fontWeight: '500',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    infoIcon: {
      marginRight: 4,
    },
    infoText: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textSecondary,
    },
    categoryTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: colors.borderLight,
      marginBottom: AppStyles.spacing.sm,
    },
    categoryText: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textTertiary,
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: AppStyles.spacing.sm,
      paddingTop: AppStyles.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    dateText: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textTertiary,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingText: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.warning,
      marginLeft: 2,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(request)}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {request.title || request.description || '-'}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: priorityInfo.color + '20' }]}>
            <Text style={[styles.badgeText, { color: priorityInfo.color }]}>
              {t(`enterprise_service.${priorityInfo.label}`)}
            </Text>
          </View>
        </View>
      </View>

      {request.categoryName && (
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{request.categoryName}</Text>
        </View>
      )}

      {request.description && (
        <Text style={[styles.infoText, { marginBottom: 4 }]} numberOfLines={2}>
          {request.description}
        </Text>
      )}

      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={14} color={colors.textTertiary} style={styles.infoIcon} />
        <Text style={styles.infoText}>{request.contactPerson || '-'}</Text>
      </View>

      {request.tenantName && (
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={14} color={colors.textTertiary} style={styles.infoIcon} />
          <Text style={styles.infoText}>{request.tenantName}</Text>
        </View>
      )}

      <View style={styles.bottomRow}>
        <View style={[styles.badge, { backgroundColor: statusInfo.color + '20' }]}>
          <Text style={[styles.badgeText, { color: statusInfo.color }]}>
            {t(`enterprise_service.${statusInfo.label}`)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {request.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={12} color={colors.warning} />
              <Text style={styles.ratingText}>{request.rating}</Text>
            </View>
          )}
          <Text style={[styles.dateText, { marginLeft: 8 }]}>
            {formatDate(request.createdAt, 'datetime').slice(5)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
