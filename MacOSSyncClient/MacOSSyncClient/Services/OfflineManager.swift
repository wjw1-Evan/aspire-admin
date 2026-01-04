import Foundation
import OSLog

class OfflineManager: OfflineManagerProtocol {

    private let logger = Logger(subsystem: "com.syncapp.macos", category: "OfflineManager")
    private let localDBService: LocalDBService
    private let fileSystemService: FileSystemService
    private let cacheDirectory: URL
    private let maxCacheSize: Int64

    private var cacheItems: [String: OfflineCacheItem] = [:]
    private let cacheQueue = DispatchQueue(label: "com.syncapp.offline.cache", qos: .utility)

    private let cacheUpdatesContinuation: AsyncStream<CacheUpdate>.Continuation
    private let _cacheUpdates: AsyncStream<CacheUpdate>

    // Offline sync properties
    private var offlineModifications: [OfflineModification] = []
    private var isNetworkAvailable: Bool = true
    private let modificationQueue = DispatchQueue(label: "com.syncapp.offline.modifications", qos: .utility)

    init(
        localDBService: LocalDBService,
        fileSystemService: FileSystemService,
        cacheDirectory: URL? = nil,
        maxCacheSize: Int64 = 10 * 1024 * 1024 * 1024
    ) {
        self.localDBService = localDBService
        self.fileSystemService = fileSystemService
        self.maxCacheSize = maxCacheSize

        if let cacheDirectory = cacheDirectory {
            self.cacheDirectory = cacheDirectory
        } else {
            let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
            self.cacheDirectory = appSupport.appendingPathComponent("SyncApp/OfflineCache")
        }

        let (stream, continuation) = AsyncStream<CacheUpdate>.makeStream()
        self._cacheUpdates = stream
        self.cacheUpdatesContinuation = continuation

        Task {
            await initialize()
        }
    }

    deinit {
        cacheUpdatesContinuation.finish()
    }

    var cacheUpdates: AsyncStream<CacheUpdate> {
        return _cacheUpdates
    }

    func makeAvailableOffline(_ path: String) async throws {
        logger.info("Making file available offline: \(path)")

        if isAvailableOffline(path) {
            logger.info("File already available offline: \(path)")
            return
        }

        let cacheItem = OfflineCacheItem(
            syncItemId: UUID(),
            localPath: path,
            cachePath: "\(cacheDirectory.path)/\(path.hash)",
            size: 1024,
            priority: .pinned
        )

        cacheItems[path] = cacheItem

        let update = CacheUpdate(path: path, updateType: .cached, size: cacheItem.size)
        cacheUpdatesContinuation.yield(update)

        logger.info("File cached successfully: \(path)")
    }

    func removeFromOffline(_ path: String) async throws {
        logger.info("Removing file from offline cache: \(path)")

        guard let cacheItem = cacheItems[path] else {
            throw OfflineManagerError.fileNotCached(path)
        }

        cacheItems.removeValue(forKey: path)

        let update = CacheUpdate(path: path, updateType: .removed, size: cacheItem.size)
        cacheUpdatesContinuation.yield(update)

        logger.info("File removed from cache: \(path)")
    }

    func isAvailableOffline(_ path: String) -> Bool {
        return cacheItems[path] != nil
    }

    func getOfflineItems() -> [OfflineCacheItem] {
        return Array(cacheItems.values).sorted { $0.priority.sortOrder < $1.priority.sortOrder }
    }

    func getCacheUsage() -> CacheUsage {
        let items = Array(cacheItems.values)
        let totalSize = items.reduce(0) { $0 + $1.size }
        let itemCount = items.count

        return CacheUsage(
            totalSize: maxCacheSize,
            usedSize: totalSize,
            itemCount: itemCount,
            lastCleanup: nil
        )
    }

