namespace Platform.Hosting.MongoDBReplicaSet;

/// <summary>
/// MongoDB 副本集成员配置选项
/// </summary>
public class MongoDBReplicaSetMemberOptions
{
    /// <summary>
    /// 优先级（数值越高越可能成为 Primary）
    /// </summary>
    public double? Priority { get; set; }

    /// <summary>
    /// 是否为仲裁节点
    /// </summary>
    public bool ArbiterOnly { get; set; }

    /// <summary>
    /// 是否为隐藏节点
    /// </summary>
    public bool Hidden { get; set; }

    /// <summary>
    /// 是否构建索引
    /// </summary>
    public bool BuildIndexes { get; set; } = true;

    /// <summary>
    /// 投票权重
    /// </summary>
    public int Votes { get; set; } = 1;

    /// <summary>
    /// 延迟副本的秒数
    /// </summary>
    public int SecondaryDelaySecs { get; set; }

    /// <summary>
    /// 标签
    /// </summary>
    public IDictionary<string, string> Tags { get; set; } = new Dictionary<string, string>();
}
