using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 园区资产管理服务实现
/// </summary>
public class ParkAssetService : IParkAssetService
{
    private readonly ILogger<ParkAssetService> _logger;
    private readonly IDataFactory<Building> _buildingFactory;
    private readonly IDataFactory<PropertyUnit> _unitFactory;
    private readonly IDataFactory<LeaseContract> _contractFactory;
    private readonly IDataFactory<ParkTenant> _tenantFactory;

    /// <summary>
    /// 初始化资产管理服务
    /// </summary>
    public ParkAssetService(
        ILogger<ParkAssetService> logger,
        IDataFactory<Building> buildingFactory,
        IDataFactory<PropertyUnit> unitFactory,
        IDataFactory<LeaseContract> contractFactory,
        IDataFactory<ParkTenant> tenantFactory)
    {
        _logger = logger;
        _buildingFactory = buildingFactory;
        _unitFactory = unitFactory;
        _contractFactory = contractFactory;
        _tenantFactory = tenantFactory;
    }


    #region 楼宇管理

    /// <summary>
    /// 获取楼宇列表
    /// </summary>
    public async Task<BuildingListResponse> GetBuildingsAsync(BuildingListRequest request)
    {
        Expression<Func<Building, bool>> filter = b => true;

        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            filter = CombineFilters(filter, b => b.Name.ToLower().Contains(search));
        }

        if (!string.IsNullOrEmpty(request.Status))
        {
            filter = CombineFilters(filter, b => b.Status == request.Status);
        }

        if (!string.IsNullOrEmpty(request.BuildingType))
        {
            filter = CombineFilters(filter, b => b.BuildingType == request.BuildingType);
        }

        Func<IQueryable<Building>, IOrderedQueryable<Building>>? orderBy = null;
        if (request.SortOrder?.ToLower() == "asc")
        {
            orderBy = q => q.OrderBy(b => b.CreatedAt);
        }
        else
        {
            orderBy = q => q.OrderByDescending(b => b.CreatedAt);
        }

        var (items, total) = await _buildingFactory.FindPagedAsync(filter, orderBy, request.Page, request.PageSize);

        // 我们需要手动填充 DTO，因为 DTO 包含一些计算字段（房源数量等）
        var buildings = new List<BuildingDto>();
        foreach (var building in items)
        {
            buildings.Add(await MapToBuildingDtoAsync(building));
        }

