import Foundation
import AppKit
import OSLog

class SystemIntegrationService {
    private let logger = Logger(subsystem: "com.synclient.macos", category: "SystemIntegrationService")
    private let spotlightService: SpotlightServiceProtocol
    private let quickLookService: QuickLookServiceProtocol
    
    init(
        spotlightService: SpotlightServiceProtocol = SpotlightService(),
        quickLookService: QuickLookServiceProtocol = QuickLookService()
    ) {
        self.spotlightService = spotlightService
        self.quickLookService = quickLookService
    }
    
    func fileAdded(at path: String, syncItem: SyncItem) async {
        do {
            let metadata = createFileMetadata(from: syncItem)
            try await spotlightService.indexFile(at: path, metadata: metadata)
            logger.info("File added to system integration: \(path)")
        } catch {
            logger.error("Failed to add file to system integration: \(error.localizedDescription)")
        }
    }
    
    func fileUpdated(at path: String, syncItem: SyncItem) async {
        do {
            let metadata = createFileMetadata(from: syncItem)
            try await spotlightService.updateFileMetadata(at: path, metadata: metadata)
            logger.info("File updated in system integration: \(path)")
        } catch {
            logger.error("Failed to update file in system integration: \(error.localizedDescription)")
        }
    }
    
    func fileRemoved(at path: String) async {
        do {
            try await spotlightService.removeFileFromIndex(at: path)
            logger.info("File removed from system integration: \(path)")
        } catch {
            logger.error("Failed to remove file from system integration: \(error.localizedDescription)")
        }
    }
    
    func canPreviewFile(at path: String) -> Bool {
        return quickLookService.canPreview(fileAt: path)
    }
    
    func generateThumbnail(for path: String, size: CGSize) async throws -> NSImage? {
        return try await quickLookService.generateThumbnail(for: path, size: size)
    }
    
    private func createFileMetadata(from syncItem: SyncItem) -> FileMetadata {
        return FileMetadata(
            fileName: syncItem.name,
            fileSize: syncItem.size,
            modifiedDate: syncItem.modifiedDate,
            createdDate: syncItem.lastSyncDate ?? syncItem.modifiedDate,
            syncStatus: syncItem.syncState.rawValue,
            isOfflineAvailable: syncItem.isOfflineAvailable,
            tags: ["SyncClient", "Cloud", syncItem.syncState.rawValue],
            description: "Sync Client \(syncItem.type.rawValue) - \(syncItem.syncState.rawValue)"
        )
    }
}