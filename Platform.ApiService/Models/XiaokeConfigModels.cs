using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 小科配置实体
/// </summary>
[BsonCollectionName("xiaokeConfigs")]
public class XiaokeConfig : MultiTenantEntity
{
    /// <summary>
    /// 配置名称
    /// </summary>
    [BsonElement("name")]
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// AI模型名称（如 "gpt-4", "gpt-3.5-turbo"）
    /// </summary>
    [BsonElement("model")]
    [Required]
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// 系统提示词
    /// </summary>
    [BsonElement("systemPrompt")]
    public string SystemPrompt { get; set; } = string.Empty;

    /// <summary>
    /// 温度参数（0-2）
    /// </summary>
    [BsonElement("temperature")]
    [Range(0.0, 2.0)]
    public double Temperature { get; set; } = 0.7;

    /// <summary>
    /// 最大token数
    /// </summary>
    [BsonElement("maxTokens")]
    [Range(1, int.MaxValue)]
    public int MaxTokens { get; set; } = 2000;

    /// <summary>
    /// Top-p采样参数（0-1）
    /// </summary>
    [BsonElement("topP")]
    [Range(0.0, 1.0)]
    public double TopP { get; set; } = 1.0;

    /// <summary>
    /// 频率惩罚（-2到2）
    /// </summary>
    [BsonElement("frequencyPenalty")]
    [Range(-2.0, 2.0)]
    public double FrequencyPenalty { get; set; } = 0.0;

    /// <summary>
    /// 存在惩罚（-2到2）
    /// </summary>
    [BsonElement("presencePenalty")]
    [Range(-2.0, 2.0)]
    public double PresencePenalty { get; set; } = 0.0;

    /// <summary>
    /// 是否启用
    /// </summary>
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// 是否为默认配置（每个企业只能有一个默认配置）
    /// </summary>
    [BsonElement("isDefault")]
    public bool IsDefault { get; set; } = false;

    // 时间戳和软删除字段继承自 MultiTenantEntity，无需重复定义
}

/// <summary>
/// 小科配置DTO
/// </summary>
public class XiaokeConfigDto
{
    /// <summary>
    /// 配置ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 配置名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// AI模型名称
    /// </summary>
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// 系统提示词
    /// </summary>
    public string SystemPrompt { get; set; } = string.Empty;

    /// <summary>
    /// 温度参数
    /// </summary>
    public double Temperature { get; set; }

    /// <summary>
    /// 最大token数
    /// </summary>
    public int MaxTokens { get; set; }

    /// <summary>
    /// Top-p采样参数
    /// </summary>
    public double TopP { get; set; }

    /// <summary>
    /// 频率惩罚
    /// </summary>
    public double FrequencyPenalty { get; set; }

    /// <summary>
    /// 存在惩罚
    /// </summary>
    public double PresencePenalty { get; set; }

    /// <summary>
    /// 是否启用
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// 是否为默认配置
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// 创建小科配置请求
/// </summary>
public class CreateXiaokeConfigRequest
{
    /// <summary>
    /// 配置名称
    /// </summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// AI模型名称
    /// </summary>
    [Required]
    public string Model { get; set; } = string.Empty;

    /// <summary>
    /// 系统提示词
    /// </summary>
    public string SystemPrompt { get; set; } = string.Empty;

    /// <summary>
    /// 温度参数（0-2）
    /// </summary>
    [Range(0.0, 2.0)]
    public double Temperature { get; set; } = 0.7;

    /// <summary>
    /// 最大token数
    /// </summary>
    [Range(1, int.MaxValue)]
    public int MaxTokens { get; set; } = 2000;

    /// <summary>
    /// Top-p采样参数（0-1）
    /// </summary>
    [Range(0.0, 1.0)]
    public double TopP { get; set; } = 1.0;

    /// <summary>
    /// 频率惩罚（-2到2）
    /// </summary>
    [Range(-2.0, 2.0)]
    public double FrequencyPenalty { get; set; } = 0.0;

    /// <summary>
    /// 存在惩罚（-2到2）
    /// </summary>
    [Range(-2.0, 2.0)]
    public double PresencePenalty { get; set; } = 0.0;

