import { request } from '@umijs/max';

export interface DataQualityRule {
  id?: string;
  name: string;
  description?: string;
  dataSourceId: string;
  fieldName: string;
  ruleType: number;
  ruleExpression?: string;
  threshold?: number;
  parameters: Record<string, any>;
  isEnabled: boolean;
  lastCheckedAt?: string;
  lastCheckStatus?: number;
  lastCheckResult?: QualityCheckResult;
  createdAt?: string;
  updatedAt?: string;
}

export interface QualityCheckResult {
  ruleId: string;
  checkTime: string;
  totalRecords: number;
  passedRecords: number;
  failedRecords: number;
  failedRecordIds: string[];
  passRate: number;
  endTime?: string;
  executionTime: string;
  status: number;
  errorMessage?: string;
  metadata: Record<string, any>;
}

export interface CreateQualityRuleRequest {
  name: string;
  description?: string;
  dataSourceId: string;
  fieldName: string;
  ruleType: number;
  ruleExpression?: string;
  threshold?: number;
  parameters: Record<string, any>;
  isEnabled?: boolean;
}

export interface UpdateQualityRuleRequest extends CreateQualityRuleRequest {
  id: string;
}

// 获取数据质量规则列表
export async function getQualityRuleList(
  params: {
    keyword?: string;
    dataSourceId?: string;
    ruleType?: number;
    page?: number;
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<
    API.Response<{
      list: DataQualityRule[];
      total: number;
      page: number;
      pageSize: number;
    }>
  >('/dataplatform/dataquality/rules', {
    method: 'GET',
    params: {
      ...params,
    },
    ...options,
  });
}

// 获取数据质量规则详情
export async function getQualityRuleDetail(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<DataQualityRule>>(
    `/dataplatform/dataquality/rules/${params.id}`,
    {
      method: 'GET',
      ...options,
    },
  );
}

// 创建数据质量规则
export async function createQualityRule(
  data: CreateQualityRuleRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<DataQualityRule>>(
    '/dataplatform/dataquality/rules',
    {
      method: 'POST',
      data,
      ...options,
    },
  );
}

// 更新数据质量规则
export async function updateQualityRule(
  params: {
    id: string;
  },
  data: UpdateQualityRuleRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/dataquality/rules/${params.id}`,
    {
      method: 'PUT',
      data,
      ...options,
    },
  );
}

// 删除数据质量规则
export async function deleteQualityRule(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/dataquality/rules/${params.id}`,
    {
      method: 'DELETE',
      ...options,
    },
  );
}

// 执行数据质量检查
export async function executeQualityCheck(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<QualityCheckResult>>(
    `/dataplatform/dataquality/rules/${params.id}/check`,
    {
      method: 'POST',
      ...options,
    },
  );
}

// 批量执行数据质量检查
export async function executeBatchQualityCheck(
  data: string[],
  options?: { [key: string]: any },
) {
  return request<API.Response<QualityCheckResult[]>>(
    '/dataplatform/dataquality/rules/batch-check',
    {
      method: 'POST',
      data,
      ...options,
    },
  );
}

// 获取数据源的质量规则
export async function getRulesByDataSource(
  params: {
    dataSourceId: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<DataQualityRule[]>>(
    `/dataplatform/dataquality/datasource/${params.dataSourceId}/rules`,
    {
      method: 'GET',
      ...options,
    },
  );
}

// 获取质量检查历史
export async function getQualityCheckHistory(
  params: {
    id: string;
    limit?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<QualityCheckResult[]>>(
    `/dataplatform/dataquality/rules/${params.id}/history`,
    {
      method: 'GET',
      params: {
        limit: params.limit || 10,
      },
      ...options,
    },
  );
}

// 获取数据源质量统计
export async function getDataSourceQualityStatistics(
  params: {
    dataSourceId: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/dataquality/datasource/${params.dataSourceId}/statistics`,
    {
      method: 'GET',
      ...options,
    },
  );
}

// 获取整体质量概览
export async function getOverallQualityOverview(options?: {
  [key: string]: any;
}) {
  return request<API.Response<any>>('/dataplatform/dataquality/overview', {
    method: 'GET',
    ...options,
  });
}