    func cleanupCache(threshold: Double) async throws {
        logger.info("Starting cache cleanup with threshold: \(threshold)")

        let currentUsage = getCacheUsage()
        let targetUsage = Double(maxCacheSize) * threshold

        if Double(currentUsage.usedSize) <= targetUsage {
            logger.info("Cache usage below threshold, no cleanup needed")
            return
        }

        let itemsToRemove = getOfflineItems().filter { $0.canBeEvicted }.prefix(1)
        for item in itemsToRemove {
            try await removeFromOffline(item.localPath)
        }

        logger.info("Cache cleanup completed")
    }

    func accessOfflineFile(_ path: String) async throws -> String {
        guard let cacheItem = cacheItems[path] else {
            throw OfflineManagerError.fileNotCached(path)
        }

        var updatedItem = cacheItem
        updatedItem.updateLastAccessed()
        cacheItems[path] = updatedItem

        return cacheItem.cachePath
    }

    // MARK: - Offline Sync Logic

    /// 记录离线修改
    func recordOfflineModification(_ modification: OfflineModification) {
        modificationQueue.sync {
            offlineModifications.append(modification)
            offlineModifications.sort { $0.timestamp < $1.timestamp }
        }

        logger.info("Recorded offline modification: \(modification.path) - \(modification.modificationType)")

        // 如果网络可用，立即尝试同步
        if isNetworkAvailable {
            Task { await processPendingModifications() }
        }
    }

    /// 设置网络状态
    func setNetworkAvailable(_ available: Bool) {
        let wasOffline = !isNetworkAvailable
        isNetworkAvailable = available

        logger.info("Network status changed: \(available ? "available" : "unavailable")")

        // 网络恢复时处理待同步的修改
        if available && wasOffline {
            Task {
                await handleNetworkRecovery()
            }
        }
    }

    /// 获取待同步的修改数量
    func getPendingModificationsCount() -> Int {
        return modificationQueue.sync { offlineModifications.count }
    }

    /// 获取所有待同步的修改
    func getPendingModifications() -> [OfflineModification] {
        return modificationQueue.sync {
            offlineModifications.sorted { $0.timestamp < $1.timestamp }
        }
    }

    /// 处理网络恢复
    private func handleNetworkRecovery() async {
        logger.info("Handling network recovery, processing pending modifications")

        // 验证缓存完整性
        await validateCacheIntegrity()

        // 处理待同步的修改
        await processPendingModifications()

        // 同步缓存状态
        await syncCacheState()
    }

    /// 处理待同步的修改
    private func processPendingModifications() async {
        guard isNetworkAvailable else {
            logger.info("Network unavailable, defer processing pending modifications")
            return
        }

        let modifications = modificationQueue.sync {
            offlineModifications.sorted { $0.timestamp < $1.timestamp }
        }

        guard !modifications.isEmpty else {
            logger.info("No pending modifications to process")
            return
        }

        logger.info("Processing \(modifications.count) pending modifications")

        for modification in modifications {
            do {
                try await syncModification(modification)

                // 成功同步后从队列中移除
                removePendingModification(modification)

                logger.info("Successfully synced modification: \(modification.path)")

            } catch {
                logger.error("Failed to sync modification \(modification.path): \(error.localizedDescription)")

                // 根据错误类型决定是否重试
                if !shouldRetryModification(modification, error: error) {
                    // 移除无法恢复的修改
                    removePendingModification(modification)
                }
            }
        }
    }

    /// 同步单个修改
    private func syncModification(_ modification: OfflineModification) async throws {
        switch modification.modificationType {
        case .created:
            try await syncCreatedFile(modification)
        case .modified:
            try await syncModifiedFile(modification)
        case .deleted:
            try await syncDeletedFile(modification)
        case .renamed(let oldName):
            try await syncRenamedFile(modification, oldName: oldName)
        case .moved(let oldPath):
            try await syncMovedFile(modification, oldPath: oldPath)
        }
    }

    /// 同步创建的文件
    private func syncCreatedFile(_ modification: OfflineModification) async throws {
        logger.info("Syncing created file: \(modification.path)")

        // 检查文件是否仍然存在
        guard fileSystemService.fileExists(at: modification.path) else {
            throw OfflineManagerError.fileNotFound(modification.path)
        }

        // 读取文件内容
        let _ = try fileSystemService.readFile(at: modification.path)

        // 上传到云端（这里是模拟实现）
        // 在实际实现中，这里会调用 CloudAPIService
        logger.info("Uploading created file to cloud: \(modification.path)")

        // 模拟网络延迟
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1秒

        // 更新本地数据库记录
        try await updateLocalSyncRecord(modification.path, syncState: .synced)
    }

