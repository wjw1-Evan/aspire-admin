import { request } from '@umijs/max';
import type { ApiResponse } from '@/types/unified-api';

/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
  Running = 0,      // 运行中
  Completed = 1,    // 已完成
  Cancelled = 2,    // 已取消
  Rejected = 3      // 已拒绝
}

/**
 * 审批动作枚举
 */
export enum ApprovalAction {
  Approve = 0,      // 通过
  Reject = 1,       // 拒绝
  Return = 2,       // 退回
  Delegate = 3      // 转办
}

/**
 * 审批类型枚举
 */
export enum ApprovalType {
  All = 0,          // 会签
  Any = 1           // 或签
}

/**
 * 审批人类型枚举
 */
export enum ApproverType {
  User = 0,         // 指定用户
  Role = 1,          // 角色
  Department = 2    // 部门
}

/**
 * 工作流版本
 */
export interface WorkflowVersion {
  major: number;
  minor: number;
  createdAt: string;
}

/**
 * 节点位置
 */
export interface NodePosition {
  x: number;
  y: number;
}

/**
 * 审批人规则
 */
export interface ApproverRule {
  type: ApproverType;
  userId?: string;
  roleId?: string;
  departmentId?: string;
}

/**
 * 审批节点配置
 */
export interface ApprovalConfig {
  type: ApprovalType;
  approvers: ApproverRule[];
  allowDelegate: boolean;
  allowReject: boolean;
  allowReturn: boolean;
  timeoutHours?: number;
}

/**
 * 条件节点配置
 */
export interface ConditionConfig {
  expression: string;
}

/**
 * 并行网关配置
 */
export interface ParallelConfig {
  branches: string[];
}

/**
 * 节点配置
 */
export interface NodeConfig {
  approval?: ApprovalConfig;
  condition?: ConditionConfig;
  parallel?: ParallelConfig;
  form?: FormBinding;
}

/**
 * 工作流节点
 */
export interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'approval' | 'condition' | 'parallel';
  label?: string;
  position: NodePosition;
  config: NodeConfig;
}

/**
 * 工作流边
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

/**
 * 工作流图形
 */
export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/**
 * 表单字段类型
 */
export enum FormFieldType {
  Text = 'Text',
  TextArea = 'TextArea',
  Number = 'Number',
  Date = 'Date',
  DateTime = 'DateTime',
  Select = 'Select',
  Radio = 'Radio',
  Checkbox = 'Checkbox',
  Switch = 'Switch',
  Attachment = 'Attachment',
}

/**
 * 表单目标（数据存储位置）
 */
export enum FormTarget {
  Document = 'Document',
  Instance = 'Instance',
}

/**
 * 表单字段
 */
export interface FormField {
  id?: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: { label: string; value: string }[];
  dataKey: string;
}

/**
 * 表单定义
 */
export interface FormDefinition {
  id?: string;
  name: string;
  key: string;
  version: number;
  description?: string;
  fields: FormField[];
  isActive: boolean;
  companyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 节点表单绑定
 */
export interface FormBinding {
  formDefinitionId: string;
  target: FormTarget;
  dataScopeKey?: string;
  required?: boolean;
}

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
  id?: string;
  name: string;
  description?: string;
  category: string;
  version: WorkflowVersion;
  graph: WorkflowGraph;
  isActive: boolean;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 审批记录
 */
export interface ApprovalRecord {
  id?: string;
  workflowInstanceId: string;
  nodeId: string;
  approverId: string;
  approverName?: string;
  action: ApprovalAction;
  comment?: string;
  delegateToUserId?: string;
  approvedAt?: string;
  sequence: number;
  createdAt: string;
}

/**
 * 工作流实例
 */
export interface WorkflowInstance {
  id?: string;
  workflowDefinitionId: string;
  documentId: string;
  status: WorkflowStatus;
  currentNodeId: string;
  variables: Record<string, any>;
  approvalRecords: ApprovalRecord[];
  startedBy: string;
  startedAt?: string;
  completedAt?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建流程定义请求
 */
export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  category?: string;
  graph: WorkflowGraph;
  isActive?: boolean;
}

/**
 * 更新流程定义请求
 */
export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  category?: string;
  graph?: WorkflowGraph;
  isActive?: boolean;
}

/**
 * 启动流程请求
 */
export interface StartWorkflowRequest {
  documentId: string;
  variables?: Record<string, any>;
}

/**
 * 获取流程定义列表
 */
export async function getWorkflowList(params: {
  current?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
  isActive?: boolean;
}): Promise<ApiResponse<{ list: WorkflowDefinition[]; total: number; page: number; pageSize: number }>> {
  return request('/api/workflows', {
    method: 'GET',
    params,
  });
}

/**
 * 获取流程定义详情
 */
