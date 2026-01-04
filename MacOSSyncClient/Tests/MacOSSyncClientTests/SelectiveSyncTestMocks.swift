import Foundation
import SwiftUI
@testable import MacOSSyncClientCore

/// 公共选择性同步测试用 Mock 实现，避免重复定义
@MainActor
class MockCloudAPIService: CloudAPIServiceProtocol {
    var folders: [String: CloudFolder] = [:]
    var folderHierarchy: [String: [String]] = [:] // parent -> children

    func setupFolderStructure(_ paths: [String]) {
        folders.removeAll()
        folderHierarchy.removeAll()

        for path in paths {
            let name = URL(fileURLWithPath: path).lastPathComponent
            let folder = CloudFolder(
                id: UUID().uuidString,
                name: name,
                path: path,
                modifiedDate: Date(),
                itemCount: 0
            )
            folders[path] = folder

            // 建立父子关系
            let parentPath = URL(fileURLWithPath: path).deletingLastPathComponent().path
            if parentPath != "/" && parentPath != path {
                if folderHierarchy[parentPath] == nil {
                    folderHierarchy[parentPath] = []
                }
                folderHierarchy[parentPath]?.append(path)
            }
        }
    }

    func listFolder(at path: String) async throws -> [CloudItem] {
        let children = folderHierarchy[path] ?? []
        return children.compactMap { childPath in
            if let folder = folders[childPath] {
                return .folder(folder)
            }
            return nil
        }
    }

    // 其他必需的协议方法的简单实现
    func authenticate(credentials: AuthCredentials) async throws -> AuthToken {
        return AuthToken(accessToken: "mock_token", refreshToken: "mock_refresh", expiresAt: Date().addingTimeInterval(3600))
    }

    func refreshToken(_ token: AuthToken) async throws -> AuthToken { return token }
    func logout() async throws {}
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
        return folders[cloudPath] ?? CloudFolder(id: UUID().uuidString, name: "mock", path: cloudPath, modifiedDate: Date(), itemCount: 0)
    }
    func getChanges(since cursor: String?) async throws -> ChangeSet {
        return ChangeSet(changes: [], cursor: "mock", hasMore: false)
    }
    func connectWebSocket() async throws -> WebSocketConnection {
        fatalError("Not implemented in mock")
    }
    func subscribeToChanges(paths: [String]) async throws {}
}

class SelectiveSyncMockLocalDBService: LocalDBService {
    var mockConfiguration = SyncConfiguration(
        syncRootPath: "/tmp/sync",
        selectedFolders: [],
        excludePatterns: [],
        bandwidthLimits: SyncConfiguration.BandwidthLimits(uploadLimit: nil, downloadLimit: nil, enableAutoThrottling: true, pauseOnMeteredConnection: false),
        conflictResolution: .askUser,
        offlineSettings: SyncConfiguration.OfflineSettings(maxCacheSize: 1024*1024*1024, autoCleanupEnabled: true, cleanupThreshold: 0.8),
        securitySettings: SyncConfiguration.SecuritySettings(enableEncryption: true, requireTwoFactor: false, autoLockTimeout: 300)
    )

    var previousSelectedFolders: Set<String> = []

    override func loadSyncConfiguration() throws -> SyncConfiguration {
        return mockConfiguration
    }

    override func saveSyncConfiguration(_ config: SyncConfiguration) throws {
        mockConfiguration = config
    }

    override func getPreviousSelectedFolders() async throws -> Set<String> {
        return previousSelectedFolders
    }

    override func savePreviousSelectedFolders(_ folders: Set<String>) async throws {
        previousSelectedFolders = folders
    }
}

@MainActor
class MockSyncEngine: SyncEngineProtocol {
    var syncFolderCalls: [(path: String, recursive: Bool)] = []
    var deleteItemCalls: [String] = []

    func startSync() async throws {}
    func pauseSync() async {}
    func resumeSync() async throws {}
    func stopSync() async {}
    func syncFile(at path: String) async throws {}
    func syncFolder(at path: String, recursive: Bool) async throws {
        syncFolderCalls.append((path: path, recursive: recursive))
    }
    func deleteItem(at path: String) async throws {
        deleteItemCalls.append(path)
    }
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
