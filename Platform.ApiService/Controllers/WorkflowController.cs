using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 工作流管理控制器
/// </summary>
[ApiController]
[Route("api/workflows")]
[Authorize]
public class WorkflowController : BaseApiController
{
    private readonly IDatabaseOperationFactory<WorkflowDefinition> _definitionFactory;
    private readonly IDatabaseOperationFactory<WorkflowInstance> _instanceFactory;
    private readonly IDatabaseOperationFactory<FormDefinition> _formFactory;
    private readonly IDatabaseOperationFactory<Document> _documentFactory;
    private readonly IWorkflowEngine _workflowEngine;
    private readonly IUserService _userService;
    private readonly IFieldValidationService _fieldValidationService;
    private readonly IWorkflowGraphValidator _graphValidator;
    private readonly ILogger<WorkflowController> _logger;

    /// <summary>
    /// 初始化工作流管理控制器
    /// </summary>
    /// <param name="definitionFactory">流程定义工厂</param>
    /// <param name="instanceFactory">流程实例工厂</param>
    /// <param name="formFactory">表单定义工厂</param>
    /// <param name="documentFactory">文档工厂</param>
    /// <param name="workflowEngine">工作流引擎</param>
    /// <param name="userService">用户服务</param>
    /// <param name="fieldValidationService">字段验证服务</param>
    /// <param name="logger">日志记录器</param>
    public WorkflowController(
        IDatabaseOperationFactory<WorkflowDefinition> definitionFactory,
        IDatabaseOperationFactory<WorkflowInstance> instanceFactory,
        IDatabaseOperationFactory<FormDefinition> formFactory,
        IDatabaseOperationFactory<Document> documentFactory,
        IWorkflowEngine workflowEngine,
        IUserService userService,
        IFieldValidationService fieldValidationService,
        IWorkflowGraphValidator graphValidator,
        ILogger<WorkflowController> logger)
    {
        _definitionFactory = definitionFactory;
        _instanceFactory = instanceFactory;
        _formFactory = formFactory;
        _documentFactory = documentFactory;
        _workflowEngine = workflowEngine;
        _userService = userService;
        _fieldValidationService = fieldValidationService;
        _graphValidator = graphValidator;
        _logger = logger;
    }

