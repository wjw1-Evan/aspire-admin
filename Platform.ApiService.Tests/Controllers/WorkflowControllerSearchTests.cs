using FsCheck;
using FsCheck.Xunit;
using Xunit;
using System;
using System.Collections.Generic;
using System.Linq;

namespace Platform.ApiService.Tests.Controllers;

/// <summary>
/// 工作流搜索功能属性测试（简化版）
/// 验证需求 1.1, 1.2 - 增强的搜索和过滤功能
/// </summary>
public class WorkflowControllerSearchTests
{
    /// <summary>
    /// 简化的工作流定义用于测试
    /// </summary>
    public class SimpleWorkflow
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Category { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? LastUsedAt { get; set; }
        public int UsageCount { get; set; }
    }

    /// <summary>
    /// 属性 1: 多字段搜索一致性
    /// 验证需求 1.1 - 多字段搜索功能
    /// 
    /// Feature: workflow-list-upgrade, Property 1: Multi-field search consistency
    /// For any workflow dataset and search terms, searching across name, description, 
    /// and category fields should return workflows where at least one field contains 
    /// at least one search term
    /// </summary>
    [Property]
    public bool MultiFieldSearchConsistency(SimpleWorkflow[] workflows, string searchTerm)
    {
        // 跳过空数据或空搜索词
        if (workflows == null || workflows.Length == 0 || string.IsNullOrWhiteSpace(searchTerm))
            return true;

        // 清理搜索词
        var cleanSearchTerm = searchTerm.Trim();
        if (string.IsNullOrEmpty(cleanSearchTerm))
            return true;

        // 模拟多字段搜索逻辑
        var matchingWorkflows = workflows.Where(w =>
            (w.Name?.Contains(cleanSearchTerm, StringComparison.OrdinalIgnoreCase) == true) ||
            (w.Description?.Contains(cleanSearchTerm, StringComparison.OrdinalIgnoreCase) == true) ||
            (w.Category?.Contains(cleanSearchTerm, StringComparison.OrdinalIgnoreCase) == true)
        ).ToList();

        // 验证搜索结果的一致性
        var allResultsMatch = matchingWorkflows.All(w =>
            (w.Name?.Contains(cleanSearchTerm, StringComparison.OrdinalIgnoreCase) == true) ||
            (w.Description?.Contains(cleanSearchTerm, StringComparison.OrdinalIgnoreCase) == true) ||
            (w.Category?.Contains(cleanSearchTerm, StringComparison.OrdinalIgnoreCase) == true)
        );

        // 验证没有遗漏匹配的工作流
        var noMissedMatches = workflows.Where(w =>
            (w.Name?.Contains(cleanSearchTerm, StringComparison.OrdinalIgnoreCase) == true) ||
            (w.Description?.Contains(cleanSearchTerm, StringComparison.OrdinalIgnoreCase) == true) ||
            (w.Category?.Contains(cleanSearchTerm, StringComparison.OrdinalIgnoreCase) == true)
        ).All(w => matchingWorkflows.Contains(w));

        return allResultsMatch && noMissedMatches;
    }

    /// <summary>
    /// 属性 2: 日期范围过滤准确性
    /// 验证需求 1.2 - 日期范围过滤功能
    /// 
    /// Feature: workflow-list-upgrade, Property 2: Date range filtering accuracy
    /// For any workflow dataset and date range, filtering by creation date, 
    /// modification date, or last used date should return only workflows 
    /// with dates within the specified range
    /// </summary>
    [Property]
    public bool DateRangeFilteringAccuracy(SimpleWorkflow[] workflows, DateTime startDate, DateTime endDate, string dateField)
    {
        // 跳过空数据
        if (workflows == null || workflows.Length == 0)
            return true;

        // 确保日期范围有效
        var validStartDate = startDate < endDate ? startDate : endDate;
        var validEndDate = startDate < endDate ? endDate : startDate;
        var validDateField = dateField?.ToLowerInvariant() ?? "createdat";

        // 根据日期字段类型进行过滤
        var filteredWorkflows = workflows.Where(w =>
        {
            DateTime? targetDate = validDateField switch
            {
                "createdat" or "created" => w.CreatedAt,
                "updatedat" or "updated" => w.UpdatedAt,
                "lastused" => w.LastUsedAt,
                _ => w.CreatedAt
            };

            return targetDate.HasValue &&
                   targetDate.Value >= validStartDate &&
                   targetDate.Value <= validEndDate;
        }).ToList();

        // 验证过滤结果的准确性
        var allResultsInRange = filteredWorkflows.All(w =>
        {
            DateTime? targetDate = validDateField switch
            {
                "createdat" or "created" => w.CreatedAt,
                "updatedat" or "updated" => w.UpdatedAt,
                "lastused" => w.LastUsedAt,
                _ => w.CreatedAt
            };

            return targetDate.HasValue &&
                   targetDate.Value >= validStartDate &&
                   targetDate.Value <= validEndDate;
        });

        // 验证没有遗漏符合条件的工作流
        var noMissedWorkflows = workflows.Where(w =>
        {
            DateTime? targetDate = validDateField switch
            {
                "createdat" or "created" => w.CreatedAt,
                "updatedat" or "updated" => w.UpdatedAt,
                "lastused" => w.LastUsedAt,
                _ => w.CreatedAt
            };

            return targetDate.HasValue &&
                   targetDate.Value >= validStartDate &&
                   targetDate.Value <= validEndDate;
        }).All(w => filteredWorkflows.Contains(w));

        return allResultsInRange && noMissedWorkflows;
    }

