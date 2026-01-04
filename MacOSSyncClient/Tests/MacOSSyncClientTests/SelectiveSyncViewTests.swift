import XCTest
import SwiftUI
@testable import MacOSSyncClientCore

/// 选择性同步界面测试
/// 验证需求 4.4, 4.5: 文件夹选择的用户交互和层级关系
@MainActor
class SelectiveSyncViewTests: XCTestCase {
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

    /// 测试界面初始状态
    func testInitialUIState() async throws {
        let testFolders = ["/Documents", "/Photos", "/Projects"]
        await mockCloudAPIService.setupFolderStructure(testFolders)
        _ = SelectiveSyncView(selectiveSync: selectiveSync)
        XCTAssertEqual(selectiveSync.getSelectedCount(), 0)
        XCTAssertEqual(selectiveSync.getSelectedSize(), 0)
        let folderTree = try await selectiveSync.getFolderTree()
        XCTAssertEqual(folderTree.children.count, testFolders.count)
    }

    /// 父子层级选择联动
    func testFolderSelectionInteraction() async throws {
        let hierarchicalFolders = [
            "/Parent",
            "/Parent/Child1",
            "/Parent/Child2",
            "/Parent/Child1/Grandchild"
        ]
        await mockCloudAPIService.setupFolderStructure(hierarchicalFolders)
        _ = try await selectiveSync.getFolderTree()
        try await selectiveSync.selectFolder("/Parent", selected: true)
        XCTAssertTrue(selectiveSync.isSelected("/Parent"))
        XCTAssertTrue(selectiveSync.isSelected("/Parent/Child1"))
        XCTAssertTrue(selectiveSync.isSelected("/Parent/Child2"))
        XCTAssertTrue(selectiveSync.isSelected("/Parent/Child1/Grandchild"))
        XCTAssertGreaterThan(selectiveSync.getSelectedCount(), 0)
    }

    /// 父子层级取消选择联动
    func testFolderDeselectionInteraction() async throws {
        let hierarchicalFolders = ["/Parent", "/Parent/Child1", "/Parent/Child2"]
        await mockCloudAPIService.setupFolderStructure(hierarchicalFolders)
        _ = try await selectiveSync.getFolderTree()
        try await selectiveSync.selectFolder("/Parent", selected: true)
        try await selectiveSync.selectFolder("/Parent", selected: false)
        XCTAssertFalse(selectiveSync.isSelected("/Parent"))
        XCTAssertFalse(selectiveSync.isSelected("/Parent/Child1"))
        XCTAssertFalse(selectiveSync.isSelected("/Parent/Child2"))
        XCTAssertEqual(selectiveSync.getSelectedCount(), 0)
    }

    /// 全选/全不选批量操作
    func testBatchOperationsUI() async throws {
        let testFolders = ["/Batch1", "/Batch2", "/Batch3", "/Batch4"]
        await mockCloudAPIService.setupFolderStructure(testFolders)
        _ = try await selectiveSync.getFolderTree()
        try await selectiveSync.selectAllFolders()
        for folder in testFolders {
            XCTAssertTrue(selectiveSync.isSelected(folder))
        }
        let selectedCountAfterSelectAll = selectiveSync.getSelectedCount()
        XCTAssertGreaterThanOrEqual(selectedCountAfterSelectAll, testFolders.count)
        try await selectiveSync.deselectAllFolders()
        for folder in testFolders {
            XCTAssertFalse(selectiveSync.isSelected(folder))
        }
        XCTAssertEqual(selectiveSync.getSelectedCount(), 0)
        XCTAssertEqual(selectiveSync.getSelectedSize(), 0)
    }
}
