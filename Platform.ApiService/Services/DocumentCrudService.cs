using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Extensions;
using Platform.ApiService.Extensions;
using Platform.ServiceDefaults.Services;
using System.Linq.Dynamic.Core;
using System.Linq.Expressions;

namespace Platform.ApiService.Services;

public class DocumentCrudService : IDocumentCrudService
{
    private readonly DbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<DocumentCrudService> _logger;

    public DocumentCrudService(DbContext context, ITenantContext tenantContext, ILogger<DocumentCrudService> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<Document> CreateDocumentAsync(CreateDocumentRequest request)
    {
        var sanitizedFormData = request.FormData != null 
            ? SerializationExtensions.SanitizeDictionary(request.FormData) 
            : new Dictionary<string, object>();

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

    public async Task UpdateDocumentAsync(Document document)
    {
        _context.Set<Document>().Update(document);
        await _context.SaveChangesAsync();
    }

    public async Task<Document?> UpdateDocumentAsync(string id, UpdateDocumentRequest request)
    {
        var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == id);
        if (document == null) return null;

        if (document.Status != DocumentStatus.Draft)
            throw new InvalidOperationException("只有草稿状态的公文可以修改");

        var existingDocument = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == id);
        if (existingDocument == null) return null;

        bool hasUpdate = false;

        if (!string.IsNullOrEmpty(request.Title)) { existingDocument.Title = request.Title; hasUpdate = true; }
        if (request.Content != null) { existingDocument.Content = request.Content; hasUpdate = true; }
        if (!string.IsNullOrEmpty(request.DocumentType)) { existingDocument.DocumentType = request.DocumentType; hasUpdate = true; }
        if (request.Category != null) { existingDocument.Category = request.Category; hasUpdate = true; }
        if (request.AttachmentIds != null) { existingDocument.AttachmentIds = request.AttachmentIds; hasUpdate = true; }
        if (request.FormData != null)
        {
            existingDocument.FormData = SerializationExtensions.SanitizeDictionary(request.FormData);
            hasUpdate = true;
        }

        if (hasUpdate) await _context.SaveChangesAsync();
        return hasUpdate ? existingDocument : document;
    }

    public async Task<Document?> GetDocumentAsync(string id)
    {
        return await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == id);
    }

    public async Task<PagedResult<Document>> GetDocumentsAsync(
        PageParams pageParams,
        DocumentStatus? status = null,
        string? documentType = null,
        string? category = null,
        string? createdBy = null,
        string? filterType = null)
    {
        Expression<Func<Document, bool>> filter = d => true;

        if (!string.IsNullOrEmpty(pageParams.Search))
        {
            string keyword = pageParams.Search.ToLower();
            filter = filter.And(d => (d.Title ?? "").ToLower().Contains(keyword) || (d.Content != null && d.Content.ToLower().Contains(keyword)))!;
        }

        if (status.HasValue)
        {
            filter = filter.And(d => d.Status == status.Value)!;
        }

        if (!string.IsNullOrEmpty(documentType))
        {
            filter = filter.And(d => d.DocumentType == documentType)!;
        }

        if (!string.IsNullOrEmpty(category))
        {
            filter = filter.And(d => d.Category == category)!;
        }

        if (!string.IsNullOrEmpty(createdBy))
        {
            filter = filter.And(d => d.CreatedBy == createdBy)!;
        }

        if (!string.IsNullOrEmpty(filterType))
        {
            var userId = _tenantContext.GetCurrentUserId();
            switch (filterType.ToLower())
            {
                case "my":
                    if (!string.IsNullOrEmpty(userId))
                        filter = filter.And(d => d.CreatedBy == userId)!;
                    break;
                case "pending":
                    filter = filter.And(d => d.Status == DocumentStatus.Approving)!;
                    if (!string.IsNullOrEmpty(userId))
                    {
                        var pendingInstances = await _context.Set<WorkflowInstance>().Where(i =>
                            (i.Status == WorkflowStatus.Running || i.Status == WorkflowStatus.Waiting) &&
                            i.CurrentApproverIds.Contains(userId)).ToListAsync();
                        var instanceIds = pendingInstances.Select(i => i.Id!).ToList();
                        if (instanceIds.Any())
                            filter = filter.And(d => d.WorkflowInstanceId != null && instanceIds.Contains(d.WorkflowInstanceId))!;
                        else
                            return _context.Set<Document>().Where(d => false).ToPagedList(pageParams);
                    }
                    break;
                case "approved":
                    filter = filter.And(d => d.Status == DocumentStatus.Approved)!;
                    break;
                case "rejected":
                    filter = filter.And(d => d.Status == DocumentStatus.Rejected)!;
                    break;
            }
        }

        return _context.Set<Document>().Where(filter).ToPagedList(pageParams);
    }

    public async Task<bool> DeleteDocumentAsync(string id)
    {
        var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == id);
        if (document == null) return false;

        if (document.Status != DocumentStatus.Draft)
            throw new InvalidOperationException("只有草稿状态的公文可以删除");

        _context.Set<Document>().Remove(document);
        await _context.SaveChangesAsync();
        return true;
    }
}
