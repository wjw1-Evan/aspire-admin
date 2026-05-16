import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles, createCommonStyles } from '../../constants/AppStyles';
import { ProjectDto, ProjectStatus } from '../../types/project';
import StatusTag from '../ui/StatusTag';
import PriorityTag from '../ui/PriorityTag';
import ProgressBar from '../ui/ProgressBar';
import { getProjectStatusColor, getProjectStatusBgColor, formatDate } from '../../utils/task';
import { useTheme } from '../../utils/theme';

interface ProjectCardProps {
  project: ProjectDto;
  onPress: (project: ProjectDto) => void;
}

export default function ProjectCard({ project, onPress }: ProjectCardProps) {
  const { colors, isDark } = useTheme();
  const comStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      padding: AppStyles.spacing.md,
      marginBottom: AppStyles.spacing.sm,
    },
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
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      fontSize: AppStyles.fontSize.md,
      fontWeight: '600',
      color: colors.text,
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
      color: colors.textTertiary,
      marginLeft: AppStyles.spacing.xs,
      flex: 1,
    },
    footer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
      paddingTop: AppStyles.spacing.sm,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateText: {
      fontSize: AppStyles.fontSize.xs,
      color: colors.textTertiary,
      marginLeft: AppStyles.spacing.xs,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(project)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="folder-outline" size={18} color={colors.primary} />
          </View>
          <Text style={styles.name} numberOfLines={1}>{project.name}</Text>
        </View>
        <PriorityTag priority={project.priority} text={project.priorityName} />
      </View>

      <View style={styles.statusRow}>
        <StatusTag
          text={project.statusName}
          color={getProjectStatusColor(project.status)}
          backgroundColor={getProjectStatusBgColor(project.status, isDark)}
        />
      </View>

      <View style={styles.progressRow}>
        <ProgressBar percentage={project.progress} />
      </View>

      {project.projectMembers && project.projectMembers.length > 0 && (
        <View style={styles.membersRow}>
          <Ionicons name="people-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.membersText} numberOfLines={1}>
            {project.projectMembers.join(', ')}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        {project.startDate && (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
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
