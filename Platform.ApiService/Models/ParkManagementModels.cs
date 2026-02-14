using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 统计周期
/// </summary>
public enum StatisticsPeriod
{
    /// <summary>天</summary>
    Day,
    /// <summary>周</summary>
    Week,
    /// <summary>月</summary>
    Month,
    /// <summary>季</summary>
    Quarter,
    /// <summary>年</summary>
    Year,
    /// <summary>自定义</summary>
    Custom
}

#region 资产管理模型 (Asset Management)

/// <summary>
/// 楼宇信息
/// </summary>
[BsonIgnoreExtraElements]
[Table("buildings")]
public class Building : MultiTenantEntity
{
    /// <summary>楼宇名称</summary>
    [Required]
    [StringLength(100)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>楼宇地址</summary>
    [StringLength(500)]
    [Column("address")]
    [BsonElement("address")]
    public string? Address { get; set; }

    /// <summary>总层数</summary>
    [Range(1, 200)]
    [Column("totalFloors")]
    [BsonElement("totalFloors")]
    public int TotalFloors { get; set; }

    /// <summary>总面积</summary>
    [Column("totalArea")]
    [BsonElement("totalArea")]
    public decimal TotalArea { get; set; }

    /// <summary>楼宇类型</summary>
    [StringLength(50)]
    [Column("buildingType")]
    [BsonElement("buildingType")]
    public string? BuildingType { get; set; }

    /// <summary>建成年份</summary>
    [Range(1900, 2100)]
    [Column("yearBuilt")]
    [BsonElement("yearBuilt")]
    public int YearBuilt { get; set; }

    /// <summary>交付/取得日期</summary>
    [Required]
    [Column("deliveryDate")]
    [BsonElement("deliveryDate")]
    public DateTime? DeliveryDate { get; set; }

    /// <summary>状态</summary>
    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Active";

    /// <summary>楼宇描述</summary>
    [StringLength(1000)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>封面图片</summary>
    [StringLength(500)]
    [Column("coverImage")]
    [BsonElement("coverImage")]
    public string? CoverImage { get; set; }

    /// <summary>楼宇图片集</summary>
    [Column("images")]
    [BsonElement("images")]
    public List<string>? Images { get; set; }

    /// <summary>附件列表</summary>
    [Column("attachments")]
    [BsonElement("attachments")]
    public List<string>? Attachments { get; set; }
}

/// <summary>
/// 房源/可租赁单元
/// </summary>
[BsonIgnoreExtraElements]
[Table("propertyUnits")]
public class PropertyUnit : MultiTenantEntity
{
    /// <summary>所属楼宇ID</summary>
    [Required]
    [StringLength(100)]
    [Column("buildingId")]
    [BsonElement("buildingId")]
    public string BuildingId { get; set; } = string.Empty;

    /// <summary>房号</summary>
    [Required]
    [StringLength(50)]
    [Column("unitNumber")]
    [BsonElement("unitNumber")]
    public string UnitNumber { get; set; } = string.Empty;

    /// <summary>所在楼层</summary>
    [Range(-10, 200)]
    [Column("floor")]
    [BsonElement("floor")]
    public int Floor { get; set; }

    /// <summary>面积</summary>
    [Column("area")]
    [BsonElement("area")]
    public decimal Area { get; set; }

    /// <summary>月租金</summary>
    [Column("monthlyRent")]
    [BsonElement("monthlyRent")]
    public decimal MonthlyRent { get; set; }

    /// <summary>日租金</summary>
    [Column("dailyRent")]
    [BsonElement("dailyRent")]
    public decimal? DailyRent { get; set; }

    /// <summary>单元类型</summary>
    [StringLength(50)]
    [Column("unitType")]
    [BsonElement("unitType")]
    public string UnitType { get; set; } = "Office";

    /// <summary>状态</summary>
    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Available";

    /// <summary>描述</summary>
    [StringLength(1000)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>当前租户ID</summary>
    [StringLength(100)]
    [Column("currentTenantId")]
    [BsonElement("currentTenantId")]
    public string? CurrentTenantId { get; set; }

    /// <summary>起租日期</summary>
    [Column("leaseStartDate")]
    [BsonElement("leaseStartDate")]
    public DateTime? LeaseStartDate { get; set; }

    /// <summary>免租到期日期/租约到期日期</summary>
    [Column("leaseEndDate")]
    [BsonElement("leaseEndDate")]
    public DateTime? LeaseEndDate { get; set; }

    /// <summary>配属设施</summary>
    [Column("facilities")]
    [BsonElement("facilities")]
    public List<string>? Facilities { get; set; }

    /// <summary>图片集</summary>
    [Column("images")]
    [BsonElement("images")]
    public List<string>? Images { get; set; }

    /// <summary>附件列表</summary>
    [Column("attachments")]
    [BsonElement("attachments")]
    public List<string>? Attachments { get; set; }
}

#endregion

#region 招商管理模型 (Investment Promotion)

/// <summary>
/// 招商线索
/// </summary>
[BsonIgnoreExtraElements]
[Table("investmentLeads")]
public class InvestmentLead : MultiTenantEntity
{
    /// <summary>企业名称</summary>
    [Required]
    [StringLength(200)]
    [Column("companyName")]
    [BsonElement("companyName")]
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    [StringLength(100)]
    [Column("contactPerson")]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    [StringLength(50)]
    [Column("phone")]
    [BsonElement("phone")]
    public string? Phone { get; set; }

    /// <summary>邮箱</summary>
    [StringLength(200)]
    [Column("email")]
    [BsonElement("email")]
    [EmailAddress]
    public string? Email { get; set; }

    /// <summary>所属行业</summary>
    [StringLength(50)]
    [Column("industry")]
    [BsonElement("industry")]
    public string? Industry { get; set; }

    /// <summary>线索来源</summary>
    [StringLength(50)]
    [Column("source")]
    [BsonElement("source")]
    public string Source { get; set; } = "Direct";

    /// <summary>意向面积</summary>
    [Column("intendedArea")]
    [BsonElement("intendedArea")]
    public decimal? IntendedArea { get; set; }

    /// <summary>预算</summary>
    [Column("budget")]
    [BsonElement("budget")]
    public decimal? Budget { get; set; }

    /// <summary>状态</summary>
    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "New";

    /// <summary>优先级</summary>
    [StringLength(20)]
    [Column("priority")]
    [BsonElement("priority")]
    public string Priority { get; set; } = "Medium";

    /// <summary>需求描述</summary>
    [StringLength(2000)]
    [Column("requirements")]
    [BsonElement("requirements")]
    public string? Requirements { get; set; }

    /// <summary>备注</summary>
    [StringLength(2000)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }

    /// <summary>分配给谁</summary>
    [StringLength(100)]
    [Column("assignedTo")]
    [BsonElement("assignedTo")]
    public string? AssignedTo { get; set; }

    /// <summary>下次跟进日期</summary>
    [Column("nextFollowUpDate")]
    [BsonElement("nextFollowUpDate")]
    public DateTime? NextFollowUpDate { get; set; }
}

/// <summary>
/// 招商项目（从线索转化而来）
/// </summary>
[BsonIgnoreExtraElements]
[Table("investmentProjects")]
public class InvestmentProject : MultiTenantEntity
{
    /// <summary>线索ID</summary>
    [StringLength(100)]
    [Column("leadId")]
    [BsonElement("leadId")]
    public string? LeadId { get; set; }

    /// <summary>项目名称</summary>
    [Required]
    [StringLength(200)]
    [Column("projectName")]
    [BsonElement("projectName")]
    public string ProjectName { get; set; } = string.Empty;

    /// <summary>企业名称</summary>
    [StringLength(200)]
    [Column("companyName")]
    [BsonElement("companyName")]
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    [StringLength(100)]
    [Column("contactPerson")]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    [StringLength(50)]
    [Column("phone")]
    [BsonElement("phone")]
    public string? Phone { get; set; }

    /// <summary>意向房源集合</summary>
    [Column("intendedUnitIds")]
    [BsonElement("intendedUnitIds")]
    public List<string>? IntendedUnitIds { get; set; }

    /// <summary>意向面积</summary>
    [Column("intendedArea")]
    [BsonElement("intendedArea")]
    public decimal? IntendedArea { get; set; }

    /// <summary>预期租金</summary>
    [Column("proposedRent")]
    [BsonElement("proposedRent")]
    public decimal? ProposedRent { get; set; }

    /// <summary>项目阶段</summary>
    [StringLength(20)]
    [Column("stage")]
    [BsonElement("stage")]
    public string Stage { get; set; } = "Initial";

    /// <summary>预计签约日期</summary>
    [Column("expectedSignDate")]
    [BsonElement("expectedSignDate")]
    public DateTime? ExpectedSignDate { get; set; }

    /// <summary>成功概率百分比</summary>
    [Range(0, 100)]
    [Column("probability")]
    [BsonElement("probability")]
    public decimal? Probability { get; set; }

    /// <summary>备注</summary>
    [StringLength(2000)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }

    /// <summary>分配给谁</summary>
    [StringLength(100)]
    [Column("assignedTo")]
    [BsonElement("assignedTo")]
    public string? AssignedTo { get; set; }
}

/// <summary>
/// 招商跟进记录
/// </summary>
[BsonIgnoreExtraElements]
[Table("investmentFollowUps")]
public class InvestmentFollowUp : BaseEntity
{
    /// <summary>线索ID</summary>
    [StringLength(100)]
    [Column("leadId")]
    [BsonElement("leadId")]
    public string? LeadId { get; set; }

    /// <summary>项目ID</summary>
    [StringLength(100)]
    [Column("projectId")]
    [BsonElement("projectId")]
    public string? ProjectId { get; set; }

    /// <summary>跟进方式</summary>
    [StringLength(50)]
    [Column("followUpType")]
    [BsonElement("followUpType")]
    public string FollowUpType { get; set; } = "Call";

    /// <summary>跟进内容</summary>
    [Required]
    [StringLength(2000)]
    [Column("content")]
    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;

    /// <summary>跟进结果</summary>
    [StringLength(500)]
    [Column("result")]
    [BsonElement("result")]
    public string? Result { get; set; }

    /// <summary>下次跟进日期</summary>
    [Column("nextFollowUpDate")]
    [BsonElement("nextFollowUpDate")]
    public DateTime? NextFollowUpDate { get; set; }

    /// <summary>后续计划</summary>
    [StringLength(500)]
    [Column("nextAction")]
    [BsonElement("nextAction")]
    public string? NextAction { get; set; }
}

#endregion

#region 租户管理模型 (Tenant Management)

/// <summary>
/// 园区租户
/// </summary>
[BsonIgnoreExtraElements]
[Table("parkTenants")]
public class ParkTenant : MultiTenantEntity
{
    /// <summary>租户名称</summary>
    [Required]
    [StringLength(200)]
    [Column("tenantName")]
    [BsonElement("tenantName")]
    public string TenantName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    [StringLength(100)]
    [Column("contactPerson")]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    [StringLength(50)]
    [Column("phone")]
    [BsonElement("phone")]
    public string? Phone { get; set; }

    /// <summary>邮箱</summary>
    [StringLength(200)]
    [Column("email")]
    [BsonElement("email")]
    [EmailAddress]
    public string? Email { get; set; }

    /// <summary>所属行业</summary>
    [StringLength(50)]
    [Column("industry")]
    [BsonElement("industry")]
    public string? Industry { get; set; }

    /// <summary>营业执照号</summary>
    [StringLength(100)]
    [Column("businessLicense")]
    [BsonElement("businessLicense")]
    public string? BusinessLicense { get; set; }

    /// <summary>地址</summary>
    [StringLength(500)]
    [Column("address")]
    [BsonElement("address")]
    public string? Address { get; set; }

    /// <summary>租用单元ID集合</summary>
    [Column("unitIds")]
    [BsonElement("unitIds")]
    public List<string>? UnitIds { get; set; }

    /// <summary>状态</summary>
    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Active";

    /// <summary>入驻日期</summary>
    [Column("entryDate")]
    [BsonElement("entryDate")]
    public DateTime? EntryDate { get; set; }

    /// <summary>迁出日期</summary>
    [Column("exitDate")]
    [BsonElement("exitDate")]
    public DateTime? ExitDate { get; set; }

    /// <summary>备注</summary>
    [StringLength(2000)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }
}

/// <summary>
/// 租赁合同
/// </summary>
[BsonIgnoreExtraElements]
[Table("leaseContracts")]
public class LeaseContract : MultiTenantEntity
{
    /// <summary>租户ID</summary>
    [Required]
    [StringLength(100)]
    [Column("tenantId")]
    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>合同编号</summary>
    [Required]
    [StringLength(100)]
    [Column("contractNumber")]
    [BsonElement("contractNumber")]
    public string ContractNumber { get; set; } = string.Empty;

    /// <summary>租赁单元ID集合</summary>
    [Column("unitIds")]
    [BsonElement("unitIds")]
    public List<string> UnitIds { get; set; } = new();

    /// <summary>开始日期</summary>
    [Required]
    [Column("startDate")]
    [BsonElement("startDate")]
    public DateTime StartDate { get; set; }

    /// <summary>结束日期</summary>
    [Required]
    [Column("endDate")]
    [BsonElement("endDate")]
    public DateTime EndDate { get; set; }

    /// <summary>月租金</summary>
    [Column("monthlyRent")]
    [BsonElement("monthlyRent")]
    public decimal MonthlyRent { get; set; }

    /// <summary>租赁计费方式</summary>
    [StringLength(50)]
    [Column("rentalPricingMethod")]
    [BsonElement("rentalPricingMethod")]
    public string RentalPricingMethod { get; set; } = "FixedMonthly";

    /// <summary>单价</summary>
    [Column("unitPrice")]
    [BsonElement("unitPrice")]
    public decimal? UnitPrice { get; set; }

    /// <summary>押金</summary>
    [Column("deposit")]
    [BsonElement("deposit")]
    public decimal? Deposit { get; set; }

    /// <summary>物业费（月）</summary>
    [Column("propertyFee")]
    [BsonElement("propertyFee")]
    public decimal? PropertyFee { get; set; }

    /// <summary>合同总额</summary>
    [Column("totalAmount")]
    [BsonElement("totalAmount")]
    public decimal? TotalAmount { get; set; }

    /// <summary>付款周期</summary>
    [StringLength(20)]
    [Column("paymentCycle")]
    [BsonElement("paymentCycle")]
    public string PaymentCycle { get; set; } = "Monthly";

    /// <summary>付款日</summary>
    [Range(1, 28)]
    [Column("paymentDay")]
    [BsonElement("paymentDay")]
    public int PaymentDay { get; set; } = 1;

    /// <summary>状态</summary>
    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Active";

    /// <summary>合同条款</summary>
    [StringLength(2000)]
    [Column("terms")]
    [BsonElement("terms")]
    public string? Terms { get; set; }

    /// <summary>附件列表</summary>
    [Column("attachments")]
    [BsonElement("attachments")]
    public List<string>? Attachments { get; set; }
}

/// <summary>
/// 租赁合同付款记录
/// </summary>
[BsonIgnoreExtraElements]
[Table("leasePaymentRecords")]
public class LeasePaymentRecord : MultiTenantEntity
{
    /// <summary>合同ID</summary>
    [Required]
    [StringLength(100)]
    [Column("contractId")]
    [BsonElement("contractId")]
    public string ContractId { get; set; } = string.Empty;

    /// <summary>租户ID</summary>
    [Required]
    [StringLength(100)]
    [Column("tenantId")]
    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>付款类型</summary>
    [StringLength(50)]
    [Column("paymentType")]
    [BsonElement("paymentType")]
    public string PaymentType { get; set; } = "Rent";

    /// <summary>付款金额</summary>
    [Column("amount")]
    [BsonElement("amount")]
    public decimal Amount { get; set; }

    /// <summary>付款日期</summary>
    [Required]
    [Column("paymentDate")]
    [BsonElement("paymentDate")]
    public DateTime PaymentDate { get; set; }

    /// <summary>付款方式</summary>
    [StringLength(50)]
    [Column("paymentMethod")]
    [BsonElement("paymentMethod")]
    public string? PaymentMethod { get; set; }

    /// <summary>账期开始</summary>
    [Column("periodStart")]
    [BsonElement("periodStart")]
    public DateTime? PeriodStart { get; set; }

    /// <summary>账期结束</summary>
    [Column("periodEnd")]
    [BsonElement("periodEnd")]
    public DateTime? PeriodEnd { get; set; }

    /// <summary>备注</summary>
    [StringLength(500)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }

    /// <summary>经办人</summary>
    [StringLength(100)]
    [Column("handledBy")]
    [BsonElement("handledBy")]
    public string? HandledBy { get; set; }
}

/// <summary>
/// 租金账单
/// </summary>
[BsonIgnoreExtraElements]
[Table("rentBills")]
public class RentBill : MultiTenantEntity
{
    /// <summary>合同ID</summary>
    [Required]
    [StringLength(100)]
    [Column("contractId")]
    [BsonElement("contractId")]
    public string ContractId { get; set; } = string.Empty;

    /// <summary>租户ID</summary>
    [Required]
    [StringLength(100)]
    [Column("tenantId")]
    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>账单编号</summary>
    [Required]
    [StringLength(100)]
    [Column("billNumber")]
    [BsonElement("billNumber")]
    public string BillNumber { get; set; } = string.Empty;

    /// <summary>账单年份</summary>
    [Range(2000, 2100)]
    [Column("billYear")]
    [BsonElement("billYear")]
    public int BillYear { get; set; }

    /// <summary>账单月份</summary>
    [Range(1, 12)]
    [Column("billMonth")]
    [BsonElement("billMonth")]
    public int BillMonth { get; set; }

    /// <summary>金额</summary>
    [Column("amount")]
    [BsonElement("amount")]
    public decimal Amount { get; set; }

    /// <summary>已付金额</summary>
    [Column("paidAmount")]
    [BsonElement("paidAmount")]
    public decimal? PaidAmount { get; set; }

    /// <summary>应付日期</summary>
    [Required]
    [Column("dueDate")]
    [BsonElement("dueDate")]
    public DateTime DueDate { get; set; }

    /// <summary>实付日期</summary>
    [Column("paidDate")]
    [BsonElement("paidDate")]
    public DateTime? PaidDate { get; set; }

    /// <summary>状态</summary>
    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Pending";

    /// <summary>备注</summary>
    [StringLength(500)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }
}

#endregion

#region 企业服务模型 (Enterprise Services)

/// <summary>
/// 服务类别
/// </summary>
[BsonIgnoreExtraElements]
[Table("serviceCategories")]
public class ServiceCategory : MultiTenantEntity
{
    /// <summary>类别名称</summary>
    [Required]
    [StringLength(100)]
    [Column("name")]
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>描述</summary>
    [StringLength(500)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>图标</summary>
    [StringLength(100)]
    [Column("icon")]
    [BsonElement("icon")]
    public string? Icon { get; set; }

    /// <summary>排序号</summary>
    [Column("sortOrder")]
    [BsonElement("sortOrder")]
    public int SortOrder { get; set; }

    /// <summary>是否启用</summary>
    [Column("isActive")]
    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// 服务申请
/// </summary>
[BsonIgnoreExtraElements]
[Table("serviceRequests")]
public class ServiceRequest : MultiTenantEntity
{
    /// <summary>类别ID</summary>
    [Required]
    [StringLength(100)]
    [Column("categoryId")]
    [BsonElement("categoryId")]
    public string CategoryId { get; set; } = string.Empty;

    /// <summary>租户ID</summary>
    [StringLength(100)]
    [Column("tenantId")]
    [BsonElement("tenantId")]
    public string? TenantId { get; set; }

    /// <summary>标题</summary>
    [Required]
    [StringLength(200)]
    [Column("title")]
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>需求描述</summary>
    [StringLength(2000)]
    [Column("description")]
    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>联系人</summary>
    [StringLength(100)]
    [Column("contactPerson")]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    [StringLength(50)]
    [Column("contactPhone")]
    [BsonElement("contactPhone")]
    public string? ContactPhone { get; set; }

    /// <summary>优先级</summary>
    [StringLength(20)]
    [Column("priority")]
    [BsonElement("priority")]
    public string Priority { get; set; } = "Normal";

    /// <summary>状态</summary>
    [StringLength(200)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Pending";

    /// <summary>分配给谁</summary>
    [StringLength(100)]
    [Column("assignedTo")]
    [BsonElement("assignedTo")]
    public string? AssignedTo { get; set; }

    /// <summary>分配时间</summary>
    [Column("assignedAt")]
    [BsonElement("assignedAt")]
    public DateTime? AssignedAt { get; set; }

    /// <summary>完成时间</summary>
    [Column("completedAt")]
    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }

    /// <summary>处理方案</summary>
    [StringLength(2000)]
    [Column("resolution")]
    [BsonElement("resolution")]
    public string? Resolution { get; set; }

    /// <summary>评分</summary>
    [Range(1, 5)]
    [Column("rating")]
    [BsonElement("rating")]
    public int? Rating { get; set; }

    /// <summary>反馈意见</summary>
    [StringLength(500)]
    [Column("feedback")]
    [BsonElement("feedback")]
    public string? Feedback { get; set; }

    /// <summary>附件列表</summary>
    [Column("attachments")]
    [BsonElement("attachments")]
    public List<string>? Attachments { get; set; }
}

#endregion

#region 走访管理模型 (Visit Management)

/// <summary>
/// 走访任务
/// </summary>
[BsonIgnoreExtraElements]
[Table("visitTasks")]
public class VisitTask : MultiTenantEntity
{
    /// <summary>企管员姓名</summary>
    [Required]
    [StringLength(100)]
    [Column("managerName")]
    [BsonElement("managerName")]
    public string ManagerName { get; set; } = string.Empty;

    /// <summary>企管员手机号</summary>
    [Required]
    [StringLength(20)]
    [Column("phone")]
    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;

    /// <summary>任务标题/主题</summary>
    [Required]
    [StringLength(200)]
    [Column("title")]
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>走访类型 (日常走访、安全检查、政策宣讲、需球调研、其他)</summary>
    [StringLength(50)]
    [Column("visitType")]
    [BsonElement("visitType")]
    public string VisitType { get; set; } = "日常走访";

    /// <summary>走访方式 (实地走访、电话沟通、微信联系)</summary>
    [StringLength(50)]
    [Column("visitMethod")]
    [BsonElement("visitMethod")]
    public string VisitMethod { get; set; } = "实地走访";

    /// <summary>计划/任务说明</summary>
    [StringLength(2000)]
    [Column("details")]
    [BsonElement("details")]
    public string? Details { get; set; }

    /// <summary>受访企业ID</summary>
    [StringLength(100)]
    [Column("tenantId")]
    [BsonElement("tenantId")]
    public string? TenantId { get; set; }

    /// <summary>受访企业名称 (冗余)</summary>
    [StringLength(200)]
    [Column("tenantName")]
    [BsonElement("tenantName")]
    public string? TenantName { get; set; }

    /// <summary>受访地点</summary>
    [StringLength(500)]
    [Column("visitLocation")]
    [BsonElement("visitLocation")]
    public string? VisitLocation { get; set; }

    /// <summary>计划/实际走访日期 (必填，统计报表依赖此数据)</summary>
    [Required]
    [Column("visitDate")]
    [BsonElement("visitDate")]
    public DateTime VisitDate { get; set; }

    /// <summary>状态 (Pending-待走访, Completed-已完成, Cancelled-已取消)</summary>
    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Pending";

    /// <summary>关联问卷ID</summary>
    [StringLength(100)]
    [Column("questionnaireId")]
    [BsonElement("questionnaireId")]
    public string? QuestionnaireId { get; set; }

    /// <summary>走访执行人</summary>
    [StringLength(100)]
    [Column("visitor")]
    [BsonElement("visitor")]
    public string? Visitor { get; set; }

    /// <summary>受访人姓名</summary>
    [StringLength(100)]
    [Column("intervieweeName")]
    [BsonElement("intervieweeName")]
    public string? IntervieweeName { get; set; }

    /// <summary>受访人职务</summary>
    [StringLength(100)]
    [Column("intervieweePosition")]
    [BsonElement("intervieweePosition")]
    public string? IntervieweePosition { get; set; }

    /// <summary>受访人联系方式</summary>
    [StringLength(50)]
    [Column("intervieweePhone")]
    [BsonElement("intervieweePhone")]
    public string? IntervieweePhone { get; set; }

    /// <summary>走访纪要/内容记录</summary>
    [Column("content")]
    [BsonElement("content")]
    public string? Content { get; set; }

    /// <summary>现场照片列表</summary>
    [Column("photos")]
    [BsonElement("photos")]
    public List<string> Photos { get; set; } = new();

    /// <summary>附件列表</summary>
    [Column("attachments")]
    [BsonElement("attachments")]
    public List<string> Attachments { get; set; } = new();

    /// <summary>企业反馈/诉求</summary>
    [Column("feedback")]
    [BsonElement("feedback")]
    public string? Feedback { get; set; }
}

/// <summary>
/// 走访考核情况
/// </summary>
[BsonIgnoreExtraElements]
[Table("visitAssessments")]
public class VisitAssessment : MultiTenantEntity
{
    /// <summary>关联走访任务ID</summary>
    [Required]
    [StringLength(100)]
    [Column("taskId")]
    [BsonElement("taskId")]
    public string TaskId { get; set; } = string.Empty;

    /// <summary>走访人姓名</summary>
    [Required]
    [StringLength(100)]
    [Column("visitorName")]
    [BsonElement("visitorName")]
    public string VisitorName { get; set; } = string.Empty;

    /// <summary>手机号</summary>
    [Required]
    [StringLength(50)]
    [Column("phone")]
    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;

    /// <summary>走访地点</summary>
    [Required]
    [StringLength(500)]
    [Column("location")]
    [BsonElement("location")]
    public string Location { get; set; } = string.Empty;

    /// <summary>走访任务描述</summary>
    [Required]
    [StringLength(2000)]
    [Column("taskDescription")]
    [BsonElement("taskDescription")]
    public string TaskDescription { get; set; } = string.Empty;

    /// <summary>考核评分</summary>
    [Range(0, 100)]
    [Column("score")]
    [BsonElement("score")]
    public int Score { get; set; }

    /// <summary>考核意见/评语</summary>
    [StringLength(1000)]
    [Column("comments")]
    [BsonElement("comments")]
    public string? Comments { get; set; }
}

/// <summary>
/// 走访高频问题 (知识库)
/// </summary>
[BsonIgnoreExtraElements]
[Table("visitQuestions")]
public class VisitQuestion : MultiTenantEntity
{
    /// <summary>问题内容</summary>
    [Required]
    [StringLength(1000)]
    [Column("content")]
    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;

    /// <summary>问题分类</summary>
    [StringLength(100)]
    [Column("category")]
    [BsonElement("category")]
    public string? Category { get; set; }

    /// <summary>标准回答/解析</summary>
    [StringLength(2000)]
    [Column("answer")]
    [BsonElement("answer")]
    public string? Answer { get; set; }

    /// <summary>是否常用</summary>
    public bool? IsFrequentlyUsed { get; set; }

    /// <summary>排序值</summary>
    [Column("sortOrder")]
    [BsonElement("sortOrder")]
    public int? SortOrder { get; set; }
}

/// <summary>
/// 走访问卷模板
/// </summary>
[BsonIgnoreExtraElements]
[Table("visitQuestionnaires")]
public class VisitQuestionnaire : MultiTenantEntity
{
    /// <summary>问卷名称</summary>
    [Required]
    [StringLength(200)]
    [Column("title")]
    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>走访目的</summary>
    [StringLength(500)]
    [Column("purpose")]
    [BsonElement("purpose")]
    public string? Purpose { get; set; }

    /// <summary>包含的问题ID集合</summary>
    [Column("questionIds")]
    [BsonElement("questionIds")]
    public List<string> QuestionIds { get; set; } = new();

    /// <summary>排序值</summary>
    [Column("sortOrder")]
    [BsonElement("sortOrder")]
    public int? SortOrder { get; set; }

    /// <summary>备注</summary>
    [StringLength(1000)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }
}

#endregion


#region DTOs

// ===== 资产管理 DTOs =====

/// <summary>
/// 楼宇列表请求参数
/// </summary>
public class BuildingListRequest
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页大小</summary>
    public int PageSize { get; set; } = 10;

    /// <summary>搜索关键词</summary>
    public string? Search { get; set; }

    /// <summary>状态</summary>
    public string? Status { get; set; }

    /// <summary>楼宇类型</summary>
    public string? BuildingType { get; set; }

    /// <summary>排序字段</summary>
    public string? SortBy { get; set; }

    /// <summary>排序顺序</summary>
    public string? SortOrder { get; set; }
}

/// <summary>
/// 楼宇列表响应
/// </summary>
public class BuildingListResponse
{
    /// <summary>楼宇列表</summary>
    public List<BuildingDto> Buildings { get; set; } = new();

    /// <summary>总数</summary>
    public int Total { get; set; }
}

/// <summary>
/// 楼宇数据传输对象
/// </summary>
public class BuildingDto
{
    /// <summary>楼宇ID</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>楼宇名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>地址</summary>
    public string? Address { get; set; }

    /// <summary>总层数</summary>
    public int TotalFloors { get; set; }

    /// <summary>总面积</summary>
    public decimal TotalArea { get; set; }

    /// <summary>已出租面积</summary>
    public decimal RentedArea { get; set; }

    /// <summary>出租率</summary>
    public decimal OccupancyRate { get; set; }

    /// <summary>楼宇类型</summary>
    public string? BuildingType { get; set; }

    /// <summary>建成年份</summary>
    public int YearBuilt { get; set; }

    /// <summary>交付/取得日期</summary>
    public DateTime? DeliveryDate { get; set; }

    /// <summary>状态</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>封面图片</summary>
    public string? CoverImage { get; set; }

    /// <summary>总单元数</summary>
    public int TotalUnits { get; set; }

    /// <summary>可用单元数</summary>
    public int AvailableUnits { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>图片列表</summary>
    public List<string>? Images { get; set; }

    /// <summary>附件列表</summary>
    public List<string>? Attachments { get; set; }
}

/// <summary>
/// 创建楼宇请求
/// </summary>
public class CreateBuildingRequest
{
    /// <summary>楼宇名称</summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>地址</summary>
    public string? Address { get; set; }

    /// <summary>总层数</summary>
    public int TotalFloors { get; set; }

    /// <summary>总面积</summary>
    public decimal TotalArea { get; set; }

    /// <summary>楼宇类型</summary>
    public string? BuildingType { get; set; }

    /// <summary>建成年份</summary>
    public int YearBuilt { get; set; }

    /// <summary>交付/取得日期</summary>
    [Required]
    public DateTime? DeliveryDate { get; set; }

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>封面图片</summary>
    public string? CoverImage { get; set; }

    /// <summary>图片列表</summary>
    public List<string>? Images { get; set; }

    /// <summary>附件列表</summary>
    public List<string>? Attachments { get; set; }
}


/// <summary>
/// 更新楼宇请求
/// </summary>
public class UpdateBuildingRequest : CreateBuildingRequest
{
    /// <summary>状态</summary>
    public string? Status { get; set; }
}

/// <summary>
/// 房源列表请求参数
/// </summary>
public class PropertyUnitListRequest
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页大小</summary>
    public int PageSize { get; set; } = 10;

    /// <summary>楼宇ID</summary>
    public string? BuildingId { get; set; }

    /// <summary>搜索关键词</summary>
    public string? Search { get; set; }

    /// <summary>状态</summary>
    public string? Status { get; set; }

    /// <summary>单元类型</summary>
    public string? UnitType { get; set; }

    /// <summary>楼层</summary>
    public int? Floor { get; set; }

    /// <summary>排序字段</summary>
    public string? SortBy { get; set; }

    /// <summary>排序顺序</summary>
    public string? SortOrder { get; set; }
}

/// <summary>
/// 房源列表响应
/// </summary>
public class PropertyUnitListResponse
{
    /// <summary>房源列表</summary>
    public List<PropertyUnitDto> Units { get; set; } = new();

    /// <summary>总数</summary>
    public int Total { get; set; }
}

/// <summary>
/// 房源数据传输对象
/// </summary>
public class PropertyUnitDto
{
    /// <summary>房源ID</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>楼宇ID</summary>
    public string BuildingId { get; set; } = string.Empty;

    /// <summary>楼宇名称</summary>
    public string? BuildingName { get; set; }

    /// <summary>房号</summary>
    public string UnitNumber { get; set; } = string.Empty;

    /// <summary>楼层</summary>
    public int Floor { get; set; }

    /// <summary>面积</summary>
    public decimal Area { get; set; }

    /// <summary>月租金</summary>
    public decimal MonthlyRent { get; set; }

    /// <summary>日租金</summary>
    public decimal? DailyRent { get; set; }

    /// <summary>单元类型</summary>
    public string UnitType { get; set; } = string.Empty;

    /// <summary>状态</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>当前租户ID</summary>
    public string? CurrentTenantId { get; set; }

    /// <summary>当前租户名称</summary>
    public string? CurrentTenantName { get; set; }

    /// <summary>租约到期日</summary>
    public DateTime? LeaseEndDate { get; set; }

    /// <summary>设施列表</summary>
    public List<string>? Facilities { get; set; }

    /// <summary>租赁历史</summary>
    public List<LeaseContractDto>? LeaseHistory { get; set; }

    /// <summary>附件列表</summary>
    public List<string>? Attachments { get; set; }
}

/// <summary>
/// 创建房源请求
/// </summary>
public class CreatePropertyUnitRequest
{
    /// <summary>楼宇ID</summary>
    [Required]
    public string BuildingId { get; set; } = string.Empty;

    /// <summary>房号</summary>
    [Required]
    public string UnitNumber { get; set; } = string.Empty;

    /// <summary>楼层</summary>
    public int Floor { get; set; }

    /// <summary>面积</summary>
    public decimal Area { get; set; }

    /// <summary>月租金</summary>
    public decimal MonthlyRent { get; set; }

    /// <summary>日租金</summary>
    public decimal? DailyRent { get; set; }

    /// <summary>单元类型</summary>
    public string? UnitType { get; set; }

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>设施列表</summary>
    public List<string>? Facilities { get; set; }

    /// <summary>图片列表</summary>
    public List<string>? Images { get; set; }

    /// <summary>附件列表</summary>
    public List<string>? Attachments { get; set; }
}

/// <summary>
/// 资产统计响应
/// </summary>
public class AssetStatisticsResponse
{
    /// <summary>楼宇总数</summary>
    public int TotalBuildings { get; set; }

    /// <summary>总面积</summary>
    public decimal TotalArea { get; set; }

    /// <summary>总单元数</summary>
    public int TotalUnits { get; set; }

    /// <summary>可用单元数</summary>
    public int AvailableUnits { get; set; }

    /// <summary>已租单元数</summary>
    public int RentedUnits { get; set; }

    /// <summary>出租率</summary>
    public decimal OccupancyRate { get; set; }

    /// <summary>总可租面积</summary>
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
    /// <summary>楼宇总数同比</summary>
    public double? TotalBuildingsYoY { get; set; }
    /// <summary>楼宇总数环比</summary>
    public double? TotalBuildingsMoM { get; set; }
}

// ===== 招商管理 DTOs =====

/// <summary>
/// 招商线索列表请求参数
/// </summary>
public class InvestmentLeadListRequest
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页大小</summary>
    public int PageSize { get; set; } = 10;

    /// <summary>搜索关键词</summary>
    public string? Search { get; set; }

    /// <summary>状态</summary>
    public string? Status { get; set; }

    /// <summary>来源</summary>
    public string? Source { get; set; }

    /// <summary>优先级</summary>
    public string? Priority { get; set; }

    /// <summary>分配给</summary>
    public string? AssignedTo { get; set; }

    /// <summary>排序字段</summary>
    public string? SortBy { get; set; }

    /// <summary>排序顺序</summary>
    public string? SortOrder { get; set; }
}

/// <summary>
/// 招商线索列表响应
/// </summary>
public class InvestmentLeadListResponse
{
    /// <summary>线索列表</summary>
    public List<InvestmentLeadDto> Leads { get; set; } = new();

    /// <summary>总数</summary>
    public int Total { get; set; }
}

/// <summary>
/// 招商线索数据传输对象
/// </summary>
public class InvestmentLeadDto
{
    /// <summary>线索ID</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>企业名称</summary>
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    public string? Phone { get; set; }

    /// <summary>邮箱</summary>
    public string? Email { get; set; }

    /// <summary>行业</summary>
    public string? Industry { get; set; }

    /// <summary>来源</summary>
    public string Source { get; set; } = string.Empty;

    /// <summary>意向面积</summary>
    public decimal? IntendedArea { get; set; }

    /// <summary>状态</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>优先级</summary>
    public string Priority { get; set; } = string.Empty;

    /// <summary>分配给</summary>
    public string? AssignedTo { get; set; }

    /// <summary>分配给（名称）</summary>
    public string? AssignedToName { get; set; }

    /// <summary>下次跟进日期</summary>
    public DateTime? NextFollowUpDate { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 创建招商线索请求
/// </summary>
public class CreateInvestmentLeadRequest
{
    /// <summary>企业名称</summary>
    [Required]
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    public string? Phone { get; set; }

    /// <summary>邮箱</summary>
    public string? Email { get; set; }

    /// <summary>行业</summary>
    public string? Industry { get; set; }

    /// <summary>来源</summary>
    public string? Source { get; set; }

    /// <summary>意向面积</summary>
    public decimal? IntendedArea { get; set; }

    /// <summary>预算</summary>
    public decimal? Budget { get; set; }

    /// <summary>优先级</summary>
    public string? Priority { get; set; }

    /// <summary>需求描述</summary>
    public string? Requirements { get; set; }

    /// <summary>备注</summary>
    public string? Notes { get; set; }

    /// <summary>分配给</summary>
    public string? AssignedTo { get; set; }

    /// <summary>下次跟进日期</summary>
    public DateTime? NextFollowUpDate { get; set; }
}

/// <summary>
/// 招商项目列表请求参数
/// </summary>
public class InvestmentProjectListRequest
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页大小</summary>
    public int PageSize { get; set; } = 10;

    /// <summary>搜索关键词</summary>
    public string? Search { get; set; }

    /// <summary>项目阶段</summary>
    public string? Stage { get; set; }

    /// <summary>分配给</summary>
    public string? AssignedTo { get; set; }

    /// <summary>排序字段</summary>
    public string? SortBy { get; set; }

    /// <summary>排序顺序</summary>
    public string? SortOrder { get; set; }
}

/// <summary>
/// 招商项目列表响应
/// </summary>
public class InvestmentProjectListResponse
{
    /// <summary>项目列表</summary>
    public List<InvestmentProjectDto> Projects { get; set; } = new();

    /// <summary>总数</summary>
    public int Total { get; set; }
}

/// <summary>
/// 招商项目数据传输对象
/// </summary>
public class InvestmentProjectDto
{
    /// <summary>项目ID</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>线索ID</summary>
    public string? LeadId { get; set; }

    /// <summary>项目名称</summary>
    public string ProjectName { get; set; } = string.Empty;

    /// <summary>企业名称</summary>
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    public string? Phone { get; set; }

    /// <summary>意向面积</summary>
    public decimal? IntendedArea { get; set; }

    /// <summary>提案租金</summary>
    public decimal? ProposedRent { get; set; }

    /// <summary>项目阶段</summary>
    public string Stage { get; set; } = string.Empty;

    /// <summary>预计签约日期</summary>
    public DateTime? ExpectedSignDate { get; set; }

    /// <summary>成功概率</summary>
    public decimal? Probability { get; set; }

    /// <summary>分配给</summary>
    public string? AssignedTo { get; set; }

    /// <summary>分配给（名称）</summary>
    public string? AssignedToName { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 创建招商项目请求
/// </summary>
public class CreateInvestmentProjectRequest
{
    /// <summary>线索ID</summary>
    public string? LeadId { get; set; }

    /// <summary>项目名称</summary>
    [Required]
    public string ProjectName { get; set; } = string.Empty;

    /// <summary>企业名称</summary>
    public string CompanyName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    public string? Phone { get; set; }

    /// <summary>意向单元ID集合</summary>
    public List<string>? IntendedUnitIds { get; set; }

    /// <summary>意向面积</summary>
    public decimal? IntendedArea { get; set; }

    /// <summary>提案租金</summary>
    public decimal? ProposedRent { get; set; }

    /// <summary>项目阶段</summary>
    public string? Stage { get; set; }

    /// <summary>预计签约日期</summary>
    public DateTime? ExpectedSignDate { get; set; }

    /// <summary>成功概率</summary>
    public decimal? Probability { get; set; }

    /// <summary>备注</summary>
    public string? Notes { get; set; }

    /// <summary>分配给</summary>
    public string? AssignedTo { get; set; }
}

/// <summary>
/// 招商统计响应
/// </summary>
public class InvestmentStatisticsResponse
{
    /// <summary>总线索数</summary>
    public int TotalLeads { get; set; }

    /// <summary>本月新增线索</summary>
    public int NewLeadsThisMonth { get; set; }

    /// <summary>总项目数</summary>
    public int TotalProjects { get; set; }

    /// <summary>洽谈中项目数</summary>
    public int ProjectsInNegotiation { get; set; }

    /// <summary>已签约项目数</summary>
    public int SignedProjects { get; set; }

    /// <summary>转化率</summary>
    public decimal ConversionRate { get; set; }

    /// <summary>按状态统计线索</summary>
    public Dictionary<string, int> LeadsByStatus { get; set; } = new();

    /// <summary>按阶段统计项目</summary>
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

/// <summary>
/// 租户列表响应
/// </summary>
public class ParkTenantListResponse
{
    /// <summary>租户列表</summary>
    public List<ParkTenantDto> Tenants { get; set; } = new();

    /// <summary>总数</summary>
    public int Total { get; set; }
}

/// <summary>
/// 租户数据传输对象
/// </summary>
public class ParkTenantDto
{
    /// <summary>租户ID</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>租户名称</summary>
    public string TenantName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    public string? Phone { get; set; }

    /// <summary>邮箱</summary>
    public string? Email { get; set; }

    /// <summary>行业</summary>
    public string? Industry { get; set; }

    /// <summary>状态</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>入驻日期</summary>
    public DateTime? EntryDate { get; set; }

    /// <summary>单元数量</summary>
    public int UnitCount { get; set; }

    /// <summary>总面积</summary>
    public decimal TotalArea { get; set; }

    /// <summary>活跃合同数</summary>
    public int ActiveContracts { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 创建租户请求
/// </summary>
public class CreateParkTenantRequest
{
    /// <summary>租户名称</summary>
    [Required]
    public string TenantName { get; set; } = string.Empty;

    /// <summary>联系人</summary>
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    public string? Phone { get; set; }

    /// <summary>邮箱</summary>
    public string? Email { get; set; }

    /// <summary>行业</summary>
    public string? Industry { get; set; }

    /// <summary>营业执照</summary>
    public string? BusinessLicense { get; set; }

    /// <summary>地址</summary>
    public string? Address { get; set; }

    /// <summary>入驻日期</summary>
    public DateTime? EntryDate { get; set; }

    /// <summary>备注</summary>
    public string? Notes { get; set; }
}

/// <summary>
/// 租赁合同列表请求参数
/// </summary>
public class LeaseContractListRequest
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页大小</summary>
    public int PageSize { get; set; } = 10;

    /// <summary>租户ID</summary>
    public string? TenantId { get; set; }

    /// <summary>搜索关键词</summary>
    public string? Search { get; set; }

    /// <summary>状态</summary>
    public string? Status { get; set; }

    /// <summary>是否即将到期（30天内）</summary>
    public bool? ExpiringWithin30Days { get; set; }

    /// <summary>排序字段</summary>
    public string? SortBy { get; set; }

    /// <summary>排序顺序</summary>
    public string? SortOrder { get; set; }
}

/// <summary>
/// 租赁合同列表响应
/// </summary>
public class LeaseContractListResponse
{
    /// <summary>合同列表</summary>
    public List<LeaseContractDto> Contracts { get; set; } = new();

    /// <summary>总数</summary>
    public int Total { get; set; }
}

/// <summary>
/// 租赁合同数据传输对象
/// </summary>
public class LeaseContractDto
{
    /// <summary>合同ID</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>租户ID</summary>
    public string TenantId { get; set; } = string.Empty;

    /// <summary>租户名称</summary>
    public string? TenantName { get; set; }

    /// <summary>合同编号</summary>
    public string ContractNumber { get; set; } = string.Empty;

    /// <summary>单元ID列表</summary>
    public List<string> UnitIds { get; set; } = new();

    /// <summary>单元编号列表</summary>
    public List<string>? UnitNumbers { get; set; }

    /// <summary>开始日期</summary>
    public DateTime StartDate { get; set; }

    /// <summary>结束日期</summary>
    public DateTime EndDate { get; set; }

    /// <summary>月租金</summary>
    public decimal MonthlyRent { get; set; }

    /// <summary>租赁计费方式</summary>
    public string RentalPricingMethod { get; set; } = string.Empty;

    /// <summary>单价</summary>
    public decimal? UnitPrice { get; set; }

    /// <summary>押金</summary>
    public decimal? Deposit { get; set; }

    /// <summary>物业费（月）</summary>
    public decimal? PropertyFee { get; set; }

    /// <summary>合同总额</summary>
    public decimal? TotalAmount { get; set; }

    /// <summary>付款周期</summary>
    public string PaymentCycle { get; set; } = string.Empty;

    /// <summary>付款日</summary>
    public int PaymentDay { get; set; }

    /// <summary>合同条款</summary>
    public string? Terms { get; set; }

    /// <summary>附件列表</summary>
    public List<string>? Attachments { get; set; }

    /// <summary>状态</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>距离到期天数</summary>
    public int DaysUntilExpiry { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>付款记录</summary>
    public List<LeasePaymentRecordDto>? PaymentRecords { get; set; }
}

/// <summary>
/// 租赁合同付款记录 DTO
/// </summary>
public class LeasePaymentRecordDto
{
    /// <summary>ID</summary>
    public string Id { get; set; } = string.Empty;
    /// <summary>合同ID</summary>
    public string ContractId { get; set; } = string.Empty;
    /// <summary>租户ID</summary>
    public string TenantId { get; set; } = string.Empty;
    /// <summary>金额</summary>
    public decimal Amount { get; set; }
    /// <summary>付款类型</summary>
    public string PaymentType { get; set; } = "Rent";
    /// <summary>付款日期</summary>
    public DateTime PaymentDate { get; set; }
    /// <summary>付款方式</summary>
    public string? PaymentMethod { get; set; }
    /// <summary>账期开始</summary>
    public DateTime? PeriodStart { get; set; }
    /// <summary>账期结束</summary>
    public DateTime? PeriodEnd { get; set; }
    /// <summary>备注</summary>
    public string? Notes { get; set; }
    /// <summary>经办人</summary>
    public string? HandledBy { get; set; }
    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 创建付款记录请求
/// </summary>
public class CreateLeasePaymentRecordRequest
{
    /// <summary>合同ID</summary>
    [Required]
    public string ContractId { get; set; } = string.Empty;
    /// <summary>金额</summary>
    public decimal Amount { get; set; }
    /// <summary>付款类型</summary>
    public string PaymentType { get; set; } = "Rent";
    /// <summary>付款日期</summary>
    public DateTime PaymentDate { get; set; }
    /// <summary>付款方式</summary>
    public string? PaymentMethod { get; set; }
    /// <summary>账期开始</summary>
    public DateTime? PeriodStart { get; set; }
    /// <summary>账期结束</summary>
    public DateTime? PeriodEnd { get; set; }
    /// <summary>备注</summary>
    public string? Notes { get; set; }
}

/// <summary>
/// 创建租赁合同请求
/// </summary>
public class CreateLeaseContractRequest
{
    /// <summary>租户ID</summary>
    [Required]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>合同编号</summary>
    public string ContractNumber { get; set; } = string.Empty;

    /// <summary>单元ID列表</summary>
    public List<string> UnitIds { get; set; } = new();

    /// <summary>开始日期</summary>
    public DateTime StartDate { get; set; }

    /// <summary>结束日期</summary>
    public DateTime EndDate { get; set; }

    /// <summary>月租金</summary>
    public decimal MonthlyRent { get; set; }

    /// <summary>租赁计费方式</summary>
    public string? RentalPricingMethod { get; set; }

    /// <summary>单价</summary>
    public decimal? UnitPrice { get; set; }

    /// <summary>押金</summary>
    public decimal? Deposit { get; set; }

    /// <summary>物业费（月）</summary>
    public decimal? PropertyFee { get; set; }

    /// <summary>合同总额</summary>
    public decimal? TotalAmount { get; set; }

    /// <summary>付款周期</summary>
    public string? PaymentCycle { get; set; }

    /// <summary>付款日</summary>
    public int PaymentDay { get; set; } = 1;

    /// <summary>合同条款</summary>
    public string? Terms { get; set; }

    /// <summary>附件列表</summary>
    public List<string>? Attachments { get; set; }
}

/// <summary>
/// 租户统计响应
/// </summary>
public class TenantStatisticsResponse
{
    /// <summary>总租户数</summary>
    public int TotalTenants { get; set; }

    /// <summary>活跃租户数</summary>
    public int ActiveTenants { get; set; }

    /// <summary>总合同数</summary>
    public int TotalContracts { get; set; }

    /// <summary>活跃合同数</summary>
    public int ActiveContracts { get; set; }

    /// <summary>即将到期合同数（30天内）</summary>
    public int ExpiringContracts { get; set; } // 30天内到期

    /// <summary>月租金总额</summary>
    public decimal TotalMonthlyRent { get; set; }

    /// <summary>按行业统计租户</summary>
    public Dictionary<string, int> TenantsByIndustry { get; set; } = new();

    /// <summary>总实收金额</summary>
    public decimal TotalReceived { get; set; }

    /// <summary>总应收金额（基于合同月租金）</summary>
    public decimal TotalExpected { get; set; }

    /// <summary>收缴率</summary>
    public double CollectionRate { get; set; }

    /// <summary>按费用类型统计实收金额</summary>
    public Dictionary<string, decimal> ReceivedByPaymentType { get; set; } = new();

    /// <summary>有效合同总金额 (合同总额字段之和)</summary>
    public decimal TotalContractAmount { get; set; }

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

/// <summary>
/// 服务分类列表响应
/// </summary>
public class ServiceCategoryListResponse
{
    /// <summary>分类列表</summary>
    public List<ServiceCategoryDto> Categories { get; set; } = new();
}

/// <summary>
/// 服务分类数据传输对象
/// </summary>
public class ServiceCategoryDto
{
    /// <summary>分类ID</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>分类名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>图标</summary>
    public string? Icon { get; set; }

    /// <summary>排序</summary>
    public int SortOrder { get; set; }

    /// <summary>是否启用</summary>
    public bool IsActive { get; set; }

    /// <summary>请求数量</summary>
    public int RequestCount { get; set; }
}

/// <summary>
/// 创建服务分类请求
/// </summary>
public class CreateServiceCategoryRequest
{
    /// <summary>分类名称</summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>图标</summary>
    public string? Icon { get; set; }

    /// <summary>排序</summary>
    public int SortOrder { get; set; }
}

/// <summary>
/// 服务请求列表请求参数
/// </summary>
public class ServiceRequestListRequest
{
    /// <summary>页码</summary>
    public int Page { get; set; } = 1;

    /// <summary>每页大小</summary>
    public int PageSize { get; set; } = 10;

    /// <summary>分类ID</summary>
    public string? CategoryId { get; set; }

    /// <summary>租户ID</summary>
    public string? TenantId { get; set; }

    /// <summary>搜索关键词</summary>
    public string? Search { get; set; }

    /// <summary>状态</summary>
    public string? Status { get; set; }

    /// <summary>优先级</summary>
    public string? Priority { get; set; }

    /// <summary>分配给</summary>
    public string? AssignedTo { get; set; }

    /// <summary>排序字段</summary>
    public string? SortBy { get; set; }

    /// <summary>排序顺序</summary>
    public string? SortOrder { get; set; }
}

/// <summary>
/// 服务请求列表响应
/// </summary>
public class ServiceRequestListResponse
{
    /// <summary>请求列表</summary>
    public List<ServiceRequestDto> Requests { get; set; } = new();

    /// <summary>总数</summary>
    public int Total { get; set; }
}

/// <summary>
/// 服务请求数据传输对象
/// </summary>
public class ServiceRequestDto
{
    /// <summary>请求ID</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>分类ID</summary>
    public string CategoryId { get; set; } = string.Empty;

    /// <summary>分类名称</summary>
    public string? CategoryName { get; set; }

    /// <summary>租户ID</summary>
    public string? TenantId { get; set; }

    /// <summary>租户名称</summary>
    public string? TenantName { get; set; }

    /// <summary>标题</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>联系人</summary>
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    public string? ContactPhone { get; set; }

    /// <summary>优先级</summary>
    public string Priority { get; set; } = string.Empty;

    /// <summary>状态</summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>分配给</summary>
    public string? AssignedTo { get; set; }

    /// <summary>分配给（名称）</summary>
    public string? AssignedToName { get; set; }

    /// <summary>完成时间</summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>评分</summary>
    public int? Rating { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 创建服务请求请求
/// </summary>
public class CreateServiceRequestRequest
{
    /// <summary>分类ID</summary>
    [Required]
    public string CategoryId { get; set; } = string.Empty;

    /// <summary>租户ID</summary>
    public string? TenantId { get; set; }

    /// <summary>标题</summary>
    [Required]
    public string Title { get; set; } = string.Empty;

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>联系人</summary>
    public string? ContactPerson { get; set; }

    /// <summary>联系电话</summary>
    public string? ContactPhone { get; set; }

    /// <summary>优先级</summary>
    public string? Priority { get; set; }

    /// <summary>附件列表</summary>
    public List<string>? Attachments { get; set; }
}

/// <summary>
/// 更新服务请求状态请求
/// </summary>
public class UpdateServiceRequestStatusRequest
{
    /// <summary>状态</summary>
    [Required]
    public string Status { get; set; } = string.Empty;

    /// <summary>分配给</summary>
    public string? AssignedTo { get; set; }

    /// <summary>解决方案</summary>
    public string? Resolution { get; set; }
}

/// <summary>
/// 服务统计响应
/// </summary>
public class ServiceStatisticsResponse
{
    /// <summary>总分类数</summary>
    public int TotalCategories { get; set; }

    /// <summary>活跃分类数</summary>
    public int ActiveCategories { get; set; }

    /// <summary>总请求数</summary>
    public int TotalRequests { get; set; }

    /// <summary>待处理请求数</summary>
    public int PendingRequests { get; set; }

    /// <summary>处理中请求数</summary>
    public int ProcessingRequests { get; set; }

    /// <summary>已完成请求数</summary>
    public int CompletedRequests { get; set; }

    /// <summary>今日新增请求数</summary>
    public int TodayNewRequests { get; set; }

    /// <summary>平均处理时间（小时）</summary>
    public decimal ApproxHandlingTime { get; set; }

    /// <summary>满意度</summary>
    public decimal SatisfactionRate { get; set; }

    /// <summary>平均评分</summary>
    public decimal AverageRating { get; set; }

    /// <summary>按分类统计请求</summary>
    public Dictionary<string, int> RequestsByCategory { get; set; } = new();

    /// <summary>按状态统计请求</summary>
    public Dictionary<string, int> RequestsByStatus { get; set; } = new();

    // 同比/环比
    /// <summary>总请求数同比</summary>
    public double? TotalRequestsYoY { get; set; }
    /// <summary>总请求数环比</summary>
    public double? TotalRequestsMoM { get; set; }
    /// <summary>平均评分同比</summary>
    public double? AverageRatingYoY { get; set; }
    /// <summary>平均评分环比</summary>
    public double? AverageRatingMoM { get; set; }
}

// ===== 走访管理 DTOs =====

/// <summary>
/// 走访任务列表请求
/// </summary>
public class VisitTaskListRequest
{
    /// <summary>当前页码</summary>
    public int Page { get; set; } = 1;
    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 10;
    /// <summary>搜索关键词（标题/负责人）</summary>
    public string? Search { get; set; }
    /// <summary>任务状态（未开始/进行中/已完成）</summary>
    public string? Status { get; set; }
    /// <summary>走访类型（日常走访/专项检查等）</summary>
    public string? VisitType { get; set; }
    /// <summary>开始时间</summary>
    public DateTime? StartDate { get; set; }
    /// <summary>结束时间</summary>
    public DateTime? EndDate { get; set; }
}

/// <summary>
/// 走访任务响应
/// </summary>
public class VisitTaskListResponse
{
    /// <summary>任务列表</summary>
    public List<VisitTaskDto> Tasks { get; set; } = new();
    /// <summary>总数</summary>
    public int Total { get; set; }
}

/// <summary>
/// 走访任务数据对象
/// </summary>
public class VisitTaskDto
{
    /// <summary>任务ID</summary>
    public string Id { get; set; } = string.Empty;
    /// <summary>任务标题</summary>
    public string Title { get; set; } = string.Empty;
    /// <summary>负责人姓名</summary>
    public string ManagerName { get; set; } = string.Empty;
    /// <summary>联系电话</summary>
    public string Phone { get; set; } = string.Empty;
    /// <summary>走访类型</summary>
    public string VisitType { get; set; } = string.Empty;
    /// <summary>走访方式</summary>
    public string VisitMethod { get; set; } = string.Empty;
    /// <summary>详情描述</summary>
    public string? Details { get; set; }
    /// <summary>关联企业ID</summary>
    public string? TenantId { get; set; }
    /// <summary>关联企业名称</summary>
    public string? TenantName { get; set; }
    /// <summary>走访地点</summary>
    public string? VisitLocation { get; set; }
    /// <summary>计划走访日期 (必填，统计报表依赖此数据)</summary>
    [Required]
    public DateTime VisitDate { get; set; }
    /// <summary>状态</summary>
    public string Status { get; set; } = string.Empty;
    /// <summary>走访人员</summary>
    public string? Visitor { get; set; }

    /// <summary>受访人姓名</summary>
    public string? IntervieweeName { get; set; }
    /// <summary>受访人职务</summary>
    public string? IntervieweePosition { get; set; }
    /// <summary>走访内容记录</summary>
    public string? Content { get; set; }
    /// <summary>照片列表</summary>
    public List<string> Photos { get; set; } = new();
    /// <summary>反馈问题</summary>
    public string? Feedback { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>关联考核评分</summary>
    public int? AssessmentScore { get; set; }
    /// <summary>关联考核ID</summary>
    public string? AssessmentId { get; set; }
}

/// <summary>
/// 创建走访任务请求
/// </summary>
public class CreateVisitTaskRequest
{
    /// <summary>任务标题</summary>
    [Required]
    public string Title { get; set; } = string.Empty;

    /// <summary>负责人姓名</summary>
    [Required]
    public string ManagerName { get; set; } = string.Empty;
    /// <summary>联系电话</summary>
    public string Phone { get; set; } = string.Empty;
    /// <summary>走访类型（默认：日常走访）</summary>
    public string VisitType { get; set; } = "日常走访";
    /// <summary>走访方式（默认：实地走访）</summary>
    public string VisitMethod { get; set; } = "实地走访";
    /// <summary>计划走访日期 (必填，统计报表依赖此数据)</summary>
    [Required(ErrorMessage = "走访时间不能为空")]
    public DateTime VisitDate { get; set; }
    /// <summary>详情描述</summary>
    public string? Details { get; set; }
    /// <summary>关联企业ID</summary>
    public string? TenantId { get; set; }
    /// <summary>关联企业名称</summary>
    public string? TenantName { get; set; }
    /// <summary>走访地点</summary>
    public string? VisitLocation { get; set; }
    /// <summary>关联问卷ID</summary>
    public string? QuestionnaireId { get; set; }
    /// <summary>走访人员</summary>
    public string? Visitor { get; set; }
    /// <summary>状态</summary>
    public string? Status { get; set; }

    // 结果填报
    /// <summary>受访人姓名</summary>
    public string? IntervieweeName { get; set; }
    /// <summary>受访人职务</summary>
    public string? IntervieweePosition { get; set; }
    /// <summary>受访人电话</summary>
    public string? IntervieweePhone { get; set; }
    /// <summary>走访内容记录</summary>
    public string? Content { get; set; }
    /// <summary>照片列表</summary>
    public List<string>? Photos { get; set; }
    /// <summary>附件列表</summary>
    public List<string>? Attachments { get; set; }
    /// <summary>反馈问题</summary>
    public string? Feedback { get; set; }
}

/// <summary>
/// 走访考核列表请求
/// </summary>
public class VisitAssessmentListRequest
{
    /// <summary>当前页码</summary>
    public int Page { get; set; } = 1;
    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 10;
    /// <summary>搜索关键词（走访对象/评估人）</summary>
    public string? Search { get; set; }
}

/// <summary>
/// 走访考核列表响应
/// </summary>
public class VisitAssessmentListResponse
{
    /// <summary>考核记录列表</summary>
    public List<VisitAssessmentDto> Assessments { get; set; } = new();
    /// <summary>总数</summary>
    public int Total { get; set; }
}

/// <summary>
/// 走访考核数据对象
/// </summary>
public class VisitAssessmentDto
{
    /// <summary>考核ID</summary>
    public string Id { get; set; } = string.Empty;
    /// <summary>关联任务ID</summary>
    public string TaskId { get; set; } = string.Empty;
    /// <summary>评估人姓名</summary>
    public string VisitorName { get; set; } = string.Empty;
    /// <summary>评估人电话</summary>
    public string Phone { get; set; } = string.Empty;
    /// <summary>走访地点</summary>
    public string Location { get; set; } = string.Empty;
    /// <summary>任务描述</summary>
    public string TaskDescription { get; set; } = string.Empty;
    /// <summary>评分</summary>
    public int Score { get; set; }
    /// <summary>评价内容</summary>
    public string? Comments { get; set; }
    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 知识库问题列表请求
/// </summary>
public class VisitQuestionListRequest
{
    /// <summary>当前页码</summary>
    public int Page { get; set; } = 1;
    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 10;
    /// <summary>搜索关键词（问题内容）</summary>
    public string? Search { get; set; }
    /// <summary>分类（问题分类/场景）</summary>
    public string? Category { get; set; }
}

/// <summary>
/// 知识库问题列表响应
/// </summary>
public class VisitQuestionListResponse
{
    /// <summary>问题列表</summary>
    public List<VisitQuestionDto> Questions { get; set; } = new();
    /// <summary>总数</summary>
    public int Total { get; set; }
}

/// <summary>
/// 知识库问题数据对象
/// </summary>
public class VisitQuestionDto
{
    /// <summary>问题ID</summary>
    public string Id { get; set; } = string.Empty;
    /// <summary>问题内容</summary>
    public string Content { get; set; } = string.Empty;
    /// <summary>问题分类</summary>
    public string? Category { get; set; }
    /// <summary>参考答案</summary>
    public string? Answer { get; set; }
    /// <summary>是否常用问题</summary>
    public bool IsFrequentlyUsed { get; set; }
    /// <summary>排序值</summary>
    public int? SortOrder { get; set; }
}

/// <summary>
/// 走访问卷列表响应
/// </summary>
public class VisitQuestionnaireListResponse
{
    /// <summary>问卷列表</summary>
    public List<VisitQuestionnaireDto> Questionnaires { get; set; } = new();
    /// <summary>总数</summary>
    public int Total { get; set; }
}

/// <summary>
/// 走访问卷数据对象
/// </summary>
public class VisitQuestionnaireDto
{
    /// <summary>问卷ID</summary>
    public string Id { get; set; } = string.Empty;
    /// <summary>问卷标题</summary>
    public string Title { get; set; } = string.Empty;
    /// <summary>问卷用途/描述</summary>
    public string? Purpose { get; set; }
    /// <summary>包含的问题ID列表</summary>
    public List<string> QuestionIds { get; set; } = new();
    /// <summary>问题数量</summary>
    public int QuestionCount => QuestionIds.Count;
    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }
    /// <summary>排序值</summary>
    public int? SortOrder { get; set; }
}

/// <summary>
/// 走访统计数据
/// </summary>
public class VisitStatisticsDto
{
    /// <summary>待处理任务数</summary>
    public int PendingTasks { get; set; }

    /// <summary>本月完成走访数</summary>
    public int CompletedTasksThisMonth { get; set; }

    /// <summary>活跃企管员数</summary>
    public int ActiveManagers { get; set; }

    /// <summary>完成率</summary>
    public decimal CompletionRate { get; set; }

    /// <summary>累计评价数</summary>
    public int TotalAssessments { get; set; }

    /// <summary>平均评分</summary>
    public decimal AverageScore { get; set; }

    /// <summary>按类型统计走访任务</summary>
    public Dictionary<string, int> TasksByType { get; set; } = new();

    /// <summary>按状态统计走访任务</summary>
    public Dictionary<string, int> TasksByStatus { get; set; } = new();

    /// <summary>企管员走访排行 (姓名 -> 走访数)</summary>
    public Dictionary<string, int> ManagerRanking { get; set; } = new();

    /// <summary>最近6个月的走访趋势 (月份 -> 走访数)</summary>
    public Dictionary<string, int> MonthlyTrends { get; set; } = new();
}

#endregion

