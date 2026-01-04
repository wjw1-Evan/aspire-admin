import Foundation
import Network
import SystemConfiguration

/// 带宽管理器实现
/// 负责控制同步时的网络带宽使用，实现智能带宽限制和网络状况自适应调整
class BandwidthManager: ObservableObject, BandwidthManagerProtocol {

    // MARK: - Properties

    @Published private var uploadLimit: Int64?
    @Published private var downloadLimit: Int64?
    @Published private var autoThrottlingEnabled: Bool = true
    @Published private var transfersPaused: Bool = false
    @Published private var powerSavingMode: Bool = false
    @Published private var syncTimeWindows: [SyncTimeWindow] = []

    private let networkMonitor: NWPathMonitor
    private let monitorQueue = DispatchQueue(label: "bandwidth.monitor", qos: .utility)
    private let monitoringEnabled: Bool

    private var currentNetworkType: NetworkType = .unknown
    private var currentNetworkQuality: NetworkQuality = .unavailable
    private var isMetered: Bool = false

    // 传输管理
    private var activeTransfers: [UUID: TransferAllocation] = [:]
    private var transferQueue: [UUID] = []

    // 带宽监控
    private var bandwidthSamples: [BandwidthSample] = []
    private let maxSamples = 60  // 保留最近60个样本
    private var lastBandwidthUpdate = Date()

    // 事件流
    private let networkStatusContinuation: AsyncStream<NetworkStatusChange>.Continuation
    private let bandwidthUsageContinuation: AsyncStream<BandwidthUsage>.Continuation
    private let transferStatusContinuation: AsyncStream<TransferStatusChange>.Continuation

    let networkStatusChanges: AsyncStream<NetworkStatusChange>
    let bandwidthUsageUpdates: AsyncStream<BandwidthUsage>
    let transferStatusChanges: AsyncStream<TransferStatusChange>

    // MARK: - Initialization

    init(
        enableMonitoring: Bool = ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"]
            == nil
    ) {
        self.monitoringEnabled = enableMonitoring
        // 初始化事件流
        (networkStatusChanges, networkStatusContinuation) = AsyncStream.makeStream()
        (bandwidthUsageUpdates, bandwidthUsageContinuation) = AsyncStream.makeStream()
        (transferStatusChanges, transferStatusContinuation) = AsyncStream.makeStream()

        // 初始化网络监控
        networkMonitor = NWPathMonitor()

        if monitoringEnabled {
            setupNetworkMonitoring()
            startBandwidthMonitoring()
        }
    }

    deinit {
        if monitoringEnabled {
            networkMonitor.cancel()
        }
        networkStatusContinuation.finish()
        bandwidthUsageContinuation.finish()
        transferStatusContinuation.finish()
    }

    // MARK: - 带宽控制

    func setUploadLimit(_ limit: Int64?) async {
        let oldLimit = uploadLimit
        uploadLimit = limit

        if oldLimit != limit {
            await rebalanceBandwidth()
            await updateBandwidthUsage()
        }
    }

    func setDownloadLimit(_ limit: Int64?) async {
        let oldLimit = downloadLimit
        downloadLimit = limit

        if oldLimit != limit {
            await rebalanceBandwidth()
            await updateBandwidthUsage()
        }
    }

    func getUploadLimit() -> Int64? {
        return uploadLimit
    }

    func getDownloadLimit() -> Int64? {
        return downloadLimit
    }

    func setAutoThrottlingEnabled(_ enabled: Bool) async {
        autoThrottlingEnabled = enabled

        if enabled {
            await rebalanceBandwidth()
        }
    }

    func isAutoThrottlingEnabled() -> Bool {
        return autoThrottlingEnabled
    }

    // MARK: - 网络状况监控

    func getCurrentNetworkType() -> NetworkType {
        return currentNetworkType
    }

    func isMeteredConnection() -> Bool {
        return isMetered
    }

    func getNetworkQuality() -> NetworkQuality {
        return currentNetworkQuality
    }

