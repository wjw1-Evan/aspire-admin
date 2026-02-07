using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

public enum StatisticsPeriod
{
    /// <summary>天</summary>
    Day,
    /// <summary>周</summary>
    Week,
    /// <summary>月</summary>
    Month,
    /// <summary>年</summary>
    Year
}

#region 资产管理模型 (Asset Management)

/// <summary>
/// 楼宇信息
/// </summary>
[BsonIgnoreExtraElements]
public class Building : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>楼宇名称</summary>
    [Required]
    [StringLength(100)]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>楼宇地址</summary>
    [StringLength(500)]
    [BsonElement("address")]
    public string? Address { get; set; }

    /// <summary>总层数</summary>
    [BsonElement("totalFloors")]
    public int TotalFloors { get; set; }

    /// <summary>总面积</summary>
    [BsonElement("totalArea")]
    public decimal TotalArea { get; set; }

    /// <summary>可租赁面积</summary>
    [BsonElement("rentableArea")]
    public decimal RentableArea { get; set; }

    /// <summary>楼宇类型</summary>
    [StringLength(50)]
    [BsonElement("buildingType")]
    public string? BuildingType { get; set; } // 办公楼、厂房、仓库等

    /// <summary>建成年份</summary>
    [BsonElement("yearBuilt")]
    public int YearBuilt { get; set; }

    /// <summary>状态</summary>
    [StringLength(20)]
    [BsonElement("status")]
    public string Status { get; set; } = "Active"; // Active, UnderMaintenance, Inactive

    /// <summary>楼宇描述</summary>
    [StringLength(1000)]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>封面图片</summary>
    [BsonElement("coverImage")]
    public string? CoverImage { get; set; }

    /// <summary>楼宇图片集</summary>
    [BsonElement("images")]
    public List<string>? Images { get; set; }
}

/// <summary>
/// 房源/可租赁单元
/// </summary>
[BsonIgnoreExtraElements]
public class PropertyUnit : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>所属楼宇ID</summary>
    [BsonElement("buildingId")]
    public string BuildingId { get; set; } = string.Empty;

    /// <summary>房号</summary>
    [Required]
    [StringLength(50)]
    [BsonElement("unitNumber")]
    public string UnitNumber { get; set; } = string.Empty;

    /// <summary>所在楼层</summary>
    [BsonElement("floor")]
    public int Floor { get; set; }

    /// <summary>面积</summary>
    [BsonElement("area")]
    public decimal Area { get; set; }

    /// <summary>月租金</summary>
    [BsonElement("monthlyRent")]
    public decimal MonthlyRent { get; set; }

    /// <summary>日租金</summary>
    [BsonElement("dailyRent")]
    public decimal? DailyRent { get; set; }

    /// <summary>单元类型</summary>
    [StringLength(50)]
    [BsonElement("unitType")]
    public string UnitType { get; set; } = "Office"; // Office, Workshop, Warehouse, Retail

    /// <summary>状态</summary>
    [StringLength(20)]
    [BsonElement("status")]
    public string Status { get; set; } = "Available"; // Available, Rented, Reserved, UnderMaintenance

    /// <summary>描述</summary>
    [StringLength(1000)]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>当前租户ID</summary>
    [BsonElement("currentTenantId")]
    public string? CurrentTenantId { get; set; }

    /// <summary>起租日期</summary>
    [BsonElement("leaseStartDate")]
    public DateTime? LeaseStartDate { get; set; }

    /// <summary>免租到期日期/租约到期日期</summary>
    [BsonElement("leaseEndDate")]
    public DateTime? LeaseEndDate { get; set; }

    /// <summary>配属设施</summary>
    [BsonElement("facilities")]
    public List<string>? Facilities { get; set; } // 空调、网络、停车位等

    /// <summary>图片集</summary>
    [BsonElement("images")]
    public List<string>? Images { get; set; }
}

#endregion

#region 招商管理模型 (Investment Promotion)

