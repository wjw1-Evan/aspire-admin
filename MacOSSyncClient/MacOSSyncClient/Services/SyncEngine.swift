import Combine
import CryptoKit
import Foundation

/// 同步引擎实现，负责协调本地和云端文件的双向同步
class SyncEngine: SyncEngineProtocol {
    // MARK: - Transfer Progress Tracking

    private var activeTransfers: [UUID: TransferProgressInfo] = [:]
    private let transfersQueue = DispatchQueue(
        label: "com.macossync.syncengine.transfers", attributes: .concurrent)

    // MARK: - Dependencies

    private let cloudAPIService: CloudAPIServiceProtocol
    private let localDBService: LocalDBService
    private let fileSystemService: FileSystemServiceProtocol
    private let fileMonitor: FileMonitorProtocol
    private let p2pTransferService: P2PTransferServiceProtocol?

    // MARK: - State Management

    private var _currentState: SyncEngineState = .idle
    private let stateQueue = DispatchQueue(
        label: "com.macossync.syncengine.state", attributes: .concurrent)

    private var _currentProgress: SyncProgress = SyncProgress(
        totalItems: 0,
        completedItems: 0,
        totalBytes: 0,
        transferredBytes: 0
    )
    private let progressQueue = DispatchQueue(
        label: "com.macossync.syncengine.progress", attributes: .concurrent)

    // MARK: - Event Streams

    private let stateSubject = PassthroughSubject<SyncEngineState, Never>()
    private let itemChangeSubject = PassthroughSubject<SyncItemChange, Never>()
    private let progressSubject = PassthroughSubject<SyncProgress, Never>()

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Sync Configuration

    private var configuration: SyncConfiguration
    private let configurationQueue = DispatchQueue(
        label: "com.macossync.syncengine.config", attributes: .concurrent)

    // MARK: - Sync Operations

    private var activeSyncTasks: Set<UUID> = []
    private let syncTasksQueue = DispatchQueue(
        label: "com.macossync.syncengine.tasks", attributes: .concurrent)

    private var syncTimer: Timer?
    private let syncInterval: TimeInterval = 2.0  // 缩短同步间隔，加快本地变更检测

    // MARK: - Initialization

    /// 初始化同步引擎
    /// - Parameters:
    ///   - cloudAPIService: 云端API服务
    ///   - localDBService: 本地数据库服务
    ///   - fileSystemService: 文件系统服务
    ///   - fileMonitor: 文件监控服务
    ///   - configuration: 同步配置
    init(
        cloudAPIService: CloudAPIServiceProtocol,
        localDBService: LocalDBService,
        fileSystemService: FileSystemServiceProtocol,
        fileMonitor: FileMonitorProtocol,
        configuration: SyncConfiguration? = nil,
        p2pTransferService: P2PTransferServiceProtocol? = nil
    ) {
        self.cloudAPIService = cloudAPIService
        self.localDBService = localDBService
        self.fileSystemService = fileSystemService
        self.fileMonitor = fileMonitor
        self.p2pTransferService = p2pTransferService

        // 加载或使用默认配置
        if let config = configuration {
            self.configuration = config
        } else {
            do {
                self.configuration = try localDBService.loadSyncConfiguration()
            } catch {
                print("Failed to load configuration, using default: \(error)")
                self.configuration = SyncConfiguration()
            }
        }

        setupFileMonitoring()
        setupEventStreams()
    }

    deinit {
        // Clean up resources synchronously
        stopPeriodicSync()
        fileMonitor.stopMonitoring()
        cancellables.removeAll()
    }

    // MARK: - SyncEngineProtocol Implementation

    func startSync() async throws {
        let currentState = getCurrentState()

        guard currentState == .idle || currentState == .paused || {
            if case .error = currentState { return true }
            return false
        }() else {
            throw SyncError.invalidConfiguration
        }

        print("Starting sync engine...")

        // 确保数据库连接
        if !localDBService.isConnected {
            try localDBService.openDatabase()
        }

        // 开始文件监控
        if let monitoredPath = fileMonitor.monitoredPath {
            // 如果已经在监控但路径不同，先停止再重新启动
            if monitoredPath != configuration.syncRootPath {
                fileMonitor.stopMonitoring()
                try fileMonitor.startMonitoring(path: configuration.syncRootPath)
            }
        } else {
            try fileMonitor.startMonitoring(path: configuration.syncRootPath)
        }

        // 启动 P2P 服务（如配置）
        await p2pTransferService?.start(advertisedName: nil)

        // 更新状态
        updateState(.syncing)

        // 启动定时同步
        startPeriodicSync()

        // 执行初始同步
        await performInitialSync()

        print("Sync engine started successfully")
    }