    func getBandwidthUsage() -> BandwidthUsage {
        let currentUploadSpeed = calculateCurrentSpeed(for: .upload)
        let currentDownloadSpeed = calculateCurrentSpeed(for: .download)

        return BandwidthUsage(
            uploadSpeed: currentUploadSpeed,
            downloadSpeed: currentDownloadSpeed,
            uploadLimit: getEffectiveUploadLimit(),
            downloadLimit: getEffectiveDownloadLimit(),
            activeTransfers: activeTransfers.count,
            networkType: currentNetworkType,
            networkQuality: currentNetworkQuality
        )
    }

    func getCurrentUsage() async -> BandwidthUsage {
        await updateBandwidthUsage()
        return getBandwidthUsage()
    }

    // MARK: - 传输控制

    func pauseAllTransfers() async {
        transfersPaused = true

        // 暂停所有活跃传输
        for (transferId, allocation) in activeTransfers {
            let statusChange = TransferStatusChange(
                transferId: transferId,
                transferType: allocation.type,
                previousStatus: .active,
                currentStatus: .paused,
                allocatedBandwidth: allocation.allocatedBandwidth
            )
            transferStatusContinuation.yield(statusChange)
        }

        await updateBandwidthUsage()
    }

    func resumeAllTransfers() async {
        transfersPaused = false

        // 恢复所有暂停的传输
        for (transferId, allocation) in activeTransfers {
            let statusChange = TransferStatusChange(
                transferId: transferId,
                transferType: allocation.type,
                previousStatus: .paused,
                currentStatus: .active,
                allocatedBandwidth: allocation.allocatedBandwidth
            )
            transferStatusContinuation.yield(statusChange)
        }

        await rebalanceBandwidth()
        await updateBandwidthUsage()
    }

    func areTransfersPaused() -> Bool {
        return transfersPaused
    }

    func allocateBandwidth(for transferId: UUID, type: TransferType, priority: TransferPriority)
        async -> Int64
    {
        // 检查是否暂停传输
        guard !transfersPaused else { return 0 }

        // 检查是否在同步时间窗口内
        guard isCurrentTimeInSyncWindow() else { return 0 }

        // 检查是否为计费连接且设置了暂停
        if isMetered && !shouldSyncOnMeteredConnection() {
            return 0
        }

        // 创建传输分配
        let allocation = TransferAllocation(
            transferId: transferId,
            type: type,
            priority: priority,
            requestedAt: Date()
        )

        activeTransfers[transferId] = allocation

        // 重新平衡带宽
        await rebalanceBandwidth()

        let allocatedBandwidth = activeTransfers[transferId]?.allocatedBandwidth ?? 0

        // 发送传输状态变化事件
        let statusChange = TransferStatusChange(
            transferId: transferId,
            transferType: type,
            previousStatus: .pending,
            currentStatus: .active,
            allocatedBandwidth: allocatedBandwidth
        )
        transferStatusContinuation.yield(statusChange)

        await updateBandwidthUsage()

        return allocatedBandwidth
    }

    func releaseBandwidth(for transferId: UUID) async {
        guard let allocation = activeTransfers.removeValue(forKey: transferId) else { return }

        // 发送传输状态变化事件
        let statusChange = TransferStatusChange(
            transferId: transferId,
            transferType: allocation.type,
            previousStatus: .active,
            currentStatus: .completed,
            allocatedBandwidth: allocation.allocatedBandwidth
        )
        transferStatusContinuation.yield(statusChange)

        // 重新平衡剩余传输的带宽
        await rebalanceBandwidth()
        await updateBandwidthUsage()
    }

    // MARK: - 省电模式和时间窗口

    func setPowerSavingMode(_ enabled: Bool) async {
        powerSavingMode = enabled

        if enabled {
            // 省电模式下降低带宽限制
            await adjustBandwidthForPowerSaving()
        } else {
            // 恢复正常带宽限制
            await rebalanceBandwidth()
        }

        await updateBandwidthUsage()
    }

    func isPowerSavingModeEnabled() -> Bool {
        return powerSavingMode
    }