    /// 同步修改的文件
    private func syncModifiedFile(_ modification: OfflineModification) async throws {
        logger.info("Syncing modified file: \(modification.path)")

        guard fileSystemService.fileExists(at: modification.path) else {
            throw OfflineManagerError.fileNotFound(modification.path)
        }

        let _ = try fileSystemService.readFile(at: modification.path)

        // 检查是否有冲突
        let hasConflict = try await checkForConflicts(modification.path)
        if hasConflict {
            throw OfflineManagerError.syncConflict(modification.path)
        }

        // 上传修改到云端
        logger.info("Uploading modified file to cloud: \(modification.path)")

        try await Task.sleep(nanoseconds: 100_000_000)

        try await updateLocalSyncRecord(modification.path, syncState: .synced)
    }

    /// 同步删除的文件
    private func syncDeletedFile(_ modification: OfflineModification) async throws {
        logger.info("Syncing deleted file: \(modification.path)")

        // 通知云端删除文件
        logger.info("Deleting file from cloud: \(modification.path)")

        try await Task.sleep(nanoseconds: 100_000_000)

        // 从本地数据库中移除记录
        try await removeLocalSyncRecord(modification.path)
    }

    /// 同步重命名的文件
    private func syncRenamedFile(_ modification: OfflineModification, oldName: String) async throws {
        logger.info("Syncing renamed file: \(oldName) -> \(modification.fileName)")

        // 通知云端重命名文件
        logger.info("Renaming file in cloud: \(oldName) -> \(modification.fileName)")

        try await Task.sleep(nanoseconds: 100_000_000)

        try await updateLocalSyncRecord(modification.path, syncState: .synced)
    }

    /// 同步移动的文件
    private func syncMovedFile(_ modification: OfflineModification, oldPath: String) async throws {
        logger.info("Syncing moved file: \(oldPath) -> \(modification.path)")

        // 通知云端移动文件
        logger.info("Moving file in cloud: \(oldPath) -> \(modification.path)")

        try await Task.sleep(nanoseconds: 100_000_000)

        try await updateLocalSyncRecord(modification.path, syncState: .synced)
    }

    /// 检查冲突
    private func checkForConflicts(_ path: String) async throws -> Bool {
        // 模拟冲突检查逻辑
        // 在实际实现中，这里会比较本地和云端的文件元数据
        return false
    }

    /// 更新本地同步记录
    private func updateLocalSyncRecord(_ path: String, syncState: SyncItem.SyncState) async throws {
        // 模拟更新本地数据库记录
        logger.info("Updating local sync record for: \(path), state: \(syncState.rawValue)")
    }

    /// 移除本地同步记录
    private func removeLocalSyncRecord(_ path: String) async throws {
        // 模拟从本地数据库移除记录
        logger.info("Removing local sync record for: \(path)")
    }

    /// 判断是否应该重试修改
    private func shouldRetryModification(_ modification: OfflineModification, error: Error) -> Bool {
        // 根据错误类型和修改的年龄决定是否重试
        let modificationAge = Date().timeIntervalSince(modification.timestamp)
        let maxRetryAge: TimeInterval = 24 * 60 * 60 // 24小时

        if modificationAge > maxRetryAge {
            return false // 太旧的修改不再重试
        }

        // 根据错误类型决定
        if let offlineError = error as? OfflineManagerError {
            switch offlineError {
            case .fileNotFound, .invalidPath:
                return false // 文件不存在或路径无效，不重试
            case .syncConflict:
                return true // 冲突可能可以解决，重试
            default:
                return true
            }
        }

        return true // 默认重试
    }

    /// 从待处理队列中移除指定修改
    private func removePendingModification(_ modification: OfflineModification) {
        modificationQueue.sync {
            offlineModifications.removeAll { $0.id == modification.id }
        }
    }

