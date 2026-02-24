using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ServiceDefaults.Tests;

public class TestEntity : IEntity, ISoftDeletable, ITimestamped, IMultiTenant
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public long Score { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
    public string? DeletedReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string CompanyId { get; set; } = TestBase.DefaultCompanyId;
}

public abstract class TestBase : IDisposable
{
    public const string DefaultCompanyId = "TestCompany";
    private readonly SqliteConnection _connection;
    protected readonly PlatformDbContext DbContext;
    protected readonly Mock<ITenantContext> TenantContextMock;

    protected TestBase()
    {
        _connection = new SqliteConnection("Filename=:memory:");
        _connection.Open();

        // 注册测试程序集，以便 PlatformDbContext 能发现 TestEntity
        PlatformDbContext.RegisterEntityAssembly(typeof(TestEntity).Assembly);

        TenantContextMock = new Mock<ITenantContext>();

        // 默认模拟返回当前测试租户
        TenantContextMock.Setup(t => t.GetCurrentCompanyIdAsync())
            .ReturnsAsync(DefaultCompanyId);

        var options = new DbContextOptionsBuilder<PlatformDbContext>()
            .UseSqlite(_connection)
            .Options;

        DbContext = new PlatformDbContext(options, TenantContextMock.Object);
        DbContext.Database.EnsureCreated();
    }

    public void Dispose()
    {
        DbContext.Dispose();
        _connection.Close();
        _connection.Dispose();
    }
}
