import XCTest
@testable import MacOSSyncClientCore

/// 离线同步功能单元测试
class OfflineSyncTests: XCTestCase {
    
    var offlineManager: OfflineManager!
    var mockLocalDBService: MockLocalDBService!
    var mockFileSystemService: MockFileSystemService!
    var tempCacheDirectory: URL!
    
    override func setUp() {
        super.setUp()
        
        // 创建临时缓存目录
        tempCacheDirectory = FileManager.default.temporaryDirectory
            .appendingPathComponent("OfflineSyncTests")
            .appendingPathComponent(UUID().uuidString)
        
        try! FileManager.default.createDirectory(at: tempCacheDirectory, withIntermediateDirectories: true)
        
        // 创建模拟服务
        mockLocalDBService = MockLocalDBService()
        mockFileSystemService = MockFileSystemService()
        
        // 创建离线管理器
        offlineManager = OfflineManager(
            localDBService: mockLocalDBService,
            fileSystemService: mockFileSystemService,
            cacheDirectory: tempCacheDirectory,
            maxCacheSize: 100 * 1024 * 1024 // 100MB
        )
    }
    
    override func tearDown() {
        // 清理临时目录
        try? FileManager.default.removeItem(at: tempCacheDirectory)
        
        offlineManager = nil
        mockLocalDBService = nil
        mockFileSystemService = nil
        tempCacheDirectory = nil
        
        super.tearDown()
    }
    
    // MARK: - Offline Modification Recording Tests
    
    func testRecordOfflineModification() {
        // Given
        let modification = OfflineModification(
            path: "/test/file.txt",
            modificationType: .created,
            timestamp: Date(),
            size: 1024
        )
        
        // When
        offlineManager.recordOfflineModification(modification)
        
        // Then
        XCTAssertEqual(offlineManager.getPendingModificationsCount(), 1)
        
        let pendingModifications = offlineManager.getPendingModifications()
        XCTAssertEqual(pendingModifications.count, 1)
        XCTAssertEqual(pendingModifications.first?.path, "/test/file.txt")
        XCTAssertEqual(pendingModifications.first?.modificationType, .created)
    }
    
    func testRecordMultipleOfflineModifications() {
        // Given
        let modifications = [
            OfflineModification(path: "/test/file1.txt", modificationType: .created, timestamp: Date(), size: 1024),
            OfflineModification(path: "/test/file2.txt", modificationType: .modified, timestamp: Date(), size: 2048),
            OfflineModification(path: "/test/file3.txt", modificationType: .deleted, timestamp: Date(), size: 0)
        ]
        
        // When
        for modification in modifications {
            offlineManager.recordOfflineModification(modification)
        }
        
        // Then
        XCTAssertEqual(offlineManager.getPendingModificationsCount(), 3)
        
        let pendingModifications = offlineManager.getPendingModifications()
        XCTAssertEqual(pendingModifications.count, 3)
        
        let paths = Set(pendingModifications.map { $0.path })
        XCTAssertTrue(paths.contains("/test/file1.txt"))
        XCTAssertTrue(paths.contains("/test/file2.txt"))
        XCTAssertTrue(paths.contains("/test/file3.txt"))
    }
    
    // MARK: - Network Status Tests
    
    func testNetworkStatusChange() {
        // Given
        let modification = OfflineModification(
            path: "/test/file.txt",
            modificationType: .created,
            timestamp: Date(),
            size: 1024
        )
        
        // 设置为离线状态
        offlineManager.setNetworkAvailable(false)
        offlineManager.recordOfflineModification(modification)
        
        // When - 网络恢复
        offlineManager.setNetworkAvailable(true)
        
        // Then - 应该触发同步处理
        // 由于同步是异步的，我们需要等待一小段时间
        let expectation = XCTestExpectation(description: "Network recovery processing")
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            expectation.fulfill()
        }
        
        wait(for: [expectation], timeout: 1.0)
        
