using MongoDB.Driver;
using MongoDB.Driver.GridFS;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// GridFS 服务接口
/// 用于访问 MongoDB GridFS 存储（文件存储）
/// 注意：GridFS 需要直接访问 IMongoDatabase 实例，这是 MongoDB GridFS API 的要求
/// </summary>
public interface IGridFSService
{
    /// <summary>
    /// 获取 GridFS Bucket
    /// </summary>
    /// <param name="bucketName">Bucket 名称</param>
    /// <returns>GridFS Bucket 实例</returns>
    GridFSBucket GetBucket(string bucketName);
}

/// <summary>
/// GridFS 服务实现
/// </summary>
public class GridFSService : IGridFSService
{
    private readonly IMongoDatabase _database;

    /// <summary>
    /// 初始化 GridFS 服务
    /// </summary>
    /// <param name="database">MongoDB 数据库实例</param>
    /// <remarks>
    /// 注意：GridFS 需要直接访问 IMongoDatabase 实例，这是 MongoDB GridFS API 的要求。
    /// 虽然项目规则禁止直接注入 IMongoDatabase，但 GridFS 是一个特殊情况，需要直接访问数据库实例。
    /// </remarks>
    public GridFSService(IMongoDatabase database)
    {
        _database = database ?? throw new ArgumentNullException(nameof(database));
    }

    /// <inheritdoc />
    public GridFSBucket GetBucket(string bucketName)
    {
        return new GridFSBucket(_database, new GridFSBucketOptions
        {
            BucketName = bucketName
        });
    }
}
