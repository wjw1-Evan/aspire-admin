using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 审批人解析工厂实现
/// </summary>
public class ApproverResolverFactory : IApproverResolverFactory
{
    private readonly IEnumerable<IApproverResolver> _resolvers;

    /// <summary>
    /// 初始化审批人解析工厂
    /// </summary>
    /// <param name="resolvers">实现不同规则解析的解析器集合</param>
    public ApproverResolverFactory(IEnumerable<IApproverResolver> resolvers)
    {
        _resolvers = resolvers;
    }

    /// <summary>
    /// 根据规则解析实际审批人列表
    /// </summary>
    /// <param name="rule">审批人规则</param>
    /// <param name="companyId">企业（租户）ID</param>
    /// <returns>解析得到的审批人用户ID列表</returns>
    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId)
    {
        // 找到支持该规则类型的解析器
        // 这里的逻辑可以根据 Resolver 实现类里的类型判断，或者直接尝试匹配
        // 为了简单起见，我们在 Resolver 接口中增加一个 CanResolve 方法，或者在这里通过类型匹配

        foreach (var resolver in _resolvers)
        {
            // 简单约定：Resolver 名字包含 RuleType
            if (resolver.GetType().Name.StartsWith(rule.Type.ToString(), StringComparison.OrdinalIgnoreCase))
            {
                return await resolver.ResolveAsync(rule, companyId);
            }
        }

        return new List<string>();
    }
}

/// <summary>
/// 审批人解析工厂接口
/// </summary>
public interface IApproverResolverFactory
{
    /// <summary>
    /// 根据规则解析实际审批人列表
    /// </summary>
    /// <param name="rule">审批人规则</param>
    /// <param name="companyId">企业（租户）ID</param>
    /// <returns>解析得到的审批人用户ID列表</returns>
    Task<List<string>> ResolveAsync(ApproverRule rule, string companyId);
}
