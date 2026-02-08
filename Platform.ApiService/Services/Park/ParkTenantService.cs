using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 园区租户管理服务实现
/// </summary>
public class ParkTenantService : IParkTenantService
{
    private readonly IDatabaseOperationFactory<ParkTenant> _tenantFactory;
    private readonly IDatabaseOperationFactory<LeaseContract> _contractFactory;
    private readonly IDatabaseOperationFactory<PropertyUnit> _unitFactory;
    private readonly ILogger<ParkTenantService> _logger;

    /// <summary>
    /// 初始化园区租户管理服务
    /// </summary>
    public ParkTenantService(
        IDatabaseOperationFactory<ParkTenant> tenantFactory,
        IDatabaseOperationFactory<LeaseContract> contractFactory,
        IDatabaseOperationFactory<PropertyUnit> unitFactory,
        ILogger<ParkTenantService> logger)
    {
        _tenantFactory = tenantFactory;
        _contractFactory = contractFactory;
        _unitFactory = unitFactory;
        _logger = logger;
    }

    #region 租户管理

    /// <summary>
    /// 获取租户列表
    /// </summary>
    public async Task<ParkTenantListResponse> GetTenantsAsync(ParkTenantListRequest request)
    {
        var filterBuilder = Builders<ParkTenant>.Filter;
        var filter = filterBuilder.Empty;

        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            filter &= filterBuilder.Or(
                filterBuilder.Regex(t => t.TenantName, new MongoDB.Bson.BsonRegularExpression(search, "i")),
                filterBuilder.Regex(t => t.ContactPerson!, new MongoDB.Bson.BsonRegularExpression(search, "i"))
            );
        }

        if (!string.IsNullOrEmpty(request.Status))
            filter &= filterBuilder.Eq(t => t.Status, request.Status);

        if (!string.IsNullOrEmpty(request.Industry))
            filter &= filterBuilder.Eq(t => t.Industry!, request.Industry);

        var sortBuilder = _tenantFactory.CreateSortBuilder();
        var sort = request.SortOrder?.ToLower() == "asc"
            ? sortBuilder.Ascending(t => t.CreatedAt)
            : sortBuilder.Descending(t => t.CreatedAt);

        var (items, total) = await _tenantFactory.FindPagedAsync(filter, sort.Build(), request.Page, request.PageSize);

        var tenants = new List<ParkTenantDto>();
        foreach (var item in items)
        {
            tenants.Add(await MapToTenantDtoAsync(item));
        }

