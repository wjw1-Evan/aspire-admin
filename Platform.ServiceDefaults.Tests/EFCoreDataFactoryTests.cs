using Microsoft.EntityFrameworkCore;
using Moq;
using Platform.ServiceDefaults.Services;
using Xunit;

namespace Platform.ServiceDefaults.Tests;

public class EFCoreDataFactoryTests : TestBase
{
    private readonly EFCoreDataFactory<TestEntity> _factory;

    public EFCoreDataFactoryTests()
    {
        _factory = new EFCoreDataFactory<TestEntity>(DbContext);
    }

    [Fact]
    public async Task CreateAsync_Should_Set_CreatedAt_And_Save_To_Db()
    {
        // Arrange
        var entity = new TestEntity { Name = "Test" };

        // Act
        var result = await _factory.CreateAsync(entity);

        // Assert
        Assert.NotNull(result.Id);
        Assert.NotEqual(default, result.CreatedAt);
        Assert.Equal("Test", result.Name);

        var dbEntity = await DbContext.Set<TestEntity>().FindAsync(result.Id);
        Assert.NotNull(dbEntity);
    }

    [Fact]
    public async Task GetByIdAsync_Should_Return_Entity_If_Exists()
    {
        // Arrange
        var entity = new TestEntity { Name = "Existing" };
        DbContext.Set<TestEntity>().Add(entity);
        await DbContext.SaveChangesAsync();

        // Act
        var result = await _factory.GetByIdAsync(entity.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Existing", result.Name);
    }

    [Fact]
    public async Task UpdateAsync_Should_Apply_Changes_And_Update_Timestamp()
    {
        // Arrange
        var entity = new TestEntity { Name = "Original" };
        DbContext.Set<TestEntity>().Add(entity);
        await DbContext.SaveChangesAsync();
        var originalUpdatedAt = entity.UpdatedAt;

        // Act
        await Task.Delay(100); // Ensure time difference
        var result = await _factory.UpdateAsync(entity.Id, e => e.Name = "Updated");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated", result.Name);
        Assert.True(result.UpdatedAt > originalUpdatedAt);
    }

    [Fact]
    public async Task SoftDeleteAsync_Should_Set_IsDeleted_True_And_Not_Visible_In_Find()
    {
        // Arrange
        var entity = new TestEntity { Name = "To Delete" };
        DbContext.Set<TestEntity>().Add(entity);
        await DbContext.SaveChangesAsync();

        // Act
        var deleted = await _factory.SoftDeleteAsync(entity.Id, "Test Reason");

        // Assert
        Assert.True(deleted);

        var dbEntity = await DbContext.Set<TestEntity>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Id == entity.Id);

        Assert.True(dbEntity!.IsDeleted);
        Assert.Equal("Test Reason", dbEntity.DeletedReason);

        // Verify it's not visible in standard find
        var found = await _factory.FindAsync(e => e.Id == entity.Id);
        Assert.Empty(found);
    }

    [Fact]
    public async Task TenantFilter_Should_Isolate_Data_Between_Companies()
    {
        // Arrange
        var company1 = "CompanyA";
        var company2 = "CompanyB";

        var entity1 = new TestEntity { Name = "Item A", CompanyId = company1 };
        var entity2 = new TestEntity { Name = "Item B", CompanyId = company2 };

        DbContext.Set<TestEntity>().AddRange(entity1, entity2);
        await DbContext.SaveChangesAsync();

        // Act: Set context to CompanyA
        TenantContextMock.Setup(t => t.GetCurrentCompanyIdAsync())
            .ReturnsAsync(company1);

        var result = await _factory.FindAsync();

        // Assert
        Assert.Single(result);
        Assert.Equal("Item A", result[0].Name);
    }

    [Fact]
    public async Task FindPagedAsync_Should_Calculate_Total_And_Return_Correct_Page()
    {
        // Arrange
        for (int i = 0; i < 15; i++)
        {
            DbContext.Set<TestEntity>().Add(new TestEntity { Name = $"Item {i}" });
        }
        await DbContext.SaveChangesAsync();

        // Act
        var (items, total) = await _factory.FindPagedAsync(page: 2, pageSize: 10);

        // Assert
        Assert.Equal(15, total);
        Assert.Equal(5, items.Count);
    }

    [Fact]
    public async Task DeleteAsync_Should_Physically_Remove_From_Db()
    {
        // Arrange
        var entity = new TestEntity { Name = "Physical Delete" };
        DbContext.Set<TestEntity>().Add(entity);
        await DbContext.SaveChangesAsync();

        // Act
        var deleted = await _factory.DeleteAsync(entity.Id);

        // Assert
        Assert.True(deleted);
        var dbEntity = await DbContext.Set<TestEntity>().IgnoreQueryFilters().FirstOrDefaultAsync(e => e.Id == entity.Id);
        Assert.Null(dbEntity);
    }

