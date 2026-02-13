using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 园区租户管理服务实现
/// </summary>
public class ParkTenantService : IParkTenantService
{
    private readonly IDataFactory<ParkTenant> _tenantFactory;
    private readonly IDataFactory<LeaseContract> _contractFactory;
    private readonly IDataFactory<PropertyUnit> _unitFactory;
    private readonly IDataFactory<LeasePaymentRecord> _paymentFactory;
    private readonly ILogger<ParkTenantService> _logger;

    /// <summary>
    /// 初始化园区租户管理服务
    /// </summary>
    public ParkTenantService(
        IDataFactory<ParkTenant> tenantFactory,
        IDataFactory<LeaseContract> contractFactory,
        IDataFactory<PropertyUnit> unitFactory,
        IDataFactory<LeasePaymentRecord> paymentFactory,
        ILogger<ParkTenantService> logger)
    {
        _tenantFactory = tenantFactory;
        _contractFactory = contractFactory;
        _unitFactory = unitFactory;
        _paymentFactory = paymentFactory;
        _logger = logger;
    }

    #region 租户管理

    /// <summary>
    /// 获取租户列表
    /// </summary>
    public async Task<ParkTenantListResponse> GetTenantsAsync(ParkTenantListRequest request)
    {
        Expression<Func<ParkTenant, bool>> filter = t => true;

        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            filter = CombineFilters(filter, t => t.TenantName.ToLower().Contains(search) || (t.ContactPerson != null && t.ContactPerson.ToLower().Contains(search)));
        }

        if (!string.IsNullOrEmpty(request.Status))
            filter = CombineFilters(filter, t => t.Status == request.Status);

        if (!string.IsNullOrEmpty(request.Industry))
            filter = CombineFilters(filter, t => t.Industry == request.Industry);

        Func<IQueryable<ParkTenant>, IOrderedQueryable<ParkTenant>>? orderBy = null;
        if (request.SortOrder?.ToLower() == "asc")
        {
            orderBy = q => q.OrderBy(t => t.CreatedAt);
        }
        else
        {
            orderBy = q => q.OrderByDescending(t => t.CreatedAt);
        }

        var (items, total) = await _tenantFactory.FindPagedAsync(filter, orderBy, request.Page, request.PageSize);

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

