import SQLite3
import SwiftCheck
import XCTest

@testable import MacOSSyncClientCore

/// 本地数据库服务测试
class LocalDBServiceTests: XCTestCase {

    var dbService: LocalDBService!
    var tempDBPath: String!

    override func setUpWithError() throws {
        try super.setUpWithError()

        // 创建临时数据库文件路径
        let tempDir = NSTemporaryDirectory()
        tempDBPath = tempDir + "test_\(UUID().uuidString).db"

        // 初始化数据库服务
        dbService = LocalDBService(dbPath: tempDBPath)
        try dbService.openDatabase()
    }

    override func tearDownWithError() throws {
        // 关闭数据库连接
        dbService.closeDatabase()

        // 删除临时数据库文件
        if FileManager.default.fileExists(atPath: tempDBPath) {
            try FileManager.default.removeItem(atPath: tempDBPath)
        }

        try super.tearDownWithError()
    }

    // MARK: - 基础功能测试

    func testDatabaseConnection() throws {
        XCTAssertTrue(dbService.isConnected)

        dbService.closeDatabase()
        XCTAssertFalse(dbService.isConnected)

        try dbService.openDatabase()
        XCTAssertTrue(dbService.isConnected)
    }

    func testSyncItemCRUD() throws {
        let syncItem = SyncItem(
            cloudId: "test-cloud-id",
            localPath: "/test/local/path",
            cloudPath: "/test/cloud/path",
            name: "test-file.txt",
            type: .file,
            size: 1024,
            modifiedDate: Date(),
            hash: "test-hash"
        )

        // 测试插入
        try dbService.insertSyncItem(syncItem)

        // 测试查询
        let retrievedItem = try dbService.getSyncItem(by: syncItem.id)
        XCTAssertNotNil(retrievedItem)
        XCTAssertEqual(retrievedItem?.id, syncItem.id)
        XCTAssertEqual(retrievedItem?.name, syncItem.name)
        XCTAssertEqual(retrievedItem?.type, syncItem.type)

        // 测试更新
        var updatedItem = syncItem
        updatedItem.syncState = .synced
        try dbService.updateSyncItem(updatedItem)

        let retrievedUpdatedItem = try dbService.getSyncItem(by: syncItem.id)
        XCTAssertEqual(retrievedUpdatedItem?.syncState, .synced)

        // 测试删除
        try dbService.deleteSyncItem(by: syncItem.id)
        let deletedItem = try dbService.getSyncItem(by: syncItem.id)
        XCTAssertNil(deletedItem)
    }

    func testSyncItemQueries() throws {
        // 创建测试数据
        let items = [
            SyncItem(
                cloudId: "1", localPath: "/test1", cloudPath: "/cloud1", name: "file1.txt",
                type: .file, size: 100, modifiedDate: Date(), syncState: .synced, hash: "hash1"),
            SyncItem(
                cloudId: "2", localPath: "/test2", cloudPath: "/cloud2", name: "file2.txt",
                type: .file, size: 200, modifiedDate: Date(), syncState: .uploading, hash: "hash2"),
            SyncItem(
                cloudId: "3", localPath: "/test3", cloudPath: "/cloud3", name: "folder1",
                type: .folder, size: 0, modifiedDate: Date(), syncState: .synced, hash: ""),
        ]

        for item in items {
            try dbService.insertSyncItem(item)
        }

        // 测试获取所有项目
        let allItems = try dbService.getAllSyncItems()
        XCTAssertEqual(allItems.count, 3)

        // 测试按状态查询
        let syncedItems = try dbService.getSyncItems(bySyncState: .synced)
        XCTAssertEqual(syncedItems.count, 2)

        let uploadingItems = try dbService.getSyncItems(bySyncState: .uploading)
        XCTAssertEqual(uploadingItems.count, 1)

        // 测试按路径查询
        let itemByLocalPath = try dbService.getSyncItem(byLocalPath: "/test1")
        XCTAssertNotNil(itemByLocalPath)
        XCTAssertEqual(itemByLocalPath?.name, "file1.txt")

        let itemByCloudPath = try dbService.getSyncItem(byCloudPath: "/cloud2")
        XCTAssertNotNil(itemByCloudPath)
        XCTAssertEqual(itemByCloudPath?.name, "file2.txt")
    }

