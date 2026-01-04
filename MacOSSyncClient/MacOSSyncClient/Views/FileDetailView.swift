import SwiftUI

/// 文件详情视图，显示文件的详细信息和同步状态
struct FileDetailView: View {
    let item: SyncItem
    @ObservedObject var statusManager: StatusManager
    @Environment(\.dismiss) private var dismiss
    
    var statusInfo: StatusInfo {
        return statusManager.getStatusInfo(for: item)
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // File header
                    FileHeaderView(item: item, statusInfo: statusInfo)
                    
                    Divider()
                    
                    // File details
                    FileDetailsSection(item: item)
                    
                    Divider()
                    
                    // Sync status
                    SyncStatusSection(item: item, statusInfo: statusInfo)
                    
                    // Conflict details (if applicable)
                    if item.syncState == .conflict, let conflictInfo = item.conflictInfo {
                        Divider()
                        ConflictDetailsSection(conflictInfo: conflictInfo)
                    }
                    
                    Divider()
                    
                    // Actions
                    FileActionsSection(item: item)
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("File Details")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .frame(width: 500, height: 600)
    }
}

/// 文件头部视图
struct FileHeaderView: View {
    let item: SyncItem
    let statusInfo: StatusInfo
    
    var body: some View {
        HStack {
            // File icon
            Image(systemName: item.type == .folder ? "folder.fill" : "doc.fill")
                .font(.system(size: 48))
                .foregroundColor(item.type == .folder ? .blue : .gray)
            
            VStack(alignment: .leading, spacing: 4) {
                // File name
                Text(item.name)
                    .font(.title2)
                    .fontWeight(.semibold)
                
                // File path
                Text(item.localPath)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                
                // Status badge
                HStack(spacing: 4) {
                    Image(systemName: statusInfo.icon.rawValue)
                        .foregroundColor(statusInfo.color.swiftUIColor)
                        .font(.caption)
                    
                    Text(statusInfo.displayText)
                        .font(.caption)
                        .foregroundColor(statusInfo.color.swiftUIColor)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(statusInfo.color.swiftUIColor.opacity(0.1))
                .cornerRadius(4)
            }
            
            Spacer()
        }
    }
}

/// 文件详情部分
struct FileDetailsSection: View {
    let item: SyncItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("File Information")
                .font(.headline)
            
            DetailRow(label: "Type", value: item.type == .folder ? "Folder" : "File")
            
            if item.type == .file {
                DetailRow(
                    label: "Size",
                    value: ByteCountFormatter.string(fromByteCount: item.size, countStyle: .file)
                )
            }
            
            DetailRow(
                label: "Modified",
                value: DateFormatter.localizedString(from: item.modifiedDate, dateStyle: .medium, timeStyle: .short)
            )
            
            if !item.hash.isEmpty {
                DetailRow(label: "Checksum", value: item.hash)
            }
            
            DetailRow(label: "Cloud ID", value: item.cloudId)
            
            if let parentId = item.parentId {
                DetailRow(label: "Parent ID", value: parentId.uuidString)
            }
        }
    }
}

/// 同步状态部分
struct SyncStatusSection: View {
    let item: SyncItem
    let statusInfo: StatusInfo
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Sync Status")
                .font(.headline)
            
            DetailRow(label: "Status", value: statusInfo.displayText)
            
            if let lastSyncDate = item.lastSyncDate {
                DetailRow(
                    label: "Last Synced",
                    value: DateFormatter.localizedString(from: lastSyncDate, dateStyle: .medium, timeStyle: .short)
                )
            }
            
            DetailRow(
                label: "Last Updated",
                value: DateFormatter.localizedString(from: statusInfo.lastUpdated, dateStyle: .medium, timeStyle: .short)
            )
            
            if let progress = statusInfo.progress {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Progress")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Spacer()
                        Text("\(Int(progress * 100))%")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    ProgressView(value: progress)
                }
            }
            
            if let errorMessage = statusInfo.errorMessage {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Error")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.red)
                    
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(8)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(4)
                }
            }
        }
    }
}

/// 冲突详情部分
struct ConflictDetailsSection: View {
    let conflictInfo: ConflictInfo
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Conflict Information")
                .font(.headline)
                .foregroundColor(.orange)
            
