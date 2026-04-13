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
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Category { get; set; } = string.Empty;

    public int ItemCount { get; set; } = 0;

    public bool IsActive { get; set; } = true;
}