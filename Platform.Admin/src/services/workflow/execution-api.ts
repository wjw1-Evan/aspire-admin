import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';
import type { WorkflowDefinition, WorkflowGraph, WorkflowNode, WorkflowEdge, NodeConfig } from './api';

/**
 * 创建工作流
 */
export async function createWorkflow(data: Partial<WorkflowDefinition>): Promise<ApiResponse<WorkflowDefinition>> {
  return request('/api/workflow/definitions', {
    method: 'POST',
    data,
  });
}

/**
 * 更新工作流
 */
export async function updateWorkflow(
  id: string,
  data: Partial<WorkflowDefinition>
): Promise<ApiResponse<WorkflowDefinition>> {
  return request(`/api/workflow/definitions/${id}`, {
    method: 'PUT',
    data,
  });
}

/**
 * 删除工作流
 */
export async function deleteWorkflow(id: string): Promise<ApiResponse<void>> {
  return request(`/api/workflow/definitions/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 获取工作流列表
 */
export async function getWorkflowList(params?: {
  page?: number;
  pageSize?: number;
  category?: string;
  isActive?: boolean;
  keyword?: string;
}): Promise<ApiResponse<{ list: WorkflowDefinition[]; total: number }>> {
  return request('/api/workflow/definitions', {
    method: 'GET',
    params,
  });
}

/**
 * 获取工作流详情
 */
export async function getWorkflowDetail(id: string): Promise<ApiResponse<WorkflowDefinition>> {
  return request(`/api/workflow/definitions/${id}`, {
    method: 'GET',
  });
}

/**
 * 验证工作流图
 */
export async function validateWorkflowGraph(graph: WorkflowGraph): Promise<ApiResponse<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}>> {
  return request('/api/workflow/validate', {
    method: 'POST',
    data: graph,
  });
}

/**
 * 执行工作流
 */
export async function executeWorkflow(
  definitionId: string,
  inputs?: Record<string, any>
): Promise<ApiResponse<{
  executionId: string;
  status: string;
}>> {
  return request(`/api/workflow/definitions/${definitionId}/execute`, {
    method: 'POST',
    data: inputs,
  });
}

/**
 * 获取执行状态
 */
export async function getExecutionStatus(
  executionId: string
): Promise<ApiResponse<{
  executionId: string;
  status: string;
  currentNodeId?: string;
  variables: Record<string, any>;
  completedNodes: string[];
  error?: string;
}>> {
  return request(`/api/workflow/executions/${executionId}/status`, {
    method: 'GET',
  });
}

/**
 * 暂停工作流执行
 */
export async function pauseWorkflowExecution(executionId: string): Promise<ApiResponse<void>> {
  return request(`/api/workflow/executions/${executionId}/pause`, {
    method: 'POST',
  });
}

/**
 * 恢复工作流执行
 */
export async function resumeWorkflowExecution(
  executionId: string,
  inputs?: Record<string, any>
): Promise<ApiResponse<void>> {
  return request(`/api/workflow/executions/${executionId}/resume`, {
    method: 'POST',
    data: inputs,
  });
}

/**
 * 终止工作流执行
 */
export async function stopWorkflowExecution(executionId: string): Promise<ApiResponse<void>> {
  return request(`/api/workflow/executions/${executionId}/stop`, {
    method: 'POST',
  });
}

/**
 * 获取工作流执行历史
 */
export async function getExecutionHistory(
  definitionId: string,
  params?: {
    page?: number;
    pageSize?: number;
  }
): Promise<ApiResponse<{
  list: Array<{
    executionId: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    duration: number;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
  }>;
  total: number;
}>> {
  return request(`/api/workflow/definitions/${definitionId}/executions`, {
    method: 'GET',
    params,
  });
}

/**
 * 导出工作流为 DSL
 */
export async function exportWorkflowDsl(
  definitionId: string,
  format: 'json' | 'yaml' = 'json'
): Promise<ApiResponse<string>> {
  return request(`/api/workflow/definitions/${definitionId}/export`, {
    method: 'GET',
    params: { format },
  });
}

/**
 * 从 DSL 导入工作流
 */
export async function importWorkflowDsl(
  dsl: string,
  format: 'json' | 'yaml' = 'json'
): Promise<ApiResponse<WorkflowDefinition>> {
  return request('/api/workflow/import', {
    method: 'POST',
    data: { dsl, format },
  });
}

/**
 * 从模板创建工作流
 */
export async function createFromTemplate(
  templateId: string,
  data: {
    name: string;
    description?: string;
  }
): Promise<ApiResponse<WorkflowDefinition>> {
  return request(`/api/workflow/templates/${templateId}/create`, {
    method: 'POST',
    data,
  });
}

/**
 * 获取可用节点类型列表
 */
export async function getNodeTypes(): Promise<ApiResponse<Array<{
  type: string;
  label: string;
  description: string;
  category: string;
  version: string;
  configSchema?: Record<string, any>;
}>>> {
  return request('/api/workflow/node-types', {
    method: 'GET',
  });
}

/**
 * 获取执行日志
 */
export async function getExecutionLogs(
  executionId: string,
  params?: {
    nodeId?: string;
    level?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<ApiResponse<{
  list: Array<{
    id: string;
    timestamp: string;
    nodeId?: string;
    level: string;
    message: string;
    data?: Record<string, any>;
  }>;
  total: number;
}>> {
  return request(`/api/workflow/executions/${executionId}/logs`, {
    method: 'GET',
    params,
  });
}

/**
 * 重新执行失败的节点
 */
export async function retryFailedNode(
  executionId: string,
  nodeId: string
): Promise<ApiResponse<void>> {
  return request(`/api/workflow/executions/${executionId}/nodes/${nodeId}/retry`, {
    method: 'POST',
  });
}
