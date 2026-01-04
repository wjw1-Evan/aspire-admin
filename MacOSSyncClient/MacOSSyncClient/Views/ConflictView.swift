import SwiftUI

/// 冲突解决视图，显示和处理同步冲突
struct ConflictView: View {
    let syncItems: [SyncItem]
    @ObservedObject var statusManager: StatusManager
    @State private var selectedConflict: SyncItem?
    @State private var showingResolutionSheet = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Sync Conflicts")
                    .font(.headline)
                
                Spacer()
                
                if !syncItems.isEmpty {
                    Button("Resolve All") {
                        // TODO: Implement resolve all conflicts
                    }
                    .buttonStyle(BorderedProminentButtonStyle())
                }
            }
            .padding()
            .background(Color(NSColor.controlBackgroundColor))
            
            Divider()
            
            // Conflict list
            if syncItems.isEmpty {
                EmptyConflictView()
            } else {
                List(syncItems, id: \.id) { item in
                    ConflictRow(
                        item: item,
                        statusManager: statusManager
                    ) {
                        selectedConflict = item
                        showingResolutionSheet = true
                    }
                }
                .listStyle(PlainListStyle())
            }
        }
        .sheet(isPresented: $showingResolutionSheet) {
            if let conflict = selectedConflict {
                ConflictResolutionSheet(
                    item: conflict,
                    statusManager: statusManager
                ) {
                    showingResolutionSheet = false
                    selectedConflict = nil
                }
            }
        }
    }
}

/// 空冲突状态视图
struct EmptyConflictView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 48))
                .foregroundColor(.green)
            
            Text("No Conflicts")
                .font(.title2)
                .foregroundColor(.primary)
            
            Text("All files are synchronized successfully")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// 冲突行视图
struct ConflictRow: View {
    let item: SyncItem
    @ObservedObject var statusManager: StatusManager
    let onResolve: () -> Void
    
