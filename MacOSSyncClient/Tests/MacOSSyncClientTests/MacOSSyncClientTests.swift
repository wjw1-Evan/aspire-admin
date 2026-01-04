import XCTest
import SwiftCheck
@testable import MacOSSyncClientCore

/// 基础测试类，包含通用的测试工具和设置
class MacOSSyncClientTests: XCTestCase {
    
    override func setUpWithError() throws {
        // 在每个测试前执行的设置
        try super.setUpWithError()
    }

    override func tearDownWithError() throws {
        // 在每个测试后执行的清理
        try super.tearDownWithError()
    }
    
    // MARK: - 基础功能测试
    
    func testSyncItemCreation() throws {
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
        
        XCTAssertEqual(syncItem.name, "test-file.txt")
        XCTAssertEqual(syncItem.type, .file)
        XCTAssertEqual(syncItem.size, 1024)
        XCTAssertTrue(syncItem.isFile)
        XCTAssertFalse(syncItem.isFolder)
        XCTAssertEqual(syncItem.syncState, .localOnly)
    }
    
    func testSyncConfigurationValidation() throws {
        // 测试有效配置 - 使用存在的路径
        let validConfig = SyncConfiguration(syncRootPath: NSHomeDirectory())
        XCTAssertTrue(validConfig.isValid())
        
        // 测试无效配置 - 不存在的路径
        var invalidConfig = SyncConfiguration(syncRootPath: "/nonexistent/path")
        XCTAssertFalse(invalidConfig.isValid())
        
        // 测试无效配置 - 负数带宽限制
        invalidConfig = SyncConfiguration()
        invalidConfig.bandwidthLimits.uploadLimit = -1000
        XCTAssertFalse(invalidConfig.isValid())
    }
    
    func testConflictInfoCreation() throws {
        let conflictInfo = ConflictInfo(
            itemId: UUID(),
            itemName: "test-file.txt",
            conflictType: .contentConflict,
            localModifiedDate: Date(),
            cloudModifiedDate: Date().addingTimeInterval(3600),
            localSize: 1024,
            cloudSize: 2048,
            resolutionOptions: ConflictInfo.availableOptions(for: .contentConflict)
        )
        
        XCTAssertEqual(conflictInfo.conflictType, .contentConflict)
        XCTAssertEqual(conflictInfo.localSize, 1024)
        XCTAssertEqual(conflictInfo.cloudSize, 2048)
        XCTAssertTrue(conflictInfo.resolutionOptions.contains(ConflictInfo.ResolutionOption.keepLocal))
        XCTAssertTrue(conflictInfo.resolutionOptions.contains(ConflictInfo.ResolutionOption.keepCloud))
        XCTAssertTrue(conflictInfo.resolutionOptions.contains(ConflictInfo.ResolutionOption.keepBoth))
    }
}

// MARK: - SwiftCheck 生成器扩展

extension SyncItem: Arbitrary {
    public static var arbitrary: Gen<SyncItem> {
        return Gen.compose { c in
            let syncState = c.generate(using: Gen.fromElements(of: SyncItem.SyncState.allCases))
            let cloudId: String
            let lastSyncDate: Date?
            let conflictInfo: ConflictInfo?
            
            // 根据同步状态生成一致的属性
            switch syncState {
            case .localOnly:
                cloudId = "" // localOnly 状态下 cloudId 应该为空
                lastSyncDate = nil
                conflictInfo = nil
            case .synced:
                cloudId = c.generate(using: String.arbitrary.suchThat { !$0.isEmpty })
                lastSyncDate = c.generate(using: Date.arbitrary) // synced 状态必须有 lastSyncDate
                conflictInfo = nil
            case .conflict:
                cloudId = c.generate(using: String.arbitrary.suchThat { !$0.isEmpty })
                lastSyncDate = c.generate(using: Gen.one(of: [Gen.pure(nil), Date.arbitrary.map(Optional.some)]))
                conflictInfo = c.generate(using: ConflictInfo.arbitrary.map(Optional.some)) // conflict 状态必须有 conflictInfo
            default:
                cloudId = c.generate(using: String.arbitrary.suchThat { !$0.isEmpty })
                lastSyncDate = c.generate(using: Gen.one(of: [Gen.pure(nil), Date.arbitrary.map(Optional.some)]))
                conflictInfo = nil
            }
            
            // 生成有效的路径和名称
            let validName = c.generate(using: String.arbitrary.suchThat { !$0.isEmpty && $0.count < 255 })
            let validLocalPath = "/test/" + validName.replacingOccurrences(of: "/", with: "_")
            let validCloudPath = "/cloud/" + validName.replacingOccurrences(of: "/", with: "_")
            let validHash = c.generate(using: String.arbitrary.suchThat { $0.allSatisfy { $0.isHexDigit || $0.isLetter || $0.isNumber } })
            
            return SyncItem(
                cloudId: cloudId,
                localPath: validLocalPath,
                cloudPath: validCloudPath,
                name: validName,
                type: c.generate(using: Gen.fromElements(of: SyncItem.ItemType.allCases)),
                size: c.generate(using: Gen.choose((0, Int64(1024 * 1024 * 100)))), // 限制为100MB以内
                modifiedDate: c.generate(using: Date.arbitrary),
                syncState: syncState,
                hash: validHash,
                parentId: c.generate(using: Gen.one(of: [Gen.pure(nil), UUID.arbitrary.map(Optional.some)])),
                isSelected: c.generate(using: Bool.arbitrary),
                isOfflineAvailable: c.generate(using: Bool.arbitrary),
                lastSyncDate: lastSyncDate,
                conflictInfo: conflictInfo
            )
        }
    }
}

