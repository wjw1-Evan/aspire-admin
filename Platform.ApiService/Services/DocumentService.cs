using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using UserCompany = Platform.ApiService.Models.UserCompany;
using Platform.ApiService.Extensions;
using System.Linq.Expressions;

namespace Platform.ApiService.Services;

/// <summary>
/// 公文服务接口
/// </summary>
public interface IDocumentService
{
    /// <summary>
    /// 创建公文
    /// </summary>
    Task<Document> CreateDocumentAsync(CreateDocumentRequest request);

    /// <summary>
    /// 更新公文
    /// </summary>
    Task<Document?> UpdateDocumentAsync(string id, UpdateDocumentRequest request);

    /// <summary>
    /// 获取公文详情
    /// </summary>
    Task<Document?> GetDocumentAsync(string id);

    /// <summary>
    /// 获取公文列表
    /// </summary>
    Task<(List<Document> items, long total)> GetDocumentsAsync(DocumentQueryParams query);

    /// <summary>
    /// 删除公文
    /// </summary>
    Task<bool> DeleteDocumentAsync(string id);

    /// <summary>
    /// 提交公文（启动流程）
    /// </summary>
    Task<WorkflowInstance> SubmitDocumentAsync(string documentId, string workflowDefinitionId, Dictionary<string, object>? variables = null);

    /// <summary>
    /// 上传公文附件
    /// </summary>
    Task<DocumentAttachmentUploadResult> UploadAttachmentAsync(IFormFile file);

    /// <summary>
    /// 下载公文附件
    /// </summary>
    Task<DocumentAttachmentDownloadResult?> DownloadAttachmentAsync(string attachmentId);

    /// <summary>
    /// 基于流程定义的创建表单创建公文（草稿）
    /// </summary>
    Task<Document> CreateDocumentForWorkflowAsync(string workflowDefinitionId, Dictionary<string, object> values, List<string>? attachmentIds = null);
    /// <summary>
    /// 获取公文统计信息
    /// </summary>
    Task<DocumentStatisticsResponse> GetStatisticsAsync();
}

/// <summary>
/// 创建公文请求
/// </summary>
public class CreateDocumentRequest
{
    /// <summary>
    /// 公文标题
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 公文内容
    /// </summary>
    public string? Content { get; set; }

    /// <summary>
    /// 公文类型
    /// </summary>
    public string DocumentType { get; set; } = string.Empty;

    /// <summary>
    /// 分类
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// 附件ID列表
    /// </summary>
    public List<string>? AttachmentIds { get; set; }

    /// <summary>
    /// 表单数据
    /// </summary>
    public Dictionary<string, object>? FormData { get; set; }
}

/// <summary>
/// 更新公文请求
/// </summary>
public class UpdateDocumentRequest
{
    /// <summary>
    /// 公文标题
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// 公文内容
    /// </summary>
    public string? Content { get; set; }

    /// <summary>
    /// 公文类型
    /// </summary>
    public string? DocumentType { get; set; }

    /// <summary>
    /// 分类
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// 附件ID列表
    /// </summary>
    public List<string>? AttachmentIds { get; set; }

    /// <summary>
    /// 表单数据
    /// </summary>
    public Dictionary<string, object>? FormData { get; set; }
}

/// <summary>
/// 公文查询参数
/// </summary>
public class DocumentQueryParams
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
    /// 关键词搜索
    /// </summary>
    public string? Keyword { get; set; }

    /// <summary>
    /// 状态筛选
    /// </summary>
    public DocumentStatus? Status { get; set; }

    /// <summary>
    /// 公文类型筛选
    /// </summary>
    public string? DocumentType { get; set; }

    /// <summary>
    /// 分类筛选
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// 创建人筛选
    /// </summary>
    public string? CreatedBy { get; set; }

    /// <summary>
    /// 筛选类型：all, my, pending, approved, rejected
    /// </summary>
    public string? FilterType { get; set; }
}

/// <summary>
/// 公文服务实现
/// </summary>
public class DocumentService : IDocumentService
{
    private readonly IDataFactory<Document> _documentFactory;
    private readonly IDataFactory<WorkflowInstance> _instanceFactory;
    private readonly IDataFactory<WorkflowDefinition> _definitionFactory;
    private readonly IDataFactory<UserCompany> _userCompanyFactory;
    private readonly IDataFactory<FormDefinition> _formFactory;
    private readonly IWorkflowEngine _workflowEngine;
    private readonly ILogger<DocumentService> _logger;
    private readonly GridFSBucket _gridFsBucket;
    private readonly ITenantContext _tenantContext;

