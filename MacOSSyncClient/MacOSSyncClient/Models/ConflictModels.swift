import Foundation

/// 冲突解决策略
enum ConflictResolutionStrategy: String, Codable, CaseIterable {
    case askUser = "askUser"           // 询问用户
    case keepLocal = "keepLocal"       // 总是保留本地
    case keepCloud = "keepCloud"       // 总是保留云端
    case keepBoth = "keepBoth"         // 总是保留两个版本
    case keepNewer = "keepNewer"       // 保留较新的版本
    case keepLarger = "keepLarger"     // 保留较大的版本
    
    var displayName: String {
        switch self {
        case .askUser:
            return "Ask User"
        case .keepLocal:
            return "Keep Local"
        case .keepCloud:
            return "Keep Cloud"
        case .keepBoth:
            return "Keep Both"
        case .keepNewer:
            return "Keep Newer"
        case .keepLarger:
            return "Keep Larger"
        }
    }
    
    var description: String {
        switch self {
        case .askUser:
            return "Always ask the user how to resolve conflicts"
        case .keepLocal:
            return "Always keep the local version"
        case .keepCloud:
            return "Always keep the cloud version"
        case .keepBoth:
            return "Always keep both versions"
        case .keepNewer:
            return "Keep the version with the newer modification date"
        case .keepLarger:
            return "Keep the version with the larger file size"
        }
    }
}

/// 冲突解决结果
struct ConflictResolutionResult: Codable, Hashable {
    let conflictInfo: ConflictInfo
    let resolution: ConflictInfo.ResolutionOption
    let resolvedItem: SyncItem
    let timestamp: Date
    let success: Bool
    let error: String?
    
    init(
        conflictInfo: ConflictInfo,
        resolution: ConflictInfo.ResolutionOption,
        resolvedItem: SyncItem,
        timestamp: Date = Date(),
        success: Bool = true,
        error: String? = nil
    ) {
        self.conflictInfo = conflictInfo
        self.resolution = resolution
        self.resolvedItem = resolvedItem
        self.timestamp = timestamp
        self.success = success
        self.error = error
    }
}

/// 冲突解决错误
enum ConflictResolutionError: Error, LocalizedError {
    case conflictNotFound
    case invalidResolution
    case fileNotFound(String)
    case permissionDenied(String)
    case networkError(String)
    case storageError(String)
    case unknownError(String)
    
    var errorDescription: String? {
        switch self {
        case .conflictNotFound:
            return "Conflict not found"
        case .invalidResolution:
            return "Invalid resolution option"
        case .fileNotFound(let path):
            return "File not found: \(path)"
        case .permissionDenied(let path):
            return "Permission denied: \(path)"
        case .networkError(let message):
            return "Network error: \(message)"
        case .storageError(let message):
            return "Storage error: \(message)"
        case .unknownError(let message):
            return "Unknown error: \(message)"
        }
    }
}