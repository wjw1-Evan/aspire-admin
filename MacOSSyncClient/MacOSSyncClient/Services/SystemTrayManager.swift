import Foundation
import AppKit
import Combine
import QuartzCore

/// 系统托盘管理器，负责管理菜单栏图标和快速操作菜单
class SystemTrayManager: ObservableObject {
    // MARK: - Properties
    
    private var statusItem: NSStatusItem?
    private let syncEngine: SyncEngineProtocol
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Menu Items
    
    private var syncStatusMenuItem: NSMenuItem?
    private var pauseResumeMenuItem: NSMenuItem?
    private var progressMenuItem: NSMenuItem?
    
    // MARK: - State
    
    @Published private(set) var currentState: SyncEngineState = .idle
    @Published private(set) var currentProgress: SyncProgress?
    
    // MARK: - Initialization
    
    /// 初始化系统托盘管理器
    /// - Parameter syncEngine: 同步引擎实例
    init(syncEngine: SyncEngineProtocol) {
        self.syncEngine = syncEngine
        setupTrayMenu()
        setupStateObservation()
    }
    
    deinit {
        cleanup()
    }
    
    // MARK: - Public Methods
    
    /// 设置托盘菜单
    func setupTrayMenu() {
        // 创建状态栏项目
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        
        guard let statusItem = statusItem else {
            print("Failed to create status item")
            return
        }
        
        // 设置初始图标
        updateTrayIcon(state: .idle)
        
        // 创建菜单
        let menu = NSMenu()
        
        // 同步状态项
        syncStatusMenuItem = NSMenuItem(title: "Sync Status: Idle", action: nil, keyEquivalent: "")
        syncStatusMenuItem?.isEnabled = false
        menu.addItem(syncStatusMenuItem!)
        
        // 进度项（初始隐藏）
        progressMenuItem = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        progressMenuItem?.isEnabled = false
        progressMenuItem?.isHidden = true
        menu.addItem(progressMenuItem!)
        
        menu.addItem(NSMenuItem.separator())
        
        // 打开同步文件夹
        let openFolderItem = NSMenuItem(
            title: "Open Sync Folder",
            action: #selector(openSyncFolder),
            keyEquivalent: ""
        )
        openFolderItem.target = self
        menu.addItem(openFolderItem)
        
        // 暂停/恢复同步
        pauseResumeMenuItem = NSMenuItem(
            title: "Pause Sync",
            action: #selector(toggleSync),
            keyEquivalent: ""
        )
        pauseResumeMenuItem?.target = self
        menu.addItem(pauseResumeMenuItem!)
        
        menu.addItem(NSMenuItem.separator())
        
        // 设置
        let settingsItem = NSMenuItem(
            title: "Settings...",
            action: #selector(openSettings),
            keyEquivalent: ","
        )
        settingsItem.target = self
        menu.addItem(settingsItem)
        
        // 退出
        let quitItem = NSMenuItem(
            title: "Quit",
            action: #selector(quitApp),
            keyEquivalent: "q"
        )
        quitItem.target = self
        menu.addItem(quitItem)
        
        statusItem.menu = menu
        
        print("System tray menu setup completed")
    }
    
    /// 更新托盘图标
    /// - Parameter state: 同步引擎状态
    func updateTrayIcon(state: SyncEngineState) {
        guard let statusItem = statusItem else { return }
        
        let iconName: String
        let accessibilityDescription: String
        
        switch state {
        case .idle:
            iconName = "cloud"
            accessibilityDescription = "Sync Idle"
        case .syncing:
            iconName = "cloud.fill"
            accessibilityDescription = "Syncing"
        case .paused:
            iconName = "pause.circle"
            accessibilityDescription = "Sync Paused"
        case .error:
            iconName = "exclamationmark.triangle"
            accessibilityDescription = "Sync Error"
        }
        
        DispatchQueue.main.async {
            statusItem.button?.image = NSImage(
                systemSymbolName: iconName,
                accessibilityDescription: accessibilityDescription
            )
            
            // 为同步状态添加动画效果
            if case .syncing = state {
                self.startSyncAnimation()
            } else {
                self.stopSyncAnimation()
            }
        }
    }
    
    /// 更新菜单状态
    func updateMenuStatus() {
        DispatchQueue.main.async {
            // 更新同步状态文本
            self.syncStatusMenuItem?.title = "Sync Status: \(self.currentState.displayName)"
            
            // 更新暂停/恢复按钮
            switch self.currentState {
            case .syncing:
                self.pauseResumeMenuItem?.title = "Pause Sync"
                self.pauseResumeMenuItem?.isEnabled = true
            case .paused:
                self.pauseResumeMenuItem?.title = "Resume Sync"
                self.pauseResumeMenuItem?.isEnabled = true
            case .idle:
                self.pauseResumeMenuItem?.title = "Start Sync"
                self.pauseResumeMenuItem?.isEnabled = true
            case .error:
                self.pauseResumeMenuItem?.title = "Retry Sync"
                self.pauseResumeMenuItem?.isEnabled = true
            }
            
            // 更新进度信息
            if let progress = self.currentProgress, self.currentState.isActive {
                let progressText = String(format: "Progress: %.1f%% (%d/%d items)",
                                        progress.completionPercentage * 100,
                                        progress.completedItems,
                                        progress.totalItems)
                self.progressMenuItem?.title = progressText
                self.progressMenuItem?.isHidden = false
            } else {
                self.progressMenuItem?.isHidden = true
            }
        }
    }
    
