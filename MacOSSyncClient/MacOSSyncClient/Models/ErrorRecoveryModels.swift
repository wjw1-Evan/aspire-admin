import Foundation

/// 同步操作
struct SyncOperation: Codable, Hashable, Identifiable {
    let id: UUID
    let type: OperationType
    let path: String
    let cloudPath: String?
    var retryCount: Int
    let maxRetries: Int
    let createdAt: Date
    var lastAttemptAt: Date?
    var lastError: String?
    
    /// 操作类型
    enum OperationType: String, Codable, CaseIterable {
        case upload = "upload"
        case download = "download"
        case delete = "delete"
        case move = "move"
        case rename = "rename"
        case createFolder = "createFolder"
        case sync = "sync"
    }
    
    init(
        type: OperationType,
        path: String,
        cloudPath: String? = nil,
        maxRetries: Int = 3
    ) {
        self.id = UUID()
        self.type = type
        self.path = path
        self.cloudPath = cloudPath
        self.retryCount = 0
        self.maxRetries = maxRetries
        self.createdAt = Date()
        self.lastAttemptAt = nil
        self.lastError = nil
    }
    
    /// 是否可以重试
    var canRetry: Bool {
        return retryCount < maxRetries
    }
    
    /// 操作年龄
    var age: TimeInterval {
        return Date().timeIntervalSince(createdAt)
    }
    
    /// 是否过期
    var isExpired: Bool {
        let maxAge: TimeInterval = 24 * 60 * 60 // 24小时
        return age > maxAge
    }
    
    /// 增加重试次数
    mutating func incrementRetryCount() {
        retryCount += 1
        lastAttemptAt = Date()
    }
    
    /// 设置错误信息
    mutating func setError(_ error: SyncError) {
        lastError = error.localizedDescription
        lastAttemptAt = Date()
    }
}

/// 暂停原因
enum PauseReason: String, Codable, CaseIterable {
    case diskSpaceFull = "diskSpaceFull"
    case networkUnavailable = "networkUnavailable"
    case authenticationFailed = "authenticationFailed"
    case quotaExceeded = "quotaExceeded"
    case permissionDenied = "permissionDenied"
    case databaseCorrupted = "databaseCorrupted"
    case tooManyErrors = "tooManyErrors"
    
    var displayName: String {
        switch self {
        case .diskSpaceFull:
            return "Disk Space Full"
        case .networkUnavailable:
            return "Network Unavailable"
        case .authenticationFailed:
            return "Authentication Failed"
        case .quotaExceeded:
            return "Quota Exceeded"
        case .permissionDenied:
            return "Permission Denied"
        case .databaseCorrupted:
            return "Database Corrupted"
        case .tooManyErrors:
            return "Too Many Errors"
        }
    }
    
    var description: String {
        switch self {
        case .diskSpaceFull:
            return "Insufficient disk space to continue syncing"
        case .networkUnavailable:
            return "Network connection is not available"
        case .authenticationFailed:
            return "Authentication credentials are invalid"
        case .quotaExceeded:
            return "Storage quota has been exceeded"
        case .permissionDenied:
            return "Permission denied to access files"
        case .databaseCorrupted:
            return "Sync database is corrupted and needs rebuilding"
        case .tooManyErrors:
            return "Too many errors occurred, sync has been paused"
        }
    }
}

/// 错误日志条目
struct ErrorLogEntry: Codable, Identifiable {
    let id: UUID
    let timestamp: Date
    let error: String
    let errorType: String
    let operation: String
    let path: String?
    let retryCount: Int
    let resolved: Bool
    
    init(
        error: SyncError,
        operation: SyncOperation,
        retryCount: Int = 0,
        resolved: Bool = false
    ) {
        self.id = UUID()
        self.timestamp = Date()
        self.error = error.localizedDescription
        self.errorType = String(describing: error)
        self.operation = operation.type.rawValue
        self.path = operation.path
        self.retryCount = retryCount
        self.resolved = resolved
    }
}