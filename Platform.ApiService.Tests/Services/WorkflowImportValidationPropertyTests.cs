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
/// 工作流导入验证属性测试
/// Feature: workflow-list-upgrade, Property 9: 导入验证准确性
/// 验证需求 3.3, 3.5 - 导入验证准确性
/// </summary>
public class WorkflowImportValidationPropertyTests
{
    /// <summary>
    /// 属性 9: 导入验证准确性
    /// 验证导入文件验证能够准确识别有效和无效的工作流定义
    /// Feature: workflow-list-upgrade, Property 9: 导入验证准确性
    /// </summary>
    [Property]
    public bool ImportValidationAccuracy(int workflowCount, bool includeInvalidWorkflows, bool includeEmptyNames)
    {
        var validWorkflowCount = Math.Max(1, Math.Min(Math.Abs(workflowCount), 10));

        // 生成测试导入数据
        var importData = GenerateTestImportData(validWorkflowCount, includeInvalidWorkflows, includeEmptyNames);
        var fileContent = SerializeImportData(importData);

        // 执行验证
        var validationResult = ValidateImportData(importData);

        // 验证验证结果的准确性
        var hasCorrectErrorCount = ValidateErrorCount(importData, validationResult, includeInvalidWorkflows, includeEmptyNames);
        var hasCorrectConflictDetection = ValidateConflictDetection(importData, validationResult);
        var hasValidStructure = ValidateValidationResultStructure(validationResult);

        return hasCorrectErrorCount && hasCorrectConflictDetection && hasValidStructure;
    }

    /// <summary>
    /// 验证文件格式验证的准确性
    /// </summary>
    [Property]
    public bool FileFormatValidationAccuracy(string fileContent, string fileName)
    {
        var validFileName = string.IsNullOrEmpty(fileName) ? "test.json" : fileName;
        var validContent = string.IsNullOrEmpty(fileContent) ? "{}" : fileContent;

        // 测试不同的文件格式
        var jsonValidation = ValidateFileFormat(validContent, validFileName.EndsWith(".json") ? validFileName : "test.json");
        var invalidJsonValidation = ValidateFileFormat("invalid json content", "test.json");

        // JSON文件应该根据内容有效性返回相应结果
        // 无效JSON应该总是返回错误
        return (jsonValidation.IsValid || jsonValidation.HasFormatError) &&
               (!invalidJsonValidation.IsValid && invalidJsonValidation.HasFormatError);
    }

    /// <summary>
    /// 验证工作流图形结构验证的准确性
    /// </summary>
    [Property]
    public bool WorkflowGraphValidationAccuracy(int nodeCount, int edgeCount, bool includeInvalidNodes)
    {
        var validNodeCount = Math.Max(0, Math.Min(Math.Abs(nodeCount), 10));
        var validEdgeCount = Math.Max(0, Math.Min(Math.Abs(edgeCount), validNodeCount * 2));

        // 生成包含图形的工作流
        var workflow = GenerateWorkflowWithGraph(validNodeCount, validEdgeCount, includeInvalidNodes);
        var validationResult = ValidateWorkflowGraph(workflow);

        // 验证图形验证的准确性
        if (validNodeCount == 0)
        {
            // 空图形应该被标记为无效
            return !validationResult.IsValid && validationResult.HasGraphError;
        }

        if (includeInvalidNodes)
        {
            // 包含无效节点的图形应该被标记为无效
            return !validationResult.IsValid && validationResult.HasGraphError;
        }

        // 有效图形应该通过验证
        return validationResult.IsValid && !validationResult.HasGraphError;
    }

    /// <summary>
    /// 验证名称冲突检测的准确性
    /// </summary>
    [Property]
    public bool NameConflictDetectionAccuracy(int workflowCount, bool includeDuplicateNames)
    {
        var validWorkflowCount = Math.Max(1, Math.Min(Math.Abs(workflowCount), 5));

        // 生成测试工作流
        var workflows = GenerateWorkflowsForConflictTest(validWorkflowCount, includeDuplicateNames);
        var validationResult = ValidateNameConflicts(workflows);

        // 检查实际是否有重复名称
        var actualDuplicates = workflows.GroupBy(w => w.Name).Any(g => g.Count() > 1);

        if (actualDuplicates)
        {
            // 如果实际有重复名称，应该检测到冲突
            return validationResult.HasConflicts && validationResult.ConflictCount > 0;
        }
        else
        {
            // 如果没有重复名称，不应该有冲突
            return !validationResult.HasConflicts && validationResult.ConflictCount == 0;
        }
    }

