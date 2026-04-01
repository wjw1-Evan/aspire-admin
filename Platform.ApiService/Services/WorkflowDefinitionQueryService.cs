using System.Linq.Dynamic.Core;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

public class WorkflowDefinitionQueryService : IWorkflowDefinitionQueryService
{
    private readonly DbContext _context;

    public WorkflowDefinitionQueryService(DbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<WorkflowDefinition>> GetWorkflowsAsync(WorkflowSearchRequest request)
    {
        Expression<Func<WorkflowDefinition, bool>>? filter = null;

        if (!string.IsNullOrEmpty(request.Keyword))
        {
            filter = w => w.Name != null && (w.Name.Contains(request.Keyword) ||
                              (w.Description != null && w.Description.Contains(request.Keyword)) ||
                              w.Category.Contains(request.Keyword));
        }

        if (!string.IsNullOrEmpty(request.Category))
        {
            var category = request.Category;
            Expression<Func<WorkflowDefinition, bool>> categoryFilter = w => w.Category == category;
            filter = filter == null ? categoryFilter : filter.And(categoryFilter);
        }
        else if (request.Categories != null && request.Categories.Any())
        {
            var categories = request.Categories;
            Expression<Func<WorkflowDefinition, bool>> categoryFilter = w => categories.Contains(w.Category);
            filter = filter == null ? categoryFilter : filter.And(categoryFilter);
        }

        if (request.IsActive.HasValue)
        {
            var isActive = request.IsActive.Value;
            Expression<Func<WorkflowDefinition, bool>> statusFilter = w => w.IsActive == isActive;
            filter = filter == null ? statusFilter : filter.And(statusFilter);
        }
        else if (request.Statuses != null && request.Statuses.Any())
        {
            var statusValues = request.Statuses.Select(s => s == "active").ToList();
            Expression<Func<WorkflowDefinition, bool>> statusFilter = w => statusValues.Contains(w.IsActive);
            filter = filter == null ? statusFilter : filter.And(statusFilter);
        }

        if (request.DateRange != null)
        {
            Expression<Func<WorkflowDefinition, bool>> dateFilter = w => true;
            switch (request.DateRange.Field?.ToLowerInvariant())
            {
                case "createdat":
                case "created":
                    if (request.DateRange.Start.HasValue)
                        dateFilter = w => w.CreatedAt >= request.DateRange.Start.Value;
                    if (request.DateRange.End.HasValue)
                        dateFilter = w => w.CreatedAt <= request.DateRange.End.Value;
                    break;
                case "updatedat":
                case "updated":
                    if (request.DateRange.Start.HasValue)
                        dateFilter = w => w.UpdatedAt >= request.DateRange.Start.Value;
                    if (request.DateRange.End.HasValue)
                        dateFilter = w => w.UpdatedAt <= request.DateRange.End.Value;
                    break;
            }
            filter = filter == null ? dateFilter : filter.And(dateFilter);
        }

        if (request.UsageRange != null)
        {
            if (request.UsageRange.Min.HasValue || request.UsageRange.Max.HasValue)
            {
                Expression<Func<WorkflowDefinition, bool>> usageFilter = w => true;
                filter = filter == null ? usageFilter : filter.And(usageFilter);
            }
        }

        if (request.CreatedBy != null && request.CreatedBy.Any())
        {
            var createdBy = request.CreatedBy;
            Expression<Func<WorkflowDefinition, bool>> createdByFilter = w => createdBy.Contains(w.CreatedBy);
            filter = filter == null ? createdByFilter : filter.And(createdByFilter);
        }

        var queryable = filter == null ? _context.Set<WorkflowDefinition>() : _context.Set<WorkflowDefinition>().Where(filter);

        Func<IQueryable<WorkflowDefinition>, IOrderedQueryable<WorkflowDefinition>> sort = q =>
        {
            if (!string.IsNullOrEmpty(request.SortBy))
            {
                var sortField = request.SortBy.ToLowerInvariant();
                var ascending = request.SortOrder?.ToLowerInvariant() == "asc";
                return ascending
                    ? q.OrderBy(w => w.CreatedAt)
                    : q.OrderByDescending(w => w.CreatedAt);
            }
            return q.OrderByDescending(w => w.CreatedAt);
        };

        return sort(queryable).PageResult(request.Page, request.PageSize);
    }

    public async Task<WorkflowDefinition?> GetWorkflowByIdAsync(string id)
    {
        return await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(w => w.Id == id);
    }
}
