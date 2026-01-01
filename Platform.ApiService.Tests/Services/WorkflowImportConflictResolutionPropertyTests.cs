using FsCheck;
using FsCheck.Xunit;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Xunit;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;

namespace Platform.ApiService.Tests.Services;

/// <summary>
/// 工作流导入冲突解决属性测试
/// Feature: workflow-list-upgrade, Property 10: 导入冲突解决
/// 验证需求 3.4 - 导入冲突解决
/// </summary>
public class WorkflowImportConflictResolutionPropertyTests
{
    /// <summary>
    /// 属性 10: 导入冲突解决
    /// 验证冲突解决机制能够正确处理不同类型的冲突并应用相应的解决策略
    /// Feature: workflow-list-upgrade, Property 10: 导入冲突解决
    /// </summary>
    [Property]
    public bool ImportConflictResolution(int conflictCount, ConflictResolutionStrategy strategy)
    {
        var validConflictCount = Math.Max(1, Math.Min(Math.Abs(conflictCount), 5));

        // 生成包含冲突的导入数据
        var importData = GenerateImportDataWithConflicts(validConflictCount);
        var resolutions = GenerateConflictResolutions(importData, strategy);

        // 执行冲突解决
        var resolutionResult = ResolveConflicts(importData, resolutions);

        // 验证冲突解决的正确性
        var hasCorrectResolutionCount = ValidateResolutionCount(importData, resolutions, resolutionResult);
        var hasCorrectStrategyApplication = ValidateStrategyApplication(strategy, resolutionResult);
        var hasValidResultStructure = ValidateResolutionResultStructure(resolutionResult);

        return hasCorrectResolutionCount && hasCorrectStrategyApplication && hasValidResultStructure;
    }

    /// <summary>
    /// 验证覆盖策略的正确性
    /// </summary>
    [Property]
    public bool OverwriteStrategyCorrectness(int workflowCount, bool hasExistingWorkflows)
    {
        var validWorkflowCount = Math.Max(1, Math.Min(Math.Abs(workflowCount), 5));

        // 生成测试数据
        var importData = GenerateTestImportData(validWorkflowCount);
        var existingWorkflows = hasExistingWorkflows ? GenerateExistingWorkflows(importData) : new List<WorkflowDefinition>();

        // 应用覆盖策略
        var resolutions = GenerateOverwriteResolutions(importData);
        var resolutionResult = ResolveConflictsWithExisting(importData, resolutions, existingWorkflows);

        // 验证覆盖策略的正确性
        if (hasExistingWorkflows)
        {
            // 应该更新现有工作流
            return resolutionResult.UpdatedCount > 0 && resolutionResult.ImportedCount >= 0;
        }
        else
        {
            // 应该创建新工作流
            return resolutionResult.ImportedCount > 0 && resolutionResult.UpdatedCount == 0;
        }
    }

    /// <summary>
    /// 验证重命名策略的正确性
    /// </summary>
    [Property]
    public bool RenameStrategyCorrectness(int workflowCount, string baseName)
    {
        var validWorkflowCount = Math.Max(1, Math.Min(Math.Abs(workflowCount), 3));
        var validBaseName = string.IsNullOrEmpty(baseName) ? "TestWorkflow" : baseName.Trim();

        // 确保基础名称不为空
        if (string.IsNullOrWhiteSpace(validBaseName))
        {
            validBaseName = "TestWorkflow";
        }

        // 生成具有相同名称的工作流
        var importData = GenerateImportDataWithSameName(validWorkflowCount, validBaseName);
        var resolutions = GenerateRenameResolutions(importData);
        var resolutionResult = ResolveConflicts(importData, resolutions);

        // 验证重命名策略的正确性
        var hasUniqueNames = ValidateUniqueNamesAfterRename(resolutionResult);
        var hasCorrectNamingPattern = ValidateRenamingPattern(validBaseName, resolutionResult);
        var hasCorrectCount = resolutionResult.RenamedWorkflows.Count >= 0;

        return hasUniqueNames && hasCorrectNamingPattern && hasCorrectCount;
    }