    func setSyncTimeWindows(_ windows: [SyncTimeWindow]) async {
        syncTimeWindows = windows

        // 检查当前是否在允许的时间窗口内
        if !isCurrentTimeInSyncWindow() {
            await pauseAllTransfers()
        } else if transfersPaused {
            await resumeAllTransfers()
        }
    }

    func getSyncTimeWindows() -> [SyncTimeWindow] {
        return syncTimeWindows
    }

    func isCurrentTimeInSyncWindow() -> Bool {
        // 如果没有设置时间窗口，默认允许同步
        guard !syncTimeWindows.isEmpty else { return true }

        let now = Date()
        return syncTimeWindows.contains { window in
            window.contains(now)
        }
    }

    // MARK: - Private Methods

    private func setupNetworkMonitoring() {
        guard monitoringEnabled else { return }

        networkMonitor.pathUpdateHandler = { [weak self] path in
            Task {
                await self?.handleNetworkPathUpdate(path)
            }
        }

        networkMonitor.start(queue: monitorQueue)
    }

    private func handleNetworkPathUpdate(_ path: NWPath) async {
        let previousType = self.currentNetworkType
        let previousQuality = self.currentNetworkQuality

        // 更新网络类型
        self.currentNetworkType = self.determineNetworkType(from: path)
        self.isMetered = path.isExpensive

        // 评估网络质量
        self.currentNetworkQuality = await self.evaluateNetworkQuality(path: path)

        // 发送网络状况变化事件
        let statusChange = NetworkStatusChange(
            previousType: previousType,
            currentType: self.currentNetworkType,
            previousQuality: previousQuality,
            currentQuality: self.currentNetworkQuality,
            isMeteredConnection: self.isMetered
        )
        self.networkStatusContinuation.yield(statusChange)

        // 根据网络状况调整带宽
        if self.autoThrottlingEnabled {
            await self.adjustBandwidthForNetworkConditions()
        }

        // 检查是否需要暂停计费连接上的传输
        if self.isMetered && !self.shouldSyncOnMeteredConnection() {
            await self.pauseAllTransfers()
        } else if !self.isMetered && self.transfersPaused {
            await self.resumeAllTransfers()
        }

        await self.updateBandwidthUsage()
    }

    private func determineNetworkType(from path: NWPath) -> NetworkType {
        if path.usesInterfaceType(.wifi) {
            return .wifi
        } else if path.usesInterfaceType(.wiredEthernet) {
            return .ethernet
        } else if path.usesInterfaceType(.cellular) {
            return .cellular
        } else if path.usesInterfaceType(.other) {
            return .other
        } else {
            return .unknown
        }
    }

    private func evaluateNetworkQuality(path: NWPath) async -> NetworkQuality {
        guard path.status == .satisfied else {
            return .unavailable
        }

        // 基于网络类型的基础质量评估
        var baseQuality: NetworkQuality
        switch currentNetworkType {
        case .ethernet:
            baseQuality = .excellent
        case .wifi:
            baseQuality = .good
        case .cellular:
            baseQuality = .fair
        case .other:
            baseQuality = .fair
        case .unknown:
            baseQuality = .poor
        }

        // 如果是计费连接，降低质量评估
        if path.isExpensive {
            switch baseQuality {
            case .excellent:
                baseQuality = .good
            case .good:
                baseQuality = .fair
            case .fair:
                baseQuality = .poor
            case .poor, .unavailable:
                break
            }
        }

        return baseQuality
    }

    private func adjustBandwidthForNetworkConditions() async {
        let throttlingFactor = currentNetworkQuality.throttlingFactor

        // 仅触发带宽重分配，实际限额在 getEffective* 中按网络质量计算
        _ = throttlingFactor
        await rebalanceBandwidth()
    }

    private func adjustBandwidthForPowerSaving() async {
        guard powerSavingMode else { return }

        // 省电模式仅影响有效带宽计算，不直接修改用户配置的限额
        await rebalanceBandwidth()
    }

