using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UserCompany = Platform.ApiService.Models.UserCompany;

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
    /// 当前页码
    /// </summary>
    public int Current { get; set; } = 1;

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
    private readonly IDatabaseOperationFactory<Document> _documentFactory;
    private readonly IDatabaseOperationFactory<WorkflowInstance> _instanceFactory;
    private readonly IDatabaseOperationFactory<WorkflowDefinition> _definitionFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly IWorkflowEngine _workflowEngine;
    private readonly ILogger<DocumentService> _logger;

    /// <summary>
    /// 初始化公文服务
    /// </summary>
    /// <param name="documentFactory">公文工厂</param>
    /// <param name="instanceFactory">流程实例工厂</param>
    /// <param name="definitionFactory">流程定义工厂</param>
    /// <param name="userCompanyFactory">用户企业关系工厂</param>
    /// <param name="workflowEngine">工作流引擎</param>
    /// <param name="logger">日志记录器</param>
    public DocumentService(
        IDatabaseOperationFactory<Document> documentFactory,
        IDatabaseOperationFactory<WorkflowInstance> instanceFactory,
        IDatabaseOperationFactory<WorkflowDefinition> definitionFactory,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        IWorkflowEngine workflowEngine,
        ILogger<DocumentService> logger)
    {
        _documentFactory = documentFactory;
        _instanceFactory = instanceFactory;
        _definitionFactory = definitionFactory;
        _userCompanyFactory = userCompanyFactory;
        _workflowEngine = workflowEngine;
        _logger = logger;
    }

    /// <summary>
    /// 创建公文
    /// </summary>
    public async Task<Document> CreateDocumentAsync(CreateDocumentRequest request)
    {
        var userId = _documentFactory.GetRequiredUserId();
        var companyId = await _documentFactory.GetRequiredCompanyIdAsync();

        var document = new Document
        {
            Title = request.Title,
            Content = request.Content,
            DocumentType = request.DocumentType,
            Category = request.Category,
            Status = DocumentStatus.Draft,
            AttachmentIds = request.AttachmentIds ?? new List<string>(),
            FormData = request.FormData ?? new Dictionary<string, object>(),
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

        var updateBuilder = _documentFactory.CreateUpdateBuilder();
        bool hasUpdate = false;

        if (!string.IsNullOrEmpty(request.Title))
        {
            updateBuilder.Set(d => d.Title, request.Title);
            hasUpdate = true;
        }

        if (request.Content != null)
        {
            updateBuilder.Set(d => d.Content, request.Content);
            hasUpdate = true;
        }

        if (!string.IsNullOrEmpty(request.DocumentType))
        {
            updateBuilder.Set(d => d.DocumentType, request.DocumentType);
            hasUpdate = true;
        }

        if (request.Category != null)
        {
            updateBuilder.Set(d => d.Category, request.Category);
            hasUpdate = true;
        }

        if (request.AttachmentIds != null)
        {
            updateBuilder.Set(d => d.AttachmentIds, request.AttachmentIds);
            hasUpdate = true;
        }

        if (request.FormData != null)
        {
            updateBuilder.Set(d => d.FormData, request.FormData);
            hasUpdate = true;
        }

        if (!hasUpdate)
        {
            return document;
        }

        var update = updateBuilder.Build();
        var filter = _documentFactory.CreateFilterBuilder()
            .Equal(d => d.Id, id)
            .Build();

        return await _documentFactory.FindOneAndUpdateAsync(filter, update);
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
        var filterBuilder = _documentFactory.CreateFilterBuilder();
        var companyId = await _documentFactory.GetRequiredCompanyIdAsync();

        // 关键词搜索
        if (!string.IsNullOrEmpty(query.Keyword))
        {
            var pattern = $".*{System.Text.RegularExpressions.Regex.Escape(query.Keyword)}.*";
            var regex = new MongoDB.Bson.BsonRegularExpression(pattern, "i");
            var keywordFilters = new List<FilterDefinition<Document>>
            {
                Builders<Document>.Filter.Regex(d => d.Title, regex)
            };

            // Content 字段可能为 null，需要先检查
            var contentFilter = Builders<Document>.Filter.And(
                Builders<Document>.Filter.Ne(d => d.Content, null),
                Builders<Document>.Filter.Regex(d => d.Content!, regex)
            );
            keywordFilters.Add(contentFilter);

            var searchFilter = Builders<Document>.Filter.Or(keywordFilters);
            filterBuilder.Custom(searchFilter);
        }

        // 状态筛选
        if (query.Status.HasValue)
        {
            filterBuilder.Equal(d => d.Status, query.Status.Value);
        }

        // 类型筛选
        if (!string.IsNullOrEmpty(query.DocumentType))
        {
            filterBuilder.Equal(d => d.DocumentType, query.DocumentType);
        }

        // 分类筛选
        if (!string.IsNullOrEmpty(query.Category))
        {
            filterBuilder.Equal(d => d.Category, query.Category);
        }

        // 创建人筛选
        if (!string.IsNullOrEmpty(query.CreatedBy))
        {
            filterBuilder.Equal(d => d.CreatedBy, query.CreatedBy);
        }

        // 筛选类型
        if (!string.IsNullOrEmpty(query.FilterType))
        {
            switch (query.FilterType.ToLower())
            {
                case "my":
                    // 我的发起
                    filterBuilder.Equal(d => d.CreatedBy, userId);
                    break;

                case "pending":
                    // 待审批：查询当前用户需要审批的公文
                    // 需要查询流程实例，找到当前节点是审批节点且审批人包含当前用户的
                    filterBuilder.Equal(d => d.Status, DocumentStatus.Pending);

                    // 获取所有审批中的流程实例
                    var pendingInstancesFilter = _instanceFactory.CreateFilterBuilder()
                        .Equal(i => i.Status, WorkflowStatus.Running)
                        .Build();
                    var pendingInstances = await _instanceFactory.FindAsync(pendingInstancesFilter);

                    // 过滤出当前用户需要审批的实例
                    var userPendingInstanceIds = new List<string>();

                    foreach (var instance in pendingInstances)
                    {
                        try
                        {
                            // 获取流程定义
                            var definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
                            if (definition == null) continue;

                            // 获取当前节点
                            var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == instance.CurrentNodeId);
                            if (currentNode?.Type == "approval" && currentNode.Config.Approval != null)
                            {
                                // 解析审批人列表
                                var approvers = await ResolveApproversAsync(instance, currentNode.Config.Approval.Approvers);
                                if (approvers.Contains(userId))
                                {
                                    userPendingInstanceIds.Add(instance.Id);
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "处理流程实例失败: InstanceId={InstanceId}", instance.Id);
                        }
                    }

                    // 只查询这些实例关联的公文
                    if (userPendingInstanceIds.Any())
                    {
                        filterBuilder.In(d => d.WorkflowInstanceId, userPendingInstanceIds);
                    }
                    else
                    {
                        // 如果没有待审批的，直接返回空结果，避免构造非法的 ObjectId 过滤条件
                        return (new List<Document>(), 0);
                    }
                    break;

                case "approved":
                    filterBuilder.Equal(d => d.Status, DocumentStatus.Approved);
                    break;

                case "rejected":
                    filterBuilder.Equal(d => d.Status, DocumentStatus.Rejected);
                    break;
            }
        }

        var filter = filterBuilder.Build();
        var sort = _documentFactory.CreateSortBuilder()
            .Descending(d => d.CreatedAt)
            .Build();

        return await _documentFactory.FindPagedAsync(
            filter,
            sort,
            query.Current,
            query.PageSize
        );
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

        var filter = _documentFactory.CreateFilterBuilder()
            .Equal(d => d.Id, id)
            .Build();

        var result = await _documentFactory.FindOneAndSoftDeleteAsync(filter);
        return result != null;
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

        // 启动工作流
        var instance = await _workflowEngine.StartWorkflowAsync(workflowDefinitionId, documentId, variables);

        _logger.LogInformation("公文已提交: DocumentId={DocumentId}, WorkflowInstanceId={InstanceId}",
            documentId, instance.Id);

        return instance;
    }

    /// <summary>
    /// 解析审批人列表（与 WorkflowEngine 中的逻辑相同）
    /// </summary>
    private async Task<List<string>> ResolveApproversAsync(WorkflowInstance instance, List<ApproverRule> rules)
    {
        var approvers = new List<string>();
        var companyId = await _documentFactory.GetRequiredCompanyIdAsync();

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
                            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                                .Equal(uc => uc.CompanyId, companyId)
                                .Equal(uc => uc.Status, "active")
                                .Build();

                            var additionalFilter = Builders<UserCompany>.Filter.AnyEq(uc => uc.RoleIds, rule.RoleId);
                            var combinedFilter = Builders<UserCompany>.Filter.And(userCompanyFilter, additionalFilter);

                            var userCompanies = await _userCompanyFactory.FindAsync(combinedFilter);
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
}
