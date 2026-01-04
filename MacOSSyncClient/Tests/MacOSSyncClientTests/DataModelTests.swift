import XCTest
import SwiftCheck
@testable import MacOSSyncClientCore

/// 数据模型单元测试
class DataModelTests: XCTestCase {
    
    // MARK: - SyncProgress Tests
    
    func testSyncProgressCreation() throws {
        let progress = SyncProgress(
            totalItems: 100,
            completedItems: 50,
            totalBytes: 1024 * 1024,
            transferredBytes: 512 * 1024,
            currentOperation: "Uploading file.txt",
            estimatedTimeRemaining: 30.0
        )
        
        XCTAssertEqual(progress.totalItems, 100)
        XCTAssertEqual(progress.completedItems, 50)
        XCTAssertEqual(progress.completionPercentage, 0.5, accuracy: 0.001)
        XCTAssertEqual(progress.transferPercentage, 0.5, accuracy: 0.001)
        XCTAssertFalse(progress.isCompleted)
        XCTAssertEqual(progress.currentOperation, "Uploading file.txt")
        XCTAssertEqual(progress.estimatedTimeRemaining, 30.0)
    }
    
    func testSyncProgressCompletion() throws {
        let completedProgress = SyncProgress(
            totalItems: 10,
            completedItems: 10,
            totalBytes: 1024,
            transferredBytes: 1024
        )
        
        XCTAssertTrue(completedProgress.isCompleted)
        XCTAssertEqual(completedProgress.completionPercentage, 1.0, accuracy: 0.001)
        XCTAssertEqual(completedProgress.transferPercentage, 1.0, accuracy: 0.001)
    }
    
    func testSyncProgressSerialization() throws {
        let progress = SyncProgress(
            totalItems: 100,
            completedItems: 25,
            totalBytes: 2048,
            transferredBytes: 512,
            currentOperation: "Test operation"
        )
        
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()
        
        let data = try encoder.encode(progress)
        let decodedProgress = try decoder.decode(SyncProgress.self, from: data)
        
        XCTAssertEqual(progress.totalItems, decodedProgress.totalItems)
        XCTAssertEqual(progress.completedItems, decodedProgress.completedItems)
        XCTAssertEqual(progress.totalBytes, decodedProgress.totalBytes)
        XCTAssertEqual(progress.transferredBytes, decodedProgress.transferredBytes)
        XCTAssertEqual(progress.currentOperation, decodedProgress.currentOperation)
    }
    
    // MARK: - SyncEngineState Tests
    
    func testSyncEngineStateDisplayNames() throws {
        XCTAssertEqual(SyncEngineState.idle.displayName, "Idle")
        XCTAssertEqual(SyncEngineState.syncing.displayName, "Syncing")
        XCTAssertEqual(SyncEngineState.paused.displayName, "Paused")
        XCTAssertEqual(SyncEngineState.error("Test error").displayName, "Error: Test error")
    }
    
    func testSyncEngineStateActivity() throws {
        XCTAssertFalse(SyncEngineState.idle.isActive)
        XCTAssertTrue(SyncEngineState.syncing.isActive)
        XCTAssertFalse(SyncEngineState.paused.isActive)
        XCTAssertFalse(SyncEngineState.error("Test").isActive)
    }
    
    // MARK: - FileEvent Tests
    
    func testFileEventCreation() throws {
        let event = FileEvent(
            path: "/test/file.txt",
            eventType: .created
        )
        
        XCTAssertEqual(event.path, "/test/file.txt")
        XCTAssertEqual(event.fileName, "file.txt")
        XCTAssertEqual(event.directoryPath, "/test")
        XCTAssertEqual(event.eventType.displayName, "Created")
        XCTAssertTrue(event.eventType.isStructuralChange)
    }
    
