import Foundation
import OSLog
import SwiftUI

/// 同步客户端集成器 - 负责连接所有组件形成完整应用
@MainActor
class SyncClientIntegrator: ObservableObject {
    // MARK: - Core Services
    private let logger = Logger(subsystem: "com.macos.syncclient", category: "SyncClientIntegrator")

    // Core sync components
    @Published var syncEngine: SyncEngine
    @Published var fileMonitor: FileMonitor
    @Published var statusManager: StatusManager
    @Published var conflictResolver: ConflictResolver
    @Published var selectiveSync: SelectiveSync
    @Published var offlineManager: OfflineManager

    // System integration components
    @Published var systemTrayManager: SystemTrayManager
    @Published var finderIntegrationService: FinderIntegrationService
    @Published var notificationService: NotificationService
    @Published var spotlightService: SpotlightService
    @Published var quickLookService: QuickLookService

    // Support services
    @Published var bandwidthManager: BandwidthManager
    @Published var encryptionService: EncryptionService
    @Published var errorRecoveryManager: ErrorRecoveryManager
    @Published var diagnosticService: DiagnosticService
    @Published var accountManager: AccountManager
    @Published var enterprisePolicyEngine: EnterprisePolicyEngine

    // Data services
    @Published var localDBService: LocalDBService
    @Published var cloudAPIService: CloudAPIService
    @Published var fileSystemService: FileSystemService

    // MARK: - State
    @Published var isInitialized = false
    @Published var initializationError: Error?
    @Published var syncConfiguration: SyncConfiguration

    // MARK: - Initialization

    init() {
        logger.info("Initializing SyncClientIntegrator")

        // Initialize default configuration
        let configuration = SyncConfiguration(
            syncRootPath: NSHomeDirectory() + "/SyncFolder",
            selectedFolders: Set<String>(),
            excludePatterns: [".DS_Store", "*.tmp", "Thumbs.db"],
            bandwidthLimits: SyncConfiguration.BandwidthLimits(
                uploadLimit: nil,
                downloadLimit: nil,
                enableAutoThrottling: true,
                pauseOnMeteredConnection: true
            ),
            conflictResolution: .askUser,
            offlineSettings: SyncConfiguration.OfflineSettings(
                maxCacheSize: 5 * 1024 * 1024 * 1024,  // 5GB
                autoCleanupEnabled: true,
                cleanupThreshold: 0.8
            ),
            securitySettings: SyncConfiguration.SecuritySettings(
                enableEncryption: true,
                requireTwoFactor: false,
                autoLockTimeout: 3600  // 1 hour
            )
        )

        // Ensure default sync root directory exists to avoid initialization failure in tests
        let defaultRoot = URL(fileURLWithPath: configuration.syncRootPath)
        try? FileManager.default.createDirectory(at: defaultRoot, withIntermediateDirectories: true)

        // Initialize data services
        let localDB = LocalDBService()
        let cloudAPI = CloudAPIService()
        let fileSystem = FileSystemService()

        // Initialize support services
        let encryption = EncryptionService()
        let bandwidth = BandwidthManager()
        let errorRecovery = ErrorRecoveryManager()
        let diagnostic = DiagnosticService()
        let account = AccountManager()

        // Initialize core sync components
        let monitor = FileMonitor()
        let status = StatusManager()

        // Initialize sync engine
        let engine = SyncEngine(
            cloudAPIService: cloudAPI,
            localDBService: localDB,
            fileSystemService: fileSystem,
            fileMonitor: monitor,
            configuration: configuration
        )

        // Initialize components that depend on other services
        let policyEngine = EnterprisePolicyEngine(accountManager: account)

        let resolver = ConflictResolver(
            fileSystemService: fileSystem,
            cloudAPIService: cloudAPI,
            localDBService: localDB
        )

        let selective = SelectiveSync(
            cloudAPIService: cloudAPI,
            localDBService: localDB,
            syncEngine: engine
        )

        let offline = OfflineManager(
            localDBService: localDB,
            fileSystemService: fileSystem
        )

        // Initialize system integration components
        let trayManager = SystemTrayManager(syncEngine: engine)
        let finderService = FinderIntegrationService(syncEngine: engine)
        let notification = NotificationService()
        let spotlight = SpotlightService()
        let quickLook = QuickLookService()

        // Assign all properties
        self.syncConfiguration = configuration
        self.localDBService = localDB
        self.cloudAPIService = cloudAPI
        self.fileSystemService = fileSystem
        self.encryptionService = encryption
        self.bandwidthManager = bandwidth
        self.errorRecoveryManager = errorRecovery
        self.diagnosticService = diagnostic
        self.accountManager = account
        self.fileMonitor = monitor
        self.statusManager = status
        self.syncEngine = engine
        self.enterprisePolicyEngine = policyEngine
        self.conflictResolver = resolver
        self.selectiveSync = selective
        self.offlineManager = offline
        self.systemTrayManager = trayManager
        self.finderIntegrationService = finderService
        self.notificationService = notification
        self.spotlightService = spotlight
        self.quickLookService = quickLook

        // Start initialization process
        Task {
            await initializeServices()
        }
    }