    /// <summary>
    /// 初始化公文服务
    /// </summary>
    public DocumentService(
        IDataFactory<Document> documentFactory,
        IDataFactory<WorkflowInstance> instanceFactory,
        IDataFactory<WorkflowDefinition> definitionFactory,
        IDataFactory<UserCompany> userCompanyFactory,
        IDataFactory<FormDefinition> formFactory,
        IWorkflowEngine workflowEngine,
        ILogger<DocumentService> logger,
       IGridFSService gridFSService,
        ITenantContext tenantContext)
    {
        _documentFactory = documentFactory;
        _instanceFactory = instanceFactory;
        _definitionFactory = definitionFactory;
        _userCompanyFactory = userCompanyFactory;
        _formFactory = formFactory;
        _workflowEngine = workflowEngine;
        _logger = logger;
        _tenantContext = tenantContext;
        var gridFsServiceNotNull = gridFSService ?? throw new ArgumentNullException(nameof(gridFSService));
        _gridFsBucket = gridFsServiceNotNull.GetBucket("document_attachments");
    }

    /// <summary>
    /// 创建公文
    /// </summary>
    public async Task<Document> CreateDocumentAsync(CreateDocumentRequest request)
    {
        var userId = _documentFactory.GetRequiredUserId();
        var companyId = await _documentFactory.GetRequiredCompanyIdAsync();

        var sanitizedFormData = request.FormData != null ? SerializationExtensions.SanitizeDictionary(request.FormData) : new Dictionary<string, object>();

        var document = new Document
        {
            Title = request.Title,
            Content = request.Content,
            DocumentType = request.DocumentType,
            Category = request.Category,
            Status = DocumentStatus.Draft,
            AttachmentIds = request.AttachmentIds ?? new List<string>(),
            FormData = sanitizedFormData,
            CompanyId = companyId
        };

        return await _documentFactory.CreateAsync(document);
    }

    /// <summary>
    /// 更新公文
    /// </summary>
    public async Task<Document?> UpdateDocumentAsync(string id, UpdateDocumentRequest request)
    {
        var document = await _documentFactory.GetByIdAsync(id);
        if (document == null)
        {
            return null;
        }

        // 只有草稿状态的公文可以修改
        if (document.Status != DocumentStatus.Draft)
        {
            throw new InvalidOperationException("只有草稿状态的公文可以修改");
        }

        bool hasUpdate = false;

        await _documentFactory.UpdateAsync(id, entity =>
        {
            if (!string.IsNullOrEmpty(request.Title))
            {
                entity.Title = request.Title;
                hasUpdate = true;
            }

            if (request.Content != null)
            {
                entity.Content = request.Content;
                hasUpdate = true;
            }

            if (!string.IsNullOrEmpty(request.DocumentType))
            {
                entity.DocumentType = request.DocumentType;
                hasUpdate = true;
            }

            if (request.Category != null)
            {
                entity.Category = request.Category;
                hasUpdate = true;
            }

            if (request.AttachmentIds != null)
            {
                entity.AttachmentIds = request.AttachmentIds;
                hasUpdate = true;
            }

            if (request.FormData != null)
            {
                var sanitized = SerializationExtensions.SanitizeDictionary(request.FormData);
                entity.FormData = sanitized;
                hasUpdate = true;
            }
        });

        if (!hasUpdate)
        {
            return document;
        }

        var updated = await _documentFactory.FindAsync(d => d.Id == id, limit: 1);
        return updated.FirstOrDefault();
    }

    /// <summary>
    /// 获取公文详情
    /// </summary>
    public async Task<Document?> GetDocumentAsync(string id)
    {
        return await _documentFactory.GetByIdAsync(id);
    }