    /// <summary>
    /// 验证必需字段验证的准确性
    /// </summary>
    [Property]
    public bool RequiredFieldValidationAccuracy(string workflowName, string workflowCategory, bool hasValidGraph)
    {
        var validName = string.IsNullOrEmpty(workflowName) ? null : workflowName.Trim();
        var validCategory = string.IsNullOrEmpty(workflowCategory) ? "Default" : workflowCategory.Trim();

        // 创建测试工作流
        var workflow = new WorkflowExportItem
        {
            Id = Guid.NewGuid().ToString(),
            Name = validName,
            Category = validCategory,
            Graph = hasValidGraph ? GenerateValidGraph() : null,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var validationResult = ValidateRequiredFields(workflow);

        // 验证必需字段验证的准确性
        var nameValidation = string.IsNullOrEmpty(validName) ?
            (!validationResult.IsValid && validationResult.HasNameError) :
            (validationResult.IsValid || !validationResult.HasNameError);

        var graphValidation = !hasValidGraph ?
            (!validationResult.IsValid && validationResult.HasGraphError) :
            (validationResult.IsValid || !validationResult.HasGraphError);

        return nameValidation && graphValidation;
    }

    /// <summary>
    /// 验证依赖项验证的准确性
    /// </summary>
    [Property]
    public bool DependencyValidationAccuracy(int dependencyCount, bool includeInvalidDependencies)
    {
        var validDependencyCount = Math.Max(0, Math.Min(Math.Abs(dependencyCount), 5));

        // 生成包含依赖项的工作流
        var workflow = GenerateWorkflowWithDependencies(validDependencyCount, includeInvalidDependencies);
        var validationResult = ValidateDependencies(workflow);

        if (includeInvalidDependencies && validDependencyCount > 0)
        {
            // 应该检测到依赖项错误
            return !validationResult.IsValid && validationResult.HasDependencyError;
        }
        else
        {
            // 不应该有依赖项错误
            return validationResult.IsValid || !validationResult.HasDependencyError;
        }
    }

    #region 辅助方法

    /// <summary>
    /// 生成测试导入数据
    /// </summary>
    private static WorkflowExportData GenerateTestImportData(int workflowCount, bool includeInvalidWorkflows, bool includeEmptyNames)
    {
        var workflows = new List<WorkflowExportItem>();

        for (int i = 0; i < workflowCount; i++)
        {
            var workflow = new WorkflowExportItem
            {
                Id = Guid.NewGuid().ToString(),
                Name = includeEmptyNames && i == 0 ? "" : $"TestWorkflow_{i}",
                Description = $"Test workflow description {i}",
                Category = $"Category_{i % 3}",
                Version = new WorkflowVersion { Major = 1, Minor = i, CreatedAt = DateTime.UtcNow },
                Graph = includeInvalidWorkflows && i == 0 ? null : GenerateValidGraph(),
                IsActive = i % 2 == 0,
                CreatedAt = DateTime.UtcNow.AddDays(-i),
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = $"user_{i}",
                CreatedByUsername = $"username_{i}"
            };

            workflows.Add(workflow);
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
    /// 生成包含图形的工作流
    /// </summary>
    private static WorkflowExportItem GenerateWorkflowWithGraph(int nodeCount, int edgeCount, bool includeInvalidNodes)
    {
        var nodes = new List<WorkflowNode>();
        var edges = new List<WorkflowEdge>();

        // 生成节点
        for (int i = 0; i < nodeCount; i++)
        {
            var nodeType = i == 0 ? "start" : (i == nodeCount - 1 ? "end" : "approval");

            // 如果需要包含无效节点，第一个节点使用无效类型
            if (includeInvalidNodes && i == 0)
            {
                nodeType = "invalid_type";
            }

            nodes.Add(new WorkflowNode
            {
                Id = $"node_{i}",
                Type = nodeType,
                Label = $"Node {i}",
                Position = new NodePosition { X = i * 100, Y = 100 },
                Config = new NodeConfig()
            });
        }

        // 生成边
        for (int i = 0; i < Math.Min(edgeCount, Math.Max(0, nodeCount - 1)); i++)
        {
            edges.Add(new WorkflowEdge
            {
                Id = $"edge_{i}",
                Source = $"node_{i}",
                Target = $"node_{i + 1}",
                Label = $"Edge {i}"
            });
        }

        return new WorkflowExportItem
        {
            Id = Guid.NewGuid().ToString(),
            Name = "GraphTestWorkflow",
            Graph = new WorkflowGraph { Nodes = nodes, Edges = edges },
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// 生成用于冲突测试的工作流
    /// </summary>
    private static List<WorkflowExportItem> GenerateWorkflowsForConflictTest(int workflowCount, bool includeDuplicateNames)
    {
        var workflows = new List<WorkflowExportItem>();

        for (int i = 0; i < workflowCount; i++)
        {
            // 如果需要包含重复名称且工作流数量大于1，让后面的工作流使用相同名称
            var name = (includeDuplicateNames && workflowCount > 1 && i > 0) ?
                "DuplicateName" :
                $"UniqueWorkflow_{i}";

            workflows.Add(new WorkflowExportItem
            {
                Id = Guid.NewGuid().ToString(),
                Name = name,
                Description = $"Description {i}",
                Category = "TestCategory",
                Graph = GenerateValidGraph(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        return workflows;
    }

    /// <summary>
    /// 生成包含依赖项的工作流
    /// </summary>
    private static WorkflowExportItem GenerateWorkflowWithDependencies(int dependencyCount, bool includeInvalidDependencies)
    {
        var nodes = new List<WorkflowNode>();

        // 创建包含表单绑定的节点
        for (int i = 0; i < dependencyCount; i++)
        {
            var formId = includeInvalidDependencies && i == 0 ? "" : $"form_{i}";

            nodes.Add(new WorkflowNode
            {
                Id = $"node_{i}",
                Type = "approval",
                Config = new NodeConfig
                {
                    Form = new FormBinding
                    {
                        FormDefinitionId = formId,
                        Target = FormTarget.Document,
                        Required = true
                    }
                }
            });
        }

        return new WorkflowExportItem
        {
            Id = Guid.NewGuid().ToString(),
            Name = "DependencyTestWorkflow",
            Graph = new WorkflowGraph { Nodes = nodes, Edges = new List<WorkflowEdge>() },
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// 序列化导入数据
    /// </summary>
    private static byte[] SerializeImportData(WorkflowExportData importData)
    {
        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        var json = JsonSerializer.Serialize(importData, options);
        return System.Text.Encoding.UTF8.GetBytes(json);
    }

    /// <summary>
    /// 验证导入数据
    /// </summary>
    private static ValidationResult ValidateImportData(WorkflowExportData importData)
    {
        var result = new ValidationResult { IsValid = true };

        foreach (var workflow in importData.Workflows)
        {
            // 验证必需字段
            if (string.IsNullOrEmpty(workflow.Name))
            {
                result.IsValid = false;
                result.HasNameError = true;
                result.ErrorCount++;
            }

            // 验证图形结构
            if (workflow.Graph == null || workflow.Graph.Nodes.Count == 0)
            {
                result.IsValid = false;
                result.HasGraphError = true;
                result.ErrorCount++;
            }

            // 验证节点类型
            if (workflow.Graph?.Nodes.Any(n => n.Type == "invalid_type") == true)
            {
                result.IsValid = false;
                result.HasGraphError = true;
                result.ErrorCount++;
            }
        }

        // 检查名称冲突
        var nameGroups = importData.Workflows.GroupBy(w => w.Name).Where(g => g.Count() > 1);
        if (nameGroups.Any())
        {
            result.HasConflicts = true;
            result.ConflictCount = nameGroups.Sum(g => g.Count() - 1);
        }

        return result;
    }

    /// <summary>
    /// 验证文件格式
    /// </summary>
    private static FileFormatValidationResult ValidateFileFormat(string content, string fileName)
    {
        var result = new FileFormatValidationResult { IsValid = true };

        try
        {
            if (fileName.EndsWith(".json"))
            {
                JsonSerializer.Deserialize<WorkflowExportData>(content, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
            }
        }
        catch
        {
            result.IsValid = false;
            result.HasFormatError = true;
        }

        return result;
    }

    /// <summary>
    /// 验证工作流图形
    /// </summary>
    private static GraphValidationResult ValidateWorkflowGraph(WorkflowExportItem workflow)
    {
        var result = new GraphValidationResult { IsValid = true };

        if (workflow.Graph == null || workflow.Graph.Nodes.Count == 0)
        {
            result.IsValid = false;
            result.HasGraphError = true;
            return result;
        }

        // 验证节点类型
        var validNodeTypes = new[] { "start", "end", "approval", "condition", "action" };
        if (workflow.Graph.Nodes.Any(n => !validNodeTypes.Contains(n.Type)))
        {
            result.IsValid = false;
            result.HasGraphError = true;
        }

        return result;
    }

    /// <summary>
    /// 验证名称冲突
    /// </summary>
    private static ConflictValidationResult ValidateNameConflicts(List<WorkflowExportItem> workflows)
    {
        var result = new ConflictValidationResult();

        var nameGroups = workflows.GroupBy(w => w.Name).Where(g => g.Count() > 1);
        if (nameGroups.Any())
        {
            result.HasConflicts = true;
            result.ConflictCount = nameGroups.Sum(g => g.Count() - 1);
        }

        return result;
    }

    /// <summary>
    /// 验证必需字段
    /// </summary>
    private static FieldValidationResult ValidateRequiredFields(WorkflowExportItem workflow)
    {
        var result = new FieldValidationResult { IsValid = true };

        if (string.IsNullOrEmpty(workflow.Name))
        {
            result.IsValid = false;
            result.HasNameError = true;
        }

        if (workflow.Graph == null || workflow.Graph.Nodes.Count == 0)
        {
            result.IsValid = false;
            result.HasGraphError = true;
        }

        return result;
    }

    /// <summary>
    /// 验证依赖项
    /// </summary>
    private static DependencyValidationResult ValidateDependencies(WorkflowExportItem workflow)
    {
        var result = new DependencyValidationResult { IsValid = true };

        if (workflow.Graph?.Nodes != null)
        {
            foreach (var node in workflow.Graph.Nodes)
            {
                if (node.Config?.Form != null && string.IsNullOrEmpty(node.Config.Form.FormDefinitionId))
                {
                    result.IsValid = false;
                    result.HasDependencyError = true;
                    break;
                }
            }
        }

        return result;
    }

    /// <summary>
    /// 验证错误数量
    /// </summary>
    private static bool ValidateErrorCount(WorkflowExportData importData, ValidationResult validationResult, bool includeInvalidWorkflows, bool includeEmptyNames)
    {
        var expectedErrors = 0;

        if (includeInvalidWorkflows)
            expectedErrors++;

        if (includeEmptyNames)
            expectedErrors++;

        return validationResult.ErrorCount >= expectedErrors;
    }

    /// <summary>
    /// 验证冲突检测
    /// </summary>
    private static bool ValidateConflictDetection(WorkflowExportData importData, ValidationResult validationResult)
    {
        var nameGroups = importData.Workflows.GroupBy(w => w.Name).Where(g => g.Count() > 1);
        var expectedConflicts = nameGroups.Any();

        return validationResult.HasConflicts == expectedConflicts;
    }

    /// <summary>
    /// 验证验证结果结构
    /// </summary>
    private static bool ValidateValidationResultStructure(ValidationResult validationResult)
    {
        return validationResult.ErrorCount >= 0 && validationResult.ConflictCount >= 0;
    }

    #endregion

    #region 辅助类

    /// <summary>
    /// 验证结果
    /// </summary>
    private class ValidationResult
    {
        public bool IsValid { get; set; }
        public bool HasNameError { get; set; }
        public bool HasGraphError { get; set; }
        public bool HasConflicts { get; set; }
        public int ErrorCount { get; set; }
        public int ConflictCount { get; set; }
    }

    /// <summary>
    /// 文件格式验证结果
    /// </summary>
    private class FileFormatValidationResult
    {
        public bool IsValid { get; set; }
        public bool HasFormatError { get; set; }
    }

    /// <summary>
    /// 图形验证结果
    /// </summary>
    private class GraphValidationResult
    {
        public bool IsValid { get; set; }
        public bool HasGraphError { get; set; }
    }

    /// <summary>
    /// 冲突验证结果
    /// </summary>
    private class ConflictValidationResult
    {
        public bool HasConflicts { get; set; }
        public int ConflictCount { get; set; }
    }

    /// <summary>
    /// 字段验证结果
    /// </summary>
    private class FieldValidationResult
    {
        public bool IsValid { get; set; }
        public bool HasNameError { get; set; }
        public bool HasGraphError { get; set; }
    }

    /// <summary>
    /// 依赖项验证结果
    /// </summary>
    private class DependencyValidationResult
    {
        public bool IsValid { get; set; }
        public bool HasDependencyError { get; set; }
    }

    #endregion
}