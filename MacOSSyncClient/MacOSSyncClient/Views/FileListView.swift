import SwiftUI

/// 文件列表视图，显示同步项目和状态
struct FileListView: View {
    @Binding var syncItems: [SyncItem]
    @Binding var searchText: String
    @ObservedObject var statusManager: StatusManager
    @State private var sortOrder: SortOrder = .name
    @State private var selectedItems: Set<UUID> = []
    @State private var showingItemDetail = false
    @State private var selectedItem: SyncItem?
    
    var filteredItems: [SyncItem] {
        let filtered = searchText.isEmpty ? syncItems : syncItems.filter { item in
            item.name.localizedCaseInsensitiveContains(searchText) ||
            item.localPath.localizedCaseInsensitiveContains(searchText)
        }
        
        return filtered.sorted { lhs, rhs in
            switch sortOrder {
            case .name:
                return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
            case .size:
                return lhs.size < rhs.size
            case .modified:
                return lhs.modifiedDate > rhs.modifiedDate
            case .status:
                return lhs.syncState.rawValue < rhs.syncState.rawValue
            }
        }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with sort options
            HStack {
                Text("\(filteredItems.count) items")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Menu("Sort") {
                    ForEach(SortOrder.allCases, id: \.self) { order in
                        Button(action: {
                            sortOrder = order
                        }) {
                            HStack {
                                Text(order.displayName)
                                if sortOrder == order {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                }
                .menuStyle(BorderlessButtonMenuStyle())
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(NSColor.controlBackgroundColor))
            
            Divider()
            
            // File list
            if filteredItems.isEmpty {
                EmptyStateView(searchText: searchText)
            } else {
                List(filteredItems, id: \.id, selection: $selectedItems) { item in
                    FileListRow(
                        item: item,
                        statusManager: statusManager
                    )
                    .onTapGesture(count: 2) {
                        selectedItem = item
                        showingItemDetail = true
                    }
                    .contextMenu {
                        FileContextMenu(item: item)
                    }
                }
                .listStyle(PlainListStyle())
            }
        }
        .sheet(isPresented: $showingItemDetail) {
            if let item = selectedItem {
                FileDetailView(item: item, statusManager: statusManager)
            }
        }
    }
}

/// 文件列表行视图
struct FileListRow: View {
    let item: SyncItem
    @ObservedObject var statusManager: StatusManager
    
    var statusInfo: StatusInfo {
        return statusManager.getStatusInfo(for: item)
    }
    
    var body: some View {
        HStack {
            // File icon
            Image(systemName: item.type == .folder ? "folder.fill" : "doc.fill")
                .foregroundColor(item.type == .folder ? .blue : .gray)
                .frame(width: 20)
            
            VStack(alignment: .leading, spacing: 2) {
                // File name
                Text(item.name)
                    .font(.system(.body, design: .default))
                    .lineLimit(1)
                
                // File path
                Text(item.localPath)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                // Status indicator
                HStack(spacing: 4) {
                    Image(systemName: statusInfo.icon.rawValue)
                        .foregroundColor(statusInfo.color.swiftUIColor)
                        .font(.caption)
                    
                    Text(statusInfo.displayText)
                        .font(.caption)
                        .foregroundColor(statusInfo.color.swiftUIColor)
                }
                
                // File size and date
                HStack(spacing: 8) {
                    if item.type == .file {
                        Text(ByteCountFormatter.string(fromByteCount: item.size, countStyle: .file))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    
                    Text(item.modifiedDate, style: .relative)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            // Progress indicator for active transfers
            if statusInfo.isInProgress, let progress = statusInfo.progress {
                VStack {
                    ProgressView(value: progress)
                        .frame(width: 60)
                    Text("\(Int(progress * 100))%")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

/// 空状态视图
struct EmptyStateView: View {
    let searchText: String
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: searchText.isEmpty ? "folder" : "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text(searchText.isEmpty ? "No files to sync" : "No files match your search")
                .font(.title2)
                .foregroundColor(.secondary)
            
            if searchText.isEmpty {
                Text("Files will appear here when you start syncing")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            } else {
                Text("Try adjusting your search terms")
                    .font(.body)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// 文件上下文菜单
struct FileContextMenu: View {
    let item: SyncItem
    
    var body: some View {
        Group {
            Button("Show in Finder") {
                NSWorkspace.shared.selectFile(item.localPath, inFileViewerRootedAtPath: "")
            }
            
            Button("Copy Path") {
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(item.localPath, forType: .string)
            }
            
            Divider()
            
            if item.syncState == .conflict {
                Button("Resolve Conflict") {
                    // TODO: Implement conflict resolution
                }
            }
            
            if item.syncState == .error {
                Button("Retry Sync") {
                    // TODO: Implement retry sync
                }
            }
            
            Button("Force Sync") {
                // TODO: Implement force sync
            }
        }
    }
}

// MARK: - Sort Order

extension FileListView {
    enum SortOrder: String, CaseIterable {
        case name = "name"
        case size = "size"
        case modified = "modified"
        case status = "status"
        
        var displayName: String {
            switch self {
            case .name:
                return "Name"
            case .size:
                return "Size"
            case .modified:
                return "Modified"
            case .status:
                return "Status"
            }
        }
    }
}

#Preview {
    FileListView(
        syncItems: .constant([
            SyncItem(
                cloudId: "1",
                localPath: "/Users/user/Documents/file1.txt",
                cloudPath: "/Documents/file1.txt",
                name: "file1.txt",
                type: .file,
                size: 1024,
                modifiedDate: Date(),
                syncState: .synced,
                hash: "abc123"
            ),
            SyncItem(
                cloudId: "2",
                localPath: "/Users/user/Documents/folder1",
                cloudPath: "/Documents/folder1",
                name: "folder1",
                type: .folder,
                size: 0,
                modifiedDate: Date(),
                syncState: .uploading,
                hash: ""
            )
        ]),
        searchText: .constant(""),
        statusManager: StatusManager()
    )
    .frame(width: 600, height: 400)
}