    /// <summary>
    /// 获取流程定义列表
    /// </summary>
    [HttpGet]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetWorkflows([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? keyword = null, [FromQuery] string? category = null, [FromQuery] bool? isActive = null)
    {
        try
        {
            // 验证分页参数
            if (page < 1 || page > 10000)
                throw new ArgumentException("页码必须在 1-10000 之间");

            if (pageSize < 1 || pageSize > 100)
                throw new ArgumentException("每页数量必须在 1-100 之间");

            var filterBuilder = _definitionFactory.CreateFilterBuilder();

            if (!string.IsNullOrEmpty(keyword))
            {
                filterBuilder.Regex(w => w.Name, keyword);
            }

            if (!string.IsNullOrEmpty(category))
            {
                filterBuilder.Equal(w => w.Category, category);
            }

            if (isActive.HasValue)
            {
                filterBuilder.Equal(w => w.IsActive, isActive.Value);
            }

            var filter = filterBuilder.Build();
            var sort = _definitionFactory.CreateSortBuilder()
                .Descending(w => w.CreatedAt)
                .Build();

            var result = await _definitionFactory.FindPagedAsync(filter, sort, page, pageSize);
            return SuccessPaged(result.items, result.total, page, pageSize);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            return ServerError($"获取流程定义列表失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 获取流程定义详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetWorkflow(string id)
    {
        try
        {
            var workflow = await _definitionFactory.GetByIdAsync(id);
            if (workflow == null)
            {
                return NotFoundError("流程定义", id);
            }

            return Success(workflow);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 创建流程定义
    /// </summary>
    [HttpPost]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> CreateWorkflow([FromBody] CreateWorkflowRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Name))
            {
                return ValidationError("流程名称不能为空");
            }

            if (request.Graph == null || request.Graph.Nodes == null || !request.Graph.Nodes.Any())
            {
                return ValidationError("流程图形定义不能为空");
            }

            // 验证图形合法性
            var (isGraphValid, graphError) = _graphValidator.Validate(request.Graph);
            if (!isGraphValid)
            {
                return ValidationError($"流程图形定义不合法: {graphError}");
            }

            var userId = GetRequiredUserId();
            var companyId = await _definitionFactory.GetRequiredCompanyIdAsync();

            var workflow = new WorkflowDefinition
            {
                Name = request.Name,
                Description = request.Description,
                Category = request.Category ?? string.Empty,
                Version = new WorkflowVersion { Major = 1, Minor = 0, CreatedAt = DateTime.UtcNow },
                Graph = request.Graph,
                IsActive = request.IsActive ?? true,
                CompanyId = companyId
            };

            workflow = await _definitionFactory.CreateAsync(workflow);
            return Success(workflow);
        }
        catch (Exception ex)
        {
            return Error("CREATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 更新流程定义
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> UpdateWorkflow(string id, [FromBody] UpdateWorkflowRequest request)
    {
        try
        {
            var workflow = await _definitionFactory.GetByIdAsync(id);
            if (workflow == null)
            {
                return NotFoundError("流程定义", id);
            }

            var updateBuilder = _definitionFactory.CreateUpdateBuilder();
            bool hasUpdate = false;

            if (!string.IsNullOrEmpty(request.Name))
            {
                updateBuilder.Set(w => w.Name, request.Name);
                hasUpdate = true;
            }

            if (request.Description != null)
            {
                updateBuilder.Set(w => w.Description, request.Description);
                hasUpdate = true;
            }

            if (!string.IsNullOrEmpty(request.Category))
            {
                updateBuilder.Set(w => w.Category, request.Category);
                hasUpdate = true;
            }

            if (request.Graph != null)
            {
                // 验证图形合法性
                var (isGraphValid, graphError) = _graphValidator.Validate(request.Graph);
                if (!isGraphValid)
                {
                    return ValidationError($"流程图形定义不合法: {graphError}");
                }
                
                updateBuilder.Set(w => w.Graph, request.Graph);
                hasUpdate = true;
            }

            if (request.IsActive.HasValue)
            {
                updateBuilder.Set(w => w.IsActive, request.IsActive.Value);
                hasUpdate = true;
            }

            if (!hasUpdate)
            {
                return Success(workflow);
            }

            var update = updateBuilder.Build();
            var filter = _definitionFactory.CreateFilterBuilder()
                .Equal(w => w.Id, id)
                .Build();

            var updated = await _definitionFactory.FindOneAndUpdateAsync(filter, update);
            return Success(updated);
        }
        catch (Exception ex)
        {
            return Error("UPDATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 删除流程定义
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> DeleteWorkflow(string id)
    {
        try
        {
            var filter = _definitionFactory.CreateFilterBuilder()
                .Equal(w => w.Id, id)
                .Build();

            var result = await _definitionFactory.FindOneAndSoftDeleteAsync(filter);
            if (result == null)
            {
                return NotFoundError("流程定义", id);
            }

            return Success("流程定义已删除");
        }
        catch (Exception ex)
        {
            return Error("DELETE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 启动流程实例
    /// </summary>
    [HttpPost("{id}/start")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> StartWorkflow(string id, [FromBody] StartWorkflowRequest request)
    {
        try
        {
            Dictionary<string, object>? sanitizedVars = null;
            
            if (request.Variables != null)
            {
                try
                {
                    sanitizedVars = Platform.ApiService.Extensions.SerializationExtensions.SanitizeDictionary(request.Variables);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "变量清洗失败: WorkflowId={WorkflowId}, Variables={Variables}", 
                        id, System.Text.Json.JsonSerializer.Serialize(request.Variables));
                    return Error("VARIABLE_SANITIZATION_FAILED", "流程变量处理失败，请检查变量格式");
                }
            }

            var instance = await _workflowEngine.StartWorkflowAsync(id, request.DocumentId, sanitizedVars);
            return Success(instance);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "启动流程失败: WorkflowId={WorkflowId}, DocumentId={DocumentId}", 
                id, request.DocumentId);
            return Error("START_FAILED", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "启动流程时发生未预期错误: WorkflowId={WorkflowId}, DocumentId={DocumentId}", 
                id, request.DocumentId);
            return Error("START_FAILED", "启动流程时发生错误，请稍后重试");
        }
    }

    /// <summary>
    /// 获取流程实例列表
    /// </summary>
    [HttpGet("instances")]
    [RequireMenu("workflow-monitor")]
    public async Task<IActionResult> GetInstances([FromQuery] int current = 1, [FromQuery] int pageSize = 10, [FromQuery] string? workflowDefinitionId = null, [FromQuery] WorkflowStatus? status = null)
    {
        try
        {
            var filterBuilder = _instanceFactory.CreateFilterBuilder();

            if (!string.IsNullOrEmpty(workflowDefinitionId))
            {
                filterBuilder.Equal(i => i.WorkflowDefinitionId, workflowDefinitionId);
            }

            if (status.HasValue)
            {
                filterBuilder.Equal(i => i.Status, status.Value);
            }

            var filter = filterBuilder.Build();
            var sort = _instanceFactory.CreateSortBuilder()
                .Descending(i => i.CreatedAt)
                .Build();

            var result = await _instanceFactory.FindPagedAsync(filter, sort, current, pageSize);
            return SuccessPaged(result.items, result.total, current, pageSize);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取用于创建公文的自定义表单（优先使用起始节点绑定的文档表单；若无，则取第一个绑定文档表单的节点）
    /// </summary>
    [HttpGet("{id}/document-form")]
    [RequireMenu("document-list")]
    public async Task<IActionResult> GetDocumentCreateForm(string id)
    {
        try
        {
            var definition = await _definitionFactory.GetByIdAsync(id);
            if (definition == null)
            {
                return NotFoundError("流程定义", id);
            }

            // 优先起始节点
            var startNode = definition.Graph.Nodes.FirstOrDefault(n => n.Type == "start");
            FormBinding? binding = startNode?.Config?.Form;

            if (binding == null || binding.Target != FormTarget.Document)
            {
                // 取第一个绑定了文档表单的节点
                var nodeWithDocForm = definition.Graph.Nodes
                    .FirstOrDefault(n => n.Config?.Form?.Target == FormTarget.Document);
                binding = nodeWithDocForm?.Config?.Form;
            }

            if (binding == null)
            {
                return Success(new { form = (FormDefinition?)null, dataScopeKey = (string?)null, initialValues = (object?)null });
            }

            var form = await _formFactory.GetByIdAsync(binding.FormDefinitionId);
            if (form == null)
            {
                return NotFoundError("表单定义", binding.FormDefinitionId);
            }

            // 生成初始值：使用字段 defaultValue；若存在 title 字段且无默认值，则用流程名称
            var initialValues = new Dictionary<string, object>();
            foreach (var field in form.Fields)
            {
                if (field.DefaultValue != null && !string.IsNullOrEmpty(field.DataKey))
                {
                    initialValues[field.DataKey] = field.DefaultValue;
                }
            }

            var titleField = form.Fields.FirstOrDefault(f => string.Equals(f.DataKey, "title", StringComparison.OrdinalIgnoreCase));
            if (titleField != null && !initialValues.ContainsKey("title"))
            {
                initialValues["title"] = definition.Name;
            }

            return Success(new { form, dataScopeKey = binding.DataScopeKey, initialValues });
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取当前用户待办的流程实例
    /// </summary>
    [HttpGet("instances/todo")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetTodoInstances([FromQuery] int current = 1, [FromQuery] int pageSize = 10)
    {
        try
        {
            var userId = GetRequiredUserId();
            var filter = _instanceFactory.CreateFilterBuilder()
                .Equal(i => i.Status, WorkflowStatus.Running)
                .AnyEq(i => i.CurrentApproverIds, userId) // 🔧 关键改进：使用高效索引直接查询待办
                .Build();
            var sort = _instanceFactory.CreateSortBuilder()
                .Descending(i => i.CreatedAt)
                .Build();

            var result = await _instanceFactory.FindPagedAsync(filter, sort, current, pageSize);
            var todos = new List<object>();

            foreach (var instance in result.items)
            {
                var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
                if (definition == null) continue;

                var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == instance.CurrentNodeId);
                if (currentNode == null || currentNode.Type != "approval" || currentNode.Config.Approval == null)
                {
                    continue;
                }

                var approvers = await _workflowEngine.GetNodeApproversAsync(instance.Id, instance.CurrentNodeId);
                if (!approvers.Contains(userId))
                {
                    continue;
                }

                var document = await _documentFactory.GetByIdAsync(instance.DocumentId);

                todos.Add(new
                {
                    instance.Id,
                    instance.WorkflowDefinitionId,
                    instance.DocumentId,
                    instance.Status,
                    instance.CurrentNodeId,
                    instance.StartedBy,
                    instance.StartedAt,
                    instance.TimeoutAt, // 增加超时时间显示
                    DefinitionName = definition.Name,
                    DefinitionCategory = definition.Category,
                    CurrentNode = new { currentNode.Id, currentNode.Label, currentNode.Type },
                    Document = document == null ? null : new
                    {
                        document.Id,
                        document.Title,
                        document.Status,
                        document.DocumentType,
                        document.Category,
                        document.CreatedAt,
                        document.CreatedBy
                    }
                });
            }

            return SuccessPaged(todos, result.total, current, pageSize);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取流程实例详情
    /// </summary>
    [HttpGet("instances/{id}")]
    [RequireMenu("workflow-monitor")]
    public async Task<IActionResult> GetInstance(string id)
    {
        try
        {
            var instance = await _workflowEngine.GetInstanceAsync(id);
            if (instance == null)
            {
                return NotFoundError("流程实例", id);
            }

            return Success(instance);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取审批历史
    /// </summary>
    [HttpGet("instances/{id}/history")]
    [RequireMenu("workflow-monitor")]
    public async Task<IActionResult> GetApprovalHistory(string id)
    {
        try
        {
            var history = await _workflowEngine.GetApprovalHistoryAsync(id);
            return Success(history);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取流程实例当前节点的表单定义与初始值
    /// </summary>
    [HttpGet("instances/{id}/nodes/{nodeId}/form")]
    [RequireMenu("workflow-monitor")]
    public async Task<IActionResult> GetNodeForm(string id, string nodeId)
    {
        try
        {
            var instance = await _workflowEngine.GetInstanceAsync(id);
            if (instance == null)
            {
                return NotFoundError("流程实例", id);
            }

            // 优先使用实例中的定义快照，如果没有快照则使用最新定义（向后兼容）
            WorkflowDefinition? definition = instance.WorkflowDefinitionSnapshot;
            if (definition == null)
            {
                definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
                if (definition == null)
                {
                    return NotFoundError("流程定义", instance.WorkflowDefinitionId);
                }
            }

            var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
            if (node == null)
            {
                return ValidationError("节点不存在");
            }

            var binding = node.Config.Form;
            if (binding == null)
            {
                return Success(new { form = (FormDefinition?)null, initialValues = (object?)null });
            }

            // 优先使用实例中的表单定义快照
            FormDefinition? form = null;
            if (instance.FormDefinitionSnapshots != null && instance.FormDefinitionSnapshots.TryGetValue(nodeId, out var snapshotForm))
            {
                form = snapshotForm;
            }
            else
            {
                // 如果没有快照，则使用最新定义（向后兼容）
                form = await _formFactory.GetByIdAsync(binding.FormDefinitionId);
                if (form == null)
                {
                    return NotFoundError("表单定义", binding.FormDefinitionId);
                }
            }

            object? initialValues = null;
            if (binding.Target == FormTarget.Document)
            {
                var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
                if (document != null)
                {
                    var sourceFormData = document.FormData ?? new Dictionary<string, object>();
                    if (!string.IsNullOrWhiteSpace(binding.DataScopeKey))
                    {
                        if (sourceFormData.TryGetValue(binding.DataScopeKey, out var scopedData) && scopedData is Dictionary<string, object> scopedDict)
                        {
                            initialValues = scopedDict;
                        }
                    }
                    else
                    {
                        initialValues = sourceFormData;
                    }
                }
            }
            else
            {
                initialValues = instance.Variables;
            }

            return Success(new { form, initialValues });
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 提交节点表单数据
    /// </summary>
    [HttpPost("instances/{id}/nodes/{nodeId}/form")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> SubmitNodeForm(string id, string nodeId, [FromBody] Dictionary<string, object> values)
    {
        try
        {
            var instance = await _workflowEngine.GetInstanceAsync(id);
            if (instance == null)
            {
                return NotFoundError("流程实例", id);
            }

            // 优先使用实例中的定义快照
            WorkflowDefinition? definition = instance.WorkflowDefinitionSnapshot;
            if (definition == null)
            {
                definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
                if (definition == null)
                {
                    return NotFoundError("流程定义", instance.WorkflowDefinitionId);
                }
            }

            var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
            if (node == null)
            {
                return ValidationError("节点不存在");
            }

            var binding = node.Config.Form;
            if (binding == null)
            {
                return ValidationError("该节点未绑定表单");
            }

            // 获取表单定义进行验证
            FormDefinition? form = null;
            if (instance.FormDefinitionSnapshots != null && instance.FormDefinitionSnapshots.TryGetValue(nodeId, out var snapshotForm))
            {
                form = snapshotForm;
            }
            else
            {
                form = await _formFactory.GetByIdAsync(binding.FormDefinitionId);
                if (form == null)
                {
                    return NotFoundError("表单定义", binding.FormDefinitionId);
                }
            }

            // 表单数据验证
            if (binding.Required && (values == null || values.Count == 0))
            {
                return ValidationError("表单数据不能为空");
            }

            // 使用字段验证服务进行详细验证
            if (values != null && values.Any())
            {
                var validationErrors = _fieldValidationService.ValidateFormData(form, values);
                if (validationErrors.Any())
                {
                    return ValidationError(string.Join("; ", validationErrors));
                }
            }

            // 清洗 JsonElement 等不可序列化类型
            values = Platform.ApiService.Extensions.SerializationExtensions.SanitizeDictionary(values ?? new Dictionary<string, object>());

            if (binding.Target == FormTarget.Document)
            {
                var updateBuilder = _documentFactory.CreateUpdateBuilder();
                if (!string.IsNullOrWhiteSpace(binding.DataScopeKey))
                {
                    // 将数据作为子键存储在 FormData 中
                    var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
                    var formData = document?.FormData ?? new Dictionary<string, object>();
                    formData[binding.DataScopeKey] = values;
                    updateBuilder.Set(d => d.FormData, formData);
                }
                else
                {
                    updateBuilder.Set(d => d.FormData, values);
                }

                var update = updateBuilder.Build();
                var filter = _documentFactory.CreateFilterBuilder()
                    .Equal(d => d.Id, instance.DocumentId)
                    .Build();
                var updated = await _documentFactory.FindOneAndUpdateAsync(filter, update);
                return Success(updated?.FormData ?? values);
            }
            else
            {
                // 存储到实例变量
                var instanceUpdateBuilder = _instanceFactory.CreateUpdateBuilder();
                if (!string.IsNullOrWhiteSpace(binding.DataScopeKey))
                {
                    var vars = instance.Variables ?? new Dictionary<string, object>();
                    vars[binding.DataScopeKey] = values;
                    instanceUpdateBuilder.Set(i => i.Variables, vars);
                }
                else
                {
                    instanceUpdateBuilder.Set(i => i.Variables, values);
                }

                var update = instanceUpdateBuilder.Build();
                var filter = _instanceFactory.CreateFilterBuilder()
                    .Equal(i => i.Id, id)
                    .Build();
                var updated = await _instanceFactory.FindOneAndUpdateAsync(filter, update);
                return Success(updated?.Variables ?? values);
            }
        }
        catch (Exception ex)
        {
            return ServerError($"提交表单数据失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 对流程实例节点执行审批/退回/转办
    /// </summary>
    [HttpPost("instances/{id}/nodes/{nodeId}/action")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ExecuteNodeAction(string id, string nodeId, [FromBody] WorkflowActionRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Action))
            {
                return ValidationError("操作类型不能为空");
            }

            // 🔧 支持填表 + 审批一步到位
            if (request.FormData != null && request.FormData.Any())
            {
                var submitResult = await SubmitNodeForm(id, nodeId, request.FormData);
                if (submitResult is ObjectResult obj && obj.StatusCode != 200)
                {
                    return submitResult; // 如果填表校验失败，直接返回
                }
            }

            var action = request.Action.Trim().ToLowerInvariant();

            switch (action)
            {
                case "approve":
                    await _workflowEngine.ProcessApprovalAsync(id, nodeId, ApprovalAction.Approve, request.Comment);
                    return Success("审批通过");

                case "reject":
                    if (string.IsNullOrWhiteSpace(request.Comment))
                    {
                        return ValidationError("拒绝原因不能为空");
                    }
                    await _workflowEngine.ProcessApprovalAsync(id, nodeId, ApprovalAction.Reject, request.Comment);
                    return Success("审批已拒绝");

                case "return":
                    if (string.IsNullOrEmpty(request.TargetNodeId))
                    {
                        return ValidationError("退回目标节点不能为空");
                    }
                    if (string.IsNullOrWhiteSpace(request.Comment))
                    {
                        return ValidationError("退回原因不能为空");
                    }
                    await _workflowEngine.ReturnToNodeAsync(id, request.TargetNodeId, request.Comment);
                    return Success("已退回");

                case "delegate":
                    if (string.IsNullOrEmpty(request.DelegateToUserId))
                    {
                        return ValidationError("转办目标用户不能为空");
                    }
                    await _workflowEngine.ProcessApprovalAsync(id, nodeId, ApprovalAction.Delegate, request.Comment, request.DelegateToUserId);
                    return Success("已转办");

                default:
                    return ValidationError("不支持的操作类型");
            }
        }
        catch (Exception ex)
        {
            return Error("ACTION_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 发起人撤回流程
    /// </summary>
    [HttpPost("instances/{id}/withdraw")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> WithdrawInstance(string id, [FromBody] WithdrawWorkflowRequest? request)
    {
        try
        {
            var instance = await _workflowEngine.GetInstanceAsync(id);
            if (instance == null)
            {
                return NotFoundError("流程实例", id);
            }

            if (instance.Status != WorkflowStatus.Running)
            {
                return ValidationError("仅运行中的流程可以撤回");
            }

            var userId = GetRequiredUserId();
            if (!string.Equals(instance.StartedBy, userId, StringComparison.OrdinalIgnoreCase))
            {
                return ValidationError("仅流程发起人可以撤回");
            }

            var reason = string.IsNullOrWhiteSpace(request?.Reason) ? "发起人撤回" : request!.Reason!;
            await _workflowEngine.CancelWorkflowAsync(id, reason);
            return Success("流程已撤回");
        }
        catch (Exception ex)
        {
            return Error("WITHDRAW_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 按流程的创建表单创建公文（草稿），仅保存数据不启动流程
    /// </summary>
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
            return Error("CREATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 创建公文并直接启动流程（一步到位）
    /// </summary>
    [HttpPost("{id}/documents/start")]
    [RequireMenu("document-list")]
    public async Task<IActionResult> CreateAndStartDocumentWorkflow(string id, [FromBody] CreateAndStartWorkflowDocumentRequest request)
    {
        try
        {
            var docService = HttpContext.RequestServices.GetRequiredService<IDocumentService>();
            // 1. 按表单创建草稿公文（含必填校验与 DataScopeKey 存储）
            var document = await docService.CreateDocumentForWorkflowAsync(id, request.Values ?? new Dictionary<string, object>(), request.AttachmentIds);

            // 2. 启动流程：若未显式提供 variables，则将表单值合并为实例变量
            var mergedVariables = request.Variables != null
                ? Platform.ApiService.Extensions.SerializationExtensions.SanitizeDictionary(request.Variables)
                : new Dictionary<string, object>();

            if (request.Values != null)
            {
                foreach (var kv in request.Values)
                {
                    if (!mergedVariables.ContainsKey(kv.Key))
                        mergedVariables[kv.Key] = kv.Value;
                }
            }

            var instance = await _workflowEngine.StartWorkflowAsync(id, document.Id, mergedVariables);

            return Success(new { document, workflowInstance = instance });
        }
        catch (Exception ex)
        {
            return Error("START_FAILED", ex.Message);
        }
    }
}

/// <summary>
/// 创建流程定义请求
/// </summary>
public class CreateWorkflowRequest
{
    /// <summary>
    /// 流程名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 流程描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 流程分类
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// 流程图形定义
    /// </summary>
    public WorkflowGraph Graph { get; set; } = new();

    /// <summary>
    /// 是否启用
    /// </summary>
    public bool? IsActive { get; set; }
}

/// <summary>
/// 更新流程定义请求
/// </summary>
public class UpdateWorkflowRequest
{
    /// <summary>
    /// 流程名称
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// 流程描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 流程分类
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// 流程图形定义
    /// </summary>
    public WorkflowGraph? Graph { get; set; }

    /// <summary>
    /// 是否启用
    /// </summary>
    public bool? IsActive { get; set; }
}

/// <summary>
/// 启动流程请求
/// </summary>
public class StartWorkflowRequest
{
    /// <summary>
    /// 公文ID
    /// </summary>
    public string DocumentId { get; set; } = string.Empty;

    /// <summary>
    /// 流程变量
    /// </summary>
    public Dictionary<string, object>? Variables { get; set; }
}

/// <summary>
/// 节点动作请求
/// </summary>
public class WorkflowActionRequest
{
    /// <summary>
    /// 操作类型：approve/reject/return/delegate
    /// </summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// 备注/意见
    /// </summary>
    public string? Comment { get; set; }

    /// <summary>
    /// 退回目标节点ID
    /// </summary>
    public string? TargetNodeId { get; set; }

    /// <summary>
    /// 转办目标用户ID
    /// </summary>
    public string? DelegateToUserId { get; set; }

    /// <summary>
    /// 随审批动作提交的表单数据（可选，用于填表+审批一步到位）
    /// </summary>
    public Dictionary<string, object>? FormData { get; set; }
}

/// <summary>
/// 撤回流程请求
/// </summary>
public class WithdrawWorkflowRequest
{
    /// <summary>
    /// 撤回原因
    /// </summary>
    public string? Reason { get; set; }
}

/// <summary>
/// 根据流程创建公文请求
/// </summary>
public class CreateWorkflowDocumentRequest
{
    /// <summary>
    /// 表单值（键为字段 dataKey）
    /// </summary>
    public Dictionary<string, object>? Values { get; set; }

    /// <summary>
    /// 附件ID列表
    /// </summary>
    public List<string>? AttachmentIds { get; set; }
}

/// <summary>
/// 创建并启动流程请求
/// </summary>
public class CreateAndStartWorkflowDocumentRequest : CreateWorkflowDocumentRequest
{
    /// <summary>
    /// 启动流程时的实例变量（可选）
    /// </summary>
    public Dictionary<string, object>? Variables { get; set; }
}
