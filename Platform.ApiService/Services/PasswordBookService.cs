using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using System.Linq.Dynamic.Core;
using System.Security.Cryptography;
using System.Text;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码本服务实现
/// </summary>
public class PasswordBookService : IPasswordBookService
{
    private readonly DbContext _context;

    private readonly IEncryptionService _encryptionService;
    private readonly ILogger<PasswordBookService> _logger;

    /// <summary>
    /// 初始化密码本服务
    /// </summary>
    public PasswordBookService(DbContext context,
        IEncryptionService encryptionService,
        ILogger<PasswordBookService> logger
    )
    {
        _context = context;
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
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

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
            UserId = userId,
            IsPublic = request.IsPublic
        };

        await _context.Set<PasswordBookEntry>().AddAsync(entry);
        await _context.SaveChangesAsync();
        var result = entry;
        _logger.LogInformation("Password book entry created: {EntryId} for user {UserId}", result.Id, userId);
        return result;
    }

    /// <summary>
    /// 更新密码本条目
    /// </summary>
    public async Task<PasswordBookEntry?> UpdateEntryAsync(string id, UpdatePasswordBookEntryRequest request, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var entry = await _context.Set<PasswordBookEntry>().FirstOrDefaultAsync(x => x.Id == id);
        if (entry == null)
            return null;

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("无权更新此条目");

        string? encryptedPassword = null;
        if (!string.IsNullOrEmpty(request.Password))
        {
            encryptedPassword = await _encryptionService.EncryptAsync(request.Password, userId);
        }

        if (!string.IsNullOrEmpty(request.Platform))
            entry.Platform = request.Platform;
        if (!string.IsNullOrEmpty(request.Account))
            entry.Account = request.Account;
        if (!string.IsNullOrEmpty(encryptedPassword))
            entry.EncryptedPassword = encryptedPassword;
        if (request.Url != null)
            entry.Url = request.Url;

        entry.Category = string.IsNullOrWhiteSpace(request.Category) ? null : request.Category;

        if (request.Tags != null)
            entry.Tags = request.Tags;
        if (request.Notes != null)
            entry.Notes = request.Notes;
        if (request.IsPublic.HasValue)
            entry.IsPublic = request.IsPublic.Value;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Password book entry updated: {EntryId}", id);
        return entry;
    }

    /// <summary>
    /// 获取条目详情（包含解密后的密码）
    /// </summary>
    public async Task<PasswordBookEntryDetailDto?> GetEntryByIdAsync(string id, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var entry = await _context.Set<PasswordBookEntry>().FirstOrDefaultAsync(x => x.Id == id);
        if (entry == null)
            return null;

        if (entry.UserId != userId && !entry.IsPublic)
            throw new UnauthorizedAccessException("无权访问此条目");

        var password = await _encryptionService.DecryptAsync(entry.EncryptedPassword, entry.UserId);

        if (entry.UserId == userId)
        {
            entry.LastUsedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

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
            UpdatedAt = entry.UpdatedAt,
            IsPublic = entry.IsPublic
        };
    }

    /// <summary>
    /// 分页查询条目列表（不返回密码）
    /// 可见范围：自己的私有条目 + 企业内所有公有条目
    /// </summary>
    public async Task<System.Linq.Dynamic.Core.PagedResult<PasswordBookEntry>> GetEntriesAsync(
        Platform.ServiceDefaults.Models.PageParams pageParams,
        string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var query = _context.Set<PasswordBookEntry>()
            .Where(e => e.UserId == userId || e.IsPublic)
          ;

        return query.ToPagedList(pageParams);

    }

    /// <summary>
    /// 删除条目（软删除）
    /// </summary>
    public async Task<bool> DeleteEntryAsync(string id, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var entry = await _context.Set<PasswordBookEntry>().FirstOrDefaultAsync(x => x.Id == id);
        if (entry == null)
            return false;

        if (entry.UserId != userId)
            throw new UnauthorizedAccessException("无权删除此条目");

        _context.Set<PasswordBookEntry>().Remove(entry);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Password book entry deleted: {EntryId} by user {UserId}", id, userId);
        return true;
    }

    /// <summary>
    /// 获取所有分类
    /// </summary>
    public async Task<List<string>> GetCategoriesAsync()
    {
        var entries = await _context.Set<PasswordBookEntry>().ToListAsync();

        var categories = entries
            .Where(e => !string.IsNullOrEmpty(e.Category))
            .Select(e => e.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToList();

        return categories;
    }

    /// <summary>
    /// 获取所有标签
    /// </summary>
    public async Task<List<string>> GetTagsAsync()
    {
        var entries = await _context.Set<PasswordBookEntry>().ToListAsync();

        var tags = entries
            .Where(e => e.Tags != null && e.Tags.Any())
            .SelectMany(e => e.Tags)
            .Distinct()
            .OrderBy(t => t)
            .ToList();

        return tags;
    }

    /// <summary>
    /// 导出条目（解密后导出，仅导出自己创建的条目）
    /// </summary>
    public async Task<List<PasswordBookEntryDetailDto>> ExportEntriesAsync(ExportPasswordBookRequest request, string userId)
    {
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("用户ID不能为空", nameof(userId));

        var category = request.Category?.Trim();
        var tags = request.Tags;

        var entries = await _context.Set<PasswordBookEntry>().Where(e =>
            e.UserId == userId &&
            (string.IsNullOrEmpty(category) || e.Category == category) &&
            (tags == null || tags.Count == 0 || (e.Tags != null && e.Tags.Any(t => tags.Contains(t))))).ToListAsync();

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
                    UpdatedAt = entry.UpdatedAt,
                    IsPublic = entry.IsPublic
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to decrypt entry {EntryId} during export", entry.Id);
            }
        }

        return result;
    }

    /// <summary>
    /// 获取统计信息
    /// </summary>
    public async Task<PasswordBookStatistics> GetStatisticsAsync()
    {
        var entries = await _context.Set<PasswordBookEntry>().ToListAsync();

        var totalEntries = entries.Count;
        var categories = entries
            .Where(e => !string.IsNullOrEmpty(e.Category))
            .Select(e => e.Category!)
            .Distinct()
            .Count();

        var tags = entries
            .Where(e => e.Tags != null && e.Tags.Any())
            .SelectMany(e => e.Tags)
            .Distinct()
            .Count();

        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
        var recentUsedCount = entries
            .Count(e => e.LastUsedAt.HasValue && e.LastUsedAt.Value >= sevenDaysAgo);

        return new PasswordBookStatistics
        {
            TotalEntries = totalEntries,
            CategoryCount = categories,
            TagCount = tags,
            RecentUsedCount = recentUsedCount
        };
    }
}