    func testFileEventTypes() throws {
        let createdEvent = FileEvent(path: "/test", eventType: .created)
        let modifiedEvent = FileEvent(path: "/test", eventType: .modified)
        let deletedEvent = FileEvent(path: "/test", eventType: .deleted)
        let movedEvent = FileEvent(path: "/test", eventType: .moved(from: "/old"))
        let renamedEvent = FileEvent(path: "/test", eventType: .renamed(from: "old.txt"))
        
        XCTAssertTrue(createdEvent.eventType.isStructuralChange)
        XCTAssertFalse(modifiedEvent.eventType.isStructuralChange)
        XCTAssertTrue(deletedEvent.eventType.isStructuralChange)
        XCTAssertTrue(movedEvent.eventType.isStructuralChange)
        XCTAssertTrue(renamedEvent.eventType.isStructuralChange)
    }
    
    func testFileEventSerialization() throws {
        let events = [
            FileEvent(path: "/test1", eventType: .created),
            FileEvent(path: "/test2", eventType: .modified),
            FileEvent(path: "/test3", eventType: .deleted),
            FileEvent(path: "/test4", eventType: .moved(from: "/old4")),
            FileEvent(path: "/test5", eventType: .renamed(from: "old5.txt"))
        ]
        
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()
        
        for event in events {
            let data = try encoder.encode(event)
            let decodedEvent = try decoder.decode(FileEvent.self, from: data)
            
            XCTAssertEqual(event.path, decodedEvent.path)
            XCTAssertEqual(event.eventType, decodedEvent.eventType)
        }
    }
    
    // MARK: - FolderNode Tests
    
    func testFolderNodeCreation() throws {
        let rootNode = FolderNode(
            path: "/root",
            name: "root",
            isSelected: true,
            size: 1024
        )
        
        XCTAssertTrue(rootNode.isRoot)
        XCTAssertFalse(rootNode.hasChildren)
        XCTAssertEqual(rootNode.totalSize, 1024)
        XCTAssertEqual(rootNode.selectedChildrenCount, 0)
    }
    
    func testFolderNodeHierarchy() throws {
        let child1 = FolderNode(path: "/root/child1", name: "child1", isSelected: true, size: 512)
        let child2 = FolderNode(path: "/root/child2", name: "child2", isSelected: false, size: 256)
        
        var rootNode = FolderNode(
            path: "/root",
            name: "root",
            isSelected: true,
            size: 1024,
            children: [child1, child2]
        )
        
        XCTAssertTrue(rootNode.hasChildren)
        XCTAssertEqual(rootNode.children.count, 2)
        XCTAssertEqual(rootNode.totalSize, 1024 + 512 + 256)
        XCTAssertEqual(rootNode.selectedChildrenCount, 1)
        
        // 测试选择状态更新
        rootNode.updateSelection(false, recursive: true)
        XCTAssertFalse(rootNode.isSelected)
        XCTAssertFalse(rootNode.children[0].isSelected)
        XCTAssertFalse(rootNode.children[1].isSelected)
    }
    
    func testFolderNodeSelection() throws {
        let selectedPaths = Set(["/root", "/root/child1"])
        let child1 = FolderNode(path: "/root/child1", name: "child1", isSelected: true)
        let child2 = FolderNode(path: "/root/child2", name: "child2", isSelected: false)
        let rootNode = FolderNode(path: "/root", name: "root", isSelected: true, children: [child1, child2])
        
        let actualPaths = rootNode.getSelectedPaths()
        XCTAssertEqual(actualPaths, selectedPaths)
    }
    
    // MARK: - CacheUsage Tests
    
    func testCacheUsageCalculations() throws {
        let usage = CacheUsage(
            totalSize: 1024 * 1024 * 1024, // 1GB
            usedSize: 512 * 1024 * 1024,   // 512MB
            itemCount: 100
        )
        
        XCTAssertEqual(usage.usagePercentage, 0.5, accuracy: 0.001)
        XCTAssertEqual(usage.availableSize, 512 * 1024 * 1024)
        XCTAssertFalse(usage.needsCleanup) // 50% < 80%
        
        let highUsage = CacheUsage(
            totalSize: 1024 * 1024 * 1024,
            usedSize: 900 * 1024 * 1024, // 90%
            itemCount: 200
        )
        
        XCTAssertTrue(highUsage.needsCleanup) // 90% > 80%
    }
    