    func pauseSync() async {
        guard getCurrentState() == .syncing else { return }

        print("Pausing sync engine...")

        // 停止定时同步
        stopPeriodicSync()

        // 更新状态
        updateState(.paused)

        print("Sync engine paused")
    }

    func resumeSync() async throws {
        let currentState = getCurrentState()

        // 如果已经在同步，视为幂等操作
        if currentState == .syncing {
            await performInitialSync()
            return
        }

        // 如果处于错误状态，尝试重新启动完整同步
        if case .error = currentState {
            try await startSync()
            return
        }

        // 允许从空闲状态恢复（测试场景）
        guard currentState == .paused || currentState == .idle else {
            throw SyncError.invalidConfiguration
        }

        print("Resuming sync engine...")

        // 更新状态
        updateState(.syncing)

        // 重启定时同步
        startPeriodicSync()

        // 恢复时也执行一次初始扫描，确保新同步根目录的本地更改被捕获
        await performInitialSync()

        print("Sync engine resumed")
    }

    func stopSync() async {
        print("Stopping sync engine...")

        // 停止定时同步
        stopPeriodicSync()

        // 停止文件监控
        fileMonitor.stopMonitoring()

        // 停止 P2P 服务
        await p2pTransferService?.stop()

        // 等待所有活动任务完成
        await waitForActiveTasks()

        // 更新状态
        updateState(.idle)

        print("Sync engine stopped")
    }

    // MARK: - File Operations

    func syncFile(at path: String) async throws {
        guard getCurrentState() == .syncing else {
            throw SyncError.invalidConfiguration
        }

        print("Syncing file at path: \(path)")

        // 检查文件是否存在
        guard fileSystemService.fileExists(at: path) else {
            throw SyncError.fileNotFound(path)
        }

        // 获取或创建同步项目
        let syncItem = try await getOrCreateSyncItem(for: path)

        // 执行同步
        try await performSyncForItem(syncItem)
    }

    func syncFolder(at path: String, recursive: Bool) async throws {
        guard getCurrentState() == .syncing else {
            throw SyncError.invalidConfiguration
        }

        print("Syncing folder at path: \(path), recursive: \(recursive)")

        // 检查文件夹是否存在
        guard fileSystemService.directoryExists(at: path) else {
            throw SyncError.fileNotFound(path)
        }

        // 获取或创建同步项目
        let syncItem = try await getOrCreateSyncItem(for: path)

        // 执行同步
        try await performSyncForItem(syncItem)

        // 如果是递归同步，处理子项目
        if recursive {
            let childPaths = try fileSystemService.listDirectory(at: path)

            for childPath in childPaths {
                let fullChildPath = (path as NSString).appendingPathComponent(childPath)

                if fileSystemService.directoryExists(at: fullChildPath) {
                    try await syncFolder(at: fullChildPath, recursive: true)
                } else {
                    try await syncFile(at: fullChildPath)
                }
            }
        }
    }

    func deleteItem(at path: String) async throws {
        print("Deleting item at path: \(path)")

        // 查找同步项目
        guard let syncItem = try localDBService.getSyncItem(byLocalPath: path) else {
            throw SyncError.fileNotFound(path)
        }

        // 从云端删除
        if syncItem.syncState != .localOnly {
            try await cloudAPIService.deleteFile(at: syncItem.cloudPath)
        }

        // 从本地删除
        if fileSystemService.fileExists(at: path) {
            try fileSystemService.deleteFile(at: path)
        }

        // 从数据库删除
        try localDBService.deleteSyncItem(by: syncItem.id)

        // 发送变化事件
        let change = SyncItemChange(item: syncItem, changeType: .deleted)
        itemChangeSubject.send(change)
    }

    func moveItem(from: String, to: String) async throws {
        print("Moving item from \(from) to \(to)")

        // 查找同步项目
        guard var syncItem = try localDBService.getSyncItem(byLocalPath: from) else {
            throw SyncError.fileNotFound(from)
        }

        // 计算新的云端路径
        let newCloudPath = syncItem.cloudPath.replacingOccurrences(of: from, with: to)

        // 在云端移动
        if syncItem.syncState != .localOnly {
            _ = try await cloudAPIService.moveFile(from: syncItem.cloudPath, to: newCloudPath)
        }

        // 在本地移动
        if fileSystemService.fileExists(at: from) {
            try fileSystemService.moveFile(from: from, to: to)
        }

        // 更新数据库记录
        syncItem.localPath = to
        syncItem.cloudPath = newCloudPath
        syncItem.name = URL(fileURLWithPath: to).lastPathComponent
        try localDBService.updateSyncItem(syncItem)

        // 发送变化事件
        let change = SyncItemChange(item: syncItem, changeType: .modified)
        itemChangeSubject.send(change)
    }

