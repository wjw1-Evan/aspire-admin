using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;
using System;
using System.Collections.Generic;

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
[BsonCollectionName("projects")]
public class Project : MultiTenantEntity
{
    /// <summary>项目名称</summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>项目描述</summary>
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>项目状态</summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.Int32)]
    public ProjectStatus Status { get; set; } = ProjectStatus.Planning;

    /// <summary>开始日期</summary>
    [BsonElement("startDate")]
    public DateTime? StartDate { get; set; }

    /// <summary>结束日期</summary>
    [BsonElement("endDate")]
    public DateTime? EndDate { get; set; }

    /// <summary>进度百分比（0-100，自动计算）</summary>
    [BsonElement("progress")]
    public int Progress { get; set; } = 0;

    /// <summary>项目经理ID</summary>
    [BsonElement("managerId")]
    public string? ManagerId { get; set; }

    /// <summary>预算（可选）</summary>
    [BsonElement("budget")]
    public decimal? Budget { get; set; }

    /// <summary>优先级</summary>
    [BsonElement("priority")]
    [BsonRepresentation(BsonType.Int32)]
    public ProjectPriority Priority { get; set; } = ProjectPriority.Medium;
}

/// <summary>
/// 任务依赖实体模型
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("taskDependencies")]
public class TaskDependency : MultiTenantEntity
{
    /// <summary>前置任务ID</summary>
    [BsonElement("predecessorTaskId")]
    public string PredecessorTaskId { get; set; } = string.Empty;

    /// <summary>后续任务ID</summary>
    [BsonElement("successorTaskId")]
    public string SuccessorTaskId { get; set; } = string.Empty;

    /// <summary>依赖类型</summary>
    [BsonElement("dependencyType")]
    [BsonRepresentation(BsonType.Int32)]
    public TaskDependencyType DependencyType { get; set; } = TaskDependencyType.FinishToStart;

    /// <summary>延迟天数</summary>
    [BsonElement("lagDays")]
    public int LagDays { get; set; } = 0;
}

/// <summary>
/// 项目成员实体模型
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("projectMembers")]
public class ProjectMember : MultiTenantEntity
{
    /// <summary>项目ID</summary>
    [BsonElement("projectId")]
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>用户ID</summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    /// <summary>角色</summary>
    [BsonElement("role")]
    [BsonRepresentation(BsonType.Int32)]
    public ProjectMemberRole Role { get; set; } = ProjectMemberRole.Member;

    /// <summary>资源分配百分比（0-100）</summary>
    [BsonElement("allocation")]
    public int Allocation { get; set; } = 100;
}

/// <summary>
/// 项目里程碑实体模型
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("milestones")]
public class Milestone : MultiTenantEntity
{
    /// <summary>项目ID</summary>
    [BsonElement("projectId")]
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>里程碑名称</summary>
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>目标日期</summary>
    [BsonElement("targetDate")]
    public DateTime TargetDate { get; set; }

    /// <summary>状态</summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.Int32)]
    public MilestoneStatus Status { get; set; } = MilestoneStatus.Pending;

    /// <summary>描述</summary>
    [BsonElement("description")]
    public string? Description { get; set; }
}
