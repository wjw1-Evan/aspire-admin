using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 项目实体模型
/// </summary>
public class Project : MultiTenantEntity
{
    /// <summary>项目名称</summary>
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    /// <summary>项目描述</summary>
    [StringLength(2000)]
    public string? Description { get; set; }

    /// <summary>项目状态</summary>
    [BsonRepresentation(BsonType.Int32)]
    public ProjectStatus Status { get; set; } = ProjectStatus.Planning;

    /// <summary>开始日期</summary>
    public DateTime? StartDate { get; set; }

    /// <summary>结束日期</summary>
    public DateTime? EndDate { get; set; }

    /// <summary>进度百分比（0-100，自动计算）</summary>
    [Range(0, 100)]
    public int Progress { get; set; } = 0;

    /// <summary>项目成员ID列表</summary>
    public List<string>? MemberIds { get; set; } = new();

    /// <summary>预算（可选）</summary>
    public decimal? Budget { get; set; }

    /// <summary>优先级</summary>
    [BsonRepresentation(BsonType.Int32)]
    public ProjectPriority Priority { get; set; } = ProjectPriority.Medium;
}

/// <summary>
/// 任务依赖实体模型
/// </summary>
public class TaskDependency : MultiTenantEntity
{
    /// <summary>前置任务ID</summary>
    [Required]
    [StringLength(100)]
    public string PredecessorTaskId { get; set; } = string.Empty;

    /// <summary>后续任务ID</summary>
    [Required]
    [StringLength(100)]
    public string SuccessorTaskId { get; set; } = string.Empty;

    /// <summary>依赖类型</summary>
    [BsonRepresentation(BsonType.Int32)]
    public TaskDependencyType DependencyType { get; set; } = TaskDependencyType.FinishToStart;

    /// <summary>延迟天数</summary>
    [Range(0, 365)]
    public int LagDays { get; set; } = 0;
}

/// <summary>
/// 项目成员实体模型
/// </summary>
public class ProjectMember : MultiTenantEntity
{
    /// <summary>项目ID</summary>
    [Required]
    [StringLength(100)]
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>用户ID</summary>
    [Required]
    [StringLength(100)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>角色</summary>
    [BsonRepresentation(BsonType.Int32)]
    public ProjectMemberRole Role { get; set; } = ProjectMemberRole.Member;

    /// <summary>资源分配百分比（0-100）</summary>
    [Range(0, 100)]
    public int Allocation { get; set; } = 100;
}

/// <summary>
/// 项目里程碑实体模型
/// </summary>
public class Milestone : MultiTenantEntity
{
    /// <summary>项目ID</summary>
    [Required]
    [StringLength(100)]
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>里程碑名称</summary>
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    /// <summary>目标日期</summary>
    [Required]
    public DateTime TargetDate { get; set; }

    /// <summary>状态</summary>
    [BsonRepresentation(BsonType.Int32)]
    public MilestoneStatus Status { get; set; } = MilestoneStatus.Pending;

    /// <summary>描述</summary>
    [StringLength(1000)]
    public string? Description { get; set; }
}

