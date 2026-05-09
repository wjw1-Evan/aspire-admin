import { AppStyles } from '../constants/AppStyles';
import { TaskStatus, TaskPriority } from '../types/task';
import { ProjectStatus, ProjectPriority } from '../types/project';

export function getTaskStatusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.Pending:
      return '#999';
    case TaskStatus.Assigned:
      return '#667eea';
    case TaskStatus.InProgress:
      return '#1890ff';
    case TaskStatus.Completed:
      return '#10b981';
    case TaskStatus.Cancelled:
      return '#ef4444';
    case TaskStatus.Failed:
      return '#ff4d4f';
    case TaskStatus.Paused:
      return '#f59e0b';
    default:
      return '#999';
  }
}

export function getTaskStatusBgColor(status: TaskStatus): string {
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
      return '#1890ff';
    case TaskPriority.High:
      return '#ff4d4f';
    case TaskPriority.Urgent:
      return '#ff0000';
    default:
      return '#999';
  }
}

export function getTaskPriorityBgColor(priority: TaskPriority): string {
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
      return '#1890ff';
    case ProjectStatus.OnHold:
      return '#f59e0b';
    case ProjectStatus.Completed:
      return '#10b981';
    case ProjectStatus.Cancelled:
      return '#ef4444';
    default:
      return '#999';
  }
}

export function getProjectStatusBgColor(status: ProjectStatus): string {
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
      return '#1890ff';
    case ProjectPriority.High:
      return '#ff4d4f';
    default:
      return '#999';
  }
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return '#10b981';
  if (percentage >= 60) return '#1890ff';
  if (percentage >= 30) return '#f59e0b';
  return '#ef4444';
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
