import XCTest
@testable import MacOSSyncClientCore

/// 选择性同步属性测试
/// 验证属性 5: 选择性同步一致性
/// **验证需求: 需求 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**
@MainActor
class SelectiveSyncPropertyTests: XCTestCase {

    var selectiveSync: SelectiveSync!
    var mockCloudAPIService: MockCloudAPIService!
    var mockLocalDBService: SelectiveSyncMockLocalDBService!
    var mockSyncEngine: MockSyncEngine!

    override func setUp() async throws {
        try await super.setUp()

        mockCloudAPIService = MockCloudAPIService()
        mockLocalDBService = SelectiveSyncMockLocalDBService()
        mockSyncEngine = MockSyncEngine()

        selectiveSync = await SelectiveSync(
            cloudAPIService: mockCloudAPIService,
            localDBService: mockLocalDBService,
            syncEngine: mockSyncEngine
        )
    }

    override func tearDown() async throws {
        selectiveSync = nil
        mockCloudAPIService = nil
        mockLocalDBService = nil
        mockSyncEngine = nil
        try await super.tearDown()
    }

    /// 测试选择性同步一致性 - 核心属性测试
    /// 验证需求 4.2, 4.3, 4.4, 4.5, 4.6, 4.7: 选择性同步设置变化应立即反映，父子关系保持一致
    /// **功能: macos-sync-client, 属性 5: 选择性同步一致性**
    func testSelectiveSyncConsistency() async throws {
        // 设置简化的测试数据 - 创建基本层级文件夹结构
        let testFolders = [
            "/Documents",
            "/Documents/Projects",
            "/Documents/Projects/ProjectA",
            "/Photos"
        ]

        await mockCloudAPIService.setupFolderStructure(testFolders)

        // 获取文件夹树
        let folderTree = try await selectiveSync.getFolderTree()
        XCTAssertNotNil(folderTree, "Should get folder tree")

        // 测试场景1: 选择父文件夹应自动选择子文件夹 (需求 4.4)
        try await selectiveSync.selectFolder("/Documents", selected: true)

        let selectedAfterParent = selectiveSync.getSelectedFolders()
        let expectedSelected = ["/Documents", "/Documents/Projects", "/Documents/Projects/ProjectA"]

        for path in expectedSelected {
            XCTAssertTrue(selectedAfterParent.contains(path), "Path \(path) should be selected when parent is selected")
            XCTAssertTrue(selectiveSync.isSelected(path), "isSelected should return true for \(path)")
        }

        // 测试场景2: 取消选择父文件夹应影响子文件夹 (需求 4.5)
        try await selectiveSync.selectFolder("/Documents", selected: false)

        let selectedAfterDeselect = selectiveSync.getSelectedFolders()
        for path in expectedSelected {
            XCTAssertFalse(selectedAfterDeselect.contains(path), "Path \(path) should not be selected when parent is deselected")
            XCTAssertFalse(selectiveSync.isSelected(path), "isSelected should return false for \(path)")
        }

        // 验证内部状态一致性
        let selectedCount = selectiveSync.getSelectedCount()
        let selectedSize = selectiveSync.getSelectedSize()

        XCTAssertEqual(selectedCount, selectedAfterDeselect.count, "Selected count should match selected folders count")
        XCTAssertGreaterThanOrEqual(selectedSize, 0, "Selected size should be non-negative")
    }

    /// 测试选择性同步设置变化的立即应用
    /// 验证需求 4.6: 选择性同步设置发生变化时应立即应用新的同步策略
    /// **功能: macos-sync-client, 属性 5: 选择性同步一致性**
    func testSelectionChangesImmediateApplication() async throws {
        let testFolders = ["/TestFolder1", "/TestFolder2"]
        await mockCloudAPIService.setupFolderStructure(testFolders)

        _ = try await selectiveSync.getFolderTree()

        // 监听选择变化事件
        var receivedChanges: [SelectionChange] = []
        let changeExpectation = XCTestExpectation(description: "Selection changes received")
        changeExpectation.expectedFulfillmentCount = testFolders.count

        Task {
            for await change in selectiveSync.selectionChanges {
                receivedChanges.append(change)
                changeExpectation.fulfill()
                if receivedChanges.count >= testFolders.count {
                    break
                }
            }
        }

        // 执行选择操作
        for folder in testFolders {
            try await selectiveSync.selectFolder(folder, selected: true)
        }

        await fulfillment(of: [changeExpectation], timeout: 3.0)

        // 验证变化事件
        XCTAssertEqual(receivedChanges.count, testFolders.count, "Should receive change events for all selections")

        // 验证状态立即更新
        let selectedFolders = selectiveSync.getSelectedFolders()
        for folder in testFolders {
            XCTAssertTrue(selectedFolders.contains(folder), "Folder \(folder) should be immediately selected")
            XCTAssertTrue(selectiveSync.isSelected(folder), "isSelected should return true immediately")
        }
    }

