import Foundation

/// 诊断报告
struct DiagnosticReport: Codable {
    let generatedAt: Date
    let systemInfo: SystemInfo
    let syncStatus: SyncStatus
    let errorSummary: ErrorSummary
    let recommendations: [String]
    let errorLogs: [String]?
    let performanceMetrics: [String: Double]?

    struct SystemInfo: Codable {
        let osVersion: String
        let appVersion: String
        let availableDiskSpace: Int64
        let totalDiskSpace: Int64
        let networkStatus: String
        let lastSyncTime: Date?
    }

    struct SyncStatus: Codable {
        let totalItems: Int
        let syncedItems: Int
        let pendingItems: Int
        let errorItems: Int
        let conflictItems: Int
    }

    struct ErrorSummary: Codable {
        let totalErrors: Int
        let networkErrors: Int
        let fileSystemErrors: Int
        let authenticationErrors: Int
        let databaseErrors: Int
        let recentErrors: [ErrorRecord]
    }

    struct ErrorRecord: Codable {
        let timestamp: Date
        let error: String
        let operation: String
        let path: String?
    }
}

/// 错误统计
struct ErrorStatistics: Codable {
    let totalErrors: Int
    let errorsByType: [String: Int]
    let errorsByHour: [Int: Int]  // 小时 -> 错误数量
    let errorsByDay: [String: Int]  // 日期 -> 错误数量
    let mostCommonErrors: [String]
    let errorTrends: ErrorTrends

    struct ErrorTrends: Codable {
        let last24Hours: Int
        let last7Days: Int
        let last30Days: Int
        let isIncreasing: Bool
        let changePercentage: Double
    }
}
/// 操作结果
enum OperationResult: String, Codable {
    case success = "success"
    case failure = "failure"
    case partial = "partial"

    init(error: String?) {
        if let error = error {
            self = .failure
        } else {
            self = .success
        }
    }
}

/// 错误严重程度
enum ErrorSeverity: String, Codable, CaseIterable {
    case critical = "critical"
    case error = "error"
    case warning = "warning"
    case info = "info"
}

/// 系统健康状态
struct SystemHealthStatus: Codable {
    let overallHealth: HealthLevel
    let networkHealth: HealthLevel
    let diskHealth: HealthLevel
    let syncHealth: HealthLevel
    let authHealth: HealthLevel
    let lastChecked: Date
    let issues: [HealthIssue]

    enum HealthLevel: String, Codable, CaseIterable {
        case excellent = "excellent"
        case good = "good"
        case warning = "warning"
        case critical = "critical"
        case unknown = "unknown"

        var displayName: String {
            switch self {
            case .excellent:
                return "Excellent"
            case .good:
                return "Good"
            case .warning:
                return "Warning"
            case .critical:
                return "Critical"
            case .unknown:
                return "Unknown"
            }
        }

        var color: String {
            switch self {
            case .excellent:
                return "green"
            case .good:
                return "blue"
            case .warning:
                return "orange"
            case .critical:
                return "red"
            case .unknown:
                return "gray"
            }
        }
    }

    struct HealthIssue: Codable, Identifiable {
        let id: UUID
        let severity: HealthLevel
        let category: String
        let title: String
        let description: String
        let recommendation: String?
        let detectedAt: Date

        init(
            severity: HealthLevel,
            category: String,
            title: String,
            description: String,
            recommendation: String? = nil
        ) {
            self.id = UUID()
            self.severity = severity
            self.category = category
            self.title = title
            self.description = description
            self.recommendation = recommendation
            self.detectedAt = Date()
        }
    }
}

/// 日志类别
enum LogCategory: String, Codable, CaseIterable {
    case fileOperations = "file_operations"
    case network = "network"
    case sync = "sync"
    case errors = "errors"
    case diagnostics = "diagnostics"
}

/// 性能监控会话
struct PerformanceMonitoringSession {
    let id: UUID
    let name: String
    let startTime: Date
    var endTime: Date?
    var metrics: [String: Double] = [:]
}

/// 性能报告
struct PerformanceReport: Codable {
    let sessionId: UUID
    let sessionName: String
    let duration: TimeInterval
    let metrics: [String: Double]
}

/// 日志汇总
struct LogSummary: Codable {
    let timeRange: DateInterval
    let totalEvents: Int
    let eventsByType: [String: Int]
    let errorCount: Int
}
