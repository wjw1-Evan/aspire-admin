using System.Linq.Dynamic.Core;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface IParkAssetService
{
    Task<System.Linq.Dynamic.Core.PagedResult<BuildingDto>> GetBuildingsAsync(Platform.ServiceDefaults.Models.ProTableRequest request);
    Task<BuildingDto?> GetBuildingByIdAsync(string id);
    Task<BuildingDto> CreateBuildingAsync(CreateBuildingRequest request);
    Task<BuildingDto?> UpdateBuildingAsync(string id, UpdateBuildingRequest request);
    Task<bool> DeleteBuildingAsync(string id);
    Task<System.Linq.Dynamic.Core.PagedResult<PropertyUnitDto>> GetPropertyUnitsAsync(Platform.ServiceDefaults.Models.ProTableRequest request);
    Task<PropertyUnitDto?> GetPropertyUnitByIdAsync(string id);
    Task<PropertyUnitDto> CreatePropertyUnitAsync(CreatePropertyUnitRequest request);
    Task<PropertyUnitDto?> UpdatePropertyUnitAsync(string id, CreatePropertyUnitRequest request);
    Task<bool> DeletePropertyUnitAsync(string id);
    Task<AssetStatisticsResponse> GetAssetStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null);
}

public interface IParkInvestmentService
{
    Task<System.Linq.Dynamic.Core.PagedResult<InvestmentLeadDto>> GetLeadsAsync(Platform.ServiceDefaults.Models.ProTableRequest request);
    Task<InvestmentLeadDto?> GetLeadByIdAsync(string id);
    Task<InvestmentLeadDto> CreateLeadAsync(CreateInvestmentLeadRequest request);
    Task<InvestmentLeadDto?> UpdateLeadAsync(string id, CreateInvestmentLeadRequest request);
    Task<bool> DeleteLeadAsync(string id);
    Task<InvestmentProjectDto?> ConvertLeadToProjectAsync(string leadId);
    Task<System.Linq.Dynamic.Core.PagedResult<InvestmentProjectDto>> GetProjectsAsync(Platform.ServiceDefaults.Models.ProTableRequest request);
    Task<InvestmentProjectDto?> GetProjectByIdAsync(string id);
    Task<InvestmentProjectDto> CreateProjectAsync(CreateInvestmentProjectRequest request);
    Task<InvestmentProjectDto?> UpdateProjectAsync(string id, CreateInvestmentProjectRequest request);
    Task<bool> DeleteProjectAsync(string id);
    Task<InvestmentStatisticsResponse> GetStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null);
}

public interface IParkTenantService
{
    Task<System.Linq.Dynamic.Core.PagedResult<ParkTenantDto>> GetTenantsAsync(Platform.ServiceDefaults.Models.ProTableRequest request);
    Task<ParkTenantDto?> GetTenantByIdAsync(string id);
    Task<ParkTenantDto> CreateTenantAsync(CreateParkTenantRequest request);
    Task<ParkTenantDto?> UpdateTenantAsync(string id, CreateParkTenantRequest request);
    Task<bool> DeleteTenantAsync(string id);
    Task<System.Linq.Dynamic.Core.PagedResult<LeaseContractDto>> GetContractsAsync(Platform.ServiceDefaults.Models.ProTableRequest request, string? tenantId = null);
    Task<LeaseContractDto?> GetContractByIdAsync(string id);
    Task<LeaseContractDto> CreateContractAsync(CreateLeaseContractRequest request);
    Task<LeaseContractDto?> UpdateContractAsync(string id, CreateLeaseContractRequest request);
    Task<bool> DeleteContractAsync(string id);
    Task<LeaseContractDto?> RenewContractAsync(string id, CreateLeaseContractRequest request);
    Task<TenantStatisticsResponse> GetStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null);
    Task<LeasePaymentRecordDto> CreatePaymentRecordAsync(CreateLeasePaymentRecordRequest request);
    Task<List<LeasePaymentRecordDto>> GetPaymentRecordsByContractIdAsync(string contractId);
    Task<bool> DeletePaymentRecordAsync(string id);
}

public interface IParkEnterpriseServiceService
{
    Task<System.Linq.Dynamic.Core.PagedResult<ServiceRequestDto>> GetRequestsAsync(Platform.ServiceDefaults.Models.ProTableRequest request, string? tenantId = null);
    Task<ServiceRequestDto?> GetRequestByIdAsync(string id);
    Task<ServiceRequestDto> CreateRequestAsync(CreateServiceRequestRequest request);
    Task<ServiceRequestDto?> UpdateRequestAsync(string id, CreateServiceRequestRequest request);
    Task<ServiceRequestDto?> UpdateRequestStatusAsync(string id, UpdateServiceRequestStatusRequest request);
    Task<bool> DeleteRequestAsync(string id);
    Task<bool> DeleteStatusHistoryAsync(string id, int index);
    Task<bool> RateRequestAsync(string id, int rating, string? feedback);
    Task<SuggestCategoryResponse> SuggestCategoryAsync(string description);
    Task<ServiceStatisticsResponse> GetStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null);
}

public interface IParkStatisticsService
{
    Task<string> GenerateAiReportAsync(DateTime? startDate = null, DateTime? endDate = null, object? statisticsData = null, string? culture = "zh-CN");
}