    var body: some View {
        HStack {
            // Conflict icon
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
                .font(.title2)
                .frame(width: 30)
            
            VStack(alignment: .leading, spacing: 4) {
                // File name
                Text(item.name)
                    .font(.headline)
                
                // File path
                Text(item.localPath)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                // Conflict info
                if let conflictInfo = item.conflictInfo {
                    ConflictInfoView(conflictInfo: conflictInfo)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 8) {
                // File size comparison
                VStack(alignment: .trailing, spacing: 2) {
                    if let conflictInfo = item.conflictInfo {
                        HStack {
                            Text("Local:")
                            Text(ByteCountFormatter.string(fromByteCount: conflictInfo.localSize, countStyle: .file))
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                        
                        HStack {
                            Text("Cloud:")
                            Text(ByteCountFormatter.string(fromByteCount: conflictInfo.cloudSize, countStyle: .file))
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                }
                
                // Resolve button
                Button("Resolve") {
                    onResolve()
                }
                .buttonStyle(BorderedProminentButtonStyle())
                .controlSize(.small)
            }
        }
        .padding(.vertical, 8)
    }
}

/// 冲突信息视图
struct ConflictInfoView: View {
    let conflictInfo: ConflictInfo
    
    var body: some View {
        HStack {
            // Conflict type
            Text(conflictInfo.conflictType.displayName)
                .font(.caption)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(conflictTypeColor.opacity(0.2))
                .foregroundColor(conflictTypeColor)
                .cornerRadius(4)
            
            // Modified dates
            Text("Local: \(conflictInfo.localModifiedDate, style: .relative)")
                .font(.caption2)
                .foregroundColor(.secondary)
            
            Text("•")
                .font(.caption2)
                .foregroundColor(.secondary)
            
            Text("Cloud: \(conflictInfo.cloudModifiedDate, style: .relative)")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
    
    private var conflictTypeColor: Color {
        switch conflictInfo.conflictType {
        case .contentConflict:
            return .orange
        case .nameConflict:
            return .blue
        case .typeConflict:
            return .red
        }
    }
}

/// 冲突解决弹窗
struct ConflictResolutionSheet: View {
    let item: SyncItem
    @ObservedObject var statusManager: StatusManager
    let onDismiss: () -> Void
    @State private var selectedResolution: ConflictInfo.ResolutionOption?
    
    var conflictInfo: ConflictInfo? {
        return item.conflictInfo
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Conflict overview
                ConflictOverviewView(item: item)
                
                Divider()
                
                // Resolution options
                if let conflictInfo = conflictInfo {
                    ResolutionOptionsView(
                        conflictInfo: conflictInfo,
                        selectedResolution: $selectedResolution
                    )
                }
                
                Spacer()
                
                // Action buttons
                HStack {
                    Button("Cancel") {
                        onDismiss()
                    }
                    .buttonStyle(BorderlessButtonStyle())
                    
                    Spacer()
                    
                    Button("Resolve") {
                        resolveConflict()
                    }
                    .buttonStyle(BorderedProminentButtonStyle())
                    .disabled(selectedResolution == nil)
                }
            }
            .padding()
            .navigationTitle("Resolve Conflict")
        }
        .frame(width: 500, height: 600)
    }
    
    private func resolveConflict() {
        guard let resolution = selectedResolution else { return }
        
        // TODO: Implement actual conflict resolution
        print("Resolving conflict for \(item.name) with resolution: \(resolution)")
        
        onDismiss()
    }
}

/// 冲突概览视图
struct ConflictOverviewView: View {
    let item: SyncItem
    
    var body: some View {
        VStack(spacing: 16) {
            // File icon and name
            HStack {
                Image(systemName: item.type == .folder ? "folder.fill" : "doc.fill")
                    .font(.largeTitle)
                    .foregroundColor(item.type == .folder ? .blue : .gray)
                
                VStack(alignment: .leading) {
                    Text(item.name)
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text(item.localPath)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Conflict details
            if let conflictInfo = item.conflictInfo {
                VStack(spacing: 8) {
                    Text("Conflict Type: \(conflictInfo.conflictType.displayName)")
                        .font(.headline)
                    
                    HStack {
                        VStack(alignment: .leading) {
                            Text("Local Version")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            
                            Text("Modified: \(conflictInfo.localModifiedDate, style: .date)")
                                .font(.caption)
                            
                            Text("Size: \(ByteCountFormatter.string(fromByteCount: conflictInfo.localSize, countStyle: .file))")
                                .font(.caption)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                        
                        VStack(alignment: .leading) {
                            Text("Cloud Version")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            
                            Text("Modified: \(conflictInfo.cloudModifiedDate, style: .date)")
                                .font(.caption)
                            
                            Text("Size: \(ByteCountFormatter.string(fromByteCount: conflictInfo.cloudSize, countStyle: .file))")
                                .font(.caption)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(8)
                    }
                }
            }
        }
    }
}

/// 解决选项视图
struct ResolutionOptionsView: View {
    let conflictInfo: ConflictInfo
    @Binding var selectedResolution: ConflictInfo.ResolutionOption?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Choose Resolution")
                .font(.headline)
            
            ForEach(conflictInfo.resolutionOptions, id: \.self) { option in
                ResolutionOptionRow(
                    option: option,
                    isSelected: selectedResolution == option
                ) {
                    selectedResolution = option
                }
            }
        }
    }
}

/// 解决选项行
struct ResolutionOptionRow: View {
    let option: ConflictInfo.ResolutionOption
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack {
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .foregroundColor(isSelected ? .accentColor : .secondary)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(option.displayName)
                        .font(.body)
                        .fontWeight(.medium)
                    
                    Text(option.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
            }
            .padding()
            .background(isSelected ? Color.accentColor.opacity(0.1) : Color.clear)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Extensions

extension ConflictInfo.ConflictType {
    var displayName: String {
        switch self {
        case .contentConflict:
            return "Content Conflict"
        case .nameConflict:
            return "Name Conflict"
        case .typeConflict:
            return "Type Conflict"
        }
    }
}

extension ConflictInfo.ResolutionOption {
    var displayName: String {
        switch self {
        case .keepLocal:
            return "Keep Local Version"
        case .keepCloud:
            return "Keep Cloud Version"
        case .keepBoth:
            return "Keep Both Versions"
        case .merge:
            return "Merge Folders"
        }
    }
    
    var description: String {
        switch self {
        case .keepLocal:
            return "Replace the cloud version with your local version"
        case .keepCloud:
            return "Replace your local version with the cloud version"
        case .keepBoth:
            return "Keep both versions by renaming one of them"
        case .merge:
            return "Merge the contents of both folders"
        }
    }
}

#Preview {
    ConflictView(
        syncItems: [
            SyncItem(
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
                    itemName: "file1.txt",
                    conflictType: .contentConflict,
                    localModifiedDate: Date(),
                    cloudModifiedDate: Date().addingTimeInterval(-3600),
                    localSize: 1024,
                    cloudSize: 2048,
                    resolutionOptions: [.keepLocal, .keepCloud, .keepBoth]
                )
            )
        ],
        statusManager: StatusManager()
    )
    .frame(width: 600, height: 400)
}