    func renameItem(at path: String, to newName: String) async throws {
        let parentPath = URL(fileURLWithPath: path).deletingLastPathComponent().path
        let newPath = (parentPath as NSString).appendingPathComponent(newName)

        try await moveItem(from: path, to: newPath)
    }

    // MARK: - State Query

    func getSyncState() -> SyncEngineState {
        return getCurrentState()
    }

    func getItemState(at path: String) -> SyncItem.SyncState? {
        do {
            return try localDBService.getSyncItem(byLocalPath: path)?.syncState
        } catch {
            print("Failed to get item state for \(path): \(error)")
            return nil
        }
    }

    func getSyncProgress() -> SyncProgress {
        return getCurrentProgress()
    }

    // MARK: - Event Streams

    var stateChanges: AsyncStream<SyncEngineState> {
        return AsyncStream { continuation in
            let cancellable =
                stateSubject
                .sink { state in
                    continuation.yield(state)
                }

            continuation.onTermination = { _ in
                cancellable.cancel()
            }
        }
    }

    var itemChanges: AsyncStream<SyncItemChange> {
        return AsyncStream { continuation in
            let cancellable =
                itemChangeSubject
                .sink { change in
                    continuation.yield(change)
                }

            continuation.onTermination = { _ in
                cancellable.cancel()
            }
        }
    }

    var progressUpdates: AsyncStream<SyncProgress> {
        return AsyncStream { continuation in
            let cancellable =
                progressSubject
                .sink { progress in
                    continuation.yield(progress)
                }

            continuation.onTermination = { _ in
                cancellable.cancel()
            }
        }
    }

    // MARK: - Private Methods - State Management

    private func getCurrentState() -> SyncEngineState {
        return stateQueue.sync {
            return _currentState
        }
    }

    private func updateState(_ newState: SyncEngineState) {
        stateQueue.sync(flags: .barrier) {
            _currentState = newState
        }

        stateSubject.send(newState)
    }

    private func getCurrentProgress() -> SyncProgress {
        return progressQueue.sync {
            return _currentProgress
        }
    }

    private func updateProgress(_ newProgress: SyncProgress) {
        progressQueue.sync(flags: .barrier) {
            _currentProgress = newProgress
        }

        progressSubject.send(newProgress)
    }

    // MARK: - Private Methods - File Monitoring

    private func setupFileMonitoring() {
        // 监听文件变化事件
        Task {
            for await event in fileMonitor.fileEvents {
                await handleFileEvent(event)
            }
        }
    }

    private func handleFileEvent(_ event: FileEvent) async {
        guard getCurrentState() == .syncing else { return }

        print("Handling file event: \(event.eventType) at \(event.path)")

        do {
            switch event.eventType {
            case .created, .modified:
                try await syncFile(at: event.path)
            case .deleted:
                try await deleteItem(at: event.path)
            case .moved(let fromPath):
                try await moveItem(from: fromPath, to: event.path)
            case .renamed(let oldName):
                let parentPath = URL(fileURLWithPath: event.path).deletingLastPathComponent().path
                let oldPath = (parentPath as NSString).appendingPathComponent(oldName)
                try await moveItem(from: oldPath, to: event.path)
            }
        } catch {
            print("Failed to handle file event: \(error)")
            updateState(.error(error.localizedDescription))
        }
    }

    // MARK: - Private Methods - Event Streams

    private func setupEventStreams() {
        // 这里可以添加额外的事件流设置逻辑
    }

    // MARK: - Private Methods - Periodic Sync

    private func startPeriodicSync() {
        stopPeriodicSync()  // 确保没有重复的定时器

        syncTimer = Timer.scheduledTimer(withTimeInterval: syncInterval, repeats: true) {
            [weak self] _ in
            Task {
                await self?.performPeriodicSync()
            }
        }
    }

    private func stopPeriodicSync() {
        syncTimer?.invalidate()
        syncTimer = nil
    }

    private func performPeriodicSync() async {
        guard getCurrentState() == .syncing else { return }

        print("Performing periodic sync...")

        // 快速扫描本地变化，包括删除
        await scanLocalFiles()

        do {
            // 获取云端变化
            let changes = try await cloudAPIService.getChanges(since: nil)

            // 处理变化
            for change in changes.changes {
                await handleCloudChange(change)
            }

            // 同步本地待上传的项目
            await syncPendingLocalItems()

        } catch {
            print("Periodic sync failed: \(error)")
            updateState(.error(error.localizedDescription))
        }
    }

