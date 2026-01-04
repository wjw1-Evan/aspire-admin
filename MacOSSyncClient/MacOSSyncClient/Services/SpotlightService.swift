import Foundation
import CoreSpotlight
import OSLog

class SpotlightService: SpotlightServiceProtocol {
    private let logger = Logger(subsystem: "com.synclient.macos", category: "SpotlightService")
    private let searchableIndex = CSSearchableIndex.default()
    
    var isSpotlightAvailable: Bool {
        return CSSearchableIndex.isIndexingAvailable()
    }
    
    func indexFile(at path: String, metadata: FileMetadata) async throws {
        guard isSpotlightAvailable else { return }
        
        let attributeSet = CSSearchableItemAttributeSet(contentType: .data)
        attributeSet.title = metadata.fileName
        attributeSet.displayName = metadata.fileName
        attributeSet.contentDescription = metadata.description
        attributeSet.keywords = metadata.tags
        attributeSet.contentModificationDate = metadata.modifiedDate
        attributeSet.contentCreationDate = metadata.createdDate
        attributeSet.fileSize = NSNumber(value: metadata.fileSize)
        attributeSet.contentURL = URL(fileURLWithPath: path)
        
        let searchableItem = CSSearchableItem(
            uniqueIdentifier: path,
            domainIdentifier: "com.synclient.files",
            attributeSet: attributeSet
        )
        
        try await searchableIndex.indexSearchableItems([searchableItem])
        logger.info("Indexed file for Spotlight: \(path)")
    }
    
    func removeFileFromIndex(at path: String) async throws {
        guard isSpotlightAvailable else { return }
        try await searchableIndex.deleteSearchableItems(withIdentifiers: [path])
        logger.info("Removed file from Spotlight index: \(path)")
    }
    
    func updateFileMetadata(at path: String, metadata: FileMetadata) async throws {
        try await indexFile(at: path, metadata: metadata)
    }
    
    func clearAllIndexedFiles() async throws {
        guard isSpotlightAvailable else { return }
        try await searchableIndex.deleteSearchableItems(withDomainIdentifiers: ["com.synclient.files"])
        logger.info("Cleared all indexed files from Spotlight")
    }
}