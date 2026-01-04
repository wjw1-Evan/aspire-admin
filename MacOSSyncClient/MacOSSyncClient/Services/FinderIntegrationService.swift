import Foundation
import Combine

/// Finder 集成服务，负责与 Finder 扩展通信和状态同步
class FinderIntegrationService: ObservableObject {
    
    // MARK: - Properties
    
    private let syncEngine: SyncEngineProtocol
    private let userDefaults: UserDefaults
    private var cancellables = Set<AnyCancellable>()
    
    /// 文件状态缓存
    @Published private(set) var fileStatuses: [String: SyncItemState] = [:]
    
    /// 同步文件夹路径
    @Published var syncFolderPath: String? {
        didSet {
            updateSyncFolderPath()
        }
    }
    
    // MARK: - Initialization
    
    /// 初始化 Finder 集成服务
    /// - Parameter syncEngine: 同步引擎实例
    init(syncEngine: SyncEngineProtocol) {
        self.syncEngine = syncEngine
        
        // 使用 App Group 共享的 UserDefaults
        self.userDefaults = UserDefaults(suiteName: "group.com.macos-sync-client.shared") ?? UserDefaults.standard
        
        setupFinderIntegration()
        setupStatusObservation()
        setupCommandListener()
    }
    
    // MARK: - Setup Methods
    
    /// 设置 Finder 集成
    private func setupFinderIntegration() {
        // 设置默认同步文件夹路径
        let homeURL = FileManager.default.homeDirectoryForCurrentUser
        let defaultSyncPath = homeURL.appendingPathComponent("MacOSSyncClient").path
        
        if syncFolderPath == nil {
            syncFolderPath = userDefaults.string(forKey: "syncFolderPath") ?? defaultSyncPath
        }
        
        // 初始化文件状态
        loadFileStatuses()
    }
    
    /// 设置状态观察
    private func setupStatusObservation() {
        // 监听同步引擎的项目变化
        Task {
            for await change in syncEngine.itemChanges {
                await MainActor.run {
                    self.handleItemChange(change)
                }
            }
        }
        
        // 定期更新文件状态
        Timer.publish(every: 5.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.updateFileStatuses()
            }
            .store(in: &cancellables)
    }
    
    /// 设置命令监听器
    private func setupCommandListener() {
        // 监听来自 Finder 扩展的命令
        DistributedNotificationCenter.default.addObserver(
            forName: Notification.Name("com.macos-sync-client.finder-command"),
            object: nil,
            queue: .main
        ) { [weak self] notification in
            self?.handleFinderCommand(notification)
        }
    }
    
    // MARK: - Status Management
    
    /// 加载文件状态
    private func loadFileStatuses() {
        if let data = userDefaults.data(forKey: "fileStatuses"),
           let statuses = try? JSONDecoder().decode([String: SyncItemState].self, from: data) {
            fileStatuses = statuses
        }
    }
    
    /// 保存文件状态
    private func saveFileStatuses() {
        if let data = try? JSONEncoder().encode(fileStatuses) {
            userDefaults.set(data, forKey: "fileStatuses")
        }
    }
    
    /// 更新同步文件夹路径
    private func updateSyncFolderPath() {
        guard let path = syncFolderPath else { return }
        userDefaults.set(path, forKey: "syncFolderPath")
    }
    
    /// 更新文件状态
    private func updateFileStatuses() {
        guard let syncFolderPath = syncFolderPath else { return }
        
        Task {
            await refreshFileStatuses(in: syncFolderPath)
        }
    }
    
    /// 刷新指定目录的文件状态
    private func refreshFileStatuses(in folderPath: String) async {
        let fileManager = FileManager.default
        let folderURL = URL(fileURLWithPath: folderPath)
        
        guard fileManager.fileExists(atPath: folderPath) else { return }
        
        do {
            let contents = try fileManager.contentsOfDirectory(
                at: folderURL,
                includingPropertiesForKeys: [.isDirectoryKey],
                options: [.skipsHiddenFiles]
            )
            
            var newStatuses: [String: SyncItemState] = [:]
            
            for url in contents {
                let path = url.path
                let state = syncEngine.getItemState(at: path) ?? .localOnly
                newStatuses[path] = convertToFinderState(state)
            }
            
            // Move the assignment to MainActor context
            let statusesToUpdate = newStatuses
            await MainActor.run {
                fileStatuses = statusesToUpdate
                saveFileStatuses()
            }
            
        } catch {
            print("Error refreshing file statuses: \(error)")
        }
    }
    
    /// 处理项目变化
    private func handleItemChange(_ change: SyncItemChange) {
        let path = change.item.localPath
        let state = convertToFinderState(change.item.syncState)
        
        fileStatuses[path] = state
        saveFileStatuses()
    }
    
