using System.Collections.Generic;
using System.Threading.Tasks;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 审批人解析策略接口
/// </summary>
public interface IApproverResolver
{
    /// <summary>
    /// 解析规则，返回匹配的用户 ID 列表
    /// </summary>
    Task<List<string>> ResolveAsync(ApproverRule rule, string companyId, WorkflowInstance? instance = null);
}
