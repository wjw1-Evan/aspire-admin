using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;

namespace Platform.AutoMigrate;

/// <summary>
/// 模型比较器 - 使用 EF Core IMigrationsModelDiffer 比较模型差异并生成迁移操作
/// </summary>
public class ModelDiffer
{
    private readonly IMigrationsModelDiffer _modelDiffer;
    private readonly AutoMigrateOptions _options;

    public ModelDiffer(IMigrationsModelDiffer modelDiffer, AutoMigrateOptions options)
    {
        _modelDiffer = modelDiffer ?? throw new ArgumentNullException(nameof(modelDiffer));
        _options = options ?? throw new ArgumentNullException(nameof(options));
    }

    /// <summary>
    /// 从 DbContext 内部服务提供者创建 ModelDiffer 实例
    /// </summary>
    public static ModelDiffer CreateFromDbContext(DbContext dbContext, AutoMigrateOptions options)
    {
        ArgumentNullException.ThrowIfNull(dbContext);
        ArgumentNullException.ThrowIfNull(options);

        var modelDiffer = dbContext.GetService<IMigrationsModelDiffer>();
        return new ModelDiffer(modelDiffer, options);
    }

    /// <summary>
    /// 比较源模型和目标模型之间的差异，生成迁移操作列表。
    /// sourceModel 为 null 时表示首次运行，将生成所有建表操作。
    /// </summary>
    public IReadOnlyList<MigrationOperation> GetDifferences(IModel? sourceModel, IModel targetModel)
    {
        ArgumentNullException.ThrowIfNull(targetModel);

        var sourceRelational = sourceModel?.GetRelationalModel();
        var targetRelational = targetModel.GetRelationalModel();

        var operations = _modelDiffer.GetDifferences(sourceRelational, targetRelational);

        if (!_options.AutomaticMigrationDataLossAllowed)
        {
            operations = FilterDestructiveOperations(operations);
        }

        return operations;
    }

    /// <summary>
    /// 检查两个模型之间是否存在差异
    /// </summary>
    public bool HasDifferences(IModel? sourceModel, IModel targetModel)
    {
        ArgumentNullException.ThrowIfNull(targetModel);

        var sourceRelational = sourceModel?.GetRelationalModel();
        var targetRelational = targetModel.GetRelationalModel();

        return _modelDiffer.HasDifferences(sourceRelational, targetRelational);
    }

    private IReadOnlyList<MigrationOperation> FilterDestructiveOperations(IReadOnlyList<MigrationOperation> operations)
    {
        var safeOperations = new List<MigrationOperation>(operations.Count);

        foreach (var operation in operations)
        {
            if (!IsDestructiveOperation(operation))
            {
                safeOperations.Add(operation);
            }
        }

        return safeOperations;
    }

    private static bool IsDestructiveOperation(MigrationOperation operation)
    {
        return operation switch
        {
            DropTableOperation => true,
            DropColumnOperation => true,
            AlterColumnOperation => true,
            RenameTableOperation => true,
            RenameColumnOperation => true,
            DropPrimaryKeyOperation => true,
            DropUniqueConstraintOperation => true,
            DropForeignKeyOperation => true,
            DropCheckConstraintOperation => true,
            DropIndexOperation => true,
            DropSequenceOperation => true,
            _ => false
        };
    }
}