using System.Linq.Dynamic.Core;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 数据看板服务接口
/// </summary>
public interface IDashboardService
{
    /// <summary>
    /// 创建看板
    /// </summary>
    Task<Dashboard> CreateDashboardAsync(CreateDashboardRequest request, string userId, string companyId);

    /// <summary>
    /// 获取看板详情
    /// </summary>
    Task<DashboardDto?> GetDashboardByIdAsync(string id, string userId);

    /// <summary>
    /// 分页查询看板列表
    /// </summary>
    Task<PagedResult<Dashboard>> GetDashboardsAsync(ProTableRequest request, string userId, string companyId);

    /// <summary>
    /// 更新看板
    /// </summary>
    Task<Dashboard?> UpdateDashboardAsync(string id, UpdateDashboardRequest request, string userId);

    /// <summary>
    /// 删除看板（软删除）
    /// </summary>
    Task<bool> DeleteDashboardAsync(string id, string userId);

    /// <summary>
    /// 复制看板
    /// </summary>
    Task<Dashboard?> CopyDashboardAsync(string id, string userId);

    /// <summary>
    /// 生成分享链接
    /// </summary>
    Task<string?> GenerateShareTokenAsync(string id, string userId);

    /// <summary>
    /// 通过分享令牌获取看板
    /// </summary>
    Task<DashboardDto?> GetDashboardByShareTokenAsync(string token);

    /// <summary>
    /// 添加卡片
    /// </summary>
    Task<DashboardCard> AddCardAsync(string dashboardId, CreateDashboardCardRequest request, string userId);

    /// <summary>
    /// 获取卡片详情
    /// </summary>
    Task<DashboardCard?> GetCardByIdAsync(string id, string userId);

    /// <summary>
    /// 更新卡片
    /// </summary>
    Task<DashboardCard?> UpdateCardAsync(string id, UpdateDashboardCardRequest request, string userId);

    /// <summary>
    /// 删除卡片
    /// </summary>
    Task<bool> DeleteCardAsync(string id, string userId);

    /// <summary>
    /// 批量调整卡片位置
    /// </summary>
    Task<bool> ReorderCardsAsync(string dashboardId, ReorderCardsRequest request, string userId);

    /// <summary>
    /// 获取卡片数据
    /// </summary>
    Task<CardDataResponse?> GetCardDataAsync(string cardId, string userId, string companyId);

    /// <summary>
    /// 刷新卡片数据
    /// </summary>
    Task<CardDataResponse?> RefreshCardDataAsync(string cardId, string userId, string companyId);

    /// <summary>
    /// 获取可用数据源列表
    /// </summary>
    Task<List<string>> GetAvailableDataSourcesAsync();

    /// <summary>
    /// 获取模块可用字段
    /// </summary>
    Task<List<string>> GetModuleFieldsAsync(string module);

    /// <summary>
    /// 获取统计信息
    /// </summary>
    Task<DashboardStatistics> GetStatisticsAsync(string userId, string companyId);
}