        return new BuildingListResponse
        {
            Buildings = buildings,
            Total = (int)total
        };
    }

    /// <summary>
    /// 获取楼宇详情
    /// </summary>
    public async Task<BuildingDto?> GetBuildingByIdAsync(string id)
    {
        var building = await _buildingFactory.GetByIdAsync(id);
        return building != null ? await MapToBuildingDtoAsync(building) : null;
    }

    /// <summary>
    /// 创建楼宇
    /// </summary>
    public async Task<BuildingDto> CreateBuildingAsync(CreateBuildingRequest request)
    {
        var building = new Building
        {
            Name = request.Name,
            Address = request.Address,
            TotalFloors = request.TotalFloors,
            TotalArea = request.TotalArea,
            BuildingType = request.BuildingType,
            YearBuilt = request.YearBuilt,
            DeliveryDate = request.DeliveryDate,
            Description = request.Description,
            CoverImage = request.CoverImage,
            Images = request.Images,
            Attachments = request.Attachments
        };

        await _buildingFactory.CreateAsync(building);
        _logger.LogInformation("创建楼宇: {Name}, ID: {Id}", building.Name, building.Id);

        return await MapToBuildingDtoAsync(building);
    }

    /// <summary>
    /// 更新楼宇
    /// </summary>
    public async Task<BuildingDto?> UpdateBuildingAsync(string id, UpdateBuildingRequest request)
    {
        var building = await _buildingFactory.GetByIdAsync(id);
        if (building == null) return null;

        building.Name = request.Name;
        building.Address = request.Address;
        building.TotalFloors = request.TotalFloors;
        building.TotalArea = request.TotalArea;
        building.BuildingType = request.BuildingType;
        building.YearBuilt = request.YearBuilt;
        building.DeliveryDate = request.DeliveryDate;
        building.Description = request.Description;
        building.CoverImage = request.CoverImage;
        building.Images = request.Images;
        building.Attachments = request.Attachments;
        building.Status = request.Status ?? building.Status;

        await _buildingFactory.UpdateAsync(id, building => { });

        return await MapToBuildingDtoAsync(building);
    }

    /// <summary>
    /// 删除楼宇
    /// </summary>
    public async Task<bool> DeleteBuildingAsync(string id)
    {
        // 检查是否有关联的房源
        var unitCount = await _unitFactory.CountAsync(u => u.BuildingId == id);
        if (unitCount > 0)
        {
            throw new InvalidOperationException("楼宇下存在房源，无法删除");
        }

        var deleted = await _buildingFactory.SoftDeleteAsync(id);
        return deleted;
    }

    private async Task<BuildingDto> MapToBuildingDtoAsync(Building building)
    {
        var units = await _unitFactory.FindAsync(u => u.BuildingId == building.Id);
        var rentedUnits = units.Where(u => u.Status == "Rented").ToList();
        var rentedArea = rentedUnits.Sum(u => u.Area);

        // 以旗下所有房源面积之和作为分母
        var totalRentableArea = units.Sum(u => u.Area);

        return new BuildingDto
        {
            Id = building.Id,
            Name = building.Name,
            Address = building.Address,
            TotalFloors = building.TotalFloors,
            TotalArea = building.TotalArea,
            RentedArea = rentedArea,
            OccupancyRate = totalRentableArea > 0 ? Math.Round(rentedArea / totalRentableArea * 100, 2) : 0,
            BuildingType = building.BuildingType,
            YearBuilt = building.YearBuilt,
            DeliveryDate = building.DeliveryDate,
            Status = building.Status,
            Description = building.Description,
            CoverImage = building.CoverImage,
            TotalUnits = units.Count,
            AvailableUnits = units.Count(u => u.Status == "Available"),
            Images = building.Images,
            CreatedAt = building.CreatedAt,
            Attachments = building.Attachments
        };
    }

    #endregion

    #region 房源管理

    /// <summary>
    /// 获取房源列表
    /// </summary>
    public async Task<PropertyUnitListResponse> GetPropertyUnitsAsync(PropertyUnitListRequest request)
    {
        Expression<Func<PropertyUnit, bool>> filter = p => true;

        if (!string.IsNullOrEmpty(request.BuildingId))
        {
            filter = CombineFilters(filter, p => p.BuildingId == request.BuildingId);
        }

        if (!string.IsNullOrEmpty(request.Search))
        {
            filter = CombineFilters(filter, p => p.UnitNumber.Contains(request.Search));
        }

        if (!string.IsNullOrEmpty(request.Status))
        {
            filter = CombineFilters(filter, p => p.Status == request.Status);
        }

        if (!string.IsNullOrEmpty(request.UnitType))
        {
            filter = CombineFilters(filter, p => p.UnitType == request.UnitType);
        }

        if (request.Floor.HasValue)
        {
            filter = CombineFilters(filter, p => p.Floor == request.Floor.Value);
        }

        Func<IQueryable<PropertyUnit>, IOrderedQueryable<PropertyUnit>>? orderBy = null;
        if (request.SortOrder?.ToLower() == "asc")
        {
            orderBy = q => q.OrderBy(p => p.CreatedAt);
        }
        else
        {
            orderBy = q => q.OrderByDescending(p => p.CreatedAt);
        }

        var (items, total) = await _unitFactory.FindPagedAsync(filter, orderBy, request.Page, request.PageSize);

        var units = new List<PropertyUnitDto>();
        foreach (var item in items)
        {
            units.Add(await MapToPropertyUnitDtoAsync(item));
        }

        return new PropertyUnitListResponse
        {
            Units = units,
            Total = (int)total
        };
    }

    /// <summary>
    /// 获取房源详情
    /// </summary>
    public async Task<PropertyUnitDto?> GetPropertyUnitByIdAsync(string id)
    {
        var unit = await _unitFactory.GetByIdAsync(id);
        return unit != null ? await MapToPropertyUnitDtoAsync(unit, true) : null;
    }

    /// <summary>
    /// 创建房源
    /// </summary>
    public async Task<PropertyUnitDto> CreatePropertyUnitAsync(CreatePropertyUnitRequest request)
    {
        var unit = new PropertyUnit
        {
            BuildingId = request.BuildingId,
            UnitNumber = request.UnitNumber,
            Floor = request.Floor,
            Area = request.Area,
            MonthlyRent = request.MonthlyRent,
            DailyRent = request.DailyRent,
            UnitType = request.UnitType ?? "Office",
            Description = request.Description,
            Facilities = request.Facilities,
            Images = request.Images,
            Attachments = request.Attachments
        };

        await _unitFactory.CreateAsync(unit);
        return await MapToPropertyUnitDtoAsync(unit);
    }

    /// <summary>
    /// 更新房源
    /// </summary>
    public async Task<PropertyUnitDto?> UpdatePropertyUnitAsync(string id, CreatePropertyUnitRequest request)
    {
        var unit = await _unitFactory.GetByIdAsync(id);
        if (unit == null) return null;

        unit.BuildingId = request.BuildingId;
        unit.UnitNumber = request.UnitNumber;
        unit.Floor = request.Floor;
        unit.Area = request.Area;
        unit.MonthlyRent = request.MonthlyRent;
        unit.DailyRent = request.DailyRent;
        unit.UnitType = request.UnitType ?? unit.UnitType;
        unit.Description = request.Description;
        unit.Facilities = request.Facilities;
        unit.Images = request.Images;
        unit.Attachments = request.Attachments;

        await _unitFactory.UpdateAsync(id, _ => { });

        return await MapToPropertyUnitDtoAsync(unit);
    }

    /// <summary>
    /// 删除房源
    /// </summary>
    public async Task<bool> DeletePropertyUnitAsync(string id)
    {
        var unit = await _unitFactory.GetByIdAsync(id);
        if (unit == null) return false;

        if (unit.Status == "Rented")
        {
            throw new InvalidOperationException("房源已出租，无法删除");
        }

        var result = await _unitFactory.SoftDeleteAsync(id);
        return result;
    }

    private async Task<PropertyUnitDto> MapToPropertyUnitDtoAsync(PropertyUnit unit, bool includeHistory = false)
    {
        var building = await _buildingFactory.GetByIdAsync(unit.BuildingId);

        var dto = new PropertyUnitDto
        {
            Id = unit.Id,
            BuildingId = unit.BuildingId,
            BuildingName = building?.Name,
            UnitNumber = unit.UnitNumber,
            Floor = unit.Floor,
            Area = unit.Area,
            MonthlyRent = unit.MonthlyRent,
            DailyRent = unit.DailyRent,
            UnitType = unit.UnitType,
            Status = unit.Status,
            CurrentTenantId = unit.CurrentTenantId,
            LeaseEndDate = unit.LeaseEndDate,
            Facilities = unit.Facilities,
            Attachments = unit.Attachments
        };

        if (includeHistory)
        {
            var contracts = await _contractFactory.FindAsync(c => c.UnitIds.Contains(unit.Id));
            var leaseHistory = new List<LeaseContractDto>();

            foreach (var contract in contracts.OrderByDescending(c => c.CreatedAt))
            {
                var tenant = await _tenantFactory.GetByIdAsync(contract.TenantId);
                leaseHistory.Add(new LeaseContractDto
                {
                    Id = contract.Id,
                    TenantId = contract.TenantId,
                    TenantName = tenant?.TenantName,
                    ContractNumber = contract.ContractNumber,
                    StartDate = contract.StartDate,
                    EndDate = contract.EndDate,
                    Status = contract.Status,
                    MonthlyRent = contract.MonthlyRent,
                    Deposit = contract.Deposit,
                    PaymentCycle = contract.PaymentCycle,
                    UnitIds = contract.UnitIds,
                    CreatedAt = contract.CreatedAt
                });
            }
            dto.LeaseHistory = leaseHistory;
        }

        return dto;
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
    /// 获取资产统计数据
    /// </summary>
    public async Task<AssetStatisticsResponse> GetAssetStatisticsAsync(StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null)
    {
        var buildings = await _buildingFactory.FindAsync();
        var units = await _unitFactory.FindAsync();
        var contracts = await _contractFactory.FindAsync();

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
                _ => new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1)
            };
        }

        // Helper function to calculate metrics at a specific date
        (decimal OccupancyRate, decimal RentedArea, int RentedUnitsCount, int TotalBuildingsCount, decimal RentableAreaAtDate) CalculateMetricsAtDate(DateTime date)
        {
            var activeBuildingsAtDate = buildings.Where(b => b.DeliveryDate == null || b.DeliveryDate <= date).ToList();
            var activeBuildingIds = activeBuildingsAtDate.Select(b => b.Id).ToList();
            var activeUnitsAtDate = units.Where(u => activeBuildingIds.Contains(u.BuildingId)).ToList();

            var rentableAreaAtDate = activeUnitsAtDate.Sum(u => u.Area);

            var activeContractsAtDate = contracts
                .Where(c => (c.Status == "Active" || c.Status == "Renewed")
                            && c.StartDate <= date
                            && c.EndDate >= date)
                .ToList();

            var rentedUnitIdsAtDate = activeContractsAtDate
                .SelectMany(c => c.UnitIds)
                .Distinct()
                .ToList();

            var rentedUnitsAtDate = activeUnitsAtDate.Where(u => rentedUnitIdsAtDate.Contains(u.Id)).ToList();
            var rentedAreaAtDate = rentedUnitsAtDate.Sum(u => u.Area);
            var occupancyRateAtDate = rentableAreaAtDate > 0 ? (decimal)Math.Round((double)(rentedAreaAtDate / rentableAreaAtDate * 100), 2) : 0;

            return (occupancyRateAtDate, rentedAreaAtDate, rentedUnitsAtDate.Count, activeBuildingsAtDate.Count, rentableAreaAtDate);
        }

        // Metrics at the end of the selected period
        var (currentOccupancyRate, currentRentedArea, currentRentedUnits, currentTotalBuildings, currentTotalRentableArea) = CalculateMetricsAtDate(end);
        var activeBuildingsAtEnd = buildings.Where(b => b.DeliveryDate == null || b.DeliveryDate <= end).ToList();
        var currentTotalArea = activeBuildingsAtEnd.Sum(b => b.TotalArea);

        // Only count units belonging to buildings delivered by end of period
        var activeBuildingIdsAtEnd = activeBuildingsAtEnd.Select(b => b.Id).ToList();
        var activeUnitsAtEnd = units.Where(u => activeBuildingIdsAtEnd.Contains(u.BuildingId)).ToList();
        var currentTotalUnits = activeUnitsAtEnd.Count;

        // MoM Comparison (Previous Month/Period)
        var momDate = end.AddMonths(-1);
        var (momOccupancyRate, momRentedArea, _, momTotalBuildings, _) = CalculateMetricsAtDate(momDate);

        // YoY Comparison (Same time last year)
        var yoyDate = end.AddYears(-1);
        var (yoyOccupancyRate, yoyRentedArea, _, yoyTotalBuildings, _) = CalculateMetricsAtDate(yoyDate);

        double? CalculateGrowth(decimal current, decimal previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0;
            return (double)Math.Round((current - previous) / previous * 100, 2);
        }

        return new AssetStatisticsResponse
        {
            TotalBuildings = currentTotalBuildings,
            TotalArea = currentTotalArea,
            TotalUnits = currentTotalUnits,
            AvailableUnits = currentTotalUnits - currentRentedUnits,
            RentedUnits = currentRentedUnits,
            OccupancyRate = currentOccupancyRate,
            TotalRentableArea = currentTotalRentableArea,
            RentedArea = currentRentedArea,
            OccupancyRateYoY = CalculateGrowth(currentOccupancyRate, yoyOccupancyRate),
            OccupancyRateMoM = CalculateGrowth(currentOccupancyRate, momOccupancyRate),
            RentedAreaYoY = CalculateGrowth(currentRentedArea, yoyRentedArea),
            RentedAreaMoM = CalculateGrowth(currentRentedArea, momRentedArea),
            TotalBuildingsYoY = CalculateGrowth(currentTotalBuildings, yoyTotalBuildings),
            TotalBuildingsMoM = CalculateGrowth(currentTotalBuildings, momTotalBuildings)
        };
    }

    #endregion
}