/// <summary>
/// 招商线索
/// </summary>
[BsonIgnoreExtraElements]
public class InvestmentLead : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>企业名称</summary>
    [Required]
    [StringLength(200)]
    [BsonElement("companyName")]
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    [StringLength(100)]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    [StringLength(50)]
    [BsonElement("phone")]
    public string? Phone { get; set; }

    /// <summary>邮箱</summary>
    [StringLength(200)]
    [BsonElement("email")]
    public string? Email { get; set; }

    /// <summary>所属行业</summary>
    [StringLength(50)]
    [BsonElement("industry")]
    public string? Industry { get; set; }

    /// <summary>线索来源</summary>
    [StringLength(50)]
    [BsonElement("source")]
    public string Source { get; set; } = "Direct"; // Direct, Referral, Exhibition, Online, Agent

    /// <summary>意向面积</summary>
    [BsonElement("intendedArea")]
    public decimal? IntendedArea { get; set; }

    /// <summary>预算</summary>
    [BsonElement("budget")]
    public decimal? Budget { get; set; }

    /// <summary>状态</summary>
    [StringLength(20)]
    [BsonElement("status")]
    public string Status { get; set; } = "New"; // New, Contacted, Negotiating, Qualified, Lost

    /// <summary>优先级</summary>
    [StringLength(20)]
    [BsonElement("priority")]
    public string Priority { get; set; } = "Medium"; // High, Medium, Low

    /// <summary>需求描述</summary>
    [StringLength(2000)]
    [BsonElement("requirements")]
    public string? Requirements { get; set; }

    /// <summary>备注</summary>
    [StringLength(2000)]
    [BsonElement("notes")]
    public string? Notes { get; set; }

    /// <summary>分配给谁</summary>
    [BsonElement("assignedTo")]
    public string? AssignedTo { get; set; }

    /// <summary>下次跟进日期</summary>
    [BsonElement("nextFollowUpDate")]
    public DateTime? NextFollowUpDate { get; set; }
}

/// <summary>
/// 招商项目（从线索转化而来）
/// </summary>
[BsonIgnoreExtraElements]
public class InvestmentProject : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>线索ID</summary>
    [BsonElement("leadId")]
    public string? LeadId { get; set; }

    /// <summary>项目名称</summary>
    [Required]
    [StringLength(200)]
    [BsonElement("projectName")]
    public string ProjectName { get; set; } = string.Empty;

    /// <summary>企业名称</summary>
    [StringLength(200)]
    [BsonElement("companyName")]
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    [StringLength(100)]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    [StringLength(50)]
    [BsonElement("phone")]
    public string? Phone { get; set; }

    /// <summary>意向房源集合</summary>
    [BsonElement("intendedUnitIds")]
    public List<string>? IntendedUnitIds { get; set; }

    /// <summary>意向面积</summary>
    [BsonElement("intendedArea")]
    public decimal? IntendedArea { get; set; }

    /// <summary>预期租金</summary>
    [BsonElement("proposedRent")]
    public decimal? ProposedRent { get; set; }

    /// <summary>项目阶段</summary>
    [StringLength(20)]
    [BsonElement("stage")]
    public string Stage { get; set; } = "Initial"; // Initial, SiteVisit, Negotiation, ContractDraft, Signing, Completed, Lost

    /// <summary>预计签约日期</summary>
    [BsonElement("expectedSignDate")]
    public DateTime? ExpectedSignDate { get; set; }

    /// <summary>成功概率百分比</summary>
    [BsonElement("probability")]
    public decimal? Probability { get; set; } // 成功概率百分比

    /// <summary>备注</summary>
    [StringLength(2000)]
    [BsonElement("notes")]
    public string? Notes { get; set; }

    /// <summary>分配给谁</summary>
    [BsonElement("assignedTo")]
    public string? AssignedTo { get; set; }
}