export async function getWorkflowDetail(id: string): Promise<ApiResponse<WorkflowDefinition>> {
  return request(`/api/workflows/${id}`, {
    method: 'GET',
  });
}

/**
 * 创建流程定义
 */
export async function createWorkflow(data: CreateWorkflowRequest): Promise<ApiResponse<WorkflowDefinition>> {
  return request('/api/workflows', {
    method: 'POST',
    data,
  });
}

/**
 * 更新流程定义
 */
export async function updateWorkflow(id: string, data: UpdateWorkflowRequest): Promise<ApiResponse<WorkflowDefinition>> {
  return request(`/api/workflows/${id}`, {
    method: 'PUT',
    data,
  });
}

/**
 * 删除流程定义
 */
export async function deleteWorkflow(id: string): Promise<ApiResponse<void>> {
  return request(`/api/workflows/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 启动流程实例
 */
export async function startWorkflow(id: string, data: StartWorkflowRequest): Promise<ApiResponse<WorkflowInstance>> {
  return request(`/api/workflows/${id}/start`, {
    method: 'POST',
    data,
  });
}

/**
 * 获取流程实例列表
 */
export async function getWorkflowInstances(params: {
  current?: number;
  pageSize?: number;
  workflowDefinitionId?: string;
  status?: WorkflowStatus;
}): Promise<ApiResponse<{ list: WorkflowInstance[]; total: number; page: number; pageSize: number }>> {
  return request('/api/workflows/instances', {
    method: 'GET',
    params,
  });
}

/**
 * 获取当前用户待办的流程实例
 */
export async function getTodoInstances(params: {
  current?: number;
  pageSize?: number;
}): Promise<ApiResponse<{ list: any[]; total: number; page: number; pageSize: number }>> {
  return request('/api/workflows/instances/todo', {
    method: 'GET',
    params,
  });
}

/**
 * 获取流程实例详情
 */
export async function getWorkflowInstance(id: string): Promise<ApiResponse<WorkflowInstance>> {
  return request(`/api/workflows/instances/${id}`, {
    method: 'GET',
  });
}

/**
 * 获取审批历史
 */
export async function getApprovalHistory(id: string): Promise<ApiResponse<ApprovalRecord[]>> {
  return request(`/api/workflows/instances/${id}/history`, {
    method: 'GET',
  });
}

/**
 * 获取实例当前节点的表单定义与初始值
 */
export async function getNodeForm(instanceId: string, nodeId: string): Promise<ApiResponse<{ form: FormDefinition | null; initialValues: Record<string, any> | null }>> {
  return request(`/api/workflows/instances/${instanceId}/nodes/${nodeId}/form`, {
    method: 'GET',
  });
}

/**
 * 提交节点表单数据
 */
export async function submitNodeForm(instanceId: string, nodeId: string, values: Record<string, any>): Promise<ApiResponse<Record<string, any>>> {
  return request(`/api/workflows/instances/${instanceId}/nodes/${nodeId}/form`, {
    method: 'POST',
    data: values,
  });
}

/**
 * 执行节点动作：approve/reject/return/delegate
 */
export async function executeNodeAction(instanceId: string, nodeId: string, data: {
  action: 'approve' | 'reject' | 'return' | 'delegate';
  comment?: string;
  targetNodeId?: string;
  delegateToUserId?: string;
}): Promise<ApiResponse<string>> {
  return request(`/api/workflows/instances/${instanceId}/nodes/${nodeId}/action`, {
    method: 'POST',
    data,
  });
}

/**
 * 撤回流程（发起人）
 */
export async function withdrawInstance(instanceId: string, reason?: string): Promise<ApiResponse<string>> {
  return request(`/api/workflows/instances/${instanceId}/withdraw`, {
    method: 'POST',
    data: { reason },
  });
}

/**
 * 获取用于创建公文的流程表单
 */
export async function getDocumentCreateForm(definitionId: string): Promise<ApiResponse<{ form: FormDefinition | null; dataScopeKey?: string; initialValues?: Record<string, any> }>> {
  return request(`/api/workflows/${definitionId}/document-form`, {
    method: 'GET',
  });
}

/**
 * 按流程表单创建草稿公文
 */
export async function createDocumentByWorkflow(definitionId: string, data: {
  values: Record<string, any>;
  attachmentIds?: string[];
}): Promise<ApiResponse<any>> {
  return request(`/api/workflows/${definitionId}/documents`, {
    method: 'POST',
    data,
  });
}

/**
 * 创建并启动流程（一步到位）
 */
export async function createAndStartDocumentWorkflow(definitionId: string, data: {
  values: Record<string, any>;
  attachmentIds?: string[];
  variables?: Record<string, any>;
}): Promise<ApiResponse<{ document: any; workflowInstance: WorkflowInstance }>> {
  return request(`/api/workflows/${definitionId}/documents/start`, {
    method: 'POST',
    data,
  });
}