        await _tenantFactory.UpdateAsync(id, tenant => { });
        return await MapToTenantDtoAsync(tenant);
    }

    /// <summary>
    /// 删除租户
    /// </summary>
    public async Task<bool> DeleteTenantAsync(string id)
    {
        // 检查是否有有效合同
        var activeContracts = await _contractFactory.FindAsync(c => c.TenantId == id && c.Status == "Active");
        if (activeContracts.Any())
            throw new InvalidOperationException("租户存在有效合同，无法删除");

        var result = await _tenantFactory.SoftDeleteAsync(id);
        return result;
    }

    private async Task<ParkTenantDto> MapToTenantDtoAsync(ParkTenant tenant)
    {
        var contracts = await _contractFactory.FindAsync(c => c.TenantId == tenant.Id);
        var activeContracts = contracts.Where(c => c.Status == "Active").ToList();

        decimal totalArea = 0;
        if (tenant.UnitIds != null && tenant.UnitIds.Any())
        {
            var units = await _unitFactory.FindAsync(u => tenant.UnitIds.Contains(u.Id));
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
        Expression<Func<LeaseContract, bool>> filter = c => true;

        if (!string.IsNullOrEmpty(request.TenantId))
            filter = CombineFilters(filter, c => c.TenantId == request.TenantId);

        if (!string.IsNullOrEmpty(request.Search))
        {
            var searchLower = request.Search.ToLower();
            filter = CombineFilters(filter, c => c.ContractNumber.ToLower().Contains(searchLower));
        }

        if (!string.IsNullOrEmpty(request.Status))
            filter = CombineFilters(filter, c => c.Status == request.Status);

        if (request.ExpiringWithin30Days == true)
        {
            var threshold = DateTime.UtcNow.AddDays(30);
            filter = CombineFilters(filter, c => c.EndDate <= threshold && c.Status == "Active");
        }

        Func<IQueryable<LeaseContract>, IOrderedQueryable<LeaseContract>>? orderBy = null;
        if (request.SortOrder?.ToLower() == "asc")
        {
            orderBy = q => q.OrderBy(c => c.CreatedAt);
        }
        else
        {
            orderBy = q => q.OrderByDescending(c => c.CreatedAt);
        }

        var (items, total) = await _contractFactory.FindPagedAsync(filter, orderBy, request.Page, request.PageSize);

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
            RentalPricingMethod = request.RentalPricingMethod ?? "FixedMonthly",
            UnitPrice = request.UnitPrice,
            Deposit = request.Deposit,
            PropertyFee = request.PropertyFee,
            TotalAmount = request.TotalAmount,
            PaymentCycle = request.PaymentCycle ?? "Monthly",
            PaymentDay = request.PaymentDay,
            Terms = request.Terms,
            Attachments = request.Attachments,
            Status = "Active"
        };

        // 如果没有提供合同编号，则自动生成
        if (string.IsNullOrWhiteSpace(contract.ContractNumber))
        {
            var dateStr = DateTime.Now.ToString("yyyyMMdd");
            var prefix = $"HT-{dateStr}";
            var count = await _contractFactory.CountAsync(c => c.ContractNumber.StartsWith(prefix));
            contract.ContractNumber = $"HT-{dateStr}-{(count + 1):D3}";
        }

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
            await _tenantFactory.UpdateAsync(tenant.Id, _ => { });

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
                    await _unitFactory.UpdateAsync(unit.Id, _ => { });
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

        var oldUnitIds = contract.UnitIds ?? new List<string>();
        var newUnitIds = request.UnitIds ?? new List<string>();

        // 识别移除的单元和新增的单元
        var removedUnitIds = oldUnitIds.Except(newUnitIds).ToList();
        var addedUnitIds = newUnitIds.Except(oldUnitIds).ToList();

        contract.TenantId = request.TenantId;
        contract.ContractNumber = request.ContractNumber;
        contract.UnitIds = newUnitIds;
        contract.StartDate = request.StartDate;
        contract.EndDate = request.EndDate;
        contract.MonthlyRent = request.MonthlyRent;
        contract.RentalPricingMethod = request.RentalPricingMethod ?? "FixedMonthly";
        contract.UnitPrice = request.UnitPrice;
        contract.Deposit = request.Deposit;
        contract.PropertyFee = request.PropertyFee;
        contract.TotalAmount = request.TotalAmount;
        contract.PaymentCycle = request.PaymentCycle ?? contract.PaymentCycle;
        contract.PaymentDay = request.PaymentDay;
        contract.Terms = request.Terms;
        contract.Attachments = request.Attachments;

        await _contractFactory.UpdateAsync(id, _ => { });

        // 处理移除的单元：恢复为 Available
        foreach (var unitId in removedUnitIds)
        {
            var unit = await _unitFactory.GetByIdAsync(unitId);
            if (unit != null)
            {
                unit.Status = "Available";
                unit.CurrentTenantId = null;
                unit.LeaseStartDate = null;
                unit.LeaseEndDate = null;
                await _unitFactory.UpdateAsync(unit.Id, _ => { });
            }
        }

        // 处理新增的单元：设为 Rented
        foreach (var unitId in addedUnitIds)
        {
            var unit = await _unitFactory.GetByIdAsync(unitId);
            if (unit != null)
            {
                unit.Status = "Rented";
                unit.CurrentTenantId = request.TenantId;
                unit.LeaseStartDate = request.StartDate;
                unit.LeaseEndDate = request.EndDate;
                await _unitFactory.UpdateAsync(unit.Id, _ => { });
            }
        }

        // 更新租户的单元列表
        var tenant = await _tenantFactory.GetByIdAsync(request.TenantId);
        if (tenant != null)
        {
            tenant.UnitIds ??= new List<string>();
            // 移除旧的
            foreach (var unitId in removedUnitIds)
            {
                tenant.UnitIds.Remove(unitId);
            }
            // 添加新的
            foreach (var unitId in addedUnitIds)
            {
                if (!tenant.UnitIds.Contains(unitId))
                {
                    tenant.UnitIds.Add(unitId);
                }
            }
            await _tenantFactory.UpdateAsync(tenant.Id, _ => { });
        }

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

        var result = await _contractFactory.SoftDeleteAsync(id);
        return result;
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
        await _contractFactory.UpdateAsync(id, _ => { });

        // 创建新合同
        var result = await CreateContractAsync(request);
        return result;
    }

    private async Task<LeaseContractDto> MapToContractDtoAsync(LeaseContract contract)
    {
        var tenant = await _tenantFactory.GetByIdAsync(contract.TenantId);
        var daysUntilExpiry = (contract.EndDate - DateTime.UtcNow).Days;

        var unitNumbers = new List<string>();
        if (contract.UnitIds != null && contract.UnitIds.Any())
        {
            var units = await _unitFactory.FindAsync(u => contract.UnitIds.Contains(u.Id));
            unitNumbers = units.Select(u => u.UnitNumber).ToList();
        }

        return new LeaseContractDto
        {
            Id = contract.Id,
            TenantId = contract.TenantId,
            TenantName = tenant?.TenantName ?? string.Empty,
            ContractNumber = contract.ContractNumber,
            UnitIds = contract.UnitIds ?? new List<string>(),
            UnitNumbers = unitNumbers,
            StartDate = contract.StartDate,
            EndDate = contract.EndDate,
            MonthlyRent = contract.MonthlyRent,
            RentalPricingMethod = contract.RentalPricingMethod,
            UnitPrice = contract.UnitPrice,
            Deposit = contract.Deposit,
            PropertyFee = contract.PropertyFee,
            TotalAmount = contract.TotalAmount,
            PaymentCycle = contract.PaymentCycle,
            Status = contract.Status,
            DaysUntilExpiry = daysUntilExpiry,
            Terms = contract.Terms,
            PaymentDay = contract.PaymentDay,
            Attachments = contract.Attachments,
            CreatedAt = contract.CreatedAt,
            PaymentRecords = (await GetPaymentRecordsByContractIdAsync(contract.Id))
        };
    }

    /// <summary>
    /// 创建合同付款记录
    /// </summary>
    public async Task<LeasePaymentRecordDto> CreatePaymentRecordAsync(CreateLeasePaymentRecordRequest request)
    {
        var contract = await _contractFactory.GetByIdAsync(request.ContractId);
        if (contract == null) throw new InvalidOperationException("合同不存在");

        var record = new LeasePaymentRecord
        {
            ContractId = request.ContractId,
            TenantId = contract.TenantId,
            Amount = request.Amount,
            PaymentDate = request.PaymentDate,
            PaymentMethod = request.PaymentMethod,
            PaymentType = request.PaymentType ?? "Rent",
            PeriodStart = request.PeriodStart,
            PeriodEnd = request.PeriodEnd,
            Notes = request.Notes
        };

        await _paymentFactory.CreateAsync(record);
        return MapToPaymentRecordDto(record);
    }

    /// <summary>
    /// 获取合同付款记录列表
    /// </summary>
    public async Task<List<LeasePaymentRecordDto>> GetPaymentRecordsByContractIdAsync(string contractId)
    {
        var records = await _paymentFactory.FindAsync(r => r.ContractId == contractId);
        return records.OrderByDescending(r => r.PaymentDate).Select(MapToPaymentRecordDto).ToList();
    }

    /// <summary>
    /// 删除合同付款记录
    /// </summary>
    public async Task<bool> DeletePaymentRecordAsync(string id)
    {
        return (await _paymentFactory.SoftDeleteManyAsync(r => r.Id == id)) > 0;
    }

    private LeasePaymentRecordDto MapToPaymentRecordDto(LeasePaymentRecord record)
    {
        return new LeasePaymentRecordDto
        {
            Id = record.Id,
            ContractId = record.ContractId,
            TenantId = record.TenantId,
            Amount = record.Amount,
            PaymentDate = record.PaymentDate,
            PaymentMethod = record.PaymentMethod,
            PaymentType = record.PaymentType,
            PeriodStart = record.PeriodStart,
            PeriodEnd = record.PeriodEnd,
            Notes = record.Notes,
            HandledBy = record.HandledBy,
            CreatedAt = record.CreatedAt
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
    /// 获取租户统计数据
    /// </summary>
    public async Task<TenantStatisticsResponse> GetStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        var tenants = await _tenantFactory.FindAsync();
        var contracts = await _contractFactory.FindAsync();
        var payments = await _paymentFactory.FindAsync();

        DateTime end = endDate ?? DateTime.UtcNow;
        DateTime start = startDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        // Get contracts active during the period
        List<LeaseContract> activeContracts;

        // If startDate is provided, filter contracts that overlap with the period
        if (startDate.HasValue)
        {
            activeContracts = contracts.Where(c =>
                (c.Status == "Active" || c.Status == "Renewed") &&
                c.StartDate <= end &&
                c.EndDate >= start).ToList();
        }
        else
        {
            activeContracts = contracts.Where(c => c.Status == "Active" || c.Status == "Renewed").ToList();
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

        // Expiring Contracts = Active contracts ending within 30 days from now (alert metric)
        var now = DateTime.UtcNow;
        var thirtyDaysFromNow = now.AddDays(30);
        var expiringContracts = contracts.Count(c =>
            (c.Status == "Active" || c.Status == "Renewed") &&
            c.EndDate >= now &&
            c.EndDate <= thirtyDaysFromNow);

        // Helper to calculate stock metrics at a specific date
        (int ActiveTenants, decimal MonthlyRent) CalculateMetricsAtDate(DateTime date)
        {
            // For historical dates, we approximate "active" contracts by date range
            // We exclude terminated contracts as they shouldn't count historically
            var contractsActiveAtDate = contracts.Where(c =>
                (c.Status != "Terminated" && c.Status != "Draft") &&
                c.StartDate <= date &&
                c.EndDate >= date).ToList();
            var monthlyRent = contractsActiveAtDate.Sum(c => c.MonthlyRent);

            // Determine active tenants by contracts active at that date
            var tenantIdsWithActiveContracts = contractsActiveAtDate.Select(c => c.TenantId).Distinct().ToList();
            var activeTenantsCount = tenants.Count(t => tenantIdsWithActiveContracts.Contains(t.Id));

            return (activeTenantsCount, monthlyRent);
        }

        var (currentActiveTenants, currentMonthlyRent) = (activeContracts.Count > 0 ? activeContracts.Select(c => c.TenantId).Distinct().Count() : 0, activeContracts.Sum(c => c.MonthlyRent));
        // Better to use the helper ensuring consistency
        var (calcActiveTenants, calcMonthlyRent) = CalculateMetricsAtDate(end);


        var momDate = end.AddMonths(-1);
        var (momActiveTenants, momMonthlyRent) = CalculateMetricsAtDate(momDate);

        var yoyDate = end.AddYears(-1);
        var (yoyActiveTenants, yoyMonthlyRent) = CalculateMetricsAtDate(yoyDate);

        double? CalculateGrowth(decimal current, decimal previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0;
            return (double)Math.Round((current - previous) / previous * 100, 2);
        }

        // Collection Status
        var totalReceived = payments.Where(p => p.PaymentDate >= start && p.PaymentDate <= end).Sum(p => p.Amount);
        decimal totalExpected = 0;
        // Only calculate expected rent from active/renewed contracts (exclude Terminated, Draft, Expired)
        var validContractsForBilling = contracts.Where(c => c.Status == "Active" || c.Status == "Renewed").ToList();
        foreach (var c in validContractsForBilling)
        {
            // Calculate effective overlap duration
            var overlapStart = c.StartDate > start ? c.StartDate : start;
            // Treat Contract EndDate as inclusive (end of that day)
            var cEndInclusive = c.EndDate.Date.AddDays(1).AddTicks(-1);
            var overlapEnd = cEndInclusive < end ? cEndInclusive : end;

            if (overlapStart < overlapEnd)
            {
                // Calculate rent month by month for precision
                var curr = overlapStart;
                while (curr < overlapEnd)
                {
                    var daysInMonth = DateTime.DaysInMonth(curr.Year, curr.Month);
                    // End of the current month
                    var monthEnd = new DateTime(curr.Year, curr.Month, daysInMonth).AddDays(1).AddTicks(-1);

                    // Determine segment end in this month
                    var segmentEnd = overlapEnd < monthEnd ? overlapEnd : monthEnd;

                    // Calculate duration in days (including fractional days)
                    var durationDays = (segmentEnd - curr).TotalDays;

                    // Add pro-rated rent: (Duration / DaysInMonth) * MonthlyRent
                    // We interpret MonthlyRent as price for the full month
                    if (durationDays > 0)
                    {
                        totalExpected += c.MonthlyRent * (decimal)(durationDays / daysInMonth);
                    }

                    // Move to start of next month for next iteration
                    // Ensure we move past the current segment or month end
                    if (segmentEnd >= overlapEnd) break;
                    curr = monthEnd.AddTicks(1);
                }
            }
        }
        var paymentsInPeriod = payments.Where(p => p.PaymentDate >= start && p.PaymentDate <= end).ToList();
        var receivedByPaymentType = paymentsInPeriod
            .GroupBy(p => p.PaymentType ?? "Rent")
            .ToDictionary(g => g.Key, g => g.Sum(p => p.Amount));

        var totalContractAmount = activeContracts.Sum(c => c.TotalAmount ?? 0);

        var collectionRate = totalExpected > 0 ? (double)Math.Round(totalReceived / totalExpected * 100, 2) : 0;

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
            TotalReceived = totalReceived,
            ReceivedByPaymentType = receivedByPaymentType,
            TotalExpected = totalExpected,
            TotalContractAmount = totalContractAmount,
            CollectionRate = collectionRate,
            MonthlyRentYoY = CalculateGrowth(calcMonthlyRent, yoyMonthlyRent),
            MonthlyRentMoM = CalculateGrowth(calcMonthlyRent, momMonthlyRent),
            ActiveTenantsYoY = CalculateGrowth((decimal)calcActiveTenants, (decimal)yoyActiveTenants),
            ActiveTenantsMoM = CalculateGrowth((decimal)calcActiveTenants, (decimal)momActiveTenants)
        };
    }

    #endregion
}