extension SyncConfiguration: Arbitrary {
    public static var arbitrary: Gen<SyncConfiguration> {
        return Gen.compose { c in
            let validRootPath = c.generate(using: String.arbitrary.suchThat { !$0.isEmpty && $0.count < 255 })
            let validFolders = Set(c.generate(using: [String].arbitrary.suchThat { $0.count <= 5 && $0.allSatisfy { !$0.isEmpty && $0.count < 100 } }))
            let validPatterns = c.generate(using: [String].arbitrary.suchThat { $0.count <= 3 && $0.allSatisfy { !$0.isEmpty && $0.count < 50 } })
            
            return SyncConfiguration(
                syncRootPath: validRootPath,
                selectedFolders: validFolders,
                excludePatterns: validPatterns,
                bandwidthLimits: c.generate(using: BandwidthLimits.arbitrary),
                conflictResolution: c.generate(using: Gen.fromElements(of: ConflictResolutionStrategy.allCases)),
                offlineSettings: c.generate(using: OfflineSettings.arbitrary),
                securitySettings: c.generate(using: SecuritySettings.arbitrary)
            )
        }
    }
}

extension SyncConfiguration.BandwidthLimits: Arbitrary {
    public static var arbitrary: Gen<SyncConfiguration.BandwidthLimits> {
        return Gen.compose { c in
            SyncConfiguration.BandwidthLimits(
                uploadLimit: c.generate(using: Gen.one(of: [Gen.pure(nil), Gen.choose((1024, 1000000)).map { Int64($0) }.map(Optional.some)])),
                downloadLimit: c.generate(using: Gen.one(of: [Gen.pure(nil), Gen.choose((1024, 1000000)).map { Int64($0) }.map(Optional.some)])),
                enableAutoThrottling: c.generate(using: Bool.arbitrary),
                pauseOnMeteredConnection: c.generate(using: Bool.arbitrary)
            )
        }
    }
}

extension SyncConfiguration.OfflineSettings: Arbitrary {
    public static var arbitrary: Gen<SyncConfiguration.OfflineSettings> {
        return Gen.compose { c in
            SyncConfiguration.OfflineSettings(
                maxCacheSize: c.generate(using: Gen.choose((1024 * 1024, Int64(1024 * 1024 * 1024)))), // 1MB to 1GB
                autoCleanupEnabled: c.generate(using: Bool.arbitrary),
                cleanupThreshold: c.generate(using: Gen.choose((0.1, 0.9))) // Valid threshold between 0.1 and 0.9
            )
        }
    }
}

extension SyncConfiguration.SecuritySettings: Arbitrary {
    public static var arbitrary: Gen<SyncConfiguration.SecuritySettings> {
        return Gen.compose { c in
            SyncConfiguration.SecuritySettings(
                enableEncryption: c.generate(using: Bool.arbitrary),
                requireTwoFactor: c.generate(using: Bool.arbitrary),
                autoLockTimeout: c.generate(using: Gen.choose((60.0, 86400.0))) // 1 minute to 1 day
            )
        }
    }
}

