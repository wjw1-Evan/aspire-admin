import SwiftUI

/// 选择性同步视图，提供文件夹树形选择界面
struct SelectiveSyncView: View {
    @StateObject private var selectiveSync: SelectiveSync
    @State private var folderTree: FolderNode?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var searchText = ""
    @State private var expandedNodes: Set<String> = []
    @State private var selectedSize: Int64 = 0
    @State private var selectedCount: Int = 0
    
    init(selectiveSync: SelectiveSync) {
        self._selectiveSync = StateObject(wrappedValue: selectiveSync)
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header with statistics
            headerView
            
            Divider()
            
            // Search bar
            searchBar
            
            // Main content
            if isLoading {
                loadingView
            } else if let tree = folderTree {
                folderTreeView(tree)
            } else {
                emptyStateView
            }
            
            Divider()
            
            // Footer with actions
            footerView
        }
        .navigationTitle("Selective Sync")
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button("Refresh") {
                    Task {
                        await loadFolderTree()
                    }
                }
                .disabled(isLoading)
                
                Button("Apply Changes") {
                    Task {
                        await applyChanges()
                    }
                }
                .disabled(isLoading)
                .buttonStyle(.borderedProminent)
            }
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An unknown error occurred")
        }
        .task {
            await loadFolderTree()
            updateStatistics()
            
            // Listen for selection changes
            Task {
                for await _ in selectiveSync.selectionChanges {
                    updateStatistics()
                }
            }
        }
    }
    
    // MARK: - Header View
    
    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Selected Folders")
                    .font(.headline)
                Text("\(selectedCount) folders")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("Total Size")
                    .font(.headline)
                Text(ByteCountFormatter.string(fromByteCount: selectedSize, countStyle: .file))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
    }
    
    // MARK: - Search Bar
    
    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
            
            TextField("Search folders...", text: $searchText)
                .textFieldStyle(PlainTextFieldStyle())
            
            if !searchText.isEmpty {
                Button(action: { searchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
    
    // MARK: - Loading View
    
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            
            Text("Loading folder structure...")
                .font(.headline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: - Empty State View
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "folder.badge.questionmark")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text("No Folders Found")
                .font(.headline)
                .foregroundColor(.secondary)
            
            Text("Unable to load the folder structure from the cloud.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Retry") {
                Task {
                    await loadFolderTree()
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
    
    // MARK: - Folder Tree View
    
    private func folderTreeView(_ tree: FolderNode) -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(filteredChildren(of: tree), id: \.id) { child in
                    FolderRowView(
                        node: child,
                        level: 0,
                        expandedNodes: $expandedNodes,
                        selectiveSync: selectiveSync,
                        onToggleSelection: { node, selected in
                            Task {
                                await toggleFolderSelection(node, selected: selected)
                            }
                        }
                    )
                }
            }
            .padding(.vertical, 8)
        }
    }
    
    // MARK: - Footer View
    
    private var footerView: some View {
        HStack {
            Button("Select All") {
                Task {
                    await selectAllFolders()
                }
            }
            .disabled(isLoading)
            
            Button("Deselect All") {
                Task {
                    await deselectAllFolders()
                }
            }
            .disabled(isLoading)
            
            Spacer()
            
            if isLoading {
                ProgressView()
                    .scaleEffect(0.8)
                Text("Applying changes...")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
    }
    
    // MARK: - Helper Methods
    
    private func filteredChildren(of node: FolderNode) -> [FolderNode] {
        if searchText.isEmpty {
            return node.children
        }
        
        return node.children.filter { child in
            child.name.localizedCaseInsensitiveContains(searchText) ||
            hasMatchingDescendant(child)
        }
    }
    
    private func hasMatchingDescendant(_ node: FolderNode) -> Bool {
        if node.name.localizedCaseInsensitiveContains(searchText) {
            return true
        }
        
        return node.children.contains { hasMatchingDescendant($0) }
    }
    
    private func loadFolderTree() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let tree = try await selectiveSync.getFolderTree()
            await MainActor.run {
                self.folderTree = tree
                // Auto-expand root level
                self.expandedNodes = Set(tree.children.map { $0.path })
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.showingError = true
            }
        }
        
        await MainActor.run {
            self.isLoading = false
        }
    }
    
    private func toggleFolderSelection(_ node: FolderNode, selected: Bool) async {
        do {
            try await selectiveSync.selectFolder(node.path, selected: selected)
            
            // Update parent selection based on children
            if findParent(of: node) != nil {
                try await selectiveSync.updateParentSelection(childPath: node.path)
            }
            
            // Update children selection if this is a parent
            if !node.children.isEmpty {
                try await selectiveSync.updateChildrenSelection(
                    parentPath: node.path,
                    selected: selected,
                    recursive: true
                )
            }
            
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.showingError = true
            }
        }
    }
    
    private func selectAllFolders() async {
        do {
            try await selectiveSync.selectAllFolders()
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.showingError = true
            }
        }
    }
    
    private func deselectAllFolders() async {
        do {
            try await selectiveSync.deselectAllFolders()
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.showingError = true
            }
        }
    }
    
    private func applyChanges() async {
        isLoading = true
        
        do {
            try await selectiveSync.applySelectionChanges()
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.showingError = true
            }
        }
        
        await MainActor.run {
            self.isLoading = false
        }
    }
    
    private func updateStatistics() {
        selectedCount = selectiveSync.getSelectedCount()
        selectedSize = selectiveSync.getSelectedSize()
    }
    
    private func findParent(of node: FolderNode) -> FolderNode? {
        guard let tree = folderTree,
              let parentPath = node.parentPath else {
            return nil
        }
        
        return tree.findNode(at: parentPath)
    }
}

