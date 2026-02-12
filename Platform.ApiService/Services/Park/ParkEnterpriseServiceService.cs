using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 企业服务管理服务实现
/// </summary>
public class ParkEnterpriseServiceService : IParkEnterpriseServiceService
{
    private readonly IDataFactory<ServiceCategory> _categoryFactory;
    private readonly IDataFactory<ServiceRequest> _requestFactory;
    private readonly ILogger<ParkEnterpriseServiceService> _logger;

    /// <summary>
    /// 初始化企业服务管理服务
    /// </summary>
    public ParkEnterpriseServiceService(
        IDataFactory<ServiceCategory> categoryFactory,
        IDataFactory<ServiceRequest> requestFactory,
        ILogger<ParkEnterpriseServiceService> logger)
    {
        _categoryFactory = categoryFactory;
        _requestFactory = requestFactory;
        _logger = logger;
    }

    #region 服务类别管理

    /// <summary>
    /// 获取服务类别列表
    /// </summary>
    public async Task<ServiceCategoryListResponse> GetCategoriesAsync()
    {
        Func<IQueryable<ServiceCategory>, IOrderedQueryable<ServiceCategory>> orderBy = q => q.OrderBy(c => c.SortOrder);

        var items = await _categoryFactory.FindAsync(null, orderBy);

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

        await _categoryFactory.CreateAsync(category);
        return await MapToCategoryDtoAsync(category);
    }

    /// <summary>
    /// 更新服务类别
    /// </summary>
    public async Task<ServiceCategoryDto?> UpdateCategoryAsync(string id, CreateServiceCategoryRequest request)
    {
        var category = await _categoryFactory.GetByIdAsync(id);
        if (category == null) return null;

        category.Name = request.Name;
        category.Description = request.Description;
        category.Icon = request.Icon;
        category.SortOrder = request.SortOrder;

        await _categoryFactory.UpdateAsync(id, category => { });
        return await MapToCategoryDtoAsync(category);
    }

    /// <summary>
    /// 删除服务类别
    /// </summary>
    public async Task<bool> DeleteCategoryAsync(string id)
    {
        // 检查是否有关联的服务申请
        var requests = await _requestFactory.FindAsync(r => r.CategoryId == id);
        if (requests.Any())
            throw new InvalidOperationException("该类别下存在服务申请，无法删除");

        var result = await _categoryFactory.SoftDeleteAsync(id);
        return result;
    }

    /// <summary>
    /// 切换服务类别状态
    /// </summary>
    public async Task<bool> ToggleCategoryStatusAsync(string id)
    {
        var category = await _categoryFactory.GetByIdAsync(id);
        if (category == null) return false;

        category.IsActive = !category.IsActive;
        var result = await _categoryFactory.UpdateAsync(id, category => { });
        return result != null;
    }

    private async Task<ServiceCategoryDto> MapToCategoryDtoAsync(ServiceCategory category)
    {
        var requestCount = (int)await _requestFactory.CountAsync(r => r.CategoryId == category.Id);

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
    public async Task<ServiceRequestListResponse> GetRequestsAsync(ServiceRequestListRequest request)
    {
        Expression<Func<ServiceRequest, bool>> filter = r => true;

        if (!string.IsNullOrEmpty(request.CategoryId))
            filter = CombineFilters(filter, r => r.CategoryId == request.CategoryId);

        if (!string.IsNullOrEmpty(request.TenantId))
            filter = CombineFilters(filter, r => r.TenantId == request.TenantId);

        if (!string.IsNullOrEmpty(request.Search))
            filter = CombineFilters(filter, r => r.Title.Contains(request.Search));

        if (!string.IsNullOrEmpty(request.Status))
            filter = CombineFilters(filter, r => r.Status == request.Status);

        if (!string.IsNullOrEmpty(request.Priority))
            filter = CombineFilters(filter, r => r.Priority == request.Priority);

        if (!string.IsNullOrEmpty(request.AssignedTo))
            filter = CombineFilters(filter, r => r.AssignedTo == request.AssignedTo);

        Func<IQueryable<ServiceRequest>, IOrderedQueryable<ServiceRequest>>? orderBy = null;
        if (request.SortOrder?.ToLower() == "asc")
        {
            orderBy = q => q.OrderBy(r => r.CreatedAt);
        }
        else
        {
            orderBy = q => q.OrderByDescending(r => r.CreatedAt);
        }

        var (items, total) = await _requestFactory.FindPagedAsync(filter, orderBy, request.Page, request.PageSize);

        var requestDtos = new List<ServiceRequestDto>();
        foreach (var item in items)
        {
            requestDtos.Add(await MapToRequestDtoAsync(item));
        }

        return new ServiceRequestListResponse { Requests = requestDtos, Total = (int)total };
    }

    /// <summary>
    /// 获取服务申请详情
    /// </summary>
    public async Task<ServiceRequestDto?> GetRequestByIdAsync(string id)
    {
        var request = await _requestFactory.GetByIdAsync(id);
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

        await _requestFactory.CreateAsync(serviceRequest);
        return await MapToRequestDtoAsync(serviceRequest);
    }

    /// <summary>
    /// 更新服务申请状态
    /// </summary>
    public async Task<ServiceRequestDto?> UpdateRequestStatusAsync(string id, UpdateServiceRequestStatusRequest request)
    {
        var serviceRequest = await _requestFactory.GetByIdAsync(id);
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

        await _requestFactory.UpdateAsync(id, _ => { });
        return await MapToRequestDtoAsync(serviceRequest);
    }

    /// <summary>
    /// 删除服务申请
    /// </summary>
    public async Task<bool> DeleteRequestAsync(string id)
    {
        var result = await _requestFactory.SoftDeleteAsync(id);
        return result;
    }

    /// <summary>
    /// 服务申请评价
    /// </summary>
    public async Task<bool> RateRequestAsync(string id, int rating, string? feedback)
    {
        var request = await _requestFactory.GetByIdAsync(id);
        if (request == null || request.Status != "Completed") return false;

        request.Rating = rating;
        request.Feedback = feedback;

        var updated = await _requestFactory.UpdateAsync(id, _ => { });
        return updated != null;
    }

    private async Task<ServiceRequestDto> MapToRequestDtoAsync(ServiceRequest request)
    {
        var category = await _categoryFactory.GetByIdAsync(request.CategoryId);

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
            Rating = request.Rating,
            CreatedAt = request.CreatedAt
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
    public async Task<ServiceStatisticsResponse> GetStatisticsAsync(StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null)
    {
        var categories = await _categoryFactory.FindAsync();
        // Get all requests first (or optimize to filter in DB)
        var allRequests = await _requestFactory.FindAsync();

        DateTime start;
        DateTime end = endDate ?? DateTime.UtcNow;

        if (period == StatisticsPeriod.Custom && startDate.HasValue)
        {
            start = startDate.Value;
        }
        else
        {
            start = period switch
            {
                StatisticsPeriod.Day => DateTime.UtcNow.Date,
                StatisticsPeriod.Week => DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek),
                StatisticsPeriod.Month => new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1),
                StatisticsPeriod.Year => new DateTime(DateTime.UtcNow.Year, 1, 1),
                _ => new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1) // Default to Month
            };
        }

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
            ? completedRequests.Average(r => (r.CompletedAt!.Value - r.CreatedAt).TotalHours)
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