extension ConflictInfo: Arbitrary {
    public static var arbitrary: Gen<ConflictInfo> {
        return Gen.compose { c in
            let conflictType = c.generate(using: Gen.fromElements(of: ConflictInfo.ConflictType.allCases))
            return ConflictInfo(
                itemId: c.generate(using: UUID.arbitrary),
                itemName: c.generate(using: String.arbitrary.suchThat { !$0.isEmpty && $0.count < 255 }),
                conflictType: conflictType,
                localModifiedDate: c.generate(using: Date.arbitrary),
                cloudModifiedDate: c.generate(using: Date.arbitrary),
                localSize: c.generate(using: Gen.choose((0, Int64(1024 * 1024 * 100)))), // 限制为100MB以内
                cloudSize: c.generate(using: Gen.choose((0, Int64(1024 * 1024 * 100)))), // 限制为100MB以内
                resolutionOptions: ConflictInfo.availableOptions(for: conflictType)
            )
        }
    }
}

// 扩展基础类型的生成器
extension Date: @retroactive Arbitrary {
    public static var arbitrary: Gen<Date> {
        // 生成过去1年到未来1年的日期
        let now = Date().timeIntervalSince1970
        let oneYear: TimeInterval = 86400 * 365
        return Gen.choose((now - oneYear, now + oneYear))
            .map { Date(timeIntervalSince1970: $0) }
    }
}

extension UUID: @retroactive Arbitrary {
    public static var arbitrary: Gen<UUID> {
        return Gen.pure(UUID())
    }
}

// MARK: - UI Tests (Task 7.4)

/// 用户界面单元测试，测试界面组件的交互和状态更新
/// 功能: macos-sync-client, 任务 7.4: 编写用户界面单元测试
/// 验证需求: 需求 10.1
extension MacOSSyncClientTests {
    
    // MARK: - MainWindow Tests
    
    /// 测试主窗口的标签页切换
    func testMainWindowTabSwitching() {
        // 测试标签页类型
        let allTabs = MainWindow.TabType.allCases
        XCTAssertEqual(allTabs.count, 4)
        XCTAssertTrue(allTabs.contains(.files))
        XCTAssertTrue(allTabs.contains(.activity))
        XCTAssertTrue(allTabs.contains(.conflicts))
        XCTAssertTrue(allTabs.contains(.settings))
        
        // 测试标签页显示名称
        XCTAssertEqual(MainWindow.TabType.files.displayName, "Files")
        XCTAssertEqual(MainWindow.TabType.activity.displayName, "Activity")
        XCTAssertEqual(MainWindow.TabType.conflicts.displayName, "Conflicts")
        XCTAssertEqual(MainWindow.TabType.settings.displayName, "Settings")
        
        // 测试标签页图标
        XCTAssertEqual(MainWindow.TabType.files.iconName, "doc.fill")
        XCTAssertEqual(MainWindow.TabType.activity.iconName, "chart.line.uptrend.xyaxis")
        XCTAssertEqual(MainWindow.TabType.conflicts.iconName, "exclamationmark.triangle.fill")
        XCTAssertEqual(MainWindow.TabType.settings.iconName, "gear")
    }
    
    // MARK: - StatusManager UI Integration Tests
    
    /// 测试状态管理器与UI的集成
    @MainActor
    func testStatusManagerUIIntegration() async {
        let statusManager = StatusManager()
        
        // 测试初始状态
        let initialStats = statusManager.getStatusStatistics()
        XCTAssertEqual(initialStats.totalItems, 0)
        XCTAssertEqual(initialStats.syncedItems, 0)
        
        // 创建测试数据
        let testItems = [
            SyncItem(
                cloudId: "1",
                localPath: "/test/file1.txt",
                cloudPath: "/file1.txt",
                name: "file1.txt",
                type: .file,
                size: 1024,
                modifiedDate: Date(),
                syncState: .synced,
                hash: "hash1"
            ),
            SyncItem(
                cloudId: "2",
                localPath: "/test/file2.txt",
                cloudPath: "/file2.txt",
                name: "file2.txt",
                type: .file,
                size: 2048,
                modifiedDate: Date(),
                syncState: .uploading,
                hash: "hash2"
            )
        ]
        
        // 更新状态
        statusManager.updateStatus(for: testItems)
        
        // 验证状态更新
        let updatedStats = statusManager.getStatusStatistics()
        XCTAssertEqual(updatedStats.totalItems, 2)
        XCTAssertEqual(updatedStats.syncedItems, 1)
        XCTAssertEqual(updatedStats.uploadingItems, 1)
        
        // 验证单个项目状态
        let file1Status = statusManager.getStatusInfo(for: "/test/file1.txt")
        XCTAssertNotNil(file1Status)
        XCTAssertEqual(file1Status?.state, .synced)
        XCTAssertEqual(file1Status?.path, "/test/file1.txt")
        
        let file2Status = statusManager.getStatusInfo(for: "/test/file2.txt")
        XCTAssertNotNil(file2Status)
        XCTAssertEqual(file2Status?.state, .uploading)
        XCTAssertEqual(file2Status?.path, "/test/file2.txt")
    }
    
