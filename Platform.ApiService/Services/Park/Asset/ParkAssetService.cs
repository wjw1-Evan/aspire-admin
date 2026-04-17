using System.Linq.Expressions;
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
        _context = context;
        _logger = logger;
    }

    #region 楼宇管理

    public async Task<System.Linq.Dynamic.Core.PagedResult<BuildingDto>> GetBuildingsAsync(Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var pagedResult = _context.Set<Building>().ToPagedList(request);
        var items = await pagedResult.Queryable.ToListAsync();
        var buildings = new List<BuildingDto>();
        foreach (var b in items) buildings.Add(await MapToBuildingDtoAsync(b));

        return new System.Linq.Dynamic.Core.PagedResult<BuildingDto> { Queryable = buildings.AsQueryable(), CurrentPage = pagedResult.CurrentPage, PageSize = pagedResult.PageSize, RowCount = pagedResult.RowCount, PageCount = pagedResult.PageCount };
    }

    public async Task<BuildingDto?> GetBuildingByIdAsync(string id)
    {
        var b = await _context.Set<Building>().FirstOrDefaultAsync(x => x.Id == id);
        return b != null ? await MapToBuildingDtoAsync(b) : null;
    }

    public async Task<BuildingDto> CreateBuildingAsync(CreateBuildingRequest request)
    {
        var b = new Building
        {
            Name = request.Name, Address = request.Address, TotalFloors = request.TotalFloors,
            TotalArea = request.TotalArea, BuildingType = request.BuildingType, YearBuilt = request.YearBuilt,
            DeliveryDate = request.DeliveryDate, Description = request.Description, CoverImage = request.CoverImage,
            Images = request.Images, Attachments = request.Attachments
        };
        await _context.Set<Building>().AddAsync(b);
        await _context.SaveChangesAsync();
        return await MapToBuildingDtoAsync(b);
    }

    public async Task<BuildingDto?> UpdateBuildingAsync(string id, UpdateBuildingRequest request)
    {
        var b = await _context.Set<Building>().FirstOrDefaultAsync(x => x.Id == id);
        if (b == null) return null;

        b.Name = request.Name; b.Address = request.Address; b.TotalFloors = request.TotalFloors;
        b.TotalArea = request.TotalArea; b.BuildingType = request.BuildingType; b.YearBuilt = request.YearBuilt;
        b.DeliveryDate = request.DeliveryDate; b.Description = request.Description; b.CoverImage = request.CoverImage;
        b.Images = request.Images; b.Attachments = request.Attachments; b.Status = request.Status ?? b.Status;

        await _context.SaveChangesAsync();
        return await MapToBuildingDtoAsync(b);
    }

    public async Task<bool> DeleteBuildingAsync(string id)
    {
        var b = await _context.Set<Building>().FirstOrDefaultAsync(x => x.Id == id);
        if (b == null) return false;

        if (await _context.Set<PropertyUnit>().AnyAsync(u => u.BuildingId == id))
            throw new InvalidOperationException("楼宇下存在房源，无法删除");

        _context.Set<Building>().Remove(b);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<BuildingDto> MapToBuildingDtoAsync(Building b)
    {
        var units = await _context.Set<PropertyUnit>().Where(u => u.BuildingId == b.Id).ToListAsync();
        var rentedUnits = units.Where(u => u.Status == "Rented").ToList();
        var rentedArea = rentedUnits.Sum(u => u.Area);
        var totalRentableArea = units.Sum(u => u.Area);

        return new BuildingDto
        {
            Id = b.Id, Name = b.Name, Address = b.Address, TotalFloors = b.TotalFloors, TotalArea = b.TotalArea,
            RentedArea = rentedArea, OccupancyRate = totalRentableArea > 0 ? Math.Round(rentedArea / totalRentableArea * 100, 2) : 0,
            BuildingType = b.BuildingType, YearBuilt = b.YearBuilt, DeliveryDate = b.DeliveryDate, Status = b.Status,
            Description = b.Description, CoverImage = b.CoverImage, TotalUnits = units.Count,
            AvailableUnits = units.Count(u => u.Status == "Available"), Images = b.Images, Attachments = b.Attachments
        };
    }

    #endregion

    #region 房源管理

    public async Task<System.Linq.Dynamic.Core.PagedResult<PropertyUnitDto>> GetPropertyUnitsAsync(Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var pagedResult = _context.Set<PropertyUnit>().ToPagedList(request);
        var items = await pagedResult.Queryable.ToListAsync();
        var units = new List<PropertyUnitDto>();
        foreach (var item in items) units.Add(await MapToPropertyUnitDtoAsync(item));

        return new System.Linq.Dynamic.Core.PagedResult<PropertyUnitDto> { Queryable = units.AsQueryable(), CurrentPage = pagedResult.CurrentPage, PageSize = pagedResult.PageSize, RowCount = pagedResult.RowCount, PageCount = pagedResult.PageCount };
    }

    public async Task<PropertyUnitDto?> GetPropertyUnitByIdAsync(string id)
    {
        var u = await _context.Set<PropertyUnit>().FirstOrDefaultAsync(x => x.Id == id);
        return u != null ? await MapToPropertyUnitDtoAsync(u, true) : null;
    }

    public async Task<PropertyUnitDto> CreatePropertyUnitAsync(CreatePropertyUnitRequest request)
    {
        var u = new PropertyUnit
        {
            BuildingId = request.BuildingId, UnitNumber = request.UnitNumber, Floor = request.Floor,
            Area = request.Area, MonthlyRent = request.MonthlyRent, DailyRent = request.DailyRent,
            UnitType = request.UnitType ?? "Office", Description = request.Description,
            Facilities = request.Facilities, Images = request.Images, Attachments = request.Attachments
        };
        await _context.Set<PropertyUnit>().AddAsync(u);
        await _context.SaveChangesAsync();
        return await MapToPropertyUnitDtoAsync(u);
    }

    public async Task<PropertyUnitDto?> UpdatePropertyUnitAsync(string id, CreatePropertyUnitRequest request)
    {
        var u = await _context.Set<PropertyUnit>().FirstOrDefaultAsync(x => x.Id == id);
        if (u == null) return null;

        u.BuildingId = request.BuildingId; u.UnitNumber = request.UnitNumber; u.Floor = request.Floor;
        u.Area = request.Area; u.MonthlyRent = request.MonthlyRent; u.DailyRent = request.DailyRent;
        u.UnitType = request.UnitType ?? u.UnitType; u.Description = request.Description;
        u.Facilities = request.Facilities; u.Images = request.Images; u.Attachments = request.Attachments;

        await _context.SaveChangesAsync();
        return await MapToPropertyUnitDtoAsync(u);
    }

    public async Task<bool> DeletePropertyUnitAsync(string id)
    {
        var u = await _context.Set<PropertyUnit>().FirstOrDefaultAsync(x => x.Id == id);
        if (u == null) return false;
        if (u.Status == "Rented") throw new InvalidOperationException("房源已出租，无法删除");
        _context.Set<PropertyUnit>().Remove(u);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<PropertyUnitDto> MapToPropertyUnitDtoAsync(PropertyUnit u, bool includeHistory = false)
    {
        var b = await _context.Set<Building>().FirstOrDefaultAsync(x => x.Id == u.BuildingId);

        var dto = new PropertyUnitDto
        {
            Id = u.Id, BuildingId = u.BuildingId, BuildingName = b?.Name, UnitNumber = u.UnitNumber, Floor = u.Floor,
            Area = u.Area, MonthlyRent = u.MonthlyRent, DailyRent = u.DailyRent, UnitType = u.UnitType,
            Status = u.Status, CurrentTenantId = u.CurrentTenantId, LeaseEndDate = u.LeaseEndDate,
            Facilities = u.Facilities, Attachments = u.Attachments
        };

        if (includeHistory)
        {
            var contracts = await _context.Set<LeaseContract>().Where(c => c.UnitIds.Contains(u.Id)).ToListAsync();
            var leaseHistory = new List<LeaseContractDto>();
            foreach (var c in contracts.OrderByDescending(x => x.CreatedAt))
            {
                var tenant = await _context.Set<ParkTenant>().FirstOrDefaultAsync(x => x.Id == c.TenantId);
                leaseHistory.Add(new LeaseContractDto
                {
                    Id = c.Id, TenantId = c.TenantId, TenantName = tenant?.TenantName, ContractNumber = c.ContractNumber,
                    StartDate = c.StartDate, EndDate = c.EndDate, Status = c.Status, MonthlyRent = c.MonthlyRent,
                    Deposit = c.Deposit, PaymentCycle = c.PaymentCycle, UnitIds = c.UnitIds
                });
            }
            dto.LeaseHistory = leaseHistory;
        }
        return dto;
    }

    #endregion

    #region 统计

    public async Task<AssetStatisticsResponse> GetAssetStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var buildings = await _context.Set<Building>().ToListAsync();
        var units = await _context.Set<PropertyUnit>().ToListAsync();
        var contracts = await _context.Set<LeaseContract>().ToListAsync();

        DateTime start = startDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        DateTime end = endDate ?? DateTime.UtcNow;

        (decimal OccupancyRate, decimal RentedArea, int RentedUnitsCount, int TotalBuildingsCount, decimal RentableAreaAtDate) CalculateMetricsAtDate(DateTime date)
        {
            var activeBuildingsAtDate = buildings.Where(b => b.DeliveryDate == null || b.DeliveryDate <= date).ToList();
            var activeBuildingIds = activeBuildingsAtDate.Select(b => b.Id).ToList();
            var activeUnitsAtDate = units.Where(u => activeBuildingIds.Contains(u.BuildingId)).ToList();
            var rentableAreaAtDate = activeUnitsAtDate.Sum(u => u.Area);
            var activeContractsAtDate = contracts.Where(c => (c.Status == "Active" || c.Status == "Renewed") && c.StartDate <= date && c.EndDate >= date).ToList();
            var rentedUnitIdsAtDate = activeContractsAtDate.SelectMany(c => c.UnitIds).Distinct().ToList();
            var rentedUnitsAtDate = activeUnitsAtDate.Where(u => rentedUnitIdsAtDate.Contains(u.Id)).ToList();
            var rentedAreaAtDate = rentedUnitsAtDate.Sum(u => u.Area);
            var occupancyRateAtDate = rentableAreaAtDate > 0 ? (decimal)Math.Round((double)(rentedAreaAtDate / rentableAreaAtDate * 100), 2) : 0;
            return (occupancyRateAtDate, rentedAreaAtDate, rentedUnitsAtDate.Count, activeBuildingsAtDate.Count, rentableAreaAtDate);
        }

        var (currentOccupancyRate, currentRentedArea, currentRentedUnits, currentTotalBuildings, currentTotalRentableArea) = CalculateMetricsAtDate(end);
        var activeBuildingsAtEnd = buildings.Where(b => b.DeliveryDate == null || b.DeliveryDate <= end).ToList();
        var currentTotalArea = activeBuildingsAtEnd.Sum(b => b.TotalArea);
        var activeBuildingIdsAtEnd = activeBuildingsAtEnd.Select(b => b.Id).ToList();
        var activeUnitsAtEnd = units.Where(u => activeBuildingIdsAtEnd.Contains(u.BuildingId)).ToList();
        var currentTotalUnits = activeUnitsAtEnd.Count;

        var momDate = end.AddMonths(-1);
        var (momOccupancyRate, momRentedArea, _, momTotalBuildings, _) = CalculateMetricsAtDate(momDate);
        var yoyDate = end.AddYears(-1);
        var (yoyOccupancyRate, yoyRentedArea, _, yoyTotalBuildings, _) = CalculateMetricsAtDate(yoyDate);

        double? CalculateGrowth(decimal current, decimal previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0;
            return (double)Math.Round((current - previous) / previous * 100, 2);
        }

        return new AssetStatisticsResponse
        {
            TotalBuildings = currentTotalBuildings, TotalArea = currentTotalArea, TotalUnits = currentTotalUnits,
            AvailableUnits = currentTotalUnits - currentRentedUnits, RentedUnits = currentRentedUnits,
            OccupancyRate = currentOccupancyRate, TotalRentableArea = currentTotalRentableArea, RentedArea = currentRentedArea,
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