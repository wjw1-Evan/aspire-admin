using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 园区资产管理服务接口
/// </summary>
public interface IParkAssetService
{
    /// <summary>
    /// 获取楼宇列表
    /// </summary>
    Task<BuildingListResponse> GetBuildingsAsync(BuildingListRequest request);

    /// <summary>
    /// 根据ID获取楼宇详情
    /// </summary>
    Task<BuildingDto?> GetBuildingByIdAsync(string id);

    /// <summary>
    /// 创建楼宇
    /// </summary>
    Task<BuildingDto> CreateBuildingAsync(CreateBuildingRequest request);

    /// <summary>
    /// 更新楼宇详情
    /// </summary>
    Task<BuildingDto?> UpdateBuildingAsync(string id, UpdateBuildingRequest request);

    /// <summary>
    /// 删除楼宇
    /// </summary>
    Task<bool> DeleteBuildingAsync(string id);

    /// <summary>
    /// 获取房源列表
    /// </summary>
    Task<PropertyUnitListResponse> GetPropertyUnitsAsync(PropertyUnitListRequest request);

    /// <summary>
    /// 根据ID获取房源详情
    /// </summary>
    Task<PropertyUnitDto?> GetPropertyUnitByIdAsync(string id);

    /// <summary>
    /// 创建房源
    /// </summary>
    Task<PropertyUnitDto> CreatePropertyUnitAsync(CreatePropertyUnitRequest request);

    /// <summary>
    /// 更新房源详情
    /// </summary>
    Task<PropertyUnitDto?> UpdatePropertyUnitAsync(string id, CreatePropertyUnitRequest request);

    /// <summary>
    /// 删除房源
    /// </summary>
    Task<bool> DeletePropertyUnitAsync(string id);

    /// <summary>
    /// 获取资产统计数据
    /// </summary>
    Task<AssetStatisticsResponse> GetAssetStatisticsAsync(StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null);
}

/// <summary>
/// 园区招商管理服务接口
/// </summary>
public interface IParkInvestmentService
{
    /// <summary>
    /// 获取招商线索列表
    /// </summary>
    Task<InvestmentLeadListResponse> GetLeadsAsync(InvestmentLeadListRequest request);

    /// <summary>
    /// 根据ID获取线索详情
    /// </summary>
    Task<InvestmentLeadDto?> GetLeadByIdAsync(string id);

    /// <summary>
    /// 创建招商线索
    /// </summary>
    Task<InvestmentLeadDto> CreateLeadAsync(CreateInvestmentLeadRequest request);

    /// <summary>
    /// 更新招商线索
    /// </summary>
    Task<InvestmentLeadDto?> UpdateLeadAsync(string id, CreateInvestmentLeadRequest request);

    /// <summary>
    /// 删除招商线索
    /// </summary>
    Task<bool> DeleteLeadAsync(string id);

    /// <summary>
    /// 将线索转换为项目
    /// </summary>
    Task<InvestmentProjectDto?> ConvertLeadToProjectAsync(string leadId);

    /// <summary>
    /// 获取招商项目列表
    /// </summary>
    Task<InvestmentProjectListResponse> GetProjectsAsync(InvestmentProjectListRequest request);

    /// <summary>
    /// 根据ID获取项目详情
    /// </summary>
    Task<InvestmentProjectDto?> GetProjectByIdAsync(string id);

    /// <summary>
    /// 创建招商项目
    /// </summary>
    Task<InvestmentProjectDto> CreateProjectAsync(CreateInvestmentProjectRequest request);

    /// <summary>
    /// 更新招商项目
    /// </summary>
    Task<InvestmentProjectDto?> UpdateProjectAsync(string id, CreateInvestmentProjectRequest request);

    /// <summary>
    /// 删除招商项目
    /// </summary>
    Task<bool> DeleteProjectAsync(string id);

    /// <summary>
    /// 获取招商统计数据
    /// </summary>
    Task<InvestmentStatisticsResponse> GetStatisticsAsync(StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null);
}

/// <summary>
/// 园区租户管理服务接口
/// </summary>
public interface IParkTenantService
{
    /// <summary>
    /// 获取租户列表
    /// </summary>
    Task<ParkTenantListResponse> GetTenantsAsync(ParkTenantListRequest request);

    /// <summary>
    /// 根据ID获取租户详情
    /// </summary>
    Task<ParkTenantDto?> GetTenantByIdAsync(string id);