    private func performInitialSync() async {
        print("Performing initial sync...")

        do {
            // 扫描本地文件
            await scanLocalFiles()

            // 获取云端文件列表
            let cloudItems = try await cloudAPIService.listFolder(at: "/")

            // 同步云端项目
            for cloudItem in cloudItems {
                await handleCloudItem(cloudItem)
            }

        } catch {
            print("Initial sync failed: \(error)")
            updateState(.error(error.localizedDescription))
        }
    }

    // MARK: - Private Methods - Sync Operations

    private func getOrCreateSyncItem(for localPath: String) async throws -> SyncItem {
        // 尝试从数据库获取现有项目
        if let existingItem = try localDBService.getSyncItem(byLocalPath: localPath) {
            return existingItem
        }

        // 创建新的同步项目
        let fileAttributes = try fileSystemService.getFileAttributes(at: localPath)
        let isDirectory = fileAttributes.isDirectory

        let syncItem = SyncItem(
            cloudId: UUID().uuidString,  // 临时ID，上传后会更新
            localPath: localPath,
            cloudPath: convertLocalPathToCloudPath(localPath),
            name: URL(fileURLWithPath: localPath).lastPathComponent,
            type: isDirectory ? .folder : .file,
            size: fileAttributes.size,
            modifiedDate: fileAttributes.modificationDate,
            syncState: .localOnly,
            hash: isDirectory ? "" : try calculateFileHash(at: localPath)
        )

        // 保存到数据库
        try localDBService.insertSyncItem(syncItem)

        return syncItem
    }

    private func performSyncForItem(_ syncItem: SyncItem) async throws {
        let taskId = UUID()
        addActiveTask(taskId)

        defer {
            removeActiveTask(taskId)
        }

        print("Performing sync for item: \(syncItem.name)")

        var updatedItem = syncItem

        switch syncItem.syncState {
        case .localOnly:
            // 上传到云端
            updatedItem = try await uploadItem(syncItem)
        case .cloudOnly:
            // 下载到本地
            updatedItem = try await downloadItem(syncItem)
        case .synced:
            // 检查是否需要更新
            updatedItem = try await checkAndUpdateItem(syncItem)
        case .conflict:
            // 处理冲突（这里简化处理，实际应该根据配置决定）
            print("Conflict detected for item: \(syncItem.name)")
        case .error:
            // 重试同步
            updatedItem = try await retrySync(syncItem)
        case .uploading, .downloading, .paused:
            // 这些状态不需要处理
            break
        }

        // 更新数据库
        if updatedItem.id != syncItem.id || updatedItem != syncItem {
            try localDBService.updateSyncItem(updatedItem)

            // 发送变化事件
            let change = SyncItemChange(item: updatedItem, changeType: .stateChanged)
            itemChangeSubject.send(change)
        }
    }

    private func uploadItem(_ syncItem: SyncItem) async throws -> SyncItem {
        print("Uploading item: \(syncItem.name)")

        var updatedItem = syncItem
        updatedItem.syncState = .uploading
        try localDBService.updateSyncState(for: syncItem.id, to: .uploading)

        do {
            if syncItem.type == .file {
                let cloudFile = try await uploadFileWithRetry(
                    syncItem: syncItem,
                    maxRetries: configuration.maxRetryAttempts
                )

                updatedItem.cloudId = cloudFile.id
                updatedItem.hash = cloudFile.hash
                updatedItem.syncState = .synced
                updatedItem.lastSyncDate = Date()
            } else {
                let cloudFolder = try await cloudAPIService.createFolder(at: syncItem.cloudPath)
                updatedItem.cloudId = cloudFolder.id
                updatedItem.syncState = .synced
                updatedItem.lastSyncDate = Date()
            }

            return updatedItem
        } catch {
            updatedItem.syncState = .error
            try localDBService.updateSyncState(for: syncItem.id, to: .error)
            throw error
        }
    }

    private func downloadItem(_ syncItem: SyncItem) async throws -> SyncItem {
        print("Downloading item: \(syncItem.name)")

        var updatedItem = syncItem
        updatedItem.syncState = .downloading
        try localDBService.updateSyncState(for: syncItem.id, to: .downloading)

        do {
            if syncItem.type == .file {
                try await downloadFileWithRetry(
                    syncItem: syncItem,
                    maxRetries: configuration.maxRetryAttempts
                )
            } else {
                // 创建本地文件夹
                try fileSystemService.createDirectory(at: syncItem.localPath)
            }

            updatedItem.syncState = .synced
            updatedItem.lastSyncDate = Date()

            return updatedItem
        } catch {
            updatedItem.syncState = .error
            try localDBService.updateSyncState(for: syncItem.id, to: .error)
            throw error
        }
    }

