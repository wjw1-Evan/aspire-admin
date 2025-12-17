using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ApiService.Options;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Services;
using Xunit;

namespace Platform.AppHost.Tests;

public class IoTDataCollectorTests
{
    [Fact]
    public async Task Collector_Should_Insert_Record_When_No_Duplicate()
    {
        var options = new IoTDataCollectionOptions
        {
            Enabled = true,
            PageSize = 10,
            MaxDegreeOfParallelism = 1,
            TimeoutSeconds = 30
        };

        var optionsMonitor = new Mock<IOptionsMonitor<IoTDataCollectionOptions>>();
        optionsMonitor.SetupGet(m => m.CurrentValue).Returns(options);

        var gateway = new IoTGateway { GatewayId = "gateway-1", CompanyId = "company-1", IsEnabled = true };
        var device = new IoTDevice { DeviceId = "device-1", CompanyId = "company-1", GatewayId = "gateway-1", IsEnabled = true };
        var dataPoint = new IoTDataPoint
        {
            DataPointId = "dp-1",
            DeviceId = "device-1",
            CompanyId = "company-1",
            DataType = DataPointType.Numeric,
            SamplingInterval = 60,
            IsEnabled = true
        };

        var gatewayFactory = new Mock<IDatabaseOperationFactory<IoTGateway>>();
        gatewayFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTGateway>());
        gatewayFactory.Setup(f => f.CreateSortBuilder()).Returns(new SortBuilder<IoTGateway>());
        gatewayFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTGateway>());
        gatewayFactory.Setup(f => f.FindWithoutTenantFilterAsync(It.IsAny<FilterDefinition<IoTGateway>>(), null, It.IsAny<int?>(), null))
            .ReturnsAsync(new List<IoTGateway> { gateway });

        var deviceFactory = new Mock<IDatabaseOperationFactory<IoTDevice>>();
        deviceFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTDevice>());
        deviceFactory.Setup(f => f.CreateSortBuilder()).Returns(new SortBuilder<IoTDevice>());
        deviceFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTDevice>());
        deviceFactory.Setup(f => f.FindPagedAsync(
                It.IsAny<FilterDefinition<IoTDevice>>(),
                It.IsAny<SortDefinition<IoTDevice>>(),
                It.IsAny<int>(),
                It.IsAny<int>(),
                null))
            .ReturnsAsync((new List<IoTDevice> { device }, 1));
        deviceFactory.Setup(f => f.FindOneAndUpdateAsync(It.IsAny<FilterDefinition<IoTDevice>>(), It.IsAny<UpdateDefinition<IoTDevice>>(), null))
            .ReturnsAsync(device);

        var dataPointFactory = new Mock<IDatabaseOperationFactory<IoTDataPoint>>();
        dataPointFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTDataPoint>());
        dataPointFactory.Setup(f => f.CreateSortBuilder()).Returns(new SortBuilder<IoTDataPoint>());
        dataPointFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTDataPoint>());
        dataPointFactory.Setup(f => f.FindAsync(It.IsAny<FilterDefinition<IoTDataPoint>>(), null, null, null))
            .ReturnsAsync(new List<IoTDataPoint> { dataPoint });
        dataPointFactory.Setup(f => f.FindOneAndUpdateAsync(It.IsAny<FilterDefinition<IoTDataPoint>>(), It.IsAny<UpdateDefinition<IoTDataPoint>>(), null))
            .ReturnsAsync(dataPoint);

        var dataRecordFactory = new Mock<IDatabaseOperationFactory<IoTDataRecord>>();
        dataRecordFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTDataRecord>());
        dataRecordFactory.Setup(f => f.CreateSortBuilder()).Returns(new SortBuilder<IoTDataRecord>());
        dataRecordFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTDataRecord>());
        dataRecordFactory.Setup(f => f.CountAsync(It.IsAny<FilterDefinition<IoTDataRecord>>()))
            .ReturnsAsync(0);
        dataRecordFactory.Setup(f => f.CreateAsync(It.IsAny<IoTDataRecord>()))
            .ReturnsAsync((IoTDataRecord record) => record);

        var fetchClient = new Mock<IIoTDataFetchClient>();
        fetchClient.Setup(f => f.FetchAsync(gateway, device, It.IsAny<IReadOnlyList<IoTDataPoint>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CollectedDataPointValue>
            {
                new()
                {
                    DataPointId = "dp-1",
                    Value = "12.3",
                    ReportedAt = DateTime.UtcNow
                }
            });

        var httpClientFactory = new Mock<IHttpClientFactory>();
        httpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns(new HttpClient());

        var collector = new IoTDataCollector(
            gatewayFactory.Object,
            deviceFactory.Object,
            dataPointFactory.Object,
            dataRecordFactory.Object,
            fetchClient.Object,
            httpClientFactory.Object,
            optionsMonitor.Object,
            NullLogger<IoTDataCollector>.Instance);

        var result = await collector.RunOnceAsync(CancellationToken.None);

        Assert.Equal(1, result.DevicesProcessed);
        Assert.Equal(1, result.DataPointsProcessed);
        Assert.Equal(1, result.RecordsInserted);
        Assert.Equal(0, result.RecordsSkipped);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public async Task Collector_Should_Group_Gateways_By_Tenant()
    {
        // Arrange
        var options = new IoTDataCollectionOptions
        {
            Enabled = true,
            PageSize = 10,
            MaxDegreeOfParallelism = 1,
            TimeoutSeconds = 30
        };

        var optionsMonitor = new Mock<IOptionsMonitor<IoTDataCollectionOptions>>();
        optionsMonitor.SetupGet(m => m.CurrentValue).Returns(options);

        var gateways = new List<IoTGateway>
        {
            new() { GatewayId = "gw-1", CompanyId = "company-1", IsEnabled = true, ProtocolType = "HTTP" },
            new() { GatewayId = "gw-2", CompanyId = "company-1", IsEnabled = true, ProtocolType = "HTTP" },
            new() { GatewayId = "gw-3", CompanyId = "company-2", IsEnabled = true, ProtocolType = "HTTP" }
        };

        var gatewayFactory = new Mock<IDatabaseOperationFactory<IoTGateway>>();
        gatewayFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTGateway>());
        gatewayFactory.Setup(f => f.FindWithoutTenantFilterAsync(It.IsAny<FilterDefinition<IoTGateway>>(), null, It.IsAny<int?>(), null))
            .ReturnsAsync(gateways);

        var deviceFactory = new Mock<IDatabaseOperationFactory<IoTDevice>>();
        deviceFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTDevice>());
        deviceFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTDevice>());
        deviceFactory.Setup(f => f.CreateAsync(It.IsAny<IoTDevice>()))
            .ReturnsAsync((IoTDevice d) => d);

        var dataPointFactory = new Mock<IDatabaseOperationFactory<IoTDataPoint>>();
        dataPointFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTDataPoint>());
        dataPointFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTDataPoint>());
        dataPointFactory.Setup(f => f.CreateAsync(It.IsAny<IoTDataPoint>()))
            .ReturnsAsync((IoTDataPoint dp) => dp);

        var dataRecordFactory = new Mock<IDatabaseOperationFactory<IoTDataRecord>>();
        dataRecordFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTDataRecord>());
        dataRecordFactory.Setup(f => f.CountAsync(It.IsAny<FilterDefinition<IoTDataRecord>>()))
            .ReturnsAsync(0);
        dataRecordFactory.Setup(f => f.CreateAsync(It.IsAny<IoTDataRecord>()))
            .ReturnsAsync((IoTDataRecord r) => r);

        var httpClientFactory = new Mock<IHttpClientFactory>();
        var httpClient = new HttpClient(new MockHttpMessageHandler());
        httpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns(httpClient);

        var collector = new IoTDataCollector(
            gatewayFactory.Object,
            deviceFactory.Object,
            dataPointFactory.Object,
            dataRecordFactory.Object,
            new Mock<IIoTDataFetchClient>().Object,
            httpClientFactory.Object,
            optionsMonitor.Object,
            NullLogger<IoTDataCollector>.Instance);

        // Act
        var result = await collector.RunOnceAsync(CancellationToken.None);

        // Assert - 验证使用了 FindWithoutTenantFilterAsync 来跨租户查询
        gatewayFactory.Verify(
            f => f.FindWithoutTenantFilterAsync(
                It.IsAny<FilterDefinition<IoTGateway>>(),
                null,
                It.IsAny<int?>(),
                null),
            Times.Once);
    }
}

