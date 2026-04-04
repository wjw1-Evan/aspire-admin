import { TaskStatus, TaskPriority } from '@/services/task/api';

export function getTaskStatusColor(status: number): string {
  switch (status) {
    case TaskStatus.Pending:
      return 'default';
    case TaskStatus.Assigned:
      return 'processing';
    case TaskStatus.InProgress:
      return 'processing';
    case TaskStatus.Completed:
      return 'success';
    case TaskStatus.Cancelled:
      return 'error';
    case TaskStatus.Failed:
      return 'error';
    case TaskStatus.Paused:
      return 'warning';
    default:
      return 'default';
  }
}

export function getTaskPriorityColor(priority: number): string {
  switch (priority) {
    case TaskPriority.Low:
      return 'blue';
    case TaskPriority.Medium:
      return 'cyan';
    case TaskPriority.High:
      return 'orange';
    case TaskPriority.Urgent:
      return 'red';
    default:
      return 'blue';
  }
}
