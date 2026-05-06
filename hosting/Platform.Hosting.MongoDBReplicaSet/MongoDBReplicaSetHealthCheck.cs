using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Platform.Hosting.MongoDBReplicaSet;

/// <summary>
/// MongoDB 副本集健康检查
/// </summary>
public class MongoDBReplicaSetHealthCheck : IHealthCheck
{
    private readonly IMongoDatabase _adminDatabase;
    private readonly ILogger<MongoDBReplicaSetHealthCheck> _logger;

    /// <summary>
    /// 初始化副本集健康检查
    /// </summary>
    public MongoDBReplicaSetHealthCheck(IMongoDatabase adminDatabase, ILogger<MongoDBReplicaSetHealthCheck> logger)
    {
        _adminDatabase = adminDatabase;
        _logger = logger;
    }

    /// <summary>
    /// 执行健康检查
    /// </summary>
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            // 执行 replSetGetStatus 命令
            var command = new BsonDocument { { "replSetGetStatus", 1 } };
            var result = await _adminDatabase.RunCommandAsync<BsonDocument>(command, readPreference: null, cancellationToken);

            var isOk = result["ok"].ToBoolean();
            if (!isOk)
            {
                return HealthCheckResult.Unhealthy("Failed to get replica set status.");
            }

            bool hasPrimary = false, hasHealthy = false, hasUnhealthy = false;
            foreach (var member in result["members"].AsBsonArray)
            {
                var state = member["state"].AsInt32;
                var isHealthy = member["health"].ToBoolean() && state is 1 or 2;
                hasPrimary |= state == 1;
                hasHealthy |= isHealthy;
                hasUnhealthy |= !isHealthy;
            }

            if (!hasPrimary)
            {
                return HealthCheckResult.Unhealthy("No primary member found.");
            }

            if (!hasHealthy)
            {
                return HealthCheckResult.Unhealthy("No healthy members found.");
            }

            if (hasUnhealthy)
            {
                return HealthCheckResult.Degraded("Some members are unhealthy.");
            }

            return HealthCheckResult.Healthy("All members of the replica set are healthy.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking replica set health.");
            return HealthCheckResult.Unhealthy("Error checking replica set health.", ex);
        }
    }
}