/// <summary>
/// 招商跟进记录
/// </summary>
[BsonIgnoreExtraElements]
public class InvestmentFollowUp : BaseEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>线索ID</summary>
    [BsonElement("leadId")]
    public string? LeadId { get; set; }

    /// <summary>项目ID</summary>
    [BsonElement("projectId")]
    public string? ProjectId { get; set; }

    /// <summary>跟进方式</summary>
    [StringLength(50)]
    [BsonElement("followUpType")]
    public string FollowUpType { get; set; } = "Call"; // Call, Meeting, SiteVisit, Email, Other

    /// <summary>跟进内容</summary>
    [StringLength(2000)]
    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;

    /// <summary>跟进结果</summary>
    [StringLength(500)]
    [BsonElement("result")]
    public string? Result { get; set; }

    /// <summary>下次跟进日期</summary>
    [BsonElement("nextFollowUpDate")]
    public DateTime? NextFollowUpDate { get; set; }

    /// <summary>后续计划</summary>
    [StringLength(500)]
    [BsonElement("nextAction")]
    public string? NextAction { get; set; }
}

#endregion

#region 租户管理模型 (Tenant Management)

/// <summary>
/// 园区租户
/// </summary>
[BsonIgnoreExtraElements]
public class ParkTenant : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>租户名称</summary>
    [Required]
    [StringLength(200)]
    [BsonElement("tenantName")]
    public string TenantName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    [StringLength(100)]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    [StringLength(50)]
    [BsonElement("phone")]
    public string? Phone { get; set; }

    /// <summary>邮箱</summary>
    [StringLength(200)]
    [BsonElement("email")]
    public string? Email { get; set; }

    /// <summary>所属行业</summary>
    [StringLength(50)]
    [BsonElement("industry")]
    public string? Industry { get; set; }

    /// <summary>营业执照号</summary>
    [StringLength(100)]
    [BsonElement("businessLicense")]
    public string? BusinessLicense { get; set; }

    /// <summary>地址</summary>
    [StringLength(500)]
    [BsonElement("address")]
    public string? Address { get; set; }

    /// <summary>租用单元ID集合</summary>
    [BsonElement("unitIds")]
    public List<string>? UnitIds { get; set; }

    /// <summary>状态</summary>
    [StringLength(20)]
    [BsonElement("status")]
    public string Status { get; set; } = "Active"; // Active, Inactive, Suspended

    /// <summary>入驻日期</summary>
    [BsonElement("entryDate")]
    public DateTime? EntryDate { get; set; }

    /// <summary>迁出日期</summary>
    [BsonElement("exitDate")]
    public DateTime? ExitDate { get; set; }

    /// <summary>备注</summary>
    [StringLength(2000)]
    [BsonElement("notes")]
    public string? Notes { get; set; }
}

/// <summary>
/// 租赁合同
/// </summary>
[BsonIgnoreExtraElements]
public class LeaseContract : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>租户ID</summary>
    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>合同编号</summary>
    [Required]
    [StringLength(100)]
    [BsonElement("contractNumber")]
    public string ContractNumber { get; set; } = string.Empty;

    /// <summary>租赁单元ID集合</summary>
    [BsonElement("unitIds")]
    public List<string> UnitIds { get; set; } = new();

    /// <summary>开始日期</summary>
    [BsonElement("startDate")]
    public DateTime StartDate { get; set; }

    /// <summary>结束日期</summary>
    [BsonElement("endDate")]
    public DateTime EndDate { get; set; }

    /// <summary>月租金</summary>
    [BsonElement("monthlyRent")]
    public decimal MonthlyRent { get; set; }

    /// <summary>押金</summary>
    [BsonElement("deposit")]
    public decimal? Deposit { get; set; }

    /// <summary>付款周期</summary>
    [StringLength(20)]
    [BsonElement("paymentCycle")]
    public string PaymentCycle { get; set; } = "Monthly"; // Monthly, Quarterly, HalfYearly, Yearly

    /// <summary>付款日</summary>
    [BsonElement("paymentDay")]
    public int PaymentDay { get; set; } = 1; // 每月几号付款

    /// <summary>状态</summary>
    [StringLength(20)]
    [BsonElement("status")]
    public string Status { get; set; } = "Active"; // Draft, Active, Expired, Terminated, Renewed

    /// <summary>合同条款</summary>
    [StringLength(2000)]
    [BsonElement("terms")]
    public string? Terms { get; set; }

    /// <summary>附件列表</summary>
    [BsonElement("attachments")]
    public List<string>? Attachments { get; set; }
}

