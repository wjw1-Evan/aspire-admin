using Microsoft.AspNetCore.Http;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Models;
using System.Linq.Dynamic.Core;

namespace Platform.ApiService.Services;

public interface IDocumentCrudService
{
    Task<Document> CreateDocumentAsync(CreateDocumentRequest request);
    Task<Document?> UpdateDocumentAsync(string id, UpdateDocumentRequest request);
    Task UpdateDocumentAsync(Document document);
    Task<Document?> GetDocumentAsync(string id);
    Task<PagedResult<Document>> GetDocumentsAsync(
        ProTableRequest request,
        DocumentStatus? status = null,
        string? documentType = null,
        string? category = null,
        string? createdBy = null,
        string? filterType = null);
    Task<bool> DeleteDocumentAsync(string id);
}

public interface IDocumentWorkflowService
{
    Task<WorkflowInstance> SubmitDocumentAsync(string documentId, string workflowDefinitionId, Dictionary<string, object>? variables = null);
    Task<Document> CreateDocumentForWorkflowAsync(string workflowDefinitionId, Dictionary<string, object> values, List<string>? attachmentIds = null);
    Task<WorkflowDefinition?> GetWorkflowDefinitionAsync(string definitionId);
}

public interface IDocumentAttachmentService
{
    Task<DocumentAttachmentUploadResult> UploadAttachmentAsync(IFormFile file);
    Task<DocumentAttachmentDownloadResult?> DownloadAttachmentAsync(string attachmentId);
}

public interface IDocumentStatisticsService
{
    Task<DocumentStatisticsResponse> GetStatisticsAsync();
}