        return new ParkTenantListResponse { Tenants = tenants, Total = (int)total };
    }

    /// <summary>
    /// 获取租户详情
    /// </summary>
    public async Task<ParkTenantDto?> GetTenantByIdAsync(string id)
    {
        var tenant = await _tenantFactory.GetByIdAsync(id);
        return tenant != null ? await MapToTenantDtoAsync(tenant) : null;
    }

    /// <summary>
    /// 创建租户
    /// </summary>
    public async Task<ParkTenantDto> CreateTenantAsync(CreateParkTenantRequest request)
    {
        var tenant = new ParkTenant
        {
            TenantName = request.TenantName,
            ContactPerson = request.ContactPerson,
            Phone = request.Phone,
            Email = request.Email,
            Industry = request.Industry,
            BusinessLicense = request.BusinessLicense,
            Address = request.Address,
            EntryDate = request.EntryDate,
            Notes = request.Notes,
            Status = "Active"
        };

        await _tenantFactory.CreateAsync(tenant);
        return await MapToTenantDtoAsync(tenant);
    }

    /// <summary>
    /// 更新租户
    /// </summary>
    public async Task<ParkTenantDto?> UpdateTenantAsync(string id, CreateParkTenantRequest request)
    {
        var tenant = await _tenantFactory.GetByIdAsync(id);
        if (tenant == null) return null;

        tenant.TenantName = request.TenantName;
        tenant.ContactPerson = request.ContactPerson;
        tenant.Phone = request.Phone;
        tenant.Email = request.Email;
        tenant.Industry = request.Industry;
        tenant.BusinessLicense = request.BusinessLicense;
        tenant.Address = request.Address;
        tenant.EntryDate = request.EntryDate;
        tenant.Notes = request.Notes;

        await _tenantFactory.FindOneAndReplaceAsync(Builders<ParkTenant>.Filter.Eq(t => t.Id, id), tenant);
        return await MapToTenantDtoAsync(tenant);
    }

    /// <summary>
    /// 删除租户
    /// </summary>
    public async Task<bool> DeleteTenantAsync(string id)
    {
        // 检查是否有有效合同
        var filter = Builders<LeaseContract>.Filter.And(
            Builders<LeaseContract>.Filter.Eq(c => c.TenantId, id),
            Builders<LeaseContract>.Filter.Eq(c => c.Status, "Active")
        );
        var activeContracts = await _contractFactory.FindAsync(filter);
        if (activeContracts.Any())
            throw new InvalidOperationException("租户存在有效合同，无法删除");

        var result = await _tenantFactory.FindOneAndSoftDeleteAsync(Builders<ParkTenant>.Filter.Eq(t => t.Id, id));
        return result != null;
    }

    private async Task<ParkTenantDto> MapToTenantDtoAsync(ParkTenant tenant)
    {
        var contractFilter = Builders<LeaseContract>.Filter.Eq(c => c.TenantId, tenant.Id);
        var contracts = await _contractFactory.FindAsync(contractFilter);
        var activeContracts = contracts.Where(c => c.Status == "Active").ToList();

        decimal totalArea = 0;
        if (tenant.UnitIds != null && tenant.UnitIds.Any())
        {
            var unitFilter = Builders<PropertyUnit>.Filter.In(u => u.Id, tenant.UnitIds);
            var units = await _unitFactory.FindAsync(unitFilter);
            totalArea = units.Sum(u => u.Area);
        }

        return new ParkTenantDto
        {
            Id = tenant.Id,
            TenantName = tenant.TenantName,
            ContactPerson = tenant.ContactPerson,
            Phone = tenant.Phone,
            Email = tenant.Email,
            Industry = tenant.Industry,
            Status = tenant.Status,
            EntryDate = tenant.EntryDate,
            UnitCount = tenant.UnitIds?.Count ?? 0,
            TotalArea = totalArea,
            ActiveContracts = activeContracts.Count,
            CreatedAt = tenant.CreatedAt
        };
    }

    #endregion

    #region 合同管理

    /// <summary>
    /// 获取合同列表
    /// </summary>
    public async Task<LeaseContractListResponse> GetContractsAsync(LeaseContractListRequest request)
    {
        var filterBuilder = Builders<LeaseContract>.Filter;
        var filter = filterBuilder.Empty;

        if (!string.IsNullOrEmpty(request.TenantId))
            filter &= filterBuilder.Eq(c => c.TenantId, request.TenantId);

        if (!string.IsNullOrEmpty(request.Search))
        {
            filter &= filterBuilder.Regex(c => c.ContractNumber, new MongoDB.Bson.BsonRegularExpression(request.Search, "i"));
        }

        if (!string.IsNullOrEmpty(request.Status))
            filter &= filterBuilder.Eq(c => c.Status, request.Status);

        if (request.ExpiringWithin30Days == true)
        {
            var threshold = DateTime.UtcNow.AddDays(30);
            filter &= filterBuilder.And(
                filterBuilder.Lte(c => c.EndDate, threshold),
                filterBuilder.Eq(c => c.Status, "Active")
            );
        }

        var sortBuilder = _contractFactory.CreateSortBuilder();
        var sort = request.SortOrder?.ToLower() == "asc"
            ? sortBuilder.Ascending(c => c.CreatedAt)
            : sortBuilder.Descending(c => c.CreatedAt);

        var (items, total) = await _contractFactory.FindPagedAsync(filter, sort.Build(), request.Page, request.PageSize);

        var contracts = new List<LeaseContractDto>();
        foreach (var item in items)
        {
            contracts.Add(await MapToContractDtoAsync(item));
        }

        return new LeaseContractListResponse { Contracts = contracts, Total = (int)total };
    }

    /// <summary>
    /// 获取合同详情
    /// </summary>
    public async Task<LeaseContractDto?> GetContractByIdAsync(string id)
    {
        var contract = await _contractFactory.GetByIdAsync(id);
        return contract != null ? await MapToContractDtoAsync(contract) : null;
    }

    /// <summary>
    /// 创建合同
    /// </summary>
    public async Task<LeaseContractDto> CreateContractAsync(CreateLeaseContractRequest request)
    {
        var contract = new LeaseContract
        {
            TenantId = request.TenantId,
            ContractNumber = request.ContractNumber,
            UnitIds = request.UnitIds,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            MonthlyRent = request.MonthlyRent,
            Deposit = request.Deposit,
            PaymentCycle = request.PaymentCycle ?? "Monthly",
            PaymentDay = request.PaymentDay,
            Terms = request.Terms,
            Attachments = request.Attachments,
            Status = "Active"
        };

        await _contractFactory.CreateAsync(contract);

        // 更新租户的单元列表
        var tenant = await _tenantFactory.GetByIdAsync(request.TenantId);
        if (tenant != null)
        {
            tenant.UnitIds ??= new List<string>();
            foreach (var unitId in request.UnitIds)
            {
                if (!tenant.UnitIds.Contains(unitId))
                {
                    tenant.UnitIds.Add(unitId);
                }
            }
            await _tenantFactory.FindOneAndReplaceAsync(Builders<ParkTenant>.Filter.Eq(t => t.Id, tenant.Id), tenant);

            // 更新房源状态
            foreach (var unitId in request.UnitIds)
            {
                var unit = await _unitFactory.GetByIdAsync(unitId);
                if (unit != null)
                {
                    unit.Status = "Rented";
                    unit.CurrentTenantId = tenant.Id;
                    unit.LeaseStartDate = request.StartDate;
                    unit.LeaseEndDate = request.EndDate;
                    await _unitFactory.FindOneAndReplaceAsync(Builders<PropertyUnit>.Filter.Eq(u => u.Id, unit.Id), unit);
                }
            }
        }

        return await MapToContractDtoAsync(contract);
    }

    /// <summary>
    /// 更新合同
    /// </summary>
    public async Task<LeaseContractDto?> UpdateContractAsync(string id, CreateLeaseContractRequest request)
    {
        var contract = await _contractFactory.GetByIdAsync(id);
        if (contract == null) return null;

        contract.TenantId = request.TenantId;
        contract.ContractNumber = request.ContractNumber;
        contract.UnitIds = request.UnitIds;
        contract.StartDate = request.StartDate;
        contract.EndDate = request.EndDate;
        contract.MonthlyRent = request.MonthlyRent;
        contract.Deposit = request.Deposit;
        contract.PaymentCycle = request.PaymentCycle ?? contract.PaymentCycle;
        contract.PaymentDay = request.PaymentDay;
        contract.Terms = request.Terms;
        contract.Attachments = request.Attachments;

        await _contractFactory.FindOneAndReplaceAsync(Builders<LeaseContract>.Filter.Eq(c => c.Id, id), contract);
        return await MapToContractDtoAsync(contract);
    }

    /// <summary>
    /// 删除合同
    /// </summary>
    public async Task<bool> DeleteContractAsync(string id)
    {
        var contract = await _contractFactory.GetByIdAsync(id);
        if (contract == null) return false;

        if (contract.Status == "Active")
            throw new InvalidOperationException("有效合同无法删除，请先终止合同");

        var result = await _contractFactory.FindOneAndSoftDeleteAsync(Builders<LeaseContract>.Filter.Eq(c => c.Id, id));
        return result != null;
    }

    /// <summary>
    /// 续签合同
    /// </summary>
    public async Task<LeaseContractDto?> RenewContractAsync(string id, CreateLeaseContractRequest request)
    {
        var oldContract = await _contractFactory.GetByIdAsync(id);
        if (oldContract == null) return null;

        // 将旧合同标记为已续签
        oldContract.Status = "Renewed";
        await _contractFactory.FindOneAndReplaceAsync(Builders<LeaseContract>.Filter.Eq(c => c.Id, id), oldContract);

        // 创建新合同
        var result = await CreateContractAsync(request);
        return result;
    }

    private async Task<LeaseContractDto> MapToContractDtoAsync(LeaseContract contract)
    {
        var tenant = await _tenantFactory.GetByIdAsync(contract.TenantId);
        var daysUntilExpiry = (contract.EndDate - DateTime.UtcNow).Days;

        return new LeaseContractDto
        {
            Id = contract.Id,
            TenantId = contract.TenantId,
            TenantName = tenant?.TenantName,
            ContractNumber = contract.ContractNumber,
            UnitIds = contract.UnitIds,
            StartDate = contract.StartDate,
            EndDate = contract.EndDate,
            MonthlyRent = contract.MonthlyRent,
            Deposit = contract.Deposit,
            PaymentCycle = contract.PaymentCycle,
            Status = contract.Status,
            DaysUntilExpiry = daysUntilExpiry,
            CreatedAt = contract.CreatedAt
        };
    }

    #endregion

    #region 统计

    /// <summary>
    /// 获取租户统计数据
    /// </summary>
    public async Task<TenantStatisticsResponse> GetStatisticsAsync(StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null)
    {
        var tenants = await _tenantFactory.FindAsync();
        var contracts = await _contractFactory.FindAsync();

        DateTime end = endDate ?? DateTime.UtcNow;
        DateTime start;

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

        // Get contracts active during the period
        var activeContracts = contracts.Where(c => c.Status == "Active" || (c.StartDate <= end && c.EndDate >= start)).ToList();

        // Use a 30 day window from the *end* of the period or just stick to "expiring soon from now"?
        // Usually "Expiring Soon" is relative to "Now" for alerts. But for reports, maybe "Expired in this period"?
        // Let's stick to "Expiring within 30 days from NOW" as it's an alert metric usually.
        // Or if start/end is provided, maybe "Expiring in this period"?
        // Let's keep existing logic for ExpiringContracts relative to NOW, but filter ActiveContracts based on period if Custom.

        // Actually, let's just make it simple: filtering "active" contracts based on period intersection if Custom.
        // If period is not Custom (current snapshot), use "Active" status.

        if (period == StatisticsPeriod.Custom && startDate.HasValue)
        {
            activeContracts = contracts.Where(c => c.StartDate <= end && c.EndDate >= start).ToList();
        }
        else
        {
            activeContracts = contracts.Where(c => c.Status == "Active").ToList();
        }

        // Filter tenants that entered during the period (Flow)
        var newTenantsInPeriod = tenants.Where(t => t.EntryDate.HasValue && t.EntryDate.Value >= start && t.EntryDate.Value <= end).ToList();

        // Filter tenants that existed at the end of the period (Stock)
        // Note: Using CreatedAt or EntryDate to determine existence. Assuming EntryDate is more business-relevant.
        // If EntryDate is null, fallback to CreatedAt.
        var allTenantsAtEnd = tenants.Where(t => (t.EntryDate ?? t.CreatedAt) <= end).ToList();

        // Total Contracts = Contracts starting in this period
        var newContractsInPeriod = contracts.Where(c => c.StartDate >= start && c.StartDate <= end).ToList();

        // Active Contracts = Contracts active during the period (Overlap) - ALREADY CALCULATED in activeContracts variable

        // Expiring Contracts = Contracts ending in this period
        var expiringContracts = contracts.Count(c => c.EndDate >= start && c.EndDate <= end);

        // Helper to calculate stock metrics at a specific date
        (int ActiveTenants, decimal MonthlyRent) CalculateMetricsAtDate(DateTime date)
        {
            var activeTenants = tenants.Count(t => (t.EntryDate ?? t.CreatedAt) <= date && t.Status == "Active");
            var activeContracts = contracts.Where(c => c.Status == "Active" && c.StartDate <= date && (c.EndDate >= date || c.EndDate == null)).ToList();
            // Note: simple "Active" check might not work for historical dates if status is updated on DB.
            // But we don't have historical status tracking in this simple model.
            // We can approximate by checking date ranges.
            // Improved approximation:
            var contractsActiveAtDate = contracts.Where(c => c.StartDate <= date && c.EndDate >= date).ToList();
            var monthlyRent = contractsActiveAtDate.Sum(c => c.MonthlyRent);

            // For tenants, "Status == Active" is current state. Historical state is hard.
            // Using "EntryDate <= date" gives us total tenants. "Active" is hard.
            // Assuming most tenants stay active, or using EntryDate <= date as proxy for "Total Tenants at date".
            // Let's use (EntryDate <= date) as "Total Tenants".
            // If we strictly want "ActiveTenants", we'd need history.
            // Let's assume (EntryDate <= date) * (Current Active Rate)? No.
            // Let's use `tenants.Count(t => (t.EntryDate ?? t.CreatedAt) <= date)` as base for comparison?
            // User asks for "ActiveTenantsYoY".
            // Let's use "Total Tenants" for comparison if "Active" cannot be determined historically.
            // Actually, comparing Total Tenants (Stock) is safer.
            // But let's try to query contracts to see who was active.
            // Construct set of TenantIds from active contracts at that date.
            var tenantIdsWithActiveContracts = contractsActiveAtDate.Select(c => c.TenantId).Distinct().ToList();
            var activeTenantsCount = tenants.Count(t => tenantIdsWithActiveContracts.Contains(t.Id));

            return (activeTenantsCount, monthlyRent);
        }

        var (currentActiveTenants, currentMonthlyRent) = (activeContracts.Count > 0 ? activeContracts.Select(c => c.TenantId).Distinct().Count() : 0, activeContracts.Sum(c => c.MonthlyRent));
        // Better to use the helper ensuring consistency
        var (calcActiveTenants, calcMonthlyRent) = CalculateMetricsAtDate(end);

        // Re-aligning with current logic:
        // Current logic uses `allTenantsAtEnd.Count(t => t.Status == "Active")` which relies on CURRENT status.
        // This is incorrect for historical.
        // So the Helper approach using Contracts to determine "Active" at that time is BETTER.
        // It's more accurate than using current status flag.

        var momDate = end.AddMonths(-1);
        var (momActiveTenants, momMonthlyRent) = CalculateMetricsAtDate(momDate);

        var yoyDate = end.AddYears(-1);
        var (yoyActiveTenants, yoyMonthlyRent) = CalculateMetricsAtDate(yoyDate);

        double? CalculateGrowth(decimal current, decimal previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0;
            return (double)Math.Round((current - previous) / previous * 100, 2);
        }

        return new TenantStatisticsResponse
        {
            TotalTenants = allTenantsAtEnd.Count,
            ActiveTenants = calcActiveTenants, // use calculated value based on contracts for consistency with YoY
            TotalContracts = contracts.Count(c => c.StartDate <= end),
            ActiveContracts = activeContracts.Count,
            ExpiringContracts = expiringContracts,
            TotalMonthlyRent = calcMonthlyRent, // use calculated value
            TenantsByIndustry = allTenantsAtEnd
                .Where(t => !string.IsNullOrEmpty(t.Industry))
                .GroupBy(t => t.Industry!)
                .ToDictionary(g => g.Key, g => g.Count()),
            MonthlyRentYoY = CalculateGrowth(calcMonthlyRent, yoyMonthlyRent),
            MonthlyRentMoM = CalculateGrowth(calcMonthlyRent, momMonthlyRent),
            ActiveTenantsYoY = CalculateGrowth((decimal)calcActiveTenants, (decimal)yoyActiveTenants),
            ActiveTenantsMoM = CalculateGrowth((decimal)calcActiveTenants, (decimal)momActiveTenants)
        };
    }

    #endregion
}
