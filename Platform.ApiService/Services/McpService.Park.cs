using System.Text.Json;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public partial class McpService
{
    #region 园区管理模块工具处理方法

    private async Task<object> HandleGetParkBuildingsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new BuildingListRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null
        };
        return await _parkAssetService.GetBuildingsAsync(request);
    }

    private async Task<object> HandleGetParkLeadsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new InvestmentLeadListRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null
        };
        return await _parkInvestmentService.GetLeadsAsync(request);
    }

    private async Task<object> HandleCreateParkLeadAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var request = new CreateInvestmentLeadRequest
        {
            CompanyName = arguments.GetValueOrDefault("companyName")?.ToString() ?? "",
            ContactPerson = arguments.GetValueOrDefault("contactPerson")?.ToString(),
            Phone = arguments.GetValueOrDefault("phone")?.ToString(),
            Source = arguments.GetValueOrDefault("source")?.ToString(),
            Requirements = arguments.GetValueOrDefault("requirements")?.ToString()
        };
        return await _parkInvestmentService.CreateLeadAsync(request);
    }

    private async Task<object> HandleUpdateParkLeadAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var leadId = arguments.GetValueOrDefault("leadId")?.ToString();
        if (string.IsNullOrEmpty(leadId)) throw new ArgumentException("leadId is required");

        var request = new CreateInvestmentLeadRequest
        {
            CompanyName = arguments.GetValueOrDefault("companyName")?.ToString() ?? ""
        };
        return await _parkInvestmentService.UpdateLeadAsync(leadId, request);
    }

    private async Task<object> HandleDeleteParkLeadAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var leadId = arguments.GetValueOrDefault("leadId")?.ToString();
        if (string.IsNullOrEmpty(leadId)) throw new ArgumentException("leadId is required");
        return await _parkInvestmentService.DeleteLeadAsync(leadId);
    }

    private async Task<object> HandleConvertParkLeadToProjectAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var leadId = arguments.GetValueOrDefault("leadId")?.ToString();
        if (string.IsNullOrEmpty(leadId)) throw new ArgumentException("leadId is required");
        return await _parkInvestmentService.ConvertLeadToProjectAsync(leadId);
    }

    private async Task<object> HandleGetParkTenantsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new ParkTenantListRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null
        };
        return await _parkTenantService.GetTenantsAsync(request);
    }

    private async Task<object> HandleGetParkContractsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new LeaseContractListRequest
        {
            Page = page,
            PageSize = pageSize,
            Status = arguments.ContainsKey("status") ? arguments["status"]?.ToString() : null
        };
        return await _parkTenantService.GetContractsAsync(request);
    }

    private async Task<object> HandleCreateParkContractAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var request = new CreateLeaseContractRequest
        {
            TenantId = arguments.GetValueOrDefault("tenantId")?.ToString() ?? "",
            ContractNumber = arguments.GetValueOrDefault("contractNumber")?.ToString() ?? "",
            StartDate = arguments.ContainsKey("startDate") && DateTime.TryParse(arguments["startDate"]?.ToString(), out var sd) ? sd : DateTime.UtcNow,
            EndDate = arguments.ContainsKey("endDate") && DateTime.TryParse(arguments["endDate"]?.ToString(), out var ed) ? ed : DateTime.UtcNow.AddYears(1),
            MonthlyRent = arguments.ContainsKey("monthlyRent") && decimal.TryParse(arguments["monthlyRent"]?.ToString(), out var mr) ? mr : 0
        };
        return await _parkTenantService.CreateContractAsync(request);
    }

    private async Task<object> HandleUpdateParkContractAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var contractId = arguments.GetValueOrDefault("contractId")?.ToString();
        if (string.IsNullOrEmpty(contractId)) throw new ArgumentException("contractId is required");

        var request = new CreateLeaseContractRequest
        {
            TenantId = arguments.GetValueOrDefault("tenantId")?.ToString() ?? ""
        };
        return await _parkTenantService.UpdateContractAsync(contractId, request);
    }

    private async Task<object> HandleDeleteParkContractAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var contractId = arguments.GetValueOrDefault("contractId")?.ToString();
        if (string.IsNullOrEmpty(contractId)) throw new ArgumentException("contractId is required");
        return await _parkTenantService.DeleteContractAsync(contractId);
    }

    private async Task<object> HandleGetParkVisitTasksAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new VisitTaskListRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null,
            Status = arguments.ContainsKey("status") ? arguments["status"]?.ToString() : null
        };
        return await _parkVisitService.GetVisitTasksAsync(request);
    }

    private async Task<object> HandleCreateParkVisitTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var request = new CreateVisitTaskRequest
        {
            Title = arguments.GetValueOrDefault("title")?.ToString() ?? "",
            ManagerName = arguments.GetValueOrDefault("managerName")?.ToString() ?? "",
            VisitDate = arguments.ContainsKey("visitDate") && DateTime.TryParse(arguments["visitDate"]?.ToString(), out var vd) ? vd : DateTime.UtcNow,
            TenantId = arguments.GetValueOrDefault("tenantId")?.ToString(),
            Details = arguments.GetValueOrDefault("details")?.ToString()
        };
        return await _parkVisitService.CreateVisitTaskAsync(request);
    }

    private async Task<object> HandleUpdateParkVisitTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var taskId = arguments.GetValueOrDefault("taskId")?.ToString();
        if (string.IsNullOrEmpty(taskId)) throw new ArgumentException("taskId is required");
        var request = new CreateVisitTaskRequest
        {
            Title = arguments.GetValueOrDefault("title")?.ToString() ?? "",
            ManagerName = arguments.GetValueOrDefault("managerName")?.ToString() ?? "",
            VisitDate = arguments.ContainsKey("visitDate") && DateTime.TryParse(arguments["visitDate"]?.ToString(), out var vd) ? vd : DateTime.UtcNow
        };
        return await _parkVisitService.UpdateVisitTaskAsync(taskId, request);
    }

    private async Task<object> HandleDeleteParkVisitTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var taskId = arguments.GetValueOrDefault("taskId")?.ToString();
        if (string.IsNullOrEmpty(taskId)) throw new ArgumentException("taskId is required");
        return await _parkVisitService.DeleteVisitTaskAsync(taskId);
    }

    private async Task<object> HandleGetParkVisitStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        return await _parkVisitService.GetVisitStatisticsAsync();
    }

    #endregion

    #region 园区企业服务相关处理方法

    private async Task<object> HandleGetParkServiceCategoriesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        return await _parkEnterpriseService.GetCategoriesAsync();
    }

    private async Task<object> HandleGetParkServiceRequestsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new ServiceRequestListRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null,
            Status = arguments.ContainsKey("status") ? arguments["status"]?.ToString() : null,
            CategoryId = arguments.ContainsKey("categoryId") ? arguments["categoryId"]?.ToString() : null
        };
        return await _parkEnterpriseService.GetRequestsAsync(request);
    }

    private async Task<object> HandleGetParkServiceRequestDetailAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.TryGetValue("requestId", out var idObj) || idObj?.ToString() is not string requestId)
        {
            return new { error = "缺少必需的参数: requestId" };
        }
        var detail = await _parkEnterpriseService.GetRequestByIdAsync(requestId);
        if (detail == null) return new { error = "服务申请未找到" };
        return detail;
    }

    private async Task<object> HandleCreateParkServiceRequestAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var request = new CreateServiceRequestRequest
        {
            CategoryId = arguments.GetValueOrDefault("categoryId")?.ToString() ?? "",
            TenantId = arguments.GetValueOrDefault("tenantId")?.ToString() ?? "",
            Title = arguments.GetValueOrDefault("title")?.ToString() ?? "",
            Description = arguments.GetValueOrDefault("description")?.ToString()
        };
        return await _parkEnterpriseService.CreateRequestAsync(request);
    }

    private async Task<object> HandleUpdateParkServiceRequestStatusAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var requestId = arguments.GetValueOrDefault("requestId")?.ToString();
        if (string.IsNullOrEmpty(requestId)) throw new ArgumentException("requestId is required");

        var request = new UpdateServiceRequestStatusRequest
        {
            Status = arguments.GetValueOrDefault("status")?.ToString() ?? "",
            Resolution = arguments.GetValueOrDefault("resolution")?.ToString()
        };
        return await _parkEnterpriseService.UpdateRequestStatusAsync(requestId, request);
    }

    private async Task<object> HandleDeleteParkServiceRequestAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var requestId = arguments.GetValueOrDefault("requestId")?.ToString();
        if (string.IsNullOrEmpty(requestId)) throw new ArgumentException("requestId is required");
        return await _parkEnterpriseService.DeleteRequestAsync(requestId);
    }

    private async Task<object> HandleRateParkServiceRequestAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var requestId = arguments.GetValueOrDefault("requestId")?.ToString();
        if (string.IsNullOrEmpty(requestId)) throw new ArgumentException("requestId is required");

        var ratingStr = arguments.GetValueOrDefault("rating")?.ToString();
        if (!int.TryParse(ratingStr, out var rating)) rating = 5;

        var feedback = arguments.GetValueOrDefault("feedback")?.ToString();
        return await _parkEnterpriseService.RateRequestAsync(requestId, rating, feedback);
    }

    private async Task<object> HandleGetParkServiceStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        return await _parkEnterpriseService.GetStatisticsAsync();
    }

    #endregion
}
