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

/** v3.1: 搜索企业 GET /api/company/search */
export async function searchCompanies(keyword: string) {
  return request<API.ApiResponse<API.CompanySearchResult[]>>(
    `/api/company/search?keyword=${encodeURIComponent(keyword)}`,
    {
      method: 'GET',
    }
  );
}

/** v3.1: 获取我的企业列表 GET /api/company/my-companies */
export async function getMyCompanies() {
  return request<API.ApiResponse<API.UserCompanyItem[]>>('/api/company/my-companies', {
    method: 'GET',
  });
}

/** v3.1: 切换当前企业 POST /api/company/switch */
export async function switchCompany(targetCompanyId: string) {
  return request<API.ApiResponse<API.SwitchCompanyResult>>('/api/company/switch', {
    method: 'POST',
    data: {
      targetCompanyId,
    },
  });
}

/** v3.1: 获取企业成员列表 GET /api/company/{companyId}/members */
export async function getCompanyMembers(companyId: string) {
  return request<API.ApiResponse<API.CompanyMemberItem[]>>(
    `/api/company/${companyId}/members`,
    {
      method: 'GET',
    }
  );
}

/** v3.1: 更新成员角色 PUT /api/company/{companyId}/members/{userId}/roles */
export async function updateMemberRoles(
  companyId: string,
  userId: string,
  roleIds: string[]
) {
  return request<API.ApiResponse<boolean>>(
    `/api/company/${companyId}/members/${userId}/roles`,
    {
      method: 'PUT',
      data: {
        roleIds,
      },
    }
  );
}

/** v3.1: 设置成员管理员权限 PUT /api/company/{companyId}/members/{userId}/admin */
export async function setMemberAdmin(
  companyId: string,
  userId: string,
  isAdmin: boolean
) {
  return request<API.ApiResponse<boolean>>(
    `/api/company/${companyId}/members/${userId}/admin`,
    {
      method: 'PUT',
      data: {
        isAdmin,
      },
    }
  );
}

/** v3.1: 移除企业成员 DELETE /api/company/{companyId}/members/{userId} */
export async function removeMember(companyId: string, userId: string) {
  return request<API.ApiResponse<boolean>>(
    `/api/company/${companyId}/members/${userId}`,
    {
      method: 'DELETE',
    }
  );
}

// ===== 企业加入申请相关 API =====

/** 申请加入企业 POST /api/join-request */
export async function applyToJoinCompany(data: API.ApplyToJoinCompanyRequest) {
  return request<API.ApiResponse<API.CompanyJoinRequest>>('/api/join-request', {
    method: 'POST',
    data,
  });
}

/** 获取我的申请列表 GET /api/join-request/my-requests */
export async function getMyRequests() {
  return request<API.ApiResponse<API.JoinRequestDetail[]>>('/api/join-request/my-requests', {
    method: 'GET',
  });
}

/** 撤回申请 DELETE /api/join-request/{id} */
export async function cancelRequest(id: string) {
  return request<API.ApiResponse<boolean>>(`/api/join-request/${id}`, {
    method: 'DELETE',
  });
}

/** 获取待审核的申请列表 GET /api/join-request/pending */
export async function getPendingRequests(companyId?: string) {
  const params = companyId ? { companyId } : {};
  return request<API.ApiResponse<API.JoinRequestDetail[]>>('/api/join-request/pending', {
    method: 'GET',
    params,
  });
}

/** 审核通过申请 POST /api/join-request/{id}/approve */
export async function approveRequest(id: string, data?: API.ReviewJoinRequestRequest) {
  return request<API.ApiResponse<boolean>>(`/api/join-request/${id}/approve`, {
    method: 'POST',
    data: data || {},
  });
}

/** 拒绝申请 POST /api/join-request/{id}/reject */
export async function rejectRequest(id: string, data: API.ReviewJoinRequestRequest) {
  return request<API.ApiResponse<boolean>>(`/api/join-request/${id}/reject`, {
    method: 'POST',
    data,
  });
}