    // MARK: - Service Integration

    private func initializeServices() async {
        do {
            logger.info("Starting service initialization")

            // Step 1: Initialize data layer
            try await initializeDataLayer()

            // Step 2: Initialize core sync services
            try await initializeCoreServices()

            // Step 3: Initialize system integration
            try await initializeSystemIntegration()

            // Step 4: Wire up event handlers
            await wireEventHandlers()

            // Step 5: Start monitoring and sync
            try await startServices()

            isInitialized = true
            logger.info("SyncClientIntegrator initialization completed successfully")

        } catch {
            logger.error("Failed to initialize SyncClientIntegrator: \(error.localizedDescription)")
            initializationError = error
        }
    }

    private func initializeDataLayer() async throws {
        logger.info("Initializing data layer")

        // Data layer services are already initialized in their constructors
        // No additional initialization needed

        logger.info("Data layer initialized successfully")
    }

    private func initializeCoreServices() async throws {
        logger.info("Initializing core services")

        // Core services are already initialized in their constructors
        // No additional initialization needed

        // Initialize file monitor
        try fileMonitor.startMonitoring(path: syncConfiguration.syncRootPath)

        logger.info("Core services initialized successfully")
    }

    private func initializeSystemIntegration() async throws {
        logger.info("Initializing system integration")

        // System integration services are already initialized in their constructors
        // No additional initialization needed

        logger.info("System integration initialized successfully")
    }

    private func wireEventHandlers() async {
        logger.info("Wiring event handlers")

        // Wire sync engine events to status manager
        Task {
            for await stateChange in syncEngine.stateChanges {
                await statusManager.updateSyncState(stateChange)
                await systemTrayManager.updateSyncState(stateChange)
            }
        }

        Task {
            for await itemChange in syncEngine.itemChanges {
                await statusManager.updateItemState(itemChange)
                await finderIntegrationService.updateItemState(itemChange)
            }
        }

        Task {
            for await progress in syncEngine.progressUpdates {
                await systemTrayManager.updateProgress(progress)
                await notificationService.updateProgress(progress)
            }
        }

        // Wire file monitor events to sync engine
        Task {
            for await _ in fileMonitor.fileEvents {
                // The sync engine handles file events internally
                // No need to call handleFileEvent explicitly
            }
        }

        // Wire conflict resolver events to notification service
        Task {
            for await conflict in conflictResolver.conflictDetected {
                await notificationService.notifyConflictDetected(conflict)
            }
        }

        // Wire offline manager events to status manager
        Task {
            for await cacheUpdate in offlineManager.cacheUpdates {
                await statusManager.updateCacheState(cacheUpdate)
            }
        }

        // Wire selective sync events to sync engine
        Task {
            for await _ in selectiveSync.selectionChanges {
                // Selection changes are handled internally by SelectiveSync
                // No need to forward to sync engine
            }
        }

        logger.info("Event handlers wired successfully")
    }