    /// 测试状态变化事件的UI响应
    @MainActor
    func testStatusChangeUIResponse() async {
        let statusManager = StatusManager()
        var receivedChanges: [StatusChange] = []
        
        // 监听状态变化
        let expectation = XCTestExpectation(description: "Status change received")
        
        Task {
            for await change in statusManager.statusChanges {
                receivedChanges.append(change)
                if receivedChanges.count >= 2 {
                    expectation.fulfill()
                    break
                }
            }
        }
        
        // 触发状态变化
        statusManager.updateStatus(for: "/test/file.txt", state: .uploading, progress: 0.5)
        statusManager.updateStatus(for: "/test/file.txt", state: .synced, progress: 1.0)
        
        // 等待事件
        await fulfillment(of: [expectation], timeout: 1.0)
        
        // 验证事件
        XCTAssertEqual(receivedChanges.count, 2)
        XCTAssertEqual(receivedChanges[0].newState, .uploading)
        XCTAssertEqual(receivedChanges[0].progress, 0.5)
        XCTAssertEqual(receivedChanges[1].newState, .synced)
        XCTAssertEqual(receivedChanges[1].progress, 1.0)
    }
    
    // MARK: - SyncProgress UI Tests
    
    /// 测试同步进度的UI显示
    func testSyncProgressUIDisplay() {
        let progress = SyncProgress(
            totalItems: 100,
            completedItems: 75,
            totalBytes: 1024000,
            transferredBytes: 768000,
            currentOperation: "Uploading file.txt",
            estimatedTimeRemaining: 30
        )
        
        // 验证进度计算
        XCTAssertEqual(progress.completionPercentage, 0.75, accuracy: 0.01)
        XCTAssertEqual(progress.transferPercentage, 0.75, accuracy: 0.01)
        
        // 验证显示信息
        XCTAssertEqual(progress.currentOperation, "Uploading file.txt")
        XCTAssertEqual(progress.estimatedTimeRemaining, 30)
        
        // 测试进度的有效性
        XCTAssertTrue(progress.completionPercentage >= 0.0 && progress.completionPercentage <= 1.0)
        XCTAssertTrue(progress.transferPercentage >= 0.0 && progress.transferPercentage <= 1.0)
        XCTAssertTrue(progress.completedItems <= progress.totalItems)
        XCTAssertTrue(progress.transferredBytes <= progress.totalBytes)
    }
    
    /// 测试进度更新的UI响应
    func testProgressUpdateUIResponse() {
        var progress = SyncProgress(
            totalItems: 10,
            completedItems: 0,
            totalBytes: 10000,
            transferredBytes: 0
        )
        
        // 模拟进度更新
        let updates = [
            (completedItems: 2, transferredBytes: Int64(2000)),
            (completedItems: 5, transferredBytes: Int64(5000)),
            (completedItems: 8, transferredBytes: Int64(8000)),
            (completedItems: 10, transferredBytes: Int64(10000))
        ]
        
        for update in updates {
            progress = SyncProgress(
                totalItems: progress.totalItems,
                completedItems: update.completedItems,
                totalBytes: progress.totalBytes,
                transferredBytes: update.transferredBytes,
                currentOperation: "Processing item \(update.completedItems)",
                estimatedTimeRemaining: Double(progress.totalItems - update.completedItems) * 5
            )
            
            // 验证进度的一致性
            XCTAssertTrue(progress.completedItems <= progress.totalItems)
            XCTAssertTrue(progress.transferredBytes <= progress.totalBytes)
            XCTAssertTrue(progress.completionPercentage >= 0.0 && progress.completionPercentage <= 1.0)
            XCTAssertTrue(progress.transferPercentage >= 0.0 && progress.transferPercentage <= 1.0)
        }
        
        // 验证最终状态
        XCTAssertEqual(progress.completedItems, 10)
        XCTAssertEqual(progress.transferredBytes, 10000)
        XCTAssertEqual(progress.completionPercentage, 1.0, accuracy: 0.01)
        XCTAssertEqual(progress.transferPercentage, 1.0, accuracy: 0.01)
    }
    
