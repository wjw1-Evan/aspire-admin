using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ApiService.Options;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
using System.Text.Json;
using MongoDB.Bson;

namespace Platform.ApiService.Services;

/// <summary>
/// 项目统计服务
/// </summary>
public class ProjectStatisticsService(
    IMongoDatabase database,
    OpenAIClient openAiClient,
    IOptions<AiCompletionOptions> aiOptions,
    ILogger<ProjectStatisticsService> logger) : IProjectStatisticsService
{
    private readonly IMongoCollection<Project> _projects = database.GetCollection<Project>("projects");
    private readonly IMongoCollection<WorkTask> _tasks = database.GetCollection<WorkTask>("tasks");
    private readonly IMongoCollection<ProjectMember> _members = database.GetCollection<ProjectMember>("projectMembers");
    private readonly IMongoCollection<Milestone> _milestones = database.GetCollection<Milestone>("milestones");
    private readonly AiCompletionOptions _aiOptions = aiOptions.Value;

    public async Task<ProjectDashboardStatistics> GetDashboardStatisticsAsync(string companyId, StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null)
    {
        // 1. Determine date range
        DateTime? start = startDate, end = endDate;
        if (period != StatisticsPeriod.Custom)
        {
            var now = DateTime.UtcNow;
            end = now;
            start = period switch
            {
                StatisticsPeriod.Week => now.AddDays(-7),
                StatisticsPeriod.Month => now.AddMonths(-1),
                StatisticsPeriod.Quarter => now.AddMonths(-3),
                StatisticsPeriod.Year => now.AddYears(-1),
                _ => (DateTime?)null
            };
        }

        var stats = new ProjectDashboardStatistics();

        // 2. Project Stats (Snapshot of current state)
        var projectFilter = Builders<Project>.Filter.Eq(x => x.CompanyId, companyId) &
                            Builders<Project>.Filter.Eq(x => x.IsDeleted, false);

        var projects = await _projects.Find(projectFilter).ToListAsync();
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

        // 3. Task Stats (Time-bound)
        var taskFilter = Builders<WorkTask>.Filter.Eq(x => x.CompanyId, companyId) &
                         Builders<WorkTask>.Filter.Eq(x => x.IsDeleted, false);

        if (start.HasValue)
            taskFilter &= Builders<WorkTask>.Filter.Gte(x => x.CreatedAt, start.Value);
        if (end.HasValue)
            taskFilter &= Builders<WorkTask>.Filter.Lte(x => x.CreatedAt, end.Value);

        var tasks = await _tasks.Find(taskFilter).ToListAsync();
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

        // 4. Member Stats (Snapshot)
        var memberFilter = Builders<ProjectMember>.Filter.Eq(x => x.CompanyId, companyId) &
                           Builders<ProjectMember>.Filter.Eq(x => x.IsDeleted, false);
        var members = await _members.Find(memberFilter).ToListAsync();
        stats.Member.TotalMembers = members.Select(m => m.UserId).Distinct().Count();
        foreach (var m in members)
        {
            var r = m.Role.ToString();
            if (!stats.Member.MembersByRole.ContainsKey(r)) stats.Member.MembersByRole[r] = 0;
            stats.Member.MembersByRole[r]++;
        }

        // 5. Milestone Stats (Time-bound by TargetDate)
        var milestoneFilter = Builders<Milestone>.Filter.Eq(x => x.CompanyId, companyId) &
                              Builders<Milestone>.Filter.Eq(x => x.IsDeleted, false);
        if (start.HasValue) milestoneFilter &= Builders<Milestone>.Filter.Gte(x => x.TargetDate, start.Value);
        if (end.HasValue) milestoneFilter &= Builders<Milestone>.Filter.Lte(x => x.TargetDate, end.Value);

        var milestones = await _milestones.Find(milestoneFilter).ToListAsync();
        stats.Milestone.TotalMilestones = milestones.Count;
        stats.Milestone.PendingMilestones = milestones.Count(m => m.Status == MilestoneStatus.Pending);
        stats.Milestone.AchievedMilestones = milestones.Count(m => m.Status == MilestoneStatus.Achieved);
        stats.Milestone.DelayedMilestones = milestones.Count(m => m.Status == MilestoneStatus.Delayed);

        return stats;
    }

    public async Task<string> GenerateAiReportAsync(string companyId, StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null, object? statisticsData = null)
    {
        try
        {
            object statsData;
            var periodDesc = period == StatisticsPeriod.Custom
                ? $"{startDate:yyyy-MM-dd} 至 {endDate:yyyy-MM-dd}"
                : period.ToString();

            if (statisticsData != null)
            {
                statsData = new
                {
                    Period = periodDesc,
                    Data = statisticsData
                };
            }
            else
            {
                // Fetch dashboard statistics if data not provided
                var dashboardStats = await GetDashboardStatisticsAsync(companyId, period, startDate, endDate);
                
                statsData = new
                {
                    Period = periodDesc,
                    Data = dashboardStats
                };
            }

            var statsJson = JsonSerializer.Serialize(statsData, new JsonSerializerOptions { WriteIndented = true });

            var systemPrompt = "你是一个专业的项目管理数据分析师。请根据提供的项目运营数据，通过 markdown 格式生成一份详细的项目管理分析报告。报告应重点关注项目进度、任务执行效率、资源分配及潜在风险。";
            var userPrompt = $@"请基于以下统计数据生成项目管理分析报告：

{statsJson}

报告要求：
1. **总体概览**：简要总结本周期项目整体运行状况（如项目总数、完成率、延期情况）。
2. **详细分析**：
   - **项目进度**：分析进行中与延期项目的比例，识别交付风险。
   - **任务执行**：关注任务完成率、逾期任务数量及优先级分布，评估团队执行力。
   - **资源负载**：分析成员角色分布及投入情况（如果有相应数据）。
   - **里程碑达成**：评估关键节点的达成情况。
3. **趋势与风险**：
   - 识别潜在的风险点（如高优先级任务积压、里程碑频繁延期）。
   - 分析数据背后的趋势。
4. **改进建议**：提出具体的管理改进建议（如资源调配、流程优化）。

请使用 Markdown 格式输出，并进行以下美化：
1. **使用 Emoji 图标**：增强可读性 (📊, 🚀, ⚠️, ✅)。
2. **使用表格**：展示关键数据对比。
3. **高亮关键数据**：使用 **加粗** 或 `代码块`。
4. **引用块**：展示核心洞察。

语气需专业、客观且具有建设性。";

            var model = string.IsNullOrWhiteSpace(_aiOptions.Model) ? "gpt-4o-mini" : _aiOptions.Model;
            var chatClient = openAiClient.GetChatClient(model);

            var messages = new List<OpenAI.Chat.ChatMessage>
            {
                new SystemChatMessage(systemPrompt),
                new UserChatMessage(userPrompt)
            };

            var options = new ChatCompletionOptions
            {
                Temperature = 0.7f,
                MaxOutputTokenCount = 2000
            };

            var completion = await chatClient.CompleteChatAsync(messages, options);
            return completion.Value.Content[0].Text;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "生成 AI 报告失败");
            return $"生成报告时发生错误：{ex.Message}。请联系管理员检查 AI 服务配置。";
        }
    }
}
