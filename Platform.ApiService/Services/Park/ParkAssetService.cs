using Platform.ApiService.Models;
using MongoDB.Driver;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 园区资产管理服务实现
/// </summary>
public class ParkAssetService : IParkAssetService
{
    private readonly ILogger<ParkAssetService> _logger;
    private readonly IDatabaseOperationFactory<Building> _buildingFactory;
    private readonly IDatabaseOperationFactory<PropertyUnit> _unitFactory;
    private readonly IDatabaseOperationFactory<LeaseContract> _contractFactory;

    /// <summary>
    /// 初始化资产管理服务
    /// </summary>
    public ParkAssetService(
        ILogger<ParkAssetService> logger,
        IDatabaseOperationFactory<Building> buildingFactory,
        IDatabaseOperationFactory<PropertyUnit> unitFactory,
        IDatabaseOperationFactory<LeaseContract> contractFactory)
    {
        _logger = logger;
        _buildingFactory = buildingFactory;
        _unitFactory = unitFactory;
        _contractFactory = contractFactory;
    }


    #region 楼宇管理

    /// <summary>
    /// 获取楼宇列表
    /// </summary>
    public async Task<BuildingListResponse> GetBuildingsAsync(BuildingListRequest request)
    {
        var filterBuilder = Builders<Building>.Filter;
        var filter = filterBuilder.Empty;

        // 搜索过滤
        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            filter &= filterBuilder.Or(
                filterBuilder.Regex(b => b.Name, new MongoDB.Bson.BsonRegularExpression(search, "i")),
                filterBuilder.Regex(b => b.Address!, new MongoDB.Bson.BsonRegularExpression(search, "i"))
            );
        }

        if (!string.IsNullOrEmpty(request.Status))
        {
            filter &= filterBuilder.Eq(b => b.Status, request.Status);
        }

        if (!string.IsNullOrEmpty(request.BuildingType))
        {
            filter &= filterBuilder.Eq(b => b.BuildingType!, request.BuildingType);
        }

        // 排序
        var sortBuilder = _buildingFactory.CreateSortBuilder();
        var sort = request.SortOrder?.ToLower() == "asc"
            ? sortBuilder.Ascending(b => b.CreatedAt)
            : sortBuilder.Descending(b => b.CreatedAt);

        var (items, total) = await _buildingFactory.FindPagedAsync(filter, sort.Build(), request.Page, request.PageSize);

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
            RentableArea = request.RentableArea,
            BuildingType = request.BuildingType,
            YearBuilt = request.YearBuilt,
            Description = request.Description,
            CoverImage = request.CoverImage,
            Images = request.Images
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
        building.RentableArea = request.RentableArea;
        building.BuildingType = request.BuildingType;
        building.YearBuilt = request.YearBuilt;
        building.Description = request.Description;
        building.CoverImage = request.CoverImage;
        building.Images = request.Images;
        building.Status = request.Status ?? building.Status;

        await _buildingFactory.FindOneAndReplaceAsync(_buildingFactory.CreateFilterBuilder().Equal(b => b.Id, id).Build(), building);