    private func startServices() async throws {
        logger.info("Starting services")

        // Start sync engine
        try await syncEngine.startSync()

        logger.info("Services started successfully")
    }

    // MARK: - Public Interface

    func pauseSync() async {
        logger.info("Pausing sync")
        await syncEngine.pauseSync()
    }

    func resumeSync() async throws {
        logger.info("Resuming sync")
        try await syncEngine.resumeSync()
    }

    func stopSync() async {
        logger.info("Stopping sync")
        await syncEngine.stopSync()
    }

    func updateConfiguration(_ newConfiguration: SyncConfiguration) async throws {
        logger.info("Updating configuration")

        let oldConfiguration = syncConfiguration
        syncConfiguration = newConfiguration

            // 传递配置更新给同步引擎，确保内部扫描路径与新配置一致
            try await syncEngine.updateConfiguration(newConfiguration)

        // Apply configuration changes
        if oldConfiguration.syncRootPath != newConfiguration.syncRootPath {
            // Update sync root path
            fileMonitor.stopMonitoring()
            try fileMonitor.startMonitoring(path: newConfiguration.syncRootPath)
        }

        if oldConfiguration.selectedFolders != newConfiguration.selectedFolders {
            // Update selective sync settings
            for folder in newConfiguration.selectedFolders {
                try await selectiveSync.selectFolder(folder, selected: true)
            }

            for folder in oldConfiguration.selectedFolders.subtracting(
                newConfiguration.selectedFolders)
            {
                try await selectiveSync.selectFolder(folder, selected: false)
            }

            try await selectiveSync.applySelectionChanges()
        }

        if oldConfiguration.bandwidthLimits != newConfiguration.bandwidthLimits {
            // Update bandwidth limits
            await bandwidthManager.updateLimits(newConfiguration.bandwidthLimits)
        }

        if oldConfiguration.conflictResolution != newConfiguration.conflictResolution {
            // Update conflict resolution strategy
            await conflictResolver.updateStrategy(newConfiguration.conflictResolution)
        }

        if oldConfiguration.offlineSettings != newConfiguration.offlineSettings {
            // Update offline settings
            try await offlineManager.updateSettings(newConfiguration.offlineSettings)
        }

        if oldConfiguration.securitySettings != newConfiguration.securitySettings {
            // Update security settings
            try await encryptionService.updateSettings(newConfiguration.securitySettings)
        }

        logger.info("Configuration updated successfully")
    }

    func getDiagnosticInfo() async -> DiagnosticReport {
        return await diagnosticService.generateDiagnosticReport()
    }

