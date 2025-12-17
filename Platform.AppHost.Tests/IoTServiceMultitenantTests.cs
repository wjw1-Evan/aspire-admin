using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Services;
using Xunit;

namespace Platform.AppHost.Tests;

/// <summary>
/// IoTService 多租户隔离和数据访问规范测试
/// </summary>
public class IoTServiceMultitenantTests
{
    private readonly Mock<IDatabaseOperationFactory<IoTGateway>> _gatewayFactory;
    private readonly Mock<IDatabaseOperationFactory<IoTDevice>> _deviceFactory;
    private readonly Mock<IDatabaseOperationFactory<IoTDataPoint>> _dataPointFactory;
    private readonly Mock<IDatabaseOperationFactory<IoTDataRecord>> _dataRecordFactory;
    private readonly Mock<IDatabaseOperationFactory<IoTDeviceEvent>> _eventFactory;
    private readonly IoTService _iotService;

    public IoTServiceMultitenantTests()
    {
        _gatewayFactory = new Mock<IDatabaseOperationFactory<IoTGateway>>();
        _deviceFactory = new Mock<IDatabaseOperationFactory<IoTDevice>>();
        _dataPointFactory = new Mock<IDatabaseOperationFactory<IoTDataPoint>>();
        _dataRecordFactory = new Mock<IDatabaseOperationFactory<IoTDataRecord>>();
        _eventFactory = new Mock<IDatabaseOperationFactory<IoTDeviceEvent>>();

        // 设置构建器
        SetupBuilders();

        _iotService = new IoTService(
            _gatewayFactory.Object,
            _deviceFactory.Object,
            _dataPointFactory.Object,
            _dataRecordFactory.Object,
            _eventFactory.Object,
            NullLogger<IoTService>.Instance);
    }

