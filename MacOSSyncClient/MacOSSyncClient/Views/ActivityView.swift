import SwiftUI

/// 活动监控视图，显示同步进度和活动日志
struct ActivityView: View {
    @Binding var syncProgress: SyncProgress
    @ObservedObject var statusManager: StatusManager
    @State private var activityLog: [ActivityLogEntry] = []
    @State private var showingDetailedProgress = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Progress overview
            ProgressOverviewView(
                syncProgress: syncProgress,
                statusManager: statusManager,
                showingDetailedProgress: $showingDetailedProgress
            )
            
            Divider()
            
            // Activity log
            ActivityLogView(activityLog: $activityLog)
        }
        .onAppear {
            loadActivityLog()
        }
        .sheet(isPresented: $showingDetailedProgress) {
            DetailedProgressView(
                syncProgress: syncProgress,
                statusManager: statusManager
            )
        }
    }
    
    private func loadActivityLog() {
        // Sample activity log data
        activityLog = [
            ActivityLogEntry(
                timestamp: Date(),
                type: .upload,
                message: "Uploaded file1.txt",
                status: .completed,
                bytesTransferred: 1024
            ),
            ActivityLogEntry(
                timestamp: Date().addingTimeInterval(-60),
                type: .download,
                message: "Downloaded folder1/image.jpg",
                status: .completed,
                bytesTransferred: 2048
            ),
            ActivityLogEntry(
                timestamp: Date().addingTimeInterval(-120),
                type: .conflict,
                message: "Conflict detected in file2.txt",
                status: .failed,
                bytesTransferred: 0
            ),
            ActivityLogEntry(
                timestamp: Date().addingTimeInterval(-180),
                type: .upload,
                message: "Uploading document.pdf",
                status: .inProgress,
                bytesTransferred: 512
            )
        ]
    }
}

/// 进度概览视图
struct ProgressOverviewView: View {
    let syncProgress: SyncProgress
    @ObservedObject var statusManager: StatusManager
    @Binding var showingDetailedProgress: Bool
    
