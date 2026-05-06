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
    public MongoDBReplicaSetResource(string name, string replicaSetName)
        : base(name)
    {
        ReplicaSetName = replicaSetName;
    }

    /// <summary>
    /// 添加副本集成员
    /// </summary>
    internal void AddMember(MongoDBServerResource member, MongoDBReplicaSetMemberOptions options)
    {
        _members.Add(member, options);
    }

    private ReferenceExpression BuildConnectionStringExpression()
    {
        var builder = new ReferenceExpressionBuilder();

        if (_members.Count > 0)
        {
            var firstMember = _members.Keys.First();
            builder.AppendFormatted(firstMember.ConnectionStringExpression);
            builder.Append($"&replicaSet={ReplicaSetName}&directConnection=true");
        }

        return builder.Build();
    }
}