    func testCacheUsageFormatting() throws {
        let usage = CacheUsage(
            totalSize: 1024 * 1024 * 1024,
            usedSize: 512 * 1024 * 1024,
            itemCount: 1234
        )
        
        let formattedUsage = usage.formattedUsage
        // Just check that the formatted usage contains some expected parts
        XCTAssertFalse(formattedUsage.isEmpty)
        XCTAssertTrue(formattedUsage.contains("of"))
        
        let formattedCount = usage.formattedItemCount
        // Just check that it's not empty
        XCTAssertFalse(formattedCount.isEmpty)
    }
    
    // MARK: - OfflineCacheItem Tests
    
    func testOfflineCacheItemCreation() throws {
        let syncItemId = UUID()
        let cacheItem = OfflineCacheItem(
            syncItemId: syncItemId,
            localPath: "/local/test.txt",
            cachePath: "/cache/test.txt",
            size: 1024,
            priority: .high
        )
        
        XCTAssertEqual(cacheItem.syncItemId, syncItemId)
        XCTAssertEqual(cacheItem.fileName, "test.txt")
        XCTAssertEqual(cacheItem.priority, .high)
        XCTAssertEqual(cacheItem.cacheAge, 0) // 刚创建
        XCTAssertEqual(cacheItem.lastAccessAge, 0) // 刚访问
        XCTAssertFalse(cacheItem.canBeEvicted) // 高优先级且刚访问
    }
    
    func testOfflineCacheItemEviction() throws {
        let oldDate = Date().addingTimeInterval(-10 * 24 * 3600) // 10天前
        var cacheItem = OfflineCacheItem(
            syncItemId: UUID(),
            localPath: "/local/old.txt",
            cachePath: "/cache/old.txt",
            size: 1024,
            cachedDate: oldDate,
            lastAccessedDate: oldDate,
            priority: .low
        )
        
        XCTAssertTrue(cacheItem.canBeEvicted) // 低优先级且长时间未访问
        
        // 更新访问时间
        cacheItem.updateLastAccessed()
        XCTAssertFalse(cacheItem.canBeEvicted) // 刚访问过
        
        // 测试固定优先级
        let pinnedItem = OfflineCacheItem(
            syncItemId: UUID(),
            localPath: "/local/pinned.txt",
            cachePath: "/cache/pinned.txt",
            size: 1024,
            cachedDate: oldDate,
            lastAccessedDate: oldDate,
            priority: .pinned
        )
        
        XCTAssertFalse(pinnedItem.canBeEvicted) // 固定优先级不能被清理
    }
    
    // MARK: - CloudFile Tests
    
    func testCloudFileCreation() throws {
        let cloudFile = CloudFile(
            id: "cloud-123",
            name: "document.pdf",
            path: "/documents/document.pdf",
            size: 2048,
            modifiedDate: Date(),
            hash: "abc123",
            mimeType: "application/pdf"
        )
        
        XCTAssertEqual(cloudFile.fileExtension, "pdf")
        XCTAssertFalse(cloudFile.isImage)
        XCTAssertTrue(cloudFile.isDocument)
        XCTAssertTrue(cloudFile.formattedSize.contains("2"))
    }
    
    func testCloudFileToSyncItem() throws {
        let cloudFile = CloudFile(
            id: "cloud-123",
            name: "test.txt",
            path: "/test.txt",
            size: 1024,
            modifiedDate: Date(),
            hash: "hash123",
            mimeType: "text/plain"
        )
        
        let syncItem = cloudFile.toSyncItem(localPath: "/local/test.txt")
        
        XCTAssertEqual(syncItem.cloudId, "cloud-123")
        XCTAssertEqual(syncItem.name, "test.txt")
        XCTAssertEqual(syncItem.localPath, "/local/test.txt")
        XCTAssertEqual(syncItem.cloudPath, "/test.txt")
        XCTAssertEqual(syncItem.type, .file)
        XCTAssertEqual(syncItem.size, 1024)
        XCTAssertEqual(syncItem.hash, "hash123")
        XCTAssertEqual(syncItem.syncState, .cloudOnly)
    }
    
