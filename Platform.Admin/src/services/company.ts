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

/** v3.1: 创建企业（已登录用户）POST /api/company/create */
export async function createCompany(body: API.CreateCompanyRequest) {
  return request<API.ApiResponse<API.Company>>('/api/company/create', {
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

// ===== v3.1: 企业加入申请 API =====

/** 申请加入企业 POST /api/company/join */
export async function applyToJoinCompany(data: API.ApplyToJoinCompanyRequest) {
  return request<API.ApiResponse<string>>('/api/company/join', {
    method: 'POST',
    data,
  });
}

/** 获取我的申请列表 GET /api/company/my-join-requests */
export async function getMyJoinRequests() {
  return request<API.ApiResponse<API.JoinRequestDetail[]>>('/api/company/my-join-requests', {
    method: 'GET',
  });
}

/** 获取企业的申请列表（管理员） GET /api/company/{companyId}/join-requests */
export async function getJoinRequests(companyId: string, status?: string) {
  return request<API.ApiResponse<API.JoinRequestDetail[]>>(`/api/company/${companyId}/join-requests`, {
    method: 'GET',
    params: { status },
  });
}

/** 批准申请 POST /api/company/join-requests/{id}/approve */
export async function approveJoinRequest(id: string, data?: API.ReviewJoinRequestRequest) {
  return request<API.ApiResponse<string>>(`/api/company/join-requests/${id}/approve`, {
    method: 'POST',
    data: data || {},
  });
}

/** 拒绝申请 POST /api/company/join-requests/{id}/reject */
export async function rejectJoinRequest(id: string, data: API.ReviewJoinRequestRequest) {
  return request<API.ApiResponse<string>>(`/api/company/join-requests/${id}/reject`, {
    method: 'POST',
    data,
  });
}

/** 撤销申请 POST /api/company/join-requests/{id}/cancel */
export async function cancelJoinRequest(id: string) {
  return request<API.ApiResponse<string>>(`/api/company/join-requests/${id}/cancel`, {
    method: 'POST',
  });
}

