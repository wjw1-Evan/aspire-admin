import Foundation

/// 同步项目数据模型，表示本地和云端的文件或文件夹
struct SyncItem: Codable, Identifiable, Hashable {
    let id: UUID
    var cloudId: String
    var localPath: String
    var cloudPath: String
    var name: String
    let type: ItemType
    var size: Int64
    var modifiedDate: Date
    var syncState: SyncState
    var hash: String
    let parentId: UUID?
    var isSelected: Bool // 选择性同步
    var isOfflineAvailable: Bool
    var lastSyncDate: Date?
    var conflictInfo: ConflictInfo?
    
    /// 文件项类型
    enum ItemType: String, Codable, CaseIterable {
        case file = "file"
        case folder = "folder"
    }
    
    /// 同步状态
    enum SyncState: String, Codable, CaseIterable {
        case synced = "synced"           // 已同步
        case uploading = "uploading"     // 上传中
        case downloading = "downloading" // 下载中
        case localOnly = "localOnly"     // 仅本地
        case cloudOnly = "cloudOnly"     // 仅云端
        case conflict = "conflict"       // 冲突
        case error = "error"             // 错误
        case paused = "paused"           // 暂停
    }
    
    /// 初始化方法
    init(
        id: UUID = UUID(),
        cloudId: String,
        localPath: String,
        cloudPath: String,
        name: String,
        type: ItemType,
        size: Int64,
        modifiedDate: Date,
        syncState: SyncState = .localOnly,
        hash: String,
        parentId: UUID? = nil,
        isSelected: Bool = true,
        isOfflineAvailable: Bool = false,
        lastSyncDate: Date? = nil,
        conflictInfo: ConflictInfo? = nil
    ) {
        self.id = id
        self.cloudId = cloudId
        self.localPath = localPath
        self.cloudPath = cloudPath
        self.name = name
        self.type = type
        self.size = size
        self.modifiedDate = modifiedDate
        self.syncState = syncState
        self.hash = hash
        self.parentId = parentId
        self.isSelected = isSelected
        self.isOfflineAvailable = isOfflineAvailable
        self.lastSyncDate = lastSyncDate
        self.conflictInfo = conflictInfo
    }
    
    /// 是否为文件夹
    var isFolder: Bool {
        return type == .folder
    }
    
    /// 是否为文件
    var isFile: Bool {
        return type == .file
    }
    
    /// 是否需要同步
    var needsSync: Bool {
        return syncState == .localOnly || syncState == .cloudOnly || syncState == .conflict
    }
    
    /// 是否正在同步
    var isSyncing: Bool {
        return syncState == .uploading || syncState == .downloading
    }
}

/// 冲突信息
struct ConflictInfo: Codable, Hashable {
    let itemId: UUID
    let itemName: String
    let conflictType: ConflictType
    let localModifiedDate: Date
    let cloudModifiedDate: Date
    let localSize: Int64
    let cloudSize: Int64
    let resolutionOptions: [ResolutionOption]
    
    /// 冲突类型
    enum ConflictType: String, Codable, CaseIterable {
        case contentConflict = "contentConflict"  // 内容冲突
        case nameConflict = "nameConflict"        // 名称冲突
        case typeConflict = "typeConflict"        // 类型冲突 (文件vs文件夹)
    }
    
    /// 解决选项
    enum ResolutionOption: String, Codable, CaseIterable {
        case keepLocal = "keepLocal"     // 保留本地版本
        case keepCloud = "keepCloud"     // 保留云端版本
        case keepBoth = "keepBoth"       // 保留两个版本
        case merge = "merge"             // 合并 (仅文件夹)
    }
    
    /// 获取可用的解决选项
    static func availableOptions(for conflictType: ConflictType) -> [ResolutionOption] {
        switch conflictType {
        case .contentConflict:
            return [.keepLocal, .keepCloud, .keepBoth]
        case .nameConflict:
            return [.keepLocal, .keepCloud, .keepBoth]
        case .typeConflict:
            return [.keepLocal, .keepCloud] // 类型冲突不能保留两个版本
        }
    }
}