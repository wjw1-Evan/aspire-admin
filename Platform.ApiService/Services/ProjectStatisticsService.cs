using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Logging;
using OpenAI;
using OpenAI.Chat;
using Platform.ApiService.Models;
using Platform.ApiService.Options;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 项目统计服务
/// </summary>
public class ProjectStatisticsService : IProjectStatisticsService
{
    private readonly DbContext _context;
    private readonly IChatClient _openAiClient;
    private readonly ILogger<ProjectStatisticsService> _logger;

    public ProjectStatisticsService(
        DbContext context,
        IChatClient openAiClient,
        ILogger<ProjectStatisticsService> logger)
    {
        _context = context;
        _openAiClient = openAiClient;
        _logger = logger;
    }

    /// <summary>
    /// 获取仪表盘统计数据
    /// </summary>
    /// <param name="startDate">开始日期</param>
    /// <param name="endDate">结束日期</param>
    /// <returns>仪表盘统计数据</returns>
    public async Task<ProjectDashboardStatistics> GetDashboardStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var start = startDate;
        var end = endDate;

        var stats = new ProjectDashboardStatistics();

        // 2. Project Stats
        var projects = await _context.Set<Project>().ToListAsync();
        stats.Project = new ProjectStatistics
        {
            TotalProjects = projects.Count,
            InProgressProjects = projects.Count(p => p.Status == ProjectStatus.InProgress),
            CompletedProjects = projects.Count(p => p.Status == ProjectStatus.Completed),
            DelayedProjects = projects.Count(p => p.EndDate < DateTime.UtcNow && p.Status != ProjectStatus.Completed)
        };

        foreach (var p in projects)
        {
            var s = p.Status.ToString();
            if (!stats.Project.ProjectsByStatus.ContainsKey(s)) stats.Project.ProjectsByStatus[s] = 0;
            stats.Project.ProjectsByStatus[s]++;

            var pr = p.Priority.ToString();
            if (!stats.Project.ProjectsByPriority.ContainsKey(pr)) stats.Project.ProjectsByPriority[pr] = 0;
            stats.Project.ProjectsByPriority[pr]++;
        }

        // 3. Task Stats
        var tasks = await _context.Set<WorkTask>()
            .Where(t => (!start.HasValue || t.CreatedAt >= start.Value) && (!end.HasValue || t.CreatedAt <= end.Value))
            .ToListAsync();

        stats.Task = new TaskStatistics
        {
            TotalTasks = tasks.Count,
            PendingTasks = tasks.Count(t => t.Status == Platform.ApiService.Models.TaskStatus.Pending),
            InProgressTasks = tasks.Count(t => t.Status == Platform.ApiService.Models.TaskStatus.InProgress),
            CompletedTasks = tasks.Count(t => t.Status == Platform.ApiService.Models.TaskStatus.Completed),
            FailedTasks = tasks.Count(t => t.Status == Platform.ApiService.Models.TaskStatus.Failed),
            OverdueTasks = tasks.Count(t => t.PlannedEndTime < DateTime.UtcNow && t.Status != Platform.ApiService.Models.TaskStatus.Completed),
        };
        stats.Task.CompletionRate = stats.Task.TotalTasks > 0
            ? Math.Round((double)stats.Task.CompletedTasks / stats.Task.TotalTasks * 100, 2)
            : 0;

        foreach (var t in tasks)
        {
            var s = t.Status.ToString();
            if (!stats.Task.TasksByStatus.ContainsKey(s)) stats.Task.TasksByStatus[s] = 0;
            stats.Task.TasksByStatus[s]++;

            var pr = t.Priority.ToString();
            if (!stats.Task.TasksByPriority.ContainsKey(pr)) stats.Task.TasksByPriority[pr] = 0;
            stats.Task.TasksByPriority[pr]++;
        }

        // 4. Member Stats
        var members = await _context.Set<ProjectMember>().ToListAsync();
        stats.Member.TotalMembers = members.Select(m => m.UserId).Distinct().Count();
        foreach (var m in members)
        {
            var r = m.Role.ToString();
            if (!stats.Member.MembersByRole.ContainsKey(r)) stats.Member.MembersByRole[r] = 0;
            stats.Member.MembersByRole[r]++;
        }

        // 5. Milestone Stats
        var milestones = await _context.Set<Milestone>()
            .Where(m => (!start.HasValue || m.TargetDate >= start.Value) && (!end.HasValue || m.TargetDate <= end.Value))
            .ToListAsync();

        stats.Milestone.TotalMilestones = milestones.Count;
        stats.Milestone.PendingMilestones = milestones.Count(m => m.Status == MilestoneStatus.Pending);
        stats.Milestone.AchievedMilestones = milestones.Count(m => m.Status == MilestoneStatus.Achieved);
        stats.Milestone.DelayedMilestones = milestones.Count(m => m.Status == MilestoneStatus.Delayed);

        return stats;
    }

    /// <summary>
    /// 生成 AI 分析报告
    /// </summary>
    public async Task<string> GenerateAiReportAsync(DateTime? startDate = null, DateTime? endDate = null, object? statisticsData = null)
    {
        try
        {
            object statsData;
            var periodDesc = startDate.HasValue && endDate.HasValue
                ? $"{startDate:yyyy-MM-dd} 至 {endDate:yyyy-MM-dd}"
                : "本月";

            if (statisticsData != null)
            {
                statsData = new { Period = periodDesc, Data = statisticsData };
            }
            else
            {
                var dashboardStats = await GetDashboardStatisticsAsync(startDate, endDate);
                statsData = new { Period = periodDesc, Data = dashboardStats };
            }

            var statsJson = JsonSerializer.Serialize(statsData, new JsonSerializerOptions { WriteIndented = true });

            var systemPrompt = "你是一个专业的项目管理数据分析师。请根据提供的项目运营数据，通过 markdown 格式生成一份详细的项目管理分析报告。报告应重点关注项目进度、任务执行效率、资源分配及潜在风险。";
            var userPrompt = $@"请基于以下统计数据生成项目管理分析报告：

{statsJson}

报告要求：
1. **总体概览**：简要总结本周期项目整体运行状况。
2. **详细分析**：项目进度、任务执行效率等。
3. **趋势与风险**：识别潜在风险点。
4. **改进建议**：提出具体的改进建议。

请使用 Markdown 格式输出，并使用 Emoji 增强可读性。";



            var messages = new List<Microsoft.Extensions.AI.ChatMessage>
            {
                new (ChatRole.System, systemPrompt),
                new (ChatRole.User, userPrompt)
            };

            var response = await _openAiClient.GetResponseAsync(messages);
            return response.Text;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "生成 AI 报告失败");
            return $"生成报告时发生错误：{ex.Message}。请联系管理员检查 AI 服务配置。";
        }
    }
}
