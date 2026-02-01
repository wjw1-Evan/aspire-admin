// 文件说明：
// 本测试覆盖 UserActivityLogService 的核心逻辑：
// 1) 当请求不含用户上下文时，生成匿名用户日志并使用系统租户；
// 2) 记录通用活动时应使用用户所属企业 CompanyId；
// 3) 分页查询返回正确的总数、页码、页大小与总页数计算。
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Moq;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Services;
using Xunit;

namespace Platform.ApiService.Tests;

public class UserActivityLogServiceTests
{
    [Fact]
    public async Task LogHttpRequest_Should_Create_Log_With_System_Company_When_UserId_Null()
    {
        // 场景：无用户信息（UserId/Username 为空）时，应按匿名用户规则写入日志，CompanyId 使用系统租户占位
        var mockActivityFactory = new Mock<IDatabaseOperationFactory<UserActivityLog>>();
        var mockUserFactory = new Mock<IDatabaseOperationFactory<AppUser>>();

        UserActivityLog? captured = null;
        mockActivityFactory
            .Setup(f => f.CreateAsync(It.IsAny<UserActivityLog>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .ReturnsAsync((UserActivityLog log, string? userId, string? username) =>
            {
                captured = log;
                return log;
            });

        var svc = new UserActivityLogService(mockActivityFactory.Object, mockUserFactory.Object);

        var req = new LogHttpRequestRequest
        {
            UserId = null,
            Username = null,
            HttpMethod = "GET",
            Path = "/api/files",
            QueryString = "?page=1",
            Scheme = "https",
            Host = "localhost:15000",
            StatusCode = 200,
            DurationMs = 123,
            IpAddress = "127.0.0.1",
            UserAgent = "UnitTest-UA",
            ResponseBody = "{\"ok\":true}",
            Metadata = new Dictionary<string, object> { { "k", "v" } }
        };

        await svc.LogHttpRequestAsync(req);

        Assert.NotNull(captured);
        Assert.Equal("anonymous", captured!.UserId);
        Assert.Equal("匿名用户", captured.Username);
        Assert.Equal("https://localhost:15000/api/files?page=1", captured.FullUrl);
        Assert.Equal("system", captured.CompanyId); // 无用户上下文时使用系统租户占位
        Assert.Equal("{\"ok\":true}", captured.ResponseBody);
        Assert.Equal(200, captured.StatusCode);
        Assert.Equal(123, captured.Duration);
        Assert.Equal("UnitTest-UA", captured.UserAgent);
        Assert.NotNull(captured.Metadata);
        Assert.Equal("v", captured.Metadata["k"]);
    }

    [Fact]
    public async Task LogActivity_Should_Use_User_CompanyId()
    {
        // 场景：记录用户活动时，应根据用户实体的 CurrentCompanyId 写入 CompanyId
        var mockActivityFactory = new Mock<IDatabaseOperationFactory<UserActivityLog>>();
        var mockUserFactory = new Mock<IDatabaseOperationFactory<AppUser>>();

        mockUserFactory
            .Setup(f => f.GetByIdAsync(It.IsAny<string>(), null))
            .ReturnsAsync(new AppUser { CurrentCompanyId = "company-1" });

        UserActivityLog? created = null;
        mockActivityFactory
            .Setup(f => f.CreateAsync(It.IsAny<UserActivityLog>()))
            .ReturnsAsync((UserActivityLog log) => { created = log; return log; });

        var svc = new UserActivityLogService(mockActivityFactory.Object, mockUserFactory.Object);

        await svc.LogActivityAsync("U1", "alice", "update_profile", "更新个人资料");

        Assert.NotNull(created);
        Assert.Equal("U1", created!.UserId);
        Assert.Equal("alice", created.Username);
        Assert.Equal("company-1", created.CompanyId);
        Assert.Equal("update_profile", created.Action);
        Assert.Equal("更新个人资料", created.Description);
        Assert.False(created.IsDeleted);
    }

    [Fact]
    public async Task GetActivityLogs_Should_Return_Paged_Result()
    {
        // 场景：分页查询应返回总条数与数据列表，并正确计算总页数（向上取整）
        var mockActivityFactory = new Mock<IDatabaseOperationFactory<UserActivityLog>>();
        var mockUserFactory = new Mock<IDatabaseOperationFactory<AppUser>>();

        mockActivityFactory
            .Setup(f => f.CreateFilterBuilder())
            .Returns(new FilterBuilder<UserActivityLog>());
        mockActivityFactory
            .Setup(f => f.CreateSortBuilder())
            .Returns(new SortBuilder<UserActivityLog>());

        mockActivityFactory
            .Setup(f => f.CountAsync(It.IsAny<MongoDB.Driver.FilterDefinition<UserActivityLog>>()))
            .ReturnsAsync(42);

        mockActivityFactory
            .Setup(f => f.FindPagedAsync(
                It.IsAny<MongoDB.Driver.FilterDefinition<UserActivityLog>>(),
                It.IsAny<MongoDB.Driver.SortDefinition<UserActivityLog>>(),
                It.IsAny<int>(),
                It.IsAny<int>(),
                It.IsAny<MongoDB.Driver.ProjectionDefinition<UserActivityLog>>()))
            .ReturnsAsync((MongoDB.Driver.FilterDefinition<UserActivityLog> f,
                           MongoDB.Driver.SortDefinition<UserActivityLog> s,
                           int page,
                           int pageSize,
                           MongoDB.Driver.ProjectionDefinition<UserActivityLog> p) =>
            {
                var list = new List<UserActivityLog>
                {
                    new UserActivityLog{ UserId = "U1", Action = "a1" },
                    new UserActivityLog{ UserId = "U1", Action = "a2" },
                };
                return (list, 42);
            });

        var svc = new UserActivityLogService(mockActivityFactory.Object, mockUserFactory.Object);

        var resp = await svc.GetActivityLogsAsync(new GetUserActivityLogsRequest
        {
            UserId = "U1",
            Page = 2,
            PageSize = 20
        });

        Assert.Equal(42, resp.Total);
        Assert.Equal(2, resp.Data.Count);
        Assert.Equal(2, resp.Page);
        Assert.Equal(20, resp.PageSize);
        Assert.Equal(3, resp.TotalPages); // ceil(42/20) = 3
    }
}
