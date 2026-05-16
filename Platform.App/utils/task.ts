import { TaskStatus, TaskPriority } from '../types/task';
import { ProjectStatus, ProjectPriority } from '../types/project';

export function getTaskStatusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.Pending:
      return '#999';
    case TaskStatus.Assigned:
      return '#818cf8';
    case TaskStatus.InProgress:
      return '#60a5fa';
    case TaskStatus.Completed:
      return '#34d399';
    case TaskStatus.Cancelled:
      return '#f87171';
    case TaskStatus.Failed:
      return '#f87171';
    case TaskStatus.Paused:
      return '#fbbf24';
    default:
      return '#999';
  }
}

export function getTaskStatusBgColor(status: TaskStatus, isDark = false): string {
  if (isDark) {
    switch (status) {
      case TaskStatus.Pending:
        return '#2d2d2d';
      case TaskStatus.Assigned:
        return '#1e1b4b';
      case TaskStatus.InProgress:
        return '#172554';
      case TaskStatus.Completed:
        return '#052e16';
      case TaskStatus.Cancelled:
        return '#450a0a';
      case TaskStatus.Failed:
        return '#450a0a';
      case TaskStatus.Paused:
        return '#422006';
      default:
        return '#2d2d2d';
    }
  }
  switch (status) {
    case TaskStatus.Pending:
      return '#f5f5f5';
    case TaskStatus.Assigned:
      return '#f0f5ff';
    case TaskStatus.InProgress:
      return '#e6f7ff';
    case TaskStatus.Completed:
      return '#f0fff4';
    case TaskStatus.Cancelled:
      return '#fff2f0';
    case TaskStatus.Failed:
      return '#fff2f0';
    case TaskStatus.Paused:
      return '#fffbe6';
    default:
      return '#f5f5f5';
  }
}

export function getTaskPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.Low:
      return '#999';
    case TaskPriority.Medium:
      return '#60a5fa';
    case TaskPriority.High:
      return '#f87171';
    case TaskPriority.Urgent:
      return '#ef4444';
    default:
      return '#999';
  }
}

export function getTaskPriorityBgColor(priority: TaskPriority, isDark = false): string {
  if (isDark) {
    switch (priority) {
      case TaskPriority.Low:
        return '#2d2d2d';
      case TaskPriority.Medium:
        return '#172554';
      case TaskPriority.High:
        return '#450a0a';
      case TaskPriority.Urgent:
        return '#7f1d1d';
      default:
        return '#2d2d2d';
    }
  }
  switch (priority) {
    case TaskPriority.Low:
      return '#f5f5f5';
    case TaskPriority.Medium:
      return '#e6f7ff';
    case TaskPriority.High:
      return '#fff2f0';
    case TaskPriority.Urgent:
      return '#fff0f0';
    default:
      return '#f5f5f5';
  }
}

export function getProjectStatusColor(status: ProjectStatus): string {
  switch (status) {
    case ProjectStatus.Planning:
      return '#999';
    case ProjectStatus.InProgress:
      return '#60a5fa';
    case ProjectStatus.OnHold:
      return '#fbbf24';
    case ProjectStatus.Completed:
      return '#34d399';
    case ProjectStatus.Cancelled:
      return '#f87171';
    default:
      return '#999';
  }
}

export function getProjectStatusBgColor(status: ProjectStatus, isDark = false): string {
  if (isDark) {
    switch (status) {
      case ProjectStatus.Planning:
        return '#2d2d2d';
      case ProjectStatus.InProgress:
        return '#172554';
      case ProjectStatus.OnHold:
        return '#422006';
      case ProjectStatus.Completed:
        return '#052e16';
      case ProjectStatus.Cancelled:
        return '#450a0a';
      default:
        return '#2d2d2d';
    }
  }
  switch (status) {
    case ProjectStatus.Planning:
      return '#f5f5f5';
    case ProjectStatus.InProgress:
      return '#e6f7ff';
    case ProjectStatus.OnHold:
      return '#fffbe6';
    case ProjectStatus.Completed:
      return '#f0fff4';
    case ProjectStatus.Cancelled:
      return '#fff2f0';
    default:
      return '#f5f5f5';
  }
}

export function getProjectPriorityColor(priority: ProjectPriority): string {
  switch (priority) {
    case ProjectPriority.Low:
      return '#999';
    case ProjectPriority.Medium:
      return '#60a5fa';
    case ProjectPriority.High:
      return '#f87171';
    default:
      return '#999';
  }
}

export function getProgressColor(percentage: number, isDark = false): string {
  if (percentage >= 100) return isDark ? '#4ade80' : '#10b981';
  if (percentage >= 60) return isDark ? '#60a5fa' : '#1890ff';
  if (percentage >= 30) return isDark ? '#fbbf24' : '#f59e0b';
  return isDark ? '#f87171' : '#ef4444';
}

export function formatDate(dateStr?: string, format: 'date' | 'datetime' = 'datetime'): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (format === 'date') return `${year}-${month}-${day}`;
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
