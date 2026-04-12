using Microsoft.AspNetCore.Http;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Models;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

public interface IDocumentService
{
    Task<Document> CreateDocumentAsync(CreateDocumentRequest request);
    Task<Document?> UpdateDocumentAsync(string id, UpdateDocumentRequest request);
    Task UpdateDocumentAsync(Document document);
    Task<Document?> GetDocumentAsync(string id);
    Task<PagedResult<Document>> GetDocumentsAsync(PageParams pageParams, DocumentStatus? status = null, string? documentType = null, string? category = null, string? createdBy = null, string? filterType = null);
    Task<bool> DeleteDocumentAsync(string id);
    Task<WorkflowInstance> SubmitDocumentAsync(string documentId, string workflowDefinitionId, Dictionary<string, object>? variables = null);
    Task<DocumentAttachmentUploadResult> UploadAttachmentAsync(IFormFile file);
    Task<DocumentAttachmentDownloadResult?> DownloadAttachmentAsync(string attachmentId);
    Task<Document> CreateDocumentForWorkflowAsync(string workflowDefinitionId, Dictionary<string, object> values, List<string>? attachmentIds = null);
    Task<DocumentStatisticsResponse> GetStatisticsAsync();
    Task<WorkflowDefinition?> GetWorkflowDefinitionAsync(string definitionId);
}

/// <summary>
/// 公文服务门面实现 - 委托给子服务
/// </summary>
public class DocumentService : IDocumentService
{
    private readonly IDocumentCrudService _crudService;
    private readonly IDocumentWorkflowService _workflowService;
    private readonly IDocumentAttachmentService _attachmentService;
    private readonly IDocumentStatisticsService _statisticsService;

    public DocumentService(
        IDocumentCrudService crudService,
        IDocumentWorkflowService workflowService,
        IDocumentAttachmentService attachmentService,
        IDocumentStatisticsService statisticsService)
    {
        _crudService = crudService;
        _workflowService = workflowService;
        _attachmentService = attachmentService;
        _statisticsService = statisticsService;
    }

    public async Task<Document> CreateDocumentAsync(CreateDocumentRequest request)
        => await _crudService.CreateDocumentAsync(request);

    public async Task<Document?> UpdateDocumentAsync(string id, UpdateDocumentRequest request)
        => await _crudService.UpdateDocumentAsync(id, request);

    public async Task UpdateDocumentAsync(Document document)
        => await _crudService.UpdateDocumentAsync(document);

    public async Task<Document?> GetDocumentAsync(string id)
        => await _crudService.GetDocumentAsync(id);

    public async Task<PagedResult<Document>> GetDocumentsAsync(
        PageParams pageParams,
        DocumentStatus? status = null,
        string? documentType = null,
        string? category = null,
        string? createdBy = null,
        string? filterType = null)
        => await _crudService.GetDocumentsAsync(pageParams, status, documentType, category, createdBy, filterType);

    public async Task<bool> DeleteDocumentAsync(string id)
        => await _crudService.DeleteDocumentAsync(id);

    public async Task<WorkflowInstance> SubmitDocumentAsync(string documentId, string workflowDefinitionId, Dictionary<string, object>? variables = null)
        => await _workflowService.SubmitDocumentAsync(documentId, workflowDefinitionId, variables);

    public async Task<DocumentAttachmentUploadResult> UploadAttachmentAsync(IFormFile file)
        => await _attachmentService.UploadAttachmentAsync(file);

    public async Task<DocumentAttachmentDownloadResult?> DownloadAttachmentAsync(string attachmentId)
        => await _attachmentService.DownloadAttachmentAsync(attachmentId);

    public async Task<Document> CreateDocumentForWorkflowAsync(string workflowDefinitionId, Dictionary<string, object> values, List<string>? attachmentIds = null)
        => await _workflowService.CreateDocumentForWorkflowAsync(workflowDefinitionId, values, attachmentIds);

    public async Task<DocumentStatisticsResponse> GetStatisticsAsync()
        => await _statisticsService.GetStatisticsAsync();

    public async Task<WorkflowDefinition?> GetWorkflowDefinitionAsync(string definitionId)
        => await _workflowService.GetWorkflowDefinitionAsync(definitionId);
}

public class CreateDocumentRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Content { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string? Category { get; set; }
    public List<string>? AttachmentIds { get; set; }
    public Dictionary<string, object>? FormData { get; set; }
}

public class UpdateDocumentRequest
{
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? DocumentType { get; set; }
    public string? Category { get; set; }
    public List<string>? AttachmentIds { get; set; }
    public Dictionary<string, object>? FormData { get; set; }
}

public class DocumentAttachmentUploadResult
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public long Size { get; set; }
    public string ContentType { get; set; } = "application/octet-stream";
    public string Url { get; set; } = string.Empty;
}

public class DocumentAttachmentDownloadResult
{
    public Stream Content { get; set; } = Stream.Null;
    public string ContentType { get; set; } = "application/octet-stream";
    public string FileName { get; set; } = "attachment";
    public long ContentLength { get; set; }
}
