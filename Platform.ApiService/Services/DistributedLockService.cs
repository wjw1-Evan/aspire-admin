using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 分布式锁服务接口
/// </summary>
public interface IDistributedLockService
{
    Task<T> ExecuteWithLockAsync<T>(string lockName, Func<Task<T>> action, int timeoutSeconds = 30);
    Task ExecuteWithLockAsync(string lockName, Func<Task> action, int timeoutSeconds = 30);
}

/// <summary>
/// 基于 MongoDB 的分布式锁服务
/// 用于多实例部署时的并发控制
/// </summary>
public class DistributedLockService : IDistributedLockService
{
    private readonly ILogger<DistributedLockService> _logger;
    private readonly IMongoCollection<DistributedLock> _locks;
    private readonly string _instanceId;

    public DistributedLockService(
        IMongoDatabase database,
        ILogger<DistributedLockService> logger)
    {
        _logger = logger;
        _locks = database.GetCollection<DistributedLock>("system_locks");
        _instanceId = $"{Environment.MachineName}_{Guid.NewGuid():N}";
        
        // 初始化：创建TTL索引（自动清理过期锁）
        _ = EnsureTtlIndexAsync();
    }

    /// <summary>
    /// 带锁执行操作（有返回值）
    /// </summary>
    public async Task<T> ExecuteWithLockAsync<T>(string lockName, Func<Task<T>> action, int timeoutSeconds = 30)
    {
        var lockAcquired = false;
        try
        {
            lockAcquired = await AcquireLockAsync(lockName, timeoutSeconds);
            
            if (!lockAcquired)
            {
                _logger.LogInformation("锁 '{LockName}' 已被其他实例持有，跳过执行", lockName);
                return default!;
            }

            _logger.LogInformation("获取锁 '{LockName}' 成功，开始执行操作", lockName);
            return await action();
        }
        finally
        {
            if (lockAcquired)
            {
                await ReleaseLockAsync(lockName);
            }
        }
    }

    /// <summary>
    /// 带锁执行操作（无返回值）
    /// </summary>
    public async Task ExecuteWithLockAsync(string lockName, Func<Task> action, int timeoutSeconds = 30)
    {
        var lockAcquired = false;
        try
        {
            lockAcquired = await AcquireLockAsync(lockName, timeoutSeconds);
            
            if (!lockAcquired)
            {
                _logger.LogInformation("锁 '{LockName}' 已被其他实例持有，跳过执行", lockName);
                return;
            }

            _logger.LogInformation("获取锁 '{LockName}' 成功，开始执行操作", lockName);
            await action();
        }
        finally
        {
            if (lockAcquired)
            {
                await ReleaseLockAsync(lockName);
            }
        }
    }

    /// <summary>
    /// 获取锁
    /// </summary>
    private async Task<bool> AcquireLockAsync(string lockName, int timeoutSeconds)
    {
        try
        {
            var now = DateTime.UtcNow;
            var expiresAt = now.AddSeconds(timeoutSeconds);

            // 方式1: 尝试插入新锁（如果锁不存在）
            try
            {
                var newLock = new DistributedLock
                {
                    LockName = lockName,
                    InstanceId = _instanceId,
                    AcquiredAt = now,
                    ExpiresAt = expiresAt,
                    Status = "locked"
                };

                await _locks.InsertOneAsync(newLock);
                _logger.LogInformation("实例 {InstanceId} 获取锁 '{LockName}' 成功（新建锁）", _instanceId, lockName);
                return true;
            }
            catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
            {
                // 锁已存在，尝试方式2
                _logger.LogDebug("锁 '{LockName}' 已存在，尝试获取已过期的锁", lockName);
            }

            // 方式2: 尝试获取已过期的锁（原子操作）
            var filter = Builders<DistributedLock>.Filter.And(
                Builders<DistributedLock>.Filter.Eq(l => l.LockName, lockName),
                Builders<DistributedLock>.Filter.Lt(l => l.ExpiresAt, now)
            );

            var update = Builders<DistributedLock>.Update
                .Set(l => l.InstanceId, _instanceId)
                .Set(l => l.AcquiredAt, now)
                .Set(l => l.ExpiresAt, expiresAt)
                .Set(l => l.Status, "locked");

            var options = new FindOneAndUpdateOptions<DistributedLock>
            {
                ReturnDocument = ReturnDocument.After
            };

            var result = await _locks.FindOneAndUpdateAsync(filter, update, options);
            
            if (result != null && result.InstanceId == _instanceId)
            {
                _logger.LogInformation("实例 {InstanceId} 获取锁 '{LockName}' 成功（过期锁）", _instanceId, lockName);
                return true;
            }
            
            // 锁被其他实例持有且未过期
            var existingLock = await _locks.Find(l => l.LockName == lockName).FirstOrDefaultAsync();
            _logger.LogInformation("实例 {InstanceId} 获取锁 '{LockName}' 失败，锁被实例 {OtherInstance} 持有（过期时间: {ExpiresAt}）", 
                _instanceId, lockName, existingLock?.InstanceId ?? "unknown", existingLock?.ExpiresAt);
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取锁 '{LockName}' 时发生异常", lockName);
            return false;
        }
    }

    /// <summary>
    /// 释放锁
    /// </summary>
    private async Task ReleaseLockAsync(string lockName)
    {
        try
        {
            var filter = Builders<DistributedLock>.Filter.Eq(l => l.LockName, lockName)
                & Builders<DistributedLock>.Filter.Eq(l => l.InstanceId, _instanceId);

            var update = Builders<DistributedLock>.Update
                .Set(l => l.Status, "released")
                .Set(l => l.ExpiresAt, DateTime.UtcNow); // 立即过期

            await _locks.UpdateOneAsync(filter, update);
            
            _logger.LogInformation("实例 {InstanceId} 释放锁 '{LockName}' 成功", _instanceId, lockName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "释放锁 '{LockName}' 时发生异常", lockName);
        }
    }

    /// <summary>
    /// 确保必要的索引存在
    /// </summary>
    private async Task EnsureTtlIndexAsync()
    {
        try
        {
            // 1. LockName 唯一索引（确保同一个锁名称只有一个文档）
            var uniqueIndexKeys = Builders<DistributedLock>.IndexKeys.Ascending(l => l.LockName);
            var uniqueIndexOptions = new CreateIndexOptions
            {
                Name = "idx_lockName_unique",
                Unique = true
            };

            await _locks.Indexes.CreateOneAsync(
                new CreateIndexModel<DistributedLock>(uniqueIndexKeys, uniqueIndexOptions)
            );

            _logger.LogDebug("LockName 唯一索引创建成功");

            // 2. TTL 索引（自动清理过期锁）
            var ttlIndexKeys = Builders<DistributedLock>.IndexKeys.Ascending(l => l.ExpiresAt);
            var ttlIndexOptions = new CreateIndexOptions
            {
                Name = "idx_expiresAt_ttl",
                ExpireAfter = TimeSpan.Zero // 在 expiresAt 时间过期
            };

            await _locks.Indexes.CreateOneAsync(
                new CreateIndexModel<DistributedLock>(ttlIndexKeys, ttlIndexOptions)
            );

            _logger.LogDebug("TTL 索引创建成功");
        }
        catch (MongoCommandException ex) when (ex.CodeName == "IndexOptionsConflict" || ex.Code == 85)
        {
            // 索引已存在，忽略
            _logger.LogDebug("分布式锁索引已存在");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "创建分布式锁索引时发生异常");
        }
    }
}

