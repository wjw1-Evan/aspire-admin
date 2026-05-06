using System;

namespace Platform.AutoMigrate;

/// <summary>
/// 自动迁移工具的配置选项
/// </summary>
public class AutoMigrateOptions
{
    /// <summary>
    /// 允许数据丢失的操作（如删除列、删除表）
    /// 默认：false（禁止危险操作）
    /// </summary>
    public bool AutomaticMigrationDataLossAllowed { get; set; } = false;

    /// <summary>
    /// 重置数据库 Schema（危险！开发环境用）
    /// 会删除所有表并重新创建
    /// 默认：false
    /// </summary>
    public bool ResetDatabaseSchema { get; set; } = false;

    /// <summary>
    /// 只更新模型快照，不执行迁移（预览模式）
    /// 默认：false
    /// </summary>
    public bool UpdateSnapshotOnly { get; set; } = false;

    /// <summary>
    /// 要跳过的实体类型（如视图、只读实体）
    /// </summary>
    public List<Type>? ExcludedEntityTypes { get; set; }

    /// <summary>
    /// 迁移超时时间（毫秒）
    /// 默认：30000（30秒）
    /// </summary>
    public int CommandTimeout { get; set; } = 30000;

    /// <summary>
    /// 是否启用详细日志（记录生成的 SQL）
    /// 默认：false
    /// </summary>
    public bool EnableVerboseLogging { get; set; } = false;
}
