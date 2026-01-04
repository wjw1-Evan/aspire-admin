import Foundation

/// 同步引擎协议，定义核心同步功能接口
protocol SyncEngineProtocol {
    // MARK: - 同步控制
    
    /// 启动同步服务
    func startSync() async throws
    
    /// 暂停同步服务
    func pauseSync() async
    
    /// 恢复同步服务
    func resumeSync() async throws
    
    /// 停止同步服务
    func stopSync() async
    
    // MARK: - 文件操作
    
    /// 同步指定路径的文件
    /// - Parameter path: 文件路径
    func syncFile(at path: String) async throws
    
    /// 同步指定路径的文件夹
    /// - Parameters:
    ///   - path: 文件夹路径
    ///   - recursive: 是否递归同步子文件夹
    func syncFolder(at path: String, recursive: Bool) async throws
    
    /// 删除指定路径的项目
    /// - Parameter path: 项目路径
    func deleteItem(at path: String) async throws
    
    /// 移动项目
    /// - Parameters:
    ///   - from: 源路径
    ///   - to: 目标路径
    func moveItem(from: String, to: String) async throws
    
    /// 重命名项目
    /// - Parameters:
    ///   - path: 项目路径
    ///   - newName: 新名称
    func renameItem(at path: String, to newName: String) async throws
    
    // MARK: - 状态查询
    
    /// 获取同步引擎状态
    /// - Returns: 当前同步引擎状态
    func getSyncState() -> SyncEngineState
    
    /// 获取指定路径项目的同步状态
    /// - Parameter path: 项目路径
    /// - Returns: 同步状态，如果项目不存在则返回nil
    func getItemState(at path: String) -> SyncItem.SyncState?
    
    /// 获取同步进度
    /// - Returns: 当前同步进度信息
    func getSyncProgress() -> SyncProgress
    
    // MARK: - 事件监听
    
    /// 同步引擎状态变化流
    var stateChanges: AsyncStream<SyncEngineState> { get }
    
    /// 同步项目变化流
    var itemChanges: AsyncStream<SyncItemChange> { get }
    
    /// 同步进度更新流
    var progressUpdates: AsyncStream<SyncProgress> { get }
}

/// 同步引擎状态
enum SyncEngineState: Codable, Hashable {
    case idle
    case syncing
    case paused
    case error(String) // 使用 String 而不是 SyncError 以支持 Codable
    
    var displayName: String {
        switch self {
        case .idle:
            return "Idle"
        case .syncing:
            return "Syncing"
        case .paused:
            return "Paused"
        case .error(let message):
            return "Error: \(message)"
        }
    }
    
    var isActive: Bool {
        switch self {
        case .syncing:
            return true
        default:
            return false
        }
    }
}

/// 同步进度信息
struct SyncProgress: Codable, Hashable {
    let totalItems: Int
    let completedItems: Int
    let totalBytes: Int64
    let transferredBytes: Int64
    let currentOperation: String?
    let estimatedTimeRemaining: TimeInterval?
    
    init(
        totalItems: Int,
        completedItems: Int,
        totalBytes: Int64,
        transferredBytes: Int64,
        currentOperation: String? = nil,
        estimatedTimeRemaining: TimeInterval? = nil
    ) {
        self.totalItems = totalItems
        self.completedItems = completedItems
        self.totalBytes = totalBytes
        self.transferredBytes = transferredBytes
        self.currentOperation = currentOperation
        self.estimatedTimeRemaining = estimatedTimeRemaining
    }
    
    /// 完成百分比 (0.0 - 1.0)
    var completionPercentage: Double {
        guard totalItems > 0 else { return 0.0 }
        return Double(completedItems) / Double(totalItems)
    }
    
    /// 传输百分比 (0.0 - 1.0)
    var transferPercentage: Double {
        guard totalBytes > 0 else { return 0.0 }
        return Double(transferredBytes) / Double(totalBytes)
    }
    
    /// 是否完成
    var isCompleted: Bool {
        return completedItems >= totalItems && transferredBytes >= totalBytes
    }
    
    /// 格式化的传输速度
    func formattedTransferSpeed(timeElapsed: TimeInterval) -> String? {
        guard timeElapsed > 0 else { return nil }
        let bytesPerSecond = Double(transferredBytes) / timeElapsed
        return ByteCountFormatter.string(fromByteCount: Int64(bytesPerSecond), countStyle: .file) + "/s"
    }
    
    /// 格式化剩余时间
    var formattedTimeRemaining: String? {
        guard let timeRemaining = estimatedTimeRemaining else { return nil }
        
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.hour, .minute, .second]
        formatter.unitsStyle = .abbreviated
        return formatter.string(from: timeRemaining)
    }
}

/// 同步项目变化
struct SyncItemChange: Codable, Hashable {
    let item: SyncItem
    let changeType: ChangeType
    let timestamp: Date
    
    /// 变化类型
    enum ChangeType: String, Codable, CaseIterable {
        case added = "added"
        case modified = "modified"
        case deleted = "deleted"
        case stateChanged = "stateChanged"
    }
    
    init(item: SyncItem, changeType: ChangeType, timestamp: Date = Date()) {
        self.item = item
        self.changeType = changeType
        self.timestamp = timestamp
    }
}

/// 同步错误类型
enum SyncError: Error, LocalizedError, Equatable {
    // 网络错误
    case networkUnavailable
    case connectionTimeout
    case serverError(Int)
    case authenticationFailed
    case rateLimitExceeded
    
    // 文件系统错误
    case fileNotFound(String)
    case permissionDenied(String)
    case diskSpaceInsufficient
    case fileInUse(String)
    case pathTooLong(String)
    
    // 同步错误
    case conflictDetected(ConflictInfo)
    case syncDatabaseCorrupted
    case checksumMismatch(String)
    case versionMismatch
    
    // 配置错误
    case invalidConfiguration
    case unsupportedFileType(String)
    case quotaExceeded
    
    var errorDescription: String? {
        switch self {
        case .networkUnavailable:
            return "Network connection is unavailable"
        case .connectionTimeout:
            return "Connection timed out"
        case .serverError(let code):
            return "Server error: \(code)"
        case .authenticationFailed:
            return "Authentication failed"
        case .rateLimitExceeded:
            return "Rate limit exceeded"
        case .fileNotFound(let path):
            return "File not found: \(path)"
        case .permissionDenied(let path):
            return "Permission denied: \(path)"
        case .diskSpaceInsufficient:
            return "Insufficient disk space"
        case .fileInUse(let path):
            return "File is in use: \(path)"
        case .pathTooLong(let path):
            return "Path too long: \(path)"
        case .conflictDetected(let conflict):
            return "Sync conflict detected: \(conflict.conflictType)"
        case .syncDatabaseCorrupted:
            return "Sync database is corrupted"
        case .checksumMismatch(let path):
            return "Checksum mismatch: \(path)"
        case .versionMismatch:
            return "Version mismatch"
        case .invalidConfiguration:
            return "Invalid configuration"
        case .unsupportedFileType(let type):
            return "Unsupported file type: \(type)"
        case .quotaExceeded:
            return "Storage quota exceeded"
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .networkUnavailable:
            return "Check your internet connection and try again"
        case .connectionTimeout:
            return "Check your network connection and retry"
        case .authenticationFailed:
            return "Please sign in again"
        case .diskSpaceInsufficient:
            return "Free up disk space and try again"
        case .syncDatabaseCorrupted:
            return "The sync database will be rebuilt automatically"
        case .quotaExceeded:
            return "Upgrade your storage plan or free up space"
        default:
            return "Please try again or contact support if the problem persists"
        }
    }
}