    /// 转换同步状态到 Finder 状态
    private func convertToFinderState(_ syncState: SyncItem.SyncState) -> SyncItemState {
        switch syncState {
        case .synced:
            return .synced
        case .uploading:
            return .syncing
        case .downloading:
            return .syncing
        case .error:
            return .error
        case .conflict:
            return .conflict
        case .localOnly:
            return .localOnly
        case .cloudOnly:
            return .cloudOnly
        case .paused:
            return .paused
        }
    }
    
    // MARK: - Command Handling
    
    /// 处理来自 Finder 扩展的命令
    private func handleFinderCommand(_ notification: Notification) {
        guard let data = userDefaults.data(forKey: "finderSyncCommand"),
              let command = try? JSONDecoder().decode(SyncCommand.self, from: data) else {
            return
        }
        
        Task {
            await executeFinderCommand(command)
        }
    }
    
    /// 执行 Finder 命令
    private func executeFinderCommand(_ command: SyncCommand) async {
        switch command.action {
        case "syncItem":
            if let path = command.path {
                try? await syncEngine.syncFile(at: path)
            }
            
        case "syncFolder":
            if let path = command.path {
                try? await syncEngine.syncFolder(at: path, recursive: true)
            }
            
        case "viewStatus":
            await showSyncStatus()
            
        case "resolveConflict":
            if let path = command.path {
                await resolveConflict(at: path)
            }
            
        case "makeOffline":
            if let path = command.path {
                await makeAvailableOffline(at: path)
            }
            
        case "selectiveSync":
            await openSelectiveSyncSettings()
            
        case "openClient":
            await openSyncClient()
            
        case "showStatus":
            await showSyncStatus()
            
        default:
            print("Unknown Finder command: \(command.action)")
        }
    }
    
    // MARK: - Command Implementations
    
    /// 显示同步状态
    private func showSyncStatus() async {
        // 发送通知到主应用显示状态窗口
        await MainActor.run {
            NotificationCenter.default.post(
                name: Notification.Name("ShowSyncStatus"),
                object: nil
            )
        }
    }
    
    /// 解决冲突
    private func resolveConflict(at path: String) async {
        // 发送通知到主应用处理冲突
        await MainActor.run {
            NotificationCenter.default.post(
                name: Notification.Name("ResolveConflict"),
                object: nil,
                userInfo: ["path": path]
            )
        }
    }
    
    /// 设置离线可用
    private func makeAvailableOffline(at path: String) async {
        // 发送通知到主应用设置离线可用
        await MainActor.run {
            NotificationCenter.default.post(
                name: Notification.Name("MakeAvailableOffline"),
                object: nil,
                userInfo: ["path": path]
            )
        }
    }
    
    /// 打开选择性同步设置
    private func openSelectiveSyncSettings() async {
        await MainActor.run {
            NotificationCenter.default.post(
                name: Notification.Name("OpenSelectiveSyncSettings"),
                object: nil
            )
        }
    }
    
    /// 打开同步客户端
    private func openSyncClient() async {
        await MainActor.run {
            NotificationCenter.default.post(
                name: Notification.Name("OpenSyncClient"),
                object: nil
            )
        }
    }
    
    // MARK: - Public Methods
    
    /// 设置同步文件夹路径
    /// - Parameter path: 新的同步文件夹路径
    func setSyncFolderPath(_ path: String) {
        syncFolderPath = path
        updateFileStatuses()
    }
    
    /// 获取指定路径的文件状态
    /// - Parameter path: 文件路径
    /// - Returns: 文件状态，如果不存在则返回 nil
    func getFileStatus(at path: String) -> SyncItemState? {
        return fileStatuses[path]
    }
    
    /// 强制刷新所有文件状态
    func refreshAllStatuses() {
        updateFileStatuses()
    }
    
    /// 清理资源
    func cleanup() {
        DistributedNotificationCenter.default.removeObserver(self)
        cancellables.removeAll()
    }
    
    deinit {
        cleanup()
    }
}

// MARK: - Supporting Types

/// 同步项目状态（简化版本，用于 Finder 扩展）
enum SyncItemState: String, Codable, CaseIterable {
    case synced = "synced"
    case syncing = "syncing"
    case error = "error"
    case conflict = "conflict"
    case pendingUpload = "pendingUpload"
    case pendingDownload = "pendingDownload"
    case localOnly = "localOnly"
    case cloudOnly = "cloudOnly"
    case paused = "paused"
}

/// 同步命令
struct SyncCommand: Codable {
    let action: String
    let path: String?
    let timestamp: Date
}