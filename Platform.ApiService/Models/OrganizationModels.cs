using System;
using System.Collections.Generic;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 组织架构节点实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("organization_units")]
public class OrganizationUnit : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    /// <summary>
    /// 节点名称
    /// </summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 节点编码（可选）
    /// </summary>
    [BsonElement("code")]
    public string? Code { get; set; }

    /// <summary>
    /// 父级节点ID（根节点为空）
    /// </summary>
    [BsonElement("parentId")]
    public string? ParentId { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>
    /// 排序值（数字越小越靠前）
    /// </summary>
    [BsonElement("sortOrder")]
    public int SortOrder { get; set; } = 1;

    /// <summary>
    /// 负责人用户ID（可选）
    /// </summary>
    [BsonElement("managerUserId")]
    public string? ManagerUserId { get; set; }
}

/// <summary>
/// 组织架构请求基础模型
/// </summary>
public abstract class OrganizationUnitRequestBase
{
    /// <summary>
    /// 节点名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 节点编码
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// 父级节点ID
    /// </summary>
    public string? ParentId { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 排序值
    /// </summary>
    public int SortOrder { get; set; } = 1;

    /// <summary>
    /// 负责人用户ID
    /// </summary>
    public string? ManagerUserId { get; set; }
}

/// <summary>
/// 创建组织节点请求
/// </summary>
public class CreateOrganizationUnitRequest : OrganizationUnitRequestBase
{
}

/// <summary>
/// 更新组织节点请求
/// </summary>
public class UpdateOrganizationUnitRequest : OrganizationUnitRequestBase
{
}

/// <summary>
/// 组织架构树节点
/// </summary>
public class OrganizationTreeNode
{
    /// <summary>
    /// 节点ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 节点名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 节点编码
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// 父级节点ID
    /// </summary>
    public string? ParentId { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 排序值
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// 负责人用户ID
    /// </summary>
    public string? ManagerUserId { get; set; }

    /// <summary>
    /// 创建时间（UTC）
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 更新时间（UTC）
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// 子节点列表
    /// </summary>
    public List<OrganizationTreeNode> Children { get; set; } = new();
}

/// <summary>
/// 批量重排请求项
/// </summary>
public class OrganizationReorderItem
{
    /// <summary>
    /// 节点ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 新父级ID（可空表示顶级）
    /// </summary>
    public string? ParentId { get; set; }

    /// <summary>
    /// 新排序号（>=1）
    /// </summary>
    public int SortOrder { get; set; } = 1;
}