    private func checkAndUpdateItem(_ syncItem: SyncItem) async throws -> SyncItem {
        // 检查本地文件是否有变化
        if fileSystemService.fileExists(at: syncItem.localPath) {
            let attributes = try fileSystemService.getFileAttributes(at: syncItem.localPath)
            let currentModifiedDate = attributes.modificationDate

            if currentModifiedDate > syncItem.modifiedDate {
                // 本地文件有更新，需要上传
                var updatedItem = syncItem
                updatedItem.modifiedDate = currentModifiedDate
                updatedItem.syncState = .localOnly

                if syncItem.type == .file {
                    updatedItem.hash = try calculateFileHash(at: syncItem.localPath)
                    updatedItem.size = attributes.size
                }

                return try await uploadItem(updatedItem)
            }
        }

        // 检查云端文件是否有变化
        do {
            if syncItem.type == .file {
                let cloudFile = try await cloudAPIService.getFileInfo(at: syncItem.cloudPath)
                if cloudFile.modifiedDate > syncItem.modifiedDate {
                    // 云端文件有更新，需要下载
                    var updatedItem = syncItem
                    updatedItem.modifiedDate = cloudFile.modifiedDate
                    updatedItem.hash = cloudFile.hash
                    updatedItem.size = cloudFile.size
                    updatedItem.syncState = .cloudOnly

                    return try await downloadItem(updatedItem)
                }
            }
        } catch {
            // 云端文件可能已被删除
            if case CloudAPIError.fileNotFound = error {
                // 删除本地记录
                try localDBService.deleteSyncItem(by: syncItem.id)
                return syncItem
            }
            throw error
        }

        return syncItem
    }

    private func retrySync(_ syncItem: SyncItem) async throws -> SyncItem {
        print("Retrying sync for item: \(syncItem.name)")

        // 重置状态并重新同步
        var updatedItem = syncItem
        updatedItem.syncState = .localOnly

        try await performSyncForItem(updatedItem)
        return updatedItem
    }

    // MARK: - Private Methods - Cloud Changes

    private func handleCloudChange(_ change: ChangeSet.Change) async {
        print("Handling cloud change: \(change.changeType) for \(change.path)")

        do {
            switch change.changeType {
            case .created, .modified:
                if let cloudItem = change.item {
                    await handleCloudItem(cloudItem)
                }
            case .deleted:
                await handleCloudDeletion(change.path)
            case .moved:
                // 处理移动操作
                if let cloudItem = change.item {
                    await handleCloudMove(from: change.path, item: cloudItem)
                }
            }
        }
    }

    private func handleCloudItem(_ cloudItem: CloudItem) async {
        let localPath = convertCloudPathToLocalPath(cloudItem.path)

        do {
            if let existingItem = try localDBService.getSyncItem(byCloudPath: cloudItem.path) {
                // 更新现有项目
                var updatedItem = existingItem
                updatedItem.modifiedDate = cloudItem.modifiedDate
                updatedItem.syncState = .cloudOnly

                if case .file(let cloudFile) = cloudItem {
                    updatedItem.hash = cloudFile.hash
                    updatedItem.size = cloudFile.size
                }

                try await performSyncForItem(updatedItem)
            } else {
                // 创建新项目
                let syncItem = cloudItem.toSyncItem(localPath: localPath, syncState: .cloudOnly)
                try localDBService.insertSyncItem(syncItem)

                try await performSyncForItem(syncItem)
            }
        } catch {
            print("Failed to handle cloud item: \(error)")
        }
    }

    private func handleCloudDeletion(_ cloudPath: String) async {
        do {
            if let syncItem = try localDBService.getSyncItem(byCloudPath: cloudPath) {
                // 删除本地文件
                if fileSystemService.fileExists(at: syncItem.localPath) {
                    try fileSystemService.deleteFile(at: syncItem.localPath)
                } else if fileSystemService.directoryExists(at: syncItem.localPath) {
                    try fileSystemService.deleteDirectory(at: syncItem.localPath)
                }

                // 删除数据库记录
                try localDBService.deleteSyncItem(by: syncItem.id)

                // 发送变化事件
                let change = SyncItemChange(item: syncItem, changeType: .deleted)
                itemChangeSubject.send(change)
            }
        } catch {
            print("Failed to handle cloud deletion: \(error)")
        }
    }