    /// 显示通知
    /// - Parameters:
    ///   - title: 通知标题
    ///   - message: 通知内容
    ///   - isError: 是否为错误通知
    func showNotification(title: String, message: String, isError: Bool = false) {
        let notification = NSUserNotification()
        notification.title = title
        notification.informativeText = message
        notification.soundName = isError ? NSUserNotificationDefaultSoundName : nil
        
        NSUserNotificationCenter.default.deliver(notification)
    }
    
    // MARK: - Private Methods
    
    private func setupStateObservation() {
        // 监听同步引擎状态变化
        Task {
            for await state in syncEngine.stateChanges {
                await MainActor.run {
                    self.currentState = state
                    self.updateTrayIcon(state: state)
                    self.updateMenuStatus()
                    self.handleStateChange(state)
                }
            }
        }
        
        // 监听进度更新
        Task {
            for await progress in syncEngine.progressUpdates {
                await MainActor.run {
                    self.currentProgress = progress
                    self.updateMenuStatus()
                }
            }
        }
    }
    
    private func handleStateChange(_ state: SyncEngineState) {
        switch state {
        case .syncing:
            showNotification(title: "Sync Started", message: "File synchronization has started")
        case .paused:
            showNotification(title: "Sync Paused", message: "File synchronization has been paused")
        case .idle:
            if currentState != .idle { // 避免初始状态通知
                showNotification(title: "Sync Completed", message: "File synchronization completed successfully")
            }
        case .error(let message):
            showNotification(
                title: "Sync Error",
                message: "Synchronization error: \(message)",
                isError: true
            )
        }
    }
    
    private func startSyncAnimation() {
        guard let button = statusItem?.button else { return }
        
        // 创建旋转动画
        let rotation = CABasicAnimation(keyPath: "transform.rotation")
        rotation.fromValue = 0
        rotation.toValue = Double.pi * 2
        rotation.duration = 2.0
        rotation.repeatCount = .infinity
        
        button.layer?.add(rotation, forKey: "syncRotation")
    }
    
    private func stopSyncAnimation() {
        guard let button = statusItem?.button else { return }
        button.layer?.removeAnimation(forKey: "syncRotation")
    }
    
    private func cleanup() {
        stopSyncAnimation()
        
        if let statusItem = statusItem {
            NSStatusBar.system.removeStatusItem(statusItem)
        }
        
        cancellables.removeAll()
    }
    // MARK: - Menu Actions
    
    @objc private func openSyncFolder() {
        // 获取同步文件夹路径（这里需要从配置中获取）
        let syncPath = NSHomeDirectory() + "/CloudSync" // 默认路径，实际应从配置获取
        
        let url = URL(fileURLWithPath: syncPath)
        NSWorkspace.shared.open(url)
    }
    
    @objc private func toggleSync() {
        Task {
            do {
                switch currentState {
                case .idle, .error:
                    try await syncEngine.startSync()
                case .syncing:
                    await syncEngine.pauseSync()
                case .paused:
                    try await syncEngine.resumeSync()
                }
            } catch {
                await MainActor.run {
                    self.showNotification(
                        title: "Sync Error",
                        message: "Failed to toggle sync: \(error.localizedDescription)",
                        isError: true
                    )
                }
            }
        }
    }
    
    @objc private func openSettings() {
        // 打开设置窗口
        print("Settings requested")
        
        NSApp.activate(ignoringOtherApps: true)
        
        // 发送通知给主应用显示设置视图
        NotificationCenter.default.post(
            name: NSNotification.Name("ShowSettingsView"),
            object: nil
        )
    }
    
    @objc private func quitApp() {
        // 显示确认对话框
        let alert = NSAlert()
        alert.messageText = "Quit macOS Sync Client?"
        alert.informativeText = "This will stop file synchronization. Are you sure you want to quit?"
        alert.alertStyle = .warning
        alert.addButton(withTitle: "Quit")
        alert.addButton(withTitle: "Cancel")
        
        let response = alert.runModal()
        
        if response == .alertFirstButtonReturn {
            // 用户确认退出
            Task {
                await syncEngine.stopSync()
                
                DispatchQueue.main.async {
                    NSApp.terminate(nil)
                }
            }
        }
    }
}

// MARK: - Extensions

extension SystemTrayManager {
    /// 获取当前同步状态的用户友好描述
    var statusDescription: String {
        switch currentState {
        case .idle:
            return "Ready to sync"
        case .syncing:
            if let progress = currentProgress {
                return "Syncing \(progress.completedItems)/\(progress.totalItems) items"
            } else {
                return "Syncing..."
            }
        case .paused:
            return "Sync paused"
        case .error(let message):
            return "Error: \(message)"
        }
    }
    
    /// 检查是否应该显示进度信息
    var shouldShowProgress: Bool {
        return currentState.isActive && currentProgress != nil
    }
}