using System;
using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 创建项目请求DTO
/// </summary>
public class CreateProjectRequest
{
    /// <summary>项目名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>项目描述</summary>
    public string? Description { get; set; }

    /// <summary>项目状态</summary>
    public int Status { get; set; } = (int)ProjectStatus.Planning;

    /// <summary>开始日期</summary>
    public DateTime? StartDate { get; set; }

    /// <summary>结束日期</summary>
    public DateTime? EndDate { get; set; }

    /// <summary>项目经理ID</summary>
    public string? ManagerId { get; set; }

    /// <summary>预算</summary>
    public decimal? Budget { get; set; }

    /// <summary>优先级</summary>
    public int Priority { get; set; } = (int)ProjectPriority.Medium;
}

/// <summary>
/// 更新项目请求DTO
/// </summary>
public class UpdateProjectRequest
{
    /// <summary>项目ID</summary>
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>项目名称</summary>
    public string? Name { get; set; }

    /// <summary>项目描述</summary>
    public string? Description { get; set; }

    /// <summary>项目状态</summary>
    public int? Status { get; set; }

    /// <summary>开始日期</summary>
    public DateTime? StartDate { get; set; }

    /// <summary>结束日期</summary>
    public DateTime? EndDate { get; set; }

    /// <summary>项目经理ID</summary>
    public string? ManagerId { get; set; }

    /// <summary>预算</summary>
    public decimal? Budget { get; set; }

    /// <summary>优先级</summary>
    public int? Priority { get; set; }
}

/// <summary>
/// 项目查询请求DTO
/// </summary>
public class ProjectQueryRequest
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 10;

    /// <summary>搜索关键词</summary>
    public string? Search { get; set; }

    /// <summary>项目状态</summary>
    public int? Status { get; set; }

    /// <summary>优先级</summary>
    public int? Priority { get; set; }

    /// <summary>项目经理ID</summary>
    public string? ManagerId { get; set; }

    /// <summary>开始日期</summary>
    public DateTime? StartDate { get; set; }

    /// <summary>结束日期</summary>
    public DateTime? EndDate { get; set; }

    /// <summary>排序字段</summary>
    public string SortBy { get; set; } = "CreatedAt";

    /// <summary>排序顺序</summary>
    public string SortOrder { get; set; } = "desc";
}

/// <summary>
/// 项目响应DTO
/// </summary>
public class ProjectDto
{
    /// <summary>项目ID</summary>
    public string? Id { get; set; }

    /// <summary>项目名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>项目描述</summary>
    public string? Description { get; set; }

    /// <summary>项目状态</summary>
    public int Status { get; set; }

    /// <summary>状态名称</summary>
    public string StatusName { get; set; } = string.Empty;

    /// <summary>开始日期</summary>
    public DateTime? StartDate { get; set; }

    /// <summary>结束日期</summary>
    public DateTime? EndDate { get; set; }

    /// <summary>进度百分比</summary>
    public int Progress { get; set; }

    /// <summary>项目经理ID</summary>
    public string? ManagerId { get; set; }

    /// <summary>项目经理名称</summary>
    public string? ManagerName { get; set; }

    /// <summary>预算</summary>
    public decimal? Budget { get; set; }

    /// <summary>优先级</summary>
    public int Priority { get; set; }

    /// <summary>优先级名称</summary>
    public string PriorityName { get; set; } = string.Empty;

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>创建者ID</summary>
    public string? CreatedBy { get; set; }

    /// <summary>创建者名称</summary>
    public string? CreatedByName { get; set; }

    /// <summary>最后更新时间</summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// 项目列表响应DTO
/// </summary>
public class ProjectListResponse
{
    /// <summary>项目列表</summary>
    public List<ProjectDto> Projects { get; set; } = new();

    /// <summary>总数</summary>
    public int Total { get; set; }

    /// <summary>页码</summary>
    public int Page { get; set; }

    /// <summary>每页数量</summary>
    public int PageSize { get; set; }
}

/// <summary>
/// 添加项目成员请求DTO
/// </summary>
public class AddProjectMemberRequest
{
    /// <summary>项目ID</summary>
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>用户ID</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>角色</summary>
    public int Role { get; set; } = (int)ProjectMemberRole.Member;

    /// <summary>资源分配百分比</summary>
    public int Allocation { get; set; } = 100;
}

/// <summary>
/// 项目成员响应DTO
/// </summary>
public class ProjectMemberDto
{
    /// <summary>成员ID</summary>
    public string? Id { get; set; }

    /// <summary>项目ID</summary>
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>用户ID</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>用户名</summary>
    public string? UserName { get; set; }

    /// <summary>用户邮箱</summary>
    public string? UserEmail { get; set; }

    /// <summary>角色</summary>
    public int Role { get; set; }

    /// <summary>角色名称</summary>
    public string RoleName { get; set; } = string.Empty;

    /// <summary>资源分配百分比</summary>
    public int Allocation { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 项目统计信息DTO
/// </summary>
public class ProjectStatistics
{
    /// <summary>总项目数</summary>
    public int TotalProjects { get; set; }

    /// <summary>进行中项目数</summary>
    public int InProgressProjects { get; set; }

    /// <summary>已完成项目数</summary>
    public int CompletedProjects { get; set; }

    /// <summary>延期项目数</summary>
    public int DelayedProjects { get; set; }

    /// <summary>按状态统计</summary>
    public Dictionary<string, int> ProjectsByStatus { get; set; } = new();

    /// <summary>按优先级统计</summary>
    public Dictionary<string, int> ProjectsByPriority { get; set; } = new();
}

/// <summary>
/// 创建里程碑请求DTO
/// </summary>
public class CreateMilestoneRequest
{
    /// <summary>项目ID</summary>
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>里程碑名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>目标日期</summary>
    public DateTime TargetDate { get; set; }

    /// <summary>描述</summary>
    public string? Description { get; set; }
}

/// <summary>
/// 里程碑响应DTO
/// </summary>
public class MilestoneDto
{
    /// <summary>里程碑ID</summary>
    public string? Id { get; set; }

    /// <summary>项目ID</summary>
    public string ProjectId { get; set; } = string.Empty;

    /// <summary>里程碑名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>目标日期</summary>
    public DateTime TargetDate { get; set; }

    /// <summary>状态</summary>
    public int Status { get; set; }

    /// <summary>状态名称</summary>
    public string StatusName { get; set; } = string.Empty;

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 任务依赖DTO
/// </summary>
public class TaskDependencyDto
{
    /// <summary>依赖ID</summary>
    public string? Id { get; set; }

    /// <summary>前置任务ID</summary>
    public string PredecessorTaskId { get; set; } = string.Empty;

    /// <summary>前置任务名称</summary>
    public string? PredecessorTaskName { get; set; }

    /// <summary>后续任务ID</summary>
    public string SuccessorTaskId { get; set; } = string.Empty;

    /// <summary>后续任务名称</summary>
    public string? SuccessorTaskName { get; set; }

    /// <summary>依赖类型</summary>
    public int DependencyType { get; set; }

    /// <summary>依赖类型名称</summary>
    public string DependencyTypeName { get; set; } = string.Empty;

    /// <summary>延迟天数</summary>
    public int LagDays { get; set; }
}