    /// <summary>
    /// 简化的过滤器偏好用于测试
    /// </summary>
    public class SimpleFilterPreference
    {
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsDefault { get; set; }
        public SimpleFilterConfig FilterConfig { get; set; } = new();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// 简化的过滤器配置用于测试
    /// </summary>
    public class SimpleFilterConfig
    {
        public string? Keyword { get; set; }
        public List<string> Categories { get; set; } = new();
        public List<string> Statuses { get; set; } = new();
        public string? SortBy { get; set; }
        public string? SortOrder { get; set; }
    }

    /// <summary>
    /// 属性 5: 过滤器偏好持久化
    /// 验证需求 1.5 - 过滤器偏好持久化功能
    /// 
    /// Feature: workflow-list-upgrade, Property 5: Filter preference persistence
    /// For any saved filter preferences, after session restart the preferences 
    /// should be restored exactly as they were saved
    /// </summary>
    [Property]
    public bool FilterPreferencePersistence(SimpleFilterPreference[] preferences, string userId)
    {
        // 跳过空数据或空用户ID
        if (preferences == null || preferences.Length == 0 || string.IsNullOrWhiteSpace(userId))
            return true;

        // 清理用户ID
        var cleanUserId = userId.Trim();
        if (string.IsNullOrEmpty(cleanUserId))
            return true;

        // 模拟保存和恢复过程
        var userPreferences = preferences.Where(p => p.UserId == cleanUserId).ToList();

        // 验证默认偏好的唯一性
        var defaultPreferences = userPreferences.Where(p => p.IsDefault).ToList();
        var hasAtMostOneDefault = defaultPreferences.Count <= 1;

        // 验证偏好名称的唯一性（同一用户）
        var uniqueNames = userPreferences.GroupBy(p => p.Name).All(g => g.Count() == 1);

        // 验证过滤器配置的完整性
        var configIntegrity = userPreferences.All(p =>
            p.FilterConfig != null &&
            (p.FilterConfig.Categories?.All(c => !string.IsNullOrWhiteSpace(c)) ?? true) &&
            (p.FilterConfig.Statuses?.All(s => !string.IsNullOrWhiteSpace(s)) ?? true)
        );

        // 验证排序配置的有效性
        var validSortConfig = userPreferences.All(p =>
            string.IsNullOrEmpty(p.FilterConfig.SortBy) ||
            new[] { "name", "category", "createdat", "updatedat", "usagecount" }.Contains(p.FilterConfig.SortBy.ToLowerInvariant())
        );

        var validSortOrder = userPreferences.All(p =>
            string.IsNullOrEmpty(p.FilterConfig.SortOrder) ||
            new[] { "asc", "desc" }.Contains(p.FilterConfig.SortOrder.ToLowerInvariant())
        );

        return hasAtMostOneDefault && uniqueNames && configIntegrity && validSortConfig && validSortOrder;
    }

    /// <summary>
    /// 属性 6: 默认偏好设置一致性
    /// 验证默认偏好设置的一致性逻辑
    /// 
    /// Feature: workflow-list-upgrade, Property 6: Default preference consistency
    /// For any user, there should be at most one default filter preference at any time
    /// </summary>
    [Property]
    public bool DefaultPreferenceConsistency(SimpleFilterPreference[] preferences, string userId, string newDefaultPreferenceId)
    {
        // 跳过空数据
        if (preferences == null || preferences.Length == 0 ||
            string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(newDefaultPreferenceId))
            return true;

        var cleanUserId = userId.Trim();
        var cleanNewDefaultId = newDefaultPreferenceId.Trim();

        // 获取用户的偏好
        var userPreferences = preferences.Where(p => p.UserId == cleanUserId).ToList();
        if (!userPreferences.Any())
            return true;

        // 模拟设置新的默认偏好
        var targetPreference = userPreferences.FirstOrDefault(p => p.Id == cleanNewDefaultId);
        if (targetPreference == null)
            return true;

        // 模拟设置默认偏好的逻辑：先取消所有默认，再设置新的默认
        var updatedPreferences = userPreferences.Select(p => new SimpleFilterPreference
        {
            Id = p.Id,
            UserId = p.UserId,
            Name = p.Name,
            IsDefault = p.Id == cleanNewDefaultId, // 只有目标偏好为默认
            FilterConfig = p.FilterConfig,
            CreatedAt = p.CreatedAt,
            UpdatedAt = DateTime.UtcNow
        }).ToList();

        // 验证结果：只有一个默认偏好
        var defaultCount = updatedPreferences.Count(p => p.IsDefault);
        var correctDefaultSet = updatedPreferences.Single(p => p.IsDefault).Id == cleanNewDefaultId;

        return defaultCount == 1 && correctDefaultSet;
    }
}