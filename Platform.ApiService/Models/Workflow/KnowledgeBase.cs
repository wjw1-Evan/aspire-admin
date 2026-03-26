using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;
using System;

namespace Platform.ApiService.Models.Workflow;

/// <summary>
/// 知识库实体模型 - 支持多租户
/// </summary>
public class KnowledgeBase : MultiTenantEntity
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    [BsonElement("itemCount")]
    public int ItemCount { get; set; } = 0;

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;
}