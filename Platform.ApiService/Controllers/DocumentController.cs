using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 公文管理控制器
/// </summary>
[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentController : BaseApiController
{
    private readonly IDocumentService _documentService;
    private readonly IWorkflowEngine _workflowEngine;
    private readonly IDatabaseOperationFactory<WorkflowInstance> _instanceFactory;
    private readonly IDatabaseOperationFactory<WorkflowDefinition> _definitionFactory;
    private readonly IDatabaseOperationFactory<FormDefinition> _formFactory;

    /// <summary>
    /// 初始化公文管理控制器
    /// </summary>
    /// <param name="documentService">公文服务</param>
    /// <param name="workflowEngine">工作流引擎</param>
    /// <param name="instanceFactory">流程实例工厂</param>
    /// <param name="definitionFactory">流程定义工厂</param>
    /// <param name="formFactory">表单定义工厂</param>
    public DocumentController(
        IDocumentService documentService,
        IWorkflowEngine workflowEngine,
        IDatabaseOperationFactory<WorkflowInstance> instanceFactory,
        IDatabaseOperationFactory<WorkflowDefinition> definitionFactory,
        IDatabaseOperationFactory<FormDefinition> formFactory)
    {
        _documentService = documentService;
        _workflowEngine = workflowEngine;
        _instanceFactory = instanceFactory;
        _definitionFactory = definitionFactory;
        _formFactory = formFactory;
    }

    /// <summary>
    /// 获取公文列表
    /// </summary>
    [HttpGet]
    [RequireMenu("document:list")]
    public async Task<IActionResult> GetDocuments([FromQuery] DocumentQueryParams query)
    {
        try
        {
            var result = await _documentService.GetDocumentsAsync(query);
            return SuccessPaged(result.items, result.total, query.Page, query.PageSize);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取公文详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("document:list")]
    public async Task<IActionResult> GetDocument(string id)
    {
        try
        {
            var document = await _documentService.GetDocumentAsync(id);
            if (document == null)
            {
                return NotFoundError("公文", id);
            }

            // 如果有流程实例，获取流程信息
            if (!string.IsNullOrEmpty(document.WorkflowInstanceId))
            {
                var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
                var history = await _workflowEngine.GetApprovalHistoryAsync(document.WorkflowInstanceId);

                // 如果有快照，使用快照中的流程定义，否则使用最新定义（用于向后兼容）
                WorkflowDefinition? workflowDef = instance?.WorkflowDefinitionSnapshot;
                if (workflowDef == null && instance != null)
                {
                    workflowDef = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
                }

                return Success(new
                {
                    document,
                    workflowInstance = instance,
                    workflowDefinition = workflowDef, // 包含流程定义（优先使用快照）
                    approvalHistory = history
                });
            }

            return Success(document);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 创建公文
    /// </summary>
    [HttpPost]
    [RequireMenu("document:list")]
    public async Task<IActionResult> CreateDocument([FromBody] CreateDocumentRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Title))
            {
                return ValidationError("公文标题不能为空");
            }

            var document = await _documentService.CreateDocumentAsync(request);
            return Success(document);
        }
        catch (Exception ex)
        {
            return Error("CREATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 更新公文
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("document:list")]
    public async Task<IActionResult> UpdateDocument(string id, [FromBody] UpdateDocumentRequest request)
    {
        try
        {
            var document = await _documentService.UpdateDocumentAsync(id, request);
            if (document == null)
            {
                return NotFoundError("公文", id);
            }

            return Success(document);
        }
        catch (Exception ex)
        {
            return Error("UPDATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 删除公文
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("document:list")]
    public async Task<IActionResult> DeleteDocument(string id)
    {
        try
        {
            var result = await _documentService.DeleteDocumentAsync(id);
            if (!result)
            {
                return NotFoundError("公文", id);
            }

            return Success("公文已删除");
        }
        catch (Exception ex)
        {
            return Error("DELETE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 提交公文（启动流程）
    /// </summary>
    [HttpPost("{id}/submit")]
    [RequireMenu("document:list")]
    public async Task<IActionResult> SubmitDocument(string id, [FromBody] SubmitDocumentRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.WorkflowDefinitionId))
            {
                return ValidationError("流程定义ID不能为空");
            }

            var instance = await _documentService.SubmitDocumentAsync(id, request.WorkflowDefinitionId, request.Variables);
            return Success(instance);
        }
        catch (Exception ex)
        {
            return Error("SUBMIT_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 审批通过
    /// </summary>
    [HttpPost("{id}/approve")]
    [RequireMenu("document:approval")]
    public async Task<IActionResult> ApproveDocument(string id, [FromBody] ApprovalRequest request)
    {
        try
        {
            // 输入验证
            if (string.IsNullOrEmpty(id))
            {
                return ValidationError("文档ID不能为空");
            }

            if (request == null)
            {
                return ValidationError("请求参数不能为空");
            }

            var document = await _documentService.GetDocumentAsync(id);
            if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            {
                return NotFoundError("公文或流程实例", id);
            }

            var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
            if (instance == null)
            {
                return NotFoundError("流程实例", document.WorkflowInstanceId);
            }

            var result = await _workflowEngine.ProcessApprovalAsync(
                document.WorkflowInstanceId,
                instance.CurrentNodeId,
                ApprovalAction.Approve,
                request.Comment
            );

            return Success(result, "审批通过");
        }
        catch (Exception ex)
        {
            return Error("APPROVE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 审批拒绝
    /// </summary>
    [HttpPost("{id}/reject")]
    [RequireMenu("document:approval")]
    public async Task<IActionResult> RejectDocument(string id, [FromBody] ApprovalRequest request)
    {
        try
        {
            // 输入验证
            if (string.IsNullOrEmpty(id))
            {
                return ValidationError("文档ID不能为空");
            }

            if (request == null)
            {
                return ValidationError("请求参数不能为空");
            }

            if (string.IsNullOrEmpty(request.Comment))
            {
                return ValidationError("拒绝原因不能为空");
            }

            var document = await _documentService.GetDocumentAsync(id);
            if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            {
                return NotFoundError("公文或流程实例", id);
            }

            var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
            if (instance == null)
            {
                return NotFoundError("流程实例", document.WorkflowInstanceId);
            }

            var result = await _workflowEngine.ProcessApprovalAsync(
                document.WorkflowInstanceId,
                instance.CurrentNodeId,
                ApprovalAction.Reject,
                request.Comment
            );

            return Success(result, "审批已拒绝");
        }
        catch (Exception ex)
        {
            return Error("REJECT_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 退回
    /// </summary>
    [HttpPost("{id}/return")]
    [RequireMenu("document:approval")]
    public async Task<IActionResult> ReturnDocument(string id, [FromBody] ReturnDocumentRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.TargetNodeId))
            {
                return ValidationError("退回目标节点不能为空");
            }

            if (string.IsNullOrEmpty(request.Comment))
            {
                return ValidationError("退回原因不能为空");
            }

            var document = await _documentService.GetDocumentAsync(id);
            if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            {
                return NotFoundError("公文或流程实例", id);
            }

            var result = await _workflowEngine.ReturnToNodeAsync(
                document.WorkflowInstanceId,
                request.TargetNodeId,
                request.Comment
            );

            return Success(result, "已退回");
        }
        catch (Exception ex)
        {
            return Error("RETURN_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 转办
    /// </summary>
    [HttpPost("{id}/delegate")]
    [RequireMenu("document:approval")]
    public async Task<IActionResult> DelegateDocument(string id, [FromBody] DelegateDocumentRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.DelegateToUserId))
            {
                return ValidationError("转办目标用户不能为空");
            }

            var document = await _documentService.GetDocumentAsync(id);
            if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            {
                return NotFoundError("公文或流程实例", id);
            }

            var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
            if (instance == null)
            {
                return NotFoundError("流程实例", document.WorkflowInstanceId);
            }

            var result = await _workflowEngine.ProcessApprovalAsync(
                document.WorkflowInstanceId,
                instance.CurrentNodeId,
                ApprovalAction.Delegate,
                request.Comment,
                request.DelegateToUserId
            );

            return Success(result, "已转办");
        }
        catch (Exception ex)
        {
            return Error("DELEGATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 上传公文附件
    /// </summary>
    [HttpPost("attachments")]
    [RequireMenu("document:list")]
    public async Task<IActionResult> UploadAttachment([FromForm] IFormFile file)
    {
        try
        {
            var result = await _documentService.UploadAttachmentAsync(file);
            return Success(result);
        }
        catch (Exception ex)
        {
            return Error("UPLOAD_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 从文档实例中获取文档创建表单（使用实例快照）
    /// </summary>
    [HttpGet("{id}/instance-form")]
    [RequireMenu("document:list")]
    public async Task<IActionResult> GetDocumentInstanceForm(string id)
    {
        try
        {
            var document = await _documentService.GetDocumentAsync(id);
            if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            {
                return NotFoundError("公文或流程实例", id);
            }

            var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
            if (instance == null)
            {
                return NotFoundError("流程实例", document.WorkflowInstanceId);
            }

            // 优先使用实例中的流程定义快照
            WorkflowDefinition? definition = instance.WorkflowDefinitionSnapshot;
            if (definition == null)
            {
                // 如果没有快照，使用最新定义（向后兼容）
                definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
                if (definition == null)
                {
                    return NotFoundError("流程定义", instance.WorkflowDefinitionId);
                }
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

            // 优先使用实例中的表单定义快照（使用起始节点ID或第一个文档表单节点ID）
            FormDefinition? form = null;
            var formNodeId = startNode?.Id ?? definition.Graph.Nodes.FirstOrDefault(n => n.Config?.Form?.Target == FormTarget.Document)?.Id;
            if (!string.IsNullOrEmpty(formNodeId) && instance.FormDefinitionSnapshots != null && instance.FormDefinitionSnapshots.TryGetValue(formNodeId, out var snapshotForm))
            {
                form = snapshotForm;
            }
            else
            {
                // 如果没有快照，使用最新定义（向后兼容）
                form = await _formFactory.GetByIdAsync(binding.FormDefinitionId);
                if (form == null)
                {
                    return NotFoundError("表单定义", binding.FormDefinitionId);
                }
            }

            // 从文档中获取初始值
            var initialValues = new Dictionary<string, object>();
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

            return Success(new { form, dataScopeKey = binding.DataScopeKey, initialValues });
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 下载公文附件
    /// </summary>
    [HttpGet("attachments/{attachmentId}")]
    [RequireMenu("document:list")]
    public async Task<IActionResult> DownloadAttachment(string attachmentId)
    {
        try
        {
            var result = await _documentService.DownloadAttachmentAsync(attachmentId);
            if (result == null)
            {
                return NotFoundError("附件", attachmentId);
            }

            Response.Headers.ContentLength = result.ContentLength;
            return File(result.Content, result.ContentType, result.FileName);
        }
        catch (Exception ex)
        {
            return Error("DOWNLOAD_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取待审批列表
    /// </summary>
    [HttpGet("pending")]
    [RequireMenu("document:approval")]
    public async Task<IActionResult> GetPendingDocuments([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        try
        {
            // 验证分页参数
            if (page < 1 || page > 10000)
                throw new ArgumentException("页码必须在 1-10000 之间");

            if (pageSize < 1 || pageSize > 100)
                throw new ArgumentException("每页数量必须在 1-100 之间");

            var query = new DocumentQueryParams
            {
                Page = page,
                PageSize = pageSize,
                FilterType = "pending"
            };

            var result = await _documentService.GetDocumentsAsync(query);
            return SuccessPaged(result.items, result.total, page, pageSize);
        }
        catch (ArgumentException ex)
        {
            return ValidationError(ex.Message);
        }
        catch (Exception ex)
        {
            return ServerError($"获取待审批公文失败: {ex.Message}");
        }
    }
}

/// <summary>
/// 提交公文请求
/// </summary>
public class SubmitDocumentRequest
{
    /// <summary>
    /// 流程定义ID
    /// </summary>
    public string WorkflowDefinitionId { get; set; } = string.Empty;

    /// <summary>
    /// 流程变量
    /// </summary>
    public Dictionary<string, object>? Variables { get; set; }
}

/// <summary>
/// 审批请求
/// </summary>
public class ApprovalRequest
{
    /// <summary>
    /// 审批意见
    /// </summary>
    public string? Comment { get; set; }
}

/// <summary>
/// 退回请求
/// </summary>
public class ReturnDocumentRequest
{
    /// <summary>
    /// 退回目标节点ID
    /// </summary>
    public string TargetNodeId { get; set; } = string.Empty;

    /// <summary>
    /// 退回原因
    /// </summary>
    public string Comment { get; set; } = string.Empty;
}

/// <summary>
/// 转办请求
/// </summary>
public class DelegateDocumentRequest
{
    /// <summary>
    /// 转办目标用户ID
    /// </summary>
    public string DelegateToUserId { get; set; } = string.Empty;

    /// <summary>
    /// 转办说明
    /// </summary>
    public string? Comment { get; set; }
}
