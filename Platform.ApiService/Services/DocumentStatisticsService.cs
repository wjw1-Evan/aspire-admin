using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services;

public class DocumentStatisticsService : IDocumentStatisticsService
{
    private readonly DbContext _context;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<DocumentStatisticsService> _logger;

    public DocumentStatisticsService(DbContext context, ITenantContext tenantContext, ILogger<DocumentStatisticsService> logger)
    {
        _context = context;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<DocumentStatisticsResponse> GetStatisticsAsync()
    {
        var userId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");

        var totalDocuments = await _context.Set<Document>().LongCountAsync(d => true);
        var draftCount = await _context.Set<Document>().LongCountAsync(d => d.Status == DocumentStatus.Draft);
        var approvedCount = await _context.Set<Document>().LongCountAsync(d => d.Status == DocumentStatus.Approved);
        var rejectedCount = await _context.Set<Document>().LongCountAsync(d => d.Status == DocumentStatus.Rejected);
        var approvingCount = await _context.Set<Document>().LongCountAsync(d => d.Status == DocumentStatus.Approving);
        var myCreatedCount = await _context.Set<Document>().LongCountAsync(d => d.CreatedBy == userId);

        long pendingCount = 0;
        try
        {
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
