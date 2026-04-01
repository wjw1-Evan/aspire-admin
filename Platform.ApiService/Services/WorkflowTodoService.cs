using System.Linq.Dynamic.Core;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text.Json;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class WorkflowTodoService : IWorkflowTodoService
{
    private readonly DbContext _context;
    private readonly IWorkflowDefinitionQueryService _workflowQueryService;
    private readonly IFormDefinitionService _formDefinitionService;

    public WorkflowTodoService(
        DbContext context,
        IWorkflowDefinitionQueryService workflowQueryService,
        IFormDefinitionService formDefinitionService)
    {
        _context = context;
        _workflowQueryService = workflowQueryService;
        _formDefinitionService = formDefinitionService;
    }

    public async Task<(List<object> Items, long Total)> GetTodoInstancesAsync(string userId, int current, int pageSize)
    {
        Expression<Func<WorkflowInstance, bool>> filter = i => i.Status == WorkflowStatus.Running &&
            i.CurrentApproverIds.Contains(userId);

        var queryable = _context.Set<WorkflowInstance>().Where(filter);
        var pagedResult = queryable.OrderByDescending(i => i.CreatedAt)
            .PageResult(current, pageSize);
        var items = await pagedResult.Queryable.ToListAsync();
        var totalCount = pagedResult.RowCount;

        var todos = new List<object>();

        foreach (var instance in items)
        {
            var definition = instance.WorkflowDefinitionSnapshot ?? 
                await _workflowQueryService.GetWorkflowByIdAsync(instance.WorkflowDefinitionId);
            if (definition == null) continue;

            if (instance.ActiveApprovals == null || instance.ActiveApprovals.Count == 0) continue;

            Document? document = null;
            if (!string.IsNullOrEmpty(instance.DocumentId))
            {
                document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == instance.DocumentId);
            }

            foreach (var activeApproval in instance.ActiveApprovals)
            {
                var nodeId = activeApproval.NodeId;
                var approvers = activeApproval.ApproverIds;

                if (!approvers.Contains(userId)) continue;

                var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
                if (currentNode == null || currentNode.Type != "approval" || currentNode.Data.Config?.Approval == null)
                {
                    continue;
                }

                todos.Add(new
                {
                    instance.Id,
                    instance.WorkflowDefinitionId,
                    instance.DocumentId,
                    instance.Status,
                    CurrentNodeId = nodeId,
                    instance.StartedBy,
                    instance.StartedAt,
                    instance.TimeoutAt,
                    DefinitionName = definition.Name,
                    DefinitionCategory = definition.Category,
                    CurrentNode = new { currentNode.Id, currentNode.Data.Label, currentNode.Data.NodeType },
                    Document = document == null ? null : new
                    {
                        document.Id,
                        document.Title,
                        document.Status,
                        document.DocumentType,
                        document.Category,
                        document.CreatedAt,
                        document.CreatedBy
                    }
                });
            }
        }

        return (todos, totalCount);
    }

    public async Task<object?> GetNodeFormAsync(string instanceId, string nodeId)
    {
        var instance = await _context.Set<WorkflowInstance>().IgnoreQueryFilters()
            .FirstOrDefaultAsync(i => i.Id == instanceId);
        if (instance == null) return null;

        WorkflowDefinition? definition = instance.WorkflowDefinitionSnapshot;
        if (definition == null)
        {
            definition = await _workflowQueryService.GetWorkflowByIdAsync(instance.WorkflowDefinitionId);
            if (definition == null) return null;
        }

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null) return null;

        var binding = node.Data.Config?.Form;
        if (binding == null || string.IsNullOrEmpty(binding.FormDefinitionId))
        {
            return new { form = (FormDefinition?)null, initialValues = (object?)null };
        }

        FormDefinition? form = null;
        var snapshot = instance.FormDefinitionSnapshots?.FirstOrDefault(s => s.NodeId == nodeId);
        if (!string.IsNullOrEmpty(snapshot?.FormDefinitionJson))
        {
            form = JsonSerializer.Deserialize<FormDefinition>(snapshot.FormDefinitionJson);
        }

        if (form == null)
        {
            form = await _formDefinitionService.GetFormByIdAsync(binding.FormDefinitionId);
            if (form == null) return null;
        }

        object? initialValues = null;
        if (binding.Target == FormTarget.Document)
        {
            Document? document = null;
            if (!string.IsNullOrEmpty(instance.DocumentId))
            {
                document = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == instance.DocumentId);
            }
            if (document != null)
            {
                var sourceFormData = document.FormData ?? new Dictionary<string, object>();
                var mergedData = new Dictionary<string, object>(sourceFormData);
                if (!mergedData.ContainsKey("title"))
                {
                    mergedData["title"] = document.Title;
                }
                initialValues = mergedData;
            }
        }

        return new { form, initialValues, dataScopeKey = binding.DataScopeKey };
    }
}
