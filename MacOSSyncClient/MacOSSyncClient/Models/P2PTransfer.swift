import Foundation

/// P2P 传输角色
public enum P2PTransferRole: String, Codable, Hashable {
    case sender
    case receiver
}

/// P2P 传输状态
public enum P2PTransferStatus: String, Codable, Hashable {
    case preparing
    case transferring
    case completed
    case failed
    case cancelled
}

/// P2P 传输会话
public struct P2PTransferSession: Codable, Hashable, Identifiable {
    public let id: UUID
    public let peerId: String
    public let localPath: String
    public let fileName: String
    public let role: P2PTransferRole
    public let totalBytes: Int64
    public var transferredBytes: Int64
    public var status: P2PTransferStatus
    public var startedAt: Date
    public var updatedAt: Date
    public var errorMessage: String?

    public init(
        id: UUID = UUID(),
        peerId: String,
        localPath: String,
        fileName: String,
        role: P2PTransferRole,
        totalBytes: Int64,
        transferredBytes: Int64 = 0,
        status: P2PTransferStatus = .preparing,
        startedAt: Date = Date(),
        updatedAt: Date = Date(),
        errorMessage: String? = nil
    ) {
        self.id = id
        self.peerId = peerId
        self.localPath = localPath
        self.fileName = fileName
        self.role = role
        self.totalBytes = totalBytes
        self.transferredBytes = transferredBytes
        self.status = status
        self.startedAt = startedAt
        self.updatedAt = updatedAt
        self.errorMessage = errorMessage
    }

    public var progress: Double {
        guard totalBytes > 0 else { return 0 }
        return min(1.0, Double(transferredBytes) / Double(totalBytes))
    }
}

/// P2P 传输事件
public enum P2PTransferEvent: Hashable {
    case sessionUpdated(P2PTransferSession)
    case sessionCompleted(P2PTransferSession)
    case sessionFailed(P2PTransferSession, String)
}