    /// <summary>
    /// 获取公文列表
    /// </summary>
    public async Task<(List<Document> items, long total)> GetDocumentsAsync(DocumentQueryParams query)
    {
        var userId = _documentFactory.GetRequiredUserId();
        var companyId = await _documentFactory.GetRequiredCompanyIdAsync();

        Expression<Func<Document, bool>> filter = d => d.CompanyId == companyId;

        // 关键词搜索
        if (!string.IsNullOrEmpty(query.Keyword))
        {
            var keyword = query.Keyword.ToLower();
            filter = filter.And(d => d.Title.ToLower().Contains(keyword) || (d.Content != null && d.Content.ToLower().Contains(keyword)));
        }

        // 状态筛选
        if (query.Status.HasValue)
        {
            filter = filter.And(d => d.Status == query.Status.Value);
        }

        // 类型筛选
        if (!string.IsNullOrEmpty(query.DocumentType))
        {
            filter = filter.And(d => d.DocumentType == query.DocumentType);
        }

        // 分类筛选
        if (!string.IsNullOrEmpty(query.Category))
        {
            filter = filter.And(d => d.Category == query.Category);
        }

        // 创建人筛选
        if (!string.IsNullOrEmpty(query.CreatedBy))
        {
            filter = filter.And(d => d.CreatedBy == query.CreatedBy);
        }

        // 筛选类型
        if (!string.IsNullOrEmpty(query.FilterType))
        {
            switch (query.FilterType.ToLower())
            {
                case "my":
                    filter = filter.And(d => d.CreatedBy == userId);
                    break;

                case "pending":
                    filter = filter.And(d => d.Status == DocumentStatus.Pending);
                    var pendingInstances = await _instanceFactory.FindAsync(i =>
                        i.Status == WorkflowStatus.Running &&
                        i.CurrentApproverIds.Contains(userId));
                    var instanceIds = pendingInstances.Select(i => i.Id).ToList();
                    if (instanceIds.Any())
                    {
                        filter = filter.And(d => d.WorkflowInstanceId != null && instanceIds.Contains(d.WorkflowInstanceId));
                    }
                    else
                    {
                        return (new List<Document>(), 0);
                    }
                    break;

                case "approved":
                    filter = filter.And(d => d.Status == DocumentStatus.Approved);
                    break;

                case "rejected":
                    filter = filter.And(d => d.Status == DocumentStatus.Rejected);
                    break;
            }
        }

        return await _documentFactory.FindPagedAsync(
            filter,
            q => q.OrderByDescending(d => d.CreatedAt),
            query.Page,
            query.PageSize);
    }

    /// <summary>
    /// 删除公文
    /// </summary>
    public async Task<bool> DeleteDocumentAsync(string id)
    {
        var document = await _documentFactory.GetByIdAsync(id);
        if (document == null)
        {
            return false;
        }

        // 只有草稿状态的公文可以删除
        if (document.Status != DocumentStatus.Draft)
        {
            throw new InvalidOperationException("只有草稿状态的公文可以删除");
        }

        await _documentFactory.SoftDeleteAsync(id);
        return true;
    }

    /// <summary>
    /// 提交公文（启动流程）
    /// </summary>
    public async Task<WorkflowInstance> SubmitDocumentAsync(string documentId, string workflowDefinitionId, Dictionary<string, object>? variables = null)
    {
        var document = await _documentFactory.GetByIdAsync(documentId);
        if (document == null)
        {
            throw new InvalidOperationException("公文不存在");
        }

        if (document.Status != DocumentStatus.Draft)
        {
            throw new InvalidOperationException("只有草稿状态的公文可以提交");
        }

        // 启动工作流（先清洗变量，避免 JsonElement 序列化错误）
        var sanitizedVars = variables != null
            ? SerializationExtensions.SanitizeDictionary(variables)
            : null;
        var instance = await _workflowEngine.StartWorkflowAsync(workflowDefinitionId, documentId, sanitizedVars);

        _logger.LogInformation("公文已提交: DocumentId={DocumentId}, WorkflowInstanceId={InstanceId}",
            documentId, instance.Id);

        return instance;
    }

    /// <summary>
    /// 上传公文附件到 GridFS
    /// </summary>
    public async Task<DocumentAttachmentUploadResult> UploadAttachmentAsync(IFormFile file)
    {
        ArgumentNullException.ThrowIfNull(file);

        if (file.Length <= 0)
        {
            throw new ArgumentException("附件内容为空", nameof(file));
        }

        var userId = _documentFactory.GetRequiredUserId();
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();

        await using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        string checksum;
        using (var sha256 = SHA256.Create())
        {
            checksum = Convert.ToHexString(sha256.ComputeHash(memoryStream));
        }

        memoryStream.Position = 0;

        var fileName = string.IsNullOrWhiteSpace(file.FileName)
            ? $"attachment-{Guid.NewGuid():N}"
            : file.FileName;

        var gridFsId = await _gridFsBucket.UploadFromStreamAsync(
            fileName,
            memoryStream,
            new GridFSUploadOptions
            {
                Metadata = new BsonDocument
                {
                    { "companyId", companyId },
                    { "uploaderId", userId },
                    { "mimeType", file.ContentType ?? "application/octet-stream" },
                    { "size", file.Length },
                    { "checksum", checksum }
                }
            });

        return new DocumentAttachmentUploadResult
        {
            Id = gridFsId.ToString(),
            Name = fileName,
            Size = file.Length,
            ContentType = file.ContentType ?? "application/octet-stream",
            Url = $"/api/documents/attachments/{gridFsId}"
        };
    }

