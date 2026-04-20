namespace Platform.ServiceDefaults.Services;

public interface ITenantContext
{
    string? GetCurrentUserId();
    string? GetCurrentCompanyId();
}

public interface ITenantContextSetter
{
    void SetContext(string companyId, string? userId);
    string? GetCurrentCompanyId();
    string? GetCurrentUserId();
}

public class TenantContext : ITenantContext, ITenantContextSetter
{
    public string? GetCurrentUserId() => PlatformDbContext.CurrentUserIdValue;

    public string? GetCurrentCompanyId() => PlatformDbContext.CurrentCompanyIdValue;

    public void SetContext(string companyId, string? userId)
    {
        PlatformDbContext.SetContext(companyId, userId);
    }
}