using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Platform.Hosting.MongoDBReplicaSet;

/// <summary>
/// MongoDB 副本集健康检查
/// 验证副本集是否已初始化且有 PRIMARY 节点
/// </summary>
public class MongoDBReplicaSetHealthCheck : IHealthCheck
{
    private readonly MongoDBReplicaSetResource _resource;
    private readonly ResourceNotificationService _notificationService;
    private readonly ILogger<MongoDBReplicaSetHealthCheck> _logger;

    /// <summary>
    /// 初始化副本集健康检查
    /// </summary>
    public MongoDBReplicaSetHealthCheck(
        MongoDBReplicaSetResource resource,
        ResourceNotificationService notificationService,
        ILogger<MongoDBReplicaSetHealthCheck> logger)
    {
        _resource = resource;
        _notificationService = notificationService;
        _logger = logger;
    }

    /// <summary>
    /// 执行健康检查
    /// </summary>
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            if (_resource.Members.Count == 0)
            {
                return HealthCheckResult.Unhealthy("副本集没有成员");
            }

            var firstMember = _resource.Members.Keys.First();
            var connectionString = await firstMember.ConnectionStringExpression.GetValueAsync(cancellationToken);

            if (string.IsNullOrEmpty(connectionString))
            {
                return HealthCheckResult.Unhealthy("无法获取连接字符串");
            }

            var urlBuilder = new MongoUrlBuilder(connectionString) { DirectConnection = true };
            var mongoClient = new MongoClient(urlBuilder.ToMongoUrl());

            // 先尝试连接
            await mongoClient.ListDatabaseNamesAsync(cancellationToken);

            var adminDb = mongoClient.GetDatabase("admin");

            // 检查副本集状态
            var helloCmd = new BsonDocument { { "hello", 1 } };
            var result = await adminDb.RunCommandAsync<BsonDocument>(helloCmd, readPreference: null, cancellationToken);

            if (result.TryGetValue("isMaster", out var isMaster) && isMaster.AsBoolean)
            {
                return HealthCheckResult.Healthy("副本集 PRIMARY 已就绪");
            }

            if (result.TryGetValue("setName", out var setName))
            {
                return HealthCheckResult.Degraded($"副本集 {setName} 已初始化，但尚未选出 PRIMARY");
            }

            return HealthCheckResult.Unhealthy("副本集未初始化");
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "副本集健康检查失败");
            return HealthCheckResult.Unhealthy($"副本集健康检查失败: {ex.Message}");
        }
    }
}