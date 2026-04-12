using System.Linq.Expressions;
using System.Linq.Dynamic.Core;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;

namespace Platform.ApiService.Services;

/// <summary>
/// 企业服务管理服务实现
/// </summary>
public class ParkEnterpriseServiceService : IParkEnterpriseServiceService
{
    private readonly DbContext _context;

    private readonly ILogger<ParkEnterpriseServiceService> _logger;

    /// <summary>
    /// 初始化企业服务管理服务
    /// </summary>
    public ParkEnterpriseServiceService(DbContext context,
        ILogger<ParkEnterpriseServiceService> logger
    ) {
        _context = context;
        _logger = logger;
    }

    #region 服务类别管理

    /// <summary>
    /// 获取服务类别列表
    /// </summary>
    public async Task<ServiceCategoryListResponse> GetCategoriesAsync()
    {
        
        var items = await _context.Set<ServiceCategory>().OrderBy(c => c.SortOrder).ToListAsync();

        var categories = new List<ServiceCategoryDto>();
        foreach (var item in items)
        {
            categories.Add(await MapToCategoryDtoAsync(item));
        }

        return new ServiceCategoryListResponse { Categories = categories };
    }

    /// <summary>
    /// 创建服务类别
    /// </summary>
    public async Task<ServiceCategoryDto> CreateCategoryAsync(CreateServiceCategoryRequest request)
    {
        var category = new ServiceCategory
        {
            Name = request.Name,
            Description = request.Description,
            Icon = request.Icon,
            SortOrder = request.SortOrder,
            IsActive = true
        };

        await _context.Set<ServiceCategory>().AddAsync(category);
        await _context.SaveChangesAsync();
        return await MapToCategoryDtoAsync(category);
    }

    /// <summary>
    /// 更新服务类别
    /// </summary>
    public async Task<ServiceCategoryDto?> UpdateCategoryAsync(string id, CreateServiceCategoryRequest request)
    {
        var category = await _context.Set<ServiceCategory>().FirstOrDefaultAsync(x => x.Id == id);
        if (category == null) return null;

        category.Name = request.Name;
        category.Description = request.Description;
        category.Icon = request.Icon;
        category.SortOrder = request.SortOrder;

        await _context.SaveChangesAsync();
        return await MapToCategoryDtoAsync(category);
    }