            DetailRow(label: "Conflict Type", value: conflictInfo.conflictType.displayName)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Version Comparison")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Local Version")
                            .font(.caption)
                            .fontWeight(.medium)
                        
                        Text("Modified: \(conflictInfo.localModifiedDate, style: .date)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Text("Size: \(ByteCountFormatter.string(fromByteCount: conflictInfo.localSize, countStyle: .file))")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(4)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Cloud Version")
                            .font(.caption)
                            .fontWeight(.medium)
                        
                        Text("Modified: \(conflictInfo.cloudModifiedDate, style: .date)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Text("Size: \(ByteCountFormatter.string(fromByteCount: conflictInfo.cloudSize, countStyle: .file))")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(4)
                }
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text("Resolution Options")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                ForEach(conflictInfo.resolutionOptions, id: \.self) { option in
                    Text("• \(option.displayName)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
}

/// 文件操作部分
struct FileActionsSection: View {
    let item: SyncItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Actions")
                .font(.headline)
            
            VStack(spacing: 8) {
                Button(action: {
                    NSWorkspace.shared.selectFile(item.localPath, inFileViewerRootedAtPath: "")
                }) {
                    HStack {
                        Image(systemName: "folder")
                        Text("Show in Finder")
                        Spacer()
                    }
                }
                .buttonStyle(BorderedButtonStyle())
                
                Button(action: {
                    NSPasteboard.general.clearContents()
                    NSPasteboard.general.setString(item.localPath, forType: .string)
                }) {
                    HStack {
                        Image(systemName: "doc.on.doc")
                        Text("Copy Path")
                        Spacer()
                    }
                }
                .buttonStyle(BorderedButtonStyle())
                
                if item.syncState == .conflict {
                    Button(action: {
                        // TODO: Implement conflict resolution
                    }) {
                        HStack {
                            Image(systemName: "exclamationmark.triangle")
                            Text("Resolve Conflict")
                            Spacer()
                        }
                    }
                    .buttonStyle(BorderedProminentButtonStyle())
                }
                
                if item.syncState == .error {
                    Button(action: {
                        // TODO: Implement retry sync
                    }) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                            Text("Retry Sync")
                            Spacer()
                        }
                    }
                    .buttonStyle(BorderedProminentButtonStyle())
                }
                
                Button(action: {
                    // TODO: Implement force sync
                }) {
                    HStack {
                        Image(systemName: "arrow.triangle.2.circlepath")
                        Text("Force Sync")
                        Spacer()
                    }
                }
                .buttonStyle(BorderedButtonStyle())
            }
        }
    }
}

/// 详情行视图
struct DetailRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .frame(width: 100, alignment: .leading)
            
            Text(value)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .textSelection(.enabled)
            
            Spacer()
        }
    }
}

/// 详细进度视图
struct DetailedProgressView: View {
    let syncProgress: SyncProgress
    @ObservedObject var statusManager: StatusManager
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 20) {
                // Overall progress
                VStack(alignment: .leading, spacing: 8) {
                    Text("Overall Progress")
                        .font(.headline)
                    
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
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Transfer Progress")
                            .font(.headline)
                        
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
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Current Operation")
                            .font(.headline)
                        
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text(currentOperation)
                                .font(.body)
                        }
                    }
                }
                
                // Time remaining
                if let timeRemaining = syncProgress.formattedTimeRemaining {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Estimated Time Remaining")
                            .font(.headline)
                        
                        Text(timeRemaining)
                            .font(.title2)
                            .fontWeight(.semibold)
                    }
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("Sync Progress")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .frame(width: 400, height: 500)
    }
}

#Preview {
    FileDetailView(
        item: SyncItem(
            cloudId: "1",
            localPath: "/Users/user/Documents/file1.txt",
            cloudPath: "/Documents/file1.txt",
            name: "file1.txt",
            type: .file,
            size: 1024,
            modifiedDate: Date(),
            syncState: .conflict,
            hash: "abc123",
            conflictInfo: ConflictInfo(
                itemId: UUID(),
                itemName: "example.txt",
                conflictType: .contentConflict,
                localModifiedDate: Date(),
                cloudModifiedDate: Date().addingTimeInterval(-3600),
                localSize: 1024,
                cloudSize: 2048,
                resolutionOptions: [.keepLocal, .keepCloud, .keepBoth]
            )
        ),
        statusManager: StatusManager()
    )
}