// MARK: - Folder Row View

struct FolderRowView: View {
    let node: FolderNode
    let level: Int
    @Binding var expandedNodes: Set<String>
    let selectiveSync: SelectiveSync
    let onToggleSelection: (FolderNode, Bool) -> Void
    
    @State private var isSelected: Bool = false
    @State private var isHovered: Bool = false
    
    private var isExpanded: Bool {
        expandedNodes.contains(node.path)
    }
    
    private var hasChildren: Bool {
        !node.children.isEmpty
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Main row
            HStack(spacing: 8) {
                // Indentation
                Rectangle()
                    .fill(Color.clear)
                    .frame(width: CGFloat(level * 20))
                
                // Expand/collapse button
                Button(action: toggleExpansion) {
                    Image(systemName: hasChildren ? (isExpanded ? "chevron.down" : "chevron.right") : "")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.secondary)
                        .frame(width: 16, height: 16)
                }
                .buttonStyle(PlainButtonStyle())
                .disabled(!hasChildren)
                
                // Selection checkbox
                Button(action: toggleSelection) {
                    Image(systemName: isSelected ? "checkmark.square.fill" : "square")
                        .font(.system(size: 16))
                        .foregroundColor(isSelected ? .accentColor : .secondary)
                }
                .buttonStyle(PlainButtonStyle())
                
                // Folder icon
                Image(systemName: "folder.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.blue)
                
                // Folder name
                Text(node.name)
                    .font(.system(size: 14))
                    .lineLimit(1)
                
                Spacer()
                
                // Folder size
                Text(node.formattedSize)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .monospacedDigit()
                
                // Selection indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.green)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(isHovered ? Color.accentColor.opacity(0.1) : Color.clear)
            )
            .onHover { hovering in
                isHovered = hovering
            }
            
            // Children (if expanded)
            if isExpanded && hasChildren {
                ForEach(node.children, id: \.id) { child in
                    FolderRowView(
                        node: child,
                        level: level + 1,
                        expandedNodes: $expandedNodes,
                        selectiveSync: selectiveSync,
                        onToggleSelection: onToggleSelection
                    )
                }
            }
        }
        .onAppear {
            updateSelectionState()
            
            // Listen for selection changes
            Task {
                for await change in selectiveSync.selectionChanges {
                    if change.path == node.path {
                        updateSelectionState()
                    }
                }
            }
        }
    }
    
    private func toggleExpansion() {
        if isExpanded {
            expandedNodes.remove(node.path)
        } else {
            expandedNodes.insert(node.path)
        }
    }
    
    private func toggleSelection() {
        let newSelection = !isSelected
        onToggleSelection(node, newSelection)
    }
    
    private func updateSelectionState() {
        isSelected = selectiveSync.isSelected(node.path)
    }
}

// MARK: - Preview

#Preview {
    NavigationView {
        SelectiveSyncView(
            selectiveSync: SelectiveSync(
                cloudAPIService: MockCloudAPIService(),
                localDBService: LocalDBService(),
                syncEngine: MockSyncEngine()
            )
        )
    }
    .frame(width: 800, height: 600)
}

// MARK: - Mock Services for Preview