    // MARK: - ConflictInfo UI Tests
    
    /// 测试冲突信息的UI显示
    func testConflictInfoUIDisplay() {
        let conflictInfo = ConflictInfo(
            itemId: UUID(),
            itemName: "test-file.txt",
            conflictType: .contentConflict,
            localModifiedDate: Date(),
            cloudModifiedDate: Date().addingTimeInterval(-3600),
            localSize: 1024,
            cloudSize: 2048,
            resolutionOptions: ConflictInfo.availableOptions(for: .contentConflict)
        )
        
        // 验证冲突信息
        XCTAssertEqual(conflictInfo.conflictType, .contentConflict)
        XCTAssertEqual(conflictInfo.localSize, 1024)
        XCTAssertEqual(conflictInfo.cloudSize, 2048)
        
        // 验证解决选项
        let availableOptions = conflictInfo.resolutionOptions
        XCTAssertTrue(availableOptions.contains(ConflictInfo.ResolutionOption.keepLocal))
        XCTAssertTrue(availableOptions.contains(ConflictInfo.ResolutionOption.keepCloud))
        XCTAssertTrue(availableOptions.contains(ConflictInfo.ResolutionOption.keepBoth))
        
        // 测试不同冲突类型的选项
        let nameConflict = ConflictInfo(
            itemId: UUID(),
            itemName: "name-conflict.txt",
            conflictType: .nameConflict,
            localModifiedDate: Date(),
            cloudModifiedDate: Date(),
            localSize: 1024,
            cloudSize: 1024,
            resolutionOptions: ConflictInfo.availableOptions(for: .nameConflict)
        )
        
        let nameOptions = nameConflict.resolutionOptions
        XCTAssertTrue(nameOptions.contains(ConflictInfo.ResolutionOption.keepLocal))
        XCTAssertTrue(nameOptions.contains(ConflictInfo.ResolutionOption.keepCloud))
        XCTAssertTrue(nameOptions.contains(ConflictInfo.ResolutionOption.keepBoth))
        
        let typeConflict = ConflictInfo(
            itemId: UUID(),
            itemName: "type-conflict",
            conflictType: .typeConflict,
            localModifiedDate: Date(),
            cloudModifiedDate: Date(),
            localSize: 0,
            cloudSize: 1024,
            resolutionOptions: ConflictInfo.availableOptions(for: .typeConflict)
        )
        
        let typeOptions = typeConflict.resolutionOptions
        XCTAssertTrue(typeOptions.contains(ConflictInfo.ResolutionOption.keepLocal))
        XCTAssertTrue(typeOptions.contains(ConflictInfo.ResolutionOption.keepCloud))
        XCTAssertFalse(typeOptions.contains(ConflictInfo.ResolutionOption.keepBoth)) // 类型冲突不支持保留两者
    }
    
    // MARK: - StatusIcon and StatusColor UI Tests
    
    /// 测试状态图标的UI显示
    func testStatusIconUIDisplay() {
        // 测试所有同步状态的图标
        let testCases: [(SyncItem.SyncState, StatusIcon)] = [
            (.synced, .synced),
            (.uploading, .uploading),
            (.downloading, .downloading),
            (.localOnly, .localOnly),
            (.cloudOnly, .cloudOnly),
            (.conflict, .conflict),
            (.error, .error),
            (.paused, .paused)
        ]
        
        for (state, expectedIcon) in testCases {
            let icon = StatusIcon.from(state: state)
            XCTAssertEqual(icon, expectedIcon, "Icon for state \(state) should be \(expectedIcon)")
            
            // 验证图标有对应的系统图标名称
            XCTAssertFalse(icon.rawValue.isEmpty, "Icon \(icon) should have a system name")
        }
    }
    
    /// 测试状态颜色的UI显示
    func testStatusColorUIDisplay() {
        // 测试所有同步状态的颜色
        let testCases: [(SyncItem.SyncState, StatusColor)] = [
            (.synced, .green),
            (.uploading, .blue),
            (.downloading, .blue),
            (.localOnly, .gray),
            (.cloudOnly, .gray),
            (.conflict, .yellow),
            (.error, .red),
            (.paused, .orange)
        ]
        
        for (state, expectedColor) in testCases {
            let color = StatusColor.from(state: state)
            XCTAssertEqual(color, expectedColor, "Color for state \(state) should be \(expectedColor)")
        }
    }
    
    // MARK: - User Interaction Tests
    
