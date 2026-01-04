import Foundation

/// P2P 文件传输服务协议
protocol P2PTransferServiceProtocol: AnyObject {
    /// 事件流：会话进度、完成或失败
    var events: AsyncStream<P2PTransferEvent> { get }

    /// 启动服务并开始广播（若支持）
    func start(advertisedName: String?) async

    /// 停止服务并清理资源
    func stop() async

    /// 发送文件给指定 peer
    func sendFile(to peerId: String, localPath: String) async throws -> P2PTransferSession

    /// 取消传输
    func cancel(sessionId: UUID) async

    /// 当前会话快照
    func currentSessions() -> [P2PTransferSession]
}

enum P2PTransferError: LocalizedError {
    case serviceNotStarted
    case fileNotFound(String)
    case unsupportedFile
    case alreadyTransferring(UUID)
    case internalError(String)

    var errorDescription: String? {
        switch self {
        case .serviceNotStarted:
            return "P2P service is not started"
        case .fileNotFound(let path):
            return "File not found: \(path)"
        case .unsupportedFile:
            return "Unsupported file for P2P transfer"
        case .alreadyTransferring(let id):
            return "Session already transferring: \(id)"
        case .internalError(let message):
            return message
        }
    }
}
