import { request } from '@umijs/max';

/** 企业注册 POST /api/company/register */
export async function registerCompany(body: API.RegisterCompanyRequest) {
  return request<API.ApiResponse<API.RegisterCompanyResult>>('/api/company/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
  });
}

/** 获取当前企业信息 GET /api/company/current */
export async function getCurrentCompany(options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.Company>>('/api/company/current', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 更新当前企业信息 PUT /api/company/current */
export async function updateCurrentCompany(
  body: API.UpdateCompanyRequest,
  options?: { [key: string]: any }
) {
  return request<API.ApiResponse<boolean>>('/api/company/current', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取企业统计信息 GET /api/company/statistics */
export async function getCompanyStatistics(options?: { [key: string]: any }) {
  return request<API.ApiResponse<API.CompanyStatistics>>('/api/company/statistics', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 检查企业代码是否可用 GET /api/company/check-code */
export async function checkCompanyCode(code: string) {
  return request<API.ApiResponse<{ available: boolean; message: string }>>(
    `/api/company/check-code?code=${encodeURIComponent(code)}`,
    {
      method: 'GET',
    }
  );
}

