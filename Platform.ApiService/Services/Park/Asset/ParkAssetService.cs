using System.Linq.Dynamic.Core;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services;

/// <summary>
/// 园区资产管理服务实现
/// </summary>
public class ParkAssetService : IParkAssetService
{
    private readonly DbContext _context;
    private readonly ILogger<ParkAssetService> _logger;

    public ParkAssetService(DbContext context, ILogger<ParkAssetService> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    #region 楼宇管理

    public async Task<System.Linq.Dynamic.Core.PagedResult<BuildingDto>> GetBuildingsAsync(Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var pagedResult = _context.Set<Building>().ToPagedList(request);
        var items = await pagedResult.Queryable.ToListAsync();

        if (items.Count == 0)
        {
            return new System.Linq.Dynamic.Core.PagedResult<BuildingDto>
            {
                Queryable = Enumerable.Empty<BuildingDto>().AsQueryable(),
                CurrentPage = pagedResult.CurrentPage,
                PageSize = pagedResult.PageSize,
                RowCount = pagedResult.RowCount,
                PageCount = pagedResult.PageCount
            };
        }

        var buildingIds = items.Select(b => b.Id).Distinct().ToList();

        var units = await _context.Set<PropertyUnit>()
            .Where(u => buildingIds.Contains(u.BuildingId))
            .ToListAsync();

        var unitsByBuilding = new Dictionary<string, List<PropertyUnit>>();
        foreach (var unit in units)
        {
            if (!unitsByBuilding.ContainsKey(unit.BuildingId))
                unitsByBuilding[unit.BuildingId] = new List<PropertyUnit>();
            unitsByBuilding[unit.BuildingId].Add(unit);
        }

        var buildings = items.Select(b => MapToBuildingDto(b, unitsByBuilding)).ToList();

        return new System.Linq.Dynamic.Core.PagedResult<BuildingDto>
        {
            Queryable = buildings.AsQueryable(),
            CurrentPage = pagedResult.CurrentPage,
            PageSize = pagedResult.PageSize,
            RowCount = pagedResult.RowCount,
            PageCount = pagedResult.PageCount
        };
    }

    public async Task<BuildingDto?> GetBuildingByIdAsync(string id)
    {
        var b = await _context.Set<Building>().FirstOrDefaultAsync(x => x.Id == id);
        if (b == null) return null;

        var units = await _context.Set<PropertyUnit>()
            .Where(u => u.BuildingId == id)
            .ToListAsync();

        return MapToBuildingDto(b, new Dictionary<string, List<PropertyUnit>> { { id, units } });
    }

    public async Task<BuildingDto> CreateBuildingAsync(CreateBuildingRequest request)
    {
        if (string.IsNullOrEmpty(request.Name))
            throw new ArgumentException("楼宇名称不能为空", nameof(request));

        var b = new Building
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
        await _context.Set<Building>().AddAsync(b);
        await _context.SaveChangesAsync();

        return MapToBuildingDto(b, new Dictionary<string, List<PropertyUnit>>());
    }

    public async Task<BuildingDto?> UpdateBuildingAsync(string id, UpdateBuildingRequest request)
    {
        var b = await _context.Set<Building>().FirstOrDefaultAsync(x => x.Id == id);
        if (b == null) return null;

        b.Name = request.Name;
        b.Address = request.Address;
        b.TotalFloors = request.TotalFloors;
        b.TotalArea = request.TotalArea;
        b.BuildingType = request.BuildingType;
        b.YearBuilt = request.YearBuilt;
        b.DeliveryDate = request.DeliveryDate;
        b.Description = request.Description;
        b.CoverImage = request.CoverImage;
        b.Images = request.Images;
        b.Attachments = request.Attachments;
        b.Status = request.Status ?? b.Status;

        await _context.SaveChangesAsync();

        var units = await _context.Set<PropertyUnit>()
            .Where(u => u.BuildingId == id)
            .ToListAsync();

        return MapToBuildingDto(b, new Dictionary<string, List<PropertyUnit>> { { id, units } });
    }

    public async Task<bool> DeleteBuildingAsync(string id)
    {
        var b = await _context.Set<Building>().FirstOrDefaultAsync(x => x.Id == id);
        if (b == null) return false;

        if (await _context.Set<PropertyUnit>().AnyAsync(u => u.BuildingId == id))
            throw new InvalidOperationException(ErrorCode.InvalidOperation);

        _context.Set<Building>().Remove(b);
        await _context.SaveChangesAsync();
        return true;
    }

    private static BuildingDto MapToBuildingDto(Building b, Dictionary<string, List<PropertyUnit>> unitsByBuilding)
    {
        unitsByBuilding.TryGetValue(b.Id, out var units);
        units ??= new List<PropertyUnit>();

        var rentedUnits = units.Where(u => u.Status == "Rented").ToList();
        var rentedArea = rentedUnits.Sum(u => u.Area);
        var totalRentableArea = units.Sum(u => u.Area);

        return new BuildingDto
        {
            Id = b.Id,
            Name = b.Name,
            Address = b.Address,
            TotalFloors = b.TotalFloors,
            TotalArea = b.TotalArea,
            RentedArea = rentedArea,
            OccupancyRate = totalRentableArea > 0 ? Math.Round(rentedArea / totalRentableArea * 100, 2) : 0,
            BuildingType = b.BuildingType,
            YearBuilt = b.YearBuilt,
            DeliveryDate = b.DeliveryDate,
            Status = b.Status,
            Description = b.Description,
            CoverImage = b.CoverImage,
            TotalUnits = units.Count,
            AvailableUnits = units.Count(u => u.Status == "Available"),
            Images = b.Images,
            Attachments = b.Attachments
        };
    }

    #endregion

    #region 房源管理

    public async Task<System.Linq.Dynamic.Core.PagedResult<PropertyUnitDto>> GetPropertyUnitsAsync(Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var pagedResult = _context.Set<PropertyUnit>().ToPagedList(request);
        var items = await pagedResult.Queryable.ToListAsync();

        if (items.Count == 0)
        {
            return new System.Linq.Dynamic.Core.PagedResult<PropertyUnitDto>
            {
                Queryable = Enumerable.Empty<PropertyUnitDto>().AsQueryable(),
                CurrentPage = pagedResult.CurrentPage,
                PageSize = pagedResult.PageSize,
                RowCount = pagedResult.RowCount,
                PageCount = pagedResult.PageCount
            };
        }

        var buildingIds = items.Select(u => u.BuildingId).Distinct().ToList();

        var buildingsById = await _context.Set<Building>()
            .Where(b => buildingIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id);

        var units = items.Select(u => MapToPropertyUnitDto(u, buildingsById)).ToList();

        return new System.Linq.Dynamic.Core.PagedResult<PropertyUnitDto>
        {
            Queryable = units.AsQueryable(),
            CurrentPage = pagedResult.CurrentPage,
            PageSize = pagedResult.PageSize,
            RowCount = pagedResult.RowCount,
            PageCount = pagedResult.PageCount
        };
    }

    public async Task<PropertyUnitDto?> GetPropertyUnitByIdAsync(string id)
    {
        var u = await _context.Set<PropertyUnit>().FirstOrDefaultAsync(x => x.Id == id);
        if (u == null) return null;

        var building = await _context.Set<Building>()
            .FirstOrDefaultAsync(x => x.Id == u.BuildingId);

        var buildingsById = new Dictionary<string, Building>();
        if (building != null)
            buildingsById[building.Id] = building;

        return await MapToPropertyUnitDtoWithHistoryAsync(u, buildingsById, true);
    }

    public async Task<PropertyUnitDto> CreatePropertyUnitAsync(CreatePropertyUnitRequest request)
    {
        var u = new PropertyUnit
        {
            BuildingId = request.BuildingId,
            UnitNumber = request.UnitNumber,
            Floor = request.Floor,
            Area = request.Area,
            MonthlyRent = request.MonthlyRent,
            PropertyFee = request.PropertyFee,
            UnitType = request.UnitType ?? "Office",
            Purpose = request.Purpose ?? "Rent",
            SalePrice = request.SalePrice,
            Description = request.Description,
            Facilities = request.Facilities,
            Images = request.Images,
            Attachments = request.Attachments
        };
        await _context.Set<PropertyUnit>().AddAsync(u);
        await _context.SaveChangesAsync();

        var building = await _context.Set<Building>()
            .FirstOrDefaultAsync(x => x.Id == u.BuildingId);

        var buildingsById = new Dictionary<string, Building>();
        if (building != null)
            buildingsById[building.Id] = building;

        return MapToPropertyUnitDto(u, buildingsById);
    }

    public async Task<PropertyUnitDto?> UpdatePropertyUnitAsync(string id, CreatePropertyUnitRequest request)
    {
        var u = await _context.Set<PropertyUnit>().FirstOrDefaultAsync(x => x.Id == id);
        if (u == null) return null;

        u.BuildingId = request.BuildingId;
        u.UnitNumber = request.UnitNumber;
        u.Floor = request.Floor;
        u.Area = request.Area;
        u.MonthlyRent = request.MonthlyRent;
        u.PropertyFee = request.PropertyFee;
        u.UnitType = request.UnitType ?? u.UnitType;
        u.Purpose = request.Purpose ?? u.Purpose;
        u.SalePrice = request.SalePrice;
        u.Description = request.Description;
        u.Facilities = request.Facilities;
        u.Images = request.Images;
        u.Attachments = request.Attachments;

        await _context.SaveChangesAsync();

        var building = await _context.Set<Building>()
            .FirstOrDefaultAsync(x => x.Id == u.BuildingId);

        var buildingsById = new Dictionary<string, Building>();
        if (building != null)
            buildingsById[building.Id] = building;

        return MapToPropertyUnitDto(u, buildingsById);
    }

    public async Task<bool> DeletePropertyUnitAsync(string id)
    {
        var u = await _context.Set<PropertyUnit>().FirstOrDefaultAsync(x => x.Id == id);
        if (u == null) return false;
        if (u.Status == "Rented")
            throw new InvalidOperationException(ErrorCode.InvalidOperation);

        _context.Set<PropertyUnit>().Remove(u);
        await _context.SaveChangesAsync();
        return true;
    }

    private static PropertyUnitDto MapToPropertyUnitDto(PropertyUnit u, Dictionary<string, Building> buildingsById)
    {
        buildingsById.TryGetValue(u.BuildingId, out var b);

        return new PropertyUnitDto
        {
            Id = u.Id,
            BuildingId = u.BuildingId,
            BuildingName = b?.Name,
            UnitNumber = u.UnitNumber,
            Floor = u.Floor,
            Area = u.Area,
            MonthlyRent = u.MonthlyRent,
            PropertyFee = u.PropertyFee,
            UnitType = u.UnitType,
            Status = u.Status,
            Purpose = u.Purpose ?? "Rent",
            SalePrice = u.SalePrice,
            CurrentTenantId = u.CurrentTenantId,
            LeaseEndDate = u.LeaseEndDate,
            Facilities = u.Facilities,
            Attachments = u.Attachments
        };
    }

    private async Task<PropertyUnitDto> MapToPropertyUnitDtoWithHistoryAsync(PropertyUnit u, Dictionary<string, Building> buildingsById, bool includeHistory)
    {
        var dto = MapToPropertyUnitDto(u, buildingsById);

        if (includeHistory)
        {
            var contracts = await _context.Set<LeaseContract>()
                .Where(c => c.UnitIds.Contains(u.Id))
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            if (contracts.Count > 0)
            {
                var tenantIds = contracts.Select(c => c.TenantId).Distinct().ToList();
                var tenantsById = await _context.Set<ParkTenant>()
                    .Where(t => tenantIds.Contains(t.Id))
                    .ToDictionaryAsync(t => t.Id);

                var leaseHistory = contracts.Select(c =>
                {
                    tenantsById.TryGetValue(c.TenantId, out var tenant);
                    return new LeaseContractDto
                    {
                        Id = c.Id,
                        TenantId = c.TenantId,
                        TenantName = tenant?.TenantName,
                        ContractNumber = c.ContractNumber,
                        StartDate = c.StartDate,
                        EndDate = c.EndDate,
                        Status = c.Status,
                        MonthlyRent = c.MonthlyRent,
                        Deposit = c.Deposit,
                        PaymentCycle = c.PaymentCycle,
                        UnitIds = c.UnitIds
                    };
                }).ToList();

                dto.LeaseHistory = leaseHistory;
            }
        }
        return dto;
    }

    #endregion

    #region 统计

    public async Task<AssetStatisticsResponse> GetAssetStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var end = endDate ?? DateTime.UtcNow;

        var buildings = await _context.Set<Building>()
            .Select(b => new BuildingStats { Id = b.Id, DeliveryDate = b.DeliveryDate, TotalArea = b.TotalArea, BuildingType = b.BuildingType, Status = b.Status })
            .ToListAsync();

        var units = await _context.Set<PropertyUnit>()
            .Select(u => new UnitStats { Id = u.Id, BuildingId = u.BuildingId, Status = u.Status, Area = u.Area, UnitType = u.UnitType, MonthlyRent = u.MonthlyRent })
            .ToListAsync();

        var contracts = await _context.Set<LeaseContract>()
            .Where(c => c.Status == "Active" || c.Status == "Renewed")
            .Select(c => new ContractStats { Status = c.Status, StartDate = c.StartDate, EndDate = c.EndDate, UnitIds = c.UnitIds })
            .ToListAsync();

        var momDate = end.AddMonths(-1);
        var yoyDate = end.AddYears(-1);

        var currentMetrics = CalculateMetricsAtDate(end, buildings, units, contracts);
        var momMetrics = CalculateMetricsAtDate(momDate, buildings, units, contracts);
        var yoyMetrics = CalculateMetricsAtDate(yoyDate, buildings, units, contracts);

        double? CalculateGrowth(decimal current, decimal previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0;
            return (double)Math.Round((current - previous) / previous * 100, 2);
        }

        var activeBuildingsAtEnd = buildings.Where(b => b.DeliveryDate == null || b.DeliveryDate <= end).ToList();
        var activeUnitsAtEnd = units.Where(u => activeBuildingsAtEnd.Any(b => b.Id == u.BuildingId)).ToList();

        var avgPrice = activeUnitsAtEnd.Where(u => u.MonthlyRent > 0 && u.Area > 0)
            .Average(u => (double?)u.MonthlyRent / (double)u.Area) ?? 0;

        return new AssetStatisticsResponse
        {
            TotalBuildings = currentMetrics.TotalBuildingsCount,
            TotalArea = currentMetrics.TotalArea,
            TotalUnits = currentMetrics.TotalUnitsCount,
            AvailableUnits = currentMetrics.TotalUnitsCount - currentMetrics.RentedUnitsCount,
            RentedUnits = currentMetrics.RentedUnitsCount,
            OccupancyRate = currentMetrics.OccupancyRate,
            TotalRentableArea = currentMetrics.RentableAreaAtDate,
            RentedArea = currentMetrics.RentedArea,
            OccupancyRateYoY = CalculateGrowth(currentMetrics.OccupancyRate, yoyMetrics.OccupancyRate),
            OccupancyRateMoM = CalculateGrowth(currentMetrics.OccupancyRate, momMetrics.OccupancyRate),
            RentedAreaYoY = CalculateGrowth(currentMetrics.RentedArea, yoyMetrics.RentedArea),
            RentedAreaMoM = CalculateGrowth(currentMetrics.RentedArea, momMetrics.RentedArea),
            TotalBuildingsYoY = CalculateGrowth(currentMetrics.TotalBuildingsCount, yoyMetrics.TotalBuildingsCount),
            TotalBuildingsMoM = CalculateGrowth(currentMetrics.TotalBuildingsCount, momMetrics.TotalBuildingsCount),
            OccupancyRatePrev = momMetrics.OccupancyRate,
            RentedAreaPrev = momMetrics.RentedArea,
            TotalBuildingsPrev = momMetrics.TotalBuildingsCount,
            UnitTypeDistribution = activeUnitsAtEnd
                .GroupBy(u => u.UnitType ?? "其他")
                .ToDictionary(g => g.Key, g => g.Count()),
            BuildingTypeDistribution = activeBuildingsAtEnd
                .Where(b => !string.IsNullOrEmpty(b.BuildingType))
                .GroupBy(b => b.BuildingType!)
                .ToDictionary(g => g.Key, g => g.Count()),
            BuildingStatusDistribution = activeBuildingsAtEnd
                .Where(b => !string.IsNullOrEmpty(b.Status))
                .GroupBy(b => b.Status!)
                .ToDictionary(g => g.Key, g => g.Count()),
            AverageUnitPrice = (decimal)Math.Round(avgPrice, 2)
        };
    }

