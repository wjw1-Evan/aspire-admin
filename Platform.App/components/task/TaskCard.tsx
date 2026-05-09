import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppStyles, commonStyles } from '../../constants/AppStyles';
import { TaskDto, TaskStatus } from '../../types/task';
import StatusTag from '../ui/StatusTag';
import PriorityTag from '../ui/PriorityTag';
import ProgressBar from '../ui/ProgressBar';
import { getTaskStatusColor, getTaskStatusBgColor, formatDate } from '../../utils/task';

interface TaskCardProps {
  task: TaskDto;
  onPress: (task: TaskDto) => void;
}

export default function TaskCard({ task, onPress }: TaskCardProps) {
  const isOverdue = task.plannedEndTime && new Date(task.plannedEndTime) < new Date()
    && task.status !== TaskStatus.Completed && task.status !== TaskStatus.Cancelled;

  return (
    <TouchableOpacity
      style={commonStyles.card}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons
            name={task.status === TaskStatus.Completed ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={getTaskStatusColor(task.status)}
          />
          <Text style={[styles.name, task.status === TaskStatus.Completed && styles.completedName]} numberOfLines={2}>
            {task.taskName}
          </Text>
        </View>
        <PriorityTag priority={task.priority} text={task.priorityName} />
      </View>

      <View style={styles.metaRow}>
        <StatusTag
          text={task.statusName}
          color={getTaskStatusColor(task.status)}
          backgroundColor={getTaskStatusBgColor(task.status)}
        />
        {task.taskType && (
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>{task.taskType}</Text>
          </View>
        )}
      </View>

      <View style={styles.progressRow}>
        <ProgressBar percentage={task.completionPercentage} height={6} />
      </View>

      <View style={styles.footer}>
        {task.assignedToName && (
          <View style={styles.footerItem}>
            <Ionicons name="person-outline" size={12} color={AppStyles.colors.textTertiary} />
            <Text style={styles.footerText}>{task.assignedToName}</Text>
          </View>
        )}
        {task.plannedEndTime && (
          <View style={styles.footerItem}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={isOverdue ? AppStyles.colors.error : AppStyles.colors.textTertiary}
            />
            <Text style={[styles.footerText, isOverdue && styles.overdueText]}>
              {formatDate(task.plannedEndTime, 'date')}
            </Text>
          </View>
        )}
        {task.projectName && (
          <View style={styles.footerItem}>
            <Ionicons name="folder-outline" size={12} color={AppStyles.colors.textTertiary} />
            <Text style={styles.footerText} numberOfLines={1}>{task.projectName}</Text>
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
    alignItems: 'flex-start',
    marginBottom: AppStyles.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: AppStyles.spacing.sm,
  },
  name: {
    fontSize: AppStyles.fontSize.md,
    fontWeight: '600',
    color: AppStyles.colors.text,
    marginLeft: AppStyles.spacing.sm,
    flex: 1,
    lineHeight: 22,
  },
  completedName: {
    textDecorationLine: 'line-through',
    color: AppStyles.colors.textTertiary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AppStyles.spacing.sm,
  },
  typeTag: {
    marginLeft: AppStyles.spacing.sm,
    paddingHorizontal: AppStyles.spacing.sm,
    paddingVertical: 2,
    borderRadius: AppStyles.borderRadius.sm,
    backgroundColor: '#f0f5ff',
  },
  typeText: {
    fontSize: AppStyles.fontSize.xs,
    color: '#667eea',
    fontWeight: '500',
  },
  progressRow: {
    marginBottom: AppStyles.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: AppStyles.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppStyles.colors.borderLight,
    paddingTop: AppStyles.spacing.sm,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: AppStyles.fontSize.xs,
    color: AppStyles.colors.textTertiary,
    marginLeft: 4,
  },
  overdueText: {
    color: AppStyles.colors.error,
    fontWeight: '600',
  },
});