    /// 测试用户操作的响应
    @MainActor
    func testUserInteractionResponse() async {
        let statusManager = StatusManager()
        
        // 模拟用户操作：添加文件
        let testFile = SyncItem(
            cloudId: "test1",
            localPath: "/test/userfile.txt",
            cloudPath: "/userfile.txt",
            name: "userfile.txt",
            type: .file,
            size: 1024,
            modifiedDate: Date(),
            syncState: .localOnly,
            hash: "userhash"
        )
        
        // 用户操作：开始同步
        statusManager.updateStatus(for: testFile.localPath, state: .uploading, progress: 0.0)
        
        // 验证状态更新
        let uploadingStatus = statusManager.getStatusInfo(for: testFile.localPath)
        XCTAssertNotNil(uploadingStatus)
        XCTAssertEqual(uploadingStatus?.state, .uploading)
        XCTAssertEqual(uploadingStatus?.progress, 0.0)
        
        // 模拟进度更新
        statusManager.updateStatus(for: testFile.localPath, state: .uploading, progress: 0.5)
        
        let progressStatus = statusManager.getStatusInfo(for: testFile.localPath)
        XCTAssertEqual(progressStatus?.progress, 0.5)
        
        // 完成同步
        statusManager.updateStatus(for: testFile.localPath, state: .synced, progress: 1.0)
        
        let completedStatus = statusManager.getStatusInfo(for: testFile.localPath)
        XCTAssertEqual(completedStatus?.state, .synced)
        XCTAssertEqual(completedStatus?.progress, 1.0)
    }
    
    /// 测试错误状态的UI处理
    @MainActor
    func testErrorStateUIHandling() async {
        let statusManager = StatusManager()
        
        // 模拟错误状态
        statusManager.updateStatus(for: "/test/errorfile.txt", state: .error)
        
        // 验证错误状态
        let errorStatus = statusManager.getStatusInfo(for: "/test/errorfile.txt")
        XCTAssertNotNil(errorStatus)
        XCTAssertEqual(errorStatus?.state, .error)
        
        // 验证统计信息包含错误项目
        let stats = statusManager.getStatusStatistics()
        XCTAssertEqual(stats.errorItems, 1)
        
        // 验证错误状态的图标和颜色
        let errorIcon = StatusIcon.from(state: .error)
        let errorColor = StatusColor.from(state: .error)
        XCTAssertEqual(errorIcon, .error)
        XCTAssertEqual(errorColor, .red)
    }
    
