using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 园区管理 MCP 工具处理器（资产、招商、租户、走访、企业服务、统计）
/// </summary>
public class ParkMcpToolHandler : McpToolHandlerBase
{
    private readonly IParkAssetService _assetService;
    private readonly IParkInvestmentService _investmentService;
    private readonly IParkTenantService _tenantService;
    private readonly IParkVisitService _visitService;
    private readonly IParkEnterpriseServiceService _enterpriseService;
    private readonly IParkStatisticsService _statisticsService;
    private readonly ILogger<ParkMcpToolHandler> _logger;

    public ParkMcpToolHandler(
        IParkAssetService assetService,
        IParkInvestmentService investmentService,
        IParkTenantService tenantService,
        IParkVisitService visitService,
        IParkEnterpriseServiceService enterpriseService,
        IParkStatisticsService statisticsService,
        ILogger<ParkMcpToolHandler> logger)
    {
        _assetService = assetService;
        _investmentService = investmentService;
        _tenantService = tenantService;
        _visitService = visitService;
        _enterpriseService = enterpriseService;
        _statisticsService = statisticsService;
        _logger = logger;

        #region 资产管理 - 楼宇

        RegisterTool("get_park_buildings", "获取园区楼宇资产列表。关键词：园区,楼宇,资产,建筑,房源,楼铺",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                return await _assetService.GetBuildingsAsync(new ProTableRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Current = Current,
                    PageSize = PageSize
                });
            });

        RegisterTool("get_park_building_detail", "获取指定楼宇的详细信息。支持 ID 或楼宇名称查询。关键词：楼宇详情,查看楼宇",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "楼宇 ID" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "楼宇名称" }
            }),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                var name = args.GetValueOrDefault("name")?.ToString();
                if (!string.IsNullOrEmpty(id)) return await _assetService.GetBuildingByIdAsync(id);
                if (!string.IsNullOrEmpty(name))
                {
                    var list = await _assetService.GetBuildingsAsync(new ProTableRequest { Search = name, Current = 1, PageSize = 1 });
                    var items = await list.Queryable.ToListAsync();
                    if (items.Any()) return await _assetService.GetBuildingByIdAsync(items.First().Id);
                }
                return new { error = "未找到指定楼宇" };
            });

        RegisterTool("create_park_building", "创建新的楼宇资产记录。关键词：创建楼宇,新增楼宇",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "楼宇名称" },
                ["address"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "地址" },
                ["totalFloors"] = new Dictionary<string, object> { ["type"] = "integer" },
                ["totalArea"] = new Dictionary<string, object> { ["type"] = "number" },
                ["buildingType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "楼宇类型" }
            }, ["name"]),
            async (args, uid) => await _assetService.CreateBuildingAsync(new CreateBuildingRequest
            {
                Name = args["name"].ToString()!,
                Address = args.GetValueOrDefault("address")?.ToString(),
                TotalFloors = int.TryParse(args.GetValueOrDefault("totalFloors")?.ToString(), out var tf) ? tf : 0,
                TotalArea = decimal.TryParse(args.GetValueOrDefault("totalArea")?.ToString(), out var ta) ? ta : 0,
                BuildingType = args.GetValueOrDefault("buildingType")?.ToString()
            }));

        RegisterTool("update_park_building", "更新楼宇资产信息。关键词：修改楼宇,编辑楼宇",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string" },
                ["address"] = new Dictionary<string, object> { ["type"] = "string" },
                ["totalFloors"] = new Dictionary<string, object> { ["type"] = "integer" },
                ["totalArea"] = new Dictionary<string, object> { ["type"] = "number" },
                ["buildingType"] = new Dictionary<string, object> { ["type"] = "string" },
                ["status"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args["id"].ToString()!;
                return await _assetService.UpdateBuildingAsync(id, new UpdateBuildingRequest
                {
                    Name = args.GetValueOrDefault("name")?.ToString() ?? "",
                    Address = args.GetValueOrDefault("address")?.ToString(),
                    TotalFloors = int.TryParse(args.GetValueOrDefault("totalFloors")?.ToString(), out var tf) ? tf : 0,
                    TotalArea = decimal.TryParse(args.GetValueOrDefault("totalArea")?.ToString(), out var ta) ? ta : 0,
                    BuildingType = args.GetValueOrDefault("buildingType")?.ToString(),
                    Status = args.GetValueOrDefault("status")?.ToString()
                });
            });

        RegisterTool("delete_park_building", "删除指定的楼宇资产记录。关键词：删除楼宇",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _assetService.DeleteBuildingAsync(args["id"].ToString()!));

        #endregion

        #region 资产管理 - 房源

        RegisterTool("get_park_properties", "获取园区房源/单元列表。关键词：房源,单元,房间,铺位",
            ObjectSchema(MergeProperties(new Dictionary<string, object>
            {
                ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "筛选状态" }
            }, PaginationSchema())),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                return await _assetService.GetPropertyUnitsAsync(new ProTableRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Current = Current,
                    PageSize = PageSize
                });
            });

        RegisterTool("get_park_property_detail", "获取指定房源的详细信息。关键词：房源详情,单元详情",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _assetService.GetPropertyUnitByIdAsync(args["id"].ToString()!));

        RegisterTool("create_park_property", "创建新的房源/单元记录。关键词：创建房源,新增单元",
            ObjectSchema(new Dictionary<string, object>
            {
                ["buildingId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "所属楼宇 ID" },
                ["unitNumber"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "单元编号" },
                ["floor"] = new Dictionary<string, object> { ["type"] = "integer" },
                ["area"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "面积（㎡）" },
                ["monthlyRent"] = new Dictionary<string, object> { ["type"] = "number" },
                ["unitType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "类型: Office/Retail/Warehouse" }
            }, ["buildingId", "unitNumber"]),
            async (args, uid) => await _assetService.CreatePropertyUnitAsync(new CreatePropertyUnitRequest
            {
                BuildingId = args["buildingId"].ToString()!,
                UnitNumber = args["unitNumber"].ToString()!,
                Floor = int.TryParse(args.GetValueOrDefault("floor")?.ToString(), out var f) ? f : 1,
                Area = decimal.TryParse(args.GetValueOrDefault("area")?.ToString(), out var a) ? a : 0,
                MonthlyRent = decimal.TryParse(args.GetValueOrDefault("monthlyRent")?.ToString(), out var r) ? r : 0,
                UnitType = args.GetValueOrDefault("unitType")?.ToString()
            }));

        RegisterTool("update_park_property", "更新房源/单元信息。关键词：修改房源,编辑单元",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["unitNumber"] = new Dictionary<string, object> { ["type"] = "string" },
                ["floor"] = new Dictionary<string, object> { ["type"] = "integer" },
                ["area"] = new Dictionary<string, object> { ["type"] = "number" },
                ["monthlyRent"] = new Dictionary<string, object> { ["type"] = "number" },
                ["unitType"] = new Dictionary<string, object> { ["type"] = "string" },
                ["status"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args["id"].ToString()!;
                return await _assetService.UpdatePropertyUnitAsync(id, new CreatePropertyUnitRequest
                {
                    BuildingId = args.GetValueOrDefault("buildingId")?.ToString() ?? "",
                    UnitNumber = args.GetValueOrDefault("unitNumber")?.ToString() ?? "",
                    Floor = int.TryParse(args.GetValueOrDefault("floor")?.ToString(), out var f) ? f : 1,
                    Area = decimal.TryParse(args.GetValueOrDefault("area")?.ToString(), out var a) ? a : 0,
                    MonthlyRent = decimal.TryParse(args.GetValueOrDefault("monthlyRent")?.ToString(), out var r) ? r : 0,
                    UnitType = args.GetValueOrDefault("unitType")?.ToString()
                });
            });

        RegisterTool("delete_park_property", "删除指定的房源/单元。关键词：删除房源,删除单元",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _assetService.DeletePropertyUnitAsync(args["id"].ToString()!));

        RegisterTool("get_park_asset_statistics", "获取园区资产统计数据（出租率、面积、房源类型分布等）。关键词：资产统计,出租率,资产概况",
            ObjectSchema(new Dictionary<string, object>
            {
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期 yyyy-MM-dd" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 yyyy-MM-dd" }
            }),
            async (args, uid) =>
            {
                DateTime? start = DateTime.TryParse(args.GetValueOrDefault("startDate")?.ToString(), out var s) ? s : null;
                DateTime? end = DateTime.TryParse(args.GetValueOrDefault("endDate")?.ToString(), out var e) ? e : null;
                return await _assetService.GetAssetStatisticsAsync(start, end);
            });

        #endregion

        #region 招商管理 - 线索

        RegisterTool("get_park_leads", "获取园区招商线索列表。关键词：园区,招商,线索,潜在客户,商机,意向",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                return await _investmentService.GetLeadsAsync(new ProTableRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Current = Current,
                    PageSize = PageSize
                });
            });

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
                    var list = await _investmentService.GetLeadsAsync(new ProTableRequest { Search = name, Current = 1, PageSize = 1 });
                    var items = await list.Queryable.ToListAsync();
                    if (items.Any()) return await _investmentService.GetLeadByIdAsync(items.First().Id);
                }
                return new { error = "未找到对应招商线索" };
            });

        RegisterTool("create_park_lead", "创建新的园区招商线索。关键词：创建线索,录入线索",
            ObjectSchema(new Dictionary<string, object>
            {
                ["companyName"] = new Dictionary<string, object> { ["type"] = "string" },
                ["contactPerson"] = new Dictionary<string, object> { ["type"] = "string" },
                ["phone"] = new Dictionary<string, object> { ["type"] = "string" },
                ["industry"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "行业" },
                ["source"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "线索来源" },
                ["intendedArea"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "意向面积(㎡)" }
            }, ["companyName"]),
            async (args, uid) => await _investmentService.CreateLeadAsync(new CreateInvestmentLeadRequest
            {
                CompanyName = args["companyName"].ToString()!,
                ContactPerson = args.GetValueOrDefault("contactPerson")?.ToString(),
                Phone = args.GetValueOrDefault("phone")?.ToString(),
                Industry = args.GetValueOrDefault("industry")?.ToString(),
                Source = args.GetValueOrDefault("source")?.ToString(),
                IntendedArea = decimal.TryParse(args.GetValueOrDefault("intendedArea")?.ToString(), out var ia) ? ia : null
            }));

        RegisterTool("update_park_lead", "更新招商线索信息。关键词：修改线索,编辑线索",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["companyName"] = new Dictionary<string, object> { ["type"] = "string" },
                ["contactPerson"] = new Dictionary<string, object> { ["type"] = "string" },
                ["phone"] = new Dictionary<string, object> { ["type"] = "string" },
                ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "状态: New/Contacting/Negotiating/Converted/Closed" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args["id"].ToString()!;
                return await _investmentService.UpdateLeadAsync(id, new CreateInvestmentLeadRequest
                {
                    CompanyName = args.GetValueOrDefault("companyName")?.ToString() ?? "",
                    ContactPerson = args.GetValueOrDefault("contactPerson")?.ToString(),
                    Phone = args.GetValueOrDefault("phone")?.ToString()
                });
            });

        RegisterTool("delete_park_lead", "删除指定的招商线索。关键词：删除线索",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _investmentService.DeleteLeadAsync(args["id"].ToString()!));

        RegisterTool("convert_park_lead_to_project", "将招商线索转为正式招商项目。关键词：线索转项目",
            ObjectSchema(new Dictionary<string, object> { ["leadId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["leadId"]),
            async (args, uid) => await _investmentService.ConvertLeadToProjectAsync(args["leadId"].ToString()!));

        #endregion

        #region 招商管理 - 项目

        RegisterTool("get_park_projects", "获取园区招商项目列表。关键词：招商项目,项目,跟进",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                return await _investmentService.GetProjectsAsync(new ProTableRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Current = Current,
                    PageSize = PageSize
                });
            });

        RegisterTool("get_park_project_detail", "获取招商项目的详细信息。关键词：项目详情",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _investmentService.GetProjectByIdAsync(args["id"].ToString()!));

        RegisterTool("create_park_project", "创建新的招商项目。关键词：创建项目,新增项目",
            ObjectSchema(new Dictionary<string, object>
            {
                ["projectName"] = new Dictionary<string, object> { ["type"] = "string" },
                ["companyName"] = new Dictionary<string, object> { ["type"] = "string" },
                ["stage"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "阶段: Negotiation/Demo/Proposal/Completed" }
            }, ["projectName", "companyName"]),
            async (args, uid) => await _investmentService.CreateProjectAsync(new CreateInvestmentProjectRequest
            {
                ProjectName = args["projectName"].ToString()!,
                CompanyName = args["companyName"].ToString()!,
                Stage = args.GetValueOrDefault("stage")?.ToString(),
                IntendedArea = decimal.TryParse(args.GetValueOrDefault("intendedArea")?.ToString(), out var ia) ? ia : null,
                ProposedRent = decimal.TryParse(args.GetValueOrDefault("proposedRent")?.ToString(), out var pr) ? pr : null,
            }));

        RegisterTool("update_park_project", "更新招商项目信息。关键词：修改项目,编辑项目",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["projectName"] = new Dictionary<string, object> { ["type"] = "string" },
                ["stage"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "阶段: Discovery/Negotiation/Demo/Proposal/Completed" },
                ["probability"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "签约概率 0-100" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args["id"].ToString()!;
                return await _investmentService.UpdateProjectAsync(id, new CreateInvestmentProjectRequest
                {
                    ProjectName = args.GetValueOrDefault("projectName")?.ToString() ?? "",
                    CompanyName = args.GetValueOrDefault("companyName")?.ToString() ?? "",
                    Stage = args.GetValueOrDefault("stage")?.ToString()
                });
            });

        RegisterTool("delete_park_project", "删除指定的招商项目。关键词：删除项目",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _investmentService.DeleteProjectAsync(args["id"].ToString()!));

        RegisterTool("get_park_investment_statistics", "获取园区招商统计数据（线索量、转化率、签约等）。关键词：招商统计,线索统计,招商概况",
            ObjectSchema(new Dictionary<string, object>
            {
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期 yyyy-MM-dd" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 yyyy-MM-dd" }
            }),
            async (args, uid) =>
            {
                DateTime? start = DateTime.TryParse(args.GetValueOrDefault("startDate")?.ToString(), out var s) ? s : null;
                DateTime? end = DateTime.TryParse(args.GetValueOrDefault("endDate")?.ToString(), out var e) ? e : null;
                return await _investmentService.GetStatisticsAsync(start, end);
            });

        #endregion

        #region 租户管理

        RegisterTool("get_park_tenants", "获取园区租户企业列表。关键词：园区,租户,企业,入驻,合同,租约",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                return await _tenantService.GetTenantsAsync(new ProTableRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Current = Current,
                    PageSize = PageSize
                });
            });

        RegisterTool("get_park_tenant_detail", "获取租户企业的详细信息。支持名称或 ID 查询。关键词：租户详情,企业信息,公司资料",
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
                    var list = await _tenantService.GetTenantsAsync(new ProTableRequest { Search = name, Current = 1, PageSize = 1 });
                    var items = await list.Queryable.ToListAsync();
                    if (items.Any()) return await _tenantService.GetTenantByIdAsync(items.First().Id);
                }
                return new { error = $"未找到名为 '{name}' 的租户记录" };
            });

        RegisterTool("create_park_tenant", "创建新的租户企业记录。关键词：创建租户,新增企业",
            ObjectSchema(new Dictionary<string, object>
            {
                ["tenantName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "企业名称" },
                ["industry"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "所属行业" },
                ["contactPerson"] = new Dictionary<string, object> { ["type"] = "string" },
                ["phone"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["tenantName"]),
            async (args, uid) => await _tenantService.CreateTenantAsync(new CreateParkTenantRequest
            {
                TenantName = args["tenantName"].ToString()!,
                Industry = args.GetValueOrDefault("industry")?.ToString(),
                ContactPerson = args.GetValueOrDefault("contactPerson")?.ToString(),
                Phone = args.GetValueOrDefault("phone")?.ToString()
            }));

        RegisterTool("update_park_tenant", "更新租户企业信息。关键词：修改租户,编辑企业",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["tenantName"] = new Dictionary<string, object> { ["type"] = "string" },
                ["industry"] = new Dictionary<string, object> { ["type"] = "string" },
                ["contactPerson"] = new Dictionary<string, object> { ["type"] = "string" },
                ["phone"] = new Dictionary<string, object> { ["type"] = "string" },
                ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "状态: Active/Inactive/Exited" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args["id"].ToString()!;
                return await _tenantService.UpdateTenantAsync(id, new CreateParkTenantRequest
                {
                    TenantName = args.GetValueOrDefault("tenantName")?.ToString() ?? "",
                    Industry = args.GetValueOrDefault("industry")?.ToString(),
                    ContactPerson = args.GetValueOrDefault("contactPerson")?.ToString(),
                    Phone = args.GetValueOrDefault("phone")?.ToString()
                });
            });

        RegisterTool("delete_park_tenant", "删除指定的租户企业记录。关键词：删除租户",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _tenantService.DeleteTenantAsync(args["id"].ToString()!));

        #endregion

        #region 租户管理 - 合同

        RegisterTool("get_park_contracts", "获取园区租赁合同列表。关键词：园区,租赁,合同,到期,续租",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["status"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                return await _tenantService.GetContractsAsync(new ProTableRequest
                {
                    Search = args.GetValueOrDefault("status")?.ToString(),
                    Current = Current,
                    PageSize = PageSize
                });
            });

        RegisterTool("get_park_contract_detail", "获取租赁合同的详细信息。关键词：合同详情,租约详情",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _tenantService.GetContractByIdAsync(args["id"].ToString()!));

        RegisterTool("create_park_contract", "创建新的租赁合同。关键词：创建合同,新增租约",
            ObjectSchema(new Dictionary<string, object>
            {
                ["tenantId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["contractNumber"] = new Dictionary<string, object> { ["type"] = "string" },
                ["unitIds"] = new Dictionary<string, object> { ["type"] = "array", ["items"] = new Dictionary<string, object> { ["type"] = "string" } },
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期 yyyy-MM-dd" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 yyyy-MM-dd" },
                ["monthlyRent"] = new Dictionary<string, object> { ["type"] = "number" },
                ["paymentCycle"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "付款周期: Monthly/Quarterly/Yearly" }
            }, ["tenantId", "contractNumber", "startDate", "endDate"]),
            async (args, uid) =>
            {
                var unitIds = args.GetValueOrDefault("unitIds");
                return await _tenantService.CreateContractAsync(new CreateLeaseContractRequest
                {
                    TenantId = args["tenantId"].ToString()!,
                    ContractNumber = args["contractNumber"].ToString()!,
                    UnitIds = unitIds is System.Text.Json.JsonElement je
                        ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(je.GetRawText()) ?? new List<string>()
                        : unitIds?.ToString()?.Split(',').ToList() ?? new List<string>(),
                    StartDate = DateTime.Parse(args["startDate"].ToString()!),
                    EndDate = DateTime.Parse(args["endDate"].ToString()!),
                    MonthlyRent = decimal.TryParse(args.GetValueOrDefault("monthlyRent")?.ToString(), out var mr) ? mr : 0,
                    PaymentCycle = args.GetValueOrDefault("paymentCycle")?.ToString()
                });
            });

        RegisterTool("update_park_contract", "更新租赁合同信息。关键词：修改合同,编辑租约",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["monthlyRent"] = new Dictionary<string, object> { ["type"] = "number" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 yyyy-MM-dd" },
                ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "状态: Active/Renewed/Expired/Terminated" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args["id"].ToString()!;
                return await _tenantService.UpdateContractAsync(id, new CreateLeaseContractRequest
                {
                    TenantId = args.GetValueOrDefault("tenantId")?.ToString() ?? "",
                    ContractNumber = args.GetValueOrDefault("contractNumber")?.ToString() ?? "",
                    StartDate = DateTime.TryParse(args.GetValueOrDefault("startDate")?.ToString(), out var sd) ? sd : DateTime.UtcNow,
                    EndDate = DateTime.TryParse(args.GetValueOrDefault("endDate")?.ToString(), out var ed) ? ed : DateTime.UtcNow,
                    MonthlyRent = decimal.TryParse(args.GetValueOrDefault("monthlyRent")?.ToString(), out var mr) ? mr : 0
                });
            });

        RegisterTool("delete_park_contract", "删除指定的租赁合同。关键词：删除合同",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _tenantService.DeleteContractAsync(args["id"].ToString()!));

        RegisterTool("renew_park_contract", "续签租赁合同（创建新合同并关联旧合同）。关键词：续租,续签合同",
            ObjectSchema(new Dictionary<string, object>
            {
                ["contractId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "原合同 ID" },
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新合同开始日期 yyyy-MM-dd" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新合同结束日期 yyyy-MM-dd" },
                ["monthlyRent"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "新租金" }
            }, ["contractId", "startDate", "endDate"]),
            async (args, uid) =>
            {
                var id = args["contractId"].ToString()!;
                return await _tenantService.RenewContractAsync(id, new CreateLeaseContractRequest
                {
                    TenantId = "",
                    ContractNumber = "",
                    StartDate = DateTime.Parse(args["startDate"].ToString()!),
                    EndDate = DateTime.Parse(args["endDate"].ToString()!),
                    MonthlyRent = decimal.TryParse(args.GetValueOrDefault("monthlyRent")?.ToString(), out var mr) ? mr : 0
                });
            });

        RegisterTool("get_park_contract_payments", "获取指定合同的付款记录。关键词：付款记录,收款记录",
            ObjectSchema(new Dictionary<string, object> { ["contractId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["contractId"]),
            async (args, uid) => await _tenantService.GetPaymentRecordsByContractIdAsync(args["contractId"].ToString()!));

        RegisterTool("create_park_payment_record", "创建租赁合同的付款记录。关键词：创建付款,录入收款",
            ObjectSchema(new Dictionary<string, object>
            {
                ["contractId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["amount"] = new Dictionary<string, object> { ["type"] = "number" },
                ["paymentDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "付款日期 yyyy-MM-dd" },
                ["paymentType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "类型: Rent/Deposit/PropertyFee/Other" }
            }, ["contractId", "amount"]),
            async (args, uid) => await _tenantService.CreatePaymentRecordAsync(new CreateLeasePaymentRecordRequest
            {
                ContractId = args["contractId"].ToString()!,
                Amount = decimal.TryParse(args["amount"]?.ToString(), out var amt) ? amt : 0,
                PaymentDate = DateTime.TryParse(args.GetValueOrDefault("paymentDate")?.ToString(), out var pd) ? pd : DateTime.UtcNow,
                PaymentType = args.GetValueOrDefault("paymentType")?.ToString()
            }));

        RegisterTool("delete_park_payment_record", "删除指定的付款记录。关键词：删除付款记录",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _tenantService.DeletePaymentRecordAsync(args["id"].ToString()!));

        RegisterTool("get_park_tenant_statistics", "获取园区租户统计数据（租户数、收缴率、到期分布等）。关键词：租户统计,收缴统计,租户概况",
            ObjectSchema(new Dictionary<string, object>
            {
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期 yyyy-MM-dd" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 yyyy-MM-dd" }
            }),
            async (args, uid) =>
            {
                DateTime? start = DateTime.TryParse(args.GetValueOrDefault("startDate")?.ToString(), out var s) ? s : null;
                DateTime? end = DateTime.TryParse(args.GetValueOrDefault("endDate")?.ToString(), out var e) ? e : null;
                return await _tenantService.GetStatisticsAsync(start, end);
            });

        #endregion

        #region 企业服务

        RegisterTool("get_park_service_requests", "获取园区企业服务申请列表。关键词：园区,企业服务,申请,报修,咨询",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["status"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                return await _enterpriseService.GetRequestsAsync(new ProTableRequest
                {
                    Search = args.GetValueOrDefault("status")?.ToString(),
                    Current = Current,
                    PageSize = PageSize
                });
            });

        RegisterTool("get_park_service_request_detail", "获取企业服务申请的详情。关键词：申请详情,报修单详情",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _enterpriseService.GetRequestByIdAsync(args["id"].ToString()!));

        RegisterTool("create_park_service_request", "创建新的企业服务/报修申请。关键词：创建申请,提交报修",
            ObjectSchema(new Dictionary<string, object>
            {
                ["title"] = new Dictionary<string, object> { ["type"] = "string" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string" },
                ["priority"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "优先级: Low/Normal/High/Urgent" },
                ["contactPerson"] = new Dictionary<string, object> { ["type"] = "string" },
                ["contactPhone"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["title"]),
            async (args, uid) => await _enterpriseService.CreateRequestAsync(new CreateServiceRequestRequest
            {
                Title = args["title"].ToString()!,
                Description = args.GetValueOrDefault("description")?.ToString(),
                Priority = args.GetValueOrDefault("priority")?.ToString(),
                ContactPerson = args.GetValueOrDefault("contactPerson")?.ToString(),
                ContactPhone = args.GetValueOrDefault("contactPhone")?.ToString()
            }));

        RegisterTool("update_park_service_request", "更新企业服务申请内容。关键词：修改申请,编辑报修",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["title"] = new Dictionary<string, object> { ["type"] = "string" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string" },
                ["priority"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args["id"].ToString()!;
                return await _enterpriseService.UpdateRequestAsync(id, new CreateServiceRequestRequest
                {
                    Title = args.GetValueOrDefault("title")?.ToString(),
                    Description = args.GetValueOrDefault("description")?.ToString(),
                    Priority = args.GetValueOrDefault("priority")?.ToString()
                });
            });

        RegisterTool("delete_park_service_request", "删除企业服务申请记录。关键词：删除申请,删除报修",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _enterpriseService.DeleteRequestAsync(args["id"].ToString()!));

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

        RegisterTool("rate_park_service_request", "为企业服务申请评分和反馈。关键词：服务评分,评价报修",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["rating"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "评分 1-5" },
                ["feedback"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["id", "rating"]),
            async (args, uid) =>
            {
                var id = args["id"].ToString()!;
                var rating = int.TryParse(args["rating"]?.ToString(), out var r) ? r : 3;
                return await _enterpriseService.RateRequestAsync(id, rating, args.GetValueOrDefault("feedback")?.ToString());
            });

        RegisterTool("get_park_service_statistics", "获取企业服务统计数据（工单量、评分、处理时长等）。关键词：服务统计,工单统计,服务概况",
            ObjectSchema(new Dictionary<string, object>
            {
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期 yyyy-MM-dd" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 yyyy-MM-dd" }
            }),
            async (args, uid) =>
            {
                DateTime? start = DateTime.TryParse(args.GetValueOrDefault("startDate")?.ToString(), out var s) ? s : null;
                DateTime? end = DateTime.TryParse(args.GetValueOrDefault("endDate")?.ToString(), out var e) ? e : null;
                return await _enterpriseService.GetStatisticsAsync(start, end);
            });

        #endregion

        #region 走访管理

        RegisterTool("get_park_visit_tasks", "获取园区经理走访任务列表。关键词：园区,走访,任务,巡检,反馈",
            ObjectSchema(MergeProperties(new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } }, PaginationSchema())),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                return await _visitService.GetVisitTasksAsync(new ProTableRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Current = Current,
                    PageSize = PageSize
                });
            });

        RegisterTool("get_park_visit_task_detail", "获取走访任务的详细信息。关键词：走访任务详情,任务内容",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _visitService.GetVisitTaskByIdAsync(args["id"].ToString()!));

        RegisterTool("create_park_visit_task", "创建新的走访任务。关键词：创建走访,新增走访任务",
            ObjectSchema(new Dictionary<string, object>
            {
                ["title"] = new Dictionary<string, object> { ["type"] = "string" },
                ["managerName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "负责企管员" },
                ["visitDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "走访日期 yyyy-MM-dd" },
                ["visitType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "类型: 日常走访/专项走访/回访" },
                ["tenantName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "被走访企业" },
                ["content"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "走访内容" }
            }, ["title", "managerName", "visitDate"]),
            async (args, uid) => await _visitService.CreateVisitTaskAsync(new CreateVisitTaskRequest
            {
                Title = args["title"].ToString()!,
                ManagerName = args["managerName"].ToString()!,
                VisitDate = DateTime.Parse(args["visitDate"].ToString()!),
                VisitType = args.GetValueOrDefault("visitType")?.ToString(),
                TenantName = args.GetValueOrDefault("tenantName")?.ToString(),
                Content = args.GetValueOrDefault("content")?.ToString()
            }));

        RegisterTool("update_park_visit_task", "更新走访任务信息。关键词：修改走访,编辑任务",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["title"] = new Dictionary<string, object> { ["type"] = "string" },
                ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "状态: Pending/Completed/Cancelled" },
                ["feedback"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args["id"].ToString()!;
                return await _visitService.UpdateVisitTaskAsync(id, new CreateVisitTaskRequest
                {
                    Title = args.GetValueOrDefault("title")?.ToString() ?? "",
                    ManagerName = args.GetValueOrDefault("managerName")?.ToString() ?? "",
                    VisitDate = DateTime.TryParse(args.GetValueOrDefault("visitDate")?.ToString(), out var vd) ? vd : DateTime.Today,
                    Status = args.GetValueOrDefault("status")?.ToString(),
                    Feedback = args.GetValueOrDefault("feedback")?.ToString()
                });
            });

        RegisterTool("delete_park_visit_task", "删除指定的走访任务。关键词：删除走访任务",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _visitService.DeleteVisitTaskAsync(args["id"].ToString()!));

        RegisterTool("get_park_visit_assessments", "获取走访考核评价列表。关键词：走访考核,评价,评分",
            ObjectSchema(MergeProperties(new Dictionary<string, object>
            {
                ["keyword"] = new Dictionary<string, object> { ["type"] = "string" }
            }, PaginationSchema())),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                return await _visitService.GetVisitAssessmentsAsync(new ProTableRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Current = Current,
                    PageSize = PageSize
                });
            });

        RegisterTool("create_park_visit_assessment", "创建走访考核评价。关键词：创建考核,评价走访",
            ObjectSchema(new Dictionary<string, object>
            {
                ["taskId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "走访任务 ID" },
                ["score"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "评分 1-100" },
                ["comments"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["taskId", "score"]),
            async (args, uid) => await _visitService.CreateVisitAssessmentAsync(new VisitAssessmentDto
            {
                TaskId = args["taskId"].ToString()!,
                Score = int.TryParse(args["score"]?.ToString(), out var s) ? s : 0,
                Comments = args.GetValueOrDefault("comments")?.ToString()
            }));

        RegisterTool("get_park_visit_questions", "获取走访知识库问题列表。关键词：走访知识库,常见问题,FAQ",
            ObjectSchema(MergeProperties(new Dictionary<string, object>
            {
                ["category"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "分类筛选" }
            }, PaginationSchema())),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                return await _visitService.GetVisitQuestionsAsync(new ProTableRequest
                {
                    Search = args.GetValueOrDefault("keyword")?.ToString(),
                    Current = Current,
                    PageSize = PageSize
                }, args.GetValueOrDefault("category")?.ToString());
            });

        RegisterTool("get_park_visit_statistics", "获取走访管理统计数据（完成率、考核评分等）。关键词：走访统计,走访概况",
            ObjectSchema(new Dictionary<string, object>
            {
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期 yyyy-MM-dd" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 yyyy-MM-dd" }
            }),
            async (args, uid) =>
            {
                DateTime? start = DateTime.TryParse(args.GetValueOrDefault("startDate")?.ToString(), out var s) ? s : null;
                DateTime? end = DateTime.TryParse(args.GetValueOrDefault("endDate")?.ToString(), out var e) ? e : null;
                return await _visitService.GetVisitStatisticsAsync(start, end);
            });

        #endregion

        #region AI 统计报告

        RegisterTool("get_park_ai_report", "生成园区 AI 深度分析报告，包含资产、招商、租户、企业服务、走访全模块分析。关键词：AI报告,深度分析,运营报告,园区报告",
            ObjectSchema(new Dictionary<string, object>
            {
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期 yyyy-MM-dd" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 yyyy-MM-dd" }
            }),
            async (args, uid) =>
            {
                DateTime? start = DateTime.TryParse(args.GetValueOrDefault("startDate")?.ToString(), out var s) ? s : null;
                DateTime? end = DateTime.TryParse(args.GetValueOrDefault("endDate")?.ToString(), out var e) ? e : null;
                return await _statisticsService.GenerateAiReportAsync(start, end, null, "zh-CN");
            });

        #endregion
    }
}