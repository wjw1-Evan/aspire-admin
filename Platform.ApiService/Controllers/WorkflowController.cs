using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;
using Platform.ApiService.Extensions;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 工作流管理控制器
/// </summary>
[ApiController]
[Route("api/workflows")]
public class WorkflowController : BaseApiController
{
    private readonly IWorkflowEngine _workflowEngine;
    private readonly IUserService _userService;
    private readonly IFieldValidationService _fieldValidationService;
    private readonly IWorkflowGraphValidator _graphValidator;
    private readonly IWorkflowExportImportService _exportImportService;
    private readonly IWorkflowDefinitionQueryService _workflowQueryService;
    private readonly IWorkflowDefinitionService _workflowDefinitionService;
    private readonly IWorkflowInstanceQueryService _workflowInstanceQueryService;
    private readonly IWorkflowFilterPreferenceService _filterPreferenceService;
    private readonly IFormDefinitionService _formDefinitionService;
    private readonly IWorkflowTodoService _workflowTodoService;
    private readonly IDocumentService _documentService;
    private readonly IWorkflowInstanceService _workflowInstanceService;
    private readonly ILogger<WorkflowController> _logger;

    /// <summary>
    /// 初始化工作流管理控制器
    /// </summary>
    /// <param name="workflowEngine">工作流引擎</param>
    /// <param name="userService">用户服务</param>
    /// <param name="fieldValidationService">字段验证服务</param>
    /// <param name="graphValidator">流程图形校验服务</param>
    /// <param name="exportImportService">工作流导出导入服务</param>
    /// <param name="workflowQueryService">工作流查询服务</param>
    /// <param name="workflowDefinitionService">工作流定义服务</param>
    /// <param name="workflowInstanceQueryService">工作流实例查询服务</param>
    /// <param name="filterPreferenceService">过滤器偏好服务</param>
    /// <param name="formDefinitionService">表单定义服务</param>
    /// <param name="workflowTodoService">工作流待办服务</param>
    /// <param name="documentService">公文服务</param>
    /// <param name="workflowInstanceService">工作流实例服务</param>
    /// <param name="logger">日志记录器</param>
    public WorkflowController(
        IWorkflowEngine workflowEngine,
        IUserService userService,
        IFieldValidationService fieldValidationService,
        IWorkflowGraphValidator graphValidator,
        IWorkflowExportImportService exportImportService,
        IWorkflowDefinitionQueryService workflowQueryService,
        IWorkflowDefinitionService workflowDefinitionService,
        IWorkflowInstanceQueryService workflowInstanceQueryService,
        IWorkflowFilterPreferenceService filterPreferenceService,
        IFormDefinitionService formDefinitionService,
        IWorkflowTodoService workflowTodoService,
        IDocumentService documentService,
        IWorkflowInstanceService workflowInstanceService,
        ILogger<WorkflowController> logger
    )
    {
        _workflowEngine = workflowEngine;
        _userService = userService;
        _fieldValidationService = fieldValidationService;
        _graphValidator = graphValidator;
        _exportImportService = exportImportService;
        _workflowQueryService = workflowQueryService;
        _workflowDefinitionService = workflowDefinitionService;
        _workflowInstanceQueryService = workflowInstanceQueryService;
        _filterPreferenceService = filterPreferenceService;
        _formDefinitionService = formDefinitionService;
        _workflowTodoService = workflowTodoService;
        _documentService = documentService;
        _workflowInstanceService = workflowInstanceService;
        _logger = logger;
    }

