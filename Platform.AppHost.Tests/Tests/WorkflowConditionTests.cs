using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using System.Net;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// 集成测试：验证工作流"条件"组件的数据驱动分支逻辑。
/// 
/// 测试流程：
/// 1. 创建表单定义（包含条件组件需要的字段）
/// 2. 创建工作流定义，在 start 节点绑定表单
/// 3. 创建公文，填充表单数据
/// 4. 启动流程，验证条件组件根据表单数据正确路由
/// 
/// 测试场景：
/// 1. 单一条件判断（数值比较）
/// 2. 多条件组合（AND/OR 逻辑）
/// 3. 字符串比较
/// 4. 边界值测试
/// 5. 表单数据优先级验证
/// </summary>
[Collection("AppHost Collection")]
public class WorkflowConditionTests : BaseIntegrationTest
{
    public WorkflowConditionTests(AppHostFixture fixture, ITestOutputHelper output)
        : base(fixture, output)
    {
    }

    /// <summary>
    /// 辅助方法：创建表单定义
    /// </summary>
    private async Task<string> CreateFormDefinitionAsync(string formName, List<FormFieldRequest> fields)
    {
        var formRequest = new FormDefinitionRequest
        {
            Name = formName,
            Key = $"key_{Guid.NewGuid().ToString("N")[..8]}",
            Description = $"Test form for condition testing",
            Fields = fields,
            IsActive = true
        };

        var formResponse = await TestClient.PostAsJsonAsync("/api/forms", formRequest);
        Assert.Equal(System.Net.HttpStatusCode.OK, formResponse.StatusCode);
        var form = await formResponse.Content.ReadAsJsonAsync<ApiResponse<FormDefinitionResponse>>();
        Assert.NotNull(form?.Data);
        return form.Data.Id;
    }

