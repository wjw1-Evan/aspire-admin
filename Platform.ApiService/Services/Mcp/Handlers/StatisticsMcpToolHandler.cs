using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 统计 MCP 工具处理器（项目、园区、工作流统计）
/// </summary>
public class StatisticsMcpToolHandler : McpToolHandlerBase
{
    private readonly IProjectStatisticsService _projectStatisticsService;
    private readonly IParkStatisticsService _parkStatisticsService;
    private readonly IWorkflowAnalyticsService _workflowAnalyticsService;
    private readonly ILogger<StatisticsMcpToolHandler> _logger;

    public StatisticsMcpToolHandler(
        IProjectStatisticsService projectStatisticsService,
        IParkStatisticsService parkStatisticsService,
        IWorkflowAnalyticsService workflowAnalyticsService,
        ILogger<StatisticsMcpToolHandler> logger)
    {
        _projectStatisticsService = projectStatisticsService;
        _parkStatisticsService = parkStatisticsService;
        _workflowAnalyticsService = workflowAnalyticsService;
        _logger = logger;

        RegisterTool("get_project_dashboard", "获取项目仪表盘统计数据。关键词：项目统计,项目概览,仪表盘",
            ObjectSchema(new Dictionary<string, object>
            {
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期 ISO 格式" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 ISO 格式" }
            }),
            async (args, uid) =>
            {
                var startDate = DateTime.TryParse(args.GetValueOrDefault("startDate")?.ToString(), out var sd) ? sd : (DateTime?)null;
                var endDate = DateTime.TryParse(args.GetValueOrDefault("endDate")?.ToString(), out var ed) ? ed : (DateTime?)null;
                return await _projectStatisticsService.GetDashboardStatisticsAsync(startDate, endDate);
            });

        RegisterTool("generate_project_ai_report", "生成项目统计 AI 报告。关键词：项目报告,AI 统计报告",
            ObjectSchema(new Dictionary<string, object>
            {
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期 ISO 格式" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 ISO 格式" }
            }),
            async (args, uid) =>
            {
                var startDate = DateTime.TryParse(args.GetValueOrDefault("startDate")?.ToString(), out var sd) ? sd : (DateTime?)null;
                var endDate = DateTime.TryParse(args.GetValueOrDefault("endDate")?.ToString(), out var ed) ? ed : (DateTime?)null;
                var report = await _projectStatisticsService.GenerateAiReportAsync(startDate, endDate);
                return new { report };
            });

        RegisterTool("generate_park_ai_report", "生成园区统计 AI 报告。关键词：园区报告,园区统计",
            ObjectSchema(new Dictionary<string, object>
            {
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期 ISO 格式" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 ISO 格式" }
            }),
            async (args, uid) =>
            {
                var startDate = DateTime.TryParse(args.GetValueOrDefault("startDate")?.ToString(), out var sd) ? sd : (DateTime?)null;
                var endDate = DateTime.TryParse(args.GetValueOrDefault("endDate")?.ToString(), out var ed) ? ed : (DateTime?)null;
                var report = await _parkStatisticsService.GenerateAiReportAsync(startDate, endDate);
                return new { report };
            });

        RegisterTool("get_workflow_analytics", "获取工作流分析数据。关键词：工作流分析,流程统计",
            ObjectSchema(new Dictionary<string, object> { ["workflowId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["workflowId"]),
            async (args, uid) =>
            {
                var workflowId = args.GetValueOrDefault("workflowId")?.ToString();
                if (string.IsNullOrEmpty(workflowId)) return new { error = "workflowId 必填" };
                return await _workflowAnalyticsService.GetAnalyticsAsync(workflowId);
            });

        RegisterTool("get_workflow_performance_score", "计算工作流性能评分。关键词：性能评分,流程效率",
            ObjectSchema(new Dictionary<string, object> { ["workflowId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["workflowId"]),
            async (args, uid) =>
            {
                var workflowId = args.GetValueOrDefault("workflowId")?.ToString();
                if (string.IsNullOrEmpty(workflowId)) return new { error = "workflowId 必填" };
                var score = await _workflowAnalyticsService.CalculatePerformanceScoreAsync(workflowId);
                return new { workflowId, score };
            });

        RegisterTool("detect_workflow_issues", "检测工作流性能问题。关键词：性能问题,流程异常",
            ObjectSchema(new Dictionary<string, object> { ["workflowId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["workflowId"]),
            async (args, uid) =>
            {
                var workflowId = args.GetValueOrDefault("workflowId")?.ToString();
                if (string.IsNullOrEmpty(workflowId)) return new { error = "workflowId 必填" };
                return await _workflowAnalyticsService.DetectPerformanceIssuesAsync(workflowId);
            });
    }
}