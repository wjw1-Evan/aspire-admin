import Foundation
import UserNotifications

/// Protocol for managing system notifications
protocol NotificationServiceProtocol {
    /// Request notification permissions from the user
    func requestPermissions() async throws -> Bool
    
    /// Show a sync completion notification
    func showSyncCompletedNotification(itemCount: Int) async throws
    
    /// Show a sync error notification
    func showSyncErrorNotification(error: String) async throws
    
    /// Show a conflict detected notification
    func showConflictDetectedNotification(fileName: String) async throws
    
    /// Show an offline file available notification
    func showOfflineFileAvailableNotification(fileName: String) async throws
    
    /// Show a storage quota warning notification
    func showStorageQuotaWarningNotification(usagePercentage: Double) async throws
    
    /// Show a network connectivity restored notification
    func showNetworkRestoredNotification() async throws
    
    /// Clear all pending notifications
    func clearAllNotifications() async
    
    /// Clear notifications of a specific type
    func clearNotifications(ofType type: NotificationType) async
    
    /// Check if notifications are enabled
    var notificationsEnabled: Bool { get async }
}

/// Types of notifications that can be sent
enum NotificationType: String, CaseIterable {
    case syncCompleted = "sync.completed"
    case syncError = "sync.error"
    case conflictDetected = "conflict.detected"
    case offlineFileAvailable = "offline.file.available"
    case storageQuotaWarning = "storage.quota.warning"
    case networkRestored = "network.restored"
    
    var identifier: String {
        return "com.synclient.notification.\(self.rawValue)"
    }
    
    var categoryIdentifier: String {
        return "com.synclient.category.\(self.rawValue)"
    }
}

/// Notification priority levels
enum NotificationPriority {
    case low
    case normal
    case high
    case critical
    
    var interruptionLevel: UNNotificationInterruptionLevel {
        switch self {
        case .low:
            return .passive
        case .normal:
            return .active
        case .high:
            return .timeSensitive
        case .critical:
            return .critical
        }
    }
}