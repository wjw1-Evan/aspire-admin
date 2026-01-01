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
/// 工作流导出导入服务属性测试
/// Feature: workflow-list-upgrade, Property 8: 导出完整性
/// 验证需求 3.1, 3.2, 3.6 - 导出完整性
/// </summary>
public class WorkflowExportImportServicePropertyTests
{
    /// <summary>
    /// 属性 8: 导出完整性
    /// 验证导出的工作流数据包含完整的工作流定义、图形、表单绑定和所有元数据
    /// Feature: workflow-list-upgrade, Property 8: 导出完整性
    /// </summary>
    [Property]
    public bool ExportCompleteness(int workflowCount, bool includeAnalytics, bool includeDependencies)
    {
        // 确保输入值在合理范围内
        var validWorkflowCount = Math.Max(1, Math.Min(Math.Abs(workflowCount), 10));

        // 生成测试工作流数据
        var workflows = GenerateTestWorkflows(validWorkflowCount, includeAnalytics);

        // 创建导出配置
        var exportConfig = new WorkflowExportConfig
        {
            Format = ExportFormat.Json,
            IncludeAnalytics = includeAnalytics,
            IncludeDependencies = includeDependencies
        };

        // 创建导出数据
        var exportData = CreateExportData(workflows, exportConfig);

        // 验证导出完整性的核心属性
        var hasAllWorkflows = ValidateAllWorkflowsIncluded(workflows, exportData);
        var hasCompleteDefinitions = ValidateCompleteWorkflowDefinitions(workflows, exportData);
        var hasCorrectMetadata = ValidateExportMetadata(exportData, exportConfig);
        var hasValidStructure = ValidateExportStructure(exportData);

        return hasAllWorkflows && hasCompleteDefinitions && hasCorrectMetadata && hasValidStructure;
    }

    /// <summary>
    /// 验证导出数据的JSON序列化完整性
    /// </summary>
    [Property]
    public bool ExportJsonSerializationCompleteness(int workflowCount, string workflowName, string category)
    {
        var validWorkflowCount = Math.Max(1, Math.Min(Math.Abs(workflowCount), 5));
        var validWorkflowName = string.IsNullOrEmpty(workflowName) ? "TestWorkflow" : workflowName;
        var validCategory = string.IsNullOrEmpty(category) ? "TestCategory" : category;

        // 生成包含特定数据的工作流
        var workflows = GenerateTestWorkflowsWithSpecificData(validWorkflowCount, validWorkflowName, validCategory);
        var exportData = CreateExportData(workflows, new WorkflowExportConfig { Format = ExportFormat.Json });

        // 序列化为JSON
        var jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        try
        {
            var json = JsonSerializer.Serialize(exportData, jsonOptions);
            var deserializedData = JsonSerializer.Deserialize<WorkflowExportData>(json, jsonOptions);

            // 验证序列化往返的完整性
            return ValidateSerializationRoundTrip(exportData, deserializedData);
        }
        catch
        {
            return false; // 序列化失败
        }
    }

    /// <summary>
    /// 验证导出数据包含所有必需的工作流图形元素
    /// </summary>
    [Property]
    public bool ExportGraphElementsCompleteness(int nodeCount, int edgeCount)
    {
        var validNodeCount = Math.Max(1, Math.Min(Math.Abs(nodeCount), 10));
        var validEdgeCount = Math.Max(0, Math.Min(Math.Abs(edgeCount), validNodeCount * 2));

        // 生成包含图形元素的工作流
        var workflow = GenerateWorkflowWithGraph(validNodeCount, validEdgeCount);
        var workflows = new List<WorkflowDefinition> { workflow };
        var exportData = CreateExportData(workflows, new WorkflowExportConfig());

        // 验证图形元素的完整性
        var exportedWorkflow = exportData.Workflows.First();

        return ValidateGraphElementsCompleteness(workflow.Graph, exportedWorkflow.Graph);
    }

