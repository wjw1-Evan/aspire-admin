import XCTest
import CoreSpotlight
@testable import MacOSSyncClientCore

// SyncItem.SyncState 的便捷别名，避免类型解析失败
typealias SyncState = SyncItem.SyncState

class SystemIntegrationTests: XCTestCase {
    var systemIntegrationService: SystemIntegrationService!
    var mockSpotlightService: MockSpotlightService!
    var mockQuickLookService: MockQuickLookService!

    override func setUp() {
        super.setUp()
        mockSpotlightService = MockSpotlightService()
        mockQuickLookService = MockQuickLookService()
        systemIntegrationService = SystemIntegrationService(
            spotlightService: mockSpotlightService,
            quickLookService: mockQuickLookService
        )
    }

    override func tearDown() {
        systemIntegrationService = nil
        mockSpotlightService = nil
        mockQuickLookService = nil
        super.tearDown()
    }

    // MARK: - Spotlight Integration Tests

    func testFileAdded_IndexesFileInSpotlight() async {
        let testPath = "/Users/test/Documents/test.txt"
        let syncItem = createTestSyncItem(name: "test.txt", path: testPath)

        await systemIntegrationService.fileAdded(at: testPath, syncItem: syncItem)

        XCTAssertEqual(mockSpotlightService.indexedFiles.count, 1)
        XCTAssertEqual(mockSpotlightService.indexedFiles.first?.key, testPath)
        XCTAssertEqual(mockSpotlightService.indexedFiles.first?.value.fileName, "test.txt")
    }

    func testFileUpdated_UpdatesSpotlightIndex() async {
        let testPath = "/Users/test/Documents/updated.txt"
        let syncItem = createTestSyncItem(name: "updated.txt", path: testPath, syncState: .synced)

        await systemIntegrationService.fileUpdated(at: testPath, syncItem: syncItem)

        XCTAssertEqual(mockSpotlightService.updatedFiles.count, 1)
        XCTAssertEqual(mockSpotlightService.updatedFiles.first?.key, testPath)
        XCTAssertEqual(mockSpotlightService.updatedFiles.first?.value.syncStatus, "synced")
    }

    func testFileRemoved_RemovesFromSpotlightIndex() async {
        let testPath = "/Users/test/Documents/removed.txt"

        await systemIntegrationService.fileRemoved(at: testPath)

        XCTAssertEqual(mockSpotlightService.removedFiles.count, 1)
        XCTAssertEqual(mockSpotlightService.removedFiles.first, testPath)
    }

    func testCreateFileMetadata_CorrectMetadata() {
        let syncItem = createTestSyncItem(
            name: "document.pdf",
            path: "/Users/test/document.pdf",
            size: 1024000,
            syncState: .synced,
            isOfflineAvailable: true
        )

        // Access the private method through the public interface
        // We'll test this indirectly through fileAdded
        let testPath = "/Users/test/document.pdf"
        Task {
            await systemIntegrationService.fileAdded(at: testPath, syncItem: syncItem)
        }

        // Wait a bit for async operation
        let expectation = XCTestExpectation(description: "File indexed")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 1.0)

        guard let metadata = mockSpotlightService.indexedFiles.first?.value else {
            XCTFail("No metadata found")
            return
        }

