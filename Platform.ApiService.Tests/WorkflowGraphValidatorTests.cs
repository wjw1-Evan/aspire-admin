// 文件说明：
// 本测试覆盖工作流图校验器的多种规则，包括：
// 1) 节点/边的唯一性与有效性；
// 2) 起始/结束节点的连通性要求；
// 3) 审批/并行/条件节点的配置合法性与分支一致性；
// 4) 可达性检查确保从 start 到 end 的路径存在。
using System.Collections.Generic;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Xunit;

namespace Platform.ApiService.Tests;

public class WorkflowGraphValidatorTests
{
    private readonly IWorkflowGraphValidator _validator = new WorkflowGraphValidator();

    [Fact]
    public void DuplicateNodeIds_Should_Fail()
    {
        // 场景：存在重复的节点 ID，应校验失败并返回中文错误信息
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "A", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U" } } } } },
                new WorkflowNode { Id = "A", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U" } } } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "A" },
                new WorkflowEdge { Id = "e2", Source = "A", Target = "end" },
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.False(ok);
        Assert.Contains("重复的节点ID", err);
    }

    [Fact]
    public void DuplicateEdges_Should_Fail()
    {
        // 场景：同源同目标且条件相同的重复边，应校验失败
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "A", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U1" } } } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "A", Condition = "x > 1" },
                new WorkflowEdge { Id = "e2", Source = "start", Target = "A", Condition = "x > 1" },
                new WorkflowEdge { Id = "e3", Source = "A", Target = "end" },
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.False(ok);
        Assert.Contains("存在重复的连接线", err);
    }

    [Fact]
    public void Edge_TargetMissing_Should_Fail()
    {
        // 场景：边指向不存在的目标节点，应校验失败
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "A", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U1" } } } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "Z" },
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.False(ok);
        Assert.Contains("目标节点不存在", err);
    }

    [Fact]
    public void StartNode_NoOutgoing_Should_Fail()
    {
        // 场景：开始节点没有出边，表示流程无法推进，应失败
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>()
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.False(ok);
        Assert.Contains("开始节点 start 没有出边", err);
    }

    [Fact]
    public void EndNode_NoIncoming_Should_Fail()
    {
        // 场景：结束节点不可作为自身的源与目标（自环），应校验失败
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "start" },
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.False(ok);
        Assert.Contains("源和目标节点不能相同", err);
    }

    [Fact]
    public void Approval_NegativeTimeout_Should_Fail()
    {
        // 场景：审批节点配置非法（超时为负数），应校验失败
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "A", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U1" } }, TimeoutHours = -1 } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "A" },
                new WorkflowEdge { Id = "e2", Source = "A", Target = "end" },
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.False(ok);
        Assert.Contains("超时时间必须为非负数", err);
    }

