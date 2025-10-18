import { request } from '@umijs/max';

export interface DataPipeline {
  id?: string;
  name: string;
  title: string;
  description?: string;
  sourceDataSourceId: string;
  targetDataSourceId: string;
  sourceTable: string;
  targetTable: string;
  scheduleStrategy: number;
  cronExpression?: string;
  status: number;
  isEnabled: boolean;
  executionCount: number;
  lastExecutedAt?: string;
  nextExecutionAt?: string;
  lastErrorMessage?: string;
  averageExecutionTime?: string;
  transformRules: TransformRule[];
  qualityRuleIds: string[];
  tags: string[];
  metadata: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransformRule {
  id: string;
  name: string;
  description?: string;
  sourceField: string;
  targetField: string;
  transformType: number;
  expression?: string;
  parameters: Record<string, any>;
  isEnabled: boolean;
  order: number;
}

export interface CreateDataPipelineRequest {
  name: string;
  title: string;
  description?: string;
  sourceDataSourceId: string;
  targetDataSourceId: string;
  sourceTable: string;
  targetTable: string;
  scheduleStrategy: number;
  cronExpression?: string;
  transformRules: TransformRule[];
  qualityRuleIds: string[];
  tags: string[];
  metadata: Record<string, any>;
}

export interface UpdateDataPipelineRequest extends CreateDataPipelineRequest {
  id: string;
}

export interface ExecutePipelineRequest {
  pipelineId: string;
  forceExecution?: boolean;
  parameters: Record<string, any>;
}

export interface PipelineExecutionResult {
  pipelineId: string;
  executionId: string;
  isSuccess: boolean;
  errorMessage?: string;
  startTime: string;
  endTime?: string;
  duration?: string;
  recordsProcessed: number;
  recordsFailed: number;
  metadata: Record<string, any>;
}

// 获取数据管道列表
export async function getPipelineList(
  params: {
    keyword?: string;
    status?: number;
    page?: number;
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<
    API.Response<{
      list: DataPipeline[];
      total: number;
      page: number;
      pageSize: number;
    }>
  >('/dataplatform/datapipeline', {
    method: 'GET',
    params: {
      ...params,
    },
    ...options,
  });
}

// 获取数据管道详情
export async function getPipelineDetail(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<DataPipeline>>(
    `/dataplatform/datapipeline/${params.id}`,
    {
      method: 'GET',
      ...options,
    },
  );
}

// 创建数据管道
export async function createPipeline(
  data: CreateDataPipelineRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<DataPipeline>>('/dataplatform/datapipeline', {
    method: 'POST',
    data,
    ...options,
  });
}

// 更新数据管道
export async function updatePipeline(
  params: {
    id: string;
  },
  data: UpdateDataPipelineRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(`/dataplatform/datapipeline/${params.id}`, {
    method: 'PUT',
    data,
    ...options,
  });
}

// 删除数据管道
export async function deletePipeline(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(`/dataplatform/datapipeline/${params.id}`, {
    method: 'DELETE',
    ...options,
  });
}

// 执行数据管道
export async function executePipeline(
  params: {
    id: string;
  },
  data?: ExecutePipelineRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<PipelineExecutionResult>>(
    `/dataplatform/datapipeline/${params.id}/execute`,
    {
      method: 'POST',
      data,
      ...options,
    },
  );
}

// 暂停数据管道
export async function pausePipeline(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/datapipeline/${params.id}/pause`,
    {
      method: 'POST',
      ...options,
    },
  );
}

// 恢复数据管道
export async function resumePipeline(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/datapipeline/${params.id}/resume`,
    {
      method: 'POST',
      ...options,
    },
  );
}

// 获取管道执行历史
export async function getPipelineExecutionHistory(
  params: {
    id: string;
    limit?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<PipelineExecutionResult[]>>(
    `/dataplatform/datapipeline/${params.id}/executions`,
    {
      method: 'GET',
      params: {
        limit: params.limit || 10,
      },
      ...options,
    },
  );
}

// 获取管道统计信息
export async function getPipelineStatistics(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/datapipeline/${params.id}/statistics`,
    {
      method: 'GET',
      ...options,
    },
  );
}
