import Foundation
import OSLog

/// 基础 P2P 传输服务（占位实现），提供事件流与模拟进度
final class P2PTransferService: P2PTransferServiceProtocol {
    private let logger = Logger(subsystem: "com.macossync.p2p", category: "P2PTransfer")
    private let fileSystemService: FileSystemServiceProtocol

    private var sessions: [UUID: P2PTransferSession] = [:]
    private let sessionQueue = DispatchQueue(label: "com.macossync.p2p.sessions", qos: .utility)

    private let eventsStream: AsyncStream<P2PTransferEvent>
    private let eventsContinuation: AsyncStream<P2PTransferEvent>.Continuation

    private var isRunning = false

    init(fileSystemService: FileSystemServiceProtocol) {
        self.fileSystemService = fileSystemService
        let (stream, continuation) = AsyncStream<P2PTransferEvent>.makeStream()
        self.eventsStream = stream
        self.eventsContinuation = continuation
    }

    deinit {
        eventsContinuation.finish()
    }

    var events: AsyncStream<P2PTransferEvent> { eventsStream }

    func start(advertisedName: String? = nil) async {
        sessionQueue.sync {
            isRunning = true
        }
        logger.info("P2P transfer service started. name=\(advertisedName ?? "default")")
    }

    func stop() async {
        sessionQueue.sync {
            isRunning = false
            sessions.removeAll()
        }
        logger.info("P2P transfer service stopped")
    }

    func sendFile(to peerId: String, localPath: String) async throws -> P2PTransferSession {
        let isRunningSnapshot = sessionQueue.sync { isRunning }
        guard isRunningSnapshot else { throw P2PTransferError.serviceNotStarted }
        guard fileSystemService.fileExists(at: localPath) else { throw P2PTransferError.fileNotFound(localPath) }

        let attributes = try fileSystemService.getFileAttributes(at: localPath)
        let fileName = URL(fileURLWithPath: localPath).lastPathComponent
        let session = P2PTransferSession(
            peerId: peerId,
            localPath: localPath,
            fileName: fileName,
            role: .sender,
            totalBytes: attributes.size,
            status: .preparing
        )

        sessionQueue.sync {
            sessions[session.id] = session
        }
        eventsContinuation.yield(.sessionUpdated(session))
        logger.info("P2P transfer queued: session=\(session.id, privacy: .public) size=\(attributes.size, privacy: .public)")

        // 模拟进度（实际实现应替换为真实 P2P 逻辑）
        Task.detached { [weak self] in
            await self?.simulateTransfer(sessionId: session.id)
        }

        return session
    }

    func cancel(sessionId: UUID) async {
        sessionQueue.sync {
            guard var session = sessions[sessionId] else { return }
            session.status = .cancelled
            session.updatedAt = Date()
            sessions[sessionId] = session
            eventsContinuation.yield(.sessionUpdated(session))
        }
        logger.info("P2P transfer cancelled: session=\(sessionId, privacy: .public)")
    }

    func currentSessions() -> [P2PTransferSession] {
        return sessionQueue.sync { Array(sessions.values) }
    }

    // MARK: - Private helpers

    private func simulateTransfer(sessionId: UUID) async {
        while true {
            var sessionUpdate: P2PTransferSession?
            sessionQueue.sync {
                guard var session = sessions[sessionId], session.status != .cancelled else { return }
                if session.status == .preparing {
                    session.status = .transferring
                }
                let chunk: Int64 = max(1, session.totalBytes / 20)
                session.transferredBytes = min(session.totalBytes, session.transferredBytes + chunk)
                session.updatedAt = Date()
                if session.transferredBytes >= session.totalBytes {
                    session.status = .completed
                }
                sessions[sessionId] = session
                sessionUpdate = session
            }
            guard let update = sessionUpdate else { return }

            if update.status == .completed {
                eventsContinuation.yield(.sessionCompleted(update))
                logger.info("P2P transfer completed: session=\(update.id, privacy: .public)")
                return
            } else {
                eventsContinuation.yield(.sessionUpdated(update))
            }
            try? await Task.sleep(nanoseconds: 150_000_000) // 0.15s
        }
    }
}