    func testConfigurationManagement() throws {
        let configuration = SyncConfiguration(
            syncRootPath: "/test/sync/root",
            selectedFolders: ["folder1", "folder2"],
            excludePatterns: ["*.tmp", ".DS_Store"],
            conflictResolution: .keepBoth
        )

        // 测试保存配置
        try dbService.saveSyncConfiguration(configuration)

        // 测试加载配置
        let loadedConfiguration = try dbService.loadSyncConfiguration()
        XCTAssertEqual(loadedConfiguration.syncRootPath, configuration.syncRootPath)
        XCTAssertEqual(loadedConfiguration.selectedFolders, configuration.selectedFolders)
        XCTAssertEqual(loadedConfiguration.excludePatterns, configuration.excludePatterns)
        XCTAssertEqual(loadedConfiguration.conflictResolution, configuration.conflictResolution)
    }

    func testOfflineCacheManagement() throws {
        // 首先创建一个同步项目
        let syncItem = SyncItem(
            cloudId: "cache-test",
            localPath: "/test/cache/file.txt",
            cloudPath: "/cache/file.txt",
            name: "file.txt",
            type: .file,
            size: 1024,
            modifiedDate: Date(),
            hash: "cache-hash"
        )
        try dbService.insertSyncItem(syncItem)

        // 创建缓存项目
        let cacheItem = OfflineCacheItem(
            syncItemId: syncItem.id,
            localPath: syncItem.localPath,
            cachePath: "/cache/path/file.txt",
            size: 1024
        )

        // 测试添加缓存项目
        try dbService.addOfflineCacheItem(cacheItem)

        // 测试获取所有缓存项目
        let cacheItems = try dbService.getAllOfflineCacheItems()
        XCTAssertEqual(cacheItems.count, 1)
        XCTAssertEqual(cacheItems.first?.syncItemId, syncItem.id)

        // 测试更新访问时间
        try dbService.updateCacheItemLastAccessed(cacheItem.id)

        // 测试删除缓存项目
        try dbService.removeOfflineCacheItem(by: cacheItem.id)
        let emptyCacheItems = try dbService.getAllOfflineCacheItems()
        XCTAssertEqual(emptyCacheItems.count, 0)
    }

    func testDatabaseStatistics() throws {
        // 创建测试数据
        let items = [
            SyncItem(
                cloudId: "stat1", localPath: "/stat1", cloudPath: "/stat1", name: "file1",
                type: .file, size: 100, modifiedDate: Date(), syncState: .synced, hash: "hash1"),
            SyncItem(
                cloudId: "stat2", localPath: "/stat2", cloudPath: "/stat2", name: "file2",
                type: .file, size: 200, modifiedDate: Date(), syncState: .uploading, hash: "hash2"),
            SyncItem(
                cloudId: "stat3", localPath: "/stat3", cloudPath: "/stat3", name: "file3",
                type: .file, size: 300, modifiedDate: Date(), syncState: .synced, hash: "hash3"),
        ]

        for item in items {
            try dbService.insertSyncItem(item)
        }

        let statistics = try dbService.getDatabaseStatistics()

        XCTAssertEqual(statistics["totalItems"] as? Int, 3)

        if let itemsByState = statistics["itemsByState"] as? [String: Int] {
            XCTAssertEqual(itemsByState["synced"], 2)
            XCTAssertEqual(itemsByState["uploading"], 1)
        } else {
            XCTFail("itemsByState not found in statistics")
        }
    }

    // MARK: - 属性测试