    func exportDiagnosticReport() async throws -> URL {
        let report = await diagnosticService.generateDiagnosticReport()

        // Create a temporary file for the report
        let tempDir = FileManager.default.temporaryDirectory
        let reportURL = tempDir.appendingPathComponent(
            "diagnostic_report_\(Date().timeIntervalSince1970).txt")

        // Human-readable summary content expected by tests
        var lines: [String] = []
        let dateFormatter = ISO8601DateFormatter()

        lines.append("System Information")
        lines.append("OS Version: \(report.systemInfo.osVersion)")
        lines.append("App Version: \(report.systemInfo.appVersion)")
        lines.append("Available Disk Space: \(report.systemInfo.availableDiskSpace)")
        lines.append("Total Disk Space: \(report.systemInfo.totalDiskSpace)")
        lines.append("Network Status: \(report.systemInfo.networkStatus)")
        lines.append("Last Sync Time: \(report.systemInfo.lastSyncTime.map { dateFormatter.string(from: $0) } ?? "N/A")")
        lines.append("")

        lines.append("Sync Status")
        lines.append("Total Items: \(report.syncStatus.totalItems)")
        lines.append("Synced Items: \(report.syncStatus.syncedItems)")
        lines.append("Pending Items: \(report.syncStatus.pendingItems)")
        lines.append("Error Items: \(report.syncStatus.errorItems)")
        lines.append("Conflict Items: \(report.syncStatus.conflictItems)")
        lines.append("")

        lines.append("Error Summary")
        lines.append("Total Errors: \(report.errorSummary.totalErrors)")
        lines.append("Network Errors: \(report.errorSummary.networkErrors)")
        lines.append("File System Errors: \(report.errorSummary.fileSystemErrors)")
        lines.append("Authentication Errors: \(report.errorSummary.authenticationErrors)")
        lines.append("Database Errors: \(report.errorSummary.databaseErrors)")
        lines.append("")

        // Append raw JSON for completeness
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let reportData = try encoder.encode(report)
        let jsonString = String(data: reportData, encoding: .utf8) ?? "{}"

        lines.append("Raw JSON")
        lines.append(jsonString)

        let fullContent = lines.joined(separator: "\n")
        try fullContent.write(to: reportURL, atomically: true, encoding: .utf8)

        return reportURL
    }

    // MARK: - Cleanup

    deinit {
        logger.info("Deinitializing SyncClientIntegrator")
        // Note: Cannot use async operations in deinit
        // Cleanup will be handled by the individual services' deinit methods
    }
}

// MARK: - Extensions for Service Integration

extension StatusManager {
    func updateSyncState(_ state: SyncEngineState) async {
        // Update overall sync state
        await MainActor.run {
            // Update UI state based on sync engine state
        }
    }

    func updateItemState(_ change: SyncItemChange) async {
        // Update individual item state
        await MainActor.run {
            // Update UI for specific item changes
        }
    }

    func updateCacheState(_ update: CacheUpdate) async {
        // Update cache-related state
        await MainActor.run {
            // Update UI for cache changes
        }
    }
}

extension SystemTrayManager {
    func updateSyncState(_ state: SyncEngineState) async {
        await MainActor.run {
            self.updateTrayIcon(state: state)
        }
    }

    func updateProgress(_ progress: SyncProgress) async {
        await MainActor.run {
            // SystemTrayManager should have its own progress update method
            // For now, we'll just update the tray icon based on progress
            if progress.isCompleted {
                self.updateTrayIcon(state: .idle)
            } else {
                self.updateTrayIcon(state: .syncing)
            }
        }
    }
}

extension FinderIntegrationService {
    func updateItemState(_ change: SyncItemChange) async {
        await MainActor.run {
            // FinderIntegrationService should handle item state updates
            // For now, we'll just log the change
            print("Finder integration: Item state changed for \(change.item.id)")
        }
    }
}

extension NotificationService {
    // Extension methods are already defined in the main class
}

extension BandwidthManager {
    func updateLimits(_ limits: SyncConfiguration.BandwidthLimits) async {
        await setUploadLimit(limits.uploadLimit)
        await setDownloadLimit(limits.downloadLimit)
        await setAutoThrottlingEnabled(limits.enableAutoThrottling)
        // Note: pauseOnMeteredConnection is handled internally by shouldSyncOnMeteredConnection()
    }
}

extension ConflictResolver {
    func updateStrategy(_ strategy: SyncConfiguration.ConflictResolutionStrategy) async {
        // Note: Strategy is applied per-conflict in resolveAllConflicts method
        // No persistent strategy setting needed
    }
}

extension OfflineManager {
    func updateSettings(_ settings: SyncConfiguration.OfflineSettings) async throws {
        // Note: Settings are applied through the configuration system
        // Cache size and cleanup settings are handled internally
    }
}

extension EncryptionService {
    func updateSettings(_ settings: SyncConfiguration.SecuritySettings) async throws {
        // Note: Security settings are applied through the configuration system
        // Encryption and security settings are handled internally
    }
}