    [Fact]
    public void Parallel_BranchesMismatch_Should_Fail()
    {
        // 场景：并行节点配置的分支数与实际出边数量不一致，应校验失败
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "P", Type = "parallel", Config = new NodeConfig { Parallel = new ParallelConfig { Branches = new List<string>{ "B1", "B2", "B3" } } } },
                new WorkflowNode { Id = "B1", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U1" } } } } },
                new WorkflowNode { Id = "B2", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U2" } } } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "P" },
                new WorkflowEdge { Id = "e2", Source = "P", Target = "B1" },
                new WorkflowEdge { Id = "e3", Source = "P", Target = "B2" },
                new WorkflowEdge { Id = "e4", Source = "B1", Target = "end" },
                new WorkflowEdge { Id = "e5", Source = "B2", Target = "end" },
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.False(ok);
        Assert.Contains("分支配置与出边不一致", err);
    }

    [Fact]
    public void Condition_OnlyConditionalEdges_Should_Pass()
    {
        // 场景：条件节点所有出边均带条件，且图结构连通，应校验通过
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "C", Type = "condition", Config = new NodeConfig { Condition = new ConditionConfig { Expression = "x > 0" } } },
                new WorkflowNode { Id = "A1", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U1" } } } } },
                new WorkflowNode { Id = "A2", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U2" } } } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "C" },
                new WorkflowEdge { Id = "e2", Source = "C", Target = "A1", Condition = "x > 10" },
                new WorkflowEdge { Id = "e3", Source = "C", Target = "A2", Condition = "x <= 10" },
                new WorkflowEdge { Id = "e4", Source = "A1", Target = "end" },
                new WorkflowEdge { Id = "e5", Source = "A2", Target = "end" },
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.True(ok);
        Assert.Null(err);
    }

    [Fact]
    public void EndNotReachable_Should_Fail()
    {
        // 场景：从开始到审批节点后无路径到达结束节点，应被判定为不可达错误
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "A", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U" } } } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "A" },
                // 无从 A 到 end 的路径
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.False(ok);
        Assert.Contains("节点 A 没有出边", err);
    }

    [Fact]
    public void Simple_AnyApproval_Should_Pass()
    {
        // 场景：任意审批（Any）且图结构正确，应校验通过
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "A", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Type = ApprovalType.Any, Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U1" } } } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "A" },
                new WorkflowEdge { Id = "e2", Source = "A", Target = "end" },
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.True(ok);
        Assert.Null(err);
    }

    [Fact]
    public void ApprovalNode_MissingApprovers_Should_Fail()
    {
        // 场景：审批节点缺少审批人规则，应校验失败
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "A", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>() } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "A" },
                new WorkflowEdge { Id = "e2", Source = "A", Target = "end" },
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.False(ok);
        Assert.Contains("审批人规则不能为空", err);
    }

    [Fact]
    public void ParallelNode_Must_Have_TwoOutgoingEdges()
    {
        // 场景：并行节点至少需要两个出边，少于两个应失败
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "P", Type = "parallel", Config = new NodeConfig { Parallel = new ParallelConfig { Branches = new List<string>{ "B1", "B2" } } } },
                new WorkflowNode { Id = "B1", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U1" } } } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "P" },
                new WorkflowEdge { Id = "e2", Source = "P", Target = "B1" },
                new WorkflowEdge { Id = "e3", Source = "B1", Target = "end" },
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.False(ok);
        Assert.Contains("至少需要两个出边", err);
    }

    [Fact]
    public void ConditionNode_With_DefaultEdge_Should_Pass()
    {
        // 场景：条件节点包含默认路径（无条件边）与另一条条件边，仍可通过校验
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "C", Type = "condition", Config = new NodeConfig { Condition = new ConditionConfig { Expression = "amount > 100" } } },
                new WorkflowNode { Id = "A1", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U1" } } } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "C" },
                new WorkflowEdge { Id = "e2", Source = "C", Target = "A1", Condition = "amount > 100" },
                new WorkflowEdge { Id = "e3", Source = "C", Target = "end" }, // 默认路径
                new WorkflowEdge { Id = "e4", Source = "A1", Target = "end" },
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.True(ok);
        Assert.Null(err);
    }

    [Fact]
    public void UnreachableNode_Should_Fail()
    {
        // 场景：存在孤立（不可达）节点，应校验失败并给出提示
        var graph = new WorkflowGraph
        {
            Nodes = new List<WorkflowNode>
            {
                new WorkflowNode { Id = "start", Type = "start" },
                new WorkflowNode { Id = "A", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U" } } } } },
                new WorkflowNode { Id = "X", Type = "approval", Config = new NodeConfig { Approval = new ApprovalConfig { Approvers = new List<ApproverRule>{ new ApproverRule{ Type = ApproverType.User, UserId = "U2" } } } } },
                new WorkflowNode { Id = "end", Type = "end" }
            },
            Edges = new List<WorkflowEdge>
            {
                new WorkflowEdge { Id = "e1", Source = "start", Target = "A" },
                new WorkflowEdge { Id = "e2", Source = "A", Target = "end" },
                // X 无法到达
            }
        };

        var (ok, err) = _validator.Validate(graph);
        Assert.False(ok);
        Assert.Contains("节点 X 没有出边", err);
    }
}
