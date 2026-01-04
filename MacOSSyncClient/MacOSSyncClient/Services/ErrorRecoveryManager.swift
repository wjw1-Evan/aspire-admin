import Foundation

/// 错误恢复管理器实现 - 基础版本
class ErrorRecoveryManager: ErrorRecoveryManagerProtocol {
    struct RecoveryInfo {
        let path: String
        let lastError: String
        let lastAttempt: Date
        var retryCount: Int
    }

    private var recoveryRecords: [String: RecoveryInfo] = [:]
    private var errorRecords: [DiagnosticReport.ErrorRecord] = []
    private var errorsByType: [String: Int] = [:]
    private let calendar = Calendar.current

    func handleError(_ error: SyncError, for operation: SyncOperation) async {
        recoveryRecords[operation.path] = RecoveryInfo(
            path: operation.path,
            lastError: String(describing: error),
            lastAttempt: Date(),
            retryCount: operation.retryCount
        )
    }

    /// 覆盖支持通用错误与路径，满足测试调用
    func handleError(_ error: Error, for operationPath: String) async {
        recoveryRecords[operationPath] = RecoveryInfo(
            path: operationPath,
            lastError: String(describing: error),
            lastAttempt: Date(),
            retryCount: 0
        )
    }

    func handleNetworkError(_ error: SyncError, for operation: SyncOperation) async {
        // 基础实现
    }

    func handleFileSystemError(_ error: SyncError, for operation: SyncOperation) async {
        // 基础实现
    }

    func handleAuthenticationError(_ error: SyncError) async {
        // 基础实现
    }

    func handleDatabaseError(_ error: SyncError) async {
        // 基础实现
    }

    func rebuildSyncDatabase() async throws {
        // 基础实现
    }

    func requestReauthentication() async {
        // 基础实现
    }

    func requestPermission(for path: String) async {
        // 基础实现
    }

    func pauseSyncAndNotifyUser(reason: PauseReason) async {
        // 基础实现
    }

    func scheduleRetry(_ operation: SyncOperation, after delay: TimeInterval) async {
        // 基础实现
    }

    func markOperationAsFailed(_ operation: SyncOperation, error: SyncError) async {
        // 基础实现
    }

    func getRetryCount(for operation: SyncOperation) -> Int {
        return recoveryRecords[operation.path]?.retryCount ?? 0
    }

    func shouldRetryError(_ error: SyncError) -> Bool {
        switch error {
        case .networkUnavailable, .connectionTimeout, .serverError,
            .rateLimitExceeded, .fileInUse:
            return true
        case .authenticationFailed, .permissionDenied, .diskSpaceInsufficient,
            .quotaExceeded, .syncDatabaseCorrupted, .checksumMismatch:
            return false
        default:
            return false
        }
    }

    func calculateRetryDelay(attempt: Int) -> TimeInterval {
        let clamped = max(0, attempt)
        let delay = pow(2.0, Double(clamped))
        return min(60.0, max(1.0, delay))
    }

    func logError(_ error: SyncError, for operation: SyncOperation) async {
        let timestamp = Date()
        let errorString = String(describing: error)
        let record = DiagnosticReport.ErrorRecord(
            timestamp: timestamp,
            error: errorString,
            operation: operation.type.rawValue,
            path: operation.path
        )

        errorRecords.append(record)
        errorsByType[errorString, default: 0] += 1

        recoveryRecords[operation.path] = RecoveryInfo(
            path: operation.path,
            lastError: errorString,
            lastAttempt: timestamp,
            retryCount: operation.retryCount
        )
    }

    // MARK: - Recovery helpers (test scaffolding)

    func getRecoveryInfo(for path: String) async -> RecoveryInfo? {
        return recoveryRecords[path]
    }

    func retryFailedOperations() async {
        // 简单地标记重试计数
        for (path, info) in recoveryRecords {
            var updated = info
            updated.retryCount += 1
            recoveryRecords[path] = updated
        }
    }

    func generateDiagnosticReport() async -> DiagnosticReport {
        let stats = await getErrorStatistics()

        // 简单的磁盘信息获取
        let fileSystemAttributes = try? FileManager.default.attributesOfFileSystem(
            forPath: NSHomeDirectory())
        let freeSize = fileSystemAttributes?[.systemFreeSize] as? NSNumber
        let totalSize = fileSystemAttributes?[.systemSize] as? NSNumber

        let categoryCounts = categorizeErrors()

        return DiagnosticReport(
            generatedAt: Date(),
            systemInfo: DiagnosticReport.SystemInfo(
                osVersion: ProcessInfo.processInfo.operatingSystemVersionString,
                appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
                    ?? "1.0",
                availableDiskSpace: freeSize?.int64Value ?? 0,
                totalDiskSpace: totalSize?.int64Value ?? 0,
                networkStatus: "Unknown",
                lastSyncTime: nil
            ),
            syncStatus: DiagnosticReport.SyncStatus(
                totalItems: 0,
                syncedItems: 0,
                pendingItems: 0,
                errorItems: stats.totalErrors,
                conflictItems: 0
            ),
            errorSummary: DiagnosticReport.ErrorSummary(
                totalErrors: stats.totalErrors,
                networkErrors: categoryCounts["network"] ?? 0,
                fileSystemErrors: categoryCounts["filesystem"] ?? 0,
                authenticationErrors: categoryCounts["auth"] ?? 0,
                databaseErrors: categoryCounts["database"] ?? 0,
                recentErrors: Array(errorRecords.suffix(10))
            ),
            recommendations: [],
            errorLogs: errorRecords.map { "\($0.timestamp): \($0.error) at \($0.path ?? "-")" },
            performanceMetrics: [:]
        )
    }

    func getErrorStatistics() async -> ErrorStatistics {
        let total = errorRecords.count

        let byType = errorsByType
        let byHour = Dictionary(grouping: errorRecords) { record in
            calendar.component(.hour, from: record.timestamp)
        }.mapValues { $0.count }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let byDay = Dictionary(grouping: errorRecords) { record in
            dateFormatter.string(from: record.timestamp)
        }.mapValues { $0.count }

        let mostCommon = errorsByType.sorted { $0.value > $1.value }.map { $0.key }

        let now = Date()
        let last24Hours = errorRecords.filter { now.timeIntervalSince($0.timestamp) <= 86_400 }
            .count
        let last7Days = errorRecords.filter { now.timeIntervalSince($0.timestamp) <= 604_800 }.count
        let last30Days = errorRecords.filter { now.timeIntervalSince($0.timestamp) <= 2_592_000 }
            .count

        let baseline = max(1, last7Days)
        let change = Double(last24Hours) / Double(baseline) - 1.0

        return ErrorStatistics(
            totalErrors: total,
            errorsByType: byType,
            errorsByHour: byHour,
            errorsByDay: byDay,
            mostCommonErrors: mostCommon,
            errorTrends: ErrorStatistics.ErrorTrends(
                last24Hours: last24Hours,
                last7Days: last7Days,
                last30Days: last30Days,
                isIncreasing: change > 0,
                changePercentage: change * 100
            )
        )
    }

    private func categorizeErrors() -> [String: Int] {
        var categories: [String: Int] = [:]
        for record in errorRecords {
            let category: String
            if record.error.contains("network") || record.error.contains("server") {
                category = "network"
            } else if record.error.contains("permission") || record.error.contains("disk")
                || record.error.contains("quota")
            {
                category = "filesystem"
            } else if record.error.contains("auth") {
                category = "auth"
            } else if record.error.contains("database") {
                category = "database"
            } else {
                category = "other"
            }
            categories[category, default: 0] += 1
        }
        return categories
    }
}
