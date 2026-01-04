import SwiftUI

/// 独立的选择性同步窗口
struct SelectiveSyncWindow: View {
    @StateObject private var selectiveSync: SelectiveSync
    @Environment(\.dismiss) private var dismiss
    
    init(
        cloudAPIService: CloudAPIServiceProtocol,
        localDBService: LocalDBService,
        syncEngine: SyncEngineProtocol
    ) {
        self._selectiveSync = StateObject(wrappedValue: SelectiveSync(
            cloudAPIService: cloudAPIService,
            localDBService: localDBService,
            syncEngine: syncEngine
        ))
    }
    
    var body: some View {
        NavigationView {
            SelectiveSyncView(selectiveSync: selectiveSync)
                .navigationTitle("Selective Sync")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") {
                            dismiss()
                        }
                    }
                }
        }
        .frame(minWidth: 600, minHeight: 500)
    }
}

#Preview {
    SelectiveSyncWindow(
        cloudAPIService: MockCloudAPIService(),
        localDBService: LocalDBService(),
        syncEngine: MockSyncEngine()
    )
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