using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 园区管理 MCP 工具处理器（资产、招商、租户、走访、企业服务）
/// </summary>
public class ParkMcpToolHandler : McpToolHandlerBase
{
    private readonly IParkAssetService _assetService;
    private readonly IParkInvestmentService _investmentService;
    private readonly IParkTenantService _tenantService;
    private readonly IParkVisitService _visitService;
    private readonly IParkEnterpriseServiceService _enterpriseService;
    private readonly ILogger<ParkMcpToolHandler> _logger;

    /// <summary>
    /// 初始化园区管理 MCP 处理器
    /// </summary>
    /// <param name="assetService">资产管理服务</param>
    /// <param name="investmentService">招商管理服务</param>
    /// <param name="tenantService">租户管理服务</param>
    /// <param name="visitService">走访管理服务</param>
    /// <param name="enterpriseService">企业服务管理服务</param>
    /// <param name="logger">日志处理器</param>
    public ParkMcpToolHandler(
        IParkAssetService assetService,
        IParkInvestmentService investmentService,
        IParkTenantService tenantService,
        IParkVisitService visitService,
        IParkEnterpriseServiceService enterpriseService,
        ILogger<ParkMcpToolHandler> logger)
    {
        _assetService = assetService;
        _investmentService = investmentService;
        _tenantService = tenantService;
        _visitService = visitService;
        _enterpriseService = enterpriseService;
        _logger = logger;

        // 楼议/资产
        RegisterTool("get_park_buildings", "获取园区楼宇列表。",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                return await _assetService.GetBuildingsAsync(new BuildingListRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Page = page,
                    PageSize = pageSize
                });
            });

        // 招商线索
        RegisterTool("get_park_leads", "获取园区招商线索列表。",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                return await _investmentService.GetLeadsAsync(new InvestmentLeadListRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Page = page,
                    PageSize = pageSize
                });
            });

        RegisterTool("create_park_lead", "创建新的园区招商线索。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["companyName"] = new Dictionary<string, object> { ["type"] = "string" },
                ["contactPerson"] = new Dictionary<string, object> { ["type"] = "string" },
                ["phone"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["companyName"]),
            async (args, uid) => await _investmentService.CreateLeadAsync(new CreateInvestmentLeadRequest
            {
                CompanyName = args.GetValueOrDefault("companyName")?.ToString() ?? "",
                ContactPerson = args.GetValueOrDefault("contactPerson")?.ToString(),
                Phone = args.GetValueOrDefault("phone")?.ToString()
            }));

        // 租户
        RegisterTool("get_park_tenants", "获取园区租户列表。",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                return await _tenantService.GetTenantsAsync(new ParkTenantListRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Page = page,
                    PageSize = pageSize
                });
            });

        // 合同
        RegisterTool("get_park_contracts", "获取园区租赁合同列表。",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["status"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                return await _tenantService.GetContractsAsync(new LeaseContractListRequest
                {
                    Status = args.GetValueOrDefault("status")?.ToString(),
                    Page = page,
                    PageSize = pageSize
                });
            });

        // 走访
        RegisterTool("get_park_visit_tasks", "获取园区走访任务列表。",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                return await _visitService.GetVisitTasksAsync(new VisitTaskListRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Page = page,
                    PageSize = pageSize
                });
            });

        // 企业服务
        RegisterTool("get_park_service_requests", "获取园区企业服务申请列表。",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["status"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                return await _enterpriseService.GetRequestsAsync(new ServiceRequestListRequest
                {
                    Status = args.GetValueOrDefault("status")?.ToString(),
                    Page = page,
                    PageSize = pageSize
                });
            });
    }
}
