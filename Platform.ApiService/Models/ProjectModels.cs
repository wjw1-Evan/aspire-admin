using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 项目状态枚举
/// </summary>
public enum ProjectStatus
{
    /// <summary>规划中</summary>
    Planning = 0,
    
    /// <summary>进行中</summary>
    InProgress = 1,
    
    /// <summary>暂停</summary>
    OnHold = 2,
    
    /// <summary>已完成</summary>
    Completed = 3,
    
    /// <summary>已取消</summary>
    Cancelled = 4
}

/// <summary>
/// 项目优先级枚举
/// </summary>
public enum ProjectPriority
{
    /// <summary>低</summary>
    Low = 0,
    
    /// <summary>中</summary>
    Medium = 1,
    
    /// <summary>高</summary>
    High = 2
}

/// <summary>
/// 任务依赖类型枚举
/// </summary>
public enum TaskDependencyType
{
    /// <summary>完成到开始（Finish-To-Start）</summary>
    FinishToStart = 0,
    
    /// <summary>开始到开始（Start-To-Start）</summary>
    StartToStart = 1,
    
    /// <summary>完成到完成（Finish-To-Finish）</summary>
    FinishToFinish = 2,
    
    /// <summary>开始到完成（Start-To-Finish）</summary>
    StartToFinish = 3
}

/// <summary>
/// 项目成员角色枚举
/// </summary>
public enum ProjectMemberRole
{
    /// <summary>项目经理</summary>
    Manager = 0,
    
    /// <summary>成员</summary>
    Member = 1,
    
    /// <summary>查看者</summary>
    Viewer = 2
}

/// <summary>
/// 里程碑状态枚举
/// </summary>
public enum MilestoneStatus
{
    /// <summary>待达成</summary>
    Pending = 0,
    
    /// <summary>已达成</summary>
    Achieved = 1,
    
    /// <summary>已延期</summary>
    Delayed = 2
}

/// <summary>
/// 项目实体模型
/// </summary>
[BsonIgnoreExtraElements]
[Table("projects")]
public class Project : MultiTenantEntity
{
    /// <summary>项目名称</summary>
    [Required]
    [StringLength(200)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>项目描述</summary>
    [StringLength(2000)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>项目状态</summary>
    [Column("status")]
    [BsonElement("status")]
    [BsonRepresentation(BsonType.Int32)]
    public ProjectStatus Status { get; set; } = ProjectStatus.Planning;

    /// <summary>开始日期</summary>
    [Column("startDate")]
    [BsonElement("startDate")]
    public DateTime? StartDate { get; set; }

    /// <summary>结束日期</summary>
    [Column("endDate")]
    [BsonElement("endDate")]
    public DateTime? EndDate { get; set; }

    /// <summary>进度百分比（0-100，自动计算）</summary>
    [Range(0, 100)]
    [Column("progress")]
    [BsonElement("progress")]
    public int Progress { get; set; } = 0;

    /// <summary>项目经理ID</summary>
    [StringLength(100)]
    [Column("managerId")]
    [BsonElement("managerId")]
    public string? ManagerId { get; set; }

    /// <summary>预算（可选）</summary>
    [Column("budget")]
    [BsonElement("budget")]
    public decimal? Budget { get; set; }

    /// <summary>优先级</summary>
    [Column("priority")]
    [BsonElement("priority")]
    [BsonRepresentation(BsonType.Int32)]
    public ProjectPriority Priority { get; set; } = ProjectPriority.Medium;
}

/// <summary>
/// 任务依赖实体模型
/// </summary>
[BsonIgnoreExtraElements]
[Table("taskDependencies")]
public class TaskDependency : MultiTenantEntity
{
    /// <summary>前置任务ID</summary>
    [Required]
    [StringLength(100)]
    [Column("predecessorTaskId")]
    [BsonElement("predecessorTaskId")]
    public string PredecessorTaskId { get; set; } = string.Empty;

    /// <summary>后续任务ID</summary>
    [Required]
    [StringLength(100)]
    [Column("successorTaskId")]
    [BsonElement("successorTaskId")]
    public string SuccessorTaskId { get; set; } = string.Empty;

    /// <summary>依赖类型</summary>
    [Column("dependencyType")]
    [BsonElement("dependencyType")]
    [BsonRepresentation(BsonType.Int32)]
    public TaskDependencyType DependencyType { get; set; } = TaskDependencyType.FinishToStart;

    /// <summary>延迟天数</summary>
    [Range(0, 365)]
    [Column("lagDays")]
    [BsonElement("lagDays")]
    public int LagDays { get; set; } = 0;
}

/// <summary>
/// 项目成员实体模型
/// </summary>
[BsonIgnoreExtraElements]
[Table("projectMembers")]
public class ProjectMember : MultiTenantEntity
{
    /// <summary>项目ID</summary>
    [Required]
    [StringLength(100)]
    [Column("projectId")]
    [BsonElement("projectId")]
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>用户ID</summary>
    [Required]
    [StringLength(100)]
    [Column("userId")]
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>角色</summary>
    [Column("role")]
    [BsonElement("role")]
    [BsonRepresentation(BsonType.Int32)]
    public ProjectMemberRole Role { get; set; } = ProjectMemberRole.Member;

    /// <summary>资源分配百分比（0-100）</summary>
    [Range(0, 100)]
    [Column("allocation")]
    [BsonElement("allocation")]
    public int Allocation { get; set; } = 100;
}

/// <summary>
/// 项目里程碑实体模型
/// </summary>
[BsonIgnoreExtraElements]
[Table("milestones")]
public class Milestone : MultiTenantEntity
{
    /// <summary>项目ID</summary>
    [Required]
    [StringLength(100)]
    [Column("projectId")]
    [BsonElement("projectId")]
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>里程碑名称</summary>
    [Required]
    [StringLength(200)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>目标日期</summary>
    [Required]
    [Column("targetDate")]
    [BsonElement("targetDate")]
    public DateTime TargetDate { get; set; }

    /// <summary>状态</summary>
    [Column("status")]
    [BsonElement("status")]
    [BsonRepresentation(BsonType.Int32)]
    public MilestoneStatus Status { get; set; } = MilestoneStatus.Pending;

    /// <summary>描述</summary>
    [StringLength(1000)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }
}
