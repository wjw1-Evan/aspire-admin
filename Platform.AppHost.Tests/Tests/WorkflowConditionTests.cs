using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using System.Net;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

[Collection("AppHost Collection")]
public class WorkflowConditionTests : BaseIntegrationTest
{
    public WorkflowConditionTests(AppHostFixture fixture, ITestOutputHelper output)
        : base(fixture, output)
    {
    }

    private async Task<string> CreateFormDefinitionAsync(string formName, List<FormFieldRequest> fields)
    {
        await InitializeAuthenticationAsync();
        var formRequest = new FormDefinitionRequest
        {
            Name = formName,
            Key = $"key_{Guid.NewGuid().ToString("N")[..8]}",
            Description = $"Test form for condition testing",
            Fields = fields,
            IsActive = true
        };

        var formResponse = await TestClient.PostAsJsonAsync("/api/forms", formRequest);
        Assert.Equal(HttpStatusCode.OK, formResponse.StatusCode);
        var form = await formResponse.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
        Assert.NotNull(form?.Data);
        return form.Data.Id;
    }

    private WorkflowDefinitionRequest CreateWorkflowWithCondition(
        string formDefinitionId,
        string conditionLabel,
        List<ConditionBranch> branches,
        string? approverId = null)
    {
        var counter = Guid.NewGuid().ToString("N")[..8];
        var name = $"workflow_cond_{counter}";
        approverId ??= CurrentUserId;

        var nodes = new List<WorkflowNodeRequest>
        {
            new WorkflowNodeRequest
            {
                Id = "start",
                Type = "start",
                Data = new NodeDataRequest
                {
                    Label = "Start",
                    NodeType = "start",
                    Config = new
                    {
                        form = new
                        {
                            formDefinitionId = formDefinitionId,
                            target = "Document",
                            required = true
                        }
                    }
                },
                Position = new NodePositionRequest { X = 100, Y = 200 }
            },
            new WorkflowNodeRequest
            {
                Id = "condition_node",
                Type = "condition",
                Data = new NodeDataRequest
                {
                    Label = conditionLabel,
                    NodeType = "condition",
                    Config = new
                    {
                        condition = new
                        {
                            branches = branches.Select(b => new
                            {
                                id = b.Id,
                                label = b.Label,
                                conditions = b.Conditions,
                                logicalOperator = b.LogicalOperator,
                                targetNodeId = b.TargetNodeId,
                                order = b.Order
                            }).ToList(),
                            defaultNodeId = "approval_default"
                        }
                    }
                },
                Position = new NodePositionRequest { X = 400, Y = 200 }
            },
            new WorkflowNodeRequest
            {
                Id = "approval_a",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "Approval A",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = approverId } }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 700, Y = 100 }
            },
            new WorkflowNodeRequest
            {
                Id = "approval_b",
                Type = "approval",
                Data = new NodeDataRequest
                {
                    Label = "Approval B",
                    NodeType = "approval",
                    Config = new
                    {
                        approval = new
                        {
                            type = "any",
                            approvers = new[] { new { type = "user", userId = approverId } }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 700, Y = 300 }
            },
            new WorkflowNodeRequest { Id = "end", Type = "end", Data = new NodeDataRequest { Label = "End", NodeType = "end" }, Position = new NodePositionRequest { X = 1000, Y = 200 } }
        };

        var edges = new List<WorkflowEdgeRequest>
        {
            new WorkflowEdgeRequest { Id = "e1", Source = "start", Target = "condition_node" },
            new WorkflowEdgeRequest { Id = "e2", Source = "condition_node", Target = "approval_a", SourceHandle = "branch_true" },
            new WorkflowEdgeRequest { Id = "e3", Source = "condition_node", Target = "approval_b" },
            new WorkflowEdgeRequest { Id = "e4", Source = "approval_a", Target = "end" },
            new WorkflowEdgeRequest { Id = "e5", Source = "approval_b", Target = "end" }
        };

        return new WorkflowDefinitionRequest
        {
            Name = name,
            Category = "Testing",
            Graph = new WorkflowGraphRequest { Nodes = nodes, Edges = edges },
            IsActive = true
        };
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
                if (result?.Data?.Status == "completed" || result?.Data?.Status == "Completed")
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

    [Fact]
    public async Task ConditionBranching_AmountGreaterThan1000_ShouldGoToApprovalA()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_amount_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "金额 > 1000", Conditions = new List<object> { new { formId, variable = "amount", @operator = "greater_than", value = "1000" } }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "金额 <= 1000", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "金额 > 1000?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "amount", 2000 } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_a");
        Assert.Equal("approval_a", result.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=2000 > 1000 = true，流程进入 approval_a");
    }

    [Fact]
    public async Task ConditionBranching_AmountLessThanOrEqualTo1000_ShouldGoToApprovalB()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_amount_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "金额 > 1000", Conditions = new List<object> { new { formId, variable = "amount", @operator = "greater_than", value = "1000" } }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "金额 <= 1000", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "金额 > 1000?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "amount", 500 } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_b");
        Assert.Equal("approval_b", result.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=500 > 1000 = false，流程进入 approval_b");
    }

    [Fact]
    public async Task ConditionBranching_AmountEqualTo1000_ShouldGoToApprovalB()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_amount_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "金额 > 1000", Conditions = new List<object> { new { formId, variable = "amount", @operator = "greater_than", value = "1000" } }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "金额 <= 1000", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "金额 > 1000?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "amount", 1000 } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_b");
        Assert.Equal("approval_b", result.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=1000 > 1000 = false（边界值），流程进入 approval_b");
    }

    [Fact]
    public async Task ConditionBranching_AmountZero_ShouldGoToApprovalB()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_amount_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "金额 > 1000", Conditions = new List<object> { new { formId, variable = "amount", @operator = "greater_than", value = "1000" } }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "金额 <= 1000", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "金额 > 1000?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "amount", 0 } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_b");
        Assert.Equal("approval_b", result.CurrentNodeId);
        Output.WriteLine($"✓ 边界条件：amount=0 不满足 > 1000，流程进入 approval_b");
    }

    [Fact]
    public async Task ConditionBranching_NegativeAmount_ShouldGoToApprovalB()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_amount_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "金额 > 1000", Conditions = new List<object> { new { formId, variable = "amount", @operator = "greater_than", value = "1000" } }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "金额 <= 1000", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "金额 > 1000?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "amount", -500 } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_b");
        Assert.Equal("approval_b", result.CurrentNodeId);
        Output.WriteLine($"✓ 边界条件：amount=-500 不满足 > 1000，流程进入 approval_b");
    }

    [Fact]
    public async Task ConditionBranching_MultipleConditionsAND_AllMatch_ShouldGoToApprovalA()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_multi_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" },
                new() { Label = "Department", Type = "Text", Required = true, DataKey = "department" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "金额 > 1000 且 部门 = Finance", Conditions = new List<object>
            {
                new { formId, variable = "amount", @operator = "greater_than", value = "1000" },
                new { formId, variable = "department", @operator = "equals", value = "Finance" }
            }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "其他情况", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "金额 > 1000 且 部门 = Finance?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "amount", 5000 },
            { "department", "Finance" }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_a");
        Assert.Equal("approval_a", result.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=5000 > 1000 && department=Finance = true，流程进入 approval_a");
    }

    [Fact]
    public async Task ConditionBranching_MultipleConditionsAND_PartialMatch_ShouldGoToApprovalB()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_multi_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" },
                new() { Label = "Department", Type = "Text", Required = true, DataKey = "department" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "金额 > 1000 且 部门 = Finance", Conditions = new List<object>
            {
                new { formId, variable = "amount", @operator = "greater_than", value = "1000" },
                new { formId, variable = "department", @operator = "equals", value = "Finance" }
            }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "其他情况", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "金额 > 1000 且 部门 = Finance?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "amount", 5000 },
            { "department", "IT" }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_b");
        Assert.Equal("approval_b", result.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=5000 > 1000 && department=IT = false，流程进入 approval_b");
    }

    [Fact]
    public async Task ConditionBranching_MultipleConditionsOR_AnyMatch_ShouldGoToApprovalA()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_or_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" },
                new() { Label = "IsUrgent", Type = "Text", Required = true, DataKey = "isUrgent" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "金额 > 1000 或 紧急", Conditions = new List<object>
            {
                new { formId, variable = "amount", @operator = "greater_than", value = "1000" },
                new { formId, variable = "isUrgent", @operator = "equals", value = "true" }
            }, LogicalOperator = "or", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "其他情况", Conditions = new List<object>(), LogicalOperator = "or", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "金额 > 1000 或 紧急?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "amount", 500 },
            { "isUrgent", "true" }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_a");
        Assert.Equal("approval_a", result.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=500 > 1000 || isUrgent=true = true，流程进入 approval_a");
    }

    [Fact]
    public async Task ConditionBranching_StringComparison_Equals_ShouldGoToApprovalA()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_string_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Department", Type = "Text", Required = true, DataKey = "department" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "部门 = Finance", Conditions = new List<object> { new { formId, variable = "department", @operator = "equals", value = "Finance" } }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "其他部门", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "部门 = Finance?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "department", "Finance" } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_a");
        Assert.Equal("approval_a", result.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：department=Finance = true，流程进入 approval_a");
    }

    [Fact]
    public async Task ConditionBranching_StringComparison_NotEquals_ShouldGoToApprovalB()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_string_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Department", Type = "Text", Required = true, DataKey = "department" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "部门 = Finance", Conditions = new List<object> { new { formId, variable = "department", @operator = "equals", value = "Finance" } }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "其他部门", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "部门 = Finance?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "department", "IT" } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_b");
        Assert.Equal("approval_b", result.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：department=IT != Finance = false，流程进入 approval_b");
    }

    [Fact]
    public async Task ConditionBranching_EmptyString_ShouldGoToApprovalB()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_string_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Department", Type = "Text", Required = true, DataKey = "department" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "部门 = Finance", Conditions = new List<object> { new { formId, variable = "department", @operator = "equals", value = "Finance" } }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "其他部门", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "部门 = Finance?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "department", "" } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_b");
        Assert.Equal("approval_b", result.CurrentNodeId);
        Output.WriteLine($"✓ 边界条件：空字符串 != Finance，流程进入 approval_b");
    }

    [Fact]
    public async Task ConditionBranching_DefaultNode_ShouldJumpToDefaultNode()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_default_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "金额 > 5000", Conditions = new List<object> { new { formId, variable = "amount", @operator = "greater_than", value = "5000" } }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "金额 > 5000?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "amount", 2000 } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_b");
        Assert.Equal("approval_b", result.CurrentNodeId);
        Output.WriteLine($"✓ 默认分支：amount=2000 不满足 > 5000，流程进入默认分支 approval_b");
    }

    [Fact]
    public async Task ConditionBranching_FormDataPriority_ShouldUseFormData()
    {
        await InitializeAuthenticationAsync();

        var formId = await CreateFormDefinitionAsync($"form_priority_{Guid.NewGuid().ToString("N")[..8]}",
            new List<FormFieldRequest>
            {
                new() { Label = "Amount", Type = "Number", Required = true, DataKey = "amount" }
            });

        var branches = new List<ConditionBranch>
        {
            new() { Id = "branch_true", Label = "金额 > 1000", Conditions = new List<object> { new { formId, variable = "amount", @operator = "greater_than", value = "1000" } }, LogicalOperator = "and", TargetNodeId = "approval_a", Order = 0 },
            new() { Id = "default", Label = "金额 <= 1000", Conditions = new List<object>(), LogicalOperator = "and", TargetNodeId = "approval_b", Order = 1 }
        };

        var workflowRequest = CreateWorkflowWithCondition(formId, "金额 > 1000?", branches);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object> { { "amount", 2000 } });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        var submitRequest = new { WorkflowDefinitionId = definitionId, Variables = new Dictionary<string, object> { { "amount", 500 } } };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        var instance = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instance?.Data);

        var result = await WaitForCurrentNodeAsync(instance.Data.Id, "approval_a");
        Assert.Equal("approval_a", result.CurrentNodeId);
        Output.WriteLine($"✓ 表单数据优先级：表单数据 amount=2000 覆盖了 Variables 中的 amount=500");
    }
}

public class ConditionBranch
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public List<object> Conditions { get; set; } = new();
    public string LogicalOperator { get; set; } = "and";
    public string TargetNodeId { get; set; } = string.Empty;
    public int Order { get; set; }
}
