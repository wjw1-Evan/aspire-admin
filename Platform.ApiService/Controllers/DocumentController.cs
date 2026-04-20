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
    public async Task<IActionResult> GetDocuments(
        [FromQuery] Platform.ServiceDefaults.Models.ProTableRequest pageParams,
        [FromQuery] DocumentStatus? status = null,
        [FromQuery] string? documentType = null,
        [FromQuery] string? category = null,
        [FromQuery] string? createdBy = null,
        [FromQuery] string? filterType = null)
    {
        var result = await _documentService.GetDocumentsAsync(pageParams, status, documentType, category, createdBy, filterType);
        return Success(result);
    }

    /// <summary>
    /// 获取公文统计信息
    /// </summary>
    [HttpGet("statistics")]
    [RequireMenu("document-list")]
    public async Task<IActionResult> GetStatistics()
    {
        var statistics = await _documentService.GetStatisticsAsync();
        return Success(statistics);
    }

    /// <summary>
    /// 获取公文详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("document-list", "document-approval")]
    public async Task<IActionResult> GetDocument(string id)
    {
        var document = await _documentService.GetDocumentAsync(id);
        if (document == null)
            throw new KeyNotFoundException($"公文 {id} 不存在");

        return Success(document);
    }

    /// <summary>
    /// 创建公文
    /// </summary>
    [HttpPost]
    [RequireMenu("document-list")]
    public async Task<IActionResult> CreateDocument([FromBody] CreateDocumentRequest request)
    {
        if (string.IsNullOrEmpty(request.Title))
            throw new ArgumentException("公文标题不能为空");

        var document = await _documentService.CreateDocumentAsync(request);
        return Success(document);
    }

    /// <summary>
    /// 更新公文
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("document-list")]
    public async Task<IActionResult> UpdateDocument(string id, [FromBody] UpdateDocumentRequest request)
    {
        var document = await _documentService.UpdateDocumentAsync(id, request);
        if (document == null)
            throw new KeyNotFoundException($"公文 {id} 不存在");

        return Success(document);
    }

    /// <summary>
    /// 删除公文
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("document-list")]
    public async Task<IActionResult> DeleteDocument(string id)
    {
        var result = await _documentService.DeleteDocumentAsync(id);
        if (!result)
            throw new KeyNotFoundException($"公文 {id} 不存在");

        return Success(null, "公文已删除");
    }

    /// <summary>
    /// 提交公文（启动流程）
    /// </summary>
    [HttpPost("{id}/submit")]
    [RequireMenu("document-list", "document-approval")]
    public async Task<IActionResult> SubmitDocument(string id, [FromBody] SubmitDocumentRequest request)
    {
        if (string.IsNullOrEmpty(request.WorkflowDefinitionId))
            throw new ArgumentException("流程定义ID不能为空");

        var instance = await _documentService.SubmitDocumentAsync(id, request.WorkflowDefinitionId, request.Variables);
        return Success(instance);
    }

    /// <summary>
    /// 审批通过
    /// </summary>
    [HttpPost("{id}/approve")]
    [RequireMenu("document-approval")]
    public async Task<IActionResult> ApproveDocument(string id, [FromBody] ApprovalRequest request)
    {
        if (string.IsNullOrEmpty(id))
            throw new ArgumentException("文档ID不能为空");

        if (request == null)
            throw new ArgumentException("请求参数不能为空");

        var document = await _documentService.GetDocumentAsync(id);
        if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            throw new KeyNotFoundException($"公文或流程实例 {id} 不存在");

        var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
        if (instance == null)
            throw new KeyNotFoundException($"流程实例 {document.WorkflowInstanceId} 不存在");

        if (string.IsNullOrEmpty(instance.CurrentNodeId))
            throw new InvalidOperationException("流程实例当前无待处理节点");

        var userId = RequiredUserId;
        var result = await _workflowEngine.ProcessApprovalAsync(
            document.WorkflowInstanceId,
            instance.CurrentNodeId,
            ApprovalAction.Approve,
            userId,
            request.Comment
        );

        return Success(result, "审批通过");
    }

    /// <summary>
    /// 审批拒绝
    /// </summary>
    [HttpPost("{id}/reject")]
    [RequireMenu("document-approval")]
    public async Task<IActionResult> RejectDocument(string id, [FromBody] ApprovalRequest request)
    {
        if (string.IsNullOrEmpty(id))
            throw new ArgumentException("文档ID不能为空");

        if (request == null)
            throw new ArgumentException("请求参数不能为空");

        if (string.IsNullOrEmpty(request.Comment))
            throw new ArgumentException("拒绝原因不能为空");

        var document = await _documentService.GetDocumentAsync(id);
        if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            throw new KeyNotFoundException($"公文或流程实例 {id} 不存在");

        var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
        if (instance == null)
            throw new KeyNotFoundException($"流程实例 {document.WorkflowInstanceId} 不存在");

        if (string.IsNullOrEmpty(instance.CurrentNodeId))
            throw new InvalidOperationException("流程实例当前无待处理节点");

        var userId = RequiredUserId;
        var result = await _workflowEngine.ProcessApprovalAsync(
            document.WorkflowInstanceId,
            instance.CurrentNodeId,
            ApprovalAction.Reject,
            userId,
            request.Comment
        );

        return Success(result, "审批已拒绝");
    }

    /// <summary>
    /// 退回
    /// </summary>
    [HttpPost("{id}/return")]
    [RequireMenu("document-approval")]
    public async Task<IActionResult> ReturnDocument(string id, [FromBody] ReturnDocumentRequest request)
    {
        var userId = RequiredUserId;

        if (string.IsNullOrEmpty(request.TargetNodeId))
            throw new ArgumentException("退回目标节点不能为空");

        if (string.IsNullOrEmpty(request.Comment))
            throw new ArgumentException("退回原因不能为空");

        var document = await _documentService.GetDocumentAsync(id);
        if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            throw new KeyNotFoundException($"公文或流程实例 {id} 不存在");

        var result = await _workflowEngine.ReturnToNodeAsync(
            document.WorkflowInstanceId,
            request.TargetNodeId,
            request.Comment,
            userId
        );

        return Success(result, "已退回");
    }

    /// <summary>
    /// 转办
    /// </summary>
    [HttpPost("{id}/delegate")]
    [RequireMenu("document-approval")]
    public async Task<IActionResult> DelegateDocument(string id, [FromBody] DelegateDocumentRequest request)
    {
        if (string.IsNullOrEmpty(request.DelegateToUserId))
            throw new ArgumentException("转办目标用户不能为空");

        var document = await _documentService.GetDocumentAsync(id);
        if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            throw new KeyNotFoundException($"公文或流程实例 {id} 不存在");

        var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
        if (instance == null)
            throw new KeyNotFoundException($"流程实例 {document.WorkflowInstanceId} 不存在");

        if (string.IsNullOrEmpty(instance.CurrentNodeId))
            throw new InvalidOperationException("流程实例当前无待处理节点");

        var userId = RequiredUserId;
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

    /// <summary>
    /// 上传公文附件
    /// </summary>
    [HttpPost("attachments")]
    [RequireMenu("document-list", "document-approval")]
    public async Task<IActionResult> UploadAttachment([FromForm] IFormFile file)
    {
        var result = await _documentService.UploadAttachmentAsync(file);
        return Success(result);
    }

    /// <summary>
    /// 从文档实例中获取文档创建表单（使用实例快照）
    /// </summary>
    [HttpGet("{id}/instance-form")]
    [RequireMenu("document-list", "document-approval")]
    public async Task<IActionResult> GetDocumentInstanceForm(string id)
    {
        var document = await _documentService.GetDocumentAsync(id);
        if (document == null || string.IsNullOrEmpty(document.WorkflowInstanceId))
            throw new KeyNotFoundException($"公文或流程实例 {id} 不存在");

        var instance = await _workflowEngine.GetInstanceAsync(document.WorkflowInstanceId);
        if (instance == null)
            throw new KeyNotFoundException($"流程实例 {document.WorkflowInstanceId} 不存在");

        WorkflowDefinition? definition = instance.WorkflowDefinitionSnapshot;
        if (definition == null)
        {
            definition = await _documentService.GetWorkflowDefinitionAsync(instance.WorkflowDefinitionId);
            if (definition == null)
                throw new KeyNotFoundException($"流程定义 {instance.WorkflowDefinitionId} 不存在");
        }

        var startNode = definition.Graph.Nodes.FirstOrDefault(n => n.Data.NodeType == "start");
        FormBinding? binding = startNode?.Data.Config?.Form;

        if (binding == null || binding.Target != FormTarget.Document)
        {
            var nodeWithDocForm = definition.Graph.Nodes
                .FirstOrDefault(n => n.Data.Config?.Form?.Target == FormTarget.Document);
            binding = nodeWithDocForm?.Data.Config?.Form;
        }

        if (binding == null)
        {
            return Success(new { form = (FormDefinition?)null, dataScopeKey = (string?)null, initialValues = (object?)null });
        }

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
                throw new ArgumentException("流程节点未配置表单定义ID");

            form = await _formDefinitionService.GetFormByIdAsync(binding.FormDefinitionId);
            if (form == null)
                throw new KeyNotFoundException($"表单定义 {binding.FormDefinitionId} 不存在");
        }

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

    /// <summary>
    /// 下载公文附件
    /// </summary>
    [HttpGet("attachments/{attachmentId}")]
    [RequireMenu("document-list", "document-approval")]
    public async Task<IActionResult> DownloadAttachment(string attachmentId)
    {
        var result = await _documentService.DownloadAttachmentAsync(attachmentId);
        if (result == null)
            throw new KeyNotFoundException($"附件 {attachmentId} 不存在");

        Response.Headers.ContentLength = result.ContentLength;
        return File(result.Content, result.ContentType, result.FileName);
    }

    /// <summary>
    /// 获取待审批列表
    /// </summary>
    [HttpGet("pending")]
    [RequireMenu("document-approval")]
    public async Task<IActionResult> GetPendingDocuments(
        [FromQuery] Platform.ServiceDefaults.Models.ProTableRequest pageParams,
        [FromQuery] DocumentStatus? status = null,
        [FromQuery] string? documentType = null,
        [FromQuery] string? category = null,
        [FromQuery] string? createdBy = null)
    {
        var result = await _documentService.GetDocumentsAsync(pageParams, status, documentType, category, createdBy, "pending");
        return Success(result);
    }
}