    // MARK: - CloudItem Tests
    
    func testCloudItemSerialization() throws {
        let cloudFile = CloudFile(
            id: "file-123",
            name: "test.txt",
            path: "/test.txt",
            size: 1024,
            modifiedDate: Date(),
            hash: "hash123",
            mimeType: "text/plain"
        )
        
        let cloudFolder = CloudFolder(
            id: "folder-123",
            name: "TestFolder",
            path: "/TestFolder",
            modifiedDate: Date(),
            itemCount: 5
        )
        
        let fileItem = CloudItem.file(cloudFile)
        let folderItem = CloudItem.folder(cloudFolder)
        
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()
        
        // 测试文件项序列化
        let fileData = try encoder.encode(fileItem)
        let decodedFileItem = try decoder.decode(CloudItem.self, from: fileData)
        
        XCTAssertEqual(fileItem.id, decodedFileItem.id)
        XCTAssertEqual(fileItem.name, decodedFileItem.name)
        XCTAssertFalse(decodedFileItem.isFolder)
        
        // 测试文件夹项序列化
        let folderData = try encoder.encode(folderItem)
        let decodedFolderItem = try decoder.decode(CloudItem.self, from: folderData)
        
        XCTAssertEqual(folderItem.id, decodedFolderItem.id)
        XCTAssertEqual(folderItem.name, decodedFolderItem.name)
        XCTAssertTrue(decodedFolderItem.isFolder)
    }
    
    // MARK: - AuthToken Tests
    
    func testAuthTokenExpiration() throws {
        let futureDate = Date().addingTimeInterval(3600) // 1小时后
        let token = AuthToken(
            accessToken: "access123",
            refreshToken: "refresh123",
            expiresAt: futureDate
        )
        
        XCTAssertFalse(token.isExpired)
        XCTAssertFalse(token.isExpiringSoon)
        XCTAssertEqual(token.authorizationHeader, "Bearer access123")
        
        let expiredToken = AuthToken(
            accessToken: "expired",
            refreshToken: "refresh",
            expiresAt: Date().addingTimeInterval(-3600) // 1小时前
        )
        
        XCTAssertTrue(expiredToken.isExpired)
        
        let expiringSoonToken = AuthToken(
            accessToken: "expiring",
            refreshToken: "refresh",
            expiresAt: Date().addingTimeInterval(200) // 3分钟后
        )
        
        XCTAssertTrue(expiringSoonToken.isExpiringSoon)
    }
    
    // MARK: - Edge Cases and Boundary Conditions
    
    func testZeroSizeProgress() throws {
        let zeroProgress = SyncProgress(
            totalItems: 0,
            completedItems: 0,
            totalBytes: 0,
            transferredBytes: 0
        )
        
        XCTAssertEqual(zeroProgress.completionPercentage, 0.0)
        XCTAssertEqual(zeroProgress.transferPercentage, 0.0)
        XCTAssertTrue(zeroProgress.isCompleted)
    }
    
    func testEmptyFolderNode() throws {
        let emptyNode = FolderNode(path: "/empty", name: "empty")
        
        XCTAssertFalse(emptyNode.hasChildren)
        XCTAssertEqual(emptyNode.selectedChildrenCount, 0)
        XCTAssertEqual(emptyNode.getSelectedPaths(), ["/empty"])
    }
    
    func testCacheUsageEdgeCases() throws {
        // 零大小缓存
        let zeroUsage = CacheUsage(totalSize: 0, usedSize: 0, itemCount: 0)
        XCTAssertEqual(zeroUsage.usagePercentage, 0.0)
        XCTAssertEqual(zeroUsage.availableSize, 0)
        
        // 满缓存
        let fullUsage = CacheUsage(totalSize: 1024, usedSize: 1024, itemCount: 10)
        XCTAssertEqual(fullUsage.usagePercentage, 1.0)
        XCTAssertEqual(fullUsage.availableSize, 0)
        XCTAssertTrue(fullUsage.needsCleanup)
    }
}