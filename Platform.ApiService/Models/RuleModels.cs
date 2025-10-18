using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

public class RuleListItem : Platform.ServiceDefaults.Models.ISoftDeletable
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("companyId")]
    public string CompanyId { get; set; } = string.Empty;

    [BsonElement("key")]
    public int Key { get; set; }

    [BsonElement("disabled")]
    public bool Disabled { get; set; }

    [BsonElement("href")]
    public string? Href { get; set; }

    [BsonElement("avatar")]
    public string? Avatar { get; set; }

    [BsonElement("name")]
    public string? Name { get; set; }

    [BsonElement("owner")]
    public string? Owner { get; set; }

    [BsonElement("desc")]
    public string? Desc { get; set; }

    [BsonElement("callNo")]
    public int CallNo { get; set; }

    [BsonElement("status")]
    public int Status { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("progress")]
    public int Progress { get; set; }

    // 软删除字段
    [BsonElement("isDeleted")]
    public bool IsDeleted { get; set; } = false;

    [BsonElement("deletedAt")]
    public DateTime? DeletedAt { get; set; }

    [BsonElement("deletedBy")]
    public string? DeletedBy { get; set; }

    [BsonElement("deletedReason")]
    public string? DeletedReason { get; set; }
}

public class CreateRuleRequest
{
    public string? Name { get; set; }
    public string? Desc { get; set; }
    public string? Owner { get; set; }
    public string? Href { get; set; }
    public string? Avatar { get; set; }
    public int CallNo { get; set; }
    public int Status { get; set; }
    public int Progress { get; set; }
    public bool Disabled { get; set; }
}

public class UpdateRuleRequest
{
    public int? Key { get; set; }
    public string? Name { get; set; }
    public string? Desc { get; set; }
    public string? Owner { get; set; }
    public string? Href { get; set; }
    public string? Avatar { get; set; }
    public int? CallNo { get; set; }
    public int? Status { get; set; }
    public int? Progress { get; set; }
    public bool? Disabled { get; set; }
}

public class RuleListResponse
{
    public List<RuleListItem> Data { get; set; } = new();
    public int Total { get; set; }
    public bool Success { get; set; } = true;
    public int PageSize { get; set; }
    public int Current { get; set; }
}

public class RuleQueryParams : PageParams
{
    public string? Name { get; set; }
    public string? Sorter { get; set; }
    public string? Filter { get; set; }
}

public class RuleOperationRequest
{
    public string Method { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Desc { get; set; }
    public int? Key { get; set; }
}

public class DeleteRuleRequest
{
    public int? Key { get; set; }
}