    /// 属性 13: 多账户隔离性测试
    /// 验证需求: 需求 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
    func testMultiAccountIsolation() {
        property("Multi-account data isolation should be maintained")
            <- forAll { (items: [SyncItem]) in
                guard !items.isEmpty else { return true }

                do {
                    // 清理数据库
                    try self.cleanupDatabase()

                    // 模拟不同账户的数据（通过不同的路径前缀区分）
                    let account1Items = items.prefix(items.count / 2).map { item in
                        SyncItem(
                            id: item.id,
                            cloudId: item.cloudId,
                            localPath: "/account1" + item.localPath,
                            cloudPath: "/account1" + item.cloudPath,
                            name: item.name,
                            type: item.type,
                            size: item.size,
                            modifiedDate: item.modifiedDate,
                            syncState: item.syncState,
                            hash: item.hash,
                            parentId: item.parentId,
                            isSelected: item.isSelected,
                            isOfflineAvailable: item.isOfflineAvailable,
                            lastSyncDate: item.lastSyncDate,
                            conflictInfo: item.conflictInfo
                        )
                    }

                    let account2Items = items.suffix(items.count - items.count / 2).map { item in
                        SyncItem(
                            id: item.id,
                            cloudId: item.cloudId,
                            localPath: "/account2" + item.localPath,
                            cloudPath: "/account2" + item.cloudPath,
                            name: item.name,
                            type: item.type,
                            size: item.size,
                            modifiedDate: item.modifiedDate,
                            syncState: item.syncState,
                            hash: item.hash,
                            parentId: item.parentId,
                            isSelected: item.isSelected,
                            isOfflineAvailable: item.isOfflineAvailable,
                            lastSyncDate: item.lastSyncDate,
                            conflictInfo: item.conflictInfo
                        )
                    }

                    // 插入账户1的数据
                    for item in account1Items {
                        try self.dbService.insertSyncItem(item)
                    }

                    // 插入账户2的数据
                    for item in account2Items {
                        try self.dbService.insertSyncItem(item)
                    }

                    // 验证数据隔离：账户1的查询不应该返回账户2的数据
                    for item in account1Items {
                        let retrievedItem = try self.dbService.getSyncItem(
                            byLocalPath: item.localPath)
                        guard let retrieved = retrievedItem else { return false }

                        // 验证返回的是正确账户的数据
                        if !retrieved.localPath.hasPrefix("/account1") {
                            return false
                        }
                    }

                    // 验证数据隔离：账户2的查询不应该返回账户1的数据
                    for item in account2Items {
                        let retrievedItem = try self.dbService.getSyncItem(
                            byLocalPath: item.localPath)
                        guard let retrieved = retrievedItem else { return false }

                        // 验证返回的是正确账户的数据
                        if !retrieved.localPath.hasPrefix("/account2") {
                            return false
                        }
                    }

                    // 验证总数据量正确
                    let allItems = try self.dbService.getAllSyncItems()
                    return allItems.count == items.count

                } catch {
                    print("Database error in multi-account test: \(error)")
                    return false
                }
            }
    }

    /// 数据库CRUD操作一致性测试
    func testDatabaseCRUDConsistency() {
        property("Database CRUD operations should maintain data consistency")
            <- forAll { (item: SyncItem) in
                do {
                    // 清理数据库
                    try self.cleanupDatabase()

                    // 插入项目
                    try self.dbService.insertSyncItem(item)

                    // 验证插入后能够查询到
                    let retrievedItem = try self.dbService.getSyncItem(by: item.id)
                    guard let retrieved = retrievedItem else { return false }

                    // 验证数据一致性
                    if retrieved.id != item.id || retrieved.name != item.name
                        || retrieved.type != item.type || retrieved.size != item.size
                    {
                        return false
                    }

                    // 更新项目
                    var updatedItem = item
                    updatedItem.syncState = .synced
                    try self.dbService.updateSyncItem(updatedItem)

                    // 验证更新后的数据
                    let updatedRetrievedItem = try self.dbService.getSyncItem(by: item.id)
                    guard let updatedRetrieved = updatedRetrievedItem else { return false }

                    if updatedRetrieved.syncState != .synced {
                        return false
                    }

                    // 删除项目
                    try self.dbService.deleteSyncItem(by: item.id)

                    // 验证删除后查询不到
                    let deletedItem = try self.dbService.getSyncItem(by: item.id)
                    return deletedItem == nil

                } catch {
                    print("Database error in CRUD test: \(error)")
                    return false
                }
            }
    }

