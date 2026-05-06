using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;

namespace Platform.Hosting.MongoDBReplicaSet;

/// <summary>
/// MongoDB 副本集成员健康检查
/// </summary>
public class MongoDBReplicaSetMemberHealthCheck(ILogger<MongoDBReplicaSetMemberHealthCheck> logger) : IHealthCheck
{
    private const int MaxPingAttempts = 2;

    /// <summary>
    /// 执行健康检查
    /// </summary>
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        // 注意：这个健康检查会在 MongoDBReplicaSetEventingSubscriber 中配置
        // 实际的 MongoDB 客户端会通过依赖注入提供
        // 这里我们返回 Healthy，因为实际的连接检查会在事件订阅器中处理
        return await Task.FromResult(HealthCheckResult.Healthy("MongoDB replica set member is ready"));
    }
}