    var body: some View {
        VStack(spacing: 16) {
            // Overall progress
            VStack(spacing: 8) {
                HStack {
                    Text("Sync Progress")
                        .font(.headline)
                    
                    Spacer()
                    
                    Button("Details") {
                        showingDetailedProgress = true
                    }
                    .buttonStyle(BorderlessButtonStyle())
                }
                
                ProgressView(value: syncProgress.completionPercentage) {
                    HStack {
                        Text("\(syncProgress.completedItems) of \(syncProgress.totalItems) items")
                        Spacer()
                        Text("\(Int(syncProgress.completionPercentage * 100))%")
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
            }
            
            // Transfer progress
            if syncProgress.totalBytes > 0 {
                VStack(spacing: 8) {
                    HStack {
                        Text("Transfer Progress")
                            .font(.subheadline)
                        Spacer()
                        if let timeRemaining = syncProgress.formattedTimeRemaining {
                            Text(timeRemaining + " remaining")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    ProgressView(value: syncProgress.transferPercentage) {
                        HStack {
                            Text(ByteCountFormatter.string(fromByteCount: syncProgress.transferredBytes, countStyle: .file))
                            Text("of")
                            Text(ByteCountFormatter.string(fromByteCount: syncProgress.totalBytes, countStyle: .file))
                            Spacer()
                            Text("\(Int(syncProgress.transferPercentage * 100))%")
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                }
            }
            
            // Current operation
            if let currentOperation = syncProgress.currentOperation {
                HStack {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text(currentOperation)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
            }
            
            // Statistics
            let statistics = statusManager.getStatusStatistics()
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 16) {
                StatisticCard(
                    title: "Active",
                    value: statistics.activeItems,
                    color: .blue,
                    icon: "arrow.up.arrow.down.circle.fill"
                )
                
                StatisticCard(
                    title: "Conflicts",
                    value: statistics.conflictItems,
                    color: .orange,
                    icon: "exclamationmark.triangle.fill"
                )
                
                StatisticCard(
                    title: "Errors",
                    value: statistics.errorItems,
                    color: .red,
                    icon: "xmark.circle.fill"
                )
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
    }
}

/// 统计卡片
struct StatisticCard: View {
    let title: String
    let value: Int
    let color: Color
    let icon: String
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text("\(value)")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(NSColor.textBackgroundColor))
        .cornerRadius(8)
    }
}

/// 活动日志视图
struct ActivityLogView: View {
    @Binding var activityLog: [ActivityLogEntry]
    @State private var selectedLogLevel: LogLevel = .all
    
    var filteredLog: [ActivityLogEntry] {
        if selectedLogLevel == .all {
            return activityLog
        }
        return activityLog.filter { entry in
            switch selectedLogLevel {
            case .info:
                return entry.status == .completed
            case .warning:
                return entry.type == .conflict
            case .error:
                return entry.status == .failed
            default:
                return true
            }
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Log header
            HStack {
                Text("Activity Log")
                    .font(.headline)
                
                Spacer()
                
                Picker("Log Level", selection: $selectedLogLevel) {
                    ForEach(LogLevel.allCases, id: \.self) { level in
                        Text(level.displayName).tag(level)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .frame(width: 200)
            }
            .padding()
            .background(Color(NSColor.controlBackgroundColor))
            
            Divider()
            
            // Log entries
            if filteredLog.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "list.bullet")
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)
                    
                    Text("No activity to show")
                        .font(.title2)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(filteredLog, id: \.id) { entry in
                    ActivityLogRow(entry: entry)
                }
                .listStyle(PlainListStyle())
            }
        }
    }
}

/// 活动日志行
struct ActivityLogRow: View {
    let entry: ActivityLogEntry
    
    var body: some View {
        HStack {
            // Status icon
            Image(systemName: entry.statusIcon)
                .foregroundColor(entry.statusColor)
                .frame(width: 20)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.message)
                    .font(.body)
                
                HStack {
                    Text(entry.timestamp, style: .time)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if entry.bytesTransferred > 0 {
                        Text("•")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text(ByteCountFormatter.string(fromByteCount: entry.bytesTransferred, countStyle: .file))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Spacer()
            
            Text(entry.type.displayName)
                .font(.caption)
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(entry.type.backgroundColor)
                .foregroundColor(entry.type.foregroundColor)
                .cornerRadius(4)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Supporting Types

struct ActivityLogEntry: Identifiable {
    let id = UUID()
    let timestamp: Date
    let type: ActivityType
    let message: String
    let status: ActivityStatus
    let bytesTransferred: Int64
    
    var statusIcon: String {
        switch status {
        case .completed:
            return "checkmark.circle.fill"
        case .failed:
            return "xmark.circle.fill"
        case .inProgress:
            return "arrow.clockwise.circle.fill"
        }
    }
    
    var statusColor: Color {
        switch status {
        case .completed:
            return .green
        case .failed:
            return .red
        case .inProgress:
            return .blue
        }
    }
}

enum ActivityType: String, CaseIterable {
    case upload = "upload"
    case download = "download"
    case delete = "delete"
    case conflict = "conflict"
    case error = "error"
    
    var displayName: String {
        switch self {
        case .upload:
            return "Upload"
        case .download:
            return "Download"
        case .delete:
            return "Delete"
        case .conflict:
            return "Conflict"
        case .error:
            return "Error"
        }
    }
    
    var backgroundColor: Color {
        switch self {
        case .upload:
            return .blue.opacity(0.2)
        case .download:
            return .green.opacity(0.2)
        case .delete:
            return .gray.opacity(0.2)
        case .conflict:
            return .orange.opacity(0.2)
        case .error:
            return .red.opacity(0.2)
        }
    }
    
    var foregroundColor: Color {
        switch self {
        case .upload:
            return .blue
        case .download:
            return .green
        case .delete:
            return .gray
        case .conflict:
            return .orange
        case .error:
            return .red
        }
    }
}

enum ActivityStatus: String, CaseIterable {
    case completed = "completed"
    case failed = "failed"
    case inProgress = "inProgress"
}

enum LogLevel: String, CaseIterable {
    case all = "all"
    case info = "info"
    case warning = "warning"
    case error = "error"
    
    var displayName: String {
        switch self {
        case .all:
            return "All"
        case .info:
            return "Info"
        case .warning:
            return "Warning"
        case .error:
            return "Error"
        }
    }
}

#Preview {
    ActivityView(
        syncProgress: .constant(SyncProgress(
            totalItems: 10,
            completedItems: 7,
            totalBytes: 10240,
            transferredBytes: 7168,
            currentOperation: "Uploading file.txt",
            estimatedTimeRemaining: 30
        )),
        statusManager: StatusManager()
    )
    .frame(width: 600, height: 500)
}