    /// 针对随机生成样本的 CRUD 验证（覆盖特殊字符和缺失父节点场景）
    func testCRUDWithGeneratedSample() throws {
        let sample = SyncItem(
            id: UUID(uuidString: "DAC64CD1-C261-4B4B-A50E-C816A0ED9D36")!,
            cloudId: "¿",
            localPath: "/test/E",
            cloudPath: "/cloud/E",
            name: "E",
            type: .file,
            size: 56_779_115,
            modifiedDate: Date(timeIntervalSince1970: 1_732_304_196),
            syncState: .cloudOnly,
            hash: "H",
            parentId: UUID(uuidString: "ACA93890-BBDF-4546-ADF6-C2DEA49B8034"),
            isSelected: true,
            isOfflineAvailable: false,
            lastSyncDate: Date(timeIntervalSince1970: 1_776_915_270),
            conflictInfo: nil
        )

        try cleanupDatabase()

        try dbService.insertSyncItem(sample)
        let inserted = try XCTUnwrap(dbService.getSyncItem(by: sample.id))
        XCTAssertEqual(inserted.id, sample.id)
        XCTAssertEqual(inserted.name, sample.name)
        XCTAssertEqual(inserted.type, sample.type)

        var updated = inserted
        updated.syncState = .synced
        try dbService.updateSyncItem(updated)

        let fetchedAfterUpdate = try XCTUnwrap(dbService.getSyncItem(by: sample.id))
        XCTAssertEqual(fetchedAfterUpdate.syncState, .synced)

        try dbService.deleteSyncItem(by: sample.id)
        XCTAssertNil(try dbService.getSyncItem(by: sample.id))
    }

    /// 配置序列化往返测试
    func testConfigurationSerializationRoundTrip() {
        property("Configuration serialization should be reversible")
            <- forAll { (config: SyncConfiguration) in
                do {
                    // 保存配置
                    try self.dbService.saveSyncConfiguration(config)

                    // 加载配置
                    let loadedConfig = try self.dbService.loadSyncConfiguration()

                    // 验证配置一致性
                    return loadedConfig.syncRootPath == config.syncRootPath
                        && loadedConfig.selectedFolders == config.selectedFolders
                        && loadedConfig.excludePatterns == config.excludePatterns
                        && loadedConfig.conflictResolution == config.conflictResolution

                } catch {
                    print("Configuration serialization error: \(error)")
                    return false
                }
            }
    }

    /// 数据库状态查询一致性测试
    func testDatabaseQueryConsistency() {
        property("Database queries should return consistent results")
            <- forAll { (items: [SyncItem]) in
                guard !items.isEmpty else { return true }

                do {
                    // 清理数据库
                    try self.cleanupDatabase()

                    // 插入所有项目
                    for item in items {
                        try self.dbService.insertSyncItem(item)
                    }

                    // 验证总数一致性
                    let allItems = try self.dbService.getAllSyncItems()
                    if allItems.count != items.count {
                        return false
                    }

                    // 验证按状态查询的一致性
                    let syncStates = Set(items.map { $0.syncState })
                    for state in syncStates {
                        let itemsWithState = items.filter { $0.syncState == state }
                        let queriedItems = try self.dbService.getSyncItems(bySyncState: state)

                        if queriedItems.count != itemsWithState.count {
                            return false
                        }
                    }

                    // 验证路径查询的一致性
                    for item in items.prefix(min(5, items.count)) {  // 限制测试数量以提高性能
                        let itemByLocalPath = try self.dbService.getSyncItem(
                            byLocalPath: item.localPath)
                        let itemByCloudPath = try self.dbService.getSyncItem(
                            byCloudPath: item.cloudPath)

                        if itemByLocalPath?.id != item.id || itemByCloudPath?.id != item.id {
                            return false
                        }
                    }

                    return true

                } catch {
                    print("Database query consistency error: \(error)")
                    return false
                }
            }
    }

    // MARK: - 辅助方法

    private func cleanupDatabase() throws {
        // 删除所有数据以确保测试隔离
        let allItems = try dbService.getAllSyncItems()
        for item in allItems {
            try dbService.deleteSyncItem(by: item.id)
        }

        let allCacheItems = try dbService.getAllOfflineCacheItems()
        for cacheItem in allCacheItems {
            try dbService.removeOfflineCacheItem(by: cacheItem.id)
        }
    }
}