/// <summary>
/// 租金账单
/// </summary>
[BsonIgnoreExtraElements]
public class RentBill : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>合同ID</summary>
    [BsonElement("contractId")]
    public string ContractId { get; set; } = string.Empty;

    /// <summary>租户ID</summary>
    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>账单编号</summary>
    [StringLength(100)]
    [BsonElement("billNumber")]
    public string BillNumber { get; set; } = string.Empty;

    /// <summary>账单年份</summary>
    [BsonElement("billYear")]
    public int BillYear { get; set; }

    /// <summary>账单月份</summary>
    [BsonElement("billMonth")]
    public int BillMonth { get; set; }

    /// <summary>金额</summary>
    [BsonElement("amount")]
    public decimal Amount { get; set; }

    /// <summary>已付金额</summary>
    [BsonElement("paidAmount")]
    public decimal? PaidAmount { get; set; }

    /// <summary>应付日期</summary>
    [BsonElement("dueDate")]
    public DateTime DueDate { get; set; }

    /// <summary>实付日期</summary>
    [BsonElement("paidDate")]
    public DateTime? PaidDate { get; set; }

    /// <summary>状态</summary>
    [StringLength(20)]
    [BsonElement("status")]
    public string Status { get; set; } = "Pending"; // Pending, Paid, Overdue, PartiallyPaid

    /// <summary>备注</summary>
    [StringLength(500)]
    [BsonElement("notes")]
    public string? Notes { get; set; }
}

#endregion

#region 企业服务模型 (Enterprise Services)

/// <summary>
/// 服务类别
/// </summary>
[BsonIgnoreExtraElements]
public class ServiceCategory : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>类别名称</summary>
    [Required]
    [StringLength(100)]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>描述</summary>
    [StringLength(500)]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>图标</summary>
    [StringLength(100)]
    [BsonElement("icon")]
    public string? Icon { get; set; }

    /// <summary>排序号</summary>
    [BsonElement("sortOrder")]
    public int SortOrder { get; set; }

    /// <summary>是否启用</summary>
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// 服务申请
/// </summary>
[BsonIgnoreExtraElements]
public class ServiceRequest : MultiTenantEntity, IEntity, ISoftDeletable, ITimestamped
{
    /// <summary>类别ID</summary>
    [BsonElement("categoryId")]
    public string CategoryId { get; set; } = string.Empty;

    /// <summary>租户ID</summary>
    [BsonElement("tenantId")]
    public string? TenantId { get; set; }

    /// <summary>标题</summary>
    [Required]
    [StringLength(200)]
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>需求描述</summary>
    [StringLength(2000)]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>联系人</summary>
    [StringLength(100)]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    [StringLength(50)]
    [BsonElement("contactPhone")]
    public string? ContactPhone { get; set; }

    /// <summary>优先级</summary>
    [StringLength(20)]
    [BsonElement("priority")]
    public string Priority { get; set; } = "Normal"; // Urgent, High, Normal, Low

    /// <summary>状态</summary>
    [StringLength(200)]
    [BsonElement("status")]
    public string Status { get; set; } = "Pending"; // Pending, Processing, Completed, Cancelled

    /// <summary>分配给谁</summary>
    [BsonElement("assignedTo")]
    public string? AssignedTo { get; set; }

    /// <summary>分配时间</summary>
    [BsonElement("assignedAt")]
    public DateTime? AssignedAt { get; set; }

    /// <summary>完成时间</summary>
    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }

    /// <summary>处理方案</summary>
    [StringLength(2000)]
    [BsonElement("resolution")]
    public string? Resolution { get; set; }

    /// <summary>评分</summary>
    [BsonElement("rating")]
    public int? Rating { get; set; } // 1-5星评价

    /// <summary>反馈意见</summary>
    [StringLength(500)]
    [BsonElement("feedback")]
    public string? Feedback { get; set; }

    /// <summary>附件列表</summary>
    [BsonElement("attachments")]
    public List<string>? Attachments { get; set; }
}

