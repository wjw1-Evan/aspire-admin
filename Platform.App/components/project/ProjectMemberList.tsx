import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppStyles } from '../../constants/AppStyles';
import { ProjectMemberDto, ProjectMemberRole } from '../../types/project';
import { useTheme } from '../../utils/theme';

interface ProjectMemberListProps {
  members: ProjectMemberDto[];
}

export default function ProjectMemberList({ members }: ProjectMemberListProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const roleLabels: Record<number, string> = {
    [ProjectMemberRole.Manager]: t('project_form.role_manager'),
    [ProjectMemberRole.Member]: t('project_form.role_member'),
    [ProjectMemberRole.Viewer]: t('project_form.role_viewer'),
  };
  const styles = useMemo(() => StyleSheet.create({
    scroll: {
      marginHorizontal: -AppStyles.spacing.xs,
    },
    memberCard: {
      alignItems: 'center',
      marginHorizontal: AppStyles.spacing.xs + 2,
      width: 72,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: AppStyles.spacing.xs,
    },
    avatarText: {
      fontSize: AppStyles.fontSize.lg,
      fontWeight: 'bold',
      color: colors.primary,
    },
    name: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.text,
      fontWeight: '500',
      textAlign: 'center',
      maxWidth: 72,
    },
    role: {
      fontSize: AppStyles.fontSize.xs - 2,
      color: colors.textTertiary,
      marginTop: 2,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: AppStyles.spacing.lg,
    },
    emptyText: {
      fontSize: AppStyles.fontSize.sm,
      color: colors.textTertiary,
      marginTop: AppStyles.spacing.sm,
    },
  }), [colors]);

  if (!members || members.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={32} color={colors.border} />
        <Text style={styles.emptyText}>{t('project_form.no_members')}</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      {members.map((member, index) => (
        <View key={member.id || index} style={styles.memberCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(member.userName || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>{member.userName || t('common.empty')}</Text>
          <Text style={styles.role}>{roleLabels[member.role] || t('project_form.role_member')}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