    private func handleCloudMove(from oldPath: String, item cloudItem: CloudItem) async {
        do {
            if let syncItem = try localDBService.getSyncItem(byCloudPath: oldPath) {
                let newLocalPath = convertCloudPathToLocalPath(cloudItem.path)

                // 移动本地文件
                if fileSystemService.fileExists(at: syncItem.localPath) {
                    try fileSystemService.moveFile(from: syncItem.localPath, to: newLocalPath)
                } else if fileSystemService.directoryExists(at: syncItem.localPath) {
                    // For directories, we need to handle this differently since FileSystemService doesn't have moveDirectory
                    // We'll create the new directory and move contents
                    try fileSystemService.createDirectory(at: newLocalPath)
                    let contents = try fileSystemService.listDirectory(at: syncItem.localPath)
                    for item in contents {
                        let oldItemPath = (syncItem.localPath as NSString).appendingPathComponent(
                            item)
                        let newItemPath = (newLocalPath as NSString).appendingPathComponent(item)
                        if fileSystemService.fileExists(at: oldItemPath) {
                            try fileSystemService.moveFile(from: oldItemPath, to: newItemPath)
                        }
                    }
                    try fileSystemService.deleteDirectory(at: syncItem.localPath)
                }

                // 更新数据库记录
                var updatedItem = syncItem
                updatedItem.localPath = newLocalPath
                updatedItem.cloudPath = cloudItem.path
                updatedItem.name = cloudItem.name
                try localDBService.updateSyncItem(updatedItem)

                // 发送变化事件
                let change = SyncItemChange(item: updatedItem, changeType: .modified)
                itemChangeSubject.send(change)
            }
        } catch {
            print("Failed to handle cloud move: \(error)")
        }
    }

    // MARK: - Private Methods - Local Scanning

    private func scanLocalFiles() async {
        print("Scanning local files...")

        do {
            let localPaths = try enumerateFilesRecursively(at: configuration.syncRootPath)

            for localPath in localPaths {
                // 检查是否应该排除此文件
                if shouldExcludeFile(at: localPath) {
                    continue
                }

                // 获取或创建同步项目
                let syncItem = try await getOrCreateSyncItem(for: localPath)

                // 如果是新项目或需要同步，添加到待同步列表
                if syncItem.syncState == .localOnly {
                    try await performSyncForItem(syncItem)
                }
            }

            // 检测数据库中已存在但本地被删除的项目，进行清理
            let trackedItems = try localDBService.getAllSyncItems()
            for item in trackedItems {
                if !fileSystemService.fileExists(at: item.localPath)
                    && !fileSystemService.directoryExists(at: item.localPath) {
                    try await deleteItem(at: item.localPath)
                }
            }
        } catch {
            print("Failed to scan local files: \(error)")
        }
    }

    private func syncPendingLocalItems() async {
        do {
            let pendingItems = try localDBService.getSyncItems(bySyncState: .localOnly)

            for item in pendingItems {
                try await performSyncForItem(item)
            }
        } catch {
            print("Failed to sync pending local items: \(error)")
        }
    }

    // MARK: - Private Methods - Enhanced File Transfer