#endregion

#region DTOs

// ===== 资产管理 DTOs =====

public class BuildingListRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? BuildingType { get; set; }
    public string? SortBy { get; set; }
    public string? SortOrder { get; set; }
}

public class BuildingListResponse
{
    public List<BuildingDto> Buildings { get; set; } = new();
    public int Total { get; set; }
}

public class BuildingDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public int TotalFloors { get; set; }
    public decimal TotalArea { get; set; }
    public decimal RentableArea { get; set; }
    public decimal RentedArea { get; set; }
    public decimal OccupancyRate { get; set; }
    public string? BuildingType { get; set; }
    public int YearBuilt { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverImage { get; set; }
    public int TotalUnits { get; set; }
    public int AvailableUnits { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateBuildingRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public int TotalFloors { get; set; }
    public decimal TotalArea { get; set; }
    public decimal RentableArea { get; set; }
    public string? BuildingType { get; set; }
    public int YearBuilt { get; set; }
    public string? Description { get; set; }
    public string? CoverImage { get; set; }
    public List<string>? Images { get; set; }
}

public class UpdateBuildingRequest : CreateBuildingRequest
{
    public string? Status { get; set; }
}

public class PropertyUnitListRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? BuildingId { get; set; }
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? UnitType { get; set; }
    public int? Floor { get; set; }
    public string? SortBy { get; set; }
    public string? SortOrder { get; set; }
}

public class PropertyUnitListResponse
{
    public List<PropertyUnitDto> Units { get; set; } = new();
    public int Total { get; set; }
}

public class PropertyUnitDto
{
    public string Id { get; set; } = string.Empty;
    public string BuildingId { get; set; } = string.Empty;
    public string? BuildingName { get; set; }
    public string UnitNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public decimal Area { get; set; }
    public decimal MonthlyRent { get; set; }
    public decimal? DailyRent { get; set; }
    public string UnitType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? CurrentTenantId { get; set; }
    public string? CurrentTenantName { get; set; }
    public DateTime? LeaseEndDate { get; set; }
    public List<string>? Facilities { get; set; }
}

public class CreatePropertyUnitRequest
{
    [Required]
    public string BuildingId { get; set; } = string.Empty;
    [Required]
    public string UnitNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public decimal Area { get; set; }
    public decimal MonthlyRent { get; set; }
    public decimal? DailyRent { get; set; }
    public string? UnitType { get; set; }
    public string? Description { get; set; }
    public List<string>? Facilities { get; set; }
    public List<string>? Images { get; set; }
}

public class AssetStatisticsResponse
{
    public int TotalBuildings { get; set; }
    public decimal TotalArea { get; set; }
    public int TotalUnits { get; set; }
    public int AvailableUnits { get; set; }
    public int RentedUnits { get; set; }
    public decimal OccupancyRate { get; set; }
    public decimal TotalRentableArea { get; set; }
    /// <summary>出租面积</summary>
    public decimal RentedArea { get; set; }

    // 同比/环比
    /// <summary>出租率同比</summary>
    public double? OccupancyRateYoY { get; set; }
    /// <summary>出租率环比</summary>
    public double? OccupancyRateMoM { get; set; }
    /// <summary>出租面积同比</summary>
    public double? RentedAreaYoY { get; set; }
    /// <summary>出租面积环比</summary>
    public double? RentedAreaMoM { get; set; }
}

// ===== 招商管理 DTOs =====

public class InvestmentLeadListRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? Source { get; set; }
    public string? Priority { get; set; }
    public string? AssignedTo { get; set; }
    public string? SortBy { get; set; }
    public string? SortOrder { get; set; }
}

public class InvestmentLeadListResponse
{
    public List<InvestmentLeadDto> Leads { get; set; } = new();
    public int Total { get; set; }
}