    private func rebalanceBandwidth() async {
        let uploadTransfers = activeTransfers.values.filter { $0.type == .upload }
        let downloadTransfers = activeTransfers.values.filter { $0.type == .download }

        // 分配上传带宽
        if let uploadLimit = getEffectiveUploadLimit() {
            await allocateBandwidthToTransfers(Array(uploadTransfers), totalBandwidth: uploadLimit)
        }

        // 分配下载带宽
        if let downloadLimit = getEffectiveDownloadLimit() {
            await allocateBandwidthToTransfers(
                Array(downloadTransfers), totalBandwidth: downloadLimit)
        }
    }

    private func allocateBandwidthToTransfers(
        _ transfers: [TransferAllocation], totalBandwidth: Int64
    ) async {
        guard !transfers.isEmpty, totalBandwidth > 0 else { return }

        // 按优先级排序
        let sortedTransfers = transfers.sorted { $0.priority.weight > $1.priority.weight }

        // 计算总权重
        let totalWeight = sortedTransfers.reduce(0) { $0 + $1.priority.weight }

        // 按权重分配带宽
        for transfer in sortedTransfers {
            let allocation = Int64(
                Double(totalBandwidth) * (transfer.priority.weight / totalWeight))
            activeTransfers[transfer.transferId]?.allocatedBandwidth = max(1024, allocation)  // 最小1KB/s
        }
    }

    private func getEffectiveUploadLimit() -> Int64? {
        var limit = uploadLimit

        // 应用省电模式调整
        if powerSavingMode, let currentLimit = limit {
            limit = Int64(Double(currentLimit) * 0.5)
        }

        // 应用网络质量调整
        if autoThrottlingEnabled, let currentLimit = limit {
            limit = Int64(Double(currentLimit) * currentNetworkQuality.throttlingFactor)
        }

        return limit
    }

    private func getEffectiveDownloadLimit() -> Int64? {
        var limit = downloadLimit

        // 应用省电模式调整
        if powerSavingMode, let currentLimit = limit {
            limit = Int64(Double(currentLimit) * 0.5)
        }

        // 应用网络质量调整
        if autoThrottlingEnabled, let currentLimit = limit {
            limit = Int64(Double(currentLimit) * currentNetworkQuality.throttlingFactor)
        }

        return limit
    }

    private func shouldSyncOnMeteredConnection() -> Bool {
        // 这里可以根据用户设置决定是否在计费连接上同步
        // 目前默认不在计费连接上同步
        return false
    }

    private func startBandwidthMonitoring() {
        guard monitoringEnabled else { return }
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task {
                await self?.updateBandwidthUsage()
            }
        }
    }

    private func updateBandwidthUsage() async {
        let usage = getBandwidthUsage()
        bandwidthUsageContinuation.yield(usage)

        // 记录带宽样本
        let sample = BandwidthSample(
            timestamp: Date(),
            uploadSpeed: usage.uploadSpeed,
            downloadSpeed: usage.downloadSpeed
        )

        bandwidthSamples.append(sample)

        // 保持样本数量在限制内
        if bandwidthSamples.count > maxSamples {
            bandwidthSamples.removeFirst(bandwidthSamples.count - maxSamples)
        }

        lastBandwidthUpdate = Date()
    }

    private func calculateCurrentSpeed(for type: TransferType) -> Int64 {
        let relevantTransfers = activeTransfers.values.filter {
            $0.type == type && !transfersPaused
        }
        return relevantTransfers.reduce(0) { $0 + ($1.allocatedBandwidth ?? 0) }
    }
}

// MARK: - Supporting Types

private struct TransferAllocation {
    let transferId: UUID
    let type: TransferType
    let priority: TransferPriority
    let requestedAt: Date
    var allocatedBandwidth: Int64?

    init(transferId: UUID, type: TransferType, priority: TransferPriority, requestedAt: Date) {
        self.transferId = transferId
        self.type = type
        self.priority = priority
        self.requestedAt = requestedAt
        self.allocatedBandwidth = nil
    }
}

private struct BandwidthSample {
    let timestamp: Date
    let uploadSpeed: Int64
    let downloadSpeed: Int64
}
