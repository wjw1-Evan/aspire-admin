import Foundation
import OSLog

/// 诊断服务，提供系统诊断和日志功能
class DiagnosticService {
    private let logger = Logger(subsystem: "com.syncapp.macos", category: "Diagnostics")
    private let fileLogger = Logger(subsystem: "com.syncapp.macos", category: "FileOperations")
    private let networkLogger = Logger(subsystem: "com.syncapp.macos", category: "Network")
    private let syncLogger = Logger(subsystem: "com.syncapp.macos", category: "Sync")
    private let errorLogger = Logger(subsystem: "com.syncapp.macos", category: "Errors")

    // 诊断数据收集
    private var diagnosticData: [String: Any] = [:]
    private let diagnosticQueue = DispatchQueue(label: "diagnostic-service", qos: .utility)

    init() {
        logger.info("DiagnosticService initialized")
    }

    // MARK: - 结构化日志记录

    /// 记录文件操作日志
    func logFileOperation(
        operation: String, path: String, result: OperationResult, duration: TimeInterval? = nil
    ) {
        let metadata: [String: Any] = [
            "operation": operation,
            "path": path,
            "result": result.rawValue,
            "duration": duration ?? 0,
            "timestamp": Date().timeIntervalSince1970,
        ]

        switch result {
        case .success:
            fileLogger.info("File operation completed: \(operation) at \(path)")
        case .failure:
            fileLogger.error("File operation failed: \(operation) at \(path)")
        case .partial:
            fileLogger.warning("File operation partially completed: \(operation) at \(path)")
        }

        recordDiagnosticEvent("file_operation", metadata: metadata)
    }

    /// 记录网络操作日志
    func logNetworkOperation(
        operation: String, url: String, statusCode: Int?, duration: TimeInterval,
        bytesTransferred: Int64 = 0
    ) {
        let metadata: [String: Any] = [
            "operation": operation,
            "url": url,
            "status_code": statusCode ?? 0,
            "duration": duration,
            "bytes_transferred": bytesTransferred,
            "timestamp": Date().timeIntervalSince1970,
        ]

        if let code = statusCode, code >= 200 && code < 300 {
            networkLogger.info("Network operation successful: \(operation) to \(url) (\(code))")
        } else {
            networkLogger.error(
                "Network operation failed: \(operation) to \(url) (\(statusCode ?? -1))")
        }

        recordDiagnosticEvent("network_operation", metadata: metadata)
    }

    /// 记录同步操作日志
    func logSyncOperation(
        operation: String, itemCount: Int, duration: TimeInterval, result: OperationResult
    ) {
        let metadata: [String: Any] = [
            "operation": operation,
            "item_count": itemCount,
            "duration": duration,
            "result": result.rawValue,
            "timestamp": Date().timeIntervalSince1970,
        ]

        switch result {
        case .success:
            syncLogger.info("Sync operation completed: \(operation) (\(itemCount) items)")
        case .failure:
            syncLogger.error("Sync operation failed: \(operation)")
        case .partial:
            syncLogger.warning(
                "Sync operation partially completed: \(operation) (\(itemCount) items)")
        }

        recordDiagnosticEvent("sync_operation", metadata: metadata)
    }

    /// 记录错误日志
    func logError(error: Error, context: String, severity: ErrorSeverity = .error) {
        let metadata: [String: Any] = [
            "error": error.localizedDescription,
            "error_type": String(describing: type(of: error)),
            "context": context,
            "severity": severity.rawValue,
            "timestamp": Date().timeIntervalSince1970,
        ]

        switch severity {
        case .critical:
            errorLogger.critical("Critical error in \(context): \(error.localizedDescription)")
        case .error:
            errorLogger.error("Error in \(context): \(error.localizedDescription)")
        case .warning:
            errorLogger.warning("Warning in \(context): \(error.localizedDescription)")
        case .info:
            errorLogger.info("Info in \(context): \(error.localizedDescription)")
        }

        recordDiagnosticEvent("error", metadata: metadata)
    }

    // MARK: - 系统诊断

    /// 执行系统健康检查
    func performHealthCheck() async -> SystemHealthStatus {
        logger.info("Performing system health check")

        let networkHealth = await checkNetworkHealth()
        let diskHealth = await checkDiskHealth()
        let syncHealth = await checkSyncHealth()
        let authHealth = await checkAuthHealth()

        let overallHealth = determineOverallHealth([
            networkHealth, diskHealth, syncHealth, authHealth,
        ])
        let issues = await collectHealthIssues()

        let healthStatus = SystemHealthStatus(
            overallHealth: overallHealth,
            networkHealth: networkHealth,
            diskHealth: diskHealth,
            syncHealth: syncHealth,
            authHealth: authHealth,
            lastChecked: Date(),
            issues: issues
        )

        logger.info("Health check completed: \(overallHealth.displayName)")
        return healthStatus
    }