    /// 带重试机制的文件上传
    private func uploadFileWithRetry(
        syncItem: SyncItem,
        maxRetries: Int,
        currentAttempt: Int = 1
    ) async throws -> CloudFile {
        do {
            return try await cloudAPIService.uploadFile(
                at: syncItem.localPath,
                to: syncItem.cloudPath
            ) { progress in
                // 更新详细进度信息
                Task {
                    await self.updateDetailedUploadProgress(
                        for: syncItem.id,
                        progress: progress,
                        attempt: currentAttempt,
                        maxAttempts: maxRetries
                    )
                }
            }
        } catch {
            print("Upload attempt \(currentAttempt) failed for \(syncItem.name): \(error)")

            // 检查是否应该重试
            if currentAttempt < maxRetries && shouldRetryError(error) {
                let delay = calculateRetryDelay(attempt: currentAttempt)
                print("Retrying upload in \(delay) seconds...")

                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))

                return try await uploadFileWithRetry(
                    syncItem: syncItem,
                    maxRetries: maxRetries,
                    currentAttempt: currentAttempt + 1
                )
            } else {
                throw error
            }
        }
    }

    /// 带重试机制的文件下载
    private func downloadFileWithRetry(
        syncItem: SyncItem,
        maxRetries: Int,
        currentAttempt: Int = 1
    ) async throws {
        do {
            try await cloudAPIService.downloadFile(
                from: syncItem.cloudPath,
                to: syncItem.localPath
            ) { progress in
                // 更新详细进度信息
                Task {
                    await self.updateDetailedDownloadProgress(
                        for: syncItem.id,
                        progress: progress,
                        attempt: currentAttempt,
                        maxAttempts: maxRetries
                    )
                }
            }
        } catch {
            print("Download attempt \(currentAttempt) failed for \(syncItem.name): \(error)")

            // 检查是否应该重试
            if currentAttempt < maxRetries && shouldRetryError(error) {
                let delay = calculateRetryDelay(attempt: currentAttempt)
                print("Retrying download in \(delay) seconds...")

                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))

                try await downloadFileWithRetry(
                    syncItem: syncItem,
                    maxRetries: maxRetries,
                    currentAttempt: currentAttempt + 1
                )
            } else {
                throw error
            }
        }
    }

    /// 判断错误是否应该重试
    private func shouldRetryError(_ error: Error) -> Bool {
        if let cloudError = error as? CloudAPIError {
            switch cloudError {
            case .networkError:
                // 网络错误可以重试
                return true
            case .serverError(let code, _):
                // 5xx服务器错误可以重试
                return code >= 500
            case .rateLimitExceeded:
                // 限流错误可以重试
                return true
            default:
                // 其他错误（如认证失败、文件不存在等）不重试
                return false
            }
        }

        // 其他类型的错误，检查是否是网络相关
        let errorDescription = error.localizedDescription.lowercased()
        return errorDescription.contains("network") || errorDescription.contains("timeout")
            || errorDescription.contains("connection")
    }

    /// 计算重试延迟（指数退避）
    private func calculateRetryDelay(attempt: Int) -> TimeInterval {
        let baseDelay: TimeInterval = 1.0
        let maxDelay: TimeInterval = 30.0

        let delay = baseDelay * pow(2.0, Double(attempt - 1))
        return min(delay, maxDelay)
    }

    /// 更新详细的上传进度
    private func updateDetailedUploadProgress(
        for itemId: UUID,
        progress: Double,
        attempt: Int,
        maxAttempts: Int
    ) async {
        let progressInfo = TransferProgressInfo(
            itemId: itemId,
            transferType: .upload,
            progress: progress,
            currentAttempt: attempt,
            maxAttempts: maxAttempts,
            timestamp: Date()
        )

        // 更新全局进度
        await updateGlobalProgress(with: progressInfo)

        // 发送进度事件
        let change = SyncItemChange(
            item: SyncItem(
                cloudId: itemId.uuidString,
                localPath: "",
                cloudPath: "",
                name: "Uploading...",
                type: .file,
                size: 0,
                modifiedDate: Date(),
                syncState: .uploading,
                hash: ""
            ),
            changeType: .stateChanged
        )
        itemChangeSubject.send(change)

        print(
            "Upload progress for \(itemId): \(progress * 100)% (attempt \(attempt)/\(maxAttempts))")
    }

    /// 更新详细的下载进度
    private func updateDetailedDownloadProgress(
        for itemId: UUID,
        progress: Double,
        attempt: Int,
        maxAttempts: Int
    ) async {
        let progressInfo = TransferProgressInfo(
            itemId: itemId,
            transferType: .download,
            progress: progress,
            currentAttempt: attempt,
            maxAttempts: maxAttempts,
            timestamp: Date()
        )

        // 更新全局进度
        await updateGlobalProgress(with: progressInfo)

        // 发送进度事件
        let change = SyncItemChange(
            item: SyncItem(
                cloudId: itemId.uuidString,
                localPath: "",
                cloudPath: "",
                name: "Downloading...",
                type: .file,
                size: 0,
                modifiedDate: Date(),
                syncState: .downloading,
                hash: ""
            ),
            changeType: .stateChanged
        )
        itemChangeSubject.send(change)

        print(
            "Download progress for \(itemId): \(progress * 100)% (attempt \(attempt)/\(maxAttempts))"
        )
    }

    /// 更新全局进度
    private func updateGlobalProgress(with progressInfo: TransferProgressInfo) async {
        // 这里可以实现更复杂的全局进度计算逻辑
        // 例如：跟踪所有活动传输的进度，计算总体完成度等

        let currentProgress = getCurrentProgress()
        let updatedProgress = SyncProgress(
            totalItems: currentProgress.totalItems,
            completedItems: currentProgress.completedItems,
            totalBytes: currentProgress.totalBytes,
            transferredBytes: currentProgress.transferredBytes,
            currentOperation:
                "\(progressInfo.transferType.displayName): \(Int(progressInfo.progress * 100))%",
            estimatedTimeRemaining: calculateEstimatedTimeRemaining(progressInfo: progressInfo)
        )

        updateProgress(updatedProgress)
    }

    /// 计算预估剩余时间
    private func calculateEstimatedTimeRemaining(progressInfo: TransferProgressInfo)
        -> TimeInterval?
    {
        // 简化的时间估算逻辑
        guard progressInfo.progress > 0.01 else { return nil }

        let elapsedTime = Date().timeIntervalSince(progressInfo.timestamp)
        let estimatedTotalTime = elapsedTime / progressInfo.progress
        let remainingTime = estimatedTotalTime - elapsedTime

        return max(remainingTime, 0)
    }

    // MARK: - Private Methods - Utilities

    private func convertLocalPathToCloudPath(_ localPath: String) -> String {
        let relativePath = localPath.replacingOccurrences(of: configuration.syncRootPath, with: "")
        return relativePath.hasPrefix("/") ? relativePath : "/" + relativePath
    }

    private func convertCloudPathToLocalPath(_ cloudPath: String) -> String {
        let relativePath = cloudPath.hasPrefix("/") ? String(cloudPath.dropFirst()) : cloudPath
        return (configuration.syncRootPath as NSString).appendingPathComponent(relativePath)
    }

    private func shouldExcludeFile(at path: String) -> Bool {
        let fileName = URL(fileURLWithPath: path).lastPathComponent

        for pattern in configuration.excludePatterns {
            if fileName.contains(pattern) || path.contains(pattern) {
                return true
            }
        }

        return false
    }

    private func addActiveTask(_ taskId: UUID) {
        _ = syncTasksQueue.sync(flags: .barrier) {
            activeSyncTasks.insert(taskId)
        }
    }

    private func removeActiveTask(_ taskId: UUID) {
        _ = syncTasksQueue.sync(flags: .barrier) {
            activeSyncTasks.remove(taskId)
        }
    }

    private func waitForActiveTasks() async {
        while !activeSyncTasks.isEmpty {
            try? await Task.sleep(nanoseconds: 100_000_000)  // 100ms
        }
    }

    private func updateUploadProgress(for itemId: UUID, progress: Double) async {
        // 这里可以实现更详细的进度跟踪
        print("Upload progress for \(itemId): \(progress * 100)%")
    }

    private func updateDownloadProgress(for itemId: UUID, progress: Double) async {
        // 这里可以实现更详细的进度跟踪
        print("Download progress for \(itemId): \(progress * 100)%")
    }

    // MARK: - Utility Methods

    /// 递归枚举文件
    private func enumerateFilesRecursively(at path: String) throws -> [String] {
        var allPaths: [String] = []

        func enumerateDirectory(_ dirPath: String) throws {
            let contents = try fileSystemService.listDirectory(at: dirPath)

            for item in contents {
                let fullPath = (dirPath as NSString).appendingPathComponent(item)
                allPaths.append(fullPath)

                if fileSystemService.directoryExists(at: fullPath) {
                    try enumerateDirectory(fullPath)
                }
            }
        }

        if fileSystemService.directoryExists(at: path) {
            try enumerateDirectory(path)
        } else if fileSystemService.fileExists(at: path) {
            allPaths.append(path)
        }

        return allPaths
    }

    /// 计算文件哈希值
    private func calculateFileHash(at path: String) throws -> String {
        let data = try fileSystemService.readFile(at: path)
        return data.sha256Hash
    }
}

