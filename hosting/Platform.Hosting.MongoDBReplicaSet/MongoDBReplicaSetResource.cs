using System.Collections.ObjectModel;
using Aspire.Hosting.ApplicationModel;

namespace Platform.Hosting.MongoDBReplicaSet;

/// <summary>
/// MongoDB 副本集资源
/// </summary>
public class MongoDBReplicaSetResource : Resource, IResourceWithConnectionString, IResourceWithWaitSupport
{
    private readonly OrderedDictionary<MongoDBServerResource, MongoDBReplicaSetMemberOptions> _members = new();

    /// <summary>
    /// 副本集名称
    /// </summary>
    public string ReplicaSetName { get; }

    /// <summary>
    /// KeyFile 参数资源
    /// </summary>
    public ParameterResource KeyFile { get; }

    /// <summary>
    /// 副本集成员
    /// </summary>
    public IReadOnlyDictionary<MongoDBServerResource, MongoDBReplicaSetMemberOptions> Members => _members;

    /// <summary>
    /// 连接字符串表达式
    /// </summary>
    public ReferenceExpression ConnectionStringExpression => BuildConnectionStringExpression();

    /// <summary>
    /// 初始化副本集资源
    /// </summary>
    /// <param name="name">资源名称</param>
    /// <param name="replicaSetName">副本集名称</param>
    /// <param name="keyFile">KeyFile 参数资源</param>
    public MongoDBReplicaSetResource(string name, string replicaSetName, ParameterResource keyFile)
        : base(name)
    {
        ReplicaSetName = replicaSetName;
        KeyFile = keyFile;
    }

    /// <summary>
    /// 添加副本集成员
    /// </summary>
    /// <param name="member">MongoDB 服务器资源</param>
    /// <param name="options">成员配置选项</param>
    internal void AddMember(MongoDBServerResource member, MongoDBReplicaSetMemberOptions options)
    {
        _members.Add(member, options);
    }

    private ReferenceExpression BuildConnectionStringExpression()
    {
        var builder = new ReferenceExpressionBuilder();

        // 对于单节点副本集（Phase 1），使用第一个成员的连接字符串
        // 并添加 replicaSet 和 directConnection 参数
        if (_members.Count > 0)
        {
            var firstMember = _members.Keys.First();
            builder.AppendFormatted(firstMember.ConnectionStringExpression);
            builder.AppendLiteral($"&replicaSet={ReplicaSetName}&directConnection=true");
        }

        return builder.Build();
    }
}
