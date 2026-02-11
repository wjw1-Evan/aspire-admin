using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Diagnostics.Metrics;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 🚀 简化的EF Core性能监控服务
/// </summary>
public class EFCorePerformanceMonitor
{
    private readonly ILogger<EFCorePerformanceMonitor> _logger;
    private readonly IMongoClient _mongoClient;

    public EFCorePerformanceMonitor(
        ILogger<EFCorePerformanceMonitor> logger,
        IMongoClient mongoClient)
    {
        _logger = logger;
        _mongoClient = mongoClient;
    }

    /// <summary>
    /// 🚀 开始查询性能监控
    /// </summary>
    public static IDisposable BeginQueryMonitoring<T>(string operationType)
    {
        var stopwatch = Stopwatch.StartNew();
        
        return new DisposableTimer(stopwatch, operationType);
    }

    /// <summary>
    /// 🚀 记录查询性能
    /// </summary>
    public static void RecordQuery(string operationType, double durationMs, bool success = true)
    {
        // 简化版本 - 可以后续扩展
        // 可以在这里添加日志记录或指标收集
    }

    /// <summary>
    /// 一次性计时器，用于自动记录查询性能
    /// </summary>
    private class DisposableTimer : IDisposable
    {
        private readonly Stopwatch _stopwatch;
        private readonly string _operationType;

        public DisposableTimer(Stopwatch stopwatch, string operationType)
        {
            _stopwatch = stopwatch;
            _operationType = operationType;
        }

        public void Dispose()
        {
            _stopwatch.Stop();
            var duration = _stopwatch.Elapsed.TotalMilliseconds;
            RecordQuery(_operationType, duration);
        }
    }
}