    /// 测试文件夹下载和删除的一致性
    /// 验证需求 4.2, 4.3: 取消选择应删除本地文件夹，选择应下载文件夹
    /// **功能: macos-sync-client, 属性 5: 选择性同步一致性**
    func testFolderDownloadAndDeletionConsistency() async throws {
        let testFolder = "/TestDownloadFolder"
        await mockCloudAPIService.setupFolderStructure([testFolder])

        _ = try await selectiveSync.getFolderTree()

        // 测试选择文件夹 - 应该触发下载 (需求 4.3)
        try await selectiveSync.selectFolder(testFolder, selected: true)

        // 验证选择状态
        XCTAssertTrue(selectiveSync.isSelected(testFolder), "Folder should be selected")
        XCTAssertTrue(selectiveSync.getSelectedFolders().contains(testFolder), "Selected folders should contain the folder")

        // 应用选择变化
        try await selectiveSync.applySelectionChanges()

        // 验证同步引擎被调用进行下载
        XCTAssertTrue(mockSyncEngine.syncFolderCalls.contains { $0.path == testFolder && $0.recursive == true },
                     "Sync engine should be called to download the folder")

        // 测试取消选择文件夹 - 应该触发删除 (需求 4.2)
        try await selectiveSync.selectFolder(testFolder, selected: false)

        // 验证取消选择状态
        XCTAssertFalse(selectiveSync.isSelected(testFolder), "Folder should not be selected")
        XCTAssertFalse(selectiveSync.getSelectedFolders().contains(testFolder), "Selected folders should not contain the folder")

        // 应用选择变化
        try await selectiveSync.applySelectionChanges()

        // 验证同步引擎被调用进行删除
        XCTAssertTrue(mockSyncEngine.deleteItemCalls.contains(testFolder),
                     "Sync engine should be called to delete the folder")
    }

    /// 测试批量操作的一致性
    /// 验证需求 4.4, 4.5: 批量选择和取消选择操作的一致性
    /// **功能: macos-sync-client, 属性 5: 选择性同步一致性**
    func testBatchOperationsConsistency() async throws {
        let testFolders = ["/Batch1", "/Batch2", "/Batch3"]
        await mockCloudAPIService.setupFolderStructure(testFolders)

        _ = try await selectiveSync.getFolderTree()

        // 测试批量选择
        try await selectiveSync.selectFolders(testFolders)

        // 验证所有文件夹都被选中
        for folder in testFolders {
            XCTAssertTrue(selectiveSync.isSelected(folder), "Folder \(folder) should be selected after batch selection")
            XCTAssertTrue(selectiveSync.getSelectedFolders().contains(folder), "Selected folders should contain \(folder)")
        }

        // 测试批量取消选择
        try await selectiveSync.deselectFolders(testFolders)

        // 验证所有文件夹都被取消选择
        for folder in testFolders {
            XCTAssertFalse(selectiveSync.isSelected(folder), "Folder \(folder) should not be selected after batch deselection")
            XCTAssertFalse(selectiveSync.getSelectedFolders().contains(folder), "Selected folders should not contain \(folder)")
        }

        // 验证选择计数的一致性
        XCTAssertEqual(selectiveSync.getSelectedCount(), 0, "Selected count should be 0 after deselecting all folders")
    }

