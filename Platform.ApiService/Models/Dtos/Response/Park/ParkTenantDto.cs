using System.ComponentModel.DataAnnotations;
using Platform.ApiService.Models;

namespace Platform.ApiService.Models;

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
    public string RentalPricingMethod { get; set; } = string.Empty;
    public decimal? UnitPrice { get; set; }
    public decimal? Deposit { get; set; }
    public decimal? PropertyFee { get; set; }
    public decimal? TotalAmount { get; set; }
    public string PaymentCycle { get; set; } = string.Empty;
    public int PaymentDay { get; set; }
    public string? Terms { get; set; }
    public List<string>? Attachments { get; set; }
    public string Status { get; set; } = string.Empty;
    public int DaysUntilExpiry { get; set; }
    public List<LeasePaymentRecordDto>? PaymentRecords { get; set; }
}

public class LeasePaymentRecordDto
{
    public string Id { get; set; } = string.Empty;
    public string ContractId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentType { get; set; } = "Rent";
    public DateTime PaymentDate { get; set; }
    public string? PaymentMethod { get; set; }
    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
    public string? Notes { get; set; }
    public string? HandledBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateLeasePaymentRecordRequest
{
    [Required]
    public string ContractId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentType { get; set; } = "Rent";
    public DateTime PaymentDate { get; set; }
    public string? PaymentMethod { get; set; }
    public DateTime? PeriodStart { get; set; }
    public DateTime? PeriodEnd { get; set; }
    public string? Notes { get; set; }
}

public class CreateLeaseContractRequest
{
    [Required]
    public string TenantId { get; set; } = string.Empty;
    public string ContractNumber { get; set; } = string.Empty;
    public List<string> UnitIds { get; set; } = new();
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal MonthlyRent { get; set; }
    public string? RentalPricingMethod { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? Deposit { get; set; }
    public decimal? PropertyFee { get; set; }
    public decimal? TotalAmount { get; set; }
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
    public int ExpiringContracts { get; set; }
    public decimal TotalMonthlyRent { get; set; }
    public Dictionary<string, int> TenantsByIndustry { get; set; } = new();
    public decimal TotalReceived { get; set; }
    public decimal TotalExpected { get; set; }
    public double CollectionRate { get; set; }
    public Dictionary<string, decimal> ReceivedByPaymentType { get; set; } = new();
    public decimal TotalContractAmount { get; set; }
    public double? MonthlyRentYoY { get; set; }
    public double? MonthlyRentMoM { get; set; }
    public double? ActiveTenantsYoY { get; set; }
    public double? ActiveTenantsMoM { get; set; }
}