        return await MapToBuildingDtoAsync(building);
    }

    /// <summary>
    /// 删除楼宇
    /// </summary>
    public async Task<bool> DeleteBuildingAsync(string id)
    {
        // 检查是否有关联的房源
        var unitCount = await _unitFactory.CountAsync(Builders<PropertyUnit>.Filter.Eq(u => u.BuildingId, id));
        if (unitCount > 0)
        {
            throw new InvalidOperationException("楼宇下存在房源，无法删除");
        }

        var deleted = await _buildingFactory.FindOneAndSoftDeleteAsync(_buildingFactory.CreateFilterBuilder().Equal(b => b.Id, id).Build());
        return deleted != null;
    }

    private async Task<BuildingDto> MapToBuildingDtoAsync(Building building)
    {
        var units = await _unitFactory.FindAsync(Builders<PropertyUnit>.Filter.Eq(u => u.BuildingId, building.Id));
        var rentedUnits = units.Where(u => u.Status == "Rented").ToList();
        var rentedArea = rentedUnits.Sum(u => u.Area);

        return new BuildingDto
        {
            Id = building.Id,
            Name = building.Name,
            Address = building.Address,
            TotalFloors = building.TotalFloors,
            TotalArea = building.TotalArea,
            RentableArea = building.RentableArea,
            RentedArea = rentedArea,
            OccupancyRate = building.RentableArea > 0 ? Math.Round(rentedArea / building.RentableArea * 100, 2) : 0,
            BuildingType = building.BuildingType,
            YearBuilt = building.YearBuilt,
            Status = building.Status,
            Description = building.Description,
            CoverImage = building.CoverImage,
            TotalUnits = units.Count,
            AvailableUnits = units.Count(u => u.Status == "Available"),
            CreatedAt = building.CreatedAt
        };
    }

    #endregion

    #region 房源管理

    /// <summary>
    /// 获取房源列表
    /// </summary>
    public async Task<PropertyUnitListResponse> GetPropertyUnitsAsync(PropertyUnitListRequest request)
    {
        var filterBuilder = Builders<PropertyUnit>.Filter;
        var filter = filterBuilder.Empty;

        if (!string.IsNullOrEmpty(request.BuildingId))
        {
            filter &= filterBuilder.Eq(p => p.BuildingId, request.BuildingId);
        }

        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            filter &= filterBuilder.Regex(p => p.UnitNumber, new MongoDB.Bson.BsonRegularExpression(search, "i"));
        }

        if (!string.IsNullOrEmpty(request.Status))
        {
            filter &= filterBuilder.Eq(p => p.Status, request.Status);
        }

        if (!string.IsNullOrEmpty(request.UnitType))
        {
            filter &= filterBuilder.Eq(p => p.UnitType, request.UnitType);
        }

        if (request.Floor.HasValue)
        {
            filter &= filterBuilder.Eq(p => p.Floor, request.Floor.Value);
        }

        var sortBuilder = _unitFactory.CreateSortBuilder();
        var sort = request.SortOrder?.ToLower() == "asc"
            ? sortBuilder.Ascending(p => p.CreatedAt)
            : sortBuilder.Descending(p => p.CreatedAt);

        var (items, total) = await _unitFactory.FindPagedAsync(filter, sort.Build(), request.Page, request.PageSize);

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
        return unit != null ? await MapToPropertyUnitDtoAsync(unit) : null;
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
            Images = request.Images
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

        await _unitFactory.FindOneAndReplaceAsync(_unitFactory.CreateFilterBuilder().Equal(p => p.Id, id).Build(), unit);

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

        var deleted = await _unitFactory.FindOneAndSoftDeleteAsync(_unitFactory.CreateFilterBuilder().Equal(p => p.Id, id).Build());
        return deleted != null;
    }

    private async Task<PropertyUnitDto> MapToPropertyUnitDtoAsync(PropertyUnit unit)
    {
        var building = await _buildingFactory.GetByIdAsync(unit.BuildingId);

        return new PropertyUnitDto
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
            Facilities = unit.Facilities
        };
    }

    #endregion

    #region 统计

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

        var totalRentableArea = buildings.Sum(b => b.RentableArea);

        // Helper function to calculate metrics at a specific date
        (decimal OccupancyRate, decimal RentedArea, int RentedUnitsCount) CalculateMetricsAtDate(DateTime date)
        {
            var activeContractsAtDate = contracts
                .Where(c => (c.Status == "Active" || c.Status == "Renewed" || c.Status == "Expired" || c.Status == "Terminated")
                            && c.StartDate <= date
                            && c.EndDate >= date)
                .ToList();

            var rentedUnitIdsAtDate = activeContractsAtDate
                .SelectMany(c => c.UnitIds)
                .Distinct()
                .ToList();

            var rentedUnitsAtDate = units.Where(u => rentedUnitIdsAtDate.Contains(u.Id)).ToList();
            var rentedAreaAtDate = rentedUnitsAtDate.Sum(u => u.Area);
            var occupancyRateAtDate = totalRentableArea > 0 ? (decimal)Math.Round((double)(rentedAreaAtDate / totalRentableArea * 100), 2) : 0;

            return (occupancyRateAtDate, rentedAreaAtDate, rentedUnitsAtDate.Count);
        }

        var (currentOccupancyRate, currentRentedArea, currentRentedUnits) = CalculateMetricsAtDate(end);

        // MoM Comparison (Previous Month/Period)
        var momDate = end.AddMonths(-1);
        var (momOccupancyRate, momRentedArea, _) = CalculateMetricsAtDate(momDate);

        // YoY Comparison (Same time last year)
        var yoyDate = end.AddYears(-1);
        var (yoyOccupancyRate, yoyRentedArea, _) = CalculateMetricsAtDate(yoyDate);

        double? CalculateGrowth(decimal current, decimal previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0; // If previous was 0, growth is 100% or 0%
            return (double)Math.Round((current - previous) / previous * 100, 2);
        }

        return new AssetStatisticsResponse
        {
            TotalBuildings = buildings.Count,
            TotalArea = buildings.Sum(b => b.TotalArea),
            TotalUnits = units.Count,
            AvailableUnits = units.Count - currentRentedUnits,
            RentedUnits = currentRentedUnits,
            OccupancyRate = currentOccupancyRate,
            TotalRentableArea = totalRentableArea,
            RentedArea = currentRentedArea,
            OccupancyRateYoY = CalculateGrowth(currentOccupancyRate, yoyOccupancyRate),
            OccupancyRateMoM = CalculateGrowth(currentOccupancyRate, momOccupancyRate),
            RentedAreaYoY = CalculateGrowth(currentRentedArea, yoyRentedArea),
            RentedAreaMoM = CalculateGrowth(currentRentedArea, momRentedArea)
        };
    }

    #endregion
}