    [Fact]
    public async Task ExistsAsync_Should_Work_For_Id_And_Filter()
    {
        // Arrange
        var entity = new TestEntity { Name = "Exists" };
        DbContext.Set<TestEntity>().Add(entity);
        await DbContext.SaveChangesAsync();

        // Act & Assert
        Assert.True(await _factory.ExistsAsync(entity.Id));
        Assert.True(await _factory.ExistsAsync(e => e.Name == "Exists"));
        Assert.False(await _factory.ExistsAsync("non-existent"));
    }

    [Fact]
    public async Task CountAndSumAsync_Should_Return_Correct_Aggregates()
    {
        // Arrange
        DbContext.Set<TestEntity>().AddRange(
            new TestEntity { Name = "A", Score = 10 },
            new TestEntity { Name = "B", Score = 20 },
            new TestEntity { Name = "C", Score = 30, IsDeleted = true } // Should be filtered out
        );
        await DbContext.SaveChangesAsync();

        // Act
        var count = await _factory.CountAsync();
        var sum = await _factory.SumAsync(null, e => e.Score);

        // Assert
        Assert.Equal(2, count);
        Assert.Equal(30, sum);
    }

    [Fact]
    public async Task CreateManyAsync_Should_Save_Multiple_Entities()
    {
        // Arrange
        var entities = new List<TestEntity>
        {
            new TestEntity { Name = "M1" },
            new TestEntity { Name = "M2" }
        };

        // Act
        var result = await _factory.CreateManyAsync(entities);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal(2, await DbContext.Set<TestEntity>().CountAsync());
    }

    [Fact]
    public async Task UpdateManyAsync_Should_Update_Filtered_Entities()
    {
        // Arrange
        DbContext.Set<TestEntity>().AddRange(
            new TestEntity { Name = "A Status" },
            new TestEntity { Name = "B Status" },
            new TestEntity { Name = "Other" }
        );
        await DbContext.SaveChangesAsync();

        // Act: Sync version
        var count1 = await _factory.UpdateManyAsync(e => e.Name.Contains("Status"), e => e.Name += " [Updated]");

        // Act: Async version
        var count2 = await _factory.UpdateManyAsync(e => e.Name.Contains("[Updated]"), async e =>
        {
            await Task.Yield();
            e.Name += " [Done]";
        });

        // Assert
        Assert.Equal(2, count1);
        Assert.Equal(2, count2);
        Assert.Equal(2, await DbContext.Set<TestEntity>().CountAsync(e => e.Name.Contains("[Done]")));
    }

    [Fact]
    public async Task SoftDeleteManyAsync_Should_Mark_Multiple_Deleted()
    {
        // Arrange
        DbContext.Set<TestEntity>().AddRange(
            new TestEntity { Name = "Del 1" },
            new TestEntity { Name = "Del 2" },
            new TestEntity { Name = "Keep" }
        );
        await DbContext.SaveChangesAsync();

        // Act
        var count = await _factory.SoftDeleteManyAsync(e => e.Name.Contains("Del"), "Cleanup");

        // Assert
        Assert.Equal(2, count);
        var deletedCount = await DbContext.Set<TestEntity>().IgnoreQueryFilters().CountAsync(e => e.IsDeleted && e.DeletedReason == "Cleanup");
        Assert.Equal(2, deletedCount);
    }

    [Fact]
    public async Task DeleteManyAsync_Should_Physically_Remove_Multiple()
    {
        // Arrange
        DbContext.Set<TestEntity>().AddRange(
            new TestEntity { Name = "Phy 1" },
            new TestEntity { Name = "Phy 2" }
        );
        await DbContext.SaveChangesAsync();

        // Act
        var count = await _factory.DeleteManyAsync(e => e.Name.Contains("Phy"));

        // Assert
        Assert.Equal(2, count);
        Assert.Equal(0, await DbContext.Set<TestEntity>().IgnoreQueryFilters().CountAsync(e => e.Name.Contains("Phy")));
    }

    [Fact]
    public async Task GetByIdWithoutTenantFilterAsync_Should_Find_Entity_From_Other_Tenant()
    {
        // Arrange
        var otherCompany = "OtherCo";
        var entity = new TestEntity { Name = "Cross Tenant", CompanyId = otherCompany };
        DbContext.Set<TestEntity>().Add(entity);
        await DbContext.SaveChangesAsync();

        // Current context is DefaultCompanyId (from TestBase)

        // Act: Standard get should fail (filtered by tenant)
        var fail = await _factory.GetByIdAsync(entity.Id);

        // Act: Bypass get should succeed
        var success = await _factory.GetByIdWithoutTenantFilterAsync(entity.Id);

        // Assert
        Assert.Null(fail);
        Assert.NotNull(success);
        Assert.Equal("Cross Tenant", success.Name);
    }
}
