import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles, commonStyles } from '../../constants/AppStyles';
import { ProjectDto, ProjectStatus } from '../../types/project';
import StatusTag from '../ui/StatusTag';
import PriorityTag from '../ui/PriorityTag';
import ProgressBar from '../ui/ProgressBar';
import { getProjectStatusColor, getProjectStatusBgColor, formatDate } from '../../utils/task';

interface ProjectCardProps {
  project: ProjectDto;
  onPress: (project: ProjectDto) => void;
}

export default function ProjectCard({ project, onPress }: ProjectCardProps) {
  return (
    <TouchableOpacity
      style={commonStyles.card}
      onPress={() => onPress(project)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="folder-outline" size={20} color={AppStyles.colors.primary} />
          <Text style={styles.name} numberOfLines={1}>{project.name}</Text>
        </View>
        <PriorityTag priority={project.priority} text={project.priorityName} />
      </View>

      <View style={styles.statusRow}>
        <StatusTag
          text={project.statusName}
          color={getProjectStatusColor(project.status)}
          backgroundColor={getProjectStatusBgColor(project.status)}
        />
      </View>

      <View style={styles.progressRow}>
        <ProgressBar percentage={project.progress} />
      </View>

      {project.projectMembers && project.projectMembers.length > 0 && (
        <View style={styles.membersRow}>
          <Ionicons name="people-outline" size={14} color={AppStyles.colors.textTertiary} />
          <Text style={styles.membersText} numberOfLines={1}>
            {project.projectMembers.join(', ')}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        {project.startDate && (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={AppStyles.colors.textTertiary} />
            <Text style={styles.dateText}>
              {formatDate(project.startDate, 'date')}
              {project.endDate ? ` ~ ${formatDate(project.endDate, 'date')}` : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppStyles.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: AppStyles.spacing.sm,
  },
  name: {
    fontSize: AppStyles.fontSize.md,
    fontWeight: '600',
    color: AppStyles.colors.text,
    marginLeft: AppStyles.spacing.sm,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: AppStyles.spacing.sm,
  },
  progressRow: {
    marginBottom: AppStyles.spacing.sm,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppStyles.spacing.xs,
  },
  membersText: {
    fontSize: AppStyles.fontSize.xs,
    color: AppStyles.colors.textTertiary,
    marginLeft: AppStyles.spacing.xs,
    flex: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppStyles.colors.borderLight,
    paddingTop: AppStyles.spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: AppStyles.fontSize.xs,
    color: AppStyles.colors.textTertiary,
    marginLeft: AppStyles.spacing.xs,
  },
});