        XCTAssertEqual(metadata.fileName, "document.pdf")
        XCTAssertEqual(metadata.fileSize, 1024000)
        XCTAssertEqual(metadata.syncStatus, "synced")
        XCTAssertTrue(metadata.isOfflineAvailable)
        XCTAssertTrue(metadata.tags.contains("SyncClient"))
        XCTAssertTrue(metadata.tags.contains("Cloud"))
        XCTAssertTrue(metadata.tags.contains("synced"))
    }

    // MARK: - Quick Look Integration Tests

    func testCanPreviewFile_ReturnsCorrectValue() {
        let testPath = "/Users/test/Documents/image.jpg"
        mockQuickLookService.previewableFiles.insert(testPath)

        let canPreview = systemIntegrationService.canPreviewFile(at: testPath)

        XCTAssertTrue(canPreview)
        XCTAssertEqual(mockQuickLookService.previewCheckCalls.count, 1)
        XCTAssertEqual(mockQuickLookService.previewCheckCalls.first, testPath)
    }

    func testCanPreviewFile_NonPreviewableFile() {
        let testPath = "/Users/test/Documents/unknown.xyz"

        let canPreview = systemIntegrationService.canPreviewFile(at: testPath)

        XCTAssertFalse(canPreview)
    }

    func testGenerateThumbnail_Success() async throws {
        let testPath = "/Users/test/Documents/image.png"
        let testSize = CGSize(width: 128, height: 128)
        let mockImage = NSImage(size: testSize)

        mockQuickLookService.thumbnailResults[testPath] = mockImage

        let thumbnail = try await systemIntegrationService.generateThumbnail(for: testPath, size: testSize)

        XCTAssertNotNil(thumbnail)
        XCTAssertEqual(mockQuickLookService.thumbnailCalls.count, 1)
        XCTAssertEqual(mockQuickLookService.thumbnailCalls.first?.path, testPath)
        XCTAssertEqual(mockQuickLookService.thumbnailCalls.first?.size, testSize)
    }

    func testGenerateThumbnail_Failure() async {
        let testPath = "/Users/test/Documents/nonexistent.jpg"
        let testSize = CGSize(width: 128, height: 128)

        mockQuickLookService.thumbnailErrors[testPath] = QuickLookError.thumbnailGenerationFailed

        do {
            _ = try await systemIntegrationService.generateThumbnail(for: testPath, size: testSize)
            XCTFail("Expected error to be thrown")
        } catch {
            XCTAssertTrue(error is QuickLookError)
        }
    }

    // MARK: - Integration Tests

    func testFileLifecycle_CompleteFlow() async {
        let testPath = "/Users/test/Documents/lifecycle.txt"
        let syncItem = createTestSyncItem(name: "lifecycle.txt", path: testPath)

        // Add file
        await systemIntegrationService.fileAdded(at: testPath, syncItem: syncItem)
        XCTAssertEqual(mockSpotlightService.indexedFiles.count, 1)

        // Update file
        let updatedSyncItem = createTestSyncItem(name: "lifecycle.txt", path: testPath, syncState: .synced)
        await systemIntegrationService.fileUpdated(at: testPath, syncItem: updatedSyncItem)
        XCTAssertEqual(mockSpotlightService.updatedFiles.count, 1)

        // Remove file
        await systemIntegrationService.fileRemoved(at: testPath)
        XCTAssertEqual(mockSpotlightService.removedFiles.count, 1)
    }

    // MARK: - Helper Methods

    private func createTestSyncItem(
        name: String,
        path: String,
        size: Int64 = 1024,
        syncState: SyncState = .localOnly,
        isOfflineAvailable: Bool = false
    ) -> SyncItem {
        return SyncItem(
            id: UUID(),
            cloudId: "cloud-\(UUID().uuidString)",
            localPath: path,
            cloudPath: "/cloud\(path)",
            name: name,
            type: .file,
            size: size,
            modifiedDate: Date(),
            syncState: syncState,
            hash: "hash-\(name)",
            parentId: nil,
            isSelected: true,
            isOfflineAvailable: isOfflineAvailable,
            lastSyncDate: Date(),
            conflictInfo: nil
        )
    }
}

// MARK: - Mock Services

class MockSpotlightService: SpotlightServiceProtocol {
    var indexedFiles: [(key: String, value: FileMetadata)] = []
    var updatedFiles: [(key: String, value: FileMetadata)] = []
    var removedFiles: [String] = []
    var isSpotlightAvailable: Bool = true

    func indexFile(at path: String, metadata: FileMetadata) async throws {
        indexedFiles.append((key: path, value: metadata))
    }

    func removeFileFromIndex(at path: String) async throws {
        removedFiles.append(path)
    }

    func updateFileMetadata(at path: String, metadata: FileMetadata) async throws {
        updatedFiles.append((key: path, value: metadata))
    }

    func clearAllIndexedFiles() async throws {
        indexedFiles.removeAll()
        updatedFiles.removeAll()
        removedFiles.removeAll()
    }
}

class MockQuickLookService: QuickLookServiceProtocol {
    var previewableFiles: Set<String> = []
    var previewCheckCalls: [String] = []
    var thumbnailCalls: [(path: String, size: CGSize)] = []
    var thumbnailResults: [String: NSImage] = [:]
    var thumbnailErrors: [String: Error] = [:]
    var prepareForPreviewCalls: [String] = []
    var cleanupCalled = false

    func canPreview(fileAt path: String) -> Bool {
        previewCheckCalls.append(path)
        return previewableFiles.contains(path)
    }

    func generateThumbnail(for path: String, size: CGSize) async throws -> NSImage? {
        thumbnailCalls.append((path: path, size: size))

        if let error = thumbnailErrors[path] {
            throw error
        }

        return thumbnailResults[path]
    }

    func prepareForPreview(fileAt path: String) async throws -> URL {
        prepareForPreviewCalls.append(path)
        return URL(fileURLWithPath: path)
    }

    func cleanupPreviewFiles() async {
        cleanupCalled = true
    }
}
