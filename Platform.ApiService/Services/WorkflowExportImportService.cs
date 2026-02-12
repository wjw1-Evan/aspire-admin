using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System.Linq.Expressions;
using System.Text.Json;

namespace Platform.ApiService.Services;

/// <summary>
/// 工作流导出导入服务实现
/// </summary>
public class WorkflowExportImportService : IWorkflowExportImportService
{
    private readonly IDataFactory<WorkflowDefinition> _workflowFactory;
    private readonly IDataFactory<FormDefinition> _formFactory;
    private readonly ILogger<WorkflowExportImportService> _logger;

    /// <summary>
    /// 初始化工作流导出导入服务
    /// </summary>
    /// <param name="workflowFactory">工作流定义数据工厂</param>
    /// <param name="formFactory">表单定义数据工厂</param>
    /// <param name="logger">日志记录器</param>
    public WorkflowExportImportService(
        IDataFactory<WorkflowDefinition> workflowFactory,
        IDataFactory<FormDefinition> formFactory,
        ILogger<WorkflowExportImportService> logger)
    {
        _workflowFactory = workflowFactory;
        _formFactory = formFactory;
        _logger = logger;
    }

    /// <summary>
    /// 导出工作流
    /// </summary>
    public async Task<byte[]> ExportWorkflowsAsync(List<string> workflowIds, WorkflowExportConfig config)
    {
        try
        {
            _logger.LogInformation("开始导出工作流: WorkflowCount={WorkflowCount}, Format={Format}",
                workflowIds.Count, config.Format);

            // 获取工作流定义
            var workflows = await _workflowFactory.FindAsync(w => workflowIds.Contains(w.Id));

            if (workflows.Count == 0)
            {
                throw new InvalidOperationException("未找到可导出的工作流");
            }

            // 构建导出数据
            var exportData = new WorkflowExportData
            {
                ExportedAt = DateTime.UtcNow,
                ExportedBy = _workflowFactory.GetRequiredUserId(),
                Config = config,
                Workflows = new List<WorkflowExportItem>()
            };

            foreach (var workflow in workflows)
            {
                var exportItem = new WorkflowExportItem
                {
                    Id = workflow.Id,
                    Name = workflow.Name,
                    Description = workflow.Description,
                    Category = workflow.Category,
                    Version = workflow.Version,
                    Graph = workflow.Graph,
                    IsActive = workflow.IsActive,
                    CreatedAt = workflow.CreatedAt,
                    UpdatedAt = workflow.UpdatedAt,
                    CreatedBy = workflow.CreatedBy,
                    CreatedByUsername = workflow.CreatedByUsername
                };

                // 包含分析数据
                if (config.IncludeAnalytics)
                {
                    exportItem.Analytics = workflow.Analytics;
                }

                // 包含依赖项（表单定义等）
                if (config.IncludeDependencies)
                {
                    exportItem.Dependencies = await GetWorkflowDependenciesAsync(workflow);
                }

                exportData.Workflows.Add(exportItem);
            }

            // 根据格式生成导出文件
            return config.Format switch
            {
                ExportFormat.Json => GenerateJsonExport(exportData),
                ExportFormat.Excel => GenerateExcelExport(exportData),
                ExportFormat.Csv => GenerateCsvExport(exportData),
                _ => throw new NotSupportedException($"不支持的导出格式: {config.Format}")
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "导出工作流失败: WorkflowIds={WorkflowIds}", string.Join(",", workflowIds));
            throw;
        }
    }

