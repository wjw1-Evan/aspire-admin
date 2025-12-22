using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码本服务实现
/// </summary>
public class PasswordBookService : IPasswordBookService
{
    private readonly IDatabaseOperationFactory<PasswordBookEntry> _factory;
    private readonly IEncryptionService _encryptionService;
    private readonly ILogger<PasswordBookService> _logger;

    /// <summary>
    /// 初始化密码本服务
    /// </summary>
    /// <param name="factory">数据库操作工厂</param>
    /// <param name="encryptionService">加密服务</param>
    /// <param name="logger">日志记录器</param>
    public PasswordBookService(
        IDatabaseOperationFactory<PasswordBookEntry> factory,
        IEncryptionService encryptionService,
        ILogger<PasswordBookService> logger)
    {
        _factory = factory ?? throw new ArgumentNullException(nameof(factory));
        _encryptionService = encryptionService ?? throw new ArgumentNullException(nameof(encryptionService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 创建密码本条目
    /// </summary>
    public async Task<PasswordBookEntry> CreateEntryAsync(CreatePasswordBookEntryRequest request, string userId)
    {
        if (string.IsNullOrEmpty(request.Platform))
            throw new ArgumentException("平台名称不能为空", nameof(request));
        if (string.IsNullOrEmpty(request.Account))
            throw new ArgumentException("账号不能为空", nameof(request));
        if (string.IsNullOrEmpty(request.Password))
            throw new ArgumentException("密码不能为空", nameof(request));

        // 加密密码
        var encryptedPassword = await _encryptionService.EncryptAsync(request.Password, userId);

        var entry = new PasswordBookEntry
        {
            Platform = request.Platform,
            Account = request.Account,
            EncryptedPassword = encryptedPassword,
            Url = request.Url,
            Category = request.Category,
            Tags = request.Tags ?? new List<string>(),
            Notes = request.Notes,
            UserId = userId
        };

        var result = await _factory.CreateAsync(entry);
        _logger.LogInformation("Password book entry created: {EntryId} for user {UserId}", result.Id, userId);
        return result;
    }

    /// <summary>
    /// 更新密码本条目
    /// </summary>
    public async Task<PasswordBookEntry?> UpdateEntryAsync(string id, UpdatePasswordBookEntryRequest request, string userId)
    {
        var entry = await _factory.GetByIdAsync(id);
        if (entry == null)
            return null;

        // 验证用户权限（只能更新自己的条目）
        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("无权更新此条目");

        var updateBuilder = _factory.CreateUpdateBuilder();

        if (!string.IsNullOrEmpty(request.Platform))
            updateBuilder.Set(e => e.Platform, request.Platform);
        if (!string.IsNullOrEmpty(request.Account))
            updateBuilder.Set(e => e.Account, request.Account);
        if (!string.IsNullOrEmpty(request.Password))
        {
            // 加密新密码
            var encryptedPassword = await _encryptionService.EncryptAsync(request.Password, userId);
            updateBuilder.Set(e => e.EncryptedPassword, encryptedPassword);
        }
        if (request.Url != null)
            updateBuilder.Set(e => e.Url, request.Url);
        // 处理分类：始终更新分类字段（允许清空分类）
        // 空字符串或 null 视为清空分类（设置为 null）
        updateBuilder.Set(e => e.Category, string.IsNullOrWhiteSpace(request.Category) ? null : request.Category);
        if (request.Tags != null)
            updateBuilder.Set(e => e.Tags, request.Tags);
        if (request.Notes != null)
            updateBuilder.Set(e => e.Notes, request.Notes);

        if (updateBuilder.Count == 0)
            return entry;

        var filter = _factory.CreateFilterBuilder()
            .Equal(e => e.Id, id)
            .Build();

        var result = await _factory.FindOneAndUpdateAsync(filter, updateBuilder.Build());
        _logger.LogInformation("Password book entry updated: {EntryId}", id);
        return result;
    }

    /// <summary>
    /// 获取条目详情（包含解密后的密码）
    /// </summary>
    public async Task<PasswordBookEntryDetailDto?> GetEntryByIdAsync(string id, string userId)
    {
        var entry = await _factory.GetByIdAsync(id);
        if (entry == null)
            return null;

        // 验证用户权限
        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("无权访问此条目");

        // 解密密码
        var password = await _encryptionService.DecryptAsync(entry.EncryptedPassword, userId);

        // 更新最后使用时间
        var updateBuilder = _factory.CreateUpdateBuilder();
        updateBuilder.Set(e => e.LastUsedAt, DateTime.UtcNow);
        var filter = _factory.CreateFilterBuilder()
            .Equal(e => e.Id, id)
            .Build();
        await _factory.FindOneAndUpdateAsync(filter, updateBuilder.Build());

        return new PasswordBookEntryDetailDto
        {
            Id = entry.Id,
            Platform = entry.Platform,
            Account = entry.Account,
            Password = password,
            Url = entry.Url,
            Category = entry.Category,
            Tags = entry.Tags,
            Notes = entry.Notes,
            LastUsedAt = entry.LastUsedAt,
            CreatedAt = entry.CreatedAt,
            UpdatedAt = entry.UpdatedAt
        };
    }

    /// <summary>
    /// 分页查询条目列表（不返回密码）
    /// </summary>
    public async Task<(List<PasswordBookEntryDto> Items, long Total)> GetEntriesAsync(PasswordBookQueryRequest request)
    {
        var filterBuilder = _factory.CreateFilterBuilder();

        // 平台搜索
        if (!string.IsNullOrEmpty(request.Platform))
            filterBuilder = filterBuilder.Contains(e => e.Platform, request.Platform);

        // 账号搜索
        if (!string.IsNullOrEmpty(request.Account))
            filterBuilder = filterBuilder.Contains(e => e.Account, request.Account);

        // 分类筛选
        if (!string.IsNullOrEmpty(request.Category))
            filterBuilder = filterBuilder.Equal(e => e.Category, request.Category);

        // 标签筛选（使用 AnyIn 匹配数组中的任意元素）
        if (request.Tags != null && request.Tags.Any())
        {
            filterBuilder = filterBuilder.Custom(
                Builders<PasswordBookEntry>.Filter.AnyIn(e => e.Tags, request.Tags)
            );
        }

        // 关键词搜索（平台、账号、备注）
        if (!string.IsNullOrEmpty(request.Keyword))
        {
            var keyword = request.Keyword;
            var regex = new MongoDB.Bson.BsonRegularExpression(keyword, "i");
            
            // 🔧 修复：MongoDB LINQ 不支持空合并运算符 ??，需要分别处理 Notes 字段可能为 null 的情况
            var keywordFilters = new List<FilterDefinition<PasswordBookEntry>>
            {
                Builders<PasswordBookEntry>.Filter.Regex(e => e.Platform, regex),
                Builders<PasswordBookEntry>.Filter.Regex(e => e.Account, regex)
            };
            
            // 对于 Notes 字段，只有当它不为 null 时才进行正则匹配
            // 如果 Notes 为 null，它不会包含任何关键词，所以不需要匹配
            var notesFilter = Builders<PasswordBookEntry>.Filter.And(
                Builders<PasswordBookEntry>.Filter.Ne(e => e.Notes, null),
                Builders<PasswordBookEntry>.Filter.Regex(e => e.Notes!, regex)
            );
            keywordFilters.Add(notesFilter);
            
            filterBuilder = filterBuilder.Custom(
                Builders<PasswordBookEntry>.Filter.Or(keywordFilters)
            );
        }

        var filter = filterBuilder.Build();
        var sort = _factory.CreateSortBuilder()
            .Descending(e => e.LastUsedAt)
            .Descending(e => e.CreatedAt)
            .Build();

        var (items, total) = await _factory.FindPagedAsync(filter, sort, request.Current, request.PageSize);

        var dtos = items.Select(e => new PasswordBookEntryDto
        {
            Id = e.Id,
            Platform = e.Platform,
            Account = e.Account,
            Url = e.Url,
            Category = e.Category,
            Tags = e.Tags,
            Notes = e.Notes,
            LastUsedAt = e.LastUsedAt,
            CreatedAt = e.CreatedAt,
            UpdatedAt = e.UpdatedAt
        }).ToList();

        return (dtos, total);
    }

    /// <summary>
    /// 删除条目（软删除）
    /// </summary>
    public async Task<bool> DeleteEntryAsync(string id, string userId)
    {
        var entry = await _factory.GetByIdAsync(id);
        if (entry == null)
            return false;

        // 🔒 安全修复：验证用户权限（只能删除自己的条目）
        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("无权删除此条目");

        var filter = _factory.CreateFilterBuilder()
            .Equal(e => e.Id, id)
            .Build();

        var result = await _factory.FindOneAndSoftDeleteAsync(filter);
        if (result != null)
        {
            _logger.LogInformation("Password book entry deleted: {EntryId} by user {UserId}", id, userId);
        }
        return result != null;
    }

    /// <summary>
    /// 获取所有分类
    /// </summary>
    public async Task<List<string>> GetCategoriesAsync()
    {
        var filter = _factory.CreateFilterBuilder().Build();
        var entries = await _factory.FindAsync(filter);

        var categories = entries
            .Where(e => !string.IsNullOrEmpty(e.Category))
            .Select(e => e.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToList();

        return categories;
    }

    /// <summary>
    /// 导出条目（解密后导出）
    /// </summary>
    public async Task<List<PasswordBookEntryDetailDto>> ExportEntriesAsync(ExportPasswordBookRequest request, string userId)
    {
        var filterBuilder = _factory.CreateFilterBuilder();

        // 分类筛选
        if (!string.IsNullOrEmpty(request.Category))
            filterBuilder = filterBuilder.Equal(e => e.Category, request.Category);

        // 标签筛选（使用 AnyIn 匹配数组中的任意元素）
        if (request.Tags != null && request.Tags.Any())
        {
            filterBuilder = filterBuilder.Custom(
                Builders<PasswordBookEntry>.Filter.AnyIn(e => e.Tags, request.Tags)
            );
        }

        var filter = filterBuilder.Build();
        var entries = await _factory.FindAsync(filter);

        // 只导出当前用户的条目
        entries = entries.Where(e => e.UserId == userId).ToList();

        var result = new List<PasswordBookEntryDetailDto>();
        foreach (var entry in entries)
        {
            try
            {
                var password = await _encryptionService.DecryptAsync(entry.EncryptedPassword, userId);
                result.Add(new PasswordBookEntryDetailDto
                {
                    Id = entry.Id,
                    Platform = entry.Platform,
                    Account = entry.Account,
                    Password = password,
                    Url = entry.Url,
                    Category = entry.Category,
                    Tags = entry.Tags,
                    Notes = entry.Notes,
                    LastUsedAt = entry.LastUsedAt,
                    CreatedAt = entry.CreatedAt,
                    UpdatedAt = entry.UpdatedAt
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to decrypt entry {EntryId} during export", entry.Id);
                // 跳过无法解密的条目
            }
        }

        return result;
    }

    /// <summary>
    /// 获取统计信息
    /// </summary>
    public async Task<PasswordBookStatistics> GetStatisticsAsync()
    {
        var filter = _factory.CreateFilterBuilder().Build();
        var entries = await _factory.FindAsync(filter);

        var totalEntries = entries.Count;
        var categories = entries
            .Where(e => !string.IsNullOrEmpty(e.Category))
            .Select(e => e.Category!)
            .Distinct()
            .Count();

        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
        var recentUsedCount = entries
            .Count(e => e.LastUsedAt.HasValue && e.LastUsedAt.Value >= sevenDaysAgo);

        return new PasswordBookStatistics
        {
            TotalEntries = totalEntries,
            CategoryCount = categories,
            RecentUsedCount = recentUsedCount
        };
    }
}