    private static MetricsResult CalculateMetricsAtDate(
        DateTime date,
        List<BuildingStats> buildings,
        List<UnitStats> units,
        List<ContractStats> contracts)
    {
        var activeBuildings = buildings
            .Where(b => b.DeliveryDate == null || b.DeliveryDate <= date)
            .ToList();

        var activeBuildingIds = activeBuildings.Select(b => b.Id).ToList();

        var activeUnits = units
            .Where(u => activeBuildingIds.Contains(u.BuildingId))
            .ToList();

        var rentableArea = activeUnits.Sum(u => u.Area);
        var totalArea = activeBuildings.Sum(b => b.TotalArea);

        var activeContracts = contracts
            .Where(c =>
                (c.Status == "Active" || c.Status == "Renewed") &&
                c.StartDate <= date &&
                c.EndDate >= date)
            .ToList();

        var rentedUnitIds = new HashSet<string>();
        foreach (var c in activeContracts)
        {
            if (c.UnitIds != null)
            {
                foreach (var unitId in c.UnitIds)
                {
                    rentedUnitIds.Add(unitId);
                }
            }
        }

        var rentedUnits = activeUnits
            .Where(u => rentedUnitIds.Contains(u.Id))
            .ToList();

        var rentedArea = rentedUnits.Sum(u => u.Area);
        var occupancyRate = rentableArea > 0
            ? Math.Round(rentedArea / rentableArea * 100, 2)
            : 0;

        return new MetricsResult
        {
            OccupancyRate = occupancyRate,
            RentedArea = rentedArea,
            RentedUnitsCount = rentedUnits.Count,
            TotalBuildingsCount = activeBuildings.Count,
            RentableAreaAtDate = rentableArea,
            TotalArea = totalArea,
            TotalUnitsCount = activeUnits.Count
        };
    }

    private class BuildingStats
    {
        public string Id { get; set; } = string.Empty;
        public DateTime? DeliveryDate { get; set; }
        public decimal TotalArea { get; set; }
        public string? BuildingType { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    private class UnitStats
    {
        public string Id { get; set; } = string.Empty;
        public string BuildingId { get; set; } = string.Empty;
        public string? Status { get; set; }
        public decimal Area { get; set; }
        public string UnitType { get; set; } = string.Empty;
        public decimal MonthlyRent { get; set; }
    }

    private class ContractStats
    {
        public string? Status { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public List<string>? UnitIds { get; set; }
    }

    private struct MetricsResult
    {
        public decimal OccupancyRate { get; set; }
        public decimal RentedArea { get; set; }
        public int RentedUnitsCount { get; set; }
        public int TotalBuildingsCount { get; set; }
        public decimal RentableAreaAtDate { get; set; }
        public decimal TotalArea { get; set; }
        public int TotalUnitsCount { get; set; }
    }

    #endregion
}
