import { request } from '@umijs/max';
import type {
  DataSource,
  CreateDataSourceRequest,
  UpdateDataSourceRequest,
  TestDataSourceRequest,
} from './types';

export async function getDataSourceList(
  params: {
    keyword?: string;
    dataSourceType?: number;
    status?: number;
    page?: number;
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<
    API.Response<{
      list: DataSource[];
      total: number;
      page: number;
      pageSize: number;
    }>
  >('/dataplatform/datasource', {
    method: 'GET',
    params: {
      ...params,
    },
    ...options,
  });
}

export async function getDataSourceDetail(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<DataSource>>(
    `/dataplatform/datasource/${params.id}`,
    {
      method: 'GET',
      ...options,
    },
  );
}

export async function createDataSource(
  data: CreateDataSourceRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<DataSource>>('/dataplatform/datasource', {
    method: 'POST',
    data,
    ...options,
  });
}

export async function updateDataSource(
  params: {
    id: string;
  },
  data: UpdateDataSourceRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(`/dataplatform/datasource/${params.id}`, {
    method: 'PUT',
    data,
    ...options,
  });
}

export async function deleteDataSource(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(`/dataplatform/datasource/${params.id}`, {
    method: 'DELETE',
    ...options,
  });
}

export async function testDataSource(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/datasource/${params.id}/test`,
    {
      method: 'POST',
      ...options,
    },
  );
}

export async function testDataSourceConfig(
  data: TestDataSourceRequest,
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>('/dataplatform/datasource/test', {
    method: 'POST',
    data,
    ...options,
  });
}

export async function getDataSourceSchema(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/datasource/${params.id}/schema`,
    {
      method: 'GET',
      ...options,
    },
  );
}

export async function getDataSourceStatistics(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any>>(
    `/dataplatform/datasource/${params.id}/statistics`,
    {
      method: 'GET',
      ...options,
    },
  );
}

export async function getTables(
  params: {
    id: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<string[]>>(
    `/dataplatform/datasource/${params.id}/tables`,
    {
      method: 'GET',
      ...options,
    },
  );
}

export async function getSchema(
  params: {
    id: string;
    tableName: string;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<any[]>>(
    `/dataplatform/datasource/${params.id}/tables/${params.tableName}/schema`,
    {
      method: 'GET',
      ...options,
    },
  );
}

export async function getData(
  params: {
    id: string;
    tableName: string;
    limit?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.Response<{ data: any[]; count: number }>>(
    `/dataplatform/datasource/${params.id}/tables/${params.tableName}/data`,
    {
      method: 'GET',
      params: {
        limit: params.limit || 1000,
      },
      ...options,
    },
  );
}
