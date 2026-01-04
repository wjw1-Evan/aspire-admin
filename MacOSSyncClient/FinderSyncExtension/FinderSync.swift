import Cocoa
import FinderSync
import Foundation

/// Finder 同步扩展，提供文件状态图标和右键菜单集成
class FinderSync: FIFinderSync {
    
    // MARK: - Properties
    
    /// 同步文件夹路径
    private var syncFolderURL: URL?
    
    /// 文件状态缓存
    private var fileStatusCache: [String: SyncItemState] = [:]
    
    /// 状态更新队列
    private let statusQueue = DispatchQueue(label: "com.macos-sync-client.finder-sync.status", qos: .utility)
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        
        NSLog("FinderSync() launched from %@", Bundle.main.bundlePath)
        
        // 设置监控的文件夹
        setupSyncFolder()
        
        // 设置状态图标
        setupStatusIcons()
        
        // 启动状态监控
        startStatusMonitoring()
    }
    
    // MARK: - Setup Methods
    
    /// 设置同步文件夹监控
    private func setupSyncFolder() {
        // 从用户默认设置获取同步文件夹路径
        let userDefaults = UserDefaults(suiteName: "group.com.macos-sync-client.shared")
        
        if let syncFolderPath = userDefaults?.string(forKey: "syncFolderPath") {
            syncFolderURL = URL(fileURLWithPath: syncFolderPath)
            
            if let url = syncFolderURL {
                // 设置 Finder 同步监控的目录
                FIFinderSyncController.default().directoryURLs = Set([url])
                NSLog("FinderSync monitoring directory: %@", url.path)
            }
        } else {
            // 使用默认的同步文件夹路径
            let homeURL = FileManager.default.homeDirectoryForCurrentUser
            syncFolderURL = homeURL.appendingPathComponent("MacOSSyncClient")
            
            if let url = syncFolderURL {
                FIFinderSyncController.default().directoryURLs = Set([url])
                NSLog("FinderSync using default directory: %@", url.path)
            }
        }
    }
    
    /// 设置状态图标
    private func setupStatusIcons() {
        // 注册状态图标
        FIFinderSyncController.default().setBadgeImage(
            NSImage(named: "sync-complete"),
            label: "Synced",
            forBadgeIdentifier: "synced"
        )
        
        FIFinderSyncController.default().setBadgeImage(
            NSImage(named: "sync-progress"),
            label: "Syncing",
            forBadgeIdentifier: "syncing"
        )
        
        FIFinderSyncController.default().setBadgeImage(
            NSImage(named: "sync-error"),
            label: "Error",
            forBadgeIdentifier: "error"
        )
        
        FIFinderSyncController.default().setBadgeImage(
            NSImage(named: "sync-conflict"),
            label: "Conflict",
            forBadgeIdentifier: "conflict"
        )
        
        FIFinderSyncController.default().setBadgeImage(
            NSImage(named: "sync-pending"),
            label: "Pending",
            forBadgeIdentifier: "pending"
        )
    }
    
    /// 启动状态监控
    private func startStatusMonitoring() {
        // 启动定期状态更新
        Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in
            self?.updateFileStatuses()
        }
    }
    
    // MARK: - Status Management
    
    /// 更新文件状态
    private func updateFileStatuses() {
        guard let syncFolderURL = syncFolderURL else { return }
        
        statusQueue.async { [weak self] in
            self?.refreshStatusCache(for: syncFolderURL)
        }
    }
    
    /// 刷新状态缓存
    private func refreshStatusCache(for folderURL: URL) {
        // 从主应用获取文件状态信息
        let userDefaults = UserDefaults(suiteName: "group.com.macos-sync-client.shared")
        
        if let statusData = userDefaults?.data(forKey: "fileStatuses"),
           let statuses = try? JSONDecoder().decode([String: SyncItemState].self, from: statusData) {
            
            DispatchQueue.main.async { [weak self] in
                self?.fileStatusCache = statuses
                self?.updateBadges()
            }
        }
    }
    
    /// 更新文件徽章
    private func updateBadges() {
        for (path, state) in fileStatusCache {
            let url = URL(fileURLWithPath: path)
            let badgeIdentifier = getBadgeIdentifier(for: state)
            
            FIFinderSyncController.default().setBadgeIdentifier(
                badgeIdentifier,
                for: url
            )
        }
    }
    
    /// 获取状态对应的徽章标识符
    private func getBadgeIdentifier(for state: SyncItemState) -> String {
        switch state {
        case .synced:
            return "synced"
        case .syncing:
            return "syncing"
        case .error:
            return "error"
        case .conflict:
            return "conflict"
        case .pendingUpload, .pendingDownload:
            return "pending"
        case .localOnly, .cloudOnly:
            return "pending"
        }
    }
    
    // MARK: - FIFinderSync Protocol
    
    override func beginObservingDirectory(at url: URL) {
        NSLog("FinderSync beginObservingDirectory: %@", url.path)
        
        // 开始监控指定目录
        updateFileStatuses()
    }
    
    override func endObservingDirectory(at url: URL) {
        NSLog("FinderSync endObservingDirectory: %@", url.path)
    }
    
    override func requestBadgeIdentifier(for url: URL) {
        NSLog("FinderSync requestBadgeIdentifier for: %@", url.path)
        
        // 获取文件状态并设置相应的徽章
        let path = url.path
        if let state = fileStatusCache[path] {
            let badgeIdentifier = getBadgeIdentifier(for: state)
            FIFinderSyncController.default().setBadgeIdentifier(badgeIdentifier, for: url)
        }
    }
    
    // MARK: - Context Menu
    
    override func menu(for menuKind: FIMenuKind) -> NSMenu? {
        switch menuKind {
        case .contextualMenuForItems:
            return createContextualMenu()
        case .contextualMenuForContainer:
            return createContainerMenu()
        case .contextualMenuForSidebar:
            return createSidebarMenu()
        case .toolbarItemMenu:
            return createToolbarMenu()
        @unknown default:
            return nil
        }
    }
    
    /// 创建文件/文件夹的右键菜单
    private func createContextualMenu() -> NSMenu {
        let menu = NSMenu(title: "")
        
        // 同步此项目
        let syncItem = NSMenuItem(
            title: "Sync This Item",
            action: #selector(syncSelectedItems(_:)),
            keyEquivalent: ""
        )
        syncItem.target = self
        menu.addItem(syncItem)
        
        // 分隔符
        menu.addItem(NSMenuItem.separator())
        
        // 查看同步状态
        let statusItem = NSMenuItem(
            title: "View Sync Status",
            action: #selector(viewSyncStatus(_:)),
            keyEquivalent: ""
        )
        statusItem.target = self
        menu.addItem(statusItem)
        
        // 解决冲突（仅在有冲突时显示）
        if hasConflictedItems() {
            let resolveItem = NSMenuItem(
                title: "Resolve Conflicts",
                action: #selector(resolveConflicts(_:)),
                keyEquivalent: ""
            )
            resolveItem.target = self
            menu.addItem(resolveItem)
        }
        
        // 分隔符
        menu.addItem(NSMenuItem.separator())
        
        // 设置离线可用
        let offlineItem = NSMenuItem(
            title: "Make Available Offline",
            action: #selector(makeAvailableOffline(_:)),
            keyEquivalent: ""
        )
        offlineItem.target = self
        menu.addItem(offlineItem)
        
        return menu
    }
    
    /// 创建容器（文件夹）的右键菜单
    private func createContainerMenu() -> NSMenu {
        let menu = NSMenu(title: "")
        
        // 同步此文件夹
        let syncFolder = NSMenuItem(
            title: "Sync This Folder",
            action: #selector(syncSelectedFolder(_:)),
            keyEquivalent: ""
        )
        syncFolder.target = self
        menu.addItem(syncFolder)
        
        // 分隔符
        menu.addItem(NSMenuItem.separator())
        
        // 选择性同步设置
        let selectiveSync = NSMenuItem(
            title: "Selective Sync Settings",
            action: #selector(openSelectiveSyncSettings(_:)),
            keyEquivalent: ""
        )
        selectiveSync.target = self
        menu.addItem(selectiveSync)
        
        return menu
    }
    
    /// 创建侧边栏菜单
    private func createSidebarMenu() -> NSMenu {
        let menu = NSMenu(title: "")
        
        // 打开同步客户端
        let openClient = NSMenuItem(
            title: "Open Sync Client",
            action: #selector(openSyncClient(_:)),
            keyEquivalent: ""
        )
        openClient.target = self
        menu.addItem(openClient)
        
        return menu
    }
    
    /// 创建工具栏菜单
    private func createToolbarMenu() -> NSMenu {
        let menu = NSMenu(title: "")
        
        // 同步状态
        let statusItem = NSMenuItem(
            title: "Sync Status",
            action: #selector(showSyncStatus(_:)),
            keyEquivalent: ""
        )
        statusItem.target = self
        menu.addItem(statusItem)
        
        return menu
    }
    
    // MARK: - Menu Actions
    
    /// 同步选中的项目
    @objc private func syncSelectedItems(_ sender: NSMenuItem) {
        guard let targetURLs = FIFinderSyncController.default().selectedItemURLs() else { return }
        
        for url in targetURLs {
            sendSyncCommand(action: "syncItem", path: url.path)
        }
    }
    
    /// 同步选中的文件夹
    @objc private func syncSelectedFolder(_ sender: NSMenuItem) {
        guard let targetURL = FIFinderSyncController.default().targetedURL() else { return }
        
        sendSyncCommand(action: "syncFolder", path: targetURL.path)
    }
    
    /// 查看同步状态
    @objc private func viewSyncStatus(_ sender: NSMenuItem) {
        sendSyncCommand(action: "viewStatus", path: nil)
    }
    
    /// 解决冲突
    @objc private func resolveConflicts(_ sender: NSMenuItem) {
        guard let targetURLs = FIFinderSyncController.default().selectedItemURLs() else { return }
        
        for url in targetURLs {
            sendSyncCommand(action: "resolveConflict", path: url.path)
        }
    }
    
    /// 设置离线可用
    @objc private func makeAvailableOffline(_ sender: NSMenuItem) {
        guard let targetURLs = FIFinderSyncController.default().selectedItemURLs() else { return }
        
        for url in targetURLs {
            sendSyncCommand(action: "makeOffline", path: url.path)
        }
    }
    
    /// 打开选择性同步设置
    @objc private func openSelectiveSyncSettings(_ sender: NSMenuItem) {
        sendSyncCommand(action: "selectiveSync", path: nil)
    }
    
    /// 打开同步客户端
    @objc private func openSyncClient(_ sender: NSMenuItem) {
        sendSyncCommand(action: "openClient", path: nil)
    }
    
    /// 显示同步状态
    @objc private func showSyncStatus(_ sender: NSMenuItem) {
        sendSyncCommand(action: "showStatus", path: nil)
    }
    
    // MARK: - Helper Methods
    
    /// 检查是否有冲突的项目
    private func hasConflictedItems() -> Bool {
        guard let targetURLs = FIFinderSyncController.default().selectedItemURLs() else { return false }
        
        for url in targetURLs {
            if let state = fileStatusCache[url.path], state == .conflict {
                return true
            }
        }
        
        return false
    }
    
    /// 发送同步命令到主应用
    private func sendSyncCommand(action: String, path: String?) {
        let command = SyncCommand(action: action, path: path, timestamp: Date())
        
        if let data = try? JSONEncoder().encode(command) {
            let userDefaults = UserDefaults(suiteName: "group.com.macos-sync-client.shared")
            userDefaults?.set(data, forKey: "finderSyncCommand")
            
            // 通知主应用有新命令
            DistributedNotificationCenter.default().post(
                name: Notification.Name("com.macos-sync-client.finder-command"),
                object: nil,
                userInfo: ["action": action]
            )
        }
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