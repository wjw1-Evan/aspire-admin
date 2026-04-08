import { request } from '@umijs/max';
import type { ApiResponse, PagedResult } from '@/types';
import type { PageParams } from '@/types';

/**
 * 批量操作类型
 */
export type BulkOperationType = 'Activate' | 'Deactivate' | 'Delete' | 'UpdateCategory';

/**
 * 批量操作状态
 */
export type BulkOperationStatus = 'Pending' | 'InProgress' | 'Completed' | 'Cancelled' | 'Failed';

/**
 * 批量操作错误
 */
export interface BulkOperationError {
  workflowId: string;
  workflowName?: string;
  message: string;
}

/**
 * 批量操作
 */
export interface BulkOperation {
  id: string;
  operationType: BulkOperationType;
  workflowIds: string[];
  parameters: Record<string, any>;
  status: BulkOperationStatus;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  errors: BulkOperationError[];
  cancellable: boolean;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * 创建批量操作请求
 */
export interface CreateBulkOperationRequest {
  operationType: BulkOperationType;
  workflowIds: string[];
  parameters?: Record<string, any>;
}

/**
 * 工作流状态枚举
 */
export enum WorkflowStatus {
  Running = 0,      // 运行中
  Completed = 1,    // 已完成
  Cancelled = 2,    // 已取消
  Rejected = 3,     // 已拒绝
  Waiting = 4       // 挂起等待
}

/**
 * 审批动作枚举
 */
export enum ApprovalAction {
  Approve = 0,      // 通过
  Reject = 1,       // 拒绝
  Return = 2,       // 退回
  Delegate = 3,     // 转办
  CC = 4,           // 抄送
  AutoSystem = 10   // 系统自动执行
}

/**
 * 审批类型枚举
 */
export enum ApprovalType {
  All = 0,          // 会签
  Any = 1,          // 或签
  Sequential = 2    // 顺序审批
}

/**
 * 审批人类型枚举
 */
export enum ApproverType {
  User = 0,         // 指定用户
  Role = 1,          // 角色
  Department = 2,    // 部门
  FormField = 3,     // 表单字段
  Supervisor = 4     // 主管（发起人的上级）
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
  formFieldKey?: string;
  supervisorLevel?: number;
}

/**
 * 审批节点配置
 */
export interface ApprovalConfig {
  type: ApprovalType;
  approvers: ApproverRule[];
  ccRules?: ApproverRule[];
  allowDelegate: boolean;
  allowReject: boolean;
  allowReturn: boolean;
  timeoutHours?: number;
}

/**
 * 条件规则
 */
export interface ConditionRule {
  formId?: string;
  variable: string;
  operator: string;
  value: string;
}

/**
 * 条件分支
 */
export interface ConditionBranch {
  id: string;
  label: string;
  conditions: ConditionRule[];
  logicalOperator: 'and' | 'or';
  targetNodeId: string;
  order: number;
  enabled: boolean;
}

/**
 * 条件节点配置 - 支持多分支
 */
export interface ConditionConfig {
  branches?: ConditionBranch[];
  defaultNodeId?: string;
  expression?: string;
  // 向后兼容：旧字段
  logicalOperator?: 'and' | 'or';
  conditions?: ConditionRule[];
  targetNodeId?: string;
}

/**
 * 节点配置
 */
export interface NodeConfig {
  approval?: ApprovalConfig;
  condition?: ConditionConfig;
  form?: FormBinding;
}

/**
 * 节点数据
 */
export interface NodeData {
  label?: string;
  description?: string;
  nodeType: string;
  version?: string;
  config: NodeConfig;
  credentials?: string;
  isDisabled?: boolean;
  retry?: RetryConfig;
  timeout?: TimeoutConfig;
}

export interface RetryConfig {
  enabled: boolean;
  maxAttempts: number;
  interval: number;
}

export interface TimeoutConfig {
  enabled: boolean;
  maxTimeout: number;
}

/**
 * 节点句柄
 */
export interface NodeHandles {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  source?: string[];
  target?: string[];
}

/**
 * 工作流节点
 */
export interface WorkflowNode {
  id: string;
  type: string;
  data: NodeData;
  position: NodePosition;
  parentId?: string;
  handleIds?: NodeHandles;
}

/**
 * 边数据
 */
export interface EdgeData {
  condition?: string;
  branchId?: string;
  isMemory?: boolean;
}

/**
 * 边样式
 */
export interface EdgeStyle {
  stroke?: string;
  strokeWidth?: number;
}

/**
 * 工作流边
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  label?: string;
  data?: EdgeData;
  animated?: boolean;
  style?: EdgeStyle;
}

/**
 * 视口
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * 工作流图形
 */
export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: Viewport;
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
  Document = 'document',
  Instance = 'instance',
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
 * 工作流触发器
 */
export interface WorkflowTrigger {
  type: string;
  cron?: string;
  webhook?: WebhookConfig;
  event?: EventConfig;
}

export interface WebhookConfig {
  enabled: boolean;
  method: string;
  url?: string;
}

export interface EventConfig {
  provider: string;
  eventType: string;
}

/**
 * 工作流输入
 */
export interface WorkflowInput {
  variable: string;
  type: string;
  required: boolean;
  default?: any;
  maxLength?: number;
}

/**
 * 工作流输出
 */
export interface WorkflowOutput {
  variable: string;
  type: string;
}

/**
 * 工作流模式
 */
export type WorkflowMode = 'Workflow' | 'ChatFlow' | 'Agent';

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
  mode?: WorkflowMode;
  trigger?: WorkflowTrigger;
  inputs?: WorkflowInput[];
  outputs?: WorkflowOutput[];
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
export async function getWorkflowList(params: PageParams & {
  category?: string;
  isActive?: boolean;
}): Promise<ApiResponse<PagedResult<WorkflowDefinition>>> {
  return request('/apiservice/apiservice/apiservice/api/workflows', {
    method: 'GET',
    params,
  });
}

/**
 * 获取流程定义详情
 */
export async function getWorkflowDetail(id: string): Promise<ApiResponse<WorkflowDefinition>> {
  return request(`/apiservice/apiservice/api/workflows/${id}`, {
    method: 'GET',
  });
}

/**
 * 创建流程定义
 */
export async function createWorkflow(data: CreateWorkflowRequest): Promise<ApiResponse<WorkflowDefinition>> {
  return request('/apiservice/apiservice/apiservice/api/workflows', {
    method: 'POST',
    data,
  });
}

/**
 * 更新流程定义
 */
export async function updateWorkflow(id: string, data: UpdateWorkflowRequest): Promise<ApiResponse<WorkflowDefinition>> {
  return request(`/apiservice/apiservice/api/workflows/${id}`, {
    method: 'PUT',
    data,
  });
}

/**
 * 删除流程定义
 */
export async function deleteWorkflow(id: string): Promise<ApiResponse<void>> {
  return request(`/apiservice/apiservice/api/workflows/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 启动流程实例
 */
export async function startWorkflow(id: string, data: StartWorkflowRequest): Promise<ApiResponse<WorkflowInstance>> {
  return request(`/apiservice/apiservice/api/workflows/${id}/start`, {
    method: 'POST',
    data,
  });
}

/**
 * 获取流程实例列表
 */
export async function getWorkflowInstances(params: {
  page?: number;
  pageSize?: number;
  workflowDefinitionId?: string;
  status?: WorkflowStatus;
  search?: string;
}): Promise<ApiResponse<PagedResult<WorkflowInstance>>> {
  return request('/apiservice/apiservice/apiservice/api/workflows/instances', {
    method: 'GET',
    params,
  });
}

/**
 * 获取当前用户待办的流程实例
 */
export async function getTodoInstances(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<ApiResponse<PagedResult<any>>> {
  return request('/apiservice/apiservice/apiservice/api/workflows/instances/todo', {
    method: 'GET',
    params,
  });
}

/**
 * 获取流程实例详情
 */
export async function getWorkflowInstance(id: string): Promise<ApiResponse<WorkflowInstance>> {
  return request(`/apiservice/apiservice/api/workflows/instances/${id}`, {
    method: 'GET',
  });
}

/**
 * 获取审批历史
 */
export async function getApprovalHistory(id: string): Promise<ApiResponse<ApprovalRecord[]>> {
  return request(`/apiservice/apiservice/api/workflows/instances/${id}/history`, {
    method: 'GET',
  });
}

/**
 * 获取实例当前节点的表单定义与初始值
 */
export async function getNodeForm(instanceId: string, nodeId: string): Promise<ApiResponse<{ form: FormDefinition | null; initialValues: Record<string, any> | null }>> {
  return request(`/apiservice/apiservice/api/workflows/instances/${instanceId}/nodes/${nodeId}/form`, {
    method: 'GET',
  });
}

/**
 * 提交节点表单数据
 */
export async function submitNodeForm(instanceId: string, nodeId: string, values: Record<string, any>): Promise<ApiResponse<Record<string, any>>> {
  return request(`/apiservice/apiservice/api/workflows/instances/${instanceId}/nodes/${nodeId}/form`, {
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
  return request(`/apiservice/apiservice/api/workflows/instances/${instanceId}/nodes/${nodeId}/action`, {
    method: 'POST',
    data,
  });
}

/**
 * 撤回流程（发起人）
 */
export async function withdrawInstance(instanceId: string, reason?: string): Promise<ApiResponse<string>> {
  return request(`/apiservice/apiservice/api/workflows/instances/${instanceId}/withdraw`, {
    method: 'POST',
    data: { reason },
  });
}

/**
 * 获取用于创建公文的流程表单
 */
export async function getDocumentCreateForm(definitionId: string): Promise<ApiResponse<{ form: FormDefinition | null; dataScopeKey?: string; initialValues?: Record<string, any> }>> {
  return request(`/apiservice/apiservice/api/workflows/${definitionId}/document-form`, {
    method: 'GET',
  });
}

/**
 * 获取流程中使用的所有表单及其字段
 */
export async function getWorkflowFormsAndFields(definitionId: string): Promise<ApiResponse<{
  forms: Array<{
    id: string;
    name: string;
    key: string;
    fields: Array<{
      id: string;
      label: string;
      dataKey: string;
      type: string;
      required: boolean;
    }>;
  }>;
}>> {
  return request(`/apiservice/apiservice/api/workflows/${definitionId}/forms-and-fields`, {
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
  return request(`/apiservice/apiservice/api/workflows/${definitionId}/documents`, {
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
  return request(`/apiservice/apiservice/api/workflows/${definitionId}/documents/start`, {
    method: 'POST',
    data,
  });
}

/**
 * 创建批量操作
 */
export async function createBulkOperation(data: CreateBulkOperationRequest): Promise<ApiResponse<BulkOperation>> {
  return request('/apiservice/apiservice/apiservice/api/workflows/bulk-operations', {
    method: 'POST',
    data,
  });
}

/**
 * 执行批量操作
 */
export async function executeBulkOperation(operationId: string): Promise<ApiResponse<void>> {
  return request(`/apiservice/apiservice/api/workflows/bulk-operations/${operationId}/execute`, {
    method: 'POST',
  });
}

/**
 * 取消批量操作
 */
export async function cancelBulkOperation(operationId: string): Promise<ApiResponse<void>> {
  return request(`/apiservice/apiservice/api/workflows/bulk-operations/${operationId}/cancel`, {
    method: 'POST',
  });
}

/**
 * 获取批量操作状态
 */
export async function getBulkOperation(operationId: string): Promise<ApiResponse<BulkOperation>> {
  return request(`/apiservice/apiservice/api/workflows/bulk-operations/${operationId}`, {
    method: 'GET',
  });
}

/**
 * 获取批量操作列表
 */
export async function getBulkOperations(params: {
  page?: number;
  pageSize?: number;
  status?: BulkOperationStatus;
  search?: string;
}): Promise<ApiResponse<PagedResult<BulkOperation>>> {
  return request('/apiservice/apiservice/apiservice/api/workflows/bulk-operations', {
    method: 'GET',
    params,
  });
}
/**
 * 工作流导出配置
 */
export interface WorkflowExportConfig {
  format: 'json' | 'csv' | 'excel';
  includeAnalytics: boolean;
  includeDependencies: boolean;
}

/**
 * 工作流导出请求
 */
export interface WorkflowExportRequest {
  workflowIds: string[];
  config: WorkflowExportConfig;
}

/**
 * 工作流过滤导出请求
 */
export interface WorkflowFilteredExportRequest {
  filters: Record<string, any>;
  config: WorkflowExportConfig;
}

/**
 * 工作流导入结果
 */
export interface WorkflowImportResult {
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  conflicts: ImportConflict[];
  errors: ImportError[];
  importedWorkflowIds: string[];
}

/**
 * 导入冲突
 */
export interface ImportConflict {
  workflowName: string;
  conflictType: string;
  existingWorkflowId?: string;
  description: string;
  suggestedResolution?: string;
}

/**
 * 导入错误
 */
export interface ImportError {
  workflowName?: string;
  message: string;
  errorDetails?: string;
  lineNumber?: number;
}

/**
 * 导出工作流
 */
export async function exportWorkflows(data: WorkflowExportRequest): Promise<ApiResponse<Blob>> {
  return request('/apiservice/apiservice/apiservice/api/workflows/export', {
    method: 'POST',
    data,
    responseType: 'blob',
  });
}

/**
 * 导出过滤结果
 */
export async function exportFilteredWorkflows(data: WorkflowFilteredExportRequest): Promise<ApiResponse<Blob>> {
  return request('/apiservice/apiservice/apiservice/api/workflows/export-filtered', {
    method: 'POST',
    data,
    responseType: 'blob',
  });
}

/**
 * 验证导入文件
 */
export async function validateImportFile(formData: FormData): Promise<ApiResponse<WorkflowImportResult>> {
  return request('/apiservice/apiservice/apiservice/api/workflows/import/validate', {
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 导入工作流
 */
export async function importWorkflows(formData: FormData): Promise<ApiResponse<WorkflowImportResult>> {
  return request('/apiservice/apiservice/apiservice/api/workflows/import', {
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 预览导入
 */
export async function previewImport(formData: FormData): Promise<ApiResponse<WorkflowImportResult>> {
  return request('/apiservice/apiservice/apiservice/api/workflows/import/preview', {
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 解决导入冲突
 */
export async function resolveImportConflicts(formData: FormData): Promise<ApiResponse<WorkflowImportResult>> {
  return request('/apiservice/apiservice/apiservice/api/workflows/import/resolve-conflicts', {
    method: 'POST',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * 组织架构树节点
 */
export interface OrganizationTreeNode {
  id: string;
  name: string;
  code?: string;
  parentId?: string;
  description?: string;
  sortOrder: number;
  managerUserId?: string;
  createdAt: string;
  updatedAt: string;
  children: OrganizationTreeNode[];
}

/**
 * 获取组织架构树
 */
export async function getOrganizationTree(): Promise<ApiResponse<OrganizationTreeNode[]>> {
  return request('/apiservice/apiservice/api/organizations/tree', {
    method: 'GET',
  });
}

/**
 * 获取组织成员
 */
export async function getOrganizationMembers(orgId: string, params?: {
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<PagedResult<{ userId: string; username: string; email?: string }>>> {
  return request(`/apiservice/api/organizations/${orgId}/members`, {
    method: 'GET',
    params,
  });
}