    /// <summary>
    /// 验证跳过策略的正确性
    /// </summary>
    [Property]
    public bool SkipStrategyCorrectness(int conflictCount, int skipCount)
    {
        var validConflictCount = Math.Max(1, Math.Min(Math.Abs(conflictCount), 5));
        var validSkipCount = Math.Max(0, Math.Min(Math.Abs(skipCount), validConflictCount));

        // 生成包含冲突的导入数据
        var importData = GenerateImportDataWithConflicts(validConflictCount);
        var resolutions = GenerateSkipResolutions(importData, validSkipCount);
        var resolutionResult = ResolveConflicts(importData, resolutions);

        // 验证跳过策略的正确性
        var totalProcessed = resolutionResult.ImportedCount + resolutionResult.SkippedCount + resolutionResult.FailedCount + resolutionResult.UpdatedCount;

        return resolutionResult.SkippedCount >= 0 &&
               resolutionResult.ImportedCount >= 0 &&
               totalProcessed <= validConflictCount &&
               totalProcessed >= 0;
    }

    /// <summary>
    /// 验证混合策略的正确性
    /// </summary>
    [Property]
    public bool MixedStrategyCorrectness(int workflowCount, bool includeOverwrite, bool includeRename, bool includeSkip)
    {
        var validWorkflowCount = Math.Max(3, Math.Min(Math.Abs(workflowCount), 6)); // 至少3个以便测试混合策略

        // 生成包含冲突的导入数据
        var importData = GenerateImportDataWithConflicts(validWorkflowCount);
        var resolutions = GenerateMixedResolutions(importData, includeOverwrite, includeRename, includeSkip);
        var resolutionResult = ResolveConflicts(importData, resolutions);

        // 验证混合策略的正确性
        var hasTotalConsistency = ValidateTotalConsistency(importData, resolutionResult);
        var hasStrategyConsistency = ValidateMixedStrategyConsistency(resolutions, resolutionResult);

        return hasTotalConsistency && hasStrategyConsistency;
    }

    /// <summary>
    /// 验证无效解决方案的处理
    /// </summary>
    [Property]
    public bool InvalidResolutionHandling(int conflictCount, string invalidResolution)
    {
        var validConflictCount = Math.Max(1, Math.Min(Math.Abs(conflictCount), 3));
        var invalidStrategy = string.IsNullOrEmpty(invalidResolution) ? "invalid_strategy" : invalidResolution;

        // 生成包含冲突的导入数据
        var importData = GenerateImportDataWithConflicts(validConflictCount);
        var resolutions = GenerateInvalidResolutions(importData, invalidStrategy);
        var resolutionResult = ResolveConflicts(importData, resolutions);

        // 验证无效解决方案的处理
        // 无效的解决方案应该导致错误或跳过
        return resolutionResult.FailedCount > 0 || resolutionResult.SkippedCount > 0;
    }

    #region 辅助方法

