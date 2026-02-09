using Platform.ApiService.Models;
using System;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 项目统计服务接口
/// </summary>
public interface IProjectStatisticsService
{
    /// <summary>
    /// 获取项目仪表盘统计数据
    /// </summary>
    /// <param name="companyId">企业ID</param>
    /// <param name="period">统计周期</param>
    /// <param name="startDate">开始日期</param>
    /// <param name="endDate">结束日期</param>
    /// <returns>仪表盘统计数据</returns>
    Task<ProjectDashboardStatistics> GetDashboardStatisticsAsync(string companyId, StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null);

    /// <summary>
    /// 生成 AI 统计报告
    /// </summary>
    /// <param name="companyId">企业ID</param>
    /// <param name="period">统计周期</param>
    /// <param name="startDate">开始日期</param>
    /// <param name="endDate">结束日期</param>
    /// <param name="statisticsData">统计数据</param>
    /// <returns>Markdown 格式的报告</returns>
    Task<string> GenerateAiReportAsync(string companyId, StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null, object? statisticsData = null);
}