public class InvestmentLeadDto
{
    public string Id { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Industry { get; set; }
    public string Source { get; set; } = string.Empty;
    public decimal? IntendedArea { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
    public string? AssignedToName { get; set; }
    public DateTime? NextFollowUpDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateInvestmentLeadRequest
{
    [Required]
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Industry { get; set; }
    public string? Source { get; set; }
    public decimal? IntendedArea { get; set; }
    public decimal? Budget { get; set; }
    public string? Priority { get; set; }
    public string? Requirements { get; set; }
    public string? Notes { get; set; }
    public string? AssignedTo { get; set; }
    public DateTime? NextFollowUpDate { get; set; }
}

public class InvestmentProjectListRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Search { get; set; }
    public string? Stage { get; set; }
    public string? AssignedTo { get; set; }
    public string? SortBy { get; set; }
    public string? SortOrder { get; set; }
}

public class InvestmentProjectListResponse
{
    public List<InvestmentProjectDto> Projects { get; set; } = new();
    public int Total { get; set; }
}

public class InvestmentProjectDto
{
    public string Id { get; set; } = string.Empty;
    public string? LeadId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public decimal? IntendedArea { get; set; }
    public decimal? ProposedRent { get; set; }
    public string Stage { get; set; } = string.Empty;
    public DateTime? ExpectedSignDate { get; set; }
    public decimal? Probability { get; set; }
    public string? AssignedTo { get; set; }
    public string? AssignedToName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateInvestmentProjectRequest
{
    public string? LeadId { get; set; }
    [Required]
    public string ProjectName { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public List<string>? IntendedUnitIds { get; set; }
    public decimal? IntendedArea { get; set; }
    public decimal? ProposedRent { get; set; }
    public string? Stage { get; set; }
    public DateTime? ExpectedSignDate { get; set; }
    public decimal? Probability { get; set; }
    public string? Notes { get; set; }
    public string? AssignedTo { get; set; }
}

public class InvestmentStatisticsResponse
{
    public int TotalLeads { get; set; }
    public int NewLeadsThisMonth { get; set; }
    public int TotalProjects { get; set; }
    public int ProjectsInNegotiation { get; set; }
    public int SignedProjects { get; set; }
    public decimal ConversionRate { get; set; }
    public Dictionary<string, int> LeadsByStatus { get; set; } = new();
    public Dictionary<string, int> ProjectsByStage { get; set; } = new();

    // 同比/环比
    /// <summary>新增线索同比</summary>
    public double? NewLeadsYoY { get; set; }
    /// <summary>新增线索环比</summary>
    public double? NewLeadsMoM { get; set; }
    /// <summary>签约项目同比</summary>
    public double? SignedProjectsYoY { get; set; }
    /// <summary>签约项目环比</summary>
    public double? SignedProjectsMoM { get; set; }
}

// ===== 租户管理 DTOs =====

/// <summary>
/// 租户列表请求
/// </summary>
public class ParkTenantListRequest
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;
    /// <summary>每页大小</summary>
    public int PageSize { get; set; } = 10;
    /// <summary>搜索关键词</summary>
    public string? Search { get; set; }
    /// <summary>状态</summary>
    public string? Status { get; set; }
    /// <summary>行业</summary>
    public string? Industry { get; set; }
    /// <summary>排序字段</summary>
    public string? SortBy { get; set; }
    /// <summary>排序顺序</summary>
    public string? SortOrder { get; set; }
}

public class ParkTenantListResponse
{
    public List<ParkTenantDto> Tenants { get; set; } = new();
    public int Total { get; set; }
}

public class ParkTenantDto
{
    public string Id { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Industry { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? EntryDate { get; set; }
    public int UnitCount { get; set; }
    public decimal TotalArea { get; set; }
    public int ActiveContracts { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateParkTenantRequest
{
    [Required]
    public string TenantName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Industry { get; set; }
    public string? BusinessLicense { get; set; }
    public string? Address { get; set; }
    public DateTime? EntryDate { get; set; }
    public string? Notes { get; set; }
}

public class LeaseContractListRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? TenantId { get; set; }
    public string? Search { get; set; }
    public string? Status { get; set; }
    public bool? ExpiringWithin30Days { get; set; }
    public string? SortBy { get; set; }
    public string? SortOrder { get; set; }
}

public class LeaseContractListResponse
{
    public List<LeaseContractDto> Contracts { get; set; } = new();
    public int Total { get; set; }
}

public class LeaseContractDto
{
    public string Id { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string? TenantName { get; set; }
    public string ContractNumber { get; set; } = string.Empty;
    public List<string> UnitIds { get; set; } = new();
    public List<string>? UnitNumbers { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal MonthlyRent { get; set; }
    public decimal? Deposit { get; set; }
    public string PaymentCycle { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int DaysUntilExpiry { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateLeaseContractRequest
{
    [Required]
    public string TenantId { get; set; } = string.Empty;
    [Required]
    public string ContractNumber { get; set; } = string.Empty;
    public List<string> UnitIds { get; set; } = new();
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal MonthlyRent { get; set; }
    public decimal? Deposit { get; set; }
    public string? PaymentCycle { get; set; }
    public int PaymentDay { get; set; } = 1;
    public string? Terms { get; set; }
    public List<string>? Attachments { get; set; }
}

public class TenantStatisticsResponse
{
    public int TotalTenants { get; set; }
    public int ActiveTenants { get; set; }
    public int TotalContracts { get; set; }
    public int ActiveContracts { get; set; }
    public int ExpiringContracts { get; set; } // 30天内到期
    public decimal TotalMonthlyRent { get; set; }
    public Dictionary<string, int> TenantsByIndustry { get; set; } = new();

    // 同比/环比
    /// <summary>月租金同比</summary>
    public double? MonthlyRentYoY { get; set; }
    /// <summary>月租金环比</summary>
    public double? MonthlyRentMoM { get; set; }
    /// <summary>活跃租户同比</summary>
    public double? ActiveTenantsYoY { get; set; }
    /// <summary>活跃租户环比</summary>
    public double? ActiveTenantsMoM { get; set; }
}

// ===== 企业服务 DTOs =====

public class ServiceCategoryListResponse
{
    public List<ServiceCategoryDto> Categories { get; set; } = new();
}

public class ServiceCategoryDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public int RequestCount { get; set; }
}

public class CreateServiceCategoryRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public int SortOrder { get; set; }
}

public class ServiceRequestListRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? CategoryId { get; set; }
    public string? TenantId { get; set; }
    public string? Search { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? AssignedTo { get; set; }
    public string? SortBy { get; set; }
    public string? SortOrder { get; set; }
}

public class ServiceRequestListResponse
{
    public List<ServiceRequestDto> Requests { get; set; } = new();
    public int Total { get; set; }
}

public class ServiceRequestDto
{
    public string Id { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string? CategoryName { get; set; }
    public string? TenantId { get; set; }
    public string? TenantName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
    public string? AssignedToName { get; set; }
    public DateTime? CompletedAt { get; set; }
    /// <summary>评分</summary>
    public int? Rating { get; set; }
    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }
}

public class CreateServiceRequestRequest
{
    [Required]
    public string CategoryId { get; set; } = string.Empty;
    public string? TenantId { get; set; }
    [Required]
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactPhone { get; set; }
    public string? Priority { get; set; }
    public List<string>? Attachments { get; set; }
}

public class UpdateServiceRequestStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
    public string? Resolution { get; set; }
}

public class ServiceStatisticsResponse
{
    public int TotalCategories { get; set; }
    public int ActiveCategories { get; set; }
    public int TotalRequests { get; set; }
    public int PendingRequests { get; set; }
    public int ProcessingRequests { get; set; }
    public int CompletedRequests { get; set; }
    public decimal AverageRating { get; set; }
    public Dictionary<string, int> RequestsByCategory { get; set; } = new();
    public Dictionary<string, int> RequestsByStatus { get; set; } = new();

    // 同比/环比
    public double? TotalRequestsYoY { get; set; }
    public double? TotalRequestsMoM { get; set; }
    public double? AverageRatingYoY { get; set; }
    public double? AverageRatingMoM { get; set; }
}

#endregion