    /// <summary>
    /// 下载公文附件
    /// </summary>
    public async Task<DocumentAttachmentDownloadResult?> DownloadAttachmentAsync(string attachmentId)
    {
        if (string.IsNullOrWhiteSpace(attachmentId))
        {
            throw new ArgumentException("附件标识不能为空", nameof(attachmentId));
        }

        if (!ObjectId.TryParse(attachmentId, out var gridFsId))
        {
            throw new ArgumentException("附件标识格式不正确", nameof(attachmentId));
        }

        try
        {
            var downloadStream = await _gridFsBucket.OpenDownloadStreamAsync(gridFsId);
            if (downloadStream.CanSeek)
            {
                downloadStream.Seek(0, SeekOrigin.Begin);
            }

            var contentType = downloadStream.FileInfo?.Metadata?["mimeType"]?.AsString ?? "application/octet-stream";
            var fileName = downloadStream.FileInfo?.Filename ?? "attachment";

            return new DocumentAttachmentDownloadResult
            {
                Content = downloadStream,
                ContentType = contentType,
                FileName = fileName,
                ContentLength = downloadStream.FileInfo?.Length ?? 0
            };
        }
        catch (GridFSFileNotFoundException)
        {
            return null;
        }
    }

    /// <summary>
    /// 基于流程定义的创建表单创建公文（草稿）
    /// </summary>
    public async Task<Document> CreateDocumentForWorkflowAsync(string workflowDefinitionId, Dictionary<string, object> values, List<string>? attachmentIds = null)
    {
        if (string.IsNullOrWhiteSpace(workflowDefinitionId))
        {
            throw new ArgumentException("流程定义ID不能为空", nameof(workflowDefinitionId));
        }

        var definition = await _definitionFactory.GetByIdAsync(workflowDefinitionId);
        if (definition == null)
        {
            throw new InvalidOperationException("流程定义不存在");
        }

        // 查找创建用的文档表单绑定：优先 start 节点，否则第一个绑定文档表单的节点
        FormBinding? binding = definition.Graph.Nodes.FirstOrDefault(n => n.Type == "start")?.Config?.Form;
        if (binding == null || binding.Target != FormTarget.Document)
        {
            var nodeWithDocForm = definition.Graph.Nodes.FirstOrDefault(n => n.Config?.Form?.Target == FormTarget.Document);
            binding = nodeWithDocForm?.Config?.Form;
        }

        if (binding == null)
        {
            throw new InvalidOperationException("该流程未配置用于创建公文的文档表单");
        }

        var form = await _formFactory.GetByIdAsync(binding.FormDefinitionId);
        if (form == null)
        {
            throw new InvalidOperationException("表单定义不存在");
        }

        values ??= new Dictionary<string, object>();
        // 清洗 JsonElement 等不可序列化类型
        values = SerializationExtensions.SanitizeDictionary(values);

        // 基本必填校验：检查所有 required 字段的 dataKey 是否存在且非空
        var missing = new List<string>();
        foreach (var field in form.Fields)
        {
            if (field.Required)
            {
                if (!values.TryGetValue(field.DataKey, out var val) || val == null || (val is string s && string.IsNullOrWhiteSpace(s)))
                {
                    missing.Add(field.Label ?? field.DataKey);
                }
            }
        }

        if (missing.Any())
        {
            throw new InvalidOperationException($"必填字段缺失: {string.Join(", ", missing)}");
        }

        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();

        // 构造 FormData（考虑 DataScopeKey）
        Dictionary<string, object> formDataToSave;
        if (!string.IsNullOrWhiteSpace(binding.DataScopeKey))
        {
            formDataToSave = new Dictionary<string, object>
            {
                [binding.DataScopeKey!] = values
            };
        }
        else
        {
            formDataToSave = new Dictionary<string, object>(values);
        }

        // 从表单值中尝试提取标题（常用 dataKey: title）
        var title = values.TryGetValue("title", out var t) && t is string ts && !string.IsNullOrWhiteSpace(ts)
            ? ts
            : definition.Name;

        var document = new Document
        {
            Title = title,
            Content = null,
            DocumentType = definition.Name,
            Category = definition.Category,
            Status = DocumentStatus.Draft,
            AttachmentIds = attachmentIds ?? new List<string>(),
            FormData = formDataToSave,
            CompanyId = companyId
        };

        document = await _documentFactory.CreateAsync(document);
        _logger.LogInformation("基于流程表单创建公文: DocumentId={DocumentId}, WorkflowDefinitionId={DefinitionId}", document.Id, workflowDefinitionId);
        return document;
    }

