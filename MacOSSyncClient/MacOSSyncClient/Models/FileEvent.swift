import Foundation

/// 文件系统事件
struct FileEvent: Codable, Hashable {
    let path: String
    let eventType: EventType
    let timestamp: Date
    
    enum EventType: Codable, Hashable {
        case created
        case modified
        case deleted
        case moved(from: String)
        case renamed(from: String)
        
        // 为了支持 Codable，需要手动实现编码/解码
        enum CodingKeys: String, CodingKey {
            case type, from
        }
        
        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            let type = try container.decode(String.self, forKey: .type)
            
            switch type {
            case "created":
                self = .created
            case "modified":
                self = .modified
            case "deleted":
                self = .deleted
            case "moved":
                let from = try container.decode(String.self, forKey: .from)
                self = .moved(from: from)
            case "renamed":
                let from = try container.decode(String.self, forKey: .from)
                self = .renamed(from: from)
            default:
                throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown event type: \(type)")
            }
        }
        
        func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            
            switch self {
            case .created:
                try container.encode("created", forKey: .type)
            case .modified:
                try container.encode("modified", forKey: .type)
            case .deleted:
                try container.encode("deleted", forKey: .type)
            case .moved(let from):
                try container.encode("moved", forKey: .type)
                try container.encode(from, forKey: .from)
            case .renamed(let from):
                try container.encode("renamed", forKey: .type)
                try container.encode(from, forKey: .from)
            }
        }
        
        var displayName: String {
            switch self {
            case .created:
                return "Created"
            case .modified:
                return "Modified"
            case .deleted:
                return "Deleted"
            case .moved(let from):
                return "Moved from \(from)"
            case .renamed(let from):
                return "Renamed from \(from)"
            }
        }
        
        var isStructuralChange: Bool {
            switch self {
            case .created, .deleted, .moved, .renamed:
                return true
            case .modified:
                return false
            }
        }
    }
    
    init(path: String, eventType: EventType, timestamp: Date = Date()) {
        self.path = path
        self.eventType = eventType
        self.timestamp = timestamp
    }
    
    /// 获取事件影响的文件名
    var fileName: String {
        return URL(fileURLWithPath: path).lastPathComponent
    }
    
    /// 获取事件影响的目录路径
    var directoryPath: String {
        return URL(fileURLWithPath: path).deletingLastPathComponent().path
    }
    
    /// 是否为文件夹事件（基于路径判断）
    var isDirectoryEvent: Bool {
        var isDirectory: ObjCBool = false
        let exists = FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory)
        return exists && isDirectory.boolValue
    }
}