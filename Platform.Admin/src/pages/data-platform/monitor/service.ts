import { request } from '@umijs/max';

export interface TaskExecution {
  id?: string;
  taskId: string;
  taskName: string;
  taskType: number;
  status: number;
  startTime: string;
  endTime?: string;
  duration?: string;
  progress: number;
  errorMessage?: string;
  result: Record<string, any>;
  metadata: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemMetrics {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  activeConnections: number;
  runningTasks: number;
  failedTasks: number;
  completedTasks: number;
}

export interface AlertRule {
  id?: string;
  name: string;
  title: string;
  description?: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: number;
  isEnabled: boolean;
  cooldownMinutes: number;
  notificationChannels: string[];
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Alert {
  id?: string;
  ruleId: string;
  ruleName: string;
  severity: number;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  status: number;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskExecutionRequest {
  taskId: string;
  taskName: string;
  taskType: number;
  metadata?: Record<string, any>;
}

export interface UpdateTaskStatusRequest {
  status: number;
  progress?: number;
  errorMessage?: string;
}

export interface CompleteTaskRequest {
  result?: Record<string, any>;
}

export interface AcknowledgeAlertRequest {
  acknowledgedBy: string;
}

export interface ResolveAlertRequest {
  resolvedBy: string;
}

// 获取任务执行列表
export async function getTaskExecutionList(
  params: {
    limit?: number;
    status?: number;
    taskType?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<TaskExecution[]>>(
    '/dataplatform/taskmonitor/tasks',
    {
      method: 'GET',
      params: {
        limit: params.limit || 50,
        ...params,
      },
      ...options,
    },
  );
}

// 获取任务执行详情
export async function getTaskExecutionDetail(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<TaskExecution>>(
    `/dataplatform/taskmonitor/tasks/${params.id}`,
    {
      method: 'GET',
      ...options,
    },
  );
}

// 创建任务执行记录
export async function createTaskExecution(
  data: CreateTaskExecutionRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<TaskExecution>>(
    '/dataplatform/taskmonitor/tasks',
    {
      method: 'POST',
      data,
      ...options,
    },
  );
}

// 更新任务执行状态
export async function updateTaskStatus(
  params: {
    id: string;
  },
  data: UpdateTaskStatusRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/taskmonitor/tasks/${params.id}/status`,
    {
      method: 'PUT',
      data,
      ...options,
    },
  );
}

// 完成任务执行
export async function completeTaskExecution(
  params: {
    id: string;
  },
  data?: CompleteTaskRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/taskmonitor/tasks/${params.id}/complete`,
    {
      method: 'POST',
      data,
      ...options,
    },
  );
}

// 获取系统监控指标
export async function getSystemMetrics(options?: { [key: string]: any }) {
  return request<API.Response<SystemMetrics>>(
    '/dataplatform/taskmonitor/metrics',
    {
      method: 'GET',
      ...options,
    },
  );
}

// 获取监控指标历史
export async function getMetricsHistory(
  params: {
    from: string;
    to: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<SystemMetrics[]>>(
    '/dataplatform/taskmonitor/metrics/history',
    {
      method: 'GET',
      params,
      ...options,
    },
  );
}

// 获取任务统计信息
export async function getTaskStatistics(options?: { [key: string]: any }) {
  return request<API.Response<any>>('/dataplatform/taskmonitor/statistics', {
    method: 'GET',
    ...options,
  });
}

// 获取告警规则列表
export async function getAlertRuleList(options?: { [key: string]: any }) {
  return request<API.Response<AlertRule[]>>(
    '/dataplatform/taskmonitor/alert-rules',
    {
      method: 'GET',
      ...options,
    },
  );
}

// 创建告警规则
export async function createAlertRule(
  data: AlertRule,
  options?: { [key: string]: any },
) {
  return request<API.Response<AlertRule>>(
    '/dataplatform/taskmonitor/alert-rules',
    {
      method: 'POST',
      data,
      ...options,
    },
  );
}

// 更新告警规则
export async function updateAlertRule(
  params: {
    id: string;
  },
  data: AlertRule,
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/taskmonitor/alert-rules/${params.id}`,
    {
      method: 'PUT',
      data,
      ...options,
    },
  );
}

// 删除告警规则
export async function deleteAlertRule(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/taskmonitor/alert-rules/${params.id}`,
    {
      method: 'DELETE',
      ...options,
    },
  );
}

// 获取活跃告警
export async function getActiveAlerts(options?: { [key: string]: any }) {
  return request<API.Response<Alert[]>>(
    '/dataplatform/taskmonitor/alerts/active',
    {
      method: 'GET',
      ...options,
    },
  );
}

// 获取告警历史
export async function getAlertHistory(
  params: {
    from: string;
    to: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<Alert[]>>(
    '/dataplatform/taskmonitor/alerts/history',
    {
      method: 'GET',
      params,
      ...options,
    },
  );
}

// 确认告警
export async function acknowledgeAlert(
  params: {
    id: string;
  },
  data: AcknowledgeAlertRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/taskmonitor/alerts/${params.id}/acknowledge`,
    {
      method: 'POST',
      data,
      ...options,
    },
  );
}

// 解决告警
export async function resolveAlert(
  params: {
    id: string;
  },
  data: ResolveAlertRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/taskmonitor/alerts/${params.id}/resolve`,
    {
      method: 'POST',
      data,
      ...options,
    },
  );
}

// 检查告警条件
export async function checkAlertConditions(options?: { [key: string]: any }) {
  return request<API.Response<any>>('/dataplatform/taskmonitor/alerts/check', {
    method: 'POST',
    ...options,
  });
}