    /// <summary>
    /// 创建租户
    /// </summary>
    Task<ParkTenantDto> CreateTenantAsync(CreateParkTenantRequest request);

    /// <summary>
    /// 更新租户详情
    /// </summary>
    Task<ParkTenantDto?> UpdateTenantAsync(string id, CreateParkTenantRequest request);

    /// <summary>
    /// 删除租户
    /// </summary>
    Task<bool> DeleteTenantAsync(string id);

    /// <summary>
    /// 获取租赁合同列表
    /// </summary>
    Task<LeaseContractListResponse> GetContractsAsync(LeaseContractListRequest request);

    /// <summary>
    /// 根据ID获取合同详情
    /// </summary>
    Task<LeaseContractDto?> GetContractByIdAsync(string id);

    /// <summary>
    /// 创建租赁合同
    /// </summary>
    Task<LeaseContractDto> CreateContractAsync(CreateLeaseContractRequest request);

    /// <summary>
    /// 更新合同详情
    /// </summary>
    Task<LeaseContractDto?> UpdateContractAsync(string id, CreateLeaseContractRequest request);

    /// <summary>
    /// 删除合同
    /// </summary>
    Task<bool> DeleteContractAsync(string id);

    /// <summary>
    /// 合同续签
    /// </summary>
    Task<LeaseContractDto?> RenewContractAsync(string id, CreateLeaseContractRequest request);

    /// <summary>
    /// 获取租户与合同统计数据
    /// </summary>
    Task<TenantStatisticsResponse> GetStatisticsAsync(StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null);

    /// <summary>
    /// 创建合同付款记录
    /// </summary>
    Task<LeasePaymentRecordDto> CreatePaymentRecordAsync(CreateLeasePaymentRecordRequest request);

    /// <summary>
    /// 获取合同付款记录列表
    /// </summary>
    Task<List<LeasePaymentRecordDto>> GetPaymentRecordsByContractIdAsync(string contractId);

    /// <summary>
    /// 删除合同付款记录
    /// </summary>
    Task<bool> DeletePaymentRecordAsync(string id);
}

/// <summary>
/// 企业服务管理服务接口
/// </summary>
public interface IParkEnterpriseServiceService
{
    /// <summary>
    /// 获取服务类别列表
    /// </summary>
    Task<ServiceCategoryListResponse> GetCategoriesAsync();

    /// <summary>
    /// 创建服务类别
    /// </summary>
    Task<ServiceCategoryDto> CreateCategoryAsync(CreateServiceCategoryRequest request);

    /// <summary>
    /// 更新服务类别
    /// </summary>
    Task<ServiceCategoryDto?> UpdateCategoryAsync(string id, CreateServiceCategoryRequest request);

    /// <summary>
    /// 删除服务类别
    /// </summary>
    Task<bool> DeleteCategoryAsync(string id);

    /// <summary>
    /// 切换服务类别状态
    /// </summary>
    Task<bool> ToggleCategoryStatusAsync(string id);

    /// <summary>
    /// 获取服务申请列表
    /// </summary>
    Task<ServiceRequestListResponse> GetRequestsAsync(ServiceRequestListRequest request);

    /// <summary>
    /// 根据ID获取服务申请详情
    /// </summary>
    Task<ServiceRequestDto?> GetRequestByIdAsync(string id);

    /// <summary>
    /// 创建服务申请
    /// </summary>
    Task<ServiceRequestDto> CreateRequestAsync(CreateServiceRequestRequest request);

    /// <summary>
    /// 更新服务申请状态
    /// </summary>
    Task<ServiceRequestDto?> UpdateRequestStatusAsync(string id, UpdateServiceRequestStatusRequest request);

    /// <summary>
    /// 删除服务申请
    /// </summary>
    Task<bool> DeleteRequestAsync(string id);

    /// <summary>
    /// 服务申请评价
    /// </summary>
    Task<bool> RateRequestAsync(string id, int rating, string? feedback);

    /// <summary>
    /// 获取企业服务统计数据
    /// </summary>
    Task<ServiceStatisticsResponse> GetStatisticsAsync(StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null);
}

/// <summary>
/// 园区统计报表服务接口
/// </summary>
public interface IParkStatisticsService
{
    /// <summary>
    /// 生成 AI 统计报告
    /// </summary>
    Task<string> GenerateAiReportAsync(StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null, object? statisticsData = null);
}