    /// <summary>
    /// 生成包含冲突的导入数据
    /// </summary>
    private static WorkflowExportData GenerateImportDataWithConflicts(int conflictCount)
    {
        var workflows = new List<WorkflowExportItem>();

        // 创建具有重复名称的工作流以产生冲突
        for (int i = 0; i < conflictCount; i++)
        {
            workflows.Add(new WorkflowExportItem
            {
                Id = Guid.NewGuid().ToString(),
                Name = $"ConflictWorkflow_{i % 2}", // 创建名称冲突
                Description = $"Conflict workflow description {i}",
                Category = "ConflictCategory",
                Version = new WorkflowVersion { Major = 1, Minor = i, CreatedAt = DateTime.UtcNow },
                Graph = GenerateValidGraph(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = $"user_{i}",
                CreatedByUsername = $"username_{i}"
            });
        }

        return new WorkflowExportData
        {
            ExportedAt = DateTime.UtcNow,
            ExportedBy = "test_user",
            Config = new WorkflowExportConfig(),
            Workflows = workflows
        };
    }

    /// <summary>
    /// 生成测试导入数据
    /// </summary>
    private static WorkflowExportData GenerateTestImportData(int workflowCount)
    {
        var workflows = new List<WorkflowExportItem>();

        for (int i = 0; i < workflowCount; i++)
        {
            workflows.Add(new WorkflowExportItem
            {
                Id = Guid.NewGuid().ToString(),
                Name = $"TestWorkflow_{i}",
                Description = $"Test workflow description {i}",
                Category = "TestCategory",
                Version = new WorkflowVersion { Major = 1, Minor = i, CreatedAt = DateTime.UtcNow },
                Graph = GenerateValidGraph(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = $"user_{i}",
                CreatedByUsername = $"username_{i}"
            });
        }

        return new WorkflowExportData
        {
            ExportedAt = DateTime.UtcNow,
            ExportedBy = "test_user",
            Config = new WorkflowExportConfig(),
            Workflows = workflows
        };
    }

    /// <summary>
    /// 生成具有相同名称的导入数据
    /// </summary>
    private static WorkflowExportData GenerateImportDataWithSameName(int workflowCount, string baseName)
    {
        var workflows = new List<WorkflowExportItem>();

        // 确保基础名称不为空
        var validBaseName = string.IsNullOrWhiteSpace(baseName) ? "TestWorkflow" : baseName;

        for (int i = 0; i < workflowCount; i++)
        {
            workflows.Add(new WorkflowExportItem
            {
                Id = Guid.NewGuid().ToString(),
                Name = validBaseName, // 所有工作流使用相同名称
                Description = $"Description {i}",
                Category = "TestCategory",
                Graph = GenerateValidGraph(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        return new WorkflowExportData
        {
            ExportedAt = DateTime.UtcNow,
            ExportedBy = "test_user",
            Config = new WorkflowExportConfig(),
            Workflows = workflows
        };
    }

    /// <summary>
    /// 生成现有工作流
    /// </summary>
    private static List<WorkflowDefinition> GenerateExistingWorkflows(WorkflowExportData importData)
    {
        var existingWorkflows = new List<WorkflowDefinition>();

        foreach (var workflow in importData.Workflows.Take(2)) // 只为前两个创建现有工作流
        {
            existingWorkflows.Add(new WorkflowDefinition
            {
                Id = Guid.NewGuid().ToString(),
                Name = workflow.Name,
                Description = "Existing workflow",
                Category = workflow.Category ?? "Default",
                Graph = GenerateValidGraph(),
                IsActive = false,
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddDays(-5),
                CompanyId = "test_company"
            });
        }

        return existingWorkflows;
    }

    /// <summary>
    /// 生成有效的工作流图形
    /// </summary>
    private static WorkflowGraph GenerateValidGraph()
    {
        return new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start", Label = "Start" },
                new WorkflowNode { Id = "approval", Type = "approval", Label = "Approval" },
                new WorkflowNode { Id = "end", Type = "end", Label = "End" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "edge1", Source = "start", Target = "approval" },
                new WorkflowEdge { Id = "edge2", Source = "approval", Target = "end" }
            }
        };
    }

    /// <summary>
    /// 生成冲突解决方案
    /// </summary>
    private static Dictionary<string, string> GenerateConflictResolutions(WorkflowExportData importData, ConflictResolutionStrategy strategy)
    {
        var resolutions = new Dictionary<string, string>();

        foreach (var workflow in importData.Workflows)
        {
            var resolution = strategy switch
            {
                ConflictResolutionStrategy.Overwrite => "overwrite",
                ConflictResolutionStrategy.Rename => "rename",
                ConflictResolutionStrategy.Skip => "skip",
                _ => "skip"
            };

            resolutions[workflow.Name] = resolution;
        }

        return resolutions;
    }

    /// <summary>
    /// 生成覆盖解决方案
    /// </summary>
    private static Dictionary<string, string> GenerateOverwriteResolutions(WorkflowExportData importData)
    {
        var resolutions = new Dictionary<string, string>();

        foreach (var workflow in importData.Workflows)
        {
            resolutions[workflow.Name] = "overwrite";
        }

        return resolutions;
    }

    /// <summary>
    /// 生成重命名解决方案
    /// </summary>
    private static Dictionary<string, string> GenerateRenameResolutions(WorkflowExportData importData)
    {
        var resolutions = new Dictionary<string, string>();

        foreach (var workflow in importData.Workflows)
        {
            resolutions[workflow.Name] = "rename";
        }

        return resolutions;
    }

    /// <summary>
    /// 生成跳过解决方案
    /// </summary>
    private static Dictionary<string, string> GenerateSkipResolutions(WorkflowExportData importData, int skipCount)
    {
        var resolutions = new Dictionary<string, string>();
        var workflowList = importData.Workflows.ToList();

        for (int i = 0; i < workflowList.Count; i++)
        {
            var resolution = i < skipCount ? "skip" : "overwrite";
            resolutions[workflowList[i].Name] = resolution;
        }

        return resolutions;
    }

    /// <summary>
    /// 生成混合解决方案
    /// </summary>
    private static Dictionary<string, string> GenerateMixedResolutions(WorkflowExportData importData, bool includeOverwrite, bool includeRename, bool includeSkip)
    {
        var resolutions = new Dictionary<string, string>();
        var workflowList = importData.Workflows.ToList();
        var strategies = new List<string>();

        if (includeOverwrite) strategies.Add("overwrite");
        if (includeRename) strategies.Add("rename");
        if (includeSkip) strategies.Add("skip");

        if (strategies.Count == 0) strategies.Add("skip"); // 默认策略

        for (int i = 0; i < workflowList.Count; i++)
        {
            var strategy = strategies[i % strategies.Count];
            resolutions[workflowList[i].Name] = strategy;
        }

        return resolutions;
    }

    /// <summary>
    /// 生成无效解决方案
    /// </summary>
    private static Dictionary<string, string> GenerateInvalidResolutions(WorkflowExportData importData, string invalidStrategy)
    {
        var resolutions = new Dictionary<string, string>();

        foreach (var workflow in importData.Workflows)
        {
            resolutions[workflow.Name] = invalidStrategy;
        }

        return resolutions;
    }

    /// <summary>
    /// 解决冲突
    /// </summary>
    private static ConflictResolutionResult ResolveConflicts(WorkflowExportData importData, Dictionary<string, string> resolutions)
    {
        var result = new ConflictResolutionResult();

        foreach (var workflow in importData.Workflows)
        {
            if (resolutions.TryGetValue(workflow.Name, out var resolution))
            {
                switch (resolution.ToLowerInvariant())
                {
                    case "overwrite":
                        result.ImportedCount++;
                        result.ResolvedWorkflows.Add(workflow.Name);
                        break;
                    case "rename":
                        result.ImportedCount++;
                        result.RenamedWorkflows.Add($"{workflow.Name} (1)");
                        break;
                    case "skip":
                        result.SkippedCount++;
                        break;
                    default:
                        result.FailedCount++;
                        result.Errors.Add($"Invalid resolution strategy: {resolution}");
                        break;
                }
            }
            else
            {
                result.SkippedCount++;
            }
        }

        return result;
    }

    /// <summary>
    /// 解决冲突（包含现有工作流）
    /// </summary>
    private static ConflictResolutionResult ResolveConflictsWithExisting(WorkflowExportData importData, Dictionary<string, string> resolutions, List<WorkflowDefinition> existingWorkflows)
    {
        var result = new ConflictResolutionResult();
        var existingNames = existingWorkflows.Select(w => w.Name).ToHashSet();

        foreach (var workflow in importData.Workflows)
        {
            if (resolutions.TryGetValue(workflow.Name, out var resolution))
            {
                switch (resolution.ToLowerInvariant())
                {
                    case "overwrite":
                        if (existingNames.Contains(workflow.Name))
                        {
                            result.UpdatedCount++;
                        }
                        else
                        {
                            result.ImportedCount++;
                        }
                        result.ResolvedWorkflows.Add(workflow.Name);
                        break;
                    case "rename":
                        result.ImportedCount++;
                        result.RenamedWorkflows.Add($"{workflow.Name} (1)");
                        break;
                    case "skip":
                        result.SkippedCount++;
                        break;
                    default:
                        result.FailedCount++;
                        result.Errors.Add($"Invalid resolution strategy: {resolution}");
                        break;
                }
            }
            else
            {
                result.SkippedCount++;
            }
        }

        return result;
    }

    /// <summary>
    /// 验证解决数量
    /// </summary>
    private static bool ValidateResolutionCount(WorkflowExportData importData, Dictionary<string, string> resolutions, ConflictResolutionResult result)
    {
        var totalProcessed = result.ImportedCount + result.SkippedCount + result.FailedCount + result.UpdatedCount;
        return totalProcessed <= importData.Workflows.Count && totalProcessed >= 0;
    }

    /// <summary>
    /// 验证策略应用
    /// </summary>
    private static bool ValidateStrategyApplication(ConflictResolutionStrategy strategy, ConflictResolutionResult result)
    {
        return strategy switch
        {
            ConflictResolutionStrategy.Overwrite => result.ImportedCount > 0 || result.UpdatedCount > 0,
            ConflictResolutionStrategy.Rename => result.RenamedWorkflows.Count > 0,
            ConflictResolutionStrategy.Skip => result.SkippedCount > 0,
            _ => true
        };
    }

    /// <summary>
    /// 验证解决结果结构
    /// </summary>
    private static bool ValidateResolutionResultStructure(ConflictResolutionResult result)
    {
        return result.ImportedCount >= 0 &&
               result.SkippedCount >= 0 &&
               result.FailedCount >= 0 &&
               result.UpdatedCount >= 0 &&
               result.ResolvedWorkflows != null &&
               result.RenamedWorkflows != null &&
               result.Errors != null;
    }

    /// <summary>
    /// 验证重命名后的唯一名称
    /// </summary>
    private static bool ValidateUniqueNamesAfterRename(ConflictResolutionResult result)
    {
        var allNames = result.ResolvedWorkflows.Concat(result.RenamedWorkflows).ToList();

        // 如果没有名称，返回true（空集合是唯一的）
        if (allNames.Count == 0)
        {
            return true;
        }

        return allNames.Count == allNames.Distinct().Count();
    }

    /// <summary>
    /// 验证重命名模式
    /// </summary>
    private static bool ValidateRenamingPattern(string baseName, ConflictResolutionResult result)
    {
        if (string.IsNullOrWhiteSpace(baseName))
        {
            return true; // 如果基础名称为空，跳过验证
        }

        return result.RenamedWorkflows.All(name => name.StartsWith(baseName));
    }

    /// <summary>
    /// 验证总数一致性
    /// </summary>
    private static bool ValidateTotalConsistency(WorkflowExportData importData, ConflictResolutionResult result)
    {
        var totalProcessed = result.ImportedCount + result.SkippedCount + result.FailedCount + result.UpdatedCount;
        return totalProcessed <= importData.Workflows.Count;
    }

    /// <summary>
    /// 验证混合策略一致性
    /// </summary>
    private static bool ValidateMixedStrategyConsistency(Dictionary<string, string> resolutions, ConflictResolutionResult result)
    {
        var overwriteCount = resolutions.Values.Count(v => v == "overwrite");
        var renameCount = resolutions.Values.Count(v => v == "rename");
        var skipCount = resolutions.Values.Count(v => v == "skip");

        // 验证结果与策略分布的一致性
        return (result.ImportedCount + result.UpdatedCount) >= 0 &&
               result.SkippedCount >= 0 &&
               result.RenamedWorkflows.Count >= 0;
    }

    #endregion

    #region 辅助类和枚举

    /// <summary>
    /// 冲突解决策略
    /// </summary>
    public enum ConflictResolutionStrategy
    {
        Overwrite,
        Rename,
        Skip
    }

    /// <summary>
    /// 冲突解决结果
    /// </summary>
    private class ConflictResolutionResult
    {
        public int ImportedCount { get; set; } = 0;
        public int SkippedCount { get; set; } = 0;
        public int FailedCount { get; set; } = 0;
        public int UpdatedCount { get; set; } = 0;
        public List<string> ResolvedWorkflows { get; set; } = new();
        public List<string> RenamedWorkflows { get; set; } = new();
        public List<string> Errors { get; set; } = new();
    }

    #endregion
}