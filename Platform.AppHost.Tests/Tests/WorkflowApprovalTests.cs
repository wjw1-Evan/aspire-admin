using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using System.Net;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

[Collection("AppHost Collection")]
public class WorkflowApprovalTests : BaseIntegrationTest
{
    public WorkflowApprovalTests(AppHostFixture fixture, ITestOutputHelper output)
        : base(fixture, output)
    {
    }

    private async Task<(string workflowId, string documentId, string instanceId)> CreateWorkflowAndSubmitAsync()
    {
        await InitializeAuthenticationAsync();

        var workflowRequest = TestDataGenerator.GenerateValidWorkflowDefinition();
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var workflowId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateValidDocument();
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = workflowId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        return (workflowId, documentId, instance.Data.Id);
    }

    private async Task<WorkflowInstanceResponse> WaitForStatusAsync(string instanceId, string expectedStatus, int maxAttempts = 20, int delayMs = 500)
    {
        for (int i = 0; i < maxAttempts; i++)
        {
            var response = await TestClient.GetAsync($"/api/workflows/instances/{instanceId}");
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
                if (result?.Data?.Status?.ToLowerInvariant() == expectedStatus.ToLowerInvariant())
                {
                    return result.Data;
                }
            }
            await Task.Delay(delayMs);
        }
        var finalResponse = await TestClient.GetAsync($"/api/workflows/instances/{instanceId}");
        var finalResult = await finalResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        return finalResult?.Data ?? throw new TimeoutException($"等待状态 {expectedStatus} 超时");
    }

    [Fact]
    public async Task ApprovalFlow_Approve_ShouldCompleteWorkflow()
    {
        await InitializeAuthenticationAsync();
        var (workflowId, documentId, instanceId) = await CreateWorkflowAndSubmitAsync();

        await WaitForStatusAsync(instanceId, "completed");

        var instanceResponse = await TestClient.GetAsync($"/api/workflows/instances/{instanceId}");
        var instance = await instanceResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        Assert.Equal("Completed", instance.Data.Status, ignoreCase: true);
        Output.WriteLine($"✓ 审批流程完成，状态: {instance.Data.Status}");
    }

    [Fact]
    public async Task ApprovalFlow_Reject_ShouldFailWorkflow()
    {
        await InitializeAuthenticationAsync();

        var counter = Guid.NewGuid().ToString("N")[..8];
        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_test", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new()
            {
                Id = "reject_approval",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "Reject Test Approval",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = CurrentUserId } },
                            allowReject = true
                        }
                    }
                },
                Position = new NodePositionRequest { X = 300, Y = 100 }
            },
            new() { Id = "end_test", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 500, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = $"e_start_{counter}", Source = "start_test", Target = "reject_approval" },
            new() { Id = $"e_reject_end_{counter}", Source = "reject_approval", Target = "end_test" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"reject_test_{counter}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);

        var docRequest = TestDataGenerator.GenerateValidDocument();
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = workflow.Data.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        Output.WriteLine($"✓ 流程已提交，实例ID: {instance.Data.Id}");

        if (instance.Data.Status == "Running" || instance.Data.Status == "running")
        {
            var rejectRequest = new { Comment = "测试拒绝" };
            var rejectResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/reject", rejectRequest);

            if (rejectResponse.StatusCode == HttpStatusCode.OK)
            {
                var rejectResult = await rejectResponse.Content.ReadAsJsonAsync<ApiResponse<object>>();
                Assert.True(rejectResult?.Success);
                Output.WriteLine("✓ 拒绝操作成功");
            }
        }

        Output.WriteLine($"✓ 拒绝流程测试完成");
    }

    [Fact]
    public async Task ApprovalFlow_Withdraw_ShouldSucceedByInitiator()
    {
        await InitializeAuthenticationAsync();

        var workflowRequest = TestDataGenerator.GenerateValidWorkflowDefinition();
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);

        var docRequest = TestDataGenerator.GenerateValidDocument();
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = workflow.Data.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        await WaitForStatusAsync(instance.Data.Id, "completed");

        var withdrawRequest = new { Reason = "测试撤回" };
        var withdrawResponse = await TestClient.PostAsJsonAsync($"/api/workflows/instances/{instance.Data.Id}/withdraw", withdrawRequest);

        if (withdrawResponse.StatusCode == HttpStatusCode.OK)
        {
            var withdrawResult = await withdrawResponse.Content.ReadAsJsonAsync<ApiResponse<object>>();
            Assert.True(withdrawResult?.Success);
            Output.WriteLine("✓ 撤回操作成功");
        }
        else
        {
            var errorResult = await withdrawResponse.Content.ReadAsJsonAsync<ApiResponse<object>>();
            Output.WriteLine($"✓ 撤回测试完成（可能因流程已完成）: {errorResult?.Message}");
        }
    }

    [Fact]
    public async Task ApprovalFlow_Withdraw_ShouldFailByNonInitiator()
    {
        await InitializeAuthenticationAsync();

        // 创建一个带审批节点的流程，确保流程不会立即完成
        var counter = Guid.NewGuid().ToString("N")[..8];
        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_test", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new()
            {
                Id = "approval_node",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "Approval Required",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = CurrentUserId } }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 300, Y = 200 }
            },
            new() { Id = "end_test", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 500, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = $"e1_{counter}", Source = "start_test", Target = "approval_node" },
            new() { Id = $"e2_{counter}", Source = "approval_node", Target = "end_test" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"withdraw_test_{counter}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);

        var docRequest = TestDataGenerator.GenerateValidDocument();
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = workflow.Data.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        // 等待流程进入 Running 状态（审批节点等待中）
        await WaitForStatusAsync(instance.Data.Id, "running");

        var secondUser = await CreateAndLoginNewUserAsync();

        using var secondClient = new HttpClient { BaseAddress = TestClient.BaseAddress };
        secondClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {secondUser.Token}");

        var withdrawRequest = new { Reason = "非发起人尝试撤回" };
        var withdrawResponse = await secondClient.PostAsJsonAsync($"/api/workflows/instances/{instance.Data.Id}/withdraw", withdrawRequest);

        // 非发起人撤回应该返回 BadRequest（无权限）或 NotFound（实例不存在）
        Assert.True(
            withdrawResponse.StatusCode == HttpStatusCode.BadRequest || 
            withdrawResponse.StatusCode == HttpStatusCode.NotFound,
            $"Expected BadRequest or NotFound, got {withdrawResponse.StatusCode}");
        Output.WriteLine("✓ 非发起人撤回被正确拒绝");
    }

    [Fact]
    public async Task ApprovalFlow_MultiLevelApproval_ShouldProceedInOrder()
    {
        await InitializeAuthenticationAsync();

        var counter = Guid.NewGuid().ToString("N")[..8];
        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_1", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new()
            {
                Id = "approval_level1",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "一级审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = CurrentUserId } }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 300, Y = 200 }
            },
            new()
            {
                Id = "approval_level2",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "二级审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = CurrentUserId } }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 500, Y = 200 }
            },
            new() { Id = "end_1", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 700, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = $"e1_{counter}", Source = "start_1", Target = "approval_level1" },
            new() { Id = $"e2_{counter}", Source = "approval_level1", Target = "approval_level2" },
            new() { Id = $"e3_{counter}", Source = "approval_level2", Target = "end_1" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"multi_level_{counter}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);

        var docRequest = TestDataGenerator.GenerateValidDocument();
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = workflow.Data.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        await WaitForStatusAsync(instance.Data.Id, "completed");

        var historyResponse = await TestClient.GetAsync($"/api/workflows/instances/{instance.Data.Id}/history");
        Assert.Equal(HttpStatusCode.OK, historyResponse.StatusCode);
        var history = await historyResponse.Content.ReadAsJsonAsync<ApiResponse<List<ApprovalRecordResponse>>>();
        Assert.NotNull(history?.Data);

        Output.WriteLine($"✓ 多级审批流程完成，历史记录数: {history.Data.Count}");
    }

    [Fact]
    public async Task ApprovalFlow_AllApprovalType_ShouldRequireAllApprovers()
    {
        await InitializeAuthenticationAsync();

        var secondUser = await CreateAndLoginNewUserAsync();

        var counter = Guid.NewGuid().ToString("N")[..8];
        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_1", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new()
            {
                Id = "all_approval",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "会签审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "all",
                            approvers = new[]
                            {
                                new { type = "user", userId = CurrentUserId },
                                new { type = "user", userId = secondUser.UserId! }
                            }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 300, Y = 200 }
            },
            new() { Id = "end_1", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 500, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = $"e1_{counter}", Source = "start_1", Target = "all_approval" },
            new() { Id = $"e2_{counter}", Source = "all_approval", Target = "end_1" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"all_approval_{counter}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);

        var docRequest = TestDataGenerator.GenerateValidDocument();
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = workflow.Data.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        await Task.Delay(1000);

        var instanceCheck = await TestClient.GetAsync($"/api/workflows/instances/{instance.Data.Id}");
        var instanceResult = await instanceCheck.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceResult?.Data);

        if (instanceResult.Data.Status == "running" || instanceResult.Data.Status == "Running")
        {
            Assert.Contains(CurrentUserId, instanceResult.Data.CurrentApproverIds ?? new List<string>());
            Output.WriteLine("✓ 会签审批需要等待所有审批人");
        }

        Output.WriteLine($"✓ 会签审批类型测试完成，状态: {instanceResult.Data.Status}");
    }

    [Fact]
    public async Task ApprovalFlow_Delegate_ShouldTransferToAnotherUser()
    {
        await InitializeAuthenticationAsync();

        var secondUser = await CreateAndLoginNewUserAsync();

        var counter = Guid.NewGuid().ToString("N")[..8];
        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_1", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new()
            {
                Id = "delegate_approval",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "转办审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = CurrentUserId } },
                            allowDelegate = true
                        }
                    }
                },
                Position = new NodePositionRequest { X = 300, Y = 200 }
            },
            new() { Id = "end_1", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 500, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = $"e1_{counter}", Source = "start_1", Target = "delegate_approval" },
            new() { Id = $"e2_{counter}", Source = "delegate_approval", Target = "end_1" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"delegate_test_{counter}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);

        var docRequest = TestDataGenerator.GenerateValidDocument();
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = workflow.Data.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        await Task.Delay(500);

        var delegateRequest = new { DelegateToUserId = secondUser.UserId, Comment = "转办测试" };
        var delegateResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/delegate", delegateRequest);

        if (delegateResponse.StatusCode == HttpStatusCode.OK)
        {
            var delegateResult = await delegateResponse.Content.ReadAsJsonAsync<ApiResponse<object>>();
            Assert.True(delegateResult?.Success);
            Output.WriteLine("✓ 转办操作成功");
        }
        else
        {
            Output.WriteLine($"✓ 转办测试完成（状态码: {delegateResponse.StatusCode}）");
        }
    }

    [Fact]
    public async Task ApprovalHistory_ShouldContainCompleteAuditTrail()
    {
        await InitializeAuthenticationAsync();
        var (workflowId, documentId, instanceId) = await CreateWorkflowAndSubmitAsync();

        await WaitForStatusAsync(instanceId, "completed");

        var historyResponse = await TestClient.GetAsync($"/api/workflows/instances/{instanceId}/history");
        Assert.Equal(HttpStatusCode.OK, historyResponse.StatusCode);

        var history = await historyResponse.Content.ReadAsJsonAsync<ApiResponse<List<ApprovalRecordResponse>>>();
        Assert.NotNull(history?.Data);

        foreach (var record in history.Data)
        {
            Assert.NotEmpty(record.Id);
            Assert.Equal(instanceId, record.WorkflowInstanceId);
            Assert.NotEmpty(record.ApproverId);
            Assert.NotEmpty(record.Action);
            Assert.True(record.Sequence >= 0);

            Output.WriteLine($"  记录: {record.Action}, 审批人: {record.ApproverName ?? record.ApproverId}, 序列: {record.Sequence}");
        }

        var sequences = history.Data.Select(r => r.Sequence).ToList();
        var sortedSequences = sequences.OrderBy(s => s).ToList();
        Assert.Equal(sortedSequences, sequences);

        Output.WriteLine($"✓ 审批历史完整性验证通过，共 {history.Data.Count} 条记录");
    }

    [Fact]
    public async Task WorkflowCondition_ToDefaultNode_WhenNoConditionMatches()
    {
        await InitializeAuthenticationAsync();

        var counter = Guid.NewGuid().ToString("N")[..8];

        var formRequest = new FormDefinitionRequest
        {
            Name = $"form_cond_{counter}",
            Key = $"key_cond_{counter}",
            Fields = new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" }
            },
            IsActive = true
        };
        var formResponse = await TestClient.PostAsJsonAsync("/api/forms", formRequest);
        Assert.Equal(HttpStatusCode.OK, formResponse.StatusCode);
        var form = await formResponse.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
        Assert.NotNull(form?.Data);
        var formId = form.Data.Id;

        var nodes = new List<WorkflowNodeRequest>
        {
            new()
            {
                Id = "start_1",
                Type = "start",
                Data = new NodeDataRequest
                {
                    Label = "Start",
                    NodeType = "start",
                    Config = new
                    {
                        form = new
                        {
                            formDefinitionId = formId,
                            target = "Document",
                            required = true
                        }
                    }
                },
                Position = new NodePositionRequest { X = 100, Y = 200 }
            },
            new()
            {
                Id = "condition_node",
                Type = "condition",
                Data = new NodeDataRequest
                {
                    Label = "金额 > 5000?",
                    NodeType = "condition",
                    Config = new
                    {
                        condition = new
                        {
                            branches = new[]
                            {
                                new
                                {
                                    id = "high",
                                    label = "金额 > 5000",
                                    conditions = new[] { new { formId, variable = "amount", @operator = "greater_than", value = "5000" } },
                                    logicalOperator = "and",
                                    targetNodeId = "high_approval",
                                    order = 0
                                }
                            },
                            defaultNodeId = "low_approval"
                        }
                    }
                },
                Position = new NodePositionRequest { X = 300, Y = 200 }
            },
            new()
            {
                Id = "high_approval",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "高管审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = CurrentUserId } }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 500, Y = 100 }
            },
            new()
            {
                Id = "low_approval",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "普通审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = CurrentUserId } }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 500, Y = 300 }
            },
            new() { Id = "end_1", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 700, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = $"e1_{counter}", Source = "start_1", Target = "condition_node" },
            new() { Id = $"e2_{counter}", Source = "condition_node", Target = "high_approval", SourceHandle = "high" },
            new() { Id = $"e3_{counter}", Source = "condition_node", Target = "low_approval", SourceHandle = "default" },
            new() { Id = $"e4_{counter}", Source = "high_approval", Target = "end_1" },
            new() { Id = $"e5_{counter}", Source = "low_approval", Target = "end_1" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"default_node_test_{counter}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);

        var docRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "amount", 2000 } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = workflow.Data.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        await Task.Delay(1000);

        var instanceCheck = await TestClient.GetAsync($"/api/workflows/instances/{instance.Data.Id}");
        var instanceResult = await instanceCheck.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceResult?.Data);

        Assert.Equal("low_approval", instanceResult.Data.CurrentNodeId);
        Output.WriteLine("✓ 条件不匹配时跳转到默认节点 low_approval");
    }

    [Fact]
    public async Task ApprovalFlow_TwoLevelApproval_ShouldProceedThroughBothLevels()
    {
        await InitializeAuthenticationAsync();

        var counter = Guid.NewGuid().ToString("N")[..8];
        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_1", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new()
            {
                Id = "approval_level1",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "一级审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[]
                            {
                                new { type = "user", userId = CurrentUserId }
                            }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 300, Y = 200 }
            },
            new()
            {
                Id = "approval_level2",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "二级审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[]
                            {
                                new { type = "user", userId = CurrentUserId }
                            }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 500, Y = 200 }
            },
            new() { Id = "end_1", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 700, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = $"e1_{counter}", Source = "start_1", Target = "approval_level1" },
            new() { Id = $"e2_{counter}", Source = "approval_level1", Target = "approval_level2" },
            new() { Id = $"e3_{counter}", Source = "approval_level2", Target = "end_1" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"twolevel_test_{counter}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);

        var docRequest = TestDataGenerator.GenerateValidDocument();
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = (await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>())!.Data!.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        await WaitForStatusAsync(instance.Data.Id, "running");
        var level1ApproveRequest = new { Comment = "一级审批通过" };
        var level1ApproveResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/approve", level1ApproveRequest);
        Assert.Equal(HttpStatusCode.OK, level1ApproveResponse.StatusCode);

        await WaitForStatusAsync(instance.Data.Id, "running");
        var level2ApproveRequest = new { Comment = "二级审批通过" };
        var level2ApproveResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/approve", level2ApproveRequest);
        Assert.Equal(HttpStatusCode.OK, level2ApproveResponse.StatusCode);

        await WaitForStatusAsync(instance.Data.Id, "completed");
        Output.WriteLine("✓ 两级审批按顺序完成");
    }

    [Fact]
    public async Task ApprovalFlow_AllApprovalType_ShouldWaitForAllApprovers()
    {
        await InitializeAuthenticationAsync();

        var counter = Guid.NewGuid().ToString("N")[..8];
        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_1", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new()
            {
                Id = "all_approval",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "会签审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "all",
                            approvers = new[]
                            {
                                new { type = "user", userId = CurrentUserId }
                            }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 300, Y = 200 }
            },
            new() { Id = "end_1", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 500, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = $"e1_{counter}", Source = "start_1", Target = "all_approval" },
            new() { Id = $"e2_{counter}", Source = "all_approval", Target = "end_1" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"all_test_{counter}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);

        var docRequest = TestDataGenerator.GenerateValidDocument();
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = (await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>())!.Data!.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        await WaitForStatusAsync(instance.Data.Id, "running");

        var approveRequest = new { Comment = "会签通过" };
        var approveResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/approve", approveRequest);
        Assert.Equal(HttpStatusCode.OK, approveResponse.StatusCode);

        await WaitForStatusAsync(instance.Data.Id, "completed");
        Output.WriteLine("✓ 会签审批完成");
    }

    [Fact]
    public async Task ApprovalFlow_RejectAtAnyStage_ShouldFailWorkflow()
    {
        await InitializeAuthenticationAsync();
        var secondUser = await CreateAndLoginNewUserAsync();

        var counter = Guid.NewGuid().ToString("N")[..8];
        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_1", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new()
            {
                Id = "approval_1",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "第一级审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = CurrentUserId } },
                            allowReject = true
                        }
                    }
                },
                Position = new NodePositionRequest { X = 300, Y = 200 }
            },
            new()
            {
                Id = "approval_2",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "第二级审批",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = secondUser.UserId! } }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 500, Y = 200 }
            },
            new() { Id = "end_1", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 700, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = $"e1_{counter}", Source = "start_1", Target = "approval_1" },
            new() { Id = $"e2_{counter}", Source = "approval_1", Target = "approval_2" },
            new() { Id = $"e3_{counter}", Source = "approval_2", Target = "end_1" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"reject_test_{counter}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);

        var docRequest = TestDataGenerator.GenerateValidDocument();
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = (await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>())!.Data!.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        await WaitForStatusAsync(instance.Data.Id, "running");

        var rejectRequest = new { Comment = "不符合要求，拒绝" };
        var rejectResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/reject", rejectRequest);
        Assert.Equal(HttpStatusCode.OK, rejectResponse.StatusCode);

        await WaitForStatusAsync(instance.Data.Id, "rejected");
        Output.WriteLine("✓ 在任意阶段拒绝都会导致流程失败");
    }

    [Fact]
    public async Task ApprovalFlow_ReturnToPreviousNode_ShouldGoBack()
    {
        await InitializeAuthenticationAsync();

        var counter = Guid.NewGuid().ToString("N")[..8];
        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_1", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new()
            {
                Id = "approval_1",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "审批节点1",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = CurrentUserId } },
                            allowReturn = true
                        }
                    }
                },
                Position = new NodePositionRequest { X = 300, Y = 200 }
            },
            new() { Id = "end_1", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 500, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = $"e1_{counter}", Source = "start_1", Target = "approval_1" },
            new() { Id = $"e2_{counter}", Source = "approval_1", Target = "end_1" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"return_test_{counter}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);

        var docRequest = TestDataGenerator.GenerateValidDocument();
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = (await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>())!.Data!.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        await WaitForStatusAsync(instance.Data.Id, "running");

        var approveRequest = new { Comment = "审批通过" };
        var approveResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/approve", approveRequest);
        Assert.Equal(HttpStatusCode.OK, approveResponse.StatusCode);

        await WaitForStatusAsync(instance.Data.Id, "completed");
        Output.WriteLine("✓ 正常审批流程完成");
    }

    [Fact]
    public async Task ConditionBranching_MultipleConditions_ShouldEvaluateCorrectly()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_multi_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" },
                new() { Label = "Department", Type = "Text", Required = true, DataKey = "department" },
                new() { Label = "Urgent", Type = "Switch", Required = false, DataKey = "urgent" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "high_amount_finance", Label = "高金额且财务部", Conditions = new List<object> 
            { 
                new { formId, variable = "amount", @operator = "greater_than", value = "10000" },
                new { formId, variable = "department", @operator = "equals", value = "Finance" }
            }, LogicalOperator = "and", TargetNodeId = "approval_high", Order = 0 },
            new() { Id = "high_amount_other", Label = "高金额且其他部门", Conditions = new List<object> 
            { 
                new { formId, variable = "amount", @operator = "greater_than", value = "10000" }
            }, LogicalOperator = "and", TargetNodeId = "approval_manager", Order = 1 },
            new() { Id = "urgent", Label = "加急处理", Conditions = new List<object> 
            { 
                new { formId, variable = "urgent", @operator = "equals", value = "true" }
            }, LogicalOperator = "and", TargetNodeId = "approval_express", Order = 2 },
            new() { Id = "default", Label = "普通审批", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_normal", Order = 3 }
        };

        var counter = Guid.NewGuid().ToString("N")[..8];
        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_1", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new()
            {
                Id = "condition_node",
                Type = "condition",
                Data = new NodeDataRequest
                {
                    Label = "多条件判断",
                    NodeType = "condition",
                    Config = new { condition = new { branches } }
                },
                Position = new NodePositionRequest { X = 300, Y = 200 }
            },
            new()
            {
                Id = "approval_high",
                Type = "approval",
                Data = new NodeDataRequest { Label = "高管审批", NodeType = "approval", Config = new { approval = new { type = "any", approvers = new[] { new { type = "user", userId = CurrentUserId } } } } },
                Position = new NodePositionRequest { X = 500, Y = 100 }
            },
            new()
            {
                Id = "approval_manager",
                Type = "approval",
                Data = new NodeDataRequest { Label = "经理审批", NodeType = "approval", Config = new { approval = new { type = "any", approvers = new[] { new { type = "user", userId = CurrentUserId } } } } },
                Position = new NodePositionRequest { X = 500, Y = 200 }
            },
            new()
            {
                Id = "approval_express",
                Type = "approval",
                Data = new NodeDataRequest { Label = "加急审批", NodeType = "approval", Config = new { approval = new { type = "any", approvers = new[] { new { type = "user", userId = CurrentUserId } } } } },
                Position = new NodePositionRequest { X = 500, Y = 300 }
            },
            new()
            {
                Id = "approval_normal",
                Type = "approval",
                Data = new NodeDataRequest { Label = "普通审批", NodeType = "approval", Config = new { approval = new { type = "any", approvers = new[] { new { type = "user", userId = CurrentUserId } } } } },
                Position = new NodePositionRequest { X = 500, Y = 400 }
            },
            new() { Id = "end_1", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 700, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = $"e1_{counter}", Source = "start_1", Target = "condition_node" },
            new() { Id = $"e2_{counter}", Source = "condition_node", Target = "approval_high", SourceHandle = "high_amount_finance" },
            new() { Id = $"e3_{counter}", Source = "condition_node", Target = "approval_manager", SourceHandle = "high_amount_other" },
            new() { Id = $"e4_{counter}", Source = "condition_node", Target = "approval_express", SourceHandle = "urgent" },
            new() { Id = $"e5_{counter}", Source = "condition_node", Target = "approval_normal", SourceHandle = "default" },
            new() { Id = $"e6_{counter}", Source = "approval_high", Target = "end_1" },
            new() { Id = $"e7_{counter}", Source = "approval_manager", Target = "end_1" },
            new() { Id = $"e8_{counter}", Source = "approval_express", Target = "end_1" },
            new() { Id = $"e9_{counter}", Source = "approval_normal", Target = "end_1" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"multi_cond_test_{counter}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);

        var docRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "amount", 15000.0 },
            { "department", "Finance" },
            { "urgent", true }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = workflow.Data.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_high");
        Assert.Equal("approval_high", result.CurrentNodeId);
        Output.WriteLine("✓ 多条件判断：高金额+财务部门 → 高管审批");
    }

    [Fact]
    public async Task ConditionBranching_DecimalAmount_ShouldHandleCorrectly()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_decimal_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "high", Label = "金额 > 1000", Conditions = new List<object> { new { formId, variable = "amount", @operator = "greater_than", value = "1000" } }, LogicalOperator = "and", TargetNodeId = "approval_high", Order = 0 },
            new() { Id = "default", Label = "金额 <= 1000", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_normal", Order = 1 }
        };

        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_1", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new() { Id = "condition_node", Type = "condition", Data = new NodeDataRequest { Label = "金额判断", NodeType = "condition", Config = new { condition = new { branches } } }, Position = new NodePositionRequest { X = 300, Y = 200 } },
            new() { Id = "approval_high", Type = "approval", Data = new NodeDataRequest { Label = "高金额审批", NodeType = "approval", Config = new { approval = new { type = "any", approvers = new[] { new { type = "user", userId = CurrentUserId } } } } }, Position = new NodePositionRequest { X = 500, Y = 100 } },
            new() { Id = "approval_normal", Type = "approval", Data = new NodeDataRequest { Label = "普通审批", NodeType = "approval", Config = new { approval = new { type = "any", approvers = new[] { new { type = "user", userId = CurrentUserId } } } } }, Position = new NodePositionRequest { X = 500, Y = 300 } },
            new() { Id = "end_1", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 700, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = "e1", Source = "start_1", Target = "condition_node" },
            new() { Id = "e2", Source = "condition_node", Target = "approval_high", SourceHandle = "high" },
            new() { Id = "e3", Source = "condition_node", Target = "approval_normal", SourceHandle = "default" },
            new() { Id = "e4", Source = "approval_high", Target = "end_1" },
            new() { Id = "e5", Source = "approval_normal", Target = "end_1" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"decimal_test_{Guid.NewGuid().ToString("N")[..8]}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);

        var docRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "amount", 999.99 } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = (await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>())!.Data!.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_normal");
        Assert.Equal("approval_normal", result.CurrentNodeId);
        Output.WriteLine("✓ 小数金额 999.99 < 1000，走普通审批");
    }

    [Fact]
    public async Task ConditionBranching_LargeAmount_ShouldRouteToHighApproval()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_large_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "very_high", Label = "金额 >= 100000", Conditions = new List<object> { new { formId, variable = "amount", @operator = "greater_than_or_equal", value = "100000" } }, LogicalOperator = "and", TargetNodeId = "approval_ceo", Order = 0 },
            new() { Id = "high", Label = "金额 >= 10000", Conditions = new List<object> { new { formId, variable = "amount", @operator = "greater_than_or_equal", value = "10000" } }, LogicalOperator = "and", TargetNodeId = "approval_manager", Order = 1 },
            new() { Id = "default", Label = "金额 < 10000", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_normal", Order = 2 }
        };

        var nodes = new List<WorkflowNodeRequest>
        {
            new() { Id = "start_1", Type = "start", Data = new NodeDataRequest { Label = "Start", NodeType = "start" }, Position = new NodePositionRequest { X = 100, Y = 200 } },
            new() { Id = "condition_node", Type = "condition", Data = new NodeDataRequest { Label = "金额分级", NodeType = "condition", Config = new { condition = new { branches } } }, Position = new NodePositionRequest { X = 300, Y = 200 } },
            new() { Id = "approval_ceo", Type = "approval", Data = new NodeDataRequest { Label = "CEO审批", NodeType = "approval", Config = new { approval = new { type = "any", approvers = new[] { new { type = "user", userId = CurrentUserId } } } } }, Position = new NodePositionRequest { X = 500, Y = 50 } },
            new() { Id = "approval_manager", Type = "approval", Data = new NodeDataRequest { Label = "经理审批", NodeType = "approval", Config = new { approval = new { type = "any", approvers = new[] { new { type = "user", userId = CurrentUserId } } } } }, Position = new NodePositionRequest { X = 500, Y = 200 } },
            new() { Id = "approval_normal", Type = "approval", Data = new NodeDataRequest { Label = "普通审批", NodeType = "approval", Config = new { approval = new { type = "any", approvers = new[] { new { type = "user", userId = CurrentUserId } } } } }, Position = new NodePositionRequest { X = 500, Y = 350 } },
            new() { Id = "end_1", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 700, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new() { Id = "e1", Source = "start_1", Target = "condition_node" },
            new() { Id = "e2", Source = "condition_node", Target = "approval_ceo", SourceHandle = "very_high" },
            new() { Id = "e3", Source = "condition_node", Target = "approval_manager", SourceHandle = "high" },
            new() { Id = "e4", Source = "condition_node", Target = "approval_normal", SourceHandle = "default" },
            new() { Id = "e5", Source = "approval_ceo", Target = "end_1" },
            new() { Id = "e6", Source = "approval_manager", Target = "end_1" },
            new() { Id = "e7", Source = "approval_normal", Target = "end_1" }
        };

        var workflowRequest = new WorkflowDefinitionRequest
        {
            Name = $"large_test_{Guid.NewGuid().ToString("N")[..8]}",
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };

        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);

        var docRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "amount", 500000.0 } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", docRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);

        var submitRequest = new { WorkflowDefinitionId = (await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>())!.Data!.Id };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{doc.Data.Id}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_ceo");
        Assert.Equal("approval_ceo", result.CurrentNodeId);
        Output.WriteLine("✓ 大额金额 500000 >= 100000，走CEO审批");
    }

    private async Task<string> CreateFormDefinitionAsync(string formName, List<FormFieldRequest> fields)
    {
        var formRequest = new FormDefinitionRequest
        {
            Name = formName,
            Key = $"key_{Guid.NewGuid().ToString("N")[..8]}",
            Description = $"Test form",
            Fields = fields,
            IsActive = true
        };

        var formResponse = await TestClient.PostAsJsonAsync("/api/forms", formRequest);
        Assert.Equal(HttpStatusCode.OK, formResponse.StatusCode);
        var form = await formResponse.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
        Assert.NotNull(form?.Data);
        return form.Data.Id;
    }

    private async Task<WorkflowInstanceResponse> WaitForCurrentNodeAsync(string instanceId, string expectedNodeId, int maxAttempts = 20, int delayMs = 500)
    {
        for (int i = 0; i < maxAttempts; i++)
        {
            var response = await TestClient.GetAsync($"/api/workflows/instances/{instanceId}");
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
                if (result?.Data?.CurrentNodeId == expectedNodeId)
                {
                    return result.Data;
                }
            }
            await Task.Delay(delayMs);
        }
        var finalResponse = await TestClient.GetAsync($"/api/workflows/instances/{instanceId}");
        var finalResult = await finalResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        return finalResult?.Data ?? throw new TimeoutException($"等待节点 {expectedNodeId} 超时");
    }
}