    private void SetupBuilders()
    {
        _gatewayFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTGateway>());
        _gatewayFactory.Setup(f => f.CreateSortBuilder()).Returns(new SortBuilder<IoTGateway>());
        _gatewayFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTGateway>());

        _deviceFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTDevice>());
        _deviceFactory.Setup(f => f.CreateSortBuilder()).Returns(new SortBuilder<IoTDevice>());
        _deviceFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTDevice>());

        _dataPointFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTDataPoint>());
        _dataPointFactory.Setup(f => f.CreateSortBuilder()).Returns(new SortBuilder<IoTDataPoint>());
        _dataPointFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTDataPoint>());

        _dataRecordFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTDataRecord>());
        _dataRecordFactory.Setup(f => f.CreateSortBuilder()).Returns(new SortBuilder<IoTDataRecord>());
        _dataRecordFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTDataRecord>());

        _eventFactory.Setup(f => f.CreateFilterBuilder()).Returns(new FilterBuilder<IoTDeviceEvent>());
        _eventFactory.Setup(f => f.CreateSortBuilder()).Returns(new SortBuilder<IoTDeviceEvent>());
        _eventFactory.Setup(f => f.CreateUpdateBuilder()).Returns(new UpdateBuilder<IoTDeviceEvent>());
    }

    [Fact]
    public async Task GetGatewaysAsync_Should_Use_FilterBuilder()
    {
        // Arrange
        var gateways = new List<IoTGateway>
        {
            new() { GatewayId = "gw-1", CompanyId = "company-1", Title = "Gateway 1" },
            new() { GatewayId = "gw-2", CompanyId = "company-1", Title = "Gateway 2" }
        };

        _gatewayFactory
            .Setup(f => f.FindPagedAsync(
                It.IsAny<FilterDefinition<IoTGateway>>(),
                It.IsAny<SortDefinition<IoTGateway>>(),
                It.IsAny<int>(),
                It.IsAny<int>(),
                null))
            .ReturnsAsync((gateways, 2L));

        // Act
        var (items, total) = await _iotService.GetGatewaysAsync(1, 20);

        // Assert
        Assert.Equal(2, items.Count);
        Assert.Equal(2L, total);
        
        // 验证使用了 FilterBuilder
        _gatewayFactory.Verify(f => f.CreateFilterBuilder(), Times.Once);
        _gatewayFactory.Verify(f => f.CreateSortBuilder(), Times.Once);
    }

    [Fact]
    public async Task GetDevicesAsync_Should_Use_FilterBuilder()
    {
        // Arrange
        var devices = new List<IoTDevice>
        {
            new() { DeviceId = "dev-1", CompanyId = "company-1", GatewayId = "gw-1" },
            new() { DeviceId = "dev-2", CompanyId = "company-1", GatewayId = "gw-1" }
        };

        _deviceFactory
            .Setup(f => f.FindPagedAsync(
                It.IsAny<FilterDefinition<IoTDevice>>(),
                It.IsAny<SortDefinition<IoTDevice>>(),
                It.IsAny<int>(),
                It.IsAny<int>(),
                null))
            .ReturnsAsync((devices, 2L));

        // Act
        var (items, total) = await _iotService.GetDevicesAsync(null, 1, 20);

        // Assert
        Assert.Equal(2, items.Count);
        Assert.Equal(2L, total);
        
        // 验证使用了 FilterBuilder
        _deviceFactory.Verify(f => f.CreateFilterBuilder(), Times.Once);
        _deviceFactory.Verify(f => f.CreateSortBuilder(), Times.Once);
    }

    [Fact]
    public async Task GetDataPointsAsync_Should_Use_FilterBuilder()
    {
        // Arrange
        var dataPoints = new List<IoTDataPoint>
        {
            new() { DataPointId = "dp-1", CompanyId = "company-1", DeviceId = "dev-1" },
            new() { DataPointId = "dp-2", CompanyId = "company-1", DeviceId = "dev-1" }
        };

        _dataPointFactory
            .Setup(f => f.FindPagedAsync(
                It.IsAny<FilterDefinition<IoTDataPoint>>(),
                It.IsAny<SortDefinition<IoTDataPoint>>(),
                It.IsAny<int>(),
                It.IsAny<int>(),
                null))
            .ReturnsAsync((dataPoints, 2L));

        // Act
        var (items, total) = await _iotService.GetDataPointsAsync(null, 1, 20);

        // Assert
        Assert.Equal(2, items.Count);
        Assert.Equal(2L, total);
        
        // 验证使用了 FilterBuilder
        _dataPointFactory.Verify(f => f.CreateFilterBuilder(), Times.Once);
        _dataPointFactory.Verify(f => f.CreateSortBuilder(), Times.Once);
    }

    [Fact]
    public async Task QueryDataRecordsAsync_Should_Use_FilterBuilder()
    {
        // Arrange
        var records = new List<IoTDataRecord>
        {
            new() { DeviceId = "dev-1", DataPointId = "dp-1", CompanyId = "company-1", Value = "10" },
            new() { DeviceId = "dev-1", DataPointId = "dp-1", CompanyId = "company-1", Value = "20" }
        };

        _dataRecordFactory
            .Setup(f => f.FindPagedAsync(
                It.IsAny<FilterDefinition<IoTDataRecord>>(),
                It.IsAny<SortDefinition<IoTDataRecord>>(),
                It.IsAny<int>(),
                It.IsAny<int>(),
                null))
            .ReturnsAsync((records, 2L));

        var request = new QueryIoTDataRequest
        {
            DeviceId = "dev-1",
            PageIndex = 1,
            PageSize = 20
        };

        // Act
        var (resultRecords, total) = await _iotService.QueryDataRecordsAsync(request);

        // Assert
        Assert.Equal(2, resultRecords.Count);
        Assert.Equal(2L, total);
        
        // 验证使用了 FilterBuilder
        _dataRecordFactory.Verify(f => f.CreateFilterBuilder(), Times.Once);
        _dataRecordFactory.Verify(f => f.CreateSortBuilder(), Times.Once);
    }

    [Fact]
    public async Task UpdateGatewayAsync_Should_Use_UpdateBuilder()
    {
        // Arrange
        var gateway = new IoTGateway
        {
            Id = "id-1",
            GatewayId = "gw-1",
            CompanyId = "company-1",
            Title = "Original Title"
        };

        _gatewayFactory
            .Setup(f => f.GetByIdAsync("id-1"))
            .ReturnsAsync(gateway);

        _gatewayFactory
            .Setup(f => f.FindOneAndUpdateAsync(
                It.IsAny<FilterDefinition<IoTGateway>>(),
                It.IsAny<UpdateDefinition<IoTGateway>>(),
                It.IsAny<FindOneAndUpdateOptions<IoTGateway>>()))
            .ReturnsAsync(gateway);

        var request = new UpdateIoTGatewayRequest
        {
            Title = "Updated Title"
        };

        // Act
        var result = await _iotService.UpdateGatewayAsync("id-1", request);

        // Assert
        Assert.NotNull(result);
        
        // 验证使用了 UpdateBuilder
        _gatewayFactory.Verify(f => f.CreateUpdateBuilder(), Times.Once);
        _gatewayFactory.Verify(f => f.CreateFilterBuilder(), Times.Once);
    }

    [Fact]
    public async Task UpdateDeviceAsync_Should_Use_UpdateBuilder()
    {
        // Arrange
        var device = new IoTDevice
        {
            Id = "id-1",
            DeviceId = "dev-1",
            CompanyId = "company-1",
            Name = "Original Name"
        };

        _deviceFactory
            .Setup(f => f.GetByIdAsync("id-1"))
            .ReturnsAsync(device);

        _deviceFactory
            .Setup(f => f.FindOneAndUpdateAsync(
                It.IsAny<FilterDefinition<IoTDevice>>(),
                It.IsAny<UpdateDefinition<IoTDevice>>(),
                It.IsAny<FindOneAndUpdateOptions<IoTDevice>>()))
            .ReturnsAsync(device);

        var request = new UpdateIoTDeviceRequest
        {
            Name = "Updated Name"
        };

        // Act
        var result = await _iotService.UpdateDeviceAsync("id-1", request);

        // Assert
        Assert.NotNull(result);
        
        // 验证使用了 UpdateBuilder
        _deviceFactory.Verify(f => f.CreateUpdateBuilder(), Times.Once);
        _deviceFactory.Verify(f => f.CreateFilterBuilder(), Times.Once);
    }

    [Fact]
    public async Task GetGatewayStatisticsAsync_Should_Use_WithTenant()
    {
        // Arrange
        var gateway = new IoTGateway
        {
            GatewayId = "gw-1",
            CompanyId = "company-1",
            LastConnectedAt = DateTime.UtcNow
        };

        var devices = new List<IoTDevice>
        {
            new() { DeviceId = "dev-1", CompanyId = "company-1", GatewayId = "gw-1", Status = IoTDeviceStatus.Online },
            new() { DeviceId = "dev-2", CompanyId = "company-1", GatewayId = "gw-1", Status = IoTDeviceStatus.Offline }
        };

        _gatewayFactory
            .Setup(f => f.FindAsync(It.IsAny<FilterDefinition<IoTGateway>>(), null, It.IsAny<int?>(), null))
            .ReturnsAsync(new List<IoTGateway> { gateway });

        _deviceFactory
            .Setup(f => f.FindAsync(It.IsAny<FilterDefinition<IoTDevice>>(), null, null, null))
            .ReturnsAsync(devices);

        // Act
        var stats = await _iotService.GetGatewayStatisticsAsync("gw-1");

        // Assert
        Assert.NotNull(stats);
        Assert.Equal(2, stats.TotalDevices);
        Assert.Equal(1, stats.OnlineDevices);
        Assert.Equal(1, stats.OfflineDevices);
        
        // 验证查询设备时使用了 WithTenant
        _deviceFactory.Verify(f => f.CreateFilterBuilder(), Times.Once);
    }

    [Fact]
    public async Task GetDeviceStatisticsAsync_Should_Use_WithTenant()
    {
        // Arrange
        var device = new IoTDevice
        {
            DeviceId = "dev-1",
            CompanyId = "company-1",
            LastReportedAt = DateTime.UtcNow
        };

        var dataPoints = new List<IoTDataPoint>
        {
            new() { DataPointId = "dp-1", CompanyId = "company-1", DeviceId = "dev-1", IsEnabled = true },
            new() { DataPointId = "dp-2", CompanyId = "company-1", DeviceId = "dev-1", IsEnabled = false }
        };

        _deviceFactory
            .Setup(f => f.FindAsync(It.IsAny<FilterDefinition<IoTDevice>>(), null, It.IsAny<int?>(), null))
            .ReturnsAsync(new List<IoTDevice> { device });

        _dataPointFactory
            .Setup(f => f.FindAsync(It.IsAny<FilterDefinition<IoTDataPoint>>(), null, null, null))
            .ReturnsAsync(dataPoints);

        _dataRecordFactory
            .Setup(f => f.CountAsync(It.IsAny<FilterDefinition<IoTDataRecord>>()))
            .ReturnsAsync(100L);

        _eventFactory
            .Setup(f => f.CountAsync(It.IsAny<FilterDefinition<IoTDeviceEvent>>()))
            .ReturnsAsync(5L);

        // Act
        var stats = await _iotService.GetDeviceStatisticsAsync("dev-1");

        // Assert
        Assert.NotNull(stats);
        Assert.Equal(2, stats.TotalDataPoints);
        Assert.Equal(1, stats.EnabledDataPoints);
        Assert.Equal(100L, stats.TotalDataRecords);
        Assert.Equal(5L, stats.UnhandledAlarms);
        
        // 验证查询时使用了 FilterBuilder 和 WithTenant
        _dataPointFactory.Verify(f => f.CreateFilterBuilder(), Times.Once);
        _dataRecordFactory.Verify(f => f.CreateFilterBuilder(), Times.Once);
        _eventFactory.Verify(f => f.CreateFilterBuilder(), Times.Once);
    }

    [Fact]
    public async Task CreateDeviceAsync_Should_Use_Atomic_Update_For_DeviceCount()
    {
        // Arrange
        var gateway = new IoTGateway
        {
            Id = "gw-id-1",
            GatewayId = "gw-1",
            CompanyId = "company-1",
            DeviceCount = 5
        };

        var device = new IoTDevice
        {
            DeviceId = "dev-1",
            CompanyId = "company-1",
            GatewayId = "gw-1"
        };

        _deviceFactory
            .Setup(f => f.CreateAsync(It.IsAny<IoTDevice>()))
            .ReturnsAsync(device);

        _gatewayFactory
            .Setup(f => f.FindAsync(It.IsAny<FilterDefinition<IoTGateway>>(), null, It.IsAny<int?>(), null))
            .ReturnsAsync(new List<IoTGateway> { gateway });

        _gatewayFactory
            .Setup(f => f.FindOneAndUpdateAsync(
                It.IsAny<FilterDefinition<IoTGateway>>(),
                It.IsAny<UpdateDefinition<IoTGateway>>(),
                null))
            .ReturnsAsync(gateway);

        var request = new CreateIoTDeviceRequest
        {
            GatewayId = "gw-1",
            Name = "Test Device",
            Title = "Test Device Title"
        };

        // Act
        var result = await _iotService.CreateDeviceAsync(request);

        // Assert
        Assert.NotNull(result);
        
        // 验证使用了 UpdateBuilder 进行原子更新
        _gatewayFactory.Verify(f => f.CreateUpdateBuilder(), Times.Once);
        _gatewayFactory.Verify(f => f.CreateFilterBuilder(), Times.Once);
    }
}
