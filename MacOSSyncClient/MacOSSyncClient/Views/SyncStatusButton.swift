import SwiftUI

/// 同步状态按钮，显示当前同步状态和进度
struct SyncStatusButton: View {
    let syncProgress: SyncProgress
    @ObservedObject var statusManager: StatusManager
    @State private var showingProgressDetail = false
    
    var body: some View {
        Button(action: {
            showingProgressDetail = true
        }) {
            HStack(spacing: 6) {
                // Status icon
                statusIcon
                    .font(.system(size: 14))
                    .foregroundColor(statusColor)
                
                // Status text
                Text(statusText)
                    .font(.caption)
                    .foregroundColor(.primary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusBackgroundColor)
            .cornerRadius(6)
        }
        .buttonStyle(PlainButtonStyle())
        .help(statusHelpText)
        .popover(isPresented: $showingProgressDetail) {
            SyncStatusPopover(
                syncProgress: syncProgress,
                statusManager: statusManager
            )
        }
    }
    
    // MARK: - Computed Properties
    
    private var statusIcon: Image {
        let statistics = statusManager.getStatusStatistics()
        
        if statistics.hasActiveSync {
            return Image(systemName: "arrow.triangle.2.circlepath")
        } else if statistics.needsAttention {
            return Image(systemName: "exclamationmark.triangle.fill")
        } else if statistics.totalItems > 0 {
            return Image(systemName: "checkmark.circle.fill")
        } else {
            return Image(systemName: "cloud")
        }
    }
    
    private var statusColor: Color {
        let statistics = statusManager.getStatusStatistics()
        
        if statistics.hasActiveSync {
            return .blue
        } else if statistics.needsAttention {
            return .orange
        } else if statistics.totalItems > 0 {
            return .green
        } else {
            return .gray
        }
    }
    
    private var statusText: String {
        let statistics = statusManager.getStatusStatistics()
        
        if statistics.hasActiveSync {
            if syncProgress.totalItems > 0 {
                return "\(syncProgress.completedItems)/\(syncProgress.totalItems)"
            } else {
                return "Syncing"
            }
        } else if statistics.needsAttention {
            return "\(statistics.attentionItems) issues"
        } else if statistics.totalItems > 0 {
            return "Up to date"
        } else {
            return "No files"
        }
    }
    
    private var statusBackgroundColor: Color {
        let statistics = statusManager.getStatusStatistics()
        
        if statistics.hasActiveSync {
            return .blue.opacity(0.1)
        } else if statistics.needsAttention {
            return .orange.opacity(0.1)
        } else {
            return Color(NSColor.controlBackgroundColor)
        }
    }
    
    private var statusHelpText: String {
        let statistics = statusManager.getStatusStatistics()
        
        if statistics.hasActiveSync {
            return "Sync in progress - click for details"
        } else if statistics.needsAttention {
            return "\(statistics.conflictItems) conflicts, \(statistics.errorItems) errors"
        } else if statistics.totalItems > 0 {
            return "\(statistics.totalItems) files synchronized"
        } else {
            return "No files to sync"
        }
    }
}

/// 同步状态弹窗详情
struct SyncStatusPopover: View {
    let syncProgress: SyncProgress
    @ObservedObject var statusManager: StatusManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text("Sync Status")
                    .font(.headline)
                Spacer()
                Button("Close") {
                    // Popover will close automatically
                }
                .buttonStyle(BorderlessButtonStyle())
            }
            
            Divider()
            
            // Progress overview
            let statistics = statusManager.getStatusStatistics()
            
            if statistics.hasActiveSync {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Sync Progress")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    ProgressView(value: syncProgress.completionPercentage) {
                        HStack {
                            Text("\(syncProgress.completedItems) of \(syncProgress.totalItems) items")
                            Spacer()
                            Text("\(Int(syncProgress.completionPercentage * 100))%")
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                    
                    if let currentOperation = syncProgress.currentOperation {
                        Text("Current: \(currentOperation)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    if let timeRemaining = syncProgress.formattedTimeRemaining {
                        Text("Time remaining: \(timeRemaining)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            // Statistics
            VStack(alignment: .leading, spacing: 6) {
                Text("File Status")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                StatusStatRow(
                    icon: "checkmark.circle.fill",
                    color: .green,
                    label: "Synced",
                    count: statistics.syncedItems
                )
                
                if statistics.uploadingItems > 0 {
                    StatusStatRow(
                        icon: "arrow.up.circle.fill",
                        color: .blue,
                        label: "Uploading",
                        count: statistics.uploadingItems
                    )
                }
                
                if statistics.downloadingItems > 0 {
                    StatusStatRow(
                        icon: "arrow.down.circle.fill",
                        color: .blue,
                        label: "Downloading",
                        count: statistics.downloadingItems
                    )
                }
                
                if statistics.conflictItems > 0 {
                    StatusStatRow(
                        icon: "exclamationmark.triangle.fill",
                        color: .orange,
                        label: "Conflicts",
                        count: statistics.conflictItems
                    )
                }
                
                if statistics.errorItems > 0 {
                    StatusStatRow(
                        icon: "xmark.circle.fill",
                        color: .red,
                        label: "Errors",
                        count: statistics.errorItems
                    )
                }
                
                if statistics.localOnlyItems > 0 {
                    StatusStatRow(
                        icon: "doc.fill",
                        color: .gray,
                        label: "Local only",
                        count: statistics.localOnlyItems
                    )
                }
                
                if statistics.cloudOnlyItems > 0 {
                    StatusStatRow(
                        icon: "cloud.fill",
                        color: .gray,
                        label: "Cloud only",
                        count: statistics.cloudOnlyItems
                    )
                }
            }
            
            // Last updated
            Text("Last updated: \(statistics.lastUpdated, style: .relative)")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(width: 250)
    }
}

/// 状态统计行
struct StatusStatRow: View {
    let icon: String
    let color: Color
    let label: String
    let count: Int
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 16)
            
            Text(label)
                .font(.caption)
            
            Spacer()
            
            Text("\(count)")
                .font(.caption)
                .fontWeight(.medium)
        }
    }
}

#Preview {
    HStack {
        SyncStatusButton(
            syncProgress: SyncProgress(
                totalItems: 10,
                completedItems: 7,
                totalBytes: 10240,
                transferredBytes: 7168,
                currentOperation: "Uploading file.txt",
                estimatedTimeRemaining: 30
            ),
            statusManager: StatusManager()
        )
        
        SyncStatusButton(
            syncProgress: SyncProgress(
                totalItems: 0,
                completedItems: 0,
                totalBytes: 0,
                transferredBytes: 0
            ),
            statusManager: StatusManager()
        )
    }
    .padding()
}