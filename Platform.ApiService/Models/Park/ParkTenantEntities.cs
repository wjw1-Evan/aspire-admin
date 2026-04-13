using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

[BsonIgnoreExtraElements]
public class ParkTenant : MultiTenantEntity
{
    [Required]
    [StringLength(200)]
    public string TenantName { get; set; } = string.Empty;

    [StringLength(100)]
    public string? ContactPerson { get; set; }

    [StringLength(50)]
    public string? Phone { get; set; }

    [StringLength(200)]
    [EmailAddress]
    public string? Email { get; set; }

    [StringLength(50)]
    public string? Industry { get; set; }

    [StringLength(100)]
    public string? BusinessLicense { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }

    public List<string>? UnitIds { get; set; }

    [StringLength(20)]
    public string Status { get; set; } = "Active";

    public DateTime? EntryDate { get; set; }

    public DateTime? ExitDate { get; set; }

    [StringLength(2000)]
    public string? Notes { get; set; }
}

[BsonIgnoreExtraElements]
public class LeaseContract : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    public string TenantId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string ContractNumber { get; set; } = string.Empty;

    public List<string> UnitIds { get; set; } = new();

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    public decimal MonthlyRent { get; set; }

    [StringLength(50)]
    public string RentalPricingMethod { get; set; } = "FixedMonthly";

    public decimal? UnitPrice { get; set; }

    public decimal? Deposit { get; set; }

    public decimal? PropertyFee { get; set; }

    public decimal? TotalAmount { get; set; }

    [StringLength(20)]
    public string PaymentCycle { get; set; } = "Monthly";

    [Range(1, 28)]
    public int PaymentDay { get; set; } = 1;

    [StringLength(20)]
    public string Status { get; set; } = "Active";

    [StringLength(2000)]
    public string? Terms { get; set; }

    public List<string>? Attachments { get; set; }
}

[BsonIgnoreExtraElements]
public class LeasePaymentRecord : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    public string ContractId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string TenantId { get; set; } = string.Empty;

    [StringLength(50)]
    public string PaymentType { get; set; } = "Rent";

    public decimal Amount { get; set; }

    [Required]
    public DateTime PaymentDate { get; set; }

    [StringLength(50)]
    public string? PaymentMethod { get; set; }

    public DateTime? PeriodStart { get; set; }

    public DateTime? PeriodEnd { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    public string? HandledBy { get; set; }
}

[BsonIgnoreExtraElements]
public class RentBill : MultiTenantEntity
{
    [Required]
    [StringLength(100)]
    public string ContractId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string TenantId { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string BillNumber { get; set; } = string.Empty;

    [Range(2000, 2100)]
    public int BillYear { get; set; }

    [Range(1, 12)]
    public int BillMonth { get; set; }

    public decimal Amount { get; set; }

    public decimal? PaidAmount { get; set; }

    [Required]
    public DateTime DueDate { get; set; }

    public DateTime? PaidDate { get; set; }

    [StringLength(20)]
    public string Status { get; set; } = "Pending";

    [StringLength(500)]
    public string? Notes { get; set; }
}