    /// 验证缓存完整性
    private func validateCacheIntegrity() async {
        logger.info("Validating cache integrity")

        var corruptedItems: [String] = []

        for (path, cacheItem) in cacheItems {
            // 检查缓存文件是否存在
            if !fileSystemService.fileExists(at: cacheItem.cachePath) {
                logger.warning("Cache file missing: \(cacheItem.cachePath)")
                corruptedItems.append(path)
                continue
            }

            // 检查文件大小是否匹配
            do {
                let attributes = try fileSystemService.getFileAttributes(at: cacheItem.cachePath)
                if attributes.size != cacheItem.size {
                    logger.warning("Cache file size mismatch: \(cacheItem.cachePath)")
                    corruptedItems.append(path)
                }
            } catch {
                logger.error("Failed to get cache file attributes: \(error.localizedDescription)")
                corruptedItems.append(path)
            }
        }

        // 移除损坏的缓存项
        for path in corruptedItems {
            cacheItems.removeValue(forKey: path)
            logger.info("Removed corrupted cache item: \(path)")
        }

        if !corruptedItems.isEmpty {
            logger.info("Cache integrity validation completed, removed \(corruptedItems.count) corrupted items")
        }
    }

    /// 同步缓存状态
    private func syncCacheState() async {
        logger.info("Syncing cache state with cloud")

        // 检查云端文件状态并更新本地缓存
        for (path, _) in cacheItems {
            do {
                // 模拟检查云端文件状态
                let cloudFileExists = try await checkCloudFileExists(path)

                if !cloudFileExists {
                    // 云端文件不存在，移除本地缓存
                    try await removeFromOffline(path)
                    logger.info("Removed cache for deleted cloud file: \(path)")
                }

            } catch {
                logger.error("Failed to check cloud file status for \(path): \(error.localizedDescription)")
            }
        }
    }

    /// 检查云端文件是否存在
    private func checkCloudFileExists(_ path: String) async throws -> Bool {
        // 模拟云端文件存在检查
        // 在实际实现中，这里会调用 CloudAPIService
        try await Task.sleep(nanoseconds: 50_000_000) // 0.05秒
        return true // 模拟文件存在
    }

    private func initialize() async {
        do {
            try FileManager.default.createDirectory(at: self.cacheDirectory, withIntermediateDirectories: true)
            logger.info("OfflineManager initialized with cache directory: \(self.cacheDirectory.path)")
        } catch {
            logger.error("Failed to initialize OfflineManager: \(error.localizedDescription)")
        }
    }
}

enum OfflineManagerError: LocalizedError {
    case invalidPath(String)
    case fileNotCached(String)
    case fileNotFound(String)
    case cacheFileCorrupted(String)
    case insufficientSpace(needed: Int64, available: Int64)
    case cacheDirectoryNotAccessible
    case fileSystemError(Error)
    case syncConflict(String)
    case networkUnavailable
    case syncTimeout(String)

    var errorDescription: String? {
        switch self {
        case .invalidPath(let path):
            return "Invalid file path: \(path)"
        case .fileNotCached(let path):
            return "File not available in offline cache: \(path)"
        case .fileNotFound(let path):
            return "File not found: \(path)"
        case .cacheFileCorrupted(let path):
            return "Cache file corrupted or missing: \(path)"
        case .insufficientSpace(let needed, let available):
            let neededStr = ByteCountFormatter.string(fromByteCount: needed, countStyle: .file)
            let availableStr = ByteCountFormatter.string(fromByteCount: available, countStyle: .file)
            return "Insufficient cache space: need \(neededStr), available \(availableStr)"
        case .cacheDirectoryNotAccessible:
            return "Cache directory is not accessible"
        case .fileSystemError(let error):
            return "File system error: \(error.localizedDescription)"
        case .syncConflict(let path):
            return "Sync conflict detected for file: \(path)"
        case .networkUnavailable:
            return "Network is not available for sync operation"
        case .syncTimeout(let path):
            return "Sync operation timed out for file: \(path)"
        }
    }
}