    /// 测试批量操作的UI响应
    @MainActor
    func testBatchOperationUIResponse() async {
        let statusManager = StatusManager()
        
        // 创建批量测试数据
        let batchItems = (1...10).map { index in
            SyncItem(
                cloudId: "batch\(index)",
                localPath: "/test/batch\(index).txt",
                cloudPath: "/batch\(index).txt",
                name: "batch\(index).txt",
                type: .file,
                size: Int64(index * 1024),
                modifiedDate: Date(),
                syncState: index % 2 == 0 ? .synced : .uploading,
                hash: "batchhash\(index)"
            )
        }
        
        // 批量更新状态
        statusManager.updateStatus(for: batchItems)
        
        // 验证批量更新结果
        let stats = statusManager.getStatusStatistics()
        XCTAssertEqual(stats.totalItems, 10)
        XCTAssertEqual(stats.syncedItems, 5) // 偶数索引的项目
        XCTAssertEqual(stats.uploadingItems, 5) // 奇数索引的项目
        
        // 验证单个项目状态
        for item in batchItems {
            let status = statusManager.getStatusInfo(for: item.localPath)
            XCTAssertNotNil(status)
            XCTAssertEqual(status?.state, item.syncState)
            XCTAssertEqual(status?.path, item.localPath)
        }
    }
}
    // MARK: - UI Tests (Task 7.4)
    
    /// 测试主窗口的标签页切换
    /// 功能: macos-sync-client, 任务 7.4: 编写用户界面单元测试
    /// 验证需求: 需求 10.1
    func testMainWindowTabSwitching() {
        // 测试标签页类型
        let allTabs = MainWindow.TabType.allCases
        XCTAssertEqual(allTabs.count, 4)
        XCTAssertTrue(allTabs.contains(.files))
        XCTAssertTrue(allTabs.contains(.activity))
        XCTAssertTrue(allTabs.contains(.conflicts))
        XCTAssertTrue(allTabs.contains(.settings))
        
        // 测试标签页显示名称
        XCTAssertEqual(MainWindow.TabType.files.displayName, "Files")
        XCTAssertEqual(MainWindow.TabType.activity.displayName, "Activity")
        XCTAssertEqual(MainWindow.TabType.conflicts.displayName, "Conflicts")
        XCTAssertEqual(MainWindow.TabType.settings.displayName, "Settings")
        
        // 测试标签页图标
        XCTAssertEqual(MainWindow.TabType.files.iconName, "doc.fill")
        XCTAssertEqual(MainWindow.TabType.activity.iconName, "chart.line.uptrend.xyaxis")
        XCTAssertEqual(MainWindow.TabType.conflicts.iconName, "exclamationmark.triangle.fill")
        XCTAssertEqual(MainWindow.TabType.settings.iconName, "gear")
    }
    
    /// 测试状态管理器与UI的集成
    @MainActor
    func testStatusManagerUIIntegration() async {
        let statusManager = StatusManager()
        
        // 测试初始状态
        let initialStats = statusManager.getStatusStatistics()
        XCTAssertEqual(initialStats.totalItems, 0)
        XCTAssertEqual(initialStats.syncedItems, 0)
        
        // 创建测试数据
        let testItems = [
            SyncItem(
                cloudId: "1",
                localPath: "/test/file1.txt",
                cloudPath: "/file1.txt",
                name: "file1.txt",
                type: .file,
                size: 1024,
                modifiedDate: Date(),
                syncState: .synced,
                hash: "hash1"
            ),
            SyncItem(
                cloudId: "2",
                localPath: "/test/file2.txt",
                cloudPath: "/file2.txt",
                name: "file2.txt",
                type: .file,
                size: 2048,
                modifiedDate: Date(),
                syncState: .uploading,
                hash: "hash2"
            )
        ]
        
        // 更新状态
        statusManager.updateStatus(for: testItems)
        
        // 验证状态更新
        let updatedStats = statusManager.getStatusStatistics()
        XCTAssertEqual(updatedStats.totalItems, 2)
        XCTAssertEqual(updatedStats.syncedItems, 1)
        XCTAssertEqual(updatedStats.uploadingItems, 1)
        
        // 验证单个项目状态
        let file1Status = statusManager.getStatusInfo(for: "/test/file1.txt")
        XCTAssertNotNil(file1Status)
        XCTAssertEqual(file1Status?.state, .synced)
        XCTAssertEqual(file1Status?.path, "/test/file1.txt")
        
        let file2Status = statusManager.getStatusInfo(for: "/test/file2.txt")
        XCTAssertNotNil(file2Status)
        XCTAssertEqual(file2Status?.state, .uploading)
        XCTAssertEqual(file2Status?.path, "/test/file2.txt")
    }
    
    /// 测试同步进度的UI显示
    func testSyncProgressUIDisplay() {
        let progress = SyncProgress(
            totalItems: 100,
            completedItems: 75,
            totalBytes: 1024000,
            transferredBytes: 768000,
            currentOperation: "Uploading file.txt",
            estimatedTimeRemaining: 30
        )
        
        // 验证进度计算
        XCTAssertEqual(progress.completionPercentage, 0.75, accuracy: 0.01)
        XCTAssertEqual(progress.transferPercentage, 0.75, accuracy: 0.01)
        
        // 验证显示信息
        XCTAssertEqual(progress.currentOperation, "Uploading file.txt")
        XCTAssertEqual(progress.estimatedTimeRemaining, 30)
        
        // 测试进度的有效性
        XCTAssertTrue(progress.completionPercentage >= 0.0 && progress.completionPercentage <= 1.0)
        XCTAssertTrue(progress.transferPercentage >= 0.0 && progress.transferPercentage <= 1.0)
        XCTAssertTrue(progress.completedItems <= progress.totalItems)
        XCTAssertTrue(progress.transferredBytes <= progress.totalBytes)
    }
    
    /// 测试状态图标的UI显示
    func testStatusIconUIDisplay() {
        // 测试所有同步状态的图标
        let testCases: [(SyncItem.SyncState, StatusIcon)] = [
            (.synced, .synced),
            (.uploading, .uploading),
            (.downloading, .downloading),
            (.localOnly, .localOnly),
            (.cloudOnly, .cloudOnly),
            (.conflict, .conflict),
            (.error, .error),
            (.paused, .paused)
        ]
        
        for (state, expectedIcon) in testCases {
            let icon = StatusIcon.from(state: state)
            XCTAssertEqual(icon, expectedIcon, "Icon for state \(state) should be \(expectedIcon)")
        }
    }
    
    /// 测试状态颜色的UI显示
    func testStatusColorUIDisplay() {
        // 测试所有同步状态的颜色
        let testCases: [(SyncItem.SyncState, StatusColor)] = [
            (.synced, .green),
            (.uploading, .blue),
            (.downloading, .blue),
            (.localOnly, .gray),
            (.cloudOnly, .gray),
            (.conflict, .yellow),
            (.error, .red),
            (.paused, .orange)
        ]
        
        for (state, expectedColor) in testCases {
            let color = StatusColor.from(state: state)
            XCTAssertEqual(color, expectedColor, "Color for state \(state) should be \(expectedColor)")
        }
    }
    
    /// 测试用户操作的响应
    @MainActor
    func testUserInteractionResponse() async {
        let statusManager = StatusManager()
        
        // 模拟用户操作：添加文件
        let testFile = SyncItem(
            cloudId: "test1",
            localPath: "/test/userfile.txt",
            cloudPath: "/userfile.txt",
            name: "userfile.txt",
            type: .file,
            size: 1024,
            modifiedDate: Date(),
            syncState: .localOnly,
            hash: "userhash"
        )
        
        // 用户操作：开始同步
        statusManager.updateStatus(for: testFile.localPath, state: .uploading, progress: 0.0)
        
        // 验证状态更新
        let uploadingStatus = statusManager.getStatusInfo(for: testFile.localPath)
        XCTAssertNotNil(uploadingStatus)
        XCTAssertEqual(uploadingStatus?.state, .uploading)
        XCTAssertEqual(uploadingStatus?.progress, 0.0)
        
        // 模拟进度更新
        statusManager.updateStatus(for: testFile.localPath, state: .uploading, progress: 0.5)
        
        let progressStatus = statusManager.getStatusInfo(for: testFile.localPath)
        XCTAssertEqual(progressStatus?.progress, 0.5)
        
        // 完成同步
        statusManager.updateStatus(for: testFile.localPath, state: .synced, progress: 1.0)
        
        let completedStatus = statusManager.getStatusInfo(for: testFile.localPath)
        XCTAssertEqual(completedStatus?.state, .synced)
        XCTAssertEqual(completedStatus?.progress, 1.0)
    }
    
    /// 测试错误状态的UI处理
    @MainActor
    func testErrorStateUIHandling() async {
        let statusManager = StatusManager()
        
        // 模拟错误状态
        statusManager.updateStatus(for: "/test/errorfile.txt", state: .error)
        
        // 验证错误状态
        let errorStatus = statusManager.getStatusInfo(for: "/test/errorfile.txt")
        XCTAssertNotNil(errorStatus)
        XCTAssertEqual(errorStatus?.state, .error)
        
        // 验证统计信息包含错误项目
        let stats = statusManager.getStatusStatistics()
        XCTAssertEqual(stats.errorItems, 1)
        
        // 验证错误状态的图标和颜色
        let errorIcon = StatusIcon.from(state: .error)
        let errorColor = StatusColor.from(state: .error)
        XCTAssertEqual(errorIcon, .error)
        XCTAssertEqual(errorColor, .red)
    }
    
    /// 测试批量操作的UI响应
    @MainActor
    func testBatchOperationUIResponse() async {
        let statusManager = StatusManager()
        
        // 创建批量测试数据
        let batchItems = (1...10).map { index in
            SyncItem(
                cloudId: "batch\(index)",
                localPath: "/test/batch\(index).txt",
                cloudPath: "/batch\(index).txt",
                name: "batch\(index).txt",
                type: .file,
                size: Int64(index * 1024),
                modifiedDate: Date(),
                syncState: index % 2 == 0 ? .synced : .uploading,
                hash: "batchhash\(index)"
            )
        }
        
        // 批量更新状态
        statusManager.updateStatus(for: batchItems)
        
        // 验证批量更新结果
        let stats = statusManager.getStatusStatistics()
        XCTAssertEqual(stats.totalItems, 10)
        XCTAssertEqual(stats.syncedItems, 5) // 偶数索引的项目
        XCTAssertEqual(stats.uploadingItems, 5) // 奇数索引的项目
        
        // 验证单个项目状态
        for item in batchItems {
            let status = statusManager.getStatusInfo(for: item.localPath)
            XCTAssertNotNil(status)
            XCTAssertEqual(status?.state, item.syncState)
            XCTAssertEqual(status?.path, item.localPath)
        }
    }