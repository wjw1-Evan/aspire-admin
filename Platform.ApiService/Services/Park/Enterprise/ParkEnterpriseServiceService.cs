using System.Linq.Expressions;
using System.Linq.Dynamic.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.AI;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;

namespace Platform.ApiService.Services;

public class ParkEnterpriseServiceService : IParkEnterpriseServiceService
{
    private readonly DbContext _context;
    private readonly IChatClient _openAiClient;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<ParkEnterpriseServiceService> _logger;

    public ParkEnterpriseServiceService(DbContext context,
        IChatClient openAiClient,
        ITenantContext tenantContext,
        ILogger<ParkEnterpriseServiceService> logger
    ) {
        _context = context;
        _openAiClient = openAiClient;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    #region AI 智能分类

    public async Task<SuggestCategoryResponse> SuggestCategoryAsync(string description)
    {
        var prompt = $"根据以下服务需求描述，用2-6个字概括一个服务类别名称。只返回类别名称，不要任何其他内容。\n\n需求描述：{description}";

        try
        {
            var messages = new List<Microsoft.Extensions.AI.ChatMessage>
            {
                new(ChatRole.System, "你是一个园区企业服务的智能分类助手。根据用户描述的服务需求，生成一个简短的服务类别名称（2-6个字）。仅返回类别名称，不要任何解释。"),
                new(ChatRole.User, prompt)
            };

            var completion = await _openAiClient.GetResponseAsync(messages);
            var result = completion.Text?.Trim().Trim('"', '\'', '「', '」').Trim();

            if (!string.IsNullOrEmpty(result))
                return new SuggestCategoryResponse { CategoryName = result };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI 分类建议失败");
        }

        return new SuggestCategoryResponse { CategoryName = "其他" };
    }

    private async Task<string> SuggestPriorityAsync(string description)
    {
        var prompt = $"根据以下服务需求描述，判断优先级（Urgent=紧急，High=高，Normal=普通，Low=低）。只返回优先级英文单词，不要任何其他内容。\n\n需求描述：{description}";

        try
        {
            var messages = new List<Microsoft.Extensions.AI.ChatMessage>
            {
                new(ChatRole.System, "你是一个园区企业服务的智能优先级评估助手。根据用户描述的服务需求紧急程度，从 Urgent、High、Normal、Low 中选择一个。仅返回英文单词，不要任何解释。"),
                new(ChatRole.User, prompt)
            };

            var completion = await _openAiClient.GetResponseAsync(messages);
            var result = completion.Text?.Trim().Trim('"', '\'', '「', '」').Trim();

            if (!string.IsNullOrEmpty(result) && new[] { "Urgent", "High", "Normal", "Low" }.Contains(result, StringComparer.OrdinalIgnoreCase))
                return result;

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI 优先级评估失败");
        }

        return "Normal";
    }

    #endregion

    #region 服务申请管理

    public async Task<System.Linq.Dynamic.Core.PagedResult<ServiceRequestDto>> GetRequestsAsync(ProTableRequest request)
    {
        var pagedResult = _context.Set<ServiceRequest>().ToPagedList(request);
        var items = await pagedResult.Queryable.ToListAsync();
        var requestDtos = items.Select(MapToRequestDto).ToList();

        return new System.Linq.Dynamic.Core.PagedResult<ServiceRequestDto> { Queryable = requestDtos.AsQueryable(), CurrentPage = pagedResult.CurrentPage, PageSize = pagedResult.PageSize, RowCount = pagedResult.RowCount, PageCount = pagedResult.PageCount };
    }

    public async Task<ServiceRequestDto?> GetRequestByIdAsync(string id)
    {
        var request = await _context.Set<ServiceRequest>().FirstOrDefaultAsync(x => x.Id == id);
        return request != null ? MapToRequestDto(request) : null;
    }

    public async Task<ServiceRequestDto> CreateRequestAsync(CreateServiceRequestRequest request)
    {
        var categoryName = string.Empty;
        var priority = request.Priority;
        if (!string.IsNullOrEmpty(request.Description))
        {
            var categoryTask = SuggestCategoryAsync(request.Description);
            var priorityTask = string.IsNullOrEmpty(priority) ? SuggestPriorityAsync(request.Description) : Task.FromResult(priority);
            await Task.WhenAll(categoryTask, priorityTask);
            categoryName = categoryTask.Result.CategoryName;
            priority = priorityTask.Result;
        }

        var title = request.Title;
        if (string.IsNullOrEmpty(title) && !string.IsNullOrEmpty(request.Description))
            title = request.Description.Length > 100 ? request.Description[..100] + "..." : request.Description;

        var currentUserId = _tenantContext.GetCurrentUserId();
        var currentUser = currentUserId != null
            ? await _context.Set<AppUser>().FirstOrDefaultAsync(u => u.Id == currentUserId)
            : null;
        var currentUserName = currentUser?.Name ?? currentUserId;

        var serviceRequest = new ServiceRequest
        {
            CategoryName = categoryName,
            TenantId = request.TenantId,
            Title = title ?? string.Empty,
            Description = request.Description,
            ContactPerson = request.ContactPerson,
            ContactPhone = request.ContactPhone,
            Priority = priority ?? "Normal",
            Attachments = request.Attachments,
            Status = "Pending",
            StatusHistory =
            [
                new StatusChangeRecord
                {
                    FromStatus = "",
                    ToStatus = "Pending",
                    ChangedBy = currentUserId,
                    ChangedByName = currentUserName,
                    ChangedAt = DateTime.UtcNow
                }
            ]
        };

        await _context.Set<ServiceRequest>().AddAsync(serviceRequest);
        await _context.SaveChangesAsync();
        return MapToRequestDto(serviceRequest);
    }

    public async Task<ServiceRequestDto?> UpdateRequestAsync(string id, CreateServiceRequestRequest request)
    {
        var serviceRequest = await _context.Set<ServiceRequest>().FirstOrDefaultAsync(x => x.Id == id);
        if (serviceRequest == null) return null;

        if (!string.IsNullOrEmpty(request.Description))
        {
            var suggestion = await SuggestCategoryAsync(request.Description);
            serviceRequest.CategoryName = suggestion.CategoryName;
        }

        var title = request.Title;
        if (string.IsNullOrEmpty(title) && !string.IsNullOrEmpty(request.Description))
            title = request.Description.Length > 100 ? request.Description[..100] + "..." : request.Description;
        if (!string.IsNullOrEmpty(title))
            serviceRequest.Title = title;
        serviceRequest.Description = request.Description;
        serviceRequest.ContactPerson = request.ContactPerson;
        serviceRequest.ContactPhone = request.ContactPhone;
        serviceRequest.Priority = request.Priority ?? serviceRequest.Priority;
        if (!string.IsNullOrEmpty(request.TenantId))
            serviceRequest.TenantId = request.TenantId;
        if (request.Attachments != null)
            serviceRequest.Attachments = request.Attachments;

        await _context.SaveChangesAsync();
        return MapToRequestDto(serviceRequest);
    }

    public async Task<ServiceRequestDto?> UpdateRequestStatusAsync(string id, UpdateServiceRequestStatusRequest request)
    {
        var serviceRequest = await _context.Set<ServiceRequest>().FirstOrDefaultAsync(x => x.Id == id);
        if (serviceRequest == null) return null;

        var oldStatus = serviceRequest.Status;

        serviceRequest.Status = request.Status;
        serviceRequest.Resolution = request.Resolution;

        if (!string.IsNullOrEmpty(request.AssignedTo))
        {
            serviceRequest.AssignedTo = request.AssignedTo;
            serviceRequest.AssignedAt = DateTime.UtcNow;
        }

        if (request.Status == "Completed")
            serviceRequest.CompletedAt = DateTime.UtcNow;

        var currentUserId = _tenantContext.GetCurrentUserId();
        var currentUser = currentUserId != null
            ? await _context.Set<AppUser>().FirstOrDefaultAsync(u => u.Id == currentUserId)
            : null;
        var currentUserName = currentUser?.Name ?? currentUserId;

        serviceRequest.StatusHistory ??= [];
        serviceRequest.StatusHistory.Add(new StatusChangeRecord
        {
            FromStatus = oldStatus,
            ToStatus = request.Status,
            ChangedBy = currentUserId,
            ChangedByName = request.AssignedTo ?? currentUserName,
            HandledBy = request.AssignedTo,
            Comment = request.Resolution,
            ChangedAt = DateTime.UtcNow
        });
        _context.Entry(serviceRequest).State = EntityState.Modified;

        await _context.SaveChangesAsync();
        return MapToRequestDto(serviceRequest);
    }

    public async Task<bool> DeleteRequestAsync(string id)
    {
        var serviceRequest = await _context.Set<ServiceRequest>().FirstOrDefaultAsync(x => x.Id == id);
        if (serviceRequest == null) return false;

        _context.Set<ServiceRequest>().Remove(serviceRequest);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteStatusHistoryAsync(string id, int index)
    {
        var serviceRequest = await _context.Set<ServiceRequest>().FirstOrDefaultAsync(x => x.Id == id);
        if (serviceRequest?.StatusHistory == null || index < 0 || index >= serviceRequest.StatusHistory.Count)
            return false;

        serviceRequest.StatusHistory.RemoveAt(index);
        _context.Entry(serviceRequest).State = EntityState.Modified;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RateRequestAsync(string id, int rating, string? feedback)
    {
        var request = await _context.Set<ServiceRequest>().FirstOrDefaultAsync(x => x.Id == id);
        if (request == null || request.Status != "Completed") return false;

        request.Rating = rating;
        request.Feedback = feedback;

        await _context.SaveChangesAsync();
        return true;
    }

    private static ServiceRequestDto MapToRequestDto(ServiceRequest request)
    {
        return new ServiceRequestDto
        {
            Id = request.Id,
            CategoryName = request.CategoryName,
            TenantId = request.TenantId,
            Title = request.Title,
            Description = request.Description,
            ContactPerson = request.ContactPerson,
            ContactPhone = request.ContactPhone,
            Priority = request.Priority,
            Status = request.Status,
            AssignedTo = request.AssignedTo,
            CompletedAt = request.CompletedAt,
            Rating = request.Rating,
            CreatedAt = request.CreatedAt,
            Attachments = request.Attachments,
            StatusHistory = request.StatusHistory?.Select(h => new StatusChangeRecordDto
            {
                FromStatus = h.FromStatus,
                ToStatus = h.ToStatus,
                ChangedBy = h.ChangedBy,
                ChangedByName = h.ChangedByName,
                HandledBy = h.HandledBy,
                Comment = h.Comment,
                ChangedAt = h.ChangedAt
            }).ToList()
        };
    }

    #endregion

    #region 统计

    private static Expression<Func<T, bool>> CombineFilters<T>(Expression<Func<T, bool>> first, Expression<Func<T, bool>> second)
    {
        var parameter = Expression.Parameter(typeof(T));
        var combined = Expression.AndAlso(
            Expression.Invoke(first, parameter),
            Expression.Invoke(second, parameter)
        );
        return Expression.Lambda<Func<T, bool>>(combined, parameter);
    }

    public async Task<ServiceStatisticsResponse> GetStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var allRequests = await _context.Set<ServiceRequest>().ToListAsync();

        DateTime start = startDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        DateTime end = endDate ?? DateTime.UtcNow;

        var requests = allRequests.Where(r => r.CreatedAt >= start && r.CreatedAt <= end).ToList();

        var completedWithRating = requests.Where(r => r.Rating.HasValue).ToList();
        var avgRating = completedWithRating.Any()
            ? Math.Round(completedWithRating.Average(r => r.Rating!.Value), 2)
            : 0;

        (int TotalRequests, decimal AvgRating) CalculateMetrics(DateTime pStart, DateTime pEnd)
        {
            var pRequests = allRequests.Where(r => r.CreatedAt >= pStart && r.CreatedAt <= pEnd).ToList();
            var pCompletedWithRating = pRequests.Where(r => r.Rating.HasValue).ToList();
            var pAvgRating = pCompletedWithRating.Any()
                ? Math.Round(pCompletedWithRating.Average(r => r.Rating!.Value), 2)
                : 0;
            return (pRequests.Count, (decimal)pAvgRating);
        }

        var (currentTotalRequests, currentAvgRating) = (requests.Count, (decimal)avgRating);

        var momStart = start.AddMonths(-1);
        var momEnd = end.AddMonths(-1);
        var (momTotalRequests, momAvgRating) = CalculateMetrics(momStart, momEnd);

        var yoyStart = start.AddYears(-1);
        var yoyEnd = end.AddYears(-1);
        var (yoyTotalRequests, yoyAvgRating) = CalculateMetrics(yoyStart, yoyEnd);

        double? CalculateGrowth(decimal current, decimal previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0;
            return (double)Math.Round((current - previous) / previous * 100, 2);
        }

        var satisfactionRate = avgRating > 0 ? (decimal)Math.Round(avgRating / 5.0 * 100, 2) : 0;

        var completedRequests = requests.Where(r => r.Status == "Completed" && r.CompletedAt.HasValue).ToList();
        var avgHandlingTime = completedRequests.Any()
            ? completedRequests.Average(r => (r.CompletedAt!.Value - r.CreatedAt!.Value).TotalHours)
            : 0;

        var categoryNames = allRequests.Select(r => r.CategoryName).Where(n => n != null).Distinct().ToList();
        var categoryKeys = categoryNames.Concat(requests.Select(r => r.CategoryName ?? "未分类")).Distinct().ToList();

        return new ServiceStatisticsResponse
        {
            TotalCategories = categoryNames.Count,
            ActiveCategories = categoryNames.Count,
            TotalRequests = requests.Count,
            PendingRequests = requests.Count(r => r.Status == "Pending"),
            ProcessingRequests = requests.Count(r => r.Status == "Processing"),
            CompletedRequests = requests.Count(r => r.Status == "Completed"),
            TodayNewRequests = allRequests.Count(r => r.CreatedAt >= DateTime.UtcNow.Date),
            ApproxHandlingTime = (decimal)Math.Round(avgHandlingTime, 1),
            SatisfactionRate = satisfactionRate,
            AverageRating = currentAvgRating,
            RequestsByCategory = requests
                .GroupBy(r => r.CategoryName ?? "未分类")
                .ToDictionary(g => g.Key, g => g.Count()),
            RequestsByStatus = requests
                .GroupBy(r => r.Status)
                .ToDictionary(g => g.Key, g => g.Count()),
            TotalRequestsYoY = CalculateGrowth(currentTotalRequests, yoyTotalRequests),
            TotalRequestsMoM = CalculateGrowth(currentTotalRequests, momTotalRequests),
            AverageRatingYoY = CalculateGrowth(currentAvgRating, yoyAvgRating),
            AverageRatingMoM = CalculateGrowth(currentAvgRating, momAvgRating)
        };
    }

    #endregion
}
