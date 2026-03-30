using System;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;

namespace Platform.ApiService.Services;

/// <summary>
/// 工作流图形校验服务
/// </summary>
public interface IWorkflowGraphValidator
{
    /// <summary>
    /// 校验工作流定义的图形结构是否合法
    /// </summary>
    (bool isValid, string? errorMessage) Validate(WorkflowGraph graph);
}