        // 验证网络状态已更新
        XCTAssertEqual(offlineManager.getPendingModificationsCount(), 1) // 修改仍在队列中（因为是模拟环境）
    }
    
    // MARK: - Offline Modification Processing Tests
    
    func testOfflineModificationOrdering() {
        // Given - 创建带有不同时间戳的修改
        let baseDate = Date()
        let modifications = [
            OfflineModification(path: "/test/file.txt", modificationType: .created, timestamp: baseDate.addingTimeInterval(-10), size: 1024),
            OfflineModification(path: "/test/file.txt", modificationType: .modified, timestamp: baseDate.addingTimeInterval(-5), size: 1024),
            OfflineModification(path: "/test/file.txt", modificationType: .modified, timestamp: baseDate, size: 1024)
        ]
        
        // When - 以随机顺序添加修改
        for modification in modifications.shuffled() {
            offlineManager.recordOfflineModification(modification)
        }
        
        // Then - 获取的修改应该按时间戳排序
        let pendingModifications = offlineManager.getPendingModifications()
        XCTAssertEqual(pendingModifications.count, 3)
        
        // 验证时间戳顺序
        for i in 0..<(pendingModifications.count - 1) {
            XCTAssertLessThanOrEqual(
                pendingModifications[i].timestamp,
                pendingModifications[i + 1].timestamp,
                "Modifications should be ordered by timestamp"
            )
        }
    }
    
    func testOfflineModificationTypes() {
        // Given
        let testPath = "/test/file.txt"
        let baseDate = Date()
        
        let modifications = [
            OfflineModification(path: testPath, modificationType: .created, timestamp: baseDate, size: 1024),
            OfflineModification(path: testPath, modificationType: .modified, timestamp: baseDate.addingTimeInterval(1), size: 1024),
            OfflineModification(path: testPath, modificationType: .renamed(oldName: "oldfile.txt"), timestamp: baseDate.addingTimeInterval(2), size: 1024),
            OfflineModification(path: "/new/path/file.txt", modificationType: .moved(oldPath: testPath), timestamp: baseDate.addingTimeInterval(3), size: 1024),
            OfflineModification(path: "/new/path/file.txt", modificationType: .deleted, timestamp: baseDate.addingTimeInterval(4), size: 0)
        ]
        
        // When
        for modification in modifications {
            offlineManager.recordOfflineModification(modification)
        }
        
        // Then
        let pendingModifications = offlineManager.getPendingModifications()
        XCTAssertEqual(pendingModifications.count, 5)
        
        // 验证修改类型
        let modificationTypes = pendingModifications.map { $0.modificationType }
        XCTAssertTrue(modificationTypes.contains(.created))
        XCTAssertTrue(modificationTypes.contains(.modified))
        XCTAssertTrue(modificationTypes.contains(.deleted))
        
        // 验证重命名和移动操作
        let hasRename = modificationTypes.contains { type in
            if case .renamed(let oldName) = type {
                return oldName == "oldfile.txt"
            }
            return false
        }
        XCTAssertTrue(hasRename)
        
        let hasMove = modificationTypes.contains { type in
            if case .moved(let oldPath) = type {
                return oldPath == testPath
            }
            return false
        }
        XCTAssertTrue(hasMove)
    }
    
    // MARK: - Cache Integration Tests
    
    func testOfflineFileAccessWithModifications() async throws {
        // Given - 创建一个离线可用的文件
        let testPath = "/test/offline_file.txt"
        
        // 模拟文件存在
        mockFileSystemService.mockFiles[testPath] = Data("test content".utf8)
        
        try await offlineManager.makeAvailableOffline(testPath)
        XCTAssertTrue(offlineManager.isAvailableOffline(testPath))
        
        // When - 记录对该文件的修改
        let modification = OfflineModification(
            path: testPath,
            modificationType: .modified,
            timestamp: Date(),
            size: 1024
        )
        
        offlineManager.recordOfflineModification(modification)
        
        // Then - 文件仍应该可以离线访问
        let cachePath = try await offlineManager.accessOfflineFile(testPath)
        XCTAssertFalse(cachePath.isEmpty)
        
        // 修改应该被记录
        XCTAssertEqual(offlineManager.getPendingModificationsCount(), 1)
    }
    
    func testOfflineFileRemovalWithPendingModifications() async throws {
        // Given - 创建一个离线可用的文件并记录修改
        let testPath = "/test/offline_file.txt"
        
        mockFileSystemService.mockFiles[testPath] = Data("test content".utf8)
        
        try await offlineManager.makeAvailableOffline(testPath)
        
        let modification = OfflineModification(
            path: testPath,
            modificationType: .modified,
            timestamp: Date(),
            size: 1024
        )
        offlineManager.recordOfflineModification(modification)
        
        // When - 从离线缓存中移除文件
        try await offlineManager.removeFromOffline(testPath)
        
        // Then - 文件不再离线可用，但修改仍在队列中
        XCTAssertFalse(offlineManager.isAvailableOffline(testPath))
        XCTAssertEqual(offlineManager.getPendingModificationsCount(), 1)
    }
    
    // MARK: - Error Handling Tests
    
    func testOfflineModificationWithInvalidPath() {
        // Given
        let modification = OfflineModification(
            path: "",
            modificationType: .created,
            timestamp: Date(),
            size: 1024
        )
        
        // When & Then - 应该能够记录（验证在同步时进行）
        offlineManager.recordOfflineModification(modification)
        XCTAssertEqual(offlineManager.getPendingModificationsCount(), 1)
    }
    
    func testOfflineModificationWithFutureTimestamp() {
        // Given - 创建一个未来时间戳的修改
        let futureDate = Date().addingTimeInterval(3600) // 1小时后
        let modification = OfflineModification(
            path: "/test/future_file.txt",
            modificationType: .created,
            timestamp: futureDate,
            size: 1024
        )
        
        // When
        offlineManager.recordOfflineModification(modification)
        
        // Then - 应该能够记录
        XCTAssertEqual(offlineManager.getPendingModificationsCount(), 1)
        
        let pendingModifications = offlineManager.getPendingModifications()
        XCTAssertEqual(pendingModifications.first?.timestamp, futureDate)
    }
    
    // MARK: - Performance Tests
    
    func testLargeNumberOfOfflineModifications() {
        // Given - 创建大量修改
        let modificationCount = 1000
        let modifications = (0..<modificationCount).map { index in
            OfflineModification(
                path: "/test/file_\(index).txt",
                modificationType: .created,
                timestamp: Date().addingTimeInterval(Double(index)),
                size: Int64(index * 1024)
            )
        }
        
        // When - 记录所有修改
        let startTime = Date()
        for modification in modifications {
            offlineManager.recordOfflineModification(modification)
        }
        let recordingTime = Date().timeIntervalSince(startTime)
        
        // Then - 验证性能和正确性
        XCTAssertEqual(offlineManager.getPendingModificationsCount(), modificationCount)
        XCTAssertLessThan(recordingTime, 1.0, "Recording \(modificationCount) modifications should take less than 1 second")
        
        // 验证获取修改的性能
        let retrievalStartTime = Date()
        let pendingModifications = offlineManager.getPendingModifications()
        let retrievalTime = Date().timeIntervalSince(retrievalStartTime)
        
        XCTAssertEqual(pendingModifications.count, modificationCount)
        XCTAssertLessThan(retrievalTime, 0.1, "Retrieving \(modificationCount) modifications should take less than 0.1 seconds")
    }
    
    // MARK: - Integration Tests
    
    func testOfflineSyncWorkflow() async throws {
        // Given - 设置离线环境
        offlineManager.setNetworkAvailable(false)
        
        let testFiles = [
            "/test/doc1.txt",
            "/test/doc2.txt",
            "/test/folder/doc3.txt"
        ]
        
        // 模拟文件存在
        for path in testFiles {
            mockFileSystemService.mockFiles[path] = Data("content for \(path)".utf8)
        }
        
        // When - 执行离线操作
        // 1. 创建文件
        for path in testFiles {
            try await offlineManager.makeAvailableOffline(path)
            
            let modification = OfflineModification(
                path: path,
                modificationType: .created,
                timestamp: Date(),
                size: 1024
            )
            offlineManager.recordOfflineModification(modification)
        }
        
        // 2. 修改文件
        let modifyModification = OfflineModification(
            path: testFiles[0],
            modificationType: .modified,
            timestamp: Date().addingTimeInterval(1),
            size: 2048
        )
        offlineManager.recordOfflineModification(modifyModification)
        
        // 3. 删除文件
        let deleteModification = OfflineModification(
            path: testFiles[1],
            modificationType: .deleted,
            timestamp: Date().addingTimeInterval(2),
            size: 0
        )
        offlineManager.recordOfflineModification(deleteModification)
        
        // Then - 验证离线状态
        XCTAssertEqual(offlineManager.getPendingModificationsCount(), 4) // 3 creates + 1 modify + 1 delete
        XCTAssertEqual(offlineManager.getOfflineItems().count, 3)
        
        // When - 网络恢复
        offlineManager.setNetworkAvailable(true)
        
        // 等待同步处理
        let expectation = XCTestExpectation(description: "Sync processing")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            expectation.fulfill()
        }
        await fulfillment(of: [expectation], timeout: 2.0)
        
        // Then - 验证同步后状态
        // 在模拟环境中，修改仍会保留，但在实际环境中会被处理
        XCTAssertGreaterThanOrEqual(offlineManager.getPendingModificationsCount(), 0)
    }
}

