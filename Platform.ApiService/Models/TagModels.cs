using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ApiService.Models;

public class TagItem : ISoftDeletable
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("value")]
    public int Value { get; set; }

    [BsonElement("type")]
    public int Type { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

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

public class TagListResponse
{
    public List<TagItem> List { get; set; } = new();
    public int Total { get; set; }
    public bool Success { get; set; } = true;
}

public class CreateTagRequest
{
    public string Name { get; set; } = string.Empty;
    public int Value { get; set; }
    public int Type { get; set; }
}

public class UpdateTagRequest
{
    public string? Name { get; set; }
    public int? Value { get; set; }
    public int? Type { get; set; }
}
