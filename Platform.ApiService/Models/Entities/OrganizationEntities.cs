using System;
using System.Collections.Generic;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 组织架构节点实体
/// </summary>
public class OrganizationUnit : MultiTenantEntity
{
    /// <summary>
    /// 节点名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 节点编码（可选）
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// 父级节点ID（根节点为空）
    /// </summary>
    public string? ParentId { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 排序值（数字越小越靠前）
    /// </summary>
    public int SortOrder { get; set; } = 1;

    /// <summary>
    /// 负责人用户ID（可选）
    /// </summary>
    public string? ManagerUserId { get; set; }
}

