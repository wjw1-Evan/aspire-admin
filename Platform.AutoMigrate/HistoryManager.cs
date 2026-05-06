using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage;

namespace Platform.AutoMigrate;

/// <summary>
/// 迁移历史管理器 - 使用 __EFMigrationsHistory 表（EF Core 标准）
/// </summary>
public class HistoryManager
{
    private readonly IDbContextOptions _contextOptions;
    private readonly IRelationalConnection _connection;
    private readonly IHistoryRepository _historyRepository;

    public HistoryManager(
        IDbContextOptions contextOptions,
        IRelationalConnection connection,
        IHistoryRepository historyRepository)
    {
        _contextOptions = contextOptions;
        _connection = connection;
        _historyRepository = historyRepository;
    }

    /// <summary>
    /// 确保迁移历史表存在
    /// </summary>
    public async Task EnsureHistoryTableExistsAsync(CancellationToken cancellationToken = default)
    {
        var exists = await _historyRepository.ExistsAsync(cancellationToken);
        if (!exists)
        {
            await _historyRepository.CreateAsync(cancellationToken);
        }
    }

    /// <summary>
    /// 获取最后一次迁移记录
    /// </summary>
    public async Task<HistoryRow?> GetLastMigrationAsync(CancellationToken cancellationToken = default)
    {
        var appliedMigrations = await _historyRepository.GetAppliedMigrationsAsync(cancellationToken);
        return appliedMigrations.LastOrDefault();
    }

    /// <summary>
    /// 检查是否有已应用的迁移记录
    /// </summary>
    public async Task<bool> HasAppliedMigrationsAsync(CancellationToken cancellationToken = default)
    {
        var appliedMigrations = await _historyRepository.GetAppliedMigrationsAsync(cancellationToken);
        return appliedMigrations.Count > 0;
    }
}