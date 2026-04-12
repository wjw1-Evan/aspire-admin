using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

[BsonIgnoreExtraElements]
[Table("parkTenants")]
public class ParkTenant : MultiTenantEntity
{
    [Required]
    [StringLength(200)]
    [Column("tenantName")]
    [BsonElement("tenantName")]
    public string TenantName { get; set; } = string.Empty;

    [StringLength(100)]
    [Column("contactPerson")]
    [BsonElement("contactPerson")]
    public string? ContactPerson { get; set; }

    [StringLength(50)]
    [Column("phone")]
    [BsonElement("phone")]
    public string? Phone { get; set; }

    [StringLength(200)]
    [Column("email")]
    [BsonElement("email")]
    [EmailAddress]
    public string? Email { get; set; }

    [StringLength(50)]
    [Column("industry")]
    [BsonElement("industry")]
    public string? Industry { get; set; }

    [StringLength(100)]
    [Column("businessLicense")]
    [BsonElement("businessLicense")]
    public string? BusinessLicense { get; set; }

    [StringLength(500)]
    [Column("address")]
    [BsonElement("address")]
    public string? Address { get; set; }

    [Column("unitIds")]
    [BsonElement("unitIds")]
    public List<string>? UnitIds { get; set; }

    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Active";

    [Column("entryDate")]
    [BsonElement("entryDate")]
    public DateTime? EntryDate { get; set; }

    [Column("exitDate")]
    [BsonElement("exitDate")]
    public DateTime? ExitDate { get; set; }

    [StringLength(2000)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }
}

[BsonIgnoreExtraElements]
[Table("leaseContracts")]
public class LeaseContract : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    [Column("tenantId")]
    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    [Column("contractNumber")]
    [BsonElement("contractNumber")]
    public string ContractNumber { get; set; } = string.Empty;

    [Column("unitIds")]
    [BsonElement("unitIds")]
    public List<string> UnitIds { get; set; } = new();

    [Required]
    [Column("startDate")]
    [BsonElement("startDate")]
    public DateTime StartDate { get; set; }

    [Required]
    [Column("endDate")]
    [BsonElement("endDate")]
    public DateTime EndDate { get; set; }

    [Column("monthlyRent")]
    [BsonElement("monthlyRent")]
    public decimal MonthlyRent { get; set; }

    [StringLength(50)]
    [Column("rentalPricingMethod")]
    [BsonElement("rentalPricingMethod")]
    public string RentalPricingMethod { get; set; } = "FixedMonthly";

    [Column("unitPrice")]
    [BsonElement("unitPrice")]
    public decimal? UnitPrice { get; set; }

    [Column("deposit")]
    [BsonElement("deposit")]
    public decimal? Deposit { get; set; }

    [Column("propertyFee")]
    [BsonElement("propertyFee")]
    public decimal? PropertyFee { get; set; }

    [Column("totalAmount")]
    [BsonElement("totalAmount")]
    public decimal? TotalAmount { get; set; }

    [StringLength(20)]
    [Column("paymentCycle")]
    [BsonElement("paymentCycle")]
    public string PaymentCycle { get; set; } = "Monthly";

    [Range(1, 28)]
    [Column("paymentDay")]
    [BsonElement("paymentDay")]
    public int PaymentDay { get; set; } = 1;

    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Active";

    [StringLength(2000)]
    [Column("terms")]
    [BsonElement("terms")]
    public string? Terms { get; set; }

    [Column("attachments")]
    [BsonElement("attachments")]
    public List<string>? Attachments { get; set; }
}

[BsonIgnoreExtraElements]
[Table("leasePaymentRecords")]
public class LeasePaymentRecord : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    [Column("contractId")]
    [BsonElement("contractId")]
    public string ContractId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    [Column("tenantId")]
    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    [StringLength(50)]
    [Column("paymentType")]
    [BsonElement("paymentType")]
    public string PaymentType { get; set; } = "Rent";

    [Column("amount")]
    [BsonElement("amount")]
    public decimal Amount { get; set; }

    [Required]
    [Column("paymentDate")]
    [BsonElement("paymentDate")]
    public DateTime PaymentDate { get; set; }

    [StringLength(50)]
    [Column("paymentMethod")]
    [BsonElement("paymentMethod")]
    public string? PaymentMethod { get; set; }

    [Column("periodStart")]
    [BsonElement("periodStart")]
    public DateTime? PeriodStart { get; set; }

    [Column("periodEnd")]
    [BsonElement("periodEnd")]
    public DateTime? PeriodEnd { get; set; }

    [StringLength(500)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }

    public string? HandledBy { get; set; }
}

[BsonIgnoreExtraElements]
[Table("rentBills")]
public class RentBill : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    [Column("contractId")]
    [BsonElement("contractId")]
    public string ContractId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    [Column("tenantId")]
    [BsonElement("tenantId")]
    public string TenantId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    [Column("billNumber")]
    [BsonElement("billNumber")]
    public string BillNumber { get; set; } = string.Empty;

    [Range(2000, 2100)]
    [Column("billYear")]
    [BsonElement("billYear")]
    public int BillYear { get; set; }

    [Range(1, 12)]
    [Column("billMonth")]
    [BsonElement("billMonth")]
    public int BillMonth { get; set; }

    [Column("amount")]
    [BsonElement("amount")]
    public decimal Amount { get; set; }

    [Column("paidAmount")]
    [BsonElement("paidAmount")]
    public decimal? PaidAmount { get; set; }

    [Required]
    [Column("dueDate")]
    [BsonElement("dueDate")]
    public DateTime DueDate { get; set; }

    [Column("paidDate")]
    [BsonElement("paidDate")]
    public DateTime? PaidDate { get; set; }

    [StringLength(20)]
    [Column("status")]
    [BsonElement("status")]
    public string Status { get; set; } = "Pending";

    [StringLength(500)]
    [Column("notes")]
    [BsonElement("notes")]
    public string? Notes { get; set; }
}