// MARK: - Extensions

extension SyncEngine {
    /// 获取同步统计信息
    func getSyncStatistics() async throws -> [String: Any] {
        return try localDBService.getDatabaseStatistics()
    }

    /// 更新同步配置
    func updateConfiguration(_ newConfiguration: SyncConfiguration) async throws {
        configurationQueue.sync(flags: .barrier) {
            configuration = newConfiguration
        }

        try localDBService.saveSyncConfiguration(newConfiguration)

        // 如果同步根路径改变，需要重新开始监控
        if fileMonitor.monitoredPath != newConfiguration.syncRootPath {
            fileMonitor.stopMonitoring()
            if getCurrentState() == .syncing {
                try fileMonitor.startMonitoring(path: newConfiguration.syncRootPath)
            }
        }
    }

    /// 强制同步指定路径
    func forceSyncPath(_ path: String) async throws {
        if fileSystemService.directoryExists(at: path) {
            try await syncFolder(at: path, recursive: true)
        } else if fileSystemService.fileExists(at: path) {
            try await syncFile(at: path)
        } else {
            throw SyncError.fileNotFound(path)
        }
    }
}

// MARK: - Data Extension for Hash Calculation

extension Data {
    var sha256Hash: String {
        let digest = SHA256.hash(data: self)
        return digest.compactMap { String(format: "%02x", $0) }.joined()
    }
}
