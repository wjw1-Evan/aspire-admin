import Foundation
import CoreSpotlight
import AppKit

protocol SpotlightServiceProtocol {
    func indexFile(at path: String, metadata: FileMetadata) async throws
    func removeFileFromIndex(at path: String) async throws
    func updateFileMetadata(at path: String, metadata: FileMetadata) async throws
    func clearAllIndexedFiles() async throws
    var isSpotlightAvailable: Bool { get }
}

struct FileMetadata {
    let fileName: String
    let fileSize: Int64
    let modifiedDate: Date
    let createdDate: Date
    let syncStatus: String
    let isOfflineAvailable: Bool
    let tags: [String]
    let description: String?
    
    init(
        fileName: String,
        fileSize: Int64,
        modifiedDate: Date,
        createdDate: Date,
        syncStatus: String,
        isOfflineAvailable: Bool = false,
        tags: [String] = [],
        description: String? = nil
    ) {
        self.fileName = fileName
        self.fileSize = fileSize
        self.modifiedDate = modifiedDate
        self.createdDate = createdDate
        self.syncStatus = syncStatus
        self.isOfflineAvailable = isOfflineAvailable
        self.tags = tags
        self.description = description
    }
}

protocol QuickLookServiceProtocol {
    func canPreview(fileAt path: String) -> Bool
    func generateThumbnail(for path: String, size: CGSize) async throws -> NSImage?
    func prepareForPreview(fileAt path: String) async throws -> URL
    func cleanupPreviewFiles() async
}