    /// <summary>
    /// 是否启用
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// 是否设为默认配置
    /// </summary>
    public bool IsDefault { get; set; } = false;
}

/// <summary>
/// 更新小科配置请求
/// </summary>
public class UpdateXiaokeConfigRequest
{
    /// <summary>
    /// 配置名称
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// AI模型名称
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// 系统提示词
    /// </summary>
    public string? SystemPrompt { get; set; }

    /// <summary>
    /// 温度参数（0-2）
    /// </summary>
    [Range(0.0, 2.0)]
    public double? Temperature { get; set; }

    /// <summary>
    /// 最大token数
    /// </summary>
    [Range(1, int.MaxValue)]
    public int? MaxTokens { get; set; }

    /// <summary>
    /// Top-p采样参数（0-1）
    /// </summary>
    [Range(0.0, 1.0)]
    public double? TopP { get; set; }

    /// <summary>
    /// 频率惩罚（-2到2）
    /// </summary>
    [Range(-2.0, 2.0)]
    public double? FrequencyPenalty { get; set; }

    /// <summary>
    /// 存在惩罚（-2到2）
    /// </summary>
    [Range(-2.0, 2.0)]
    public double? PresencePenalty { get; set; }

    /// <summary>
    /// 是否启用
    /// </summary>
    public bool? IsEnabled { get; set; }

    /// <summary>
    /// 是否设为默认配置
    /// </summary>
    public bool? IsDefault { get; set; }
}

/// <summary>
/// 小科配置列表响应
/// </summary>
public class XiaokeConfigListResponse
{
    /// <summary>
    /// 配置数据列表
    /// </summary>
    public List<XiaokeConfigDto> Data { get; set; } = new();

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
/// 小科配置查询参数
/// </summary>
public class XiaokeConfigQueryParams : PageParams
{
    /// <summary>
    /// 配置名称（搜索关键词）
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// 是否启用（筛选）
    /// </summary>
    public bool? IsEnabled { get; set; }

    /// <summary>
    /// 排序字段
    /// </summary>
    public string? Sorter { get; set; }
}

/// <summary>
/// 聊天记录查询请求
/// </summary>
public class ChatHistoryQueryRequest : PageParams
{
    /// <summary>
    /// 会话ID（搜索）
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// 用户ID（搜索）
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// 消息内容（搜索）
    /// </summary>
    public string? Content { get; set; }

    /// <summary>
    /// 开始时间
    /// </summary>
    public DateTime? StartTime { get; set; }

    /// <summary>
    /// 结束时间
    /// </summary>
    public DateTime? EndTime { get; set; }

    /// <summary>
    /// 排序字段
    /// </summary>
    public string? Sorter { get; set; }
}

/// <summary>
/// 聊天记录列表项DTO
/// </summary>
public class ChatHistoryListItemDto
{
    /// <summary>
    /// 会话ID
    /// </summary>
    public string SessionId { get; set; } = string.Empty;

    /// <summary>
    /// 参与者列表
    /// </summary>
    public List<string> Participants { get; set; } = new();

    /// <summary>
    /// 参与者名称映射
    /// </summary>
    public Dictionary<string, string> ParticipantNames { get; set; } = new();

    /// <summary>
    /// 最后一条消息摘要
    /// </summary>
    public string? LastMessageExcerpt { get; set; }

    /// <summary>
    /// 最后一条消息时间
    /// </summary>
    public DateTime? LastMessageAt { get; set; }

    /// <summary>
    /// 消息总数
    /// </summary>
    public int MessageCount { get; set; }

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 聊天记录列表响应
/// </summary>
public class ChatHistoryListResponse
{
    /// <summary>
    /// 会话数据列表
    /// </summary>
    public List<ChatHistoryListItemDto> Data { get; set; } = new();

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
/// 聊天记录详情响应
/// </summary>
public class ChatHistoryDetailResponse
{
    /// <summary>
    /// 会话信息
    /// </summary>
    public ChatSession Session { get; set; } = new();

    /// <summary>
    /// 消息列表
    /// </summary>
    public List<ChatMessage> Messages { get; set; } = new();
}
