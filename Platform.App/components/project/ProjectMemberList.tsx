import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles, commonStyles } from '../../constants/AppStyles';
import { ProjectMemberDto, ProjectMemberRole } from '../../types/project';

interface ProjectMemberListProps {
  members: ProjectMemberDto[];
}

const roleLabels: Record<number, string> = {
  [ProjectMemberRole.Manager]: '管理员',
  [ProjectMemberRole.Member]: '成员',
  [ProjectMemberRole.Viewer]: '观察者',
};

export default function ProjectMemberList({ members }: ProjectMemberListProps) {
  if (!members || members.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={32} color={AppStyles.colors.border} />
        <Text style={styles.emptyText}>暂无成员</Text>
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
          <Text style={styles.name} numberOfLines={1}>{member.userName || '未知'}</Text>
          <Text style={styles.role}>{roleLabels[member.role] || '成员'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: AppStyles.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppStyles.spacing.xs,
  },
  avatarText: {
    fontSize: AppStyles.fontSize.lg,
    fontWeight: 'bold',
    color: AppStyles.colors.primary,
  },
  name: {
    fontSize: AppStyles.fontSize.xs,
    color: AppStyles.colors.text,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 72,
  },
  role: {
    fontSize: AppStyles.fontSize.xs - 2,
    color: AppStyles.colors.textTertiary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AppStyles.spacing.lg,
  },
  emptyText: {
    fontSize: AppStyles.fontSize.sm,
    color: AppStyles.colors.textTertiary,
    marginTop: AppStyles.spacing.sm,
  },
});
