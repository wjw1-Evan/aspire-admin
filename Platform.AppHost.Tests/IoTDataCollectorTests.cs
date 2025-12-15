using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
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
        gatewayFactory.Setup(f => f.FindAsync(It.IsAny<FilterDefinition<IoTGateway>>(), null, It.IsAny<int?>(), null))
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

        var collector = new IoTDataCollector(
            gatewayFactory.Object,
            deviceFactory.Object,
            dataPointFactory.Object,
            dataRecordFactory.Object,
            fetchClient.Object,
            optionsMonitor.Object,
            NullLogger<IoTDataCollector>.Instance);

        var result = await collector.RunOnceAsync(CancellationToken.None);

        Assert.Equal(1, result.DevicesProcessed);
        Assert.Equal(1, result.DataPointsProcessed);
        Assert.Equal(1, result.RecordsInserted);
        Assert.Equal(0, result.RecordsSkipped);
        Assert.Empty(result.Warnings);
    }
}
