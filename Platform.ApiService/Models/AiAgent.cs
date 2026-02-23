using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

/// <summary>
/// AI 智能体实体
/// 定义一个具有特定角色、指令及工具集（Skills）的自主执行体。
/// </summary>
[BsonCollectionName("aiAgents")]
public class AiAgent : MultiTenantEntity
{
    /// <summary>
    /// 智能体名称
    /// </summary>
    [BsonElement("name")]
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 功能描述
    /// </summary>
    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// 角色设定 / 系统指令 (Persona)
    /// </summary>
    [BsonElement("persona")]
    [Required]
    public string Persona { get; set; } = string.Empty;

    /// <summary>
    /// 允许调用的技能列表 (MCP 工具名称)
    /// 如果为空，则不允许调用任何工具
    /// </summary>
    [BsonElement("allowedSkills")]
    public List<string> AllowedSkills { get; set; } = [];

    /// <summary>
    /// 使用的底层 LLM 模型
    /// </summary>
    [BsonElement("model")]
    public string Model { get; set; } = "gpt-4-turbo";

    /// <summary>
    /// 智能体温度参数
    /// </summary>
    [BsonElement("temperature")]
    public double Temperature { get; set; } = 0.5;

    /// <summary>
    /// 是否启用
    /// </summary>
    [BsonElement("isEnabled")]
    public bool IsEnabled { get; set; } = true;
}
