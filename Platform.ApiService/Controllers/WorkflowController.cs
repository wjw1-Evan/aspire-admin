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
    private readonly DbContext _context;

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
    private readonly ILogger<WorkflowController> _logger;

    /// <summary>
    /// 初始化工作流管理控制器
    /// </summary>
    /// <param name="context">数据库上下文</param>
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
    /// <param name="logger">日志记录器</param>
    public WorkflowController(DbContext context,
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
        ILogger<WorkflowController> logger
    ) {
        _context = context;
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
        _logger = logger;
    }

    /// <summary>
    /// 获取流程定义列表
    /// </summary>
    [HttpGet]
    [RequireMenu("workflow-list", "workflow-monitor")]
    public async Task<IActionResult> GetWorkflows([FromQuery] WorkflowSearchRequest request)
    {
        try
        {
            if (request.Page < 1 || request.Page > 10000)
                throw new ArgumentException("页码必须在 1-10000 之间");

            if (request.PageSize < 1 || request.PageSize > 100)
                throw new ArgumentException("每页数量必须在 1-100 之间");

            Expression<Func<WorkflowDefinition, bool>>? filter = null;

            if (!string.IsNullOrEmpty(request.Keyword))
            {
                filter = w => w.Name.Contains(request.Keyword) ||
                              (w.Description != null && w.Description.Contains(request.Keyword)) ||
                              w.Category.Contains(request.Keyword);
            }

            // Support both single category and Categories array
            if (!string.IsNullOrEmpty(request.Category))
            {
                var category = request.Category;
                Expression<Func<WorkflowDefinition, bool>> categoryFilter = w => w.Category == category;
                filter = filter == null ? categoryFilter : filter.And(categoryFilter);
            }
            else if (request.Categories != null && request.Categories.Any())
            {
                var categories = request.Categories;
                Expression<Func<WorkflowDefinition, bool>> categoryFilter = w => categories.Contains(w.Category);
                filter = filter == null ? categoryFilter : filter.And(categoryFilter);
            }

            // Support both IsActive boolean and Statuses array
            if (request.IsActive.HasValue)
            {
                var isActive = request.IsActive.Value;
                Expression<Func<WorkflowDefinition, bool>> statusFilter = w => w.IsActive == isActive;
                filter = filter == null ? statusFilter : filter.And(statusFilter);
            }
            else if (request.Statuses != null && request.Statuses.Any())
            {
                var statusValues = request.Statuses.Select(s => s == "active").ToList();
                Expression<Func<WorkflowDefinition, bool>> statusFilter = w => statusValues.Contains(w.IsActive);
                filter = filter == null ? statusFilter : filter.And(statusFilter);
            }

            if (request.DateRange != null)
            {
                Expression<Func<WorkflowDefinition, bool>> dateFilter = w => true;
                switch (request.DateRange.Field?.ToLowerInvariant())
                {
                    case "createdat":
                    case "created":
                        if (request.DateRange.Start.HasValue)
                            dateFilter = w => w.CreatedAt >= request.DateRange.Start.Value;
                        if (request.DateRange.End.HasValue)
                            dateFilter = w => w.CreatedAt <= request.DateRange.End.Value;
                        break;
                    case "updatedat":
                    case "updated":
                        if (request.DateRange.Start.HasValue)
                            dateFilter = w => w.UpdatedAt >= request.DateRange.Start.Value;
                        if (request.DateRange.End.HasValue)
                            dateFilter = w => w.UpdatedAt <= request.DateRange.End.Value;
                        break;
                    case "lastused":
                        if (request.DateRange.Start.HasValue)
                            dateFilter = w => w.Analytics.LastUsedAt >= request.DateRange.Start.Value;
                        if (request.DateRange.End.HasValue)
                            dateFilter = w => w.Analytics.LastUsedAt <= request.DateRange.End.Value;
                        break;
                }
                filter = filter == null ? dateFilter : filter.And(dateFilter);
            }

            if (request.UsageRange != null)
            {
                Expression<Func<WorkflowDefinition, bool>> usageFilter = w => true;
                if (request.UsageRange.Min.HasValue)
                    usageFilter = w => w.Analytics.UsageCount >= request.UsageRange.Min.Value;
                if (request.UsageRange.Max.HasValue)
                    usageFilter = w => w.Analytics.UsageCount <= request.UsageRange.Max.Value;
                filter = filter == null ? usageFilter : filter.And(usageFilter);
            }

            if (request.CreatedBy != null && request.CreatedBy.Any())
            {
                var createdByList = request.CreatedBy;
                Expression<Func<WorkflowDefinition, bool>> createdByFilter = w => w.CreatedBy != null && createdByList.Contains(w.CreatedBy);
                filter = filter == null ? createdByFilter : filter.And(createdByFilter);
            }

            Func<IQueryable<WorkflowDefinition>, IOrderedQueryable<WorkflowDefinition>> sort = q =>
            {
                if (!string.IsNullOrEmpty(request.SortBy))
                {
                    var isDescending = request.SortOrder?.ToLowerInvariant() == "desc";
                    switch (request.SortBy.ToLowerInvariant())
                    {
                        case "name":
                            return isDescending ? q.OrderByDescending(w => w.Name) : q.OrderBy(w => w.Name);
                        case "category":
                            return isDescending ? q.OrderByDescending(w => w.Category) : q.OrderBy(w => w.Category);
                        case "createdat":
                            return isDescending ? q.OrderByDescending(w => w.CreatedAt) : q.OrderBy(w => w.CreatedAt);
                        case "updatedat":
                            return isDescending ? q.OrderByDescending(w => w.UpdatedAt) : q.OrderBy(w => w.UpdatedAt);
                        case "usagecount":
                            return isDescending ? q.OrderByDescending(w => w.Analytics.UsageCount) : q.OrderBy(w => w.Analytics.UsageCount);
                        default:
                            return q.OrderByDescending(w => w.CreatedAt);
                    }
                }
                return q.OrderByDescending(w => w.CreatedAt);
            };

            var queryable = _context.Set<WorkflowDefinition>().Where(filter ?? (w => true));
            var totalCount = await queryable.LongCountAsync();
            var items = await sort(queryable).Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToListAsync();

            return SuccessPaged(items, totalCount, request.Page, request.PageSize);
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
    [RequireMenu("workflow-list", "workflow-monitor", "document-list", "document-approval")]
    public async Task<IActionResult> GetWorkflow(string id)
    {
        try
        {
            var workflow = await _workflowQueryService.GetWorkflowByIdAsync(id);
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

            var (isGraphValid, graphError) = _graphValidator.Validate(request.Graph);
            if (!isGraphValid)
            {
                return ValidationError($"流程图形定义不合法: {graphError}");
            }

            var workflow = new WorkflowDefinition
            {
                Name = request.Name,
                Description = request.Description,
                Category = request.Category ?? string.Empty,
                Version = new WorkflowVersion { Major = 1, Minor = 0, CreatedAt = DateTime.UtcNow },
                Graph = request.Graph,
                IsActive = request.IsActive ?? true
            };

            var result = await _workflowDefinitionService.CreateWorkflowAsync(workflow);
            return Success(result);
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
            var existing = await _workflowQueryService.GetWorkflowByIdAsync(id);
            if (existing == null)
            {
                return NotFoundError("流程定义", id);
            }

            if (request.Graph != null)
            {
                var (isGraphValid, graphError) = _graphValidator.Validate(request.Graph);
                if (!isGraphValid)
                {
                    return ValidationError($"流程图形定义不合法: {graphError}");
                }
            }

            if (!string.IsNullOrEmpty(request.Name)) existing.Name = request.Name;
            if (request.Description != null) existing.Description = request.Description;
            if (!string.IsNullOrEmpty(request.Category)) existing.Category = request.Category;
            if (request.Graph != null) existing.Graph = request.Graph;
            if (request.IsActive.HasValue) existing.IsActive = request.IsActive.Value;

            var result = await _workflowDefinitionService.UpdateWorkflowAsync(id, existing);
            return Success(result);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
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
            var result = await _workflowDefinitionService.DeleteWorkflowAsync(id);
            if (!result)
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
    [RequireMenu("workflow-list", "document-list")]
    public async Task<IActionResult> StartWorkflow(string id, [FromBody] StartWorkflowRequest request)
    {
        try
        {
            var userId = GetRequiredUserId();
            Dictionary<string, object?>? sanitizedVars = null;

            if (request.Variables != null)
            {
                try
                {
                    sanitizedVars = (Dictionary<string, object?>)(object)Platform.ApiService.Extensions.SerializationExtensions.SanitizeDictionary(request.Variables);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "变量清洗失败: WorkflowId={WorkflowId}, Variables={Variables}",
                        id, System.Text.Json.JsonSerializer.Serialize(request.Variables));
                    return Error("VARIABLE_SANITIZATION_FAILED", "流程变量处理失败，请检查变量格式");
                }
            }

            var instance = await _workflowEngine.StartWorkflowAsync(id, request.DocumentId, userId, sanitizedVars);
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
    /// 启动流程实例（别名端点）
    /// </summary>
    [HttpPost("{id}/instances")]
    [RequireMenu("workflow-list", "document-list")]
    public async Task<IActionResult> StartWorkflowInstance(string id, [FromBody] StartWorkflowRequest request)
    {
        return await StartWorkflow(id, request);
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
            var (items, totalCount) = await _workflowInstanceQueryService.GetInstancesAsync(current, pageSize, workflowDefinitionId, status);
            return SuccessPaged(items, totalCount, current, pageSize);
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
            var definition = await _workflowQueryService.GetWorkflowByIdAsync(id);
            if (definition == null)
            {
                return NotFoundError("流程定义", id);
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
            {
                return Success(new { form = (FormDefinition?)null, dataScopeKey = (string?)null, initialValues = (object?)null });
            }

            var form = await _formDefinitionService.GetFormByIdAsync(binding.FormDefinitionId);

            if (form == null)
            {
                return NotFoundError("表单定义", binding.FormDefinitionId);
            }

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
    /// 获取流程中使用的所有表单及其字段（用于条件组件的二级联动选择）
    /// </summary>
    /// <remarks>
    /// 返回流程定义中所有节点绑定的表单及其字段列表
    /// 用于条件组件的二级联动选择：第一级为表单，第二级为字段
    /// </remarks>
    [HttpGet("{id}/forms-and-fields")]
    [RequireMenu("workflow-list", "document-list")]
    public async Task<IActionResult> GetWorkflowFormsAndFields(string id)
    {
        try
        {
            var definition = await _workflowQueryService.GetWorkflowByIdAsync(id);
            if (definition == null)
            {
                return NotFoundError("流程定义", id);
            }

            // 收集流程中所有节点绑定的表单
            var formBindings = new Dictionary<string, FormBinding>();
            foreach (var node in definition.Graph.Nodes)
            {
                var binding = node.Data.Config?.Form;
                if (binding != null && !string.IsNullOrEmpty(binding.FormDefinitionId))
                {
                    if (!formBindings.ContainsKey(binding.FormDefinitionId))
                    {
                        formBindings[binding.FormDefinitionId] = binding;
                    }
                }
            }

            if (formBindings.Count == 0)
            {
                return Success(new { forms = new List<object>() });
            }

            // 获取所有表单定义
            var formIds = formBindings.Keys.ToList();
            var forms = await _formDefinitionService.GetFormsByIdsAsync(formIds);

            // 构建返回数据：表单列表，每个表单包含其字段
            var result = forms.Select(form => new
            {
                form.Id,
                form.Name,
                form.Key,
                Fields = form.Fields == null ? new List<dynamic>() : form.Fields.Select(field => new
                {
                    field.Id,
                    field.Label,
                    field.DataKey,
                    field.Type,
                    field.Required
                }).Cast<dynamic>().ToList()
            }).ToList();

            return Success(new { forms = result });
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
    [RequireMenu("document-approval")]
    public async Task<IActionResult> GetTodoInstances([FromQuery] int current = 1, [FromQuery] int pageSize = 10)
    {
        try
        {
            var userId = GetRequiredUserId();
            var (todos, totalCount) = await _workflowTodoService.GetTodoInstancesAsync(userId, current, pageSize);
            return SuccessPaged(todos, totalCount, current, pageSize);
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
    [RequireMenu("workflow-monitor", "document-approval", "document-list")]
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
            return Error("GET_FAILED", ex.Message);
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
                return NotFoundError("流程实例", id);
            }

            WorkflowDefinition? definition = instance.WorkflowDefinitionSnapshot;
            if (definition == null)
            {
                definition = await _workflowQueryService.GetWorkflowByIdAsync(instance.WorkflowDefinitionId);
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
                    return NotFoundError("表单定义", binding.FormDefinitionId);
                }
            }

            object? initialValues = null;
            if (binding.Target == FormTarget.Document)
            {
                Document? document = null;
                if (!string.IsNullOrEmpty(instance.DocumentId))
                {
                    document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == instance.DocumentId);
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
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 提交节点表单数据
    /// </summary>
    [HttpPost("instances/{id}/nodes/{nodeId}/form")]
    [RequireMenu("workflow-list", "document-approval")]
    public async Task<IActionResult> SubmitNodeForm(string id, string nodeId, [FromBody] Dictionary<string, object> values)
    {
        try
        {
            var instance = await _workflowEngine.GetInstanceAsync(id);
            if (instance == null)
            {
                return NotFoundError("流程实例", id);
            }

            WorkflowDefinition? definition = instance.WorkflowDefinitionSnapshot;
            if (definition == null)
            {
                definition = await _workflowQueryService.GetWorkflowByIdAsync(instance.WorkflowDefinitionId);
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

            var binding = node.Data.Config?.Form;

            if (binding == null || string.IsNullOrEmpty(binding.FormDefinitionId))
            {
                return ValidationError("该节点未绑定完整表单定义");
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
                    return NotFoundError("表单定义", binding.FormDefinitionId);
                }
            }

            if (binding.Required && (values == null || values.Count == 0))
            {
                return ValidationError("表单数据不能为空");
            }

            if (values != null && values.Any())
            {
                var validationErrors = _fieldValidationService.ValidateFormData(form, values);
                if (validationErrors.Any())
                {
                    return ValidationError(string.Join("; ", validationErrors));
                }
            }

            var sanitizedValues = Platform.ApiService.Extensions.SerializationExtensions.SanitizeDictionary(values ?? new Dictionary<string, object>());
            var valuesWithNulls = (Dictionary<string, object?>)(object)sanitizedValues;

            if (binding.Target == FormTarget.Document)
            {
                if (string.IsNullOrEmpty(instance.DocumentId)) return ValidationError("当前实例未关联公文");
                // Bug 15 修复：提前 await 获取 document，避免 GetAwaiter().GetResult() 同步阻塞
                var existingDoc = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == instance.DocumentId);
                Action<Document> updateAction = d =>
                {
                    if (!string.IsNullOrWhiteSpace(binding.DataScopeKey))
                    {
                        var formData = d.FormData ?? new Dictionary<string, object>();
                        formData[binding.DataScopeKey] = sanitizedValues;
                        d.FormData = formData;
                    }
                    else
                    {
                        var existingFormData = d.FormData ?? new Dictionary<string, object>();
                        foreach (var kvp in sanitizedValues)
                        {
                            existingFormData[kvp.Key] = kvp.Value;
                        }
                        d.FormData = existingFormData;
                    }
                };

                if (existingDoc != null)
                {
                    updateAction(existingDoc);
                    await _context.SaveChangesAsync();
                }
                return Success(existingDoc?.FormData ?? (object)sanitizedValues);
            }
            else
            {
                Action<WorkflowInstance> updateAction = i =>
                {
                    if (!string.IsNullOrWhiteSpace(binding.DataScopeKey))
                    {
                        i.SetVariable(binding.DataScopeKey, valuesWithNulls);
                    }
                    else
                    {
                        i.ResetVariables(valuesWithNulls);
                    }
                };

                updateAction(instance);
                await _context.SaveChangesAsync();
                return Success(instance.GetVariablesDict() ?? valuesWithNulls);
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
    [RequireMenu("workflow-list", "document-approval")]
    public async Task<IActionResult> ExecuteNodeAction(string id, string nodeId, [FromBody] WorkflowActionRequest request)
    {
        try
        {
            var userId = GetRequiredUserId();

            if (string.IsNullOrWhiteSpace(request.Action))
            {
                return ValidationError("操作类型不能为空");
            }

            if (request.FormData != null && request.FormData.Any())
            {
                var submitResult = await SubmitNodeForm(id, nodeId, request.FormData);
                if (submitResult is ObjectResult obj && obj.StatusCode != 200)
                {
                    return submitResult;
                }
            }

            var action = request.Action.Trim().ToLowerInvariant();

            switch (action)
            {
                case "approve":
                    await _workflowEngine.ProcessApprovalAsync(id, nodeId, ApprovalAction.Approve, userId, request.Comment);
                    return Success("审批通过");

                case "reject":
                    if (string.IsNullOrWhiteSpace(request.Comment))
                    {
                        return ValidationError("拒绝原因不能为空");
                    }
                    await _workflowEngine.ProcessApprovalAsync(id, nodeId, ApprovalAction.Reject, userId, request.Comment);
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
                    await _workflowEngine.ReturnToNodeAsync(id, request.TargetNodeId, request.Comment, userId);
                    return Success("已退回");

                case "delegate":
                    if (string.IsNullOrEmpty(request.DelegateToUserId))
                    {
                        return ValidationError("转办目标用户不能为空");
                    }
                    await _workflowEngine.ProcessApprovalAsync(id, nodeId, ApprovalAction.Delegate, userId, request.Comment, request.DelegateToUserId);
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
    [RequireMenu("workflow-list", "document-list")]
    public async Task<IActionResult> WithdrawInstance(string id, [FromBody] WithdrawWorkflowRequest? request)
    {
        try
        {
            var instance = await _workflowEngine.GetInstanceAsync(id);
            if (instance == null)
            {
                return NotFoundError("流程实例", id);
            }

            if (instance.Status != WorkflowStatus.Running && instance.Status != WorkflowStatus.Waiting)
            {
                return ValidationError("仅运行中或等待审批的流程可以撤回");
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
    /// 获取用户工作流过滤器偏好列表
    /// </summary>
    [HttpGet("filter-preferences")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetFilterPreferences()
    {
        try
        {
            var userId = GetRequiredUserId();
            var preferences = await _filterPreferenceService.GetPreferencesAsync(userId);
            return Success(preferences);
        }
        catch (Exception ex)
        {
            return ServerError($"获取过滤器偏好失败: {ex.Message}");
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
                return ValidationError("偏好名称不能为空");
            }

            var userId = GetRequiredUserId();

            var existing = await _filterPreferenceService.HasPreferenceByNameAsync(userId, request.Name);
            if (existing)
            {
                return ValidationError("已存在同名的过滤器偏好");
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
            return ServerError($"保存过滤器偏好失败: {ex.Message}");
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
            var userId = GetRequiredUserId();

            var existing = await _filterPreferenceService.GetPreferenceByIdAsync(id);
            if (existing == null || existing.UserId != userId)
            {
                return NotFoundError("过滤器偏好", id);
            }

            if (!string.IsNullOrEmpty(request.Name) && request.Name != existing.Name)
            {
                var hasName = await _filterPreferenceService.HasPreferenceByNameAsync(userId, request.Name);
                if (hasName)
                {
                    return ValidationError("已存在同名的过滤器偏好");
                }
            }

            var name = string.IsNullOrEmpty(request.Name) ? existing.Name : request.Name;
            var filterConfig = request.FilterConfig ?? existing.FilterConfig;
            var isDefault = request.IsDefault ?? existing.IsDefault;

            var result = await _filterPreferenceService.UpdatePreferenceAsync(id, name, filterConfig, isDefault);
            return Success(result);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            return ServerError($"更新过滤器偏好失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 删除用户工作流过滤器偏好
    /// </summary>
    [HttpDelete("filter-preferences/{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> DeleteFilterPreference(string id)
    {
        try
        {
            var userId = GetRequiredUserId();

            var preference = await _filterPreferenceService.GetPreferenceByIdAsync(id);
            if (preference == null || preference.UserId != userId)
            {
                return NotFoundError("过滤器偏好", id);
            }

            var result = await _filterPreferenceService.DeletePreferenceAsync(id);
            if (!result)
            {
                return NotFoundError("过滤器偏好", id);
            }

            return Success("过滤器偏好已删除");
        }
        catch (Exception ex)
        {
            return ServerError($"删除过滤器偏好失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 获取用户默认过滤器偏好
    /// </summary>
    [HttpGet("filter-preferences/default")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetDefaultFilterPreference()
    {
        try
        {
            var userId = GetRequiredUserId();

            var preference = await _filterPreferenceService.GetDefaultPreferenceAsync(userId);
            return Success(preference);
        }
        catch (Exception ex)
        {
            return ServerError($"获取默认过滤器偏好失败: {ex.Message}");
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
            var userId = GetRequiredUserId();
            var docService = HttpContext.RequestServices.GetRequiredService<IDocumentService>();
            var document = await docService.CreateDocumentForWorkflowAsync(id, request.Values ?? new Dictionary<string, object>(), request.AttachmentIds);

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

            var instance = await _workflowEngine.StartWorkflowAsync(id, document.Id, userId, (Dictionary<string, object?>)(object)mergedVariables);

            return Success(new { document, workflowInstance = instance });
        }
        catch (Exception ex)
        {
            return Error("START_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 创建批量操作
    /// </summary>
    [HttpPost("bulk-operations")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> CreateBulkOperation([FromBody] CreateBulkOperationRequest request)
    {
        try
        {
            if (request.WorkflowIds == null || request.WorkflowIds.Count == 0)
            {
                return ValidationError("工作流ID列表不能为空");
            }

            if (request.WorkflowIds.Count > 100)
            {
                return ValidationError("批量操作最多支持100个工作流");
            }

            var bulkService = HttpContext.RequestServices.GetRequiredService<IBulkOperationService>();
            var operation = await bulkService.CreateBulkOperationAsync(
                request.OperationType,
                request.WorkflowIds,
                request.Parameters);

            return Success(operation);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            return ServerError($"创建批量操作失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 执行批量操作
    /// </summary>
    [HttpPost("bulk-operations/{operationId}/execute")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ExecuteBulkOperation(string operationId)
    {
        try
        {
            var bulkService = HttpContext.RequestServices.GetRequiredService<IBulkOperationService>();
            var success = await bulkService.ExecuteBulkOperationAsync(operationId);

            if (success)
            {
                return Success("批量操作已开始执行");
            }
            else
            {
                return ValidationError("批量操作执行失败，请检查操作状态");
            }
        }
        catch (Exception ex)
        {
            return ServerError($"执行批量操作失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 取消批量操作
    /// </summary>
    [HttpPost("bulk-operations/{operationId}/cancel")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> CancelBulkOperation(string operationId)
    {
        try
        {
            var bulkService = HttpContext.RequestServices.GetRequiredService<IBulkOperationService>();
            var success = await bulkService.CancelBulkOperationAsync(operationId);

            if (success)
            {
                return Success("批量操作已取消");
            }
            else
            {
                return ValidationError("无法取消该批量操作");
            }
        }
        catch (Exception ex)
        {
            return ServerError($"取消批量操作失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 获取批量操作状态
    /// </summary>
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
                return NotFoundError("批量操作", operationId);
            }

            return Success(operation);
        }
        catch (Exception ex)
        {
            return ServerError($"获取批量操作失败: {ex.Message}");
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
                return ValidationError("工作流ID列表不能为空");
            }

            var fileContent = await _exportImportService.ExportWorkflowsAsync(request.WorkflowIds, request.Config ?? new WorkflowExportConfig());
            var fileName = $"workflows_export_{DateTime.Now:yyyyMMddHHmmss}.{(request.Config?.Format == ExportFormat.Json ? "json" : "csv")}";

            return File(fileContent, "application/octet-stream", fileName);
        }
        catch (Exception ex)
        {
            return ServerError($"导出工作流失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 导出过滤结果
    /// </summary>
    [HttpPost("export-filtered")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ExportFilteredWorkflows([FromBody] ExportFilteredWorkflowsRequest request)
    {
        try
        {
            var fileContent = await _exportImportService.ExportFilteredWorkflowsAsync(request.Filters, request.Config ?? new WorkflowExportConfig());
            var fileName = $"workflows_export_filtered_{DateTime.Now:yyyyMMddHHmmss}.{(request.Config?.Format == ExportFormat.Json ? "json" : "csv")}";

            return File(fileContent, "application/octet-stream", fileName);
        }
        catch (Exception ex)
        {
            return ServerError($"导出过滤结果失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 验证导入文件
    /// </summary>
    [HttpPost("import/validate")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ValidateImportFile([FromForm] ValidateImportFileRequest request)
    {
        try
        {
            if (request.File == null || request.File.Length == 0)
            {
                return ValidationError("导入文件不能为空");
            }

            using var memoryStream = new MemoryStream();
            await request.File.CopyToAsync(memoryStream);
            var fileContent = memoryStream.ToArray();

            var result = await _exportImportService.ValidateImportFileAsync(fileContent, request.File.FileName);
            return Success(result);
        }
        catch (Exception ex)
        {
            return ServerError($"验证导入文件失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 导入工作流
    /// </summary>
    [HttpPost("import")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ImportWorkflows([FromForm] ImportWorkflowsRequest request)
    {
        try
        {
            if (request.File == null || request.File.Length == 0)
            {
                return ValidationError("导入文件不能为空");
            }

            using var memoryStream = new MemoryStream();
            await request.File.CopyToAsync(memoryStream);
            var fileContent = memoryStream.ToArray();

            var result = await _exportImportService.ImportWorkflowsAsync(fileContent, request.File.FileName, request.OverwriteExisting);
            return Success(result);
        }
        catch (Exception ex)
        {
            return ServerError($"导入工作流失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 预览导入
    /// </summary>
    [HttpPost("import/preview")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> PreviewImport([FromForm] PreviewImportRequest request)
    {
        try
        {
            if (request.File == null || request.File.Length == 0)
            {
                return ValidationError("导入文件不能为空");
            }

            using var memoryStream = new MemoryStream();
            await request.File.CopyToAsync(memoryStream);
            var fileContent = memoryStream.ToArray();

            var result = await _exportImportService.PreviewImportAsync(fileContent, request.File.FileName);
            return Success(result);
        }
        catch (Exception ex)
        {
            return ServerError($"预览导入失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 解决导入冲突
    /// </summary>
    [HttpPost("import/resolve-conflicts")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> ResolveImportConflicts([FromForm] ResolveImportConflictsRequest request)
    {
        try
        {
            if (request.File == null || request.File.Length == 0)
            {
                return ValidationError("导入文件不能为空");
            }

            if (request.Resolutions == null || request.Resolutions.Count == 0)
            {
                return ValidationError("冲突解决方案不能为空");
            }

            using var memoryStream = new MemoryStream();
            await request.File.CopyToAsync(memoryStream);
            var fileContent = memoryStream.ToArray();

            var result = await _exportImportService.ResolveImportConflictsAsync(fileContent, request.File.FileName, request.Resolutions);
            return Success(result);
        }
        catch (Exception ex)
        {
            return ServerError($"解决导入冲突失败: {ex.Message}");
        }
    }
}
/// <summary>
/// 工作流搜索请求
/// </summary>
public class WorkflowSearchRequest
{
    /// <summary>
    /// 页码
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// 每页数量
    /// </summary>
    public int PageSize { get; set; } = 10;

    /// <summary>
    /// 关键词（在名称、描述、类别中搜索）
    /// </summary>
    public string? Keyword { get; set; }

    /// <summary>
    /// 单个类别过滤（用于简单查询）
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// 类别列表
    /// </summary>
    public List<string>? Categories { get; set; }

    /// <summary>
    /// 是否启用过滤（用于简单查询）
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// 状态列表（active, inactive, draft, archived）
    /// </summary>
    public List<string>? Statuses { get; set; }

    /// <summary>
    /// 日期范围过滤
    /// </summary>
    public DateRangeFilter? DateRange { get; set; }

    /// <summary>
    /// 使用次数范围
    /// </summary>
    public UsageRangeFilter? UsageRange { get; set; }

    /// <summary>
    /// 创建者ID列表
    /// </summary>
    public List<string>? CreatedBy { get; set; }

    /// <summary>
    /// 排序字段
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// 排序方向（asc, desc）
    /// </summary>
    public string? SortOrder { get; set; }
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
/// 保存过滤器偏好请求
/// </summary>
public class SaveFilterPreferenceRequest
{
    /// <summary>
    /// 偏好名称
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 是否为默认偏好
    /// </summary>
    public bool IsDefault { get; set; } = false;

    /// <summary>
    /// 过滤器配置
    /// </summary>
    public WorkflowFilterConfig? FilterConfig { get; set; }
}

/// <summary>
/// 更新过滤器偏好请求
/// </summary>
public class UpdateFilterPreferenceRequest
{
    /// <summary>
    /// 偏好名称
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// 是否为默认偏好
    /// </summary>
    public bool? IsDefault { get; set; }

    /// <summary>
    /// 过滤器配置
    /// </summary>
    public WorkflowFilterConfig? FilterConfig { get; set; }
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

/// <summary>
/// 创建批量操作请求
/// </summary>
public class CreateBulkOperationRequest
{
    /// <summary>
    /// 操作类型
    /// </summary>
    public BulkOperationType OperationType { get; set; }

    /// <summary>
    /// 目标工作流ID列表
    /// </summary>
    public List<string> WorkflowIds { get; set; } = new();

    /// <summary>
    /// 操作参数（可选）
    /// </summary>
    public Dictionary<string, object>? Parameters { get; set; }
}

/// <summary>
/// 导出工作流请求
/// </summary>
public class ExportWorkflowsRequest
{
    /// <summary>
    /// 工作流ID列表
    /// </summary>
    public List<string> WorkflowIds { get; set; } = new();

    /// <summary>
    /// 导出配置
    /// </summary>
    public WorkflowExportConfig? Config { get; set; }
}

/// <summary>
/// 导出过滤结果请求
/// </summary>
public class ExportFilteredWorkflowsRequest
{
    /// <summary>
    /// 过滤条件
    /// </summary>
    public Dictionary<string, object> Filters { get; set; } = new();

    /// <summary>
    /// 导出配置
    /// </summary>
    public WorkflowExportConfig? Config { get; set; }
}

/// <summary>
/// 验证导入文件请求
/// </summary>
public class ValidateImportFileRequest
{
    /// <summary>
    /// 导入文件
    /// </summary>
    public IFormFile File { get; set; } = null!;
}

/// <summary>
/// 导入工作流请求
/// </summary>
public class ImportWorkflowsRequest
{
    /// <summary>
    /// 导入文件
    /// </summary>
    public IFormFile File { get; set; } = null!;

    /// <summary>
    /// 是否覆盖现有工作流
    /// </summary>
    public bool OverwriteExisting { get; set; } = false;
}

/// <summary>
/// 预览导入请求
/// </summary>
public class PreviewImportRequest
{
    /// <summary>
    /// 导入文件
    /// </summary>
    public IFormFile File { get; set; } = null!;
}

/// <summary>
/// 解决导入冲突请求
/// </summary>
public class ResolveImportConflictsRequest
{
    /// <summary>
    /// 导入文件
    /// </summary>
    public IFormFile File { get; set; } = null!;

    /// <summary>
    /// 冲突解决方案（工作流名称 -> 解决方案）
    /// </summary>
    public Dictionary<string, string> Resolutions { get; set; } = new();
}