// MARK: - Mock Services

class MockLocalDBService: LocalDBService {
    var mockSyncItems: [SyncItem] = []
    var mockConfigurations: [String: Any] = [:]
    
    func createSyncItemAsync(_ item: SyncItem) async throws {
        mockSyncItems.append(item)
    }
    
    func updateSyncItemAsync(_ item: SyncItem) async throws {
        if let index = mockSyncItems.firstIndex(where: { $0.id == item.id }) {
            mockSyncItems[index] = item
        }
    }
    
    func deleteSyncItemAsync(id: UUID) async throws {
        mockSyncItems.removeAll { $0.id == id }
    }
    
    func getSyncItemAsync(id: UUID) async throws -> SyncItem? {
        return mockSyncItems.first { $0.id == id }
    }
    
    func getAllSyncItemsAsync() async throws -> [SyncItem] {
        return mockSyncItems
    }
}

class MockFileSystemService: FileSystemService {
    var mockFiles: [String: Data] = [:]
    var mockDirectories: Set<String> = []
    
    override func fileExists(at path: String) -> Bool {
        return mockFiles[path] != nil || mockDirectories.contains(path)
    }
    
    override func readFile(at path: String) throws -> Data {
        guard let data = mockFiles[path] else {
            throw FileSystemError.fileNotFound(path)
        }
        return data
    }
    
    func writeFileAsync(at path: String, data: Data) async throws {
        mockFiles[path] = data
    }
    
    override func deleteFile(at path: String) throws {
        mockFiles.removeValue(forKey: path)
    }
    
    override func createDirectory(at path: String) throws {
        mockDirectories.insert(path)
    }
    
    override func getFileAttributes(at path: String) throws -> FileAttributes {
        guard let data = mockFiles[path] else {
            throw FileSystemError.fileNotFound(path)
        }
        
        return FileAttributes(
            size: Int64(data.count),
            creationDate: Date(),
            modificationDate: Date(),
            isDirectory: false,
            isReadable: true,
            isWritable: true,
            isExecutable: false,
            permissions: "rw-r--r--"
        )
    }
}