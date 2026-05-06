namespace Platform.Hosting.MongoDBReplicaSet;

/// <summary>
/// MongoDB 容器镜像标签常量
/// </summary>
public static class MongoDBContainerImageTags
{
    /// <summary>
    /// MongoDB 8.0 镜像标签
    /// </summary>
    public const string Mongo80 = "8.0";

    /// <summary>
    /// MongoDB 7.0 镜像标签
    /// </summary>
    public const string Mongo70 = "7.0";

    /// <summary>
    /// MongoDB 6.0 镜像标签
    /// </summary>
    public const string Mongo60 = "6.0";

    /// <summary>
    /// 默认镜像标签
    /// </summary>
    public const string Default = Mongo80;
}