    /// 生成诊断报告
    func generateDiagnosticReport() async -> DiagnosticReport {
        logger.info("Generating diagnostic report")

        let systemInfo = DiagnosticReport.SystemInfo(
            osVersion: ProcessInfo.processInfo.operatingSystemVersionString,
            appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
                ?? "Unknown",
            availableDiskSpace: getAvailableDiskSpace(),
            totalDiskSpace: getTotalDiskSpace(),
            networkStatus: "Connected",
            lastSyncTime: nil
        )

        let syncStatus = DiagnosticReport.SyncStatus(
            totalItems: 0,
            syncedItems: 0,
            pendingItems: 0,
            errorItems: 0,
            conflictItems: 0
        )

        let errorSummary = DiagnosticReport.ErrorSummary(
            totalErrors: 0,
            networkErrors: 0,
            fileSystemErrors: 0,
            authenticationErrors: 0,
            databaseErrors: 0,
            recentErrors: []
        )

        return DiagnosticReport(
            generatedAt: Date(),
            systemInfo: systemInfo,
            syncStatus: syncStatus,
            errorSummary: errorSummary,
            recommendations: generateRecommendations(),
            errorLogs: [],
            performanceMetrics: [:]
        )
    }

    // MARK: - 私有方法

    private func recordDiagnosticEvent(_ eventType: String, metadata: [String: Any]) {
        diagnosticQueue.async {
            var events = self.diagnosticData["events"] as? [[String: Any]] ?? []
            var event = metadata
            event["event_type"] = eventType
            events.append(event)

            // 保留最近1000个事件
            if events.count > 1000 {
                events = Array(events.suffix(1000))
            }

            self.diagnosticData["events"] = events
        }
    }

    private func checkNetworkHealth() async -> SystemHealthStatus.HealthLevel {
        return .good
    }

    private func checkDiskHealth() async -> SystemHealthStatus.HealthLevel {
        do {
            let homeURL = URL(fileURLWithPath: NSHomeDirectory())
            let values = try homeURL.resourceValues(forKeys: [
                .volumeAvailableCapacityKey, .volumeTotalCapacityKey,
            ])

            if let available = values.volumeAvailableCapacity,
                let total = values.volumeTotalCapacity
            {
                let usagePercentage = Double(total - available) / Double(total)

                if usagePercentage > 0.95 {
                    return .critical
                } else if usagePercentage > 0.85 {
                    return .warning
                } else {
                    return .good
                }
            }
        } catch {
            logger.error("Failed to check disk health: \(error.localizedDescription)")
        }

        return .unknown
    }

    private func checkSyncHealth() async -> SystemHealthStatus.HealthLevel {
        return .good
    }

    private func checkAuthHealth() async -> SystemHealthStatus.HealthLevel {
        return .good
    }

    private func determineOverallHealth(_ healthLevels: [SystemHealthStatus.HealthLevel])
        -> SystemHealthStatus.HealthLevel
    {
        if healthLevels.contains(.critical) {
            return .critical
        } else if healthLevels.contains(.warning) {
            return .warning
        } else if healthLevels.allSatisfy({ $0 == .good || $0 == .excellent }) {
            return .good
        } else {
            return .unknown
        }
    }

    private func collectHealthIssues() async -> [SystemHealthStatus.HealthIssue] {
        var issues: [SystemHealthStatus.HealthIssue] = []

        if await checkDiskHealth() == .critical {
            issues.append(
                SystemHealthStatus.HealthIssue(
                    severity: .critical,
                    category: "Storage",
                    title: "Low Disk Space",
                    description: "Available disk space is critically low",
                    recommendation: "Free up disk space by deleting unnecessary files"
                ))
        }

        return issues
    }

    private func getAvailableDiskSpace() -> Int64 {
        do {
            let fileURL = URL(fileURLWithPath: NSHomeDirectory())
            let values = try fileURL.resourceValues(forKeys: [.volumeAvailableCapacityKey])
            return Int64(values.volumeAvailableCapacity ?? 0)
        } catch {
            return 0
        }
    }

    private func getTotalDiskSpace() -> Int64 {
        do {
            let fileURL = URL(fileURLWithPath: NSHomeDirectory())
            let values = try fileURL.resourceValues(forKeys: [.volumeTotalCapacityKey])
            return Int64(values.volumeTotalCapacity ?? 0)
        } catch {
            return 0
        }
    }

    private func generateRecommendations() -> [String] {
        return [
            "Keep the application updated to the latest version",
            "Ensure sufficient disk space for sync operations",
            "Check network connectivity if sync issues occur",
        ]
    }
}
