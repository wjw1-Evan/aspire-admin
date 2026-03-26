using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
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
    private readonly IWorkflowEngine _workflowEngine;
    private readonly ILogger<DocumentService> _logger;
    private readonly IFileStorageFactory _fileStorageFactory;
    private readonly ITenantContext _tenantContext;
    private readonly DbContext _context;

    /// <summary>
    /// 初始化公文服务
    /// </summary>
    public DocumentService(DbContext context,
        IWorkflowEngine workflowEngine,
        ILogger<DocumentService> logger,
        IFileStorageFactory fileStorageFactory,
        ITenantContext tenantContext)
    {
        _context = context;
        _workflowEngine = workflowEngine;
        _logger = logger;
        _fileStorageFactory = fileStorageFactory;
        _tenantContext = tenantContext;
    }

    /// <summary>
    /// 创建公文
    /// </summary>
    public async Task<Document> CreateDocumentAsync(CreateDocumentRequest request)
    {
        
        var sanitizedFormData = request.FormData != null ? SerializationExtensions.SanitizeDictionary(request.FormData) : new Dictionary<string, object>();

        var document = new Document
        {
            Title = request.Title,
            Content = request.Content,
            DocumentType = request.DocumentType,
            Category = request.Category,
            Status = DocumentStatus.Draft,
            AttachmentIds = request.AttachmentIds ?? new List<string>(),
            FormData = sanitizedFormData
        };

        await _context.Set<Document>().AddAsync(document);
        await _context.SaveChangesAsync();
        return document;
    }

    /// <summary>
    /// 更新公文
    /// </summary>
    public async Task<Document?> UpdateDocumentAsync(string id, UpdateDocumentRequest request)
    {
        var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == id);
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

        var __entity = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == id);
        if (__entity != null)
        {
    
            if (!string.IsNullOrEmpty(request.Title))
            {
                __entity.Title = request.Title;
                hasUpdate = true;
            }

            if (request.Content != null)
            {
                __entity.Content = request.Content;
                hasUpdate = true;
            }

            if (!string.IsNullOrEmpty(request.DocumentType))
            {
                __entity.DocumentType = request.DocumentType;
                hasUpdate = true;
            }

            if (request.Category != null)
            {
                __entity.Category = request.Category;
                hasUpdate = true;
            }

            if (request.AttachmentIds != null)
            {
                __entity.AttachmentIds = request.AttachmentIds;
                hasUpdate = true;
            }

            if (request.FormData != null)
            {
                var sanitized = SerializationExtensions.SanitizeDictionary(request.FormData);
                __entity.FormData = sanitized;
                hasUpdate = true;
            }
            await _context.SaveChangesAsync();
        }


        if (!hasUpdate)
        {
            return document;
        }

        var updated = await _context.Set<Document>().Where(d => d.Id == id).Take(1).ToListAsync();
        return updated.FirstOrDefault();
    }

    /// <summary>
    /// 获取公文详情
    /// </summary>
    public async Task<Document?> GetDocumentAsync(string id)
    {
        return await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == id);
    }

    /// <summary>
    /// 获取公文列表
    /// </summary>
    public async Task<(List<Document> items, long total)> GetDocumentsAsync(DocumentQueryParams query)
    {
        Expression<Func<Document, bool>> filter = d => true;

        // 关键词搜索
        if (!string.IsNullOrEmpty(query.Keyword))
        {
            var keyword = query.Keyword.ToLower();
            filter = filter.And(d => (d.Title ?? "").ToLower().Contains(keyword) || (d.Content != null && d.Content.ToLower().Contains(keyword)));
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
            var userId = _tenantContext.GetCurrentUserId();
            switch (query.FilterType.ToLower())
            {
                case "my":
                    if (!string.IsNullOrEmpty(userId))
                        filter = filter.And(d => d.CreatedBy == userId);
                    break;

                case "pending":
                    filter = filter.And(d => d.Status == DocumentStatus.Approving);
                    // 审批节点挂起时状态为 Waiting，需同时匹配 Running 和 Waiting
                    if (!string.IsNullOrEmpty(userId))
                    {
                        var pendingInstances = await _context.Set<WorkflowInstance>().Where(i =>
                            (i.Status == WorkflowStatus.Running || i.Status == WorkflowStatus.Waiting) &&
                            i.CurrentApproverIds.Contains(userId)).ToListAsync();
                        var instanceIds = pendingInstances.Select(i => i.Id).ToList();
                        if (instanceIds.Any())
                        {
                            filter = filter.And(d => d.WorkflowInstanceId != null && instanceIds.Contains(d.WorkflowInstanceId));
                        }
                        else
                        {
                            return (new List<Document>(), 0);
                        }
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

        {
            var __fpQ = _context.Set<Document>().Where(
            filter);
            var __fpT = await __fpQ.LongCountAsync();
            var __fpI = await __fpQ.OrderByDescending(d => d.CreatedAt).Skip((query.Page - 1) * query.PageSize).Take(query.PageSize).ToListAsync();
            return (__fpI, __fpT);
        }
    }

    /// <summary>
    /// 删除公文
    /// </summary>
    public async Task<bool> DeleteDocumentAsync(string id)
    {
        var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == id);
        if (document == null)
        {
            return false;
        }

        // 只有草稿状态的公文可以删除
        if (document.Status != DocumentStatus.Draft)
        {
            throw new InvalidOperationException("只有草稿状态的公文可以删除");
        }

                    var __sd2 = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == id);
            if (__sd2 != null) { __sd2.IsDeleted = true; await _context.SaveChangesAsync(); }

        return true;
    }

    /// <summary>
    /// 提交公文（启动流程）
    /// </summary>
    public async Task<WorkflowInstance> SubmitDocumentAsync(string documentId, string workflowDefinitionId, Dictionary<string, object>? variables = null)
    {
        var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == documentId);
        if (document == null)
        {
            throw new InvalidOperationException("公文不存在");
        }

        if (document.Status != DocumentStatus.Draft)
        {
            throw new InvalidOperationException("只有草稿状态的公文可以提交");
        }

        var userId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");

        // 启动工作流（合并文档中的 FormData 和 提交时传递的变量）
        // 优先级：FormData > Variables（FormData 不会被 Variables 覆盖）
        var allVariables = new Dictionary<string, object?>();

        // 先添加提交时传递的变量
        if (variables != null)
        {
            var sanitizedVars = SerializationExtensions.SanitizeDictionary(variables);
            foreach (var kv in sanitizedVars)
            {
                allVariables[kv.Key] = kv.Value;
            }
        }

        // 再添加文档的 FormData（会覆盖同名的 Variables）
        if (document.FormData != null)
        {
            foreach (var kv in document.FormData)
            {
                allVariables[kv.Key] = kv.Value;
            }
        }

        var instance = await _workflowEngine.StartWorkflowAsync(workflowDefinitionId, documentId, userId, allVariables);

        // 更新文档的 WorkflowInstanceId 字段
        var __entity = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == documentId);
        if (__entity != null)
        {
    
            __entity.WorkflowInstanceId = instance.Id;
            __entity.Status = DocumentStatus.Approving;
            await _context.SaveChangesAsync();
        }


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

        var userId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");

        await using var fileStream = file.OpenReadStream();

        string checksum;
        using (var sha256 = SHA256.Create())
        {
            var hashBytes = await sha256.ComputeHashAsync(fileStream);
            checksum = Convert.ToHexString(hashBytes);
        }

        fileStream.Position = 0;

        var fileName = string.IsNullOrWhiteSpace(file.FileName)
            ? $"attachment-{Guid.NewGuid():N}"
            : file.FileName;

        var metadata = new Dictionary<string, object>
        {
            { "uploaderId", userId },
            { "mimeType", file.ContentType ?? "application/octet-stream" },
            { "size", file.Length },
            { "checksum", checksum }
        };

        var gridFsId = await _fileStorageFactory.UploadAsync(
            fileStream,
            fileName,
            file.ContentType,
            metadata,
            "document_attachments");

        return new DocumentAttachmentUploadResult
        {
            Id = gridFsId,
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

        try
        {
            var bytes = await _fileStorageFactory.DownloadAsBytesAsync(attachmentId, "document_attachments");
            var fileInfo = await _fileStorageFactory.GetFileInfoAsync(attachmentId, "document_attachments");

            return new DocumentAttachmentDownloadResult
            {
                Content = new MemoryStream(bytes),
                ContentType = fileInfo?.ContentType ?? "application/octet-stream",
                FileName = fileInfo?.FileName ?? "attachment",
                ContentLength = fileInfo?.Length ?? bytes.Length
            };
        }
        catch
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

        var definition = await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(x => x.Id == workflowDefinitionId);
        if (definition == null)
        {
            throw new InvalidOperationException("流程定义不存在");
        }

        // 查找创建用的文档表单绑定：优先 start 节点，否则第一个绑定文档表单的节点
        FormBinding? binding = definition.Graph.Nodes.FirstOrDefault(n => n.Data.NodeType == "start")?.Data.Config?.Form;
        if (binding == null || binding.Target != FormTarget.Document)
        {
            var nodeWithDocForm = definition.Graph.Nodes.FirstOrDefault(n => n.Data.Config?.Form?.Target == FormTarget.Document);
            binding = nodeWithDocForm?.Data.Config?.Form;
        }

        if (binding == null || string.IsNullOrEmpty(binding.FormDefinitionId))
        {
            throw new InvalidOperationException("该流程未配置完整用于创建公文的文档表单");
        }

        var form = await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == binding.FormDefinitionId);
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
            FormData = formDataToSave
        };

        await _context.Set<Document>().AddAsync(document);
        await _context.SaveChangesAsync();
        document = document;
        _logger.LogInformation("基于流程表单创建公文: DocumentId={DocumentId}, WorkflowDefinitionId={DefinitionId}", document.Id, workflowDefinitionId);
        return document;
    }

    /// <summary>
    /// 解析审批人列表（与 WorkflowEngine 中的逻辑相同）
    /// </summary>
    private async Task<List<string>> ResolveApproversAsync(WorkflowInstance instance, List<ApproverRule> rules, string companyId)
    {
        var approvers = new List<string>();

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
                            var userCompanies = await _context.Set<UserCompany>().Where(uc => uc.CompanyId == companyId && uc.Status == "active" && uc.RoleIds.Contains(rule.RoleId!)).ToListAsync();
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
        var userId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        // 1. 总公文数
        var totalDocuments = await _context.Set<Document>().LongCountAsync(d => true);

        // 2. 草稿箱
        var draftCount = await _context.Set<Document>().LongCountAsync(d => d.Status == DocumentStatus.Draft);

        // 3. 已审批（通过）
        var approvedCount = await _context.Set<Document>().LongCountAsync(d => d.Status == DocumentStatus.Approved);

        // 4. 已驳回
        var rejectedCount = await _context.Set<Document>().LongCountAsync(d => d.Status == DocumentStatus.Rejected);

        // Bug 22 修复：统计审批中文档总数
        var approvingCount = await _context.Set<Document>().LongCountAsync(d => d.Status == DocumentStatus.Approving);

        // 5. 我发起的
        var myCreatedCount = await _context.Set<Document>().LongCountAsync(d => d.CreatedBy == userId);

        // 6. 待审批
        long pendingCount = 0;
        try
        {
            // 审批节点挂起时状态为 Waiting，需同时匹配 Running 和 Waiting
            var pendingInstances = await _context.Set<WorkflowInstance>().Where(i =>
                (i.Status == WorkflowStatus.Running || i.Status == WorkflowStatus.Waiting) &&
                i.CurrentApproverIds.Contains(userId)).ToListAsync();

            var instanceIds = pendingInstances.Select(i => i.Id).ToList();
            if (instanceIds.Any())
            {
                pendingCount = await _context.Set<Document>().LongCountAsync(d =>
                    d.Status == DocumentStatus.Approving &&
                    d.WorkflowInstanceId != null &&
                    instanceIds.Contains(d.WorkflowInstanceId));
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
            ApprovingCount = (int)approvingCount,
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