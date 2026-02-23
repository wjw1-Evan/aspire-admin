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
        RegisterTool("get_park_buildings", "获取园区楼宇资产列表。关键词：园区,楼宇,资产,建筑,房源,楼铺",
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
        RegisterTool("get_park_leads", "获取园区招商线索列表。关键词：园区,招商,线索,潜在客户,商机,意向",
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

        RegisterTool("create_park_lead", "创建新的园区招商线索。关键词：创建线索,录入线索",
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
        RegisterTool("get_park_tenants", "获取园区租户企业列表。关键词：园区,租户,企业,入驻,合同,租约",
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
        RegisterTool("get_park_contracts", "获取园区租赁合同列表。关键词：园区,租赁,合同,到期,续租",
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
        RegisterTool("get_park_visit_tasks", "获取园区经理走访任务列表。关键词：园区,走访,任务,巡检,反馈",
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
        RegisterTool("get_park_service_requests", "获取园区企业服务申请列表。关键词：园区,企业服务,申请,报修,咨询",
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
        // 资产详情与删除
        RegisterTool("get_park_building_detail", "获取指定楼宇的详细信息。支持 ID 或楼宇名称查询。关键词：楼宇详情,查看楼宇",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "楼宇标识 ID" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "楼宇名称" }
            }),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                var name = args.GetValueOrDefault("name")?.ToString();
                if (!string.IsNullOrEmpty(id)) return await _assetService.GetBuildingByIdAsync(id);
                if (!string.IsNullOrEmpty(name))
                {
                    var list = await _assetService.GetBuildingsAsync(new BuildingListRequest { Search = name, Page = 1, PageSize = 1 });
                    if (list.Buildings.Any()) return await _assetService.GetBuildingByIdAsync(list.Buildings.First().Id);
                }
                return new { error = "未找到指定楼宇" };
            });

        RegisterTool("delete_park_building", "删除指定的楼宇资产记录。关键词：删除楼宇",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _assetService.DeleteBuildingAsync(args.GetValueOrDefault("id")?.ToString() ?? ""));

        // 招商线索详情与删除
        RegisterTool("get_park_lead_detail", "获取招商线索的详细资料。支持 ID 或公司名称查询。关键词：线索详情,线索内容",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "线索 ID" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "公司名称" }
            }),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                var name = args.GetValueOrDefault("name")?.ToString();
                if (!string.IsNullOrEmpty(id)) return await _investmentService.GetLeadByIdAsync(id);
                if (!string.IsNullOrEmpty(name))
                {
                    var list = await _investmentService.GetLeadsAsync(new InvestmentLeadListRequest { Search = name, Page = 1, PageSize = 1 });
                    if (list.Leads.Any()) return await _investmentService.GetLeadByIdAsync(list.Leads.First().Id);
                }
                return new { error = "未找到对应招商线索" };
            });

        RegisterTool("delete_park_lead", "删除指定的招商线索。关键词：删除线索",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _investmentService.DeleteLeadAsync(args.GetValueOrDefault("id")?.ToString() ?? ""));

        RegisterTool("convert_park_lead_to_project", "将招商线索转为正式招商项目。关键词：线索转项目",
            ObjectSchema(new Dictionary<string, object> { ["leadId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["leadId"]),
            async (args, uid) => await _investmentService.ConvertLeadToProjectAsync(args.GetValueOrDefault("leadId")?.ToString() ?? ""));

        // 租户详情与删除
        RegisterTool("get_park_tenant_detail", "获取租户企业的详细信息。支持通过租户全名、企业名称或 ID 查询。示例：'显示天津融众的详情'。关键词：租户详情,企业信息,公司资料",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "租户 ID" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "租户名称/企业全称" }
            }),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                var name = args.GetValueOrDefault("name")?.ToString();
                if (!string.IsNullOrEmpty(id)) return await _tenantService.GetTenantByIdAsync(id);
                if (!string.IsNullOrEmpty(name))
                {
                    var list = await _tenantService.GetTenantsAsync(new ParkTenantListRequest { Search = name, Page = 1, PageSize = 1 });
                    if (list.Tenants.Any()) return await _tenantService.GetTenantByIdAsync(list.Tenants.First().Id);
                }
                return new { error = $"未找到名为 '{name}' 的租户记录。请确保名称准确或提供 ID。" };
            });

        RegisterTool("delete_park_tenant", "删除指定的租户企业记录。关键词：删除租户",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _tenantService.DeleteTenantAsync(args.GetValueOrDefault("id")?.ToString() ?? ""));

        // 企业服务申请详情与状态更新
        RegisterTool("get_park_service_request_detail", "获取企业服务申请的详情。关键词：申请详情,报修单详情",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _enterpriseService.GetRequestByIdAsync(args.GetValueOrDefault("id")?.ToString() ?? ""));

        RegisterTool("update_park_service_request_status", "更新企业服务/报修申请的处理状态。关键词：处理申请,标记状态",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "状态: Pending, Processing, Completed, Cancelled" },
                ["resolution"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["id", "status"]),
            async (args, uid) => await _enterpriseService.UpdateRequestStatusAsync(args["id"].ToString()!, new UpdateServiceRequestStatusRequest
            {
                Status = args["status"].ToString()!,
                Resolution = args.GetValueOrDefault("resolution")?.ToString()
            }));
    }
}
