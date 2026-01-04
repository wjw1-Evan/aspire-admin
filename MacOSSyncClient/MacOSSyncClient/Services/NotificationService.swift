import Foundation
import OSLog
import UserNotifications

/// Service for managing user notifications
class NotificationService: NSObject, ObservableObject, NotificationServiceProtocol {
    private let logger = Logger(subsystem: "com.syncclient.macos", category: "NotificationService")
    private let notificationCenter: UNUserNotificationCenter?

    init(
        notificationCenter: UNUserNotificationCenter? = NotificationService.makeNotificationCenter()
    ) {
        self.notificationCenter = notificationCenter
        super.init()
        self.notificationCenter?.delegate = self
    }

    private static func makeNotificationCenter() -> UNUserNotificationCenter? {
        let env = ProcessInfo.processInfo.environment
        // 多重检测测试环境，避免在无 UI 的 runner 中调用 UserNotifications
        let isTesting =
            env["XCTestConfigurationFilePath"] != nil || env["XCTestBundlePath"] != nil
            || env["XCTestSessionIdentifier"] != nil || NSClassFromString("XCTestCase") != nil
        return isTesting ? nil : UNUserNotificationCenter.current()
    }

    // MARK: - Permission

    func requestPermissions() async throws -> Bool {
        guard let notificationCenter else { return false }
        return try await notificationCenter.requestAuthorization(options: [.alert, .sound, .badge])
    }

    var notificationsEnabled: Bool {
        get async {
            guard let notificationCenter else { return false }
            let settings = await notificationCenter.notificationSettings()
            return settings.authorizationStatus == .authorized
                || settings.authorizationStatus == .provisional
        }
    }

    // MARK: - Public Notification APIs

    func showSyncCompletedNotification(itemCount: Int) async throws {
        guard let notificationCenter else { return }
        let content = UNMutableNotificationContent()
        content.title = "同步完成"
        content.body = "已同步 \(itemCount) 个文件"
        content.categoryIdentifier = NotificationType.syncCompleted.categoryIdentifier
        content.sound = .default

        try await scheduleNotification(
            identifier: NotificationType.syncCompleted.identifier, content: content)
    }

    func showSyncErrorNotification(error: String) async throws {
        guard let notificationCenter else { return }
        let content = UNMutableNotificationContent()
        content.title = "同步出错"
        content.body = error
        content.categoryIdentifier = NotificationType.syncError.categoryIdentifier
        content.sound = .default

        try await scheduleNotification(
            identifier: NotificationType.syncError.identifier, content: content)
    }

    func showConflictDetectedNotification(fileName: String) async throws {
        guard let notificationCenter else { return }
        let content = UNMutableNotificationContent()
        content.title = "检测到冲突"
        content.body = "文件 \(fileName) 发生冲突，请处理。"
        content.categoryIdentifier = NotificationType.conflictDetected.categoryIdentifier
        content.sound = .default

        try await scheduleNotification(
            identifier: NotificationType.conflictDetected.identifier, content: content)
    }

    func showOfflineFileAvailableNotification(fileName: String) async throws {
        guard let notificationCenter else { return }
        let content = UNMutableNotificationContent()
        content.title = "可离线访问"
        content.body = "文件 \(fileName) 已可离线访问"
        content.categoryIdentifier = NotificationType.offlineFileAvailable.categoryIdentifier
        content.sound = .default

        try await scheduleNotification(
            identifier: NotificationType.offlineFileAvailable.identifier, content: content)
    }

    func showStorageQuotaWarningNotification(usagePercentage: Double) async throws {
        guard let notificationCenter else { return }
        let content = UNMutableNotificationContent()
        content.title = "存储配额预警"
        let percentageString = String(format: "%.1f%%", usagePercentage)
        content.body = "存储使用率已达 \(percentageString)，请及时清理"
        content.categoryIdentifier = NotificationType.storageQuotaWarning.categoryIdentifier
        content.sound = .default

        try await scheduleNotification(
            identifier: NotificationType.storageQuotaWarning.identifier, content: content)
    }

    func showNetworkRestoredNotification() async throws {
        guard let notificationCenter else { return }
        let content = UNMutableNotificationContent()
        content.title = "网络连接已恢复"
        content.body = "同步将继续进行"
        content.categoryIdentifier = NotificationType.networkRestored.categoryIdentifier
        content.sound = .default

        try await scheduleNotification(
            identifier: NotificationType.networkRestored.identifier, content: content)
    }

    // MARK: - Legacy/Progress Hooks

    func updateProgress(_ progress: SyncProgress) async {
        // Only show notifications for significant progress milestones
        if progress.completedItems > 0 && progress.completedItems % 10 == 0 {
            await showProgressNotification(progress)
        }
    }

    private func showProgressNotification(_ progress: SyncProgress) async {
        guard let notificationCenter else { return }
        let content = UNMutableNotificationContent()
        content.title = "同步进度"
        content.body = "已同步 \(progress.completedItems)/\(progress.totalItems)"
        content.sound = nil  // Silent notification
        content.categoryIdentifier = NotificationType.syncCompleted.categoryIdentifier

        try? await scheduleNotification(identifier: "sync-progress", content: content)
    }

    // MARK: - Conflict bridge

    func notifyConflictDetected(_ conflict: ConflictInfo) async {
        try? await showConflictDetectedNotification(fileName: conflict.itemName)
    }

    // MARK: - Cleanup

    func clearAllNotifications() async {
        guard let notificationCenter else { return }
        notificationCenter.removeAllPendingNotificationRequests()
        notificationCenter.removeAllDeliveredNotifications()
    }

    func clearNotifications(ofType type: NotificationType) async {
        guard let notificationCenter else { return }
        notificationCenter.removePendingNotificationRequests(withIdentifiers: [type.identifier])
    }

    func cleanup() async {
        await clearAllNotifications()
    }

    // MARK: - Helpers

    private func scheduleNotification(identifier: String, content: UNMutableNotificationContent)
        async throws
    {
        guard let notificationCenter else { return }
        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: nil
        )
        do {
            try await notificationCenter.add(request)
        } catch {
            logger.error("Failed to show notification \(identifier): \(error.localizedDescription)")
            throw error
        }
    }
}

extension NotificationService: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler:
            @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }
}
