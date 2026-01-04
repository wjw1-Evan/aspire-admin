import Foundation

/// 云端文件信息
struct CloudFile: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let path: String
    let size: Int64
    let modifiedDate: Date
    let hash: String
    let mimeType: String
    let parentId: String?
    
    init(
        id: String,
        name: String,
        path: String,
        size: Int64,
        modifiedDate: Date,
        hash: String,
        mimeType: String,
        parentId: String? = nil
    ) {
        self.id = id
        self.name = name
        self.path = path
        self.size = size
        self.modifiedDate = modifiedDate
        self.hash = hash
        self.mimeType = mimeType
        self.parentId = parentId
    }
    
    /// 获取文件扩展名
    var fileExtension: String {
        return URL(fileURLWithPath: name).pathExtension.lowercased()
    }
    
    /// 格式化的文件大小
    var formattedSize: String {
        return ByteCountFormatter.string(fromByteCount: size, countStyle: .file)
    }
    
    /// 是否为图片文件
    var isImage: Bool {
        let imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"]
        return imageExtensions.contains(fileExtension)
    }
    
    /// 是否为文档文件
    var isDocument: Bool {
        let documentExtensions = ["pdf", "doc", "docx", "txt", "rtf", "pages"]
        return documentExtensions.contains(fileExtension)
    }
    
    /// 转换为 SyncItem
    func toSyncItem(localPath: String, syncState: SyncItem.SyncState = .cloudOnly) -> SyncItem {
        return SyncItem(
            cloudId: id,
            localPath: localPath,
            cloudPath: path,
            name: name,
            type: .file,
            size: size,
            modifiedDate: modifiedDate,
            syncState: syncState,
            hash: hash,
            parentId: parentId.flatMap { UUID(uuidString: $0) }
        )
    }
}

/// 云端文件夹信息
struct CloudFolder: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let path: String
    let modifiedDate: Date
    let itemCount: Int
    let parentId: String?
    
    init(
        id: String,
        name: String,
        path: String,
        modifiedDate: Date,
        itemCount: Int,
        parentId: String? = nil
    ) {
        self.id = id
        self.name = name
        self.path = path
        self.modifiedDate = modifiedDate
        self.itemCount = itemCount
        self.parentId = parentId
    }
    
    /// 转换为 SyncItem
    func toSyncItem(localPath: String, syncState: SyncItem.SyncState = .cloudOnly) -> SyncItem {
        return SyncItem(
            cloudId: id,
            localPath: localPath,
            cloudPath: path,
            name: name,
            type: .folder,
            size: 0, // 文件夹大小通常为0
            modifiedDate: modifiedDate,
            syncState: syncState,
            hash: "", // 文件夹通常没有hash
            parentId: parentId.flatMap { UUID(uuidString: $0) }
        )
    }
}

/// 云端项目（文件或文件夹的统一表示）
enum CloudItem: Codable, Hashable {
    case file(CloudFile)
    case folder(CloudFolder)
    
    // 为了支持 Codable，需要手动实现编码/解码
    enum CodingKeys: String, CodingKey {
        case type, data
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        
        switch type {
        case "file":
            let file = try container.decode(CloudFile.self, forKey: .data)
            self = .file(file)
        case "folder":
            let folder = try container.decode(CloudFolder.self, forKey: .data)
            self = .folder(folder)
        default:
            throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown item type: \(type)")
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        switch self {
        case .file(let file):
            try container.encode("file", forKey: .type)
            try container.encode(file, forKey: .data)
        case .folder(let folder):
            try container.encode("folder", forKey: .type)
            try container.encode(folder, forKey: .data)
        }
    }
    
    /// 获取项目ID
    var id: String {
        switch self {
        case .file(let file):
            return file.id
        case .folder(let folder):
            return folder.id
        }
    }
    
    /// 获取项目名称
    var name: String {
        switch self {
        case .file(let file):
            return file.name
        case .folder(let folder):
            return folder.name
        }
    }
    
    /// 获取项目路径
    var path: String {
        switch self {
        case .file(let file):
            return file.path
        case .folder(let folder):
            return folder.path
        }
    }
    
    /// 获取修改日期
    var modifiedDate: Date {
        switch self {
        case .file(let file):
            return file.modifiedDate
        case .folder(let folder):
            return folder.modifiedDate
        }
    }
    
    /// 是否为文件夹
    var isFolder: Bool {
        switch self {
        case .folder:
            return true
        case .file:
            return false
        }
    }
    
    /// 转换为 SyncItem
    func toSyncItem(localPath: String, syncState: SyncItem.SyncState = .cloudOnly) -> SyncItem {
        switch self {
        case .file(let file):
            return file.toSyncItem(localPath: localPath, syncState: syncState)
        case .folder(let folder):
            return folder.toSyncItem(localPath: localPath, syncState: syncState)
        }
    }
}

/// 变化集合
struct ChangeSet: Codable, Hashable {
    let changes: [Change]
    let cursor: String
    let hasMore: Bool
    
    struct Change: Codable, Hashable {
        let path: String
        let changeType: ChangeType
        let item: CloudItem?
        let timestamp: Date
        
        enum ChangeType: String, Codable, CaseIterable {
            case created = "created"
            case modified = "modified"
            case deleted = "deleted"
            case moved = "moved"
            
            var displayName: String {
                switch self {
                case .created:
                    return "Created"
                case .modified:
                    return "Modified"
                case .deleted:
                    return "Deleted"
                case .moved:
                    return "Moved"
                }
            }
        }
        
        init(path: String, changeType: ChangeType, item: CloudItem? = nil, timestamp: Date = Date()) {
            self.path = path
            self.changeType = changeType
            self.item = item
            self.timestamp = timestamp
        }
        
        /// 获取文件名
        var fileName: String {
            return URL(fileURLWithPath: path).lastPathComponent
        }
        
        /// 变化描述
        var changeDescription: String {
            return "\(changeType.displayName): \(fileName)"
        }
    }
    
    init(changes: [Change], cursor: String, hasMore: Bool) {
        self.changes = changes
        self.cursor = cursor
        self.hasMore = hasMore
    }
    
    /// 获取创建的项目
    var createdItems: [Change] {
        return changes.filter { $0.changeType == .created }
    }
    
    /// 获取修改的项目
    var modifiedItems: [Change] {
        return changes.filter { $0.changeType == .modified }
    }
    
    /// 获取删除的项目
    var deletedItems: [Change] {
        return changes.filter { $0.changeType == .deleted }
    }
    
    /// 获取移动的项目
    var movedItems: [Change] {
        return changes.filter { $0.changeType == .moved }
    }
}

/// 认证凭据
struct AuthCredentials: Codable {
    let username: String
    let password: String?
    let token: String?
    let refreshToken: String?
    
    init(username: String, password: String? = nil, token: String? = nil, refreshToken: String? = nil) {
        self.username = username
        self.password = password
        self.token = token
        self.refreshToken = refreshToken
    }
}

/// 认证令牌
struct AuthToken: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date
    let tokenType: String
    
    init(accessToken: String, refreshToken: String, expiresAt: Date, tokenType: String = "Bearer") {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAt = expiresAt
        self.tokenType = tokenType
    }
    
    /// 是否已过期
    var isExpired: Bool {
        return Date() >= expiresAt
    }
    
    /// 是否即将过期（5分钟内）
    var isExpiringSoon: Bool {
        return Date().addingTimeInterval(300) >= expiresAt
    }
    
    /// 获取授权头
    var authorizationHeader: String {
        return "\(tokenType) \(accessToken)"
    }
}