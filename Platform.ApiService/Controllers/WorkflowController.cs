using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    private readonly IWorkflowEngine _workflowEngine;
    private readonly IUserService _userService;

    /// <summary>
    /// 初始化工作流管理控制器
    /// </summary>
    /// <param name="definitionFactory">流程定义工厂</param>
    /// <param name="instanceFactory">流程实例工厂</param>
    /// <param name="workflowEngine">工作流引擎</param>
    /// <param name="userService">用户服务</param>
    public WorkflowController(
        IDatabaseOperationFactory<WorkflowDefinition> definitionFactory,
        IDatabaseOperationFactory<WorkflowInstance> instanceFactory,
        IWorkflowEngine workflowEngine,
        IUserService userService)
    {
        _definitionFactory = definitionFactory;
        _instanceFactory = instanceFactory;
        _workflowEngine = workflowEngine;
        _userService = userService;
    }

    /// <summary>
    /// 获取流程定义列表
    /// </summary>
    [HttpGet]
    [RequireMenu("workflow:list")]
    public async Task<IActionResult> GetWorkflows([FromQuery] int current = 1, [FromQuery] int pageSize = 10, [FromQuery] string? keyword = null, [FromQuery] string? category = null, [FromQuery] bool? isActive = null)
    {
        try
        {
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

            var result = await _definitionFactory.FindPagedAsync(filter, sort, current, pageSize);
            return SuccessPaged(result.items, result.total, current, pageSize);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取流程定义详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("workflow:list")]
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
    [RequireMenu("workflow:create")]
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
    [RequireMenu("workflow:create")]
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
    [RequireMenu("workflow:create")]
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
    [RequireMenu("workflow:create")]
    public async Task<IActionResult> StartWorkflow(string id, [FromBody] StartWorkflowRequest request)
    {
        try
        {
            var instance = await _workflowEngine.StartWorkflowAsync(id, request.DocumentId, request.Variables);
            return Success(instance);
        }
        catch (Exception ex)
        {
            return Error("START_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取流程实例列表
    /// </summary>
    [HttpGet("instances")]
    [RequireMenu("workflow:monitor")]
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
    /// 获取流程实例详情
    /// </summary>
    [HttpGet("instances/{id}")]
    [RequireMenu("workflow:monitor")]
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
    [RequireMenu("workflow:monitor")]
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
