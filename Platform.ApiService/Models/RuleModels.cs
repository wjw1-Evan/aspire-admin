using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 规则列表项实体
/// </summary>
public class RuleListItem : Platform.ServiceDefaults.Models.ISoftDeletable, Platform.ServiceDefaults.Models.IEntity, Platform.ServiceDefaults.Models.ITimestamped
{
    /// <summary>
    /// 规则ID（MongoDB ObjectId）
    /// </summary>
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 所属企业ID
    /// </summary>
    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>
    /// 规则键（唯一标识）
    /// </summary>
    [BsonElement("key")]
    public int Key { get; set; }

    /// <summary>
    /// 是否禁用
    /// </summary>
    [BsonElement("disabled")]
    public bool Disabled { get; set; }

    /// <summary>
    /// 链接地址
    /// </summary>
    [BsonElement("href")]
    public string? Href { get; set; }

    /// <summary>
    /// 头像URL
    /// </summary>
    [BsonElement("avatar")]
    public string? Avatar { get; set; }

    /// <summary>
    /// 规则名称
    /// </summary>
    [BsonElement("name")]
    public string? Name { get; set; }

    /// <summary>
    /// 所有者
    /// </summary>
    [BsonElement("owner")]
    public string? Owner { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    [BsonElement("desc")]
    public string? Desc { get; set; }

    /// <summary>
    /// 调用次数
    /// </summary>
    [BsonElement("callNo")]
    public int CallNo { get; set; }

    /// <summary>
    /// 状态
    /// </summary>
    [BsonElement("status")]
    public int Status { get; set; }

    /// <summary>
    /// 更新时间
    /// </summary>
    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 创建时间
    /// </summary>
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 进度
    /// </summary>
    [BsonElement("progress")]
    public int Progress { get; set; }

    /// <summary>
    /// 是否已删除（软删除）
    /// </summary>
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// 删除时间
    /// </summary>
    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    /// <summary>
    /// 删除者
    /// </summary>
    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    /// <summary>
    /// 删除原因
    /// </summary>
    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
}

/// <summary>
/// 创建规则请求
/// </summary>
public class CreateRuleRequest
{
    /// <summary>
    /// 规则名称
    /// </summary>
    public string? Name { get; set; }
    
    /// <summary>
    /// 描述
    /// </summary>
    public string? Desc { get; set; }
    
    /// <summary>
    /// 所有者
    /// </summary>
    public string? Owner { get; set; }
    
    /// <summary>
    /// 链接地址
    /// </summary>
    public string? Href { get; set; }
    
    /// <summary>
    /// 头像URL
    /// </summary>
    public string? Avatar { get; set; }
    
    /// <summary>
    /// 调用次数
    /// </summary>
    public int CallNo { get; set; }
    
    /// <summary>
    /// 状态
    /// </summary>
    public int Status { get; set; }
    
    /// <summary>
    /// 进度
    /// </summary>
    public int Progress { get; set; }
    
    /// <summary>
    /// 是否禁用
    /// </summary>
    public bool Disabled { get; set; }
}

/// <summary>
/// 更新规则请求
/// </summary>
public class UpdateRuleRequest
{
    /// <summary>
    /// 规则键
    /// </summary>
    public int? Key { get; set; }
    
    /// <summary>
    /// 规则名称
    /// </summary>
    public string? Name { get; set; }
    
    /// <summary>
    /// 描述
    /// </summary>
    public string? Desc { get; set; }
    
    /// <summary>
    /// 所有者
    /// </summary>
    public string? Owner { get; set; }
    
    /// <summary>
    /// 链接地址
    /// </summary>
    public string? Href { get; set; }
    
    /// <summary>
    /// 头像URL
    /// </summary>
    public string? Avatar { get; set; }
    
    /// <summary>
    /// 调用次数
    /// </summary>
    public int? CallNo { get; set; }
    
    /// <summary>
    /// 状态
    /// </summary>
    public int? Status { get; set; }
    
    /// <summary>
    /// 进度
    /// </summary>
    public int? Progress { get; set; }
    
    /// <summary>
    /// 是否禁用
    /// </summary>
    public bool? Disabled { get; set; }
}

/// <summary>
/// 规则列表响应
/// </summary>
public class RuleListResponse
{
    /// <summary>
    /// 规则数据列表
    /// </summary>
    public List<RuleListItem> Data { get; set; } = new();
    
    /// <summary>
    /// 总记录数
    /// </summary>
    public int Total { get; set; }
    
    /// <summary>
    /// 是否成功
    /// </summary>
    public bool Success { get; set; } = true;
    
    /// <summary>
    /// 每页大小
    /// </summary>
    public int PageSize { get; set; }
    
    /// <summary>
    /// 当前页码
    /// </summary>
    public int Current { get; set; }
}

/// <summary>
/// 规则查询参数
/// </summary>
public class RuleQueryParams : PageParams
{
    /// <summary>
    /// 规则名称（搜索关键词）
    /// </summary>
    public string? Name { get; set; }
    
    /// <summary>
    /// 排序字段
    /// </summary>
    public string? Sorter { get; set; }
    
    /// <summary>
    /// 过滤条件
    /// </summary>
    public string? Filter { get; set; }
}

/// <summary>
/// 规则操作请求
/// </summary>
public class RuleOperationRequest
{
    /// <summary>
    /// 操作方法
    /// </summary>
    public string Method { get; set; } = string.Empty;
    
    /// <summary>
    /// 规则名称
    /// </summary>
    public string? Name { get; set; }
    
    /// <summary>
    /// 描述
    /// </summary>
    public string? Desc { get; set; }
    
    /// <summary>
    /// 规则键
    /// </summary>
    public int? Key { get; set; }
}

/// <summary>
/// 删除规则请求
/// </summary>
public class DeleteRuleRequest
{
    /// <summary>
    /// 规则键
    /// </summary>
    public int? Key { get; set; }
}
