using System;
using System.Collections.Generic;
using System.Linq;
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

/// <summary>
/// 工作流图形校验服务的默认实现
/// </summary>
public class WorkflowGraphValidator : IWorkflowGraphValidator
{
    /// <summary>
    /// 校验工作流定义的图形结构是否合法
    /// </summary>
    /// <param name="graph">工作流图形定义</param>
    /// <returns>若合法返回 (true, null)，否则返回 (false, 错误消息)</returns>
    public (bool isValid, string? errorMessage) Validate(WorkflowGraph graph)
    {
        if (graph == null || graph.Nodes == null || !graph.Nodes.Any())
            return (false, "流程节点不能为空");

        // 0. 节点ID唯一性检查
        var duplicateNodeIds = graph.Nodes
            .GroupBy(n => n.Id)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();
        if (duplicateNodeIds.Any())
            return (false, $"存在重复的节点ID: {string.Join(", ", duplicateNodeIds)}");

        // 1. 必须有且仅有一个开始节点
        var startNodes = graph.Nodes.Where(n => n.Data.NodeType == "start").ToList();
        if (startNodes.Count == 0) return (false, "流程必须包含开始节点");
        if (startNodes.Count > 1) return (false, "流程只能包含一个开始节点");

        var startNode = startNodes[0];

        // 2. 必须至少有一个结束节点
        if (!graph.Nodes.Any(n => n.Data.NodeType == "end"))
            return (false, "流程必须包含结束节点");

        // 2.1 边引用合法性检查
        if (graph.Edges != null && graph.Edges.Any())
        {
            // 边引用的节点必须存在
            foreach (var e in graph.Edges)
            {
                if (string.IsNullOrWhiteSpace(e.Source) || string.IsNullOrWhiteSpace(e.Target))
                    return (false, $"连接线 {e.Id} 的源或目标节点为空");
                if (e.Source == e.Target)
                    return (false, $"连接线 {e.Id} 的源和目标节点不能相同（不支持自环）");
                if (!graph.Nodes.Any(n => n.Id == e.Source))
                    return (false, $"连接线 {e.Id} 的源节点不存在: {e.Source}");
                if (!graph.Nodes.Any(n => n.Id == e.Target))
                    return (false, $"连接线 {e.Id} 的目标节点不存在: {e.Target}");
            }

            // 不允许重复的 Source->Target 边（相同条件时）
            var duplicateEdges = graph.Edges
                .GroupBy(e => new { e.Source, e.Target, Condition = e.Data?.Condition?.Trim() ?? string.Empty })
                .Where(g => g.Count() > 1)
                .ToList();
            if (duplicateEdges.Any())
            {
                var dupDesc = string.Join("; ", duplicateEdges.Select(g => $"{g.Key.Source}->{g.Key.Target} [{g.Key.Condition}]").Distinct());
                return (false, $"存在重复的连接线: {dupDesc}");
            }
        }

        // 4. 连通性检查 (从开始节点到所有节点是否可达)
        var reachable = new HashSet<string>();
        var queue = new Queue<string>();
        queue.Enqueue(startNode.Id);
        reachable.Add(startNode.Id);
        var edges = graph.Edges ?? new List<WorkflowEdge>();
        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            var nextTargets = edges.Where(e => e.Source == current).Select(e => e.Target);
            foreach (var t in nextTargets)
            {
                if (!reachable.Contains(t))
                {
                    reachable.Add(t);
                    queue.Enqueue(t);
                }
            }
        }

        var unreachableNodes = graph.Nodes.Where(n => !reachable.Contains(n.Id)).Select(n => n.Data.Label ?? n.Id).ToList();
        if (unreachableNodes.Any())
            return (false, $"存在从开始节点不可达的节点: {string.Join(", ", unreachableNodes)}");

        // 4.1 至少存在一条通往结束节点的路径
        var endNodeIds = graph.Nodes.Where(n => n.Data.NodeType == "end").Select(n => n.Id).ToList();
        var hasReachableEnd = endNodeIds.Any(id => reachable.Contains(id));
        if (!hasReachableEnd)
            return (false, "从开始节点无法到达任何结束节点");

        // 3. 检查是否有孤立节点（已经过可达性分析处理）
        foreach (var node in graph.Nodes)
        {
            if (node.Data.NodeType == "start")
            {
                if (!edges.Any(e => e.Source == node.Id))
                    return (false, $"开始节点 {node.Id} 没有出边");
            }
            else if (node.Data.NodeType == "end")
            {
                if (!edges.Any(e => e.Target == node.Id))
                    return (false, $"结束节点 {node.Id} 没有入边");
            }
            else
            {
                if (!edges.Any(e => e.Source == node.Id))
                    return (false, $"节点 {node.Data.Label ?? node.Id} 没有出边");
                if (!edges.Any(e => e.Target == node.Id))
                    return (false, $"节点 {node.Data.Label ?? node.Id} 没有入边");
            }
        }

        // 3.1 特定类型节点的额外规则
        var allowedNodeTypes = new[] { "start", "end", "approval", "condition" };
        foreach (var node in graph.Nodes)
        {
            if (!allowedNodeTypes.Contains(node.Data.NodeType))
            {
                return (false, $"不支持的节点类型: {node.Data.NodeType}");
            }

            if (node.Data.NodeType == "approval")
            {
                // 审批节点必须配置审批信息且审批人规则非空
                var approval = node.Data.Config?.Approval;
                if (approval == null)
                    return (false, $"审批节点 {node.Data.Label ?? node.Id} 缺少审批配置");
                if (approval.Approvers == null || !approval.Approvers.Any())
                    return (false, $"审批节点 {node.Data.Label ?? node.Id} 的审批人规则不能为空");
                if (approval.TimeoutHours.HasValue && approval.TimeoutHours.Value < 0)
                    return (false, $"审批节点 {node.Data.Label ?? node.Id} 的超时时间必须为非负数");
            }
            else if (node.Data.NodeType == "condition")
            {
                var outgoing = edges.Where(e => e.Source == node.Id).ToList();
                if (outgoing.Count == 0)
                    return (false, $"条件节点 {node.Data.Label ?? node.Id} 缺少出边");
                
                var hasDefault = outgoing.Any(e => string.IsNullOrWhiteSpace(e.Data?.Condition));
                var hasConditional = outgoing.Any(e => !string.IsNullOrWhiteSpace(e.Data?.Condition));
                if (!hasConditional && !hasDefault)
                    return (false, $"条件节点 {node.Data.Label ?? node.Id} 的出边需包含条件或默认路径");
            }
        }


        // 5. 循环检查 (可选，某些流程允许循环，但典型的审批流应该是 DAG)

        return (true, null);
    }
}
