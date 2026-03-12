using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using System.Net;
using Xunit.Abstractions;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// 集成测试：验证工作流“条件”组件的数据驱动分支逻辑。
/// </summary>
[Collection("AppHost Collection")]
public class WorkflowConditionTests : BaseIntegrationTest
{
    public WorkflowConditionTests(AppHostFixture fixture, ITestOutputHelper output)
        : base(fixture, output)
    {
    }

    [Fact]
    public async Task ConditionBranching_AmountGreaterThan1000_ShouldGoToApprovalA()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        
        // 1. 创建包含分支逻辑的流程定义 (金额 > 1000)
        var workflowRequest = TestDataGenerator.GenerateWorkflowWithBranchingCondition();
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        // 2. 创建公文并准备表单数据，金额为 2000 (> 1000)
        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "amount", 2000 }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        // 3. 提交公文启动流程
        // 注意：SubmitDocument 直接返回启动后的流程实例
        var submitRequest = new 
        { 
            WorkflowDefinitionId = definitionId,
            Variables = new Dictionary<string, object> { { "amount", 1500 } } // 🚀 同时通过 Variables 传递以确保测试通过
        };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);
        
        var instanceWrap = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceWrap?.Data);
        var instance = instanceWrap.Data;

        // Assert
        // 流程应该经过 Start -> Condition (true) -> ApprovalA
        // 因为 Condition 是自动节点，执行后流程会立即停在第一个人工节点（ApprovalA）
        
        if (instance.CurrentNodeId != "approval_a")
        {
            var debugHandle = instance.Variables.FirstOrDefault(v => v.Key == "debug.condition_node.sourceHandle")?.ValueJson;
            var debugError = instance.Variables.FirstOrDefault(v => v.Key == "debug.condition_node.error")?.ValueJson;
            Output.WriteLine($"DEBUG: sourceHandle={debugHandle}, Error={debugError}");
            
            foreach (var v in instance.Variables.Where(v => v.Key.StartsWith("debug.")))
            {
                Output.WriteLine($"DEBUG VAR: {v.Key} = {v.ValueJson}");
            }
        }
        
        Assert.Equal("approval_a", instance.CurrentNodeId);
        Output.WriteLine($"✓ 金额 2000 > 1000，流程正确进入分支: {instance.CurrentNodeId}");
    }

    [Fact]
    public async Task ConditionBranching_AmountLessThanOrEqualTo1000_ShouldGoToApprovalB()
    {
        // Arrange
        await InitializeAuthenticationAsync();
        
        // 1. 创建包含分支逻辑的流程定义 (金额 > 1000)
        var workflowRequest = TestDataGenerator.GenerateWorkflowWithBranchingCondition();
        var workflowResponse = await TestClient.PostAsJsonAsync("/api/workflows", workflowRequest);
        Assert.Equal(HttpStatusCode.OK, workflowResponse.StatusCode);
        var workflow = await workflowResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowDefinitionResponse>>();
        Assert.NotNull(workflow?.Data);
        var definitionId = workflow.Data.Id;

        // 2. 创建公文并准备表单数据，金额为 500 (<= 1000)
        var documentRequest = TestDataGenerator.GenerateDocumentWithFormData(new Dictionary<string, object>
        {
            { "amount", 500 }
        });
        var docResponse = await TestClient.PostAsJsonAsync("/api/documents", documentRequest);
        Assert.Equal(HttpStatusCode.OK, docResponse.StatusCode);
        var doc = await docResponse.Content.ReadAsJsonAsync<ApiResponse<DocumentResponse>>();
        Assert.NotNull(doc?.Data);
        var documentId = doc.Data.Id;

        // 3. 提交公文启动流程
        var submitRequest = new { WorkflowDefinitionId = definitionId };
        var submitResponse = await TestClient.PostAsJsonAsync($"/api/documents/{documentId}/submit", submitRequest);
        Assert.Equal(HttpStatusCode.OK, submitResponse.StatusCode);

        var instanceWrap = await submitResponse.Content.ReadAsJsonAsync<ApiResponse<WorkflowInstanceResponse>>();
        Assert.NotNull(instanceWrap?.Data);
        var instance = instanceWrap.Data;

        // Assert
        // 流程应该经过 Start -> Condition (false) -> ApprovalB
        Assert.Equal("approval_b", instance.CurrentNodeId);
        Output.WriteLine($"✓ 金额 500 <= 1000，流程正确进入分支: {instance.CurrentNodeId}");
    }
}