    /// <summary>
    /// 删除服务类别
    /// </summary>
    public async Task<bool> DeleteCategoryAsync(string id)
    {
        // 检查是否有关联的服务申请
        var requests = await _context.Set<ServiceRequest>().Where(r => r.CategoryId == id).ToListAsync();
        if (requests.Any())
            throw new InvalidOperationException("该类别下存在服务申请，无法删除");

        var category = await _context.Set<ServiceCategory>().FirstOrDefaultAsync(x => x.Id == id);
        if (category == null) return false;

        _context.Set<ServiceCategory>().Remove(category);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// 切换服务类别状态
    /// </summary>
    public async Task<bool> ToggleCategoryStatusAsync(string id)
    {
        var category = await _context.Set<ServiceCategory>().FirstOrDefaultAsync(x => x.Id == id);
        if (category == null) return false;

        category.IsActive = !category.IsActive;
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<ServiceCategoryDto> MapToCategoryDtoAsync(ServiceCategory category)
    {
        var requestCount = (int)await _context.Set<ServiceRequest>().LongCountAsync(r => r.CategoryId == category.Id);

        return new ServiceCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            Icon = category.Icon,
            SortOrder = category.SortOrder,
            IsActive = category.IsActive,
            RequestCount = requestCount
        };
    }

    #endregion

    #region 服务申请管理

    /// <summary>
    /// 获取服务申请列表
    /// </summary>
    public async Task<System.Linq.Dynamic.Core.PagedResult<ServiceRequestDto>> GetRequestsAsync(Platform.ServiceDefaults.Models.PageParams request)
    {
        var pagedResult = _context.Set<ServiceRequest>().ToPagedList(request);
        var items = await pagedResult.Queryable.ToListAsync();
        var requestDtos = new List<ServiceRequestDto>();
        foreach (var item in items)
        {
            requestDtos.Add(await MapToRequestDtoAsync(item));
        }

        return new System.Linq.Dynamic.Core.PagedResult<ServiceRequestDto> { Queryable = requestDtos.AsQueryable(), CurrentPage = pagedResult.CurrentPage, PageSize = pagedResult.PageSize, RowCount = pagedResult.RowCount, PageCount = pagedResult.PageCount };
    }

    /// <summary>
    /// 获取服务申请详情
    /// </summary>
    public async Task<ServiceRequestDto?> GetRequestByIdAsync(string id)
    {
        var request = await _context.Set<ServiceRequest>().FirstOrDefaultAsync(x => x.Id == id);
        return request != null ? await MapToRequestDtoAsync(request) : null;
    }

    /// <summary>
    /// 创建服务申请
    /// </summary>
    public async Task<ServiceRequestDto> CreateRequestAsync(CreateServiceRequestRequest request)
    {
        var serviceRequest = new ServiceRequest
        {
            CategoryId = request.CategoryId,
            TenantId = request.TenantId,
            Title = request.Title,
            Description = request.Description,
            ContactPerson = request.ContactPerson,
            ContactPhone = request.ContactPhone,
            Priority = request.Priority ?? "Normal",
            Attachments = request.Attachments,
            Status = "Pending"
        };

        await _context.Set<ServiceRequest>().AddAsync(serviceRequest);
        await _context.SaveChangesAsync();
        return await MapToRequestDtoAsync(serviceRequest);
    }

    /// <summary>
    /// 更新服务申请状态
    /// </summary>
    public async Task<ServiceRequestDto?> UpdateRequestStatusAsync(string id, UpdateServiceRequestStatusRequest request)
    {
        var serviceRequest = await _context.Set<ServiceRequest>().FirstOrDefaultAsync(x => x.Id == id);
        if (serviceRequest == null) return null;

        serviceRequest.Status = request.Status;
        serviceRequest.Resolution = request.Resolution;

        if (!string.IsNullOrEmpty(request.AssignedTo))
        {
            serviceRequest.AssignedTo = request.AssignedTo;
            serviceRequest.AssignedAt = DateTime.UtcNow;
        }

        if (request.Status == "Completed")
        {
            serviceRequest.CompletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return await MapToRequestDtoAsync(serviceRequest);
    }

    /// <summary>
    /// 删除服务申请
    /// </summary>
    public async Task<bool> DeleteRequestAsync(string id)
    {
        var serviceRequest = await _context.Set<ServiceRequest>().FirstOrDefaultAsync(x => x.Id == id);
        if (serviceRequest == null) return false;
        
        _context.Set<ServiceRequest>().Remove(serviceRequest);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// 服务申请评价
    /// </summary>
    public async Task<bool> RateRequestAsync(string id, int rating, string? feedback)
    {
        var request = await _context.Set<ServiceRequest>().FirstOrDefaultAsync(x => x.Id == id);
        if (request == null || request.Status != "Completed") return false;

        request.Rating = rating;
        request.Feedback = feedback;

        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<ServiceRequestDto> MapToRequestDtoAsync(ServiceRequest request)
    {
        var category = await _context.Set<ServiceCategory>().FirstOrDefaultAsync(c => c.Id == request.CategoryId);

        return new ServiceRequestDto
        {
            Id = request.Id,
            CategoryId = request.CategoryId,
            CategoryName = category?.Name,
            TenantId = request.TenantId,
            Title = request.Title,
            Description = request.Description,
            ContactPerson = request.ContactPerson,
            ContactPhone = request.ContactPhone,
            Priority = request.Priority,
            Status = request.Status,
            AssignedTo = request.AssignedTo,
            CompletedAt = request.CompletedAt,
            Rating = request.Rating
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

    /// <summary>
    /// 获取企业服务统计数据
    /// </summary>
    public async Task<ServiceStatisticsResponse> GetStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var categories = await _context.Set<ServiceCategory>().ToListAsync();
        // Get all requests first (or optimize to filter in DB)
        var allRequests = await _context.Set<ServiceRequest>().ToListAsync();

        DateTime start = startDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        DateTime end = endDate ?? DateTime.UtcNow;

        // Filter requests for the statistics period
        var requests = allRequests.Where(r => r.CreatedAt >= start && r.CreatedAt <= end).ToList();

        var completedWithRating = requests.Where(r => r.Rating.HasValue).ToList();
        var avgRating = completedWithRating.Any()
            ? Math.Round(completedWithRating.Average(r => r.Rating!.Value), 2)
            : 0;

        // Helper to calculate metrics in a specific period
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

        // MoM Comparison
        var momStart = start.AddMonths(-1);
        var momEnd = end.AddMonths(-1);
        var (momTotalRequests, momAvgRating) = CalculateMetrics(momStart, momEnd);

        // YoY Comparison
        var yoyStart = start.AddYears(-1);
        var yoyEnd = end.AddYears(-1);
        var (yoyTotalRequests, yoyAvgRating) = CalculateMetrics(yoyStart, yoyEnd);

        double? CalculateGrowth(decimal current, decimal previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0;
            return (double)Math.Round((current - previous) / previous * 100, 2);
        }

        // Calculate Satisfaction Rate: (Sum of Ratings / (Rated Requests * 5)) * 100
        // Or simply (Average Rating / 5) * 100
        var satisfactionRate = avgRating > 0 ? (decimal)Math.Round(avgRating / 5.0 * 100, 2) : 0;

        // Calculate Approx Handling Time (Average duration from Create to Complete)
        var completedRequests = requests.Where(r => r.Status == "Completed" && r.CompletedAt.HasValue).ToList();
        var avgHandlingTime = completedRequests.Any()
            ? completedRequests.Average(r => (r.CompletedAt!.Value - r.CreatedAt!.Value).TotalHours)
            : 0;
        // Use Mock if 0 to show something? Or 0.
        // Let's keep 0 if no data.

        return new ServiceStatisticsResponse
        {
            TotalCategories = categories.Count,
            ActiveCategories = categories.Count(c => c.IsActive),
            TotalRequests = requests.Count,
            PendingRequests = requests.Count(r => r.Status == "Pending"),
            ProcessingRequests = requests.Count(r => r.Status == "Processing"),
            CompletedRequests = requests.Count(r => r.Status == "Completed"),
            TodayNewRequests = allRequests.Count(r => r.CreatedAt >= DateTime.UtcNow.Date),
            ApproxHandlingTime = (decimal)Math.Round(avgHandlingTime, 1),
            SatisfactionRate = satisfactionRate,
            AverageRating = currentAvgRating,
            RequestsByCategory = requests
                .GroupBy(r => r.CategoryId)
                .ToDictionary(
                    g => categories.FirstOrDefault(c => c.Id == g.Key)?.Name ?? g.Key,
                    g => g.Count()),
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