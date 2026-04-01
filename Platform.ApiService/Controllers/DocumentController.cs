using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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
using System.Threading.Tasks;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 公文管理控制器
/// </summary>
[ApiController]
[Route("api/documents")]
public class DocumentController : BaseApiController
{
    private readonly IDocumentService _documentService;
    private readonly IWorkflowEngine _workflowEngine;
    private readonly IFormDefinitionService _formDefinitionService;
    private readonly ILogger<DocumentController> _logger;

    /// <summary>
    /// 初始化公文管理控制器
    /// </summary>
    /// <param name="documentService">公文服务</param>
    /// <param name="workflowEngine">工作流引擎</param>
    /// <param name="formDefinitionService">表单定义服务</param>
    /// <param name="logger">日志记录器</param>
    public DocumentController(
        IDocumentService documentService,
        IWorkflowEngine workflowEngine,
        IFormDefinitionService formDefinitionService,
        ILogger<DocumentController> logger
    ) {
        _documentService = documentService;
        _workflowEngine = workflowEngine;
        _formDefinitionService = formDefinitionService;
        _logger = logger;
    }

    /// <summary>
    /// 获取公文列表
    /// </summary>
    [HttpGet]
    [RequireMenu("document-list")]
    public async Task<IActionResult> GetDocuments([FromQuery] DocumentQueryParams query)
    {
        try
        {
            var result = await _documentService.GetDocumentsAsync(query);
            return Success(result);
        }
        catch (Exception ex)
        {
            return Fail("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取公文统计信息
    /// </summary>
    [HttpGet("statistics")]
    [RequireMenu("document-list")]
    public async Task<IActionResult> GetStatistics()
    {
        try
        {
            var statistics = await _documentService.GetStatisticsAsync();
            return Success(statistics);
        }
        catch (Exception ex)
        {
            return Fail("GET_STATISTICS_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取公文详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("document-list", "document-approval")]
    public async Task<IActionResult> GetDocument(string id)
    {
        try
        {
            var document = await _documentService.GetDocumentAsync(id);
            if (document == null)
            {
                return Fail("NOT_FOUND", "公文 {id} 不存在");
            }

            return Success(document);
        }
        catch (Exception ex)
        {
            return Fail("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 创建公文
    /// </summary>
    [HttpPost]
    [RequireMenu("document-list")]
    public async Task<IActionResult> CreateDocument([FromBody] CreateDocumentRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Title))
            {
                return Fail("VALIDATION_ERROR", "公文标题不能为空");
            }

            var document = await _documentService.CreateDocumentAsync(request);
            return Success(document);
        }
        catch (Exception ex)
        {
            return Fail("CREATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 更新公文
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("document-list")]
    public async Task<IActionResult> UpdateDocument(string id, [FromBody] UpdateDocumentRequest request)
    {
        try
        {
            var document = await _documentService.UpdateDocumentAsync(id, request);
            if (document == null)
            {
                return Fail("NOT_FOUND", "公文 {id} 不存在");
            }

            return Success(document);
        }
        catch (Exception ex)
        {
            return Fail("UPDATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 删除公文
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("document-list")]
    public async Task<IActionResult> DeleteDocument(string id)
    {
        try
        {
            var result = await _documentService.DeleteDocumentAsync(id);
            if (!result)
            {
                return Fail("NOT_FOUND", "公文 {id} 不存在");
            }

            return Success(null, "公文已删除");
        }
        catch (Exception ex)
        {
            return Fail("DELETE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 提交公文（启动流程）
    /// </summary>
    [HttpPost("{id}/submit")]
    [RequireMenu("document-list", "document-approval")]
    public async Task<IActionResult> SubmitDocument(string id, [FromBody] SubmitDocumentRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.WorkflowDefinitionId))
            {
                return Fail("VALIDATION_ERROR", "流程定义ID不能为空");
            }

            var instance = await _documentService.SubmitDocumentAsync(id, request.WorkflowDefinitionId, request.Variables);
            return Success(instance);
        }
        catch (Exception ex)
        {
            return Fail("SUBMIT_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 审批通过
    /// </summary>
    [HttpPost("{id}/approve")]
    [RequireMenu("document-approval")]
    public async Task<IActionResult> ApproveDocument(string id, [FromBody] ApprovalRequest request)
    {
        try
        {
            // 输入验证
            if (string.IsNullOrEmpty(id))
            {
                return Fail("VALIDATION_ERROR", "文档ID不能为空");
            }

            if (request == null)
            {
                return Fail("VALIDATION_ERROR", "请求参数不能为空");
            }

            var document = await _documentService.GetDocumentAsync(id);
            if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            {
                return Fail("NOT_FOUND", "公文或流程实例 {id} 不存在");
            }

            var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
            if (instance == null)
            {
                return Fail("NOT_FOUND", "流程实例 {document.WorkflowInstanceId} 不存在");
            }

            // Bug 25 修复：检查 CurrentNodeId
            if (string.IsNullOrEmpty(instance.CurrentNodeId))
            {
                return Fail("VALIDATION_ERROR", "流程实例当前无待处理节点");
            }

            var userId = CurrentUserId ?? throw new UnauthorizedAccessException("未找到用户信息");
            var result = await _workflowEngine.ProcessApprovalAsync(
                document.WorkflowInstanceId,
                instance.CurrentNodeId,
                ApprovalAction.Approve,
                userId,
                request.Comment
            );

            return Success(result, "审批通过");
        }
        catch (Exception ex)
        {
            return Fail("APPROVE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 审批拒绝
    /// </summary>
    [HttpPost("{id}/reject")]
    [RequireMenu("document-approval")]
    public async Task<IActionResult> RejectDocument(string id, [FromBody] ApprovalRequest request)
    {
        try
        {
            // 输入验证
            if (string.IsNullOrEmpty(id))
            {
                return Fail("VALIDATION_ERROR", "文档ID不能为空");
            }

            if (request == null)
            {
                return Fail("VALIDATION_ERROR", "请求参数不能为空");
            }

            if (string.IsNullOrEmpty(request.Comment))
            {
                return Fail("VALIDATION_ERROR", "拒绝原因不能为空");
            }

            var document = await _documentService.GetDocumentAsync(id);
            if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            {
                return Fail("NOT_FOUND", "公文或流程实例 {id} 不存在");
            }

            var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
            if (instance == null)
            {
                return Fail("NOT_FOUND", "流程实例 {document.WorkflowInstanceId} 不存在");
            }

            // Bug 25 修复：检查 CurrentNodeId
            if (string.IsNullOrEmpty(instance.CurrentNodeId))
            {
                return Fail("VALIDATION_ERROR", "流程实例当前无待处理节点");
            }

            var userId = CurrentUserId ?? throw new UnauthorizedAccessException("未找到用户信息");
            var result = await _workflowEngine.ProcessApprovalAsync(
                document.WorkflowInstanceId,
                instance.CurrentNodeId,
                ApprovalAction.Reject,
                userId,
                request.Comment
            );

            return Success(result, "审批已拒绝");
        }
        catch (Exception ex)
        {
            return Fail("REJECT_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 退回
    /// </summary>
    [HttpPost("{id}/return")]
    [RequireMenu("document-approval")]
    public async Task<IActionResult> ReturnDocument(string id, [FromBody] ReturnDocumentRequest request)
    {
        try
        {
            var userId = CurrentUserId ?? throw new UnauthorizedAccessException("未找到用户信息");

            if (string.IsNullOrEmpty(request.TargetNodeId))
            {
                return Fail("VALIDATION_ERROR", "退回目标节点不能为空");
            }

            if (string.IsNullOrEmpty(request.Comment))
            {
                return Fail("VALIDATION_ERROR", "退回原因不能为空");
            }

            var document = await _documentService.GetDocumentAsync(id);
            if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            {
                return Fail("NOT_FOUND", "公文或流程实例 {id} 不存在");
            }

            var result = await _workflowEngine.ReturnToNodeAsync(
                document.WorkflowInstanceId,
                request.TargetNodeId,
                request.Comment,
                userId
            );

            return Success(result, "已退回");
        }
        catch (Exception ex)
        {
            return Fail("RETURN_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 转办
    /// </summary>
    [HttpPost("{id}/delegate")]
    [RequireMenu("document-approval")]
    public async Task<IActionResult> DelegateDocument(string id, [FromBody] DelegateDocumentRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.DelegateToUserId))
            {
                return Fail("VALIDATION_ERROR", "转办目标用户不能为空");
            }

            var document = await _documentService.GetDocumentAsync(id);
            if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            {
                return Fail("NOT_FOUND", "公文或流程实例 {id} 不存在");
            }

            var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
            if (instance == null)
            {
                return Fail("NOT_FOUND", "流程实例 {document.WorkflowInstanceId} 不存在");
            }

            // Bug 25 修复：检查 CurrentNodeId
            if (string.IsNullOrEmpty(instance.CurrentNodeId))
            {
                return Fail("VALIDATION_ERROR", "流程实例当前无待处理节点");
            }

            var userId = CurrentUserId ?? throw new UnauthorizedAccessException("未找到用户信息");
            var result = await _workflowEngine.ProcessApprovalAsync(
                document.WorkflowInstanceId,
                instance.CurrentNodeId,
                ApprovalAction.Delegate,
                userId,
                request.Comment,
                request.DelegateToUserId
            );

            return Success(result, "已转办");
        }
        catch (Exception ex)
        {
            return Fail("DELEGATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 上传公文附件
    /// </summary>
    [HttpPost("attachments")]
    [RequireMenu("document-list", "document-approval")]
    public async Task<IActionResult> UploadAttachment([FromForm] IFormFile file)
    {
        try
        {
            var result = await _documentService.UploadAttachmentAsync(file);
            return Success(result);
        }
        catch (Exception ex)
        {
            return Fail("UPLOAD_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 从文档实例中获取文档创建表单（使用实例快照）
    /// </summary>
    [HttpGet("{id}/instance-form")]
    [RequireMenu("document-list", "document-approval")]
    public async Task<IActionResult> GetDocumentInstanceForm(string id)
    {
        try
        {
            var document = await _documentService.GetDocumentAsync(id);
            if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            {
                return Fail("NOT_FOUND", "公文或流程实例 {id} 不存在");
            }

            var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
            if (instance == null)
            {
                return Fail("NOT_FOUND", "流程实例 {document.WorkflowInstanceId} 不存在");
            }

            // 优先使用实例中的流程定义快照
            WorkflowDefinition? definition = instance.WorkflowDefinitionSnapshot;
            if (definition == null)
            {
                // 如果没有快照，使用最新定义（向后兼容）
                definition = await _documentService.GetWorkflowDefinitionAsync(instance.WorkflowDefinitionId);
                if (definition == null)
                {
                    return Fail("NOT_FOUND", "流程定义 {instance.WorkflowDefinitionId} 不存在");
                }
            }

            // 优先起始节点
            var startNode = definition.Graph.Nodes.FirstOrDefault(n => n.Data.NodeType == "start");
            FormBinding? binding = startNode?.Data.Config?.Form;

            if (binding == null || binding.Target != FormTarget.Document)
            {
                // 取第一个绑定了文档表单的节点
                var nodeWithDocForm = definition.Graph.Nodes
                    .FirstOrDefault(n => n.Data.Config?.Form?.Target == FormTarget.Document);
                binding = nodeWithDocForm?.Data.Config?.Form;
            }

            if (binding == null)
            {
                return Success(new { form = (FormDefinition?)null, dataScopeKey = (string?)null, initialValues = (object?)null });
            }

            // 优先使用实例中的表单定义快照（使用起始节点ID或第一个文档表单节点ID）
            FormDefinition? form = null;
            var formNodeId = startNode?.Id ?? definition.Graph.Nodes.FirstOrDefault(n => n.Data.Config?.Form?.Target == FormTarget.Document)?.Id;
            if (!string.IsNullOrEmpty(formNodeId))
            {
                var snapshot = instance.FormDefinitionSnapshots?.FirstOrDefault(s => s.NodeId == formNodeId);
                if (!string.IsNullOrEmpty(snapshot?.FormDefinitionJson))
                {
                    form = JsonSerializer.Deserialize<FormDefinition>(snapshot.FormDefinitionJson);
                }
            }
            else
            {
                if (string.IsNullOrEmpty(binding.FormDefinitionId))
                {
                    return Fail("VALIDATION_ERROR", "流程节点未配置表单定义ID");
                }
                // 如果没有快照，使用最新定义（向后兼容）
                form = await _formDefinitionService.GetFormByIdAsync(binding.FormDefinitionId);
                if (form == null)
                {
                    return Fail("NOT_FOUND", "表单定义 {binding.FormDefinitionId} 不存在");
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
            return Fail("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 下载公文附件
    /// </summary>
    [HttpGet("attachments/{attachmentId}")]
    [RequireMenu("document-list", "document-approval")]
    public async Task<IActionResult> DownloadAttachment(string attachmentId)
    {
        try
        {
            var result = await _documentService.DownloadAttachmentAsync(attachmentId);
            if (result == null)
            {
                return Fail("NOT_FOUND", "附件 {attachmentId} 不存在");
            }

            Response.Headers.ContentLength = result.ContentLength;
            return File(result.Content, result.ContentType, result.FileName);
        }
        catch (Exception ex)
        {
            return Fail("DOWNLOAD_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取待审批列表
    /// </summary>
    [HttpGet("pending")]
    [RequireMenu("document-approval")]
    public async Task<IActionResult> GetPendingDocuments([FromQuery] DocumentQueryParams query)
    {
        try
        {
            // 强制设置为 pending 类型
            query.FilterType = "pending";

            var result = await _documentService.GetDocumentsAsync(query);
            return Success(result);
        }
        catch (ArgumentException ex)
        {
            return Fail("VALIDATION_ERROR", ex.Message);
        }
        catch (Exception ex)
        {
            return Fail("INTERNAL_ERROR", $"获取待审批公文失败: {ex.Message}", 500);
        }
    }
}