    /// <summary>
    /// 解析审批人列表（与 WorkflowEngine 中的逻辑相同）
    /// </summary>
    private async Task<List<string>> ResolveApproversAsync(WorkflowInstance instance, List<ApproverRule> rules)
    {
        var approvers = new List<string>();
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();

        foreach (var rule in rules)
        {
            switch (rule.Type)
            {
                case ApproverType.User:
                    if (!string.IsNullOrEmpty(rule.UserId))
                    {
                        approvers.Add(rule.UserId);
                    }
                    break;

                case ApproverType.Role:
                    if (!string.IsNullOrEmpty(rule.RoleId))
                    {
                        try
                        {
                            var userCompanies = await _userCompanyFactory.FindAsync(uc => uc.CompanyId == companyId && uc.Status == "active" && uc.RoleIds.Contains(rule.RoleId!));
                            var userIds = userCompanies
                                .Select(uc => uc.UserId)
                                .Where(id => !string.IsNullOrEmpty(id))
                                .ToList();

                            approvers.AddRange(userIds);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "解析角色审批人失败: RoleId={RoleId}", rule.RoleId);
                        }
                    }
                    break;

                case ApproverType.Department:
                    // 部门审批人解析暂未实现
                    _logger.LogWarning("部门审批人解析暂未实现: DepartmentId={DepartmentId}", rule.DepartmentId);
                    break;
            }
        }

        return approvers.Distinct().ToList();
    }

    /// <summary>
    /// 获取公文统计信息
    /// </summary>
    public async Task<DocumentStatisticsResponse> GetStatisticsAsync()
    {
        var userId = _documentFactory.GetRequiredUserId();

        // 1. 总公文数
        var totalDocuments = await _documentFactory.CountAsync();

        // 2. 草稿箱
        var draftCount = await _documentFactory.CountAsync(d => d.Status == DocumentStatus.Draft);

        // 3. 已审批（通过）
        var approvedCount = await _documentFactory.CountAsync(d => d.Status == DocumentStatus.Approved);

        // 4. 已驳回
        var rejectedCount = await _documentFactory.CountAsync(d => d.Status == DocumentStatus.Rejected);

        // 5. 我发起的
        var myCreatedCount = await _documentFactory.CountAsync(d => d.CreatedBy == userId);

        // 6. 待审批
        long pendingCount = 0;
        try
        {
            var pendingInstances = await _instanceFactory.FindAsync(i =>
                i.Status == WorkflowStatus.Running &&
                i.CurrentApproverIds.Contains(userId));

            var instanceIds = pendingInstances.Select(i => i.Id).ToList();
            if (instanceIds.Any())
            {
                pendingCount = await _documentFactory.CountAsync(d => instanceIds.Contains(d.WorkflowInstanceId));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取待审批数量失败");
        }

        return new DocumentStatisticsResponse
        {
            TotalDocuments = (int)totalDocuments,
            DraftCount = (int)draftCount,
            PendingCount = pendingCount,
            ApprovedCount = (int)approvedCount,
            RejectedCount = (int)rejectedCount,
            MyCreatedCount = (int)myCreatedCount
        };
    }
}

/// <summary>
/// 公文附件上传结果
/// </summary>
public class DocumentAttachmentUploadResult
{
    /// <summary>附件ID</summary>
    public string Id { get; set; } = string.Empty;
    /// <summary>文件名</summary>
    public string Name { get; set; } = string.Empty;
    /// <summary>文件大小（字节）</summary>
    public long Size { get; set; }
    /// <summary>内容类型</summary>
    public string ContentType { get; set; } = "application/octet-stream";
    /// <summary>访问URL</summary>
    public string Url { get; set; } = string.Empty;
}

/// <summary>
/// 公文附件下载结果
/// </summary>
public class DocumentAttachmentDownloadResult
{
    /// <summary>文件内容流</summary>
    public Stream Content { get; set; } = Stream.Null;
    /// <summary>内容类型</summary>
    public string ContentType { get; set; } = "application/octet-stream";
    /// <summary>文件名</summary>
    public string FileName { get; set; } = "attachment";
    /// <summary>内容长度（字节）</summary>
    public long ContentLength { get; set; }
}