    /// <summary>
    /// 获取流程定义列表
    /// </summary>
    [HttpGet]
    [RequireMenu("workflow-list", "workflow-monitor")]
    public async Task<IActionResult> GetWorkflows([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
        => Success(await _workflowQueryService.GetWorkflowsAsync(request));

    /// <summary>
    /// 获取流程定义详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("workflow-list", "workflow-monitor", "document-list", "document-approval")]
    public async Task<IActionResult> GetWorkflow(string id)
    {
        var workflow = await _workflowQueryService.GetWorkflowByIdAsync(id);
        if (workflow == null)
            throw new ArgumentException($"流程定义 {id} 不存在");
        return Success(workflow);
    }

    /// <summary>
    /// 创建流程定义
    /// </summary>
    [HttpPost]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> CreateWorkflow([FromBody] CreateWorkflowRequest request)
    {
        if (string.IsNullOrEmpty(request.Name))
            throw new ArgumentException("流程名称不能为空");

        if (request.Graph == null || request.Graph.Nodes == null || !request.Graph.Nodes.Any())
            throw new ArgumentException("流程图形定义不能为空");

        var (isGraphValid, graphError) = _graphValidator.Validate(request.Graph);
        if (!isGraphValid)
            throw new ArgumentException($"流程图形定义不合法: {graphError}");

        var workflow = new WorkflowDefinition
        {
            Name = request.Name,
            Description = request.Description,
            Category = request.Category ?? string.Empty,
            Version = new WorkflowVersion { Major = 1, Minor = 0, CreatedAt = DateTime.UtcNow },
            Graph = request.Graph,
            IsActive = request.IsActive ?? true
        };

        return Success(await _workflowDefinitionService.CreateWorkflowAsync(workflow));
    }

    /// <summary>
    /// 更新流程定义
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> UpdateWorkflow(string id, [FromBody] UpdateWorkflowRequest request)
    {
        var existing = await _workflowQueryService.GetWorkflowByIdAsync(id);
        if (existing == null)
            throw new ArgumentException($"流程定义 {id} 不存在");

        if (request.Graph != null)
        {
            var (isGraphValid, graphError) = _graphValidator.Validate(request.Graph);
            if (!isGraphValid)
                throw new ArgumentException($"流程图形定义不合法: {graphError}");
        }

        if (!string.IsNullOrEmpty(request.Name)) existing.Name = request.Name;
        if (request.Description != null) existing.Description = request.Description;
        if (!string.IsNullOrEmpty(request.Category)) existing.Category = request.Category;
        if (request.Graph != null) existing.Graph = request.Graph;
        if (request.IsActive.HasValue) existing.IsActive = request.IsActive.Value;

        return Success(await _workflowDefinitionService.UpdateWorkflowAsync(id, existing));
    }

    /// <summary>
    /// 删除流程定义
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> DeleteWorkflow(string id)
    {
        var result = await _workflowDefinitionService.DeleteWorkflowAsync(id);
        if (!result)
            throw new ArgumentException($"流程定义 {id} 不存在");
        return Success(null, "流程定义已删除");
    }

    /// <summary>
    /// 启动流程实例
    /// </summary>
    [HttpPost("{id}/start")]
    [RequireMenu("workflow-list", "document-list")]
    public async Task<IActionResult> StartWorkflow(string id, [FromBody] StartWorkflowRequest request)
    {
        var userId = RequiredUserId;
        Dictionary<string, object?>? sanitizedVars = null;

        if (request.Variables != null)
        {
            try
            {
                sanitizedVars = (Dictionary<string, object?>)(object)SerializationExtensions.SanitizeDictionary(request.Variables);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "变量清洗失败: WorkflowId={WorkflowId}", id);
                throw new ArgumentException("流程变量处理失败，请检查变量格式");
            }
        }

        try
        {
            return Success(await _workflowEngine.StartWorkflowAsync(id, request.DocumentId, userId, sanitizedVars));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "启动流程失败: WorkflowId={WorkflowId}, DocumentId={DocumentId}", id, request.DocumentId);
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 启动流程实例（别名端点）
    /// </summary>
    [HttpPost("{id}/instances")]
    [RequireMenu("workflow-list", "document-list")]
    public Task<IActionResult> StartWorkflowInstance(string id, [FromBody] StartWorkflowRequest request)
        => StartWorkflow(id, request);

    /// <summary>
    /// 获取流程实例列表
    /// </summary>
    [HttpGet("instances")]
    [RequireMenu("workflow-monitor")]
    public async Task<IActionResult> GetInstances(
        [FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request,
        [FromQuery] string? workflowDefinitionId = null,
        [FromQuery] WorkflowStatus? status = null)
        => Success(await _workflowInstanceQueryService.GetInstancesAsync(request, workflowDefinitionId, status));

    /// <summary>
    /// 获取用于创建公文的自定义表单（优先使用起始节点绑定的文档表单；若无，则取第一个绑定文档表单的节点）
    /// </summary>
    [HttpGet("{id}/document-form")]
    [RequireMenu("document-list")]
    public async Task<IActionResult> GetDocumentCreateForm(string id)
    {
        try
        {
            var definition = await _workflowQueryService.GetWorkflowByIdAsync(id);
            if (definition == null)
            {
                throw new ArgumentException("流程定义 {id} 不存在");
            }

            var startNode = definition.Graph.Nodes.FirstOrDefault(n => n.Data.NodeType == "start");
            FormBinding? binding = startNode?.Data.Config?.Form;

            if (binding == null || binding.Target != FormTarget.Document)
            {
                var nodeWithDocForm = definition.Graph.Nodes
                    .FirstOrDefault(n => n.Data.Config?.Form?.Target == FormTarget.Document);
                binding = nodeWithDocForm?.Data.Config?.Form;
            }

            if (binding == null || string.IsNullOrEmpty(binding.FormDefinitionId))
                return Success(new { form = (FormDefinition?)null, dataScopeKey = (string?)null, initialValues = (object?)null });

            var form = await _formDefinitionService.GetFormByIdAsync(binding.FormDefinitionId);
            if (form == null)
                throw new ArgumentException($"表单定义 {binding.FormDefinitionId} 不存在");

            var initialValues = new Dictionary<string, object>();
            foreach (var field in form.Fields)
            {
                if (field.DefaultValue != null && !string.IsNullOrEmpty(field.DataKey))
                    initialValues[field.DataKey] = field.DefaultValue;
            }

            var titleField = form.Fields.FirstOrDefault(f => string.Equals(f.DataKey, "title", StringComparison.OrdinalIgnoreCase));
            if (titleField != null && !initialValues.ContainsKey("title"))
                initialValues["title"] = definition.Name;

            return Success(new { form, dataScopeKey = binding.DataScopeKey, initialValues });
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 获取工作流的表单和字段信息
    /// </summary>
    [HttpGet("{id}/forms-and-fields")]
    [RequireMenu("workflow-list", "document-list")]
    public async Task<IActionResult> GetWorkflowFormsAndFields(string id)
    {
        var definition = await _workflowQueryService.GetWorkflowByIdAsync(id);
        if (definition == null)
            throw new ArgumentException($"流程定义 {id} 不存在");

        var formBindings = definition.Graph.Nodes
            .Where(n => n.Data.Config?.Form != null && !string.IsNullOrEmpty(n.Data.Config!.Form!.FormDefinitionId))
            .Select(n => n.Data.Config!.Form!)
            .DistinctBy(b => b.FormDefinitionId)
            .ToList();

        if (formBindings.Count == 0)
            return Success(new { forms = new List<object>() });

        var formIds = formBindings.Select(b => b.FormDefinitionId!).ToList();
        var forms = await _formDefinitionService.GetFormsByIdsAsync(formIds);

        var result = forms.Select(form => new
        {
            Id = form.Id,
            Name = form.Name,
            Key = form.Key,
            Fields = form.Fields?.Select(field => new
            {
                Id = field.Id,
                Label = field.Label,
                DataKey = field.DataKey,
                Type = field.Type,
                Required = field.Required
            }).ToList<object>() ?? new List<object>()
        }).ToList<object>();

        return Success(new { forms = result });
    }

    /// <summary>
    /// 获取待办工作流实例列表
    /// </summary>
    [HttpGet("instances/todo")]
    [RequireMenu("document-approval")]
    public async Task<IActionResult> GetTodoInstances([FromQuery] Platform.ServiceDefaults.Models.ProTableRequest request)
        => Success(await _workflowTodoService.GetTodoInstancesAsync(RequiredUserId, request));

    /// <summary>
    /// 获取工作流实例详情
    /// </summary>
    [HttpGet("instances/{id}")]
    [RequireMenu("workflow-monitor", "document-approval", "document-list")]
    public async Task<IActionResult> GetInstance(string id)
    {
        var instance = await _workflowEngine.GetInstanceAsync(id);
        if (instance == null)
            throw new ArgumentException($"流程实例 {id} 不存在");
        return Success(instance);
    }

    /// <summary>
    /// 获取实例审批历史
    /// </summary>
    [HttpGet("instances/{id}/history")]
    [RequireMenu("workflow-monitor", "document-approval", "document-list")]
    public async Task<IActionResult> GetApprovalHistory(string id)
    {
        try
        {
            var history = await _workflowEngine.GetApprovalHistoryAsync(id);
            return Success(history);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 获取流程实例当前节点的表单定义与初始值
    /// </summary>
    [HttpGet("instances/{id}/nodes/{nodeId}/form")]
    [RequireMenu("workflow-monitor", "document-approval", "document-list")]
    public async Task<IActionResult> GetNodeForm(string id, string nodeId)
    {
        try
        {
            var instance = await _workflowEngine.GetInstanceAsync(id);
            if (instance == null)
            {
                throw new ArgumentException("流程实例 {id} 不存在");
            }

            WorkflowDefinition? definition = instance.WorkflowDefinitionSnapshot;
            if (definition == null)
            {
                definition = await _workflowQueryService.GetWorkflowByIdAsync(instance.WorkflowDefinitionId);
                if (definition == null)
                {
                    throw new ArgumentException("流程定义 {instance.WorkflowDefinitionId} 不存在");
                }
            }

            var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
            if (node == null)
            {
                throw new ArgumentException("节点不存在");
            }

            var binding = node.Data.Config?.Form;
            if (binding == null || string.IsNullOrEmpty(binding.FormDefinitionId))
            {
                return Success(new { form = (FormDefinition?)null, initialValues = (object?)null });
            }

            FormDefinition? form = null;
            var snapshot = instance.FormDefinitionSnapshots?.FirstOrDefault(s => s.NodeId == nodeId);
            if (!string.IsNullOrEmpty(snapshot?.FormDefinitionJson))
            {
                form = JsonSerializer.Deserialize<FormDefinition>(snapshot.FormDefinitionJson);
            }

            if (form == null)
            {
                form = await _formDefinitionService.GetFormByIdAsync(binding.FormDefinitionId);
                if (form == null)
                {
                    throw new ArgumentException("表单定义 {binding.FormDefinitionId} 不存在");
                }
            }

            object? initialValues = null;
            if (binding.Target == FormTarget.Document)
            {
                Document? document = null;
                if (!string.IsNullOrEmpty(instance.DocumentId))
                {
                    document = await _documentService.GetDocumentAsync(instance.DocumentId);
                }
                if (document != null)
                {
                    var sourceFormData = document.FormData ?? new Dictionary<string, object>();

                    // L4 Bug Fix: merge top-level document properties into form data for initialValues
                    var mergedData = new Dictionary<string, object>(sourceFormData);
                    if (!mergedData.ContainsKey("title"))
                    {
                        mergedData["title"] = document.Title;
                    }
                    if (!mergedData.ContainsKey("content") && document.Content != null)
                    {
                        mergedData["content"] = document.Content;
                    }

                    if (!string.IsNullOrWhiteSpace(binding.DataScopeKey))
                    {
                        if (mergedData.TryGetValue(binding.DataScopeKey, out var scopedData) && scopedData is Dictionary<string, object> scopedDict)
                        {
                            initialValues = scopedDict;
                        }
                        else if (mergedData.TryGetValue(binding.DataScopeKey, out var jsonElement) && jsonElement is JsonElement element && element.ValueKind == JsonValueKind.Object)
                        {
                            initialValues = JsonSerializer.Deserialize<Dictionary<string, object>>(element.GetRawText());
                        }
                    }
                    else
                    {
                        initialValues = mergedData;
                    }
                }
            }
            else
            {
                initialValues = instance.GetVariablesDict();
            }

            return Success(new { form, initialValues });
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 提交节点表单数据
    /// </summary>
    [HttpPost("instances/{id}/nodes/{nodeId}/form")]
    [RequireMenu("workflow-list", "document-approval")]
    public async Task<IActionResult> SubmitNodeForm(string id, string nodeId, [FromBody] Dictionary<string, object> values)
    {
        var instance = await _workflowEngine.GetInstanceAsync(id);
        if (instance == null)
            throw new ArgumentException($"流程实例 {id} 不存在");

        var definition = instance.WorkflowDefinitionSnapshot
            ?? await _workflowQueryService.GetWorkflowByIdAsync(instance.WorkflowDefinitionId)
            ?? throw new ArgumentException($"流程定义 {instance.WorkflowDefinitionId} 不存在");

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId)
            ?? throw new ArgumentException("节点不存在");

        var binding = node.Data.Config?.Form
            ?? throw new ArgumentException("该节点未绑定完整表单定义");

        FormDefinition? form = null;
        var snapshot = instance.FormDefinitionSnapshots?.FirstOrDefault(s => s.NodeId == nodeId);
        if (!string.IsNullOrEmpty(snapshot?.FormDefinitionJson))
            form = JsonSerializer.Deserialize<FormDefinition>(snapshot.FormDefinitionJson);

        form ??= await _formDefinitionService.GetFormByIdAsync(binding.FormDefinitionId ?? string.Empty)
            ?? throw new ArgumentException($"表单定义 {binding.FormDefinitionId} 不存在");

        if (binding.Required && (values == null || values.Count == 0))
            throw new ArgumentException("表单数据不能为空");

        if (values?.Any() == true)
        {
            var validationErrors = _fieldValidationService.ValidateFormData(form, values);
            if (validationErrors.Any())
                throw new ArgumentException(string.Join("; ", validationErrors));
        }

        var sanitizedValues = SerializationExtensions.SanitizeDictionary(values ?? new Dictionary<string, object>());
        var valuesWithNulls = (Dictionary<string, object?>)(object)sanitizedValues;

        if (binding.Target == FormTarget.Document)
        {
            if (string.IsNullOrEmpty(instance.DocumentId))
                throw new ArgumentException("当前实例未关联公文");

            var existingDoc = await _documentService.GetDocumentAsync(instance.DocumentId);
            if (existingDoc != null)
            {
                if (!string.IsNullOrWhiteSpace(binding.DataScopeKey))
                {
                    var formData = existingDoc.FormData ?? new Dictionary<string, object>();
                    formData[binding.DataScopeKey] = sanitizedValues;
                    existingDoc.FormData = formData;
                }
                else
                {
                    var existingFormData = existingDoc.FormData ?? new Dictionary<string, object>();
                    foreach (var kvp in sanitizedValues)
                        existingFormData[kvp.Key] = kvp.Value;
                    existingDoc.FormData = existingFormData;
                }
                await _documentService.UpdateDocumentAsync(existingDoc);
            }
            return Success(existingDoc?.FormData ?? (object)sanitizedValues);
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(binding.DataScopeKey))
                instance.SetVariable(binding.DataScopeKey, valuesWithNulls);
            else
                instance.ResetVariables(valuesWithNulls);

            await _workflowInstanceService.SaveChangesAsync();
            return Success(instance.GetVariablesDict() ?? valuesWithNulls);
        }
    }

    /// <summary>
    /// 执行节点操作（通过/拒绝/转交等）
    /// </summary>
    [HttpPost("instances/{id}/nodes/{nodeId}/action")]
    [RequireMenu("workflow-list", "document-approval")]
    public async Task<IActionResult> ExecuteNodeAction(string id, string nodeId, [FromBody] WorkflowActionRequest request)
    {
        var userId = RequiredUserId;

        if (string.IsNullOrWhiteSpace(request.Action))
            throw new ArgumentException("操作类型不能为空");

        if (request.FormData != null && request.FormData.Any())
        {
            var submitResult = await SubmitNodeForm(id, nodeId, request.FormData);
            if (submitResult is ObjectResult obj && obj.StatusCode != 200)
                return submitResult;
        }

        var action = request.Action.Trim().ToLowerInvariant();

        switch (action)
        {
            case "approve":
                await _workflowEngine.ProcessApprovalAsync(id, nodeId, ApprovalAction.Approve, userId, request.Comment);
                return Success(null, "审批通过");

            case "reject":
                if (string.IsNullOrWhiteSpace(request.Comment))
                    throw new ArgumentException("拒绝原因不能为空");
                await _workflowEngine.ProcessApprovalAsync(id, nodeId, ApprovalAction.Reject, userId, request.Comment);
                return Success(null, "审批已拒绝");

            case "return":
                if (string.IsNullOrEmpty(request.TargetNodeId))
                    throw new ArgumentException("退回目标节点不能为空");
                if (string.IsNullOrWhiteSpace(request.Comment))
                    throw new ArgumentException("退回原因不能为空");
                await _workflowEngine.ReturnToNodeAsync(id, request.TargetNodeId, request.Comment, userId);
                return Success(null, "已退回");

            case "delegate":
                if (string.IsNullOrEmpty(request.DelegateToUserId))
                    throw new ArgumentException("转办目标用户不能为空");
                await _workflowEngine.ProcessApprovalAsync(id, nodeId, ApprovalAction.Delegate, userId, request.Comment, request.DelegateToUserId);
                return Success(null, "已转办");

            default:
                throw new ArgumentException("不支持的操作类型");
        }
    }

    /// <summary>
    /// 撤回工作流实例
    /// </summary>
    [HttpPost("instances/{id}/withdraw")]
    [RequireMenu("workflow-list", "document-list")]
    public async Task<IActionResult> WithdrawInstance(string id, [FromBody] WithdrawWorkflowRequest? request)
    {
        var instance = await _workflowEngine.GetInstanceAsync(id)
            ?? throw new ArgumentException($"流程实例 {id} 不存在");

        if (instance.Status != WorkflowStatus.Running && instance.Status != WorkflowStatus.Waiting)
            throw new ArgumentException("仅运行中或等待审批的流程可以撤回");

        var userId = RequiredUserId;
        if (!string.Equals(instance.StartedBy, userId, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("仅流程发起人可以撤回");

        var reason = string.IsNullOrWhiteSpace(request?.Reason) ? "发起人撤回" : request!.Reason!;
        await _workflowEngine.CancelWorkflowAsync(id, reason);
        return Success(null, "流程已撤回");
    }

    /// <summary>
    /// 根据工作流创建公文
    /// </summary>
    [HttpPost("instances/{id}/document")]
    [HttpPost("{id}/documents")]
    [RequireMenu("document-list")]
    public async Task<IActionResult> CreateDocumentByWorkflow(string id, [FromBody] CreateWorkflowDocumentRequest request)
    {
        try
        {
            var docService = HttpContext.RequestServices.GetRequiredService<IDocumentService>();
            var doc = await docService.CreateDocumentForWorkflowAsync(id, request.Values ?? new Dictionary<string, object>(), request.AttachmentIds);
            return Success(doc);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(ex.Message);
        }
    }

    /// <summary>
    /// 获取用户工作流过滤器偏好列表
    /// </summary>
    [HttpGet("filter-preferences")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetFilterPreferences()
    {
        try
        {
            var userId = RequiredUserId;
            var preferences = await _filterPreferenceService.GetPreferencesAsync(userId);
            return Success(preferences);
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"获取过滤器偏好失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 保存用户工作流过滤器偏好
    /// </summary>
    [HttpPost("filter-preferences")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> SaveFilterPreference([FromBody] SaveFilterPreferenceRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Name))
            {
                throw new ArgumentException("偏好名称不能为空");
            }

            var userId = RequiredUserId;

            var existing = await _filterPreferenceService.HasPreferenceByNameAsync(userId, request.Name);
            if (existing)
            {
                throw new ArgumentException("已存在同名的过滤器偏好");
            }

            var preference = await _filterPreferenceService.SavePreferenceAsync(
                userId,
                request.Name,
                request.FilterConfig,
                request.IsDefault);
            return Success(preference);
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"保存过滤器偏好失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 更新用户工作流过滤器偏好
    /// </summary>
    [HttpPut("filter-preferences/{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> UpdateFilterPreference(string id, [FromBody] UpdateFilterPreferenceRequest request)
    {
        try
        {
            var userId = RequiredUserId;

            var existing = await _filterPreferenceService.GetPreferenceByIdAsync(id);
            if (existing == null || existing.UserId != userId)
            {
                throw new ArgumentException("过滤器偏好 {id} 不存在");
            }

            if (!string.IsNullOrEmpty(request.Name) && request.Name != existing.Name)
            {
                var hasName = await _filterPreferenceService.HasPreferenceByNameAsync(userId, request.Name);
                if (hasName)
                {
                    throw new ArgumentException("已存在同名的过滤器偏好");
                }
            }

            var name = string.IsNullOrEmpty(request.Name) ? existing.Name : request.Name;
            var filterConfig = request.FilterConfig ?? existing.FilterConfig;
            var isDefault = request.IsDefault ?? existing.IsDefault;

            return Success(await _filterPreferenceService.UpdatePreferenceAsync(id, name, filterConfig, isDefault));
        }
        catch (ArgumentException ex)
        {
            throw new ArgumentException(ex.Message);
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"更新过滤器偏好失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 删除过滤器偏好
    /// </summary>
    [HttpDelete("filter-preferences/{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> DeleteFilterPreference(string id)
    {
        var userId = RequiredUserId;
        var preference = await _filterPreferenceService.GetPreferenceByIdAsync(id);
        if (preference == null || preference.UserId != userId)
            throw new ArgumentException("过滤器偏好不存在");

        var result = await _filterPreferenceService.DeletePreferenceAsync(id);
        if (!result)
            throw new ArgumentException("过滤器偏好不存在");

        return Success(null, "过滤器偏好已删除");
    }

    /// <summary>
    /// 获取默认过滤器偏好
    /// </summary>
    [HttpGet("filter-preferences/default")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetDefaultFilterPreference()
        => Success(await _filterPreferenceService.GetDefaultPreferenceAsync(RequiredUserId));

    /// <summary>
    /// 创建并启动公文工作流
    /// </summary>
    [HttpPost("{id}/documents/start")]
    [RequireMenu("document-list")]
    public async Task<IActionResult> CreateAndStartDocumentWorkflow(string id, [FromBody] CreateAndStartWorkflowDocumentRequest request)
    {
        var userId = RequiredUserId;
        var docService = HttpContext.RequestServices.GetRequiredService<IDocumentService>();
        var document = await docService.CreateDocumentForWorkflowAsync(id, request.Values ?? new Dictionary<string, object>(), request.AttachmentIds);

        var mergedVariables = request.Variables != null
            ? SerializationExtensions.SanitizeDictionary(request.Variables)
            : new Dictionary<string, object>();

        if (request.Values != null)
        {
            foreach (var kv in request.Values)
            {
                if (!mergedVariables.ContainsKey(kv.Key))
                    mergedVariables[kv.Key] = kv.Value;
            }
        }

        var instance = await _workflowEngine.StartWorkflowAsync(id, document.Id, userId, (Dictionary<string, object?>)(object)mergedVariables);
        return Success(new { document, workflowInstance = instance });
    }

    /// <summary>
    /// 批量创建工作流操作
    /// </summary>
    [HttpPost("bulk-operations")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> CreateBulkOperation([FromBody] CreateBulkOperationRequest request)
    {
        if (request.WorkflowIds == null || request.WorkflowIds.Count == 0)
            throw new ArgumentException("工作流ID列表不能为空");

        if (request.WorkflowIds.Count > 100)
            throw new ArgumentException("批量操作最多支持100个工作流");

        var bulkService = HttpContext.RequestServices.GetRequiredService<IBulkOperationService>();
        return Success(await bulkService.CreateBulkOperationAsync(request.OperationType, request.WorkflowIds, request.Parameters));
    }

    /// <summary>
    /// 执行批量工作流操作
    /// </summary>
    [HttpPost("bulk-operations/{operationId}/execute")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ExecuteBulkOperation(string operationId)
    {
        var bulkService = HttpContext.RequestServices.GetRequiredService<IBulkOperationService>();
        var success = await bulkService.ExecuteBulkOperationAsync(operationId);
        if (!success)
            throw new ArgumentException("批量操作执行失败，请检查操作状态");
        return Success(null, "批量操作已开始执行");
    }

    /// <summary>
    /// 取消批量工作流操作
    /// </summary>
    [HttpPost("bulk-operations/{operationId}/cancel")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> CancelBulkOperation(string operationId)
    {
        var bulkService = HttpContext.RequestServices.GetRequiredService<IBulkOperationService>();
        var success = await bulkService.CancelBulkOperationAsync(operationId);
        if (!success)
            throw new ArgumentException("无法取消该批量操作");
        return Success(null, "批量操作已取消");
    }

    /// <summary>
    /// 获取批量操作状态
    /// </summary>
    /// <param name="operationId">操作ID</param>
    /// <returns>批量操作状态</returns>
    [HttpGet("bulk-operations/{operationId}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetBulkOperation(string operationId)
    {
        try
        {
            var bulkService = HttpContext.RequestServices.GetRequiredService<IBulkOperationService>();
            var operation = await bulkService.GetBulkOperationAsync(operationId);

            if (operation == null)
            {
                throw new ArgumentException("批量操作 {operationId} 不存在");
            }

            return Success(operation);
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"获取批量操作失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 导出工作流
    /// </summary>
    [HttpPost("export")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ExportWorkflows([FromBody] ExportWorkflowsRequest request)
    {
        try
        {
            if (request.WorkflowIds == null || request.WorkflowIds.Count == 0)
            {
                throw new ArgumentException("工作流ID列表不能为空");
            }

            var fileContent = await _exportImportService.ExportWorkflowsAsync(request.WorkflowIds, request.Config ?? new WorkflowExportConfig());
            var fileName = $"workflows_export_{DateTime.Now:yyyyMMddHHmmss}.{(request.Config?.Format == ExportFormat.Json ? "json" : "csv")}";

            return File(fileContent, "application/octet-stream", fileName);
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"导出工作流失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 导出过滤后的工作流
    /// </summary>
    [HttpPost("export-filtered")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ExportFilteredWorkflows([FromBody] ExportFilteredWorkflowsRequest request)
    {
        var fileContent = await _exportImportService.ExportFilteredWorkflowsAsync(request.Filters, request.Config ?? new WorkflowExportConfig());
        var fileName = $"workflows_export_filtered_{DateTime.Now:yyyyMMddHHmmss}.{(request.Config?.Format == ExportFormat.Json ? "json" : "csv")}";
        return File(fileContent, "application/octet-stream", fileName);
    }

    /// <summary>
    /// 验证导入文件
    /// </summary>
    [HttpPost("import/validate")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ValidateImportFile([FromForm] ValidateImportFileRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            throw new ArgumentException("导入文件不能为空");

        using var memoryStream = new MemoryStream();
        await request.File.CopyToAsync(memoryStream);
        return Success(await _exportImportService.ValidateImportFileAsync(memoryStream.ToArray(), request.File.FileName));
    }

    [HttpPost("import")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ImportWorkflows([FromForm] ImportWorkflowsRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            throw new ArgumentException("导入文件不能为空");

        using var memoryStream = new MemoryStream();
        await request.File.CopyToAsync(memoryStream);
        return Success(await _exportImportService.ImportWorkflowsAsync(memoryStream.ToArray(), request.File.FileName, request.OverwriteExisting));
    }

    /// <summary>
    /// 预览导入的工作流
    /// </summary>
    [HttpPost("import/preview")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> PreviewImport([FromForm] PreviewImportRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            throw new ArgumentException("导入文件不能为空");

        using var memoryStream = new MemoryStream();
        await request.File.CopyToAsync(memoryStream);
        return Success(await _exportImportService.PreviewImportAsync(memoryStream.ToArray(), request.File.FileName));
    }

    [HttpPost("import/resolve-conflicts")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ResolveImportConflicts([FromForm] ResolveImportConflictsRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            throw new ArgumentException("导入文件不能为空");

        if (request.Resolutions == null || request.Resolutions.Count == 0)
            throw new ArgumentException("冲突解决方案不能为空");

        using var memoryStream = new MemoryStream();
        await request.File.CopyToAsync(memoryStream);
        return Success(await _exportImportService.ResolveImportConflictsAsync(memoryStream.ToArray(), request.File.FileName, request.Resolutions));
    }
}
