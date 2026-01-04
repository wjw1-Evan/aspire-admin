import Foundation
import SwiftUI

/// 状态信息
struct StatusInfo: Codable, Hashable, Identifiable {
    let id = UUID()
    let path: String
    let state: SyncItem.SyncState
    let progress: Double?
    let lastUpdated: Date
    let errorMessage: String?
    let icon: StatusIcon
    let color: StatusColor
    let displayText: String
    
    init(
        path: String,
        state: SyncItem.SyncState,
        progress: Double? = nil,
        lastUpdated: Date = Date(),
        errorMessage: String? = nil
    ) {
        self.path = path
        self.state = state
        self.progress = progress
        self.lastUpdated = lastUpdated
        self.errorMessage = errorMessage
        self.icon = StatusIcon.from(state: state)
        self.color = StatusColor.from(state: state)
        self.displayText = Self.displayText(for: state, progress: progress)
    }
    
    private static func displayText(for state: SyncItem.SyncState, progress: Double?) -> String {
        switch state {
        case .synced:
            return "Synced"
        case .uploading:
            if let progress = progress {
                return "Uploading \(Int(progress * 100))%"
            }
            return "Uploading..."
        case .downloading:
            if let progress = progress {
                return "Downloading \(Int(progress * 100))%"
            }
            return "Downloading..."
        case .localOnly:
            return "Local Only"
        case .cloudOnly:
            return "Cloud Only"
        case .conflict:
            return "Conflict"
        case .error:
            return "Error"
        case .paused:
            return "Paused"
        }
    }
    
    var isInProgress: Bool {
        return state == .uploading || state == .downloading
    }
    
    var hasError: Bool {
        return state == .error || state == .conflict
    }
}

enum StatusIcon: String, Codable, CaseIterable {
    case synced = "checkmark.circle.fill"
    case uploading = "arrow.up.circle.fill"
    case downloading = "arrow.down.circle.fill"
    case localOnly = "doc.fill"
    case cloudOnly = "cloud.fill"
    case conflict = "exclamationmark.triangle.fill"
    case error = "xmark.circle.fill"
    case paused = "pause.circle.fill"
    
    static func from(state: SyncItem.SyncState) -> StatusIcon {
        switch state {
        case .synced: return .synced
        case .uploading: return .uploading
        case .downloading: return .downloading
        case .localOnly: return .localOnly
        case .cloudOnly: return .cloudOnly
        case .conflict: return .conflict
        case .error: return .error
        case .paused: return .paused
        }
    }
}

enum StatusColor: String, Codable, CaseIterable {
    case green = "green"
    case blue = "blue"
    case gray = "gray"
    case yellow = "yellow"
    case red = "red"
    case orange = "orange"
    
    static func from(state: SyncItem.SyncState) -> StatusColor {
        switch state {
        case .synced: return .green
        case .uploading, .downloading: return .blue
        case .localOnly, .cloudOnly: return .gray
        case .conflict: return .yellow
        case .error: return .red
        case .paused: return .orange
        }
    }
    
    var swiftUIColor: Color {
        switch self {
        case .green: return .green
        case .blue: return .blue
        case .gray: return .gray
        case .yellow: return .yellow
        case .red: return .red
        case .orange: return .orange
        }
    }
}

/// 状态统计信息
struct StatusStatistics: Codable, Hashable {
    let totalItems: Int
    let syncedItems: Int
    let uploadingItems: Int
    let downloadingItems: Int
    let localOnlyItems: Int
    let cloudOnlyItems: Int
    let conflictItems: Int
    let errorItems: Int
    let pausedItems: Int
    let lastUpdated: Date
    
    init(
        totalItems: Int = 0,
        syncedItems: Int = 0,
        uploadingItems: Int = 0,
        downloadingItems: Int = 0,
        localOnlyItems: Int = 0,
        cloudOnlyItems: Int = 0,
        conflictItems: Int = 0,
        errorItems: Int = 0,
        pausedItems: Int = 0,
        lastUpdated: Date = Date()
    ) {
        self.totalItems = totalItems
        self.syncedItems = syncedItems
        self.uploadingItems = uploadingItems
        self.downloadingItems = downloadingItems
        self.localOnlyItems = localOnlyItems
        self.cloudOnlyItems = cloudOnlyItems
        self.conflictItems = conflictItems
        self.errorItems = errorItems
        self.pausedItems = pausedItems
        self.lastUpdated = lastUpdated
    }
    
    var activeItems: Int {
        return uploadingItems + downloadingItems
    }
    
    var attentionItems: Int {
        return conflictItems + errorItems
    }
    
    var syncCompletionPercentage: Double {
        guard totalItems > 0 else { return 0.0 }
        return Double(syncedItems) / Double(totalItems)
    }
    
    var hasActiveSync: Bool {
        return activeItems > 0
    }
    
    var needsAttention: Bool {
        return attentionItems > 0
    }
}

/// 状态变化事件
struct StatusChange: Codable, Hashable {
    let path: String
    let oldState: SyncItem.SyncState?
    let newState: SyncItem.SyncState
    let timestamp: Date
    let progress: Double?
    
    init(
        path: String,
        oldState: SyncItem.SyncState?,
        newState: SyncItem.SyncState,
        timestamp: Date = Date(),
        progress: Double? = nil
    ) {
        self.path = path
        self.oldState = oldState
        self.newState = newState
        self.timestamp = timestamp
        self.progress = progress
    }
}
