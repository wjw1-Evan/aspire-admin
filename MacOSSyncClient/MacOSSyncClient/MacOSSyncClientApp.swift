import AppKit
import OSLog
import SwiftUI

@main
struct MacOSSyncClientApp: App {
    // MARK: - App State

    @StateObject private var syncClientIntegrator = SyncClientIntegrator()
    @StateObject private var appState = AppState()

    private let logger = Logger(subsystem: "com.macos.syncclient", category: "MacOSSyncClientApp")

    // MARK: - Scene Configuration

    init() {
        guard Self.ensureSingleInstance() else {
            // 终止重复实例，避免多开带来的状态冲突
            exit(0)
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(syncClientIntegrator)
                .environmentObject(appState)
                .onReceive(
                    NotificationCenter.default.publisher(
                        for: NSNotification.Name("ShowSettingsView"))
                ) { _ in
                    // 处理从系统托盘打开设置的请求
                    appState.showSettings = true
                }
                .onReceive(
                    NotificationCenter.default.publisher(
                        for: NSNotification.Name("ShowActivityView"))
                ) { _ in
                    // 处理从系统托盘打开活动视图的请求
                    appState.showActivity = true
                }
                .task {
                    // 等待集成器初始化完成
                    while !syncClientIntegrator.isInitialized {
                        if let error = syncClientIntegrator.initializationError {
                            logger.error(
                                "Failed to initialize sync client: \(error.localizedDescription)")
                            break
                        }
                        try? await Task.sleep(nanoseconds: 100_000_000)  // 100ms
                    }

                    if syncClientIntegrator.isInitialized {
                        logger.info("Sync client initialized successfully")
                        // 更新 AppState 以使用集成的服务
                        appState.updateWithIntegratedServices(syncClientIntegrator)
                    }
                }
        }
        .windowStyle(.hiddenTitleBar)
        .commands {
            // 添加菜单栏命令
            CommandGroup(replacing: .appInfo) {
                Button("About macOS Sync Client") {
                    NSApp.orderFrontStandardAboutPanel(nil)
                }
            }

            // 添加同步控制命令
            CommandGroup(after: .appInfo) {
                Button("Start Sync") {
                    Task {
                        try? await syncClientIntegrator.resumeSync()
                    }
                }
                .keyboardShortcut("s", modifiers: [.command])

                Button("Pause Sync") {
                    Task {
                        await syncClientIntegrator.pauseSync()
                    }
                }
                .keyboardShortcut("p", modifiers: [.command])

                Divider()

                Button("Open Sync Folder") {
                    let url = URL(
                        fileURLWithPath: syncClientIntegrator.syncConfiguration.syncRootPath)
                    NSWorkspace.shared.open(url)
                }
                .keyboardShortcut("o", modifiers: [.command])
            }
        }
    }
}

// MARK: - Single Instance Guard

extension MacOSSyncClientApp {
    /// 确保同步客户端仅运行单个实例。如果检测到已有实例，激活它并让当前进程退出。
    @discardableResult
    private static func ensureSingleInstance() -> Bool {
        guard let bundleId = Bundle.main.bundleIdentifier else { return true }

        let running = NSWorkspace.shared.runningApplications.filter {
            $0.bundleIdentifier == bundleId
        }

        // 当前实例计入列表，因此超过 1 说明已存在其他实例
        guard running.count > 1 else { return true }

        // 激活已运行的实例，前置到前台
        if let existing = running.first(where: { !$0.isEqual(NSRunningApplication.current) }) {
            existing.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])
        }

        return false
    }
}

// MARK: - App State

@MainActor
class AppState: ObservableObject {
    @Published var showSettings = false
    @Published var showActivity = false
    @Published var systemTrayManager: SystemTrayManager?
    @Published var finderIntegrationService: FinderIntegrationService?
    @Published var syncClientIntegrator: SyncClientIntegrator?
    @Published var isAuthenticated = false
    @Published var currentUsername: String?

    private let logger = Logger(subsystem: "com.macos.syncclient", category: "AppState")

    init() {
        // 设置 Finder 集成通知监听
        setupFinderIntegrationNotifications()
    }

    func updateWithIntegratedServices(_ integrator: SyncClientIntegrator) {
        self.syncClientIntegrator = integrator
        self.systemTrayManager = integrator.systemTrayManager
        self.finderIntegrationService = integrator.finderIntegrationService

        logger.info("AppState updated with integrated services")
    }

    private func setupFinderIntegrationNotifications() {
        // 监听来自 Finder 扩展的通知
        NotificationCenter.default.addObserver(
            forName: Notification.Name("ShowSyncStatus"),
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.showActivity = true
            }
        }

        NotificationCenter.default.addObserver(
            forName: Notification.Name("ResolveConflict"),
            object: nil,
            queue: .main
        ) { [weak self] notification in
            if let path = notification.userInfo?["path"] as? String {
                Task { @MainActor in
                    self?.handleResolveConflict(at: path)
                }
            }
        }

        NotificationCenter.default.addObserver(
            forName: Notification.Name("MakeAvailableOffline"),
            object: nil,
            queue: .main
        ) { [weak self] notification in
            if let path = notification.userInfo?["path"] as? String {
                Task { @MainActor in
                    self?.handleMakeAvailableOffline(at: path)
                }
            }
        }

        NotificationCenter.default.addObserver(
            forName: Notification.Name("OpenSelectiveSyncSettings"),
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.showSettings = true
            }
        }

        NotificationCenter.default.addObserver(
            forName: Notification.Name("OpenSyncClient"),
            object: nil,
            queue: .main
        ) { _ in
            // 激活应用程序窗口
            NSApp.activate(ignoringOtherApps: true)
        }
    }

    private func handleResolveConflict(at path: String) {
        logger.info("Resolving conflict for file at: \(path)")

        // 使用集成的冲突解决器
        if let integrator = syncClientIntegrator {
            Task {
                do {
                    let conflicts: [ConflictInfo] = await integrator.conflictResolver
                        .detectConflicts()
                    let fileName = URL(fileURLWithPath: path).lastPathComponent
                    if conflicts.contains(where: { $0.itemName == fileName }) {
                        // 显示冲突解决界面
                        await MainActor.run {
                            self.showActivity = true
                        }
                    }
                } catch {
                    logger.error("Failed to resolve conflict: \(error.localizedDescription)")
                }
            }
        }
    }

    private func handleMakeAvailableOffline(at path: String) {
        logger.info("Making file available offline: \(path)")

        // 使用集成的离线管理器
        if let integrator = syncClientIntegrator {
            Task {
                do {
                    try await integrator.offlineManager.makeAvailableOffline(path)
                } catch {
                    logger.error(
                        "Failed to make file available offline: \(error.localizedDescription)")
                }
            }
        }
    }
}