@MainActor
private class MockCloudAPIService: CloudAPIServiceProtocol {
    func authenticate(credentials: AuthCredentials) async throws -> AuthToken {
        return AuthToken(accessToken: "mock", refreshToken: "mock", expiresAt: Date().addingTimeInterval(3600))
    }
    
    func refreshToken(_ token: AuthToken) async throws -> AuthToken { return token }
    func logout() async throws {}
    
    func listFolder(at path: String) async throws -> [CloudItem] {
        // Mock folder structure
        if path == "/" {
            return [
                .folder(CloudFolder(id: "1", name: "Documents", path: "/Documents", modifiedDate: Date(), itemCount: 5)),
                .folder(CloudFolder(id: "2", name: "Photos", path: "/Photos", modifiedDate: Date(), itemCount: 100)),
                .folder(CloudFolder(id: "3", name: "Projects", path: "/Projects", modifiedDate: Date(), itemCount: 10))
            ]
        } else if path == "/Documents" {
            return [
                .folder(CloudFolder(id: "4", name: "Work", path: "/Documents/Work", modifiedDate: Date(), itemCount: 3)),
                .folder(CloudFolder(id: "5", name: "Personal", path: "/Documents/Personal", modifiedDate: Date(), itemCount: 2))
            ]
        }
        return []
    }
    
    func uploadFile(at localPath: String, to cloudPath: String, progressHandler: @escaping (Double) -> Void) async throws -> CloudFile {
        return CloudFile(id: UUID().uuidString, name: "mock", path: cloudPath, size: 0, modifiedDate: Date(), hash: "mock", mimeType: "application/octet-stream")
    }
    func downloadFile(from cloudPath: String, to localPath: String, progressHandler: @escaping (Double) -> Void) async throws {}
    func deleteFile(at cloudPath: String) async throws {}
    func moveFile(from: String, to: String) async throws -> CloudFile {
        return CloudFile(id: UUID().uuidString, name: "mock", path: to, size: 0, modifiedDate: Date(), hash: "mock", mimeType: "application/octet-stream")
    }
    func copyFile(from: String, to: String) async throws -> CloudFile {
        return CloudFile(id: UUID().uuidString, name: "mock", path: to, size: 0, modifiedDate: Date(), hash: "mock", mimeType: "application/octet-stream")
    }
    func createFolder(at cloudPath: String) async throws -> CloudFolder {
        return CloudFolder(id: UUID().uuidString, name: "mock", path: cloudPath, modifiedDate: Date(), itemCount: 0)
    }
    func deleteFolder(at cloudPath: String) async throws {}
    func getFileInfo(at cloudPath: String) async throws -> CloudFile {
        return CloudFile(id: UUID().uuidString, name: "mock", path: cloudPath, size: 0, modifiedDate: Date(), hash: "mock", mimeType: "application/octet-stream")
    }
    func getFolderInfo(at cloudPath: String) async throws -> CloudFolder {
        return CloudFolder(id: UUID().uuidString, name: "mock", path: cloudPath, modifiedDate: Date(), itemCount: 0)
    }
    func getChanges(since cursor: String?) async throws -> ChangeSet {
        return ChangeSet(changes: [], cursor: "mock", hasMore: false)
    }
    func connectWebSocket() async throws -> WebSocketConnection {
        fatalError("Not implemented in mock")
    }
    func subscribeToChanges(paths: [String]) async throws {}
}

@MainActor
private class MockSyncEngine: SyncEngineProtocol {
    func startSync() async throws {}
    func pauseSync() async {}
    func resumeSync() async throws {}
    func stopSync() async {}
    func syncFile(at path: String) async throws {}
    func syncFolder(at path: String, recursive: Bool) async throws {}
    func deleteItem(at path: String) async throws {}
    func moveItem(from: String, to: String) async throws {}
    func renameItem(at path: String, to newName: String) async throws {}
    func getSyncState() -> SyncEngineState { return .idle }
    func getItemState(at path: String) -> SyncItem.SyncState? { return .synced }
    func getSyncProgress() -> SyncProgress {
        return SyncProgress(totalItems: 0, completedItems: 0, totalBytes: 0, transferredBytes: 0, currentOperation: nil, estimatedTimeRemaining: nil)
    }
    var stateChanges: AsyncStream<SyncEngineState> { AsyncStream { _ in } }
    var itemChanges: AsyncStream<SyncItemChange> { AsyncStream { _ in } }
    var progressUpdates: AsyncStream<SyncProgress> { AsyncStream { _ in } }
}