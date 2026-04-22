using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Platform.ApiService.Extensions;
using Microsoft.Extensions.Logging;
using System.Security.Authentication;
using System.Security.Cryptography;

namespace Platform.ApiService.Services;

public class DocumentWorkflowService : IDocumentWorkflowService
{
    private readonly DbContext _context;
    private readonly IWorkflowEngine _workflowEngine;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<DocumentWorkflowService> _logger;

    public DocumentWorkflowService(
        DbContext context,
        IWorkflowEngine workflowEngine,
        ITenantContext tenantContext,
        ILogger<DocumentWorkflowService> logger)
    {
        _context = context;
        _workflowEngine = workflowEngine;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<WorkflowInstance> SubmitDocumentAsync(string documentId, string workflowDefinitionId, Dictionary<string, object>? variables = null)
    {
        var document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == documentId);
        if (document == null)
            throw new InvalidOperationException("公文不存在");

        if (document.Status != DocumentStatus.Draft)
            throw new InvalidOperationException("只有草稿状态的公文可以提交");

        var userId = _tenantContext.GetCurrentUserId() ?? throw new AuthenticationException(ErrorCode.UserNotAuthenticated);

        var allVariables = new Dictionary<string, object?>();

        if (variables != null)
        {
            var sanitizedVars = SerializationExtensions.SanitizeDictionary(variables);
            foreach (var kv in sanitizedVars) allVariables[kv.Key] = kv.Value;
        }

        if (document.FormData != null)
        {
            foreach (var kv in document.FormData) allVariables[kv.Key] = kv.Value;
        }

        var instance = await _workflowEngine.StartWorkflowAsync(workflowDefinitionId, documentId, userId, allVariables);

        var existingDocument = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == documentId);
        if (existingDocument != null)
        {
            existingDocument.WorkflowInstanceId = instance.Id;
            existingDocument.Status = DocumentStatus.Approving;
            await _context.SaveChangesAsync();
        }

        return instance;
    }

    public async Task<Document> CreateDocumentForWorkflowAsync(string workflowDefinitionId, Dictionary<string, object> values, List<string>? attachmentIds = null)
    {
        if (string.IsNullOrWhiteSpace(workflowDefinitionId))
            throw new ArgumentException("流程定义ID不能为空", nameof(workflowDefinitionId));

        var definition = await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(x => x.Id == workflowDefinitionId);
        if (definition == null)
            throw new InvalidOperationException("流程定义不存在");

        var binding = definition.Graph.Nodes.FirstOrDefault(n => n.Data.NodeType == "start")?.Data.Config?.Form;
        if (binding == null || binding.Target != FormTarget.Document)
        {
            var nodeWithDocForm = definition.Graph.Nodes.FirstOrDefault(n => n.Data.Config?.Form?.Target == FormTarget.Document);
            binding = nodeWithDocForm?.Data.Config?.Form;
        }

        if (binding == null || string.IsNullOrEmpty(binding.FormDefinitionId))
            throw new InvalidOperationException("该流程未配置完整用于创建公文的文档表单");

        var form = await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == binding.FormDefinitionId);
        if (form == null)
            throw new InvalidOperationException("表单定义不存在");

        values ??= new Dictionary<string, object>();
        values = SerializationExtensions.SanitizeDictionary(values);

        var missing = new List<string>();
        foreach (var field in form.Fields)
        {
            if (field.Required && (!values.TryGetValue(field.DataKey, out var val) || val == null || (val is string s && string.IsNullOrWhiteSpace(s))))
                missing.Add(field.Label ?? field.DataKey);
        }

        if (missing.Any())
            throw new InvalidOperationException($"必填字段缺失: {string.Join(", ", missing)}");

        Dictionary<string, object> formDataToSave;
        if (!string.IsNullOrWhiteSpace(binding.DataScopeKey))
            formDataToSave = new Dictionary<string, object> { [binding.DataScopeKey!] = values };
        else
            formDataToSave = new Dictionary<string, object>(values);

        var title = values.TryGetValue("title", out var t) && t is string ts && !string.IsNullOrWhiteSpace(ts) ? ts : definition.Name;

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
        return document;
    }

    public async Task<WorkflowDefinition?> GetWorkflowDefinitionAsync(string definitionId)
    {
        return await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(w => w.Id == definitionId);
    }
}