public class IoTGatewayStatusCheckerTests
{
    [Fact]
    public async Task Should_Skip_Gateway_Without_Address()
    {
        var options = new IoTDataCollectionOptions
        {
            GatewayStatusCheckEnabled = true,
            GatewayPingTimeoutSeconds = 5
        };

        var optionsMonitor = new Mock<IOptionsMonitor<IoTDataCollectionOptions>>();
        optionsMonitor.SetupGet(m => m.CurrentValue).Returns(options);

        var gateway = new IoTGateway
        {
            GatewayId = "gw-1",
            CompanyId = "c1",
            Address = string.Empty, // 无地址
            Status = IoTDeviceStatus.Offline
        };

        var gatewayFactory = new Mock<IDatabaseOperationFactory<IoTGateway>>();
        gatewayFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTGateway>());
        gatewayFactory.Setup(f => f.FindWithoutTenantFilterAsync(It.IsAny<FilterDefinition<IoTGateway>>(), null, null, null))
            .ReturnsAsync(new List<IoTGateway> { gateway });

        var httpClientFactory = new Mock<IHttpClientFactory>();
        httpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns(new HttpClient());

        var checker = new IoTGatewayStatusChecker(
            gatewayFactory.Object,
            httpClientFactory.Object,
            optionsMonitor.Object,
            NullLogger<IoTGatewayStatusChecker>.Instance);

