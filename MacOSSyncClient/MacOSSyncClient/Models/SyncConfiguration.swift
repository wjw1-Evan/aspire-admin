import Foundation

/// 同步配置数据模型
struct SyncConfiguration: Codable {
    var syncRootPath: String
    var selectedFolders: Set<String>
    var excludePatterns: [String]
    var bandwidthLimits: BandwidthLimits
    var conflictResolution: ConflictResolutionStrategy
    var offlineSettings: OfflineSettings
    var securitySettings: SecuritySettings
    var maxRetryAttempts: Int
    var transferTimeout: TimeInterval
    
    /// 带宽限制配置
    struct BandwidthLimits: Codable, Equatable {
        var uploadLimit: Int64? // bytes per second
        var downloadLimit: Int64?
        var enableAutoThrottling: Bool
        var pauseOnMeteredConnection: Bool
        
        init(
            uploadLimit: Int64? = nil,
            downloadLimit: Int64? = nil,
            enableAutoThrottling: Bool = true,
            pauseOnMeteredConnection: Bool = true
        ) {
            self.uploadLimit = uploadLimit
            self.downloadLimit = downloadLimit
            self.enableAutoThrottling = enableAutoThrottling
            self.pauseOnMeteredConnection = pauseOnMeteredConnection
        }
    }
    
    /// 冲突解决策略
    enum ConflictResolutionStrategy: String, Codable, CaseIterable {
        case askUser = "askUser"         // 询问用户
        case keepLocal = "keepLocal"     // 总是保留本地
        case keepCloud = "keepCloud"     // 总是保留云端
        case keepBoth = "keepBoth"       // 总是保留两个版本
        
        var displayName: String {
            switch self {
            case .askUser:
                return "Ask User"
            case .keepLocal:
                return "Keep Local Version"
            case .keepCloud:
                return "Keep Cloud Version"
            case .keepBoth:
                return "Keep Both Versions"
            }
        }
    }
    
    /// 离线设置
    struct OfflineSettings: Codable, Equatable {
        var maxCacheSize: Int64
        var autoCleanupEnabled: Bool
        var cleanupThreshold: Double // 0.0-1.0
        
        init(
            maxCacheSize: Int64 = 10 * 1024 * 1024 * 1024, // 10GB default
            autoCleanupEnabled: Bool = true,
            cleanupThreshold: Double = 0.8 // 80% threshold
        ) {
            self.maxCacheSize = maxCacheSize
            self.autoCleanupEnabled = autoCleanupEnabled
            self.cleanupThreshold = cleanupThreshold
        }
    }
    
    /// 安全设置
    struct SecuritySettings: Codable, Equatable {
        var enableEncryption: Bool
        var requireTwoFactor: Bool
        var autoLockTimeout: TimeInterval
        
        init(
            enableEncryption: Bool = true,
            requireTwoFactor: Bool = false,
            autoLockTimeout: TimeInterval = 3600 // 1 hour
        ) {
            self.enableEncryption = enableEncryption
            self.requireTwoFactor = requireTwoFactor
            self.autoLockTimeout = autoLockTimeout
        }
    }
    
    /// 默认配置初始化
    init(
        syncRootPath: String = NSHomeDirectory() + "/CloudSync",
        selectedFolders: Set<String> = [],
        excludePatterns: [String] = [".DS_Store", "*.tmp", "Thumbs.db"],
        bandwidthLimits: BandwidthLimits = BandwidthLimits(),
        conflictResolution: ConflictResolutionStrategy = .askUser,
        offlineSettings: OfflineSettings = OfflineSettings(),
        securitySettings: SecuritySettings = SecuritySettings(),
        maxRetryAttempts: Int = 3,
        transferTimeout: TimeInterval = 300.0 // 5 minutes
    ) {
        self.syncRootPath = syncRootPath
        self.selectedFolders = selectedFolders
        self.excludePatterns = excludePatterns
        self.bandwidthLimits = bandwidthLimits
        self.conflictResolution = conflictResolution
        self.offlineSettings = offlineSettings
        self.securitySettings = securitySettings
        self.maxRetryAttempts = maxRetryAttempts
        self.transferTimeout = transferTimeout
    }
    
    /// 验证配置是否有效
    func isValid() -> Bool {
        // 检查同步根路径是否存在
        var isDirectory: ObjCBool = false
        let pathExists = FileManager.default.fileExists(atPath: syncRootPath, isDirectory: &isDirectory)
        
        guard pathExists && isDirectory.boolValue else {
            return false
        }
        
        // 检查带宽限制是否合理
        if let uploadLimit = bandwidthLimits.uploadLimit, uploadLimit <= 0 {
            return false
        }
        
        if let downloadLimit = bandwidthLimits.downloadLimit, downloadLimit <= 0 {
            return false
        }
        
        // 检查离线设置是否合理
        if offlineSettings.maxCacheSize <= 0 {
            return false
        }
        
        if offlineSettings.cleanupThreshold < 0.0 || offlineSettings.cleanupThreshold > 1.0 {
            return false
        }
        
        return true
    }
    
    /// 获取格式化的缓存大小
    func formattedCacheSize() -> String {
        return ByteCountFormatter.string(fromByteCount: offlineSettings.maxCacheSize, countStyle: .file)
    }
    
    /// 获取格式化的带宽限制
    func formattedBandwidthLimits() -> (upload: String?, download: String?) {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        
        let upload = bandwidthLimits.uploadLimit.map { "\(formatter.string(fromByteCount: $0))/s" }
        let download = bandwidthLimits.downloadLimit.map { "\(formatter.string(fromByteCount: $0))/s" }
        
        return (upload, download)
    }
}