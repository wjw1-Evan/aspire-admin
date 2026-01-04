import Foundation
import SwiftUI
import Combine

/// 状态管理器实现，负责管理文件和文件夹的同步状态显示
@MainActor
class StatusManager: StatusManagerProtocol, ObservableObject {
    // MARK: - Properties

    @Published private var statusInfos: [String: StatusInfo] = [:]
    @Published private var statistics: StatusStatistics = StatusStatistics()

    private let statusChangeContinuation: AsyncStream<StatusChange>.Continuation
    private let statisticsChangeContinuation: AsyncStream<StatusStatistics>.Continuation

    // MARK: - Async Streams

    let statusChanges: AsyncStream<StatusChange>
    let statisticsChanges: AsyncStream<StatusStatistics>

    // MARK: - Initialization

    init() {
        let (statusStream, statusContinuation) = AsyncStream.makeStream(of: StatusChange.self)
        let (statisticsStream, statisticsContinuation) = AsyncStream.makeStream(of: StatusStatistics.self)

        self.statusChanges = statusStream
        self.statusChangeContinuation = statusContinuation
        self.statisticsChanges = statisticsStream
        self.statisticsChangeContinuation = statisticsContinuation
    }

    deinit {
        statusChangeContinuation.finish()
        statisticsChangeContinuation.finish()
    }

    // MARK: - StatusManagerProtocol Implementation

    func getStatusInfo(for path: String) -> StatusInfo? {
        return statusInfos[path]
    }

    func getStatusInfo(for item: SyncItem) -> StatusInfo {
        // 仅返回现有状态，避免在视图渲染过程中产生状态突变从而触发递归布局
        if let existingInfo = statusInfos[item.localPath] {
            return existingInfo
        }

        // 如果尚未记录该项，返回一个不会修改内部状态的临时状态
        return StatusInfo(
            path: item.localPath,
            state: item.syncState,
            lastUpdated: Date()
        )
    }

    func getStatusStatistics() -> StatusStatistics {
        return statistics
    }

    func updateStatus(for path: String, state: SyncItem.SyncState, progress: Double? = nil) {
        let oldState = statusInfos[path]?.state

        let statusInfo = StatusInfo(
            path: path,
            state: state,
            progress: progress,
            lastUpdated: Date()
        )

        statusInfos[path] = statusInfo
        updateStatistics()

        // 发送状态变化事件
        let change = StatusChange(
            path: path,
            oldState: oldState,
            newState: state,
            progress: progress
        )
        statusChangeContinuation.yield(change)
    }

    func updateStatus(for items: [SyncItem]) {
        var changes: [StatusChange] = []

        for item in items {
            let oldState = statusInfos[item.localPath]?.state

            let statusInfo = StatusInfo(
                path: item.localPath,
                state: item.syncState,
                lastUpdated: Date()
            )

            statusInfos[item.localPath] = statusInfo

            let change = StatusChange(
                path: item.localPath,
                oldState: oldState,
                newState: item.syncState
            )
            changes.append(change)
        }

        updateStatistics()

        // 发送所有状态变化事件
        for change in changes {
            statusChangeContinuation.yield(change)
        }
    }

    func clearStatus(for path: String) {
        statusInfos.removeValue(forKey: path)
        updateStatistics()
    }

    func clearAllStatus() {
        statusInfos.removeAll()
        updateStatistics()
    }

    // MARK: - Private Methods

    private func updateStatistics() {
        let allInfos = Array(statusInfos.values)

        let newStatistics = StatusStatistics(
            totalItems: allInfos.count,
            syncedItems: allInfos.filter { $0.state == .synced }.count,
            uploadingItems: allInfos.filter { $0.state == .uploading }.count,
            downloadingItems: allInfos.filter { $0.state == .downloading }.count,
            localOnlyItems: allInfos.filter { $0.state == .localOnly }.count,
            cloudOnlyItems: allInfos.filter { $0.state == .cloudOnly }.count,
            conflictItems: allInfos.filter { $0.state == .conflict }.count,
            errorItems: allInfos.filter { $0.state == .error }.count,
            pausedItems: allInfos.filter { $0.state == .paused }.count,
            lastUpdated: Date()
        )

        statistics = newStatistics
        statisticsChangeContinuation.yield(newStatistics)
    }
}