    /// <summary>
    /// 辅助方法：创建带表单绑定的工作流
    /// </summary>
    private WorkflowDefinitionRequest CreateWorkflowWithFormBinding(
        string formDefinitionId,
        string conditionLabel,
        List<object> conditions,
        string logicalOperator = "and")
    {
        var counter = Guid.NewGuid().ToString("N")[..8];
        var name = $"workflow_form_binding_{counter}";

        var nodes = new List<WorkflowNodeRequest>
        {
            // Start 节点绑定表单
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
                        Form = new
                        {
                            FormDefinitionId = formDefinitionId,
                            Target = "Document",
                            Required = true
                        }
                    }
                },
                Position = new NodePositionRequest { X = 100, Y = 200 }
            },
            // 条件节点
            new WorkflowNodeRequest
            {
                Id = "condition_node",
                Type = "condition",
                Data = new NodeDataRequest
                {
                    Label = conditionLabel,
                    NodeType = "condition",
                    Config = new {
                        Condition = new {
                            LogicalOperator = logicalOperator,
                            Conditions = conditions
                        }
                    }
                },
                Position = new NodePositionRequest { X = 400, Y = 200 }
            },
            // True 分支审批
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
                            type = "Any",
                            approvers = new[] { new { type = "User", userId = "507f1f77bcf86cd799439011" } }
                        }
                    }
                },
                Position = new NodePositionRequest { X = 700, Y = 100 }
            },
            // False 分支审批
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
                            type = "Any",
                            approvers = new[] { new { type = "User", userId = "507f1f77bcf86cd799439011" } }
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
            new WorkflowEdgeRequest { Id = "e2", Source = "condition_node", Target = "approval_a", SourceHandle = "true" },
            new WorkflowEdgeRequest { Id = "e3", Source = "condition_node", Target = "approval_b", SourceHandle = "false" },
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

    /// <summary>
    /// 测试：单一条件 - 金额大于阈值
    /// 流程：创建表单 → 创建工作流并绑定表单 → 创建公文填充表单数据 → 启动流程 → 验证路由
    /// </summary>
    [Fact]
    public async Task ConditionBranching_AmountGreaterThan1000_ShouldGoToApprovalA()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // 1. 创建表单定义（包含 amount 字段）
        var formFields = new List<FormFieldRequest>
        {
            new FormFieldRequest
            {
                Label = "Amount",
                Type = "Number",
                Required = true,
                DataKey = "amount"
            }
        };
        var formId = await CreateFormDefinitionAsync($"form_amount_{Guid.NewGuid().ToString("N")[..8]}", formFields);
        Output.WriteLine($"✓ 创建表单: {formId}");

        // 2. 创建工作流，在 start 节点绑定表单，条件节点配置条件规则
        var conditions = new List<object>
        {
            new { Variable = "amount", Operator = "greater_than", Value = "1000" }
        };
        var workflowRequest = CreateWorkflowWithFormBinding(formId, "金额 > 1000?", conditions);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;
        Output.WriteLine($"✓ 创建工作流: {definitionId}");

        // 调试：输出工作流定义的详细信息
        Output.WriteLine($"DEBUG: 工作流定义 JSON = {System.Text.Json.JsonSerializer.Serialize(workflow.Data)}");
        if (workflow.Data.Graph?.Nodes != null)
        {
            var conditionNode = workflow.Data.Graph.Nodes.FirstOrDefault(n => n.Type == "condition");
            if (conditionNode != null)
            {
                Output.WriteLine($"DEBUG: 条件节点 = {System.Text.Json.JsonSerializer.Serialize(conditionNode)}");
            }
        }

        // 3. 创建公文，填充表单数据（amount = 2000）
        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "amount", 2000 }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;
        Output.WriteLine($"✓ 创建公文: {documentId}，表单数据: amount=2000");

        // Act - 4. 启动流程
        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var instanceWrap = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceWrap?.Data);
        var instance = instanceWrap.Data;

        // Assert - 5. 验证条件组件根据表单数据正确路由
        Output.WriteLine($"DEBUG: 当前节点 = {instance.CurrentNodeId}");
        Output.WriteLine($"DEBUG: 工作流实例ID = {instance.Id}");

        // 获取工作流实例的完整信息以查看调试变量
        var instanceResponse = await TestClient.GetAsync($"/api/workflows/instances/{instance.Id}");
        if (instanceResponse.IsSuccessStatusCode)
        {
            var fullInstance = await instanceResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
            if (fullInstance?.Data?.Variables != null)
            {
                Output.WriteLine($"DEBUG: 工作流变量数 = {fullInstance.Data.Variables.Count}");
                foreach (var var in fullInstance.Data.Variables)
                {
                    Output.WriteLine($"DEBUG: 变量 {var.Key} = {var.ValueJson}");
                }
            }
        }

        Assert.Equal("approval_a", instance.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=2000 > 1000 = true，流程进入 approval_a");
    }

    /// <summary>
    /// 测试：单一条件 - 金额小于等于阈值
    /// </summary>
    [Fact]
    public async Task ConditionBranching_AmountLessThanOrEqualTo1000_ShouldGoToApprovalB()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // 1. 创建表单定义
        var formFields = new List<FormFieldRequest>
        {
            new FormFieldRequest
            {
                Label = "Amount",
                Type = "Number",
                Required = true,
                DataKey = "amount"
            }
        };
        var formId = await CreateFormDefinitionAsync($"form_amount_{Guid.NewGuid().ToString("N")[..8]}", formFields);

        // 2. 创建工作流并绑定表单
        var conditions = new List<object>
        {
            new { Variable = "amount", Operator = "greater_than", Value = "1000" }
        };
        var workflowRequest = CreateWorkflowWithFormBinding(formId, "金额 > 1000?", conditions);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        // 3. 创建公文，填充表单数据（amount = 500）
        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "amount", 500 }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        // Act
        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var instanceWrap = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceWrap?.Data);
        var instance = instanceWrap.Data;

        // Assert
        Assert.Equal("approval_b", instance.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=500 > 1000 = false，流程进入 approval_b");
    }

    /// <summary>
    /// 测试：边界值 - 金额恰好等于阈值
    /// </summary>
    [Fact]
    public async Task ConditionBranching_AmountEqualTo1000_ShouldGoToApprovalB()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        var formFields = new List<FormFieldRequest>
        {
            new FormFieldRequest
            {
                Label = "Amount",
                Type = "Number",
                Required = true,
                DataKey = "amount"
            }
        };
        var formId = await CreateFormDefinitionAsync($"form_amount_{Guid.NewGuid().ToString("N")[..8]}", formFields);

        var conditions = new List<object>
        {
            new { Variable = "amount", Operator = "greater_than", Value = "1000" }
        };
        var workflowRequest = CreateWorkflowWithFormBinding(formId, "金额 > 1000?", conditions);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "amount", 1000 }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        // Act
        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var instanceWrap = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceWrap?.Data);
        var instance = instanceWrap.Data;

        // Assert
        Assert.Equal("approval_b", instance.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=1000 > 1000 = false（边界值），流程进入 approval_b");
    }

    /// <summary>
    /// 测试：多条件 AND 逻辑 - 所有条件都满足
    /// </summary>
    [Fact]
    public async Task ConditionBranching_MultipleConditionsAND_AllMatch_ShouldGoToApprovalA()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        // 1. 创建表单定义（包含 amount 和 department 字段）
        var formFields = new List<FormFieldRequest>
        {
            new FormFieldRequest
            {
                Label = "Amount",
                Type = "Number",
                Required = true,
                DataKey = "amount"
            },
            new FormFieldRequest
            {
                Label = "Department",
                Type = "Text",
                Required = true,
                DataKey = "department"
            }
        };
        var formId = await CreateFormDefinitionAsync($"form_multi_{Guid.NewGuid().ToString("N")[..8]}", formFields);

        // 2. 创建工作流，配置 AND 条件
        var conditions = new List<object>
        {
            new { Variable = "amount", Operator = "greater_than", Value = "1000" },
            new { Variable = "department", Operator = "equals", Value = "Finance" }
        };
        var workflowRequest = CreateWorkflowWithFormBinding(formId, "金额 > 1000 且 部门 = Finance?", conditions, "and");
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        // 3. 创建公文，两个条件都满足
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

        // Act
        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var instanceWrap = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceWrap?.Data);
        var instance = instanceWrap.Data;

        // Assert
        Assert.Equal("approval_a", instance.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=5000 > 1000 && department=Finance = true，流程进入 approval_a");
    }

    /// <summary>
    /// 测试：多条件 AND 逻辑 - 部分条件不满足
    /// </summary>
    [Fact]
    public async Task ConditionBranching_MultipleConditionsAND_PartialMatch_ShouldGoToApprovalB()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        var formFields = new List<FormFieldRequest>
        {
            new FormFieldRequest
            {
                Label = "Amount",
                Type = "Number",
                Required = true,
                DataKey = "amount"
            },
            new FormFieldRequest
            {
                Label = "Department",
                Type = "Text",
                Required = true,
                DataKey = "department"
            }
        };
        var formId = await CreateFormDefinitionAsync($"form_multi_{Guid.NewGuid().ToString("N")[..8]}", formFields);

        var conditions = new List<object>
        {
            new { Variable = "amount", Operator = "greater_than", Value = "1000" },
            new { Variable = "department", Operator = "equals", Value = "Finance" }
        };
        var workflowRequest = CreateWorkflowWithFormBinding(formId, "金额 > 1000 且 部门 = Finance?", conditions, "and");
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        // 金额满足但部门不满足
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

        // Act
        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var instanceWrap = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceWrap?.Data);
        var instance = instanceWrap.Data;

        // Assert
        Assert.Equal("approval_b", instance.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=5000 > 1000 && department=IT = false，流程进入 approval_b");
    }

    /// <summary>
    /// 测试：多条件 OR 逻辑 - 任意一个条件满足
    /// </summary>
    [Fact]
    public async Task ConditionBranching_MultipleConditionsOR_AnyMatch_ShouldGoToApprovalA()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        var formFields = new List<FormFieldRequest>
        {
            new FormFieldRequest
            {
                Label = "Amount",
                Type = "Number",
                Required = true,
                DataKey = "amount"
            },
            new FormFieldRequest
            {
                Label = "IsUrgent",
                Type = "Text",
                Required = true,
                DataKey = "isUrgent"
            }
        };
        var formId = await CreateFormDefinitionAsync($"form_or_{Guid.NewGuid().ToString("N")[..8]}", formFields);

        var conditions = new List<object>
        {
            new { Variable = "amount", Operator = "greater_than", Value = "1000" },
            new { Variable = "isUrgent", Operator = "equals", Value = "true" }
        };
        var workflowRequest = CreateWorkflowWithFormBinding(formId, "金额 > 1000 或 紧急?", conditions, "or");
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        // 金额不满足但紧急满足
        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "amount", 500 },
            { "isUrgent", true }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        // Act
        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var instanceWrap = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceWrap?.Data);
        var instance = instanceWrap.Data;

        // Assert
        Assert.Equal("approval_a", instance.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：amount=500 > 1000 || isUrgent=true = true，流程进入 approval_a");
    }

    /// <summary>
    /// 测试：字符串比较 - 相等
    /// </summary>
    [Fact]
    public async Task ConditionBranching_StringComparison_Equals_ShouldGoToApprovalA()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        var formFields = new List<FormFieldRequest>
        {
            new FormFieldRequest
            {
                Label = "Department",
                Type = "Text",
                Required = true,
                DataKey = "department"
            }
        };
        var formId = await CreateFormDefinitionAsync($"form_string_{Guid.NewGuid().ToString("N")[..8]}", formFields);

        var conditions = new List<object>
        {
            new { Variable = "department", Operator = "equals", Value = "Finance" }
        };
        var workflowRequest = CreateWorkflowWithFormBinding(formId, "部门 = Finance?", conditions);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "department", "Finance" }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        // Act
        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var instanceWrap = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceWrap?.Data);
        var instance = instanceWrap.Data;

        // Assert
        Assert.Equal("approval_a", instance.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：department=Finance = true，流程进入 approval_a");
    }

    /// <summary>
    /// 测试：字符串比较 - 不相等
    /// </summary>
    [Fact]
    public async Task ConditionBranching_StringComparison_NotEquals_ShouldGoToApprovalB()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        var formFields = new List<FormFieldRequest>
        {
            new FormFieldRequest
            {
                Label = "Department",
                Type = "Text",
                Required = true,
                DataKey = "department"
            }
        };
        var formId = await CreateFormDefinitionAsync($"form_string_{Guid.NewGuid().ToString("N")[..8]}", formFields);

        var conditions = new List<object>
        {
            new { Variable = "department", Operator = "equals", Value = "Finance" }
        };
        var workflowRequest = CreateWorkflowWithFormBinding(formId, "部门 = Finance?", conditions);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "department", "IT" }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        // Act
        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var instanceWrap = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceWrap?.Data);
        var instance = instanceWrap.Data;

        // Assert
        Assert.Equal("approval_b", instance.CurrentNodeId);
        Output.WriteLine($"✓ 条件评估：department=IT != Finance = false，流程进入 approval_b");
    }

    /// <summary>
    /// 测试：表单数据优先级 - 表单数据覆盖流程变量
    /// </summary>
    [Fact]
    public async Task ConditionBranching_FormDataPriority_ShouldUseFormData()
    {
        // Arrange
        await InitializeAuthenticationAsync();

        var formFields = new List<FormFieldRequest>
        {
            new FormFieldRequest
            {
                Label = "Amount",
                Type = "Number",
                Required = true,
                DataKey = "amount"
            }
        };
        var formId = await CreateFormDefinitionAsync($"form_priority_{Guid.NewGuid().ToString("N")[..8]}", formFields);

        var conditions = new List<object>
        {
            new { Variable = "amount", Operator = "greater_than", Value = "1000" }
        };
        var workflowRequest = CreateWorkflowWithFormBinding(formId, "金额 > 1000?", conditions);
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        // 表单数据中 amount = 2000
        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "amount", 2000 }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        // Act - 通过 Variables 传递 amount = 500（应该被表单数据覆盖）
        var submitRequest = new
        {
            WorkflowDefinitionId = definitionId,
            Variables = new Dictionary<string, object> { { "amount", 500 } }
        };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var instanceWrap = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceWrap?.Data);
        var instance = instanceWrap.Data;

        // Assert - 应该使用表单数据中的 2000，而不是 Variables 中的 500
        Assert.Equal("approval_a", instance.CurrentNodeId);
        Output.WriteLine($"✓ 表单数据优先级：表单数据 amount=2000 覆盖了 Variables 中的 amount=500，流程进入 approval_a");
    }
}