    /// 测试全选和全不选操作
    /// 验证需求 4.4, 4.5: 全选和全不选操作的一致性
    /// **功能: macos-sync-client, 属性 5: 选择性同步一致性**
    func testSelectAllAndDeselectAllConsistency() async throws {
        let testFolders = ["/All1", "/All2", "/All3", "/All4"]
        await mockCloudAPIService.setupFolderStructure(testFolders)

        _ = try await selectiveSync.getFolderTree()

        // 测试全选
        try await selectiveSync.selectAllFolders()

        // 验证所有文件夹都被选中
        let selectedFolders = selectiveSync.getSelectedFolders()
        for folder in testFolders {
            XCTAssertTrue(selectedFolders.contains(folder), "All folders should be selected after selectAllFolders")
            XCTAssertTrue(selectiveSync.isSelected(folder), "isSelected should return true for all folders")
        }

        // 验证选择计数
        XCTAssertGreaterThanOrEqual(selectiveSync.getSelectedCount(), testFolders.count, "Selected count should include all test folders")

        // 测试全不选
        try await selectiveSync.deselectAllFolders()

        // 验证所有文件夹都被取消选择
        let deselectedFolders = selectiveSync.getSelectedFolders()
        for folder in testFolders {
            XCTAssertFalse(deselectedFolders.contains(folder), "No folders should be selected after deselectAllFolders")
            XCTAssertFalse(selectiveSync.isSelected(folder), "isSelected should return false for all folders")
        }

        // 验证选择计数
        XCTAssertEqual(selectiveSync.getSelectedCount(), 0, "Selected count should be 0 after deselecting all folders")
    }

    /// 测试层级关系的一致性
    /// 验证需求 4.4, 4.5: 父子文件夹选择关系的一致性
    /// **功能: macos-sync-client, 属性 5: 选择性同步一致性**
    func testHierarchicalRelationshipConsistency() async throws {
        let hierarchicalFolders = [
            "/Parent",
            "/Parent/Child1",
            "/Parent/Child2",
            "/Parent/Child1/Grandchild"
        ]
        await mockCloudAPIService.setupFolderStructure(hierarchicalFolders)

        _ = try await selectiveSync.getFolderTree()

        // 测试选择父文件夹应该影响子文件夹 (需求 4.4)
        try await selectiveSync.selectFolder("/Parent", selected: true)

        // 验证子文件夹也被选中
        let childFolders = ["/Parent/Child1", "/Parent/Child2", "/Parent/Child1/Grandchild"]
        for childFolder in childFolders {
            XCTAssertTrue(selectiveSync.isSelected(childFolder), "Child folder \(childFolder) should be selected when parent is selected")
        }

        // 测试取消选择父文件夹应该影响子文件夹 (需求 4.5)
        try await selectiveSync.selectFolder("/Parent", selected: false)

        // 验证子文件夹也被取消选择
        for childFolder in childFolders {
            XCTAssertFalse(selectiveSync.isSelected(childFolder), "Child folder \(childFolder) should be deselected when parent is deselected")
        }

        // 验证层级关系的内部一致性
        let selectedFolders = selectiveSync.getSelectedFolders()
        XCTAssertFalse(selectedFolders.contains("/Parent"), "Parent should not be selected")
        for childFolder in childFolders {
            XCTAssertFalse(selectedFolders.contains(childFolder), "Child folders should not be selected when parent is deselected")
        }
    }

    /// 测试大小估算的一致性
    /// 验证需求 4.6, 4.7: 文件夹大小估算的准确性和一致性
    /// **功能: macos-sync-client, 属性 5: 选择性同步一致性**
    func testSizeEstimationConsistency() async throws {
        let testFolders = ["/SizeTest1", "/SizeTest2"]
        await mockCloudAPIService.setupFolderStructure(testFolders)

        _ = try await selectiveSync.getFolderTree()

        // 测试单个文件夹大小估算
        let singleFolderSize = try await selectiveSync.estimateDownloadSize(for: ["/SizeTest1"])
        XCTAssertGreaterThanOrEqual(singleFolderSize, 0, "Single folder size should be non-negative")

        // 测试多个文件夹大小估算
        let multipleFoldersSize = try await selectiveSync.estimateDownloadSize(for: testFolders)
        XCTAssertGreaterThanOrEqual(multipleFoldersSize, singleFolderSize, "Multiple folders size should be at least as large as single folder")

        // 选择文件夹并验证选择大小的一致性
        try await selectiveSync.selectFolder("/SizeTest1", selected: true)
        let selectedSize = selectiveSync.getSelectedSize()

        XCTAssertGreaterThanOrEqual(selectedSize, 0, "Selected size should be non-negative")

        // 添加更多选择并验证大小增长
        try await selectiveSync.selectFolder("/SizeTest2", selected: true)
        let newSelectedSize = selectiveSync.getSelectedSize()

        XCTAssertGreaterThanOrEqual(newSelectedSize, selectedSize, "Selected size should increase when more folders are selected")
    }
}
