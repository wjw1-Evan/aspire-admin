import Foundation

/// 缓存使用情况
struct CacheUsage: Codable, Hashable {
    let totalSize: Int64
    let usedSize: Int64
    let itemCount: Int
    let lastCleanup: Date?
    
    init(totalSize: Int64, usedSize: Int64, itemCount: Int, lastCleanup: Date? = nil) {
        self.totalSize = totalSize
        self.usedSize = usedSize
        self.itemCount = itemCount
        self.lastCleanup = lastCleanup
    }
    
    /// 使用百分比 (0.0 - 1.0)
    var usagePercentage: Double {
        guard totalSize > 0 else { return 0.0 }
        return Double(usedSize) / Double(totalSize)
    }
    
    /// 剩余空间
    var availableSize: Int64 {
        return max(0, totalSize - usedSize)
    }
    
    /// 是否需要清理
    var needsCleanup: Bool {
        return usagePercentage > 0.8 // 超过80%使用率
    }
    
    /// 格式化的使用情况描述
    var formattedUsage: String {
        let usedStr = ByteCountFormatter.string(fromByteCount: usedSize, countStyle: .file)
        let totalStr = ByteCountFormatter.string(fromByteCount: totalSize, countStyle: .file)
        let percentage = Int(usagePercentage * 100)
        return "\(usedStr) of \(totalStr) (\(percentage)%)"
    }
    
    /// 格式化的项目数量
    var formattedItemCount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: itemCount)) ?? "\(itemCount)"
    }
}

/// 缓存更新事件
struct CacheUpdate: Codable, Hashable {
    let path: String
    let updateType: UpdateType
    let size: Int64
    let timestamp: Date
    
    enum UpdateType: String, Codable, CaseIterable {
        case cached = "cached"
        case removed = "removed"
        case updated = "updated"
        
        var displayName: String {
            switch self {
            case .cached:
                return "Cached"
            case .removed:
                return "Removed"
            case .updated:
                return "Updated"
            }
        }
        
        var isAdditive: Bool {
            switch self {
            case .cached, .updated:
                return true
            case .removed:
                return false
            }
        }
    }
    
    init(path: String, updateType: UpdateType, size: Int64, timestamp: Date = Date()) {
        self.path = path
        self.updateType = updateType
        self.size = size
        self.timestamp = timestamp
    }
    
    /// 获取文件名
    var fileName: String {
        return URL(fileURLWithPath: path).lastPathComponent
    }
    
    /// 格式化的大小
    var formattedSize: String {
        return ByteCountFormatter.string(fromByteCount: size, countStyle: .file)
    }
    
    /// 更新描述
    var updateDescription: String {
        return "\(updateType.displayName) \(fileName) (\(formattedSize))"
    }
}

/// 离线修改记录
struct OfflineModification: Codable, Hashable, Identifiable {
    let id: UUID
    let path: String
    let modificationType: ModificationType
    let timestamp: Date
    let size: Int64
    
    enum ModificationType: Codable, Hashable, CustomStringConvertible {
        case created
        case modified
        case deleted
        case renamed(oldName: String)
        case moved(oldPath: String)
        
        var description: String {
            switch self {
            case .created:
                return "created"
            case .modified:
                return "modified"
            case .deleted:
                return "deleted"
            case .renamed(let oldName):
                return "renamed(from: \(oldName))"
            case .moved(let oldPath):
                return "moved(from: \(oldPath))"
            }
        }
    }
    
    init(
        id: UUID = UUID(),
        path: String,
        modificationType: ModificationType,
        timestamp: Date,
        size: Int64
    ) {
        self.id = id
        self.path = path
        self.modificationType = modificationType
        self.timestamp = timestamp
        self.size = size
    }
    
    /// 获取文件名
    var fileName: String {
        return URL(fileURLWithPath: path).lastPathComponent
    }
    
    /// 格式化的大小
    var formattedSize: String {
        return ByteCountFormatter.string(fromByteCount: size, countStyle: .file)
    }
    
    /// 修改描述
    var modificationDescription: String {
        switch modificationType {
        case .created:
            return "Created \(fileName)"
        case .modified:
            return "Modified \(fileName)"
        case .deleted:
            return "Deleted \(fileName)"
        case .renamed(let oldName):
            return "Renamed \(oldName) to \(fileName)"
        case .moved(let oldPath):
            let oldFileName = URL(fileURLWithPath: oldPath).lastPathComponent
            return "Moved \(oldFileName) to \(fileName)"
        }
    }
}

/// 离线缓存项目
struct OfflineCacheItem: Codable, Hashable, Identifiable {
    let id: UUID
    let syncItemId: UUID
    let localPath: String
    let cachePath: String
    let size: Int64
    let cachedDate: Date
    var lastAccessedDate: Date
    let priority: CachePriority
    
    enum CachePriority: String, Codable, CaseIterable {
        case low = "low"
        case normal = "normal"
        case high = "high"
        case pinned = "pinned" // 用户明确标记为离线可用
        
        var displayName: String {
            switch self {
            case .low:
                return "Low"
            case .normal:
                return "Normal"
            case .high:
                return "High"
            case .pinned:
                return "Pinned"
            }
        }
        
        var sortOrder: Int {
            switch self {
            case .pinned:
                return 0
            case .high:
                return 1
            case .normal:
                return 2
            case .low:
                return 3
            }
        }
    }
    
    init(
        id: UUID = UUID(),
        syncItemId: UUID,
        localPath: String,
        cachePath: String,
        size: Int64,
        cachedDate: Date = Date(),
        lastAccessedDate: Date = Date(),
        priority: CachePriority = .normal
    ) {
        self.id = id
        self.syncItemId = syncItemId
        self.localPath = localPath
        self.cachePath = cachePath
        self.size = size
        self.cachedDate = cachedDate
        self.lastAccessedDate = lastAccessedDate
        self.priority = priority
    }
    
    /// 获取文件名
    var fileName: String {
        return URL(fileURLWithPath: localPath).lastPathComponent
    }
    
    /// 格式化的大小
    var formattedSize: String {
        return ByteCountFormatter.string(fromByteCount: size, countStyle: .file)
    }
    
    /// 缓存年龄（天数）
    var cacheAge: Int {
        return Calendar.current.dateComponents([.day], from: cachedDate, to: Date()).day ?? 0
    }
    
    /// 最后访问年龄（天数）
    var lastAccessAge: Int {
        return Calendar.current.dateComponents([.day], from: lastAccessedDate, to: Date()).day ?? 0
    }
    
    /// 是否可以被清理（非固定优先级且长时间未访问）
    var canBeEvicted: Bool {
        return priority != .pinned && lastAccessAge > 7 // 7天未访问
    }
    
    /// 更新最后访问时间
    mutating func updateLastAccessed() {
        lastAccessedDate = Date()
    }
    
    /// 计算清理优先级分数（分数越高越应该被清理）
    func evictionScore() -> Double {
        let ageFactor = Double(lastAccessAge) * 0.4
        let sizeFactor = Double(size) / (1024 * 1024) * 0.3 // MB
        let priorityFactor = Double(priority.sortOrder) * 0.3
        
        return ageFactor + sizeFactor + priorityFactor
    }
}