    /// <summary>
    /// 导出过滤结果
    /// </summary>
    public async Task<byte[]> ExportFilteredWorkflowsAsync(Dictionary<string, object> filters, WorkflowExportConfig config)
    {
        try
        {
            _logger.LogInformation("开始导出过滤结果: FilterCount={FilterCount}, Format={Format}",
                filters.Count, config.Format);

            var filter = BuildFilterExpression(filters);
            var workflows = await _workflowFactory.FindAsync(filter);

            if (workflows.Count == 0)
            {
                throw new InvalidOperationException("未找到符合条件的工作流");
            }

            var workflowIds = workflows.Select(w => w.Id).ToList();
            return await ExportWorkflowsAsync(workflowIds, config);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "导出过滤结果失败: Filters={Filters}", JsonSerializer.Serialize(filters));
            throw;
        }
    }

    private static Expression<Func<WorkflowDefinition, bool>> BuildFilterExpression(Dictionary<string, object> filters)
    {
        var keyword = filters.TryGetValue("keyword", out var k) && k is string kw ? kw.ToLowerInvariant() : null;
        var categories = filters.TryGetValue("categories", out var c) && c is List<string> cl ? cl : null;
        var isActive = filters.TryGetValue("isactive", out var a) && a is bool ab ? (bool?)ab : null;

        DateTime? startDate = null;
        DateTime? endDate = null;
        if (filters.TryGetValue("createdat", out var dr) && dr is Dictionary<string, object> dateRange)
        {
            if (dateRange.TryGetValue("start", out var s) && s is DateTime sd) startDate = sd;
            if (dateRange.TryGetValue("end", out var e) && e is DateTime ed) endDate = ed;
        }

        return w =>
            (keyword == null || w.Name.ToLower().Contains(keyword)) &&
            (categories == null || categories.Contains(w.Category)) &&
            (isActive == null || w.IsActive == isActive.Value) &&
            (startDate == null || w.CreatedAt >= startDate.Value) &&
            (endDate == null || w.CreatedAt <= endDate.Value);
    }

    /// <summary>
    /// 验证导入文件
    /// </summary>
    public async Task<WorkflowImportResult> ValidateImportFileAsync(byte[] fileContent, string fileName)
    {
        try
        {
            _logger.LogInformation("开始验证导入文件: FileName={FileName}, Size={Size}", fileName, fileContent.Length);

            var result = new WorkflowImportResult();

            // 解析文件内容
            var importData = ParseImportFile(fileContent, fileName);
            if (importData == null)
            {
                result.Errors.Add(new ImportError
                {
                    ErrorMessage = "无法解析导入文件",
                    ErrorDetails = "文件格式不正确或已损坏"
                });
                return result;
            }

            // 验证每个工作流
            foreach (var workflow in importData.Workflows)
            {
                await ValidateWorkflowForImportAsync(workflow, result);
            }

            _logger.LogInformation("导入文件验证完成: FileName={FileName}, Conflicts={ConflictCount}, Errors={ErrorCount}",
                fileName, result.Conflicts.Count, result.Errors.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "验证导入文件失败: FileName={FileName}", fileName);
            throw;
        }
    }

    /// <summary>
    /// 导入工作流
    /// </summary>
    public async Task<WorkflowImportResult> ImportWorkflowsAsync(byte[] fileContent, string fileName, bool overwriteExisting = false)
    {
        try
        {
            _logger.LogInformation("开始导入工作流: FileName={FileName}, OverwriteExisting={OverwriteExisting}",
                fileName, overwriteExisting);

            var result = new WorkflowImportResult();

            // 先验证文件
            var validationResult = await ValidateImportFileAsync(fileContent, fileName);
            if (validationResult.Errors.Count > 0)
            {
                return validationResult;
            }

            // 解析文件内容
            var importData = ParseImportFile(fileContent, fileName);
            if (importData == null)
            {
                result.Errors.Add(new ImportError
                {
                    ErrorMessage = "无法解析导入文件"
                });
                return result;
            }

            var userId = _workflowFactory.GetRequiredUserId();
            var companyId = await _workflowFactory.GetRequiredCompanyIdAsync();

            // 导入每个工作流
            foreach (var workflowItem in importData.Workflows)
            {
                try
                {
                    await ImportSingleWorkflowAsync(workflowItem, result, overwriteExisting, userId, companyId);
                }
                catch (Exception ex)
                {
                    result.FailedCount++;
                    result.Errors.Add(new ImportError
                    {
                        WorkflowName = workflowItem.Name,
                        ErrorMessage = ex.Message,
                        ErrorDetails = ex.StackTrace
                    });
                    _logger.LogError(ex, "导入单个工作流失败: WorkflowName={WorkflowName}", workflowItem.Name);
                }
            }

            _logger.LogInformation("工作流导入完成: FileName={FileName}, Imported={ImportedCount}, Failed={FailedCount}",
                fileName, result.ImportedCount, result.FailedCount);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "导入工作流失败: FileName={FileName}", fileName);
            throw;
        }
    }

    /// <summary>
    /// 预览导入
    /// </summary>
    public async Task<WorkflowImportResult> PreviewImportAsync(byte[] fileContent, string fileName)
    {
        // 预览导入实际上就是验证导入文件，不执行实际导入操作
        return await ValidateImportFileAsync(fileContent, fileName);
    }

    /// <summary>
    /// 解决导入冲突
    /// </summary>
    public async Task<WorkflowImportResult> ResolveImportConflictsAsync(byte[] fileContent, string fileName, Dictionary<string, string> resolutions)
    {
        try
        {
            _logger.LogInformation("开始解决导入冲突: FileName={FileName}, ResolutionCount={ResolutionCount}",
                fileName, resolutions.Count);

            var result = new WorkflowImportResult();

            // 解析文件内容
            var importData = ParseImportFile(fileContent, fileName);
            if (importData == null)
            {
                result.Errors.Add(new ImportError
                {
                    ErrorMessage = "无法解析导入文件"
                });
                return result;
            }

            var userId = _workflowFactory.GetRequiredUserId();
            var companyId = await _workflowFactory.GetRequiredCompanyIdAsync();

            // 根据解决方案处理每个工作流
            foreach (var workflowItem in importData.Workflows)
            {
                try
                {
                    if (resolutions.TryGetValue(workflowItem.Name, out var resolution))
                    {
                        await ResolveWorkflowConflictAsync(workflowItem, resolution, result, userId, companyId);
                    }
                    else
                    {
                        // 没有解决方案的跳过
                        result.SkippedCount++;
                    }
                }
                catch (Exception ex)
                {
                    result.FailedCount++;
                    result.Errors.Add(new ImportError
                    {
                        WorkflowName = workflowItem.Name,
                        ErrorMessage = ex.Message
                    });
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "解决导入冲突失败: FileName={FileName}", fileName);
            throw;
        }
    }

    #region 私有方法

    /// <summary>
    /// 获取工作流依赖项
    /// </summary>
    private async Task<List<WorkflowDependency>> GetWorkflowDependenciesAsync(WorkflowDefinition workflow)
    {
        var dependencies = new List<WorkflowDependency>();

        // 收集表单依赖项
        var formIds = new HashSet<string>();
        foreach (var node in workflow.Graph.Nodes)
        {
            if (node.Config.Form?.FormDefinitionId != null)
            {
                formIds.Add(node.Config.Form.FormDefinitionId);
            }
        }

        if (formIds.Count > 0)
        {
            var forms = await _formFactory.FindAsync(f => formIds.Contains(f.Id) && f.IsDeleted != true);
            foreach (var form in forms)
            {
                dependencies.Add(new WorkflowDependency
                {
                    Type = "form",
                    Id = form.Id,
                    Name = form.Name,
                    Data = form
                });
            }
        }

        return dependencies;
    }

    /// <summary>
    /// 生成JSON导出
    /// </summary>
    private static byte[] GenerateJsonExport(WorkflowExportData exportData)
    {
        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        var json = JsonSerializer.Serialize(exportData, options);
        return System.Text.Encoding.UTF8.GetBytes(json);
    }

    /// <summary>
    /// 生成Excel导出
    /// </summary>
    private static byte[] GenerateExcelExport(WorkflowExportData exportData)
    {
        // 简化实现：转换为CSV格式
        // 在实际项目中，可以使用EPPlus或其他Excel库
        return GenerateCsvExport(exportData);
    }

    /// <summary>
    /// 生成CSV导出
    /// </summary>
    private static byte[] GenerateCsvExport(WorkflowExportData exportData)
    {
        var csv = new System.Text.StringBuilder();

        // CSV头部
        csv.AppendLine("ID,Name,Description,Category,Version,IsActive,CreatedAt,UpdatedAt,CreatedBy");

        // 数据行
        foreach (var workflow in exportData.Workflows)
        {
            csv.AppendLine($"{workflow.Id},{EscapeCsvValue(workflow.Name)},{EscapeCsvValue(workflow.Description)},{EscapeCsvValue(workflow.Category)},{workflow.Version?.Major}.{workflow.Version?.Minor},{workflow.IsActive},{workflow.CreatedAt:yyyy-MM-dd HH:mm:ss},{workflow.UpdatedAt:yyyy-MM-dd HH:mm:ss},{workflow.CreatedBy}");
        }

        return System.Text.Encoding.UTF8.GetBytes(csv.ToString());
    }

    /// <summary>
    /// 转义CSV值
    /// </summary>
    private static string EscapeCsvValue(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }

    /// <summary>
    /// 解析导入文件
    /// </summary>
    private static WorkflowExportData? ParseImportFile(byte[] fileContent, string fileName)
    {
        try
        {
            var json = System.Text.Encoding.UTF8.GetString(fileContent);
            var options = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
            return JsonSerializer.Deserialize<WorkflowExportData>(json, options);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 验证工作流导入
    /// </summary>
    private async Task ValidateWorkflowForImportAsync(WorkflowExportItem workflow, WorkflowImportResult result)
    {
        // 检查名称冲突
        var existingResult = await _workflowFactory.FindAsync(w => w.Name == workflow.Name && w.IsDeleted != true, limit: 1);
        var existing = existingResult.FirstOrDefault();
        if (existing != null)
        {
            result.Conflicts.Add(new ImportConflict
            {
                WorkflowName = workflow.Name,
                ConflictType = "NameConflict",
                ExistingWorkflowId = existing.Id,
                Description = $"工作流名称 '{workflow.Name}' 已存在",
                SuggestedResolution = "重命名或覆盖现有工作流"
            });
        }

        // 验证工作流图形结构
        if (workflow.Graph == null || workflow.Graph.Nodes.Count == 0)
        {
            result.Errors.Add(new ImportError
            {
                WorkflowName = workflow.Name,
                ErrorMessage = "工作流图形定义为空或无效"
            });
        }

        // 验证必需字段
        if (string.IsNullOrEmpty(workflow.Name))
        {
            result.Errors.Add(new ImportError
            {
                WorkflowName = workflow.Name,
                ErrorMessage = "工作流名称不能为空"
            });
        }
    }

    /// <summary>
    /// 导入单个工作流
    /// </summary>
    private async Task ImportSingleWorkflowAsync(WorkflowExportItem workflowItem, WorkflowImportResult result, bool overwriteExisting, string userId, string companyId)
    {
        // 检查是否存在同名工作流
        var existingResult = await _workflowFactory.FindAsync(w => w.Name == workflowItem.Name && w.IsDeleted != true, limit: 1);
        var existing = existingResult.FirstOrDefault();

        if (existing != null && !overwriteExisting)
        {
            result.SkippedCount++;
            result.Conflicts.Add(new ImportConflict
            {
                WorkflowName = workflowItem.Name,
                ConflictType = "NameConflict",
                ExistingWorkflowId = existing.Id,
                Description = $"工作流名称 '{workflowItem.Name}' 已存在，跳过导入"
            });
            return;
        }

        // 创建新的工作流定义
        var workflow = new WorkflowDefinition
        {
            Name = workflowItem.Name,
            Description = workflowItem.Description,
            Category = workflowItem.Category ?? string.Empty,
            Version = workflowItem.Version ?? new WorkflowVersion { Major = 1, Minor = 0, CreatedAt = DateTime.UtcNow },
            Graph = workflowItem.Graph ?? new WorkflowGraph(),
            IsActive = workflowItem.IsActive,
            CompanyId = companyId
        };

        if (existing != null && overwriteExisting)
        {
            // 更新现有工作流
            await _workflowFactory.UpdateAsync(existing.Id, entity =>
            {
                entity.Description = workflow.Description;
                entity.Category = workflow.Category;
                entity.Graph = workflow.Graph;
                entity.IsActive = workflow.IsActive;
            });
            result.ImportedWorkflowIds.Add(existing.Id);
        }
        else
        {
            // 创建新工作流
            var created = await _workflowFactory.CreateAsync(workflow);
            result.ImportedWorkflowIds.Add(created.Id);
        }

        result.ImportedCount++;
    }

    /// <summary>
    /// 解决工作流冲突
    /// </summary>
    private async Task ResolveWorkflowConflictAsync(WorkflowExportItem workflowItem, string resolution, WorkflowImportResult result, string userId, string companyId)
    {
        switch (resolution.ToLowerInvariant())
        {
            case "overwrite":
                await ImportSingleWorkflowAsync(workflowItem, result, true, userId, companyId);
                break;
            case "rename":
                // 生成新名称
                var newName = await GenerateUniqueWorkflowNameAsync(workflowItem.Name);
                workflowItem.Name = newName;
                await ImportSingleWorkflowAsync(workflowItem, result, false, userId, companyId);
                break;
            case "skip":
                result.SkippedCount++;
                break;
            default:
                throw new ArgumentException($"不支持的冲突解决方案: {resolution}");
        }
    }

    /// <summary>
    /// 生成唯一的工作流名称
    /// </summary>
    private async Task<string> GenerateUniqueWorkflowNameAsync(string baseName)
    {
        var counter = 1;
        string newName;

        do
        {
            newName = $"{baseName} ({counter})";
            var existingResult = await _workflowFactory.FindAsync(w => w.Name == newName && w.IsDeleted != true, limit: 1);
            var existing = existingResult.FirstOrDefault();
            if (existing == null)
            {
                break;
            }

            counter++;
        } while (counter <= 100); // 防止无限循环

        return newName;
    }

    #endregion
}

/// <summary>
/// 工作流导出数据
/// </summary>
public class WorkflowExportData
{
    /// <summary>
    /// 导出时间
    /// </summary>
    public DateTime ExportedAt { get; set; }

    /// <summary>
    /// 导出人
    /// </summary>
    public string ExportedBy { get; set; } = string.Empty;

    /// <summary>
    /// 导出配置
    /// </summary>
    public WorkflowExportConfig Config { get; set; } = new();

    /// <summary>
    /// 工作流列表
    /// </summary>
    public List<WorkflowExportItem> Workflows { get; set; } = new();
}

/// <summary>
/// 工作流导出项
/// </summary>
public class WorkflowExportItem
{
    /// <summary>
    /// 工作流ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 工作流名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 工作流描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 工作流分类
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// 版本信息
    /// </summary>
    public WorkflowVersion? Version { get; set; }

    /// <summary>
    /// 工作流图形定义
    /// </summary>
    public WorkflowGraph? Graph { get; set; }

    /// <summary>
    /// 是否启用
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// 分析数据（可选）
    /// </summary>
    public WorkflowAnalytics? Analytics { get; set; }

    /// <summary>
    /// 依赖项（可选）
    /// </summary>
    public List<WorkflowDependency>? Dependencies { get; set; }

    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>
    /// 创建人ID
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 创建人用户名
    /// </summary>
    public string? CreatedByUsername { get; set; }
}

/// <summary>
/// 工作流依赖项
/// </summary>
public class WorkflowDependency
{
    /// <summary>
    /// 依赖项类型
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 依赖项ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// 依赖项名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 依赖项数据
    /// </summary>
    public object? Data { get; set; }
}
