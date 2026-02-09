using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 项目仪表盘统计信息
/// </summary>
public class ProjectDashboardStatistics
{
    /// <summary>项目统计</summary>
    public ProjectStatistics Project { get; set; } = new();

    /// <summary>任务统计</summary>
    public TaskStatistics Task { get; set; } = new();

    /// <summary>成员统计</summary>
    public ProjectMemberStatistics Member { get; set; } = new();

    /// <summary>里程碑统计</summary>
    public MilestoneStatistics Milestone { get; set; } = new();
}

/// <summary>
/// 项目成员统计
/// </summary>
public class ProjectMemberStatistics
{
    /// <summary>总成员数</summary>
    public int TotalMembers { get; set; }

    /// <summary>按角色统计</summary>
    public Dictionary<string, int> MembersByRole { get; set; } = new();
}

/// <summary>
/// 里程碑统计
/// </summary>
public class MilestoneStatistics
{
    /// <summary>总里程碑数</summary>
    public int TotalMilestones { get; set; }

    /// <summary>待达成数</summary>
    public int PendingMilestones { get; set; }

    /// <summary>已达成数</summary>
    public int AchievedMilestones { get; set; }

    /// <summary>已延期数</summary>
    public int DelayedMilestones { get; set; }
}
