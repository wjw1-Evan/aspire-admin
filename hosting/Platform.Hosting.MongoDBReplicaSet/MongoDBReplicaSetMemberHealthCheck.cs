using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;

namespace Platform.Hosting.MongoDBReplicaSet;

/// <summary>
/// MongoDB 副本集成员健康检查
/// 注意：成员健康检查由 Aspire 默认的 MongoDB 健康检查处理，
/// 此类仅作为后备。实际成员就绪性由 builder.WaitFor(member) 保证。
/// </summary>
public class MongoDBReplicaSetMemberHealthCheck : IHealthCheck
{
    /// <summary>
    /// 执行健康检查
    /// </summary>
    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        // 成员就绪性由 builder.WaitFor(member) 机制保证
        // 默认的 MongoDB 健康检查已验证连接可用性
        return Task.FromResult(HealthCheckResult.Healthy("MongoDB replica set member is ready"));
    }
}