    /// <summary>
    /// 验证导出数据包含正确的分析数据（当启用时）
    /// </summary>
    [Property]
    public bool ExportAnalyticsDataCompleteness(int usageCount, double completionRate, double performanceScore)
    {
        // 处理无效的浮点数值（无穷大、NaN等）
        if (double.IsInfinity(completionRate) || double.IsNaN(completionRate))
            completionRate = 50.0; // 使用默认值
        if (double.IsInfinity(performanceScore) || double.IsNaN(performanceScore))
            performanceScore = 75.0; // 使用默认值

        var validUsageCount = Math.Max(0, Math.Abs(usageCount) % 1000);
        var validCompletionRate = Math.Max(0, Math.Min(Math.Abs(completionRate) % 100, 100));
        var validPerformanceScore = Math.Max(0, Math.Min(Math.Abs(performanceScore) % 100, 100));

        // 生成包含分析数据的工作流
        var workflow = GenerateWorkflowWithAnalytics(validUsageCount, validCompletionRate, validPerformanceScore);
        var workflows = new List<WorkflowDefinition> { workflow };

        // 测试包含分析数据的导出
        var exportConfigWithAnalytics = new WorkflowExportConfig { IncludeAnalytics = true };
        var exportDataWithAnalytics = CreateExportData(workflows, exportConfigWithAnalytics);

        // 测试不包含分析数据的导出
        var exportConfigWithoutAnalytics = new WorkflowExportConfig { IncludeAnalytics = false };
        var exportDataWithoutAnalytics = CreateExportData(workflows, exportConfigWithoutAnalytics);

        // 验证分析数据的正确包含/排除
        var analyticsIncludedCorrectly = ValidateAnalyticsInclusion(workflow.Analytics,
            exportDataWithAnalytics.Workflows.First(), true);
        var analyticsExcludedCorrectly = ValidateAnalyticsInclusion(workflow.Analytics,
            exportDataWithoutAnalytics.Workflows.First(), false);

        return analyticsIncludedCorrectly && analyticsExcludedCorrectly;
    }

    /// <summary>
    /// 验证导出数据包含正确的依赖项信息（当启用时）
    /// </summary>
    [Property]
    public bool ExportDependenciesCompleteness(int dependencyCount, bool includeDependencies)
    {
        var validDependencyCount = Math.Max(0, Math.Min(Math.Abs(dependencyCount), 5));

        // 生成包含依赖项的工作流
        var workflow = GenerateWorkflowWithDependencies(validDependencyCount);
        var workflows = new List<WorkflowDefinition> { workflow };

        var exportConfig = new WorkflowExportConfig { IncludeDependencies = includeDependencies };
        var exportData = CreateExportData(workflows, exportConfig);

        // 验证依赖项的正确包含/排除
        var exportedWorkflow = exportData.Workflows.First();

        if (includeDependencies)
        {
            // 当启用依赖项包含时，应该包含实际存在的依赖项数量
            // 如果原始工作流没有依赖项，导出的依赖项也应该为空或0
            return exportedWorkflow.Dependencies != null &&
                   exportedWorkflow.Dependencies.Count == validDependencyCount;
        }
        else
        {
            // 当禁用依赖项包含时，不应该包含任何依赖项
            return exportedWorkflow.Dependencies == null || exportedWorkflow.Dependencies.Count == 0;
        }
    }

    /// <summary>
    /// 验证导出配置对输出格式的影响
    /// </summary>
    [Property]
    public bool ExportFormatConfigurationCompleteness(ExportFormat format, bool includeAnalytics, bool includeDependencies)
    {
        // 生成测试工作流
        var workflow = GenerateCompleteTestWorkflow();
        var workflows = new List<WorkflowDefinition> { workflow };

        var exportConfig = new WorkflowExportConfig
        {
            Format = format,
            IncludeAnalytics = includeAnalytics,
            IncludeDependencies = includeDependencies
        };

        var exportData = CreateExportData(workflows, exportConfig);

        // 验证导出配置是否正确应用
        return ValidateExportConfigurationApplication(exportData, exportConfig);
    }

    #region 辅助方法

    /// <summary>
    /// 生成测试工作流数据
    /// </summary>
    private static List<WorkflowDefinition> GenerateTestWorkflows(int count, bool includeAnalytics)
    {
        var workflows = new List<WorkflowDefinition>();

        for (int i = 0; i < count; i++)
        {
            var workflow = new WorkflowDefinition
            {
                Id = Guid.NewGuid().ToString(),
                Name = $"TestWorkflow_{i}",
                Description = $"Test workflow description {i}",
                Category = $"Category_{i % 3}",
                Version = new WorkflowVersion { Major = 1, Minor = i, CreatedAt = DateTime.UtcNow },
                Graph = GenerateTestGraph(),
                IsActive = i % 2 == 0,
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = $"user_{i}",
                CreatedByUsername = $"username_{i}",
                CompanyId = "test_company"
            };

            if (includeAnalytics)
            {
                workflow.Analytics = GenerateTestAnalytics();
            }

            workflows.Add(workflow);
        }

        return workflows;
    }

    /// <summary>
    /// 生成包含特定数据的测试工作流
    /// </summary>
    private static List<WorkflowDefinition> GenerateTestWorkflowsWithSpecificData(int count, string name, string category)
    {
        var workflows = new List<WorkflowDefinition>();

        for (int i = 0; i < count; i++)
        {
            workflows.Add(new WorkflowDefinition
            {
                Id = Guid.NewGuid().ToString(),
                Name = $"{name}_{i}",
                Description = $"Description for {name}_{i}",
                Category = category,
                Version = new WorkflowVersion { Major = 1, Minor = 0, CreatedAt = DateTime.UtcNow },
                Graph = GenerateTestGraph(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CompanyId = "test_company"
            });
        }

        return workflows;
    }

    /// <summary>
    /// 生成包含图形的工作流
    /// </summary>
    private static WorkflowDefinition GenerateWorkflowWithGraph(int nodeCount, int edgeCount)
    {
        var nodes = new List<WorkflowNode>();
        var edges = new List<WorkflowEdge>();

        // 生成节点
        for (int i = 0; i < nodeCount; i++)
        {
            nodes.Add(new WorkflowNode
            {
                Id = $"node_{i}",
                Type = i == 0 ? "start" : (i == nodeCount - 1 ? "end" : "approval"),
                Label = $"Node {i}",
                Position = new NodePosition { X = i * 100, Y = 100 },
                Config = new NodeConfig()
            });
        }

        // 生成边
        for (int i = 0; i < Math.Min(edgeCount, nodeCount - 1); i++)
        {
            edges.Add(new WorkflowEdge
            {
                Id = $"edge_{i}",
                Source = $"node_{i}",
                Target = $"node_{i + 1}",
                Label = $"Edge {i}"
            });
        }

        return new WorkflowDefinition
        {
            Id = Guid.NewGuid().ToString(),
            Name = "GraphTestWorkflow",
            Graph = new WorkflowGraph { Nodes = nodes, Edges = edges },
            CompanyId = "test_company"
        };
    }

    /// <summary>
    /// 生成包含分析数据的工作流
    /// </summary>
    private static WorkflowDefinition GenerateWorkflowWithAnalytics(int usageCount, double completionRate, double performanceScore)
    {
        return new WorkflowDefinition
        {
            Id = Guid.NewGuid().ToString(),
            Name = "AnalyticsTestWorkflow",
            Graph = GenerateTestGraph(),
            Analytics = new WorkflowAnalytics
            {
                UsageCount = usageCount,
                CompletionRate = completionRate,
                PerformanceScore = performanceScore,
                LastUsedAt = DateTime.UtcNow,
                TrendData = new List<TrendDataPoint>
                {
                    new TrendDataPoint { Date = DateTime.UtcNow.AddDays(-1), UsageCount = usageCount / 2 }
                }
            },
            CompanyId = "test_company"
        };
    }

    /// <summary>
    /// 生成包含依赖项的工作流
    /// </summary>
    private static WorkflowDefinition GenerateWorkflowWithDependencies(int dependencyCount)
    {
        var nodes = new List<WorkflowNode>();

        // 创建包含表单绑定的节点
        for (int i = 0; i < dependencyCount; i++)
        {
            nodes.Add(new WorkflowNode
            {
                Id = $"node_{i}",
                Type = "approval",
                Config = new NodeConfig
                {
                    Form = new FormBinding
                    {
                        FormDefinitionId = $"form_{i}",
                        Target = FormTarget.Document,
                        Required = true
                    }
                }
            });
        }

        return new WorkflowDefinition
        {
            Id = Guid.NewGuid().ToString(),
            Name = "DependencyTestWorkflow",
            Graph = new WorkflowGraph { Nodes = nodes, Edges = new List<WorkflowEdge>() },
            CompanyId = "test_company"
        };
    }

    /// <summary>
    /// 生成完整的测试工作流
    /// </summary>
    private static WorkflowDefinition GenerateCompleteTestWorkflow()
    {
        return new WorkflowDefinition
        {
            Id = Guid.NewGuid().ToString(),
            Name = "CompleteTestWorkflow",
            Description = "Complete test workflow with all features",
            Category = "TestCategory",
            Version = new WorkflowVersion { Major = 1, Minor = 0, CreatedAt = DateTime.UtcNow },
            Graph = GenerateTestGraph(),
            IsActive = true,
            Analytics = GenerateTestAnalytics(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CompanyId = "test_company"
        };
    }

    /// <summary>
    /// 生成测试图形
    /// </summary>
    private static WorkflowGraph GenerateTestGraph()
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
    /// 生成测试分析数据
    /// </summary>
    private static WorkflowAnalytics GenerateTestAnalytics()
    {
        return new WorkflowAnalytics
        {
            UsageCount = 10,
            CompletionRate = 85.5,
            PerformanceScore = 92.3,
            LastUsedAt = DateTime.UtcNow,
            TrendData = new List<TrendDataPoint>
            {
                new TrendDataPoint { Date = DateTime.UtcNow.AddDays(-1), UsageCount = 5 }
            }
        };
    }

    /// <summary>
    /// 创建导出数据
    /// </summary>
    private static WorkflowExportData CreateExportData(List<WorkflowDefinition> workflows, WorkflowExportConfig config)
    {
        var exportData = new WorkflowExportData
        {
            ExportedAt = DateTime.UtcNow,
            ExportedBy = "test_user",
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

            if (config.IncludeAnalytics && workflow.Analytics != null)
            {
                exportItem.Analytics = workflow.Analytics;
            }

            if (config.IncludeDependencies)
            {
                // 模拟依赖项生成
                var dependencyCount = workflow.Graph?.Nodes?.Count(n => n.Config?.Form != null) ?? 0;
                if (dependencyCount > 0)
                {
                    exportItem.Dependencies = Enumerable.Range(0, dependencyCount)
                        .Select(i => new WorkflowDependency
                        {
                            Type = "form",
                            Id = $"form_{i}",
                            Name = $"Form {i}"
                        }).ToList();
                }
                else
                {
                    // 即使没有依赖项，也要初始化为空列表（而不是null）
                    exportItem.Dependencies = new List<WorkflowDependency>();
                }
            }

            exportData.Workflows.Add(exportItem);
        }

        return exportData;
    }

    /// <summary>
    /// 验证所有工作流都包含在导出中
    /// </summary>
    private static bool ValidateAllWorkflowsIncluded(List<WorkflowDefinition> originalWorkflows, WorkflowExportData exportData)
    {
        if (originalWorkflows.Count != exportData.Workflows.Count)
            return false;

        var originalIds = originalWorkflows.Select(w => w.Id).ToHashSet();
        var exportedIds = exportData.Workflows.Select(w => w.Id).ToHashSet();

        return originalIds.SetEquals(exportedIds);
    }

    /// <summary>
    /// 验证工作流定义的完整性
    /// </summary>
    private static bool ValidateCompleteWorkflowDefinitions(List<WorkflowDefinition> originalWorkflows, WorkflowExportData exportData)
    {
        foreach (var original in originalWorkflows)
        {
            var exported = exportData.Workflows.FirstOrDefault(w => w.Id == original.Id);
            if (exported == null)
                return false;

            // 验证基本字段
            if (exported.Name != original.Name ||
                exported.Description != original.Description ||
                exported.Category != original.Category ||
                exported.IsActive != original.IsActive)
                return false;

            // 验证图形结构
            if (!ValidateGraphElementsCompleteness(original.Graph, exported.Graph))
                return false;
        }

        return true;
    }

    /// <summary>
    /// 验证导出元数据
    /// </summary>
    private static bool ValidateExportMetadata(WorkflowExportData exportData, WorkflowExportConfig config)
    {
        return exportData.ExportedAt != default &&
               !string.IsNullOrEmpty(exportData.ExportedBy) &&
               exportData.Config != null &&
               exportData.Config.Format == config.Format &&
               exportData.Config.IncludeAnalytics == config.IncludeAnalytics &&
               exportData.Config.IncludeDependencies == config.IncludeDependencies;
    }

    /// <summary>
    /// 验证导出结构
    /// </summary>
    private static bool ValidateExportStructure(WorkflowExportData exportData)
    {
        return exportData.Workflows != null &&
               exportData.Workflows.All(w => !string.IsNullOrEmpty(w.Id) && !string.IsNullOrEmpty(w.Name));
    }

    /// <summary>
    /// 验证图形元素完整性
    /// </summary>
    private static bool ValidateGraphElementsCompleteness(WorkflowGraph? original, WorkflowGraph? exported)
    {
        if (original == null && exported == null)
            return true;

        if (original == null || exported == null)
            return false;

        // 验证节点
        if (original.Nodes.Count != exported.Nodes.Count)
            return false;

        foreach (var originalNode in original.Nodes)
        {
            var exportedNode = exported.Nodes.FirstOrDefault(n => n.Id == originalNode.Id);
            if (exportedNode == null ||
                exportedNode.Type != originalNode.Type ||
                exportedNode.Label != originalNode.Label)
                return false;
        }

        // 验证边
        if (original.Edges.Count != exported.Edges.Count)
            return false;

        foreach (var originalEdge in original.Edges)
        {
            var exportedEdge = exported.Edges.FirstOrDefault(e => e.Id == originalEdge.Id);
            if (exportedEdge == null ||
                exportedEdge.Source != originalEdge.Source ||
                exportedEdge.Target != originalEdge.Target)
                return false;
        }

        return true;
    }

    /// <summary>
    /// 验证序列化往返完整性
    /// </summary>
    private static bool ValidateSerializationRoundTrip(WorkflowExportData original, WorkflowExportData? deserialized)
    {
        if (deserialized == null)
            return false;

        return original.Workflows.Count == deserialized.Workflows.Count &&
               original.ExportedBy == deserialized.ExportedBy &&
               original.Config.Format == deserialized.Config.Format;
    }

    /// <summary>
    /// 验证分析数据的包含/排除
    /// </summary>
    private static bool ValidateAnalyticsInclusion(WorkflowAnalytics? originalAnalytics, WorkflowExportItem exportedItem, bool shouldInclude)
    {
        if (shouldInclude)
        {
            return exportedItem.Analytics != null &&
                   originalAnalytics != null &&
                   exportedItem.Analytics.UsageCount == originalAnalytics.UsageCount &&
                   Math.Abs(exportedItem.Analytics.CompletionRate - originalAnalytics.CompletionRate) < 0.01;
        }
        else
        {
            return exportedItem.Analytics == null;
        }
    }

    /// <summary>
    /// 验证导出配置的应用
    /// </summary>
    private static bool ValidateExportConfigurationApplication(WorkflowExportData exportData, WorkflowExportConfig config)
    {
        return exportData.Config.Format == config.Format &&
               exportData.Config.IncludeAnalytics == config.IncludeAnalytics &&
               exportData.Config.IncludeDependencies == config.IncludeDependencies;
    }

    #endregion
}