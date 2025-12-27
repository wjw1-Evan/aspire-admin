using System;
using System.Collections.Generic;
using System.Linq;
using Platform.ApiService.Models;

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

public class WorkflowGraphValidator : IWorkflowGraphValidator
{
    public (bool isValid, string? errorMessage) Validate(WorkflowGraph graph)
    {
        if (graph == null || graph.Nodes == null || !graph.Nodes.Any())
            return (false, "流程节点不能为空");

        // 1. 必须有且仅有一个开始节点
        var startNodes = graph.Nodes.Where(n => n.Type == "start").ToList();
        if (startNodes.Count == 0) return (false, "流程必须包含开始节点");
        if (startNodes.Count > 1) return (false, "流程只能包含一个开始节点");

        // 2. 必须至少有一个结束节点
        if (!graph.Nodes.Any(n => n.Type == "end"))
            return (false, "流程必须包含结束节点");

        // 3. 检查是否有孤立节点（除了开始或结束节点外，其他节点必须有进有出）
        // 实际上可以用可达性分析更准确
        foreach (var node in graph.Nodes)
        {
            if (node.Type == "start")
            {
                if (!graph.Edges.Any(e => e.Source == node.Id))
                    return (false, $"开始节点 {node.Id} 没有出边");
            }
            else if (node.Type == "end")
            {
                if (!graph.Edges.Any(e => e.Target == node.Id))
                    return (false, $"结束节点 {node.Id} 没有入边");
            }
            else
            {
                if (!graph.Edges.Any(e => e.Source == node.Id))
                    return (false, $"节点 {node.Label ?? node.Id} 没有出边");
                if (!graph.Edges.Any(e => e.Target == node.Id))
                    return (false, $"节点 {node.Label ?? node.Id} 没有入边");
            }
        }

        // 4. 连通性检查 (从开始节点到所有节点是否可达)
        // 5. 循环检查 (可选，某些流程允许循环，但典型的审批流应该是 DAG)
        
        return (true, null);
    }
}