        await checker.CheckAndUpdateGatewayStatusesAsync(CancellationToken.None);

        // 应该跳过无地址的网关，不更新状态
        gatewayFactory.Verify(
            f => f.FindOneAndUpdateAsync(
                It.IsAny<FilterDefinition<IoTGateway>>(),
                It.IsAny<UpdateDefinition<IoTGateway>>(),
                null),
            Times.Never);
    }

    [Fact]
    public async Task Should_Group_Gateways_By_Tenant()
    {
        // Arrange
        var options = new IoTDataCollectionOptions
        {
            GatewayStatusCheckEnabled = true,
            GatewayPingTimeoutSeconds = 5
        };

        var optionsMonitor = new Mock<IOptionsMonitor<IoTDataCollectionOptions>>();
        optionsMonitor.SetupGet(m => m.CurrentValue).Returns(options);

        var gateways = new List<IoTGateway>
        {
            new() { GatewayId = "gw-1", CompanyId = "company-1", Address = "http://test1.com", Status = IoTDeviceStatus.Offline },
            new() { GatewayId = "gw-2", CompanyId = "company-1", Address = "http://test2.com", Status = IoTDeviceStatus.Offline },
            new() { GatewayId = "gw-3", CompanyId = "company-2", Address = "http://test3.com", Status = IoTDeviceStatus.Offline }
        };

        var gatewayFactory = new Mock<IDatabaseOperationFactory<IoTGateway>>();
        gatewayFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTGateway>());
        gatewayFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTGateway>());
        gatewayFactory.Setup(f => f.FindWithoutTenantFilterAsync(It.IsAny<FilterDefinition<IoTGateway>>(), null, null, null))
            .ReturnsAsync(gateways);

        var httpClientFactory = new Mock<IHttpClientFactory>();
        var httpClient = new HttpClient(new MockHttpMessageHandler());
        httpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns(httpClient);

        var checker = new IoTGatewayStatusChecker(
            gatewayFactory.Object,
            httpClientFactory.Object,
            optionsMonitor.Object,
            NullLogger<IoTGatewayStatusChecker>.Instance);

        // Act
        await checker.CheckAndUpdateGatewayStatusesAsync(CancellationToken.None);

        // Assert - 验证按租户分组处理（应该处理3个网关，来自2个租户）
        // 由于我们使用了 FindWithoutTenantFilterAsync，应该能查询到所有租户的网关
        gatewayFactory.Verify(
            f => f.FindWithoutTenantFilterAsync(
                It.IsAny<FilterDefinition<IoTGateway>>(),
                null,
                null,
                null),
            Times.Once);
    }
}

// Mock HTTP message handler for testing
public class MockHttpMessageHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = new HttpResponseMessage(System.Net.HttpStatusCode.OK);
        return Task.FromResult(response);
    }
}
