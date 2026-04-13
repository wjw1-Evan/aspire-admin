using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// 小科配置实体
/// </summary>
public class XiaokeConfig : MultiTenantEntity
{
    /// <summary>
    /// 配置名称
    /// </summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// AI模型名称（如 "gpt-4", "gpt-3.5-turbo"）
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
    /// 是否为默认配置（每个企业只能有一个默认配置）
    /// </summary>
    public bool IsDefault { get; set; } = false;

    // 时间戳和软删除字段继承自 MultiTenantEntity，无需重复定义
}


