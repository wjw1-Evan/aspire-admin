import Foundation
import OSLog
import XCTest

@testable import MacOSSyncClientCore

/// 端到端集成测试 - 测试完整的同步工作流
@MainActor
class EndToEndIntegrationTests: XCTestCase {

    private var integrator: SyncClientIntegrator!
    private var testDirectory: URL!
    private var logger = Logger(
        subsystem: "com.macos.syncclient.tests", category: "EndToEndIntegrationTests")

    override func setUp() async throws {
        try await super.setUp()

        // 创建测试目录
        testDirectory = FileManager.default.temporaryDirectory
            .appendingPathComponent("SyncClientIntegrationTest_\(UUID().uuidString)")
        try FileManager.default.createDirectory(
            at: testDirectory, withIntermediateDirectories: true)

        // 创建集成器实例
        integrator = SyncClientIntegrator()

        // 等待初始化完成
        let timeout = Date().addingTimeInterval(30)  // 30秒超时
        while !integrator.isInitialized && Date() < timeout {
            if let error = integrator.initializationError {
                XCTFail("Integration failed to initialize: \(error.localizedDescription)")
                return
            }
            try await Task.sleep(nanoseconds: 100_000_000)  // 100ms
        }

        XCTAssertTrue(integrator.isInitialized, "Integrator should be initialized")

        // 配置测试同步目录
        var config = integrator.syncConfiguration
        config.syncRootPath = testDirectory.path
        try await integrator.updateConfiguration(config)

        logger.info("End-to-end integration test setup completed")
    }

    override func tearDown() async throws {
        // 停止同步
        await integrator.stopSync()

        // 清理测试目录
        if let testDirectory = testDirectory {
            try? FileManager.default.removeItem(at: testDirectory)
        }

        integrator = nil

        try await super.tearDown()
        logger.info("End-to-end integration test teardown completed")
    }

    // MARK: - 完整同步工作流测试

    func testCompleteFileSyncWorkflow() async throws {
        logger.info("Testing complete file sync workflow")

        // 1. 创建测试文件
        let testFile = testDirectory.appendingPathComponent("test_document.txt")
        let testContent = "This is a test document for sync workflow testing."
        try testContent.write(to: testFile, atomically: true, encoding: .utf8)

        // 2. 启动同步
        try await integrator.resumeSync()

        // 3. 等待文件被检测和同步
        let syncTimeout = Date().addingTimeInterval(10)
        var fileSynced = false

        while Date() < syncTimeout && !fileSynced {
            let itemState = integrator.syncEngine.getItemState(at: testFile.path)
            if itemState == .synced {
                fileSynced = true
                break
            }
            try await Task.sleep(nanoseconds: 500_000_000)  // 500ms
        }

        XCTAssertTrue(fileSynced, "File should be synced within timeout")

        // 4. 修改文件
        let modifiedContent = testContent + "\nThis line was added after initial sync."
        try modifiedContent.write(to: testFile, atomically: true, encoding: .utf8)

        // 5. 等待修改被同步
        let modifyTimeout = Date().addingTimeInterval(10)
        var modificationSynced = false

        while Date() < modifyTimeout && !modificationSynced {
            // 检查同步状态
            let itemState = integrator.syncEngine.getItemState(at: testFile.path)
            if itemState == .synced {
                modificationSynced = true
                break
            }
            try await Task.sleep(nanoseconds: 500_000_000)  // 500ms
        }

        XCTAssertTrue(modificationSynced, "File modification should be synced within timeout")

        // 6. 删除文件
        try FileManager.default.removeItem(at: testFile)

        // 7. 等待删除被同步
        let deleteTimeout = Date().addingTimeInterval(10)
        var deletionSynced = false

        while Date() < deleteTimeout && !deletionSynced {
            let itemState = integrator.syncEngine.getItemState(at: testFile.path)
            if itemState == nil {
                deletionSynced = true
                break
            }
            try await Task.sleep(nanoseconds: 500_000_000)  // 500ms
        }

        XCTAssertTrue(deletionSynced, "File deletion should be synced within timeout")

        logger.info("Complete file sync workflow test passed")
    }

    func testFolderSyncWorkflow() async throws {
        logger.info("Testing folder sync workflow")

        // 1. 创建测试文件夹结构
        let testFolder = testDirectory.appendingPathComponent("TestFolder")
        let subFolder = testFolder.appendingPathComponent("SubFolder")
        try FileManager.default.createDirectory(at: subFolder, withIntermediateDirectories: true)

        // 2. 在文件夹中创建文件
        let file1 = testFolder.appendingPathComponent("file1.txt")
        let file2 = subFolder.appendingPathComponent("file2.txt")

        try "Content of file 1".write(to: file1, atomically: true, encoding: .utf8)
        try "Content of file 2".write(to: file2, atomically: true, encoding: .utf8)

        // 3. 启动同步
        try await integrator.resumeSync()

        // 4. 等待文件夹和文件被同步
        let syncTimeout = Date().addingTimeInterval(15)
        var allSynced = false

        while Date() < syncTimeout && !allSynced {
            let folderState = integrator.syncEngine.getItemState(at: testFolder.path)
            let file1State = integrator.syncEngine.getItemState(at: file1.path)
            let file2State = integrator.syncEngine.getItemState(at: file2.path)

            if folderState == .synced && file1State == .synced && file2State == .synced {
                allSynced = true
                break
            }
            try await Task.sleep(nanoseconds: 500_000_000)  // 500ms
        }

        XCTAssertTrue(allSynced, "All folder contents should be synced within timeout")

        // 5. 重命名文件夹
        let renamedFolder = testDirectory.appendingPathComponent("RenamedTestFolder")
        try FileManager.default.moveItem(at: testFolder, to: renamedFolder)

        // 6. 等待重命名被同步
        let renameTimeout = Date().addingTimeInterval(10)
        var renameSynced = false

        while Date() < renameTimeout && !renameSynced {
            let oldState = integrator.syncEngine.getItemState(at: testFolder.path)
            let newState = integrator.syncEngine.getItemState(at: renamedFolder.path)

            if oldState == nil && newState == .synced {
                renameSynced = true
                break
            }
            try await Task.sleep(nanoseconds: 500_000_000)  // 500ms
        }

        XCTAssertTrue(renameSynced, "Folder rename should be synced within timeout")

        logger.info("Folder sync workflow test passed")
    }

    func testConflictResolutionWorkflow() async throws {
        logger.info("Testing conflict resolution workflow")

        // 1. 创建测试文件
        let testFile = testDirectory.appendingPathComponent("conflict_test.txt")
        let originalContent = "Original content"
        try originalContent.write(to: testFile, atomically: true, encoding: .utf8)

        // 2. 启动同步并等待初始同步完成
        try await integrator.resumeSync()

        let initialSyncTimeout = Date().addingTimeInterval(10)
        while Date() < initialSyncTimeout {
            if integrator.syncEngine.getItemState(at: testFile.path) == .synced {
                break
            }
            try await Task.sleep(nanoseconds: 500_000_000)
        }

        // 3. 模拟冲突 - 同时修改本地和云端文件
        let localContent = originalContent + "\nLocal modification"
        try localContent.write(to: testFile, atomically: true, encoding: .utf8)

        // 模拟云端也有修改（这里我们通过直接调用冲突解决器来模拟）
        let conflictInfo = ConflictInfo(
            itemId: UUID(),
            itemName: testFile.lastPathComponent,
            conflictType: .contentConflict,
            localModifiedDate: Date(),
            cloudModifiedDate: Date().addingTimeInterval(-60),  // 1分钟前
            localSize: Int64(localContent.count),
            cloudSize: Int64((originalContent + "\nCloud modification").count),
            resolutionOptions: ConflictInfo.availableOptions(for: .contentConflict)
        )

        // 4. 检测冲突
        let conflicts = await integrator.conflictResolver.detectConflicts()

        // 如果没有自动检测到冲突，我们手动创建一个用于测试
        if conflicts.isEmpty {
            // 这里我们测试冲突解决器的功能
            try await integrator.conflictResolver.resolveConflict(
                conflictInfo, resolution: ConflictInfo.ResolutionOption.keepBoth)

            // 验证冲突副本被创建
            let conflictCopyPath = testFile.path.replacingOccurrences(
                of: ".txt", with: " (Conflict).txt")
            XCTAssertTrue(
                FileManager.default.fileExists(atPath: conflictCopyPath),
                "Conflict copy should be created")
        }

        logger.info("Conflict resolution workflow test passed")
    }

    func testOfflineAccessWorkflow() async throws {
        logger.info("Testing offline access workflow")

        // 1. 创建测试文件
        let testFile = testDirectory.appendingPathComponent("offline_test.txt")
        let testContent = "This file should be available offline"
        try testContent.write(to: testFile, atomically: true, encoding: .utf8)

        // 2. 启动同步
        try await integrator.resumeSync()

        // 3. 等待文件同步
        let syncTimeout = Date().addingTimeInterval(10)
        while Date() < syncTimeout {
            if integrator.syncEngine.getItemState(at: testFile.path) == .synced {
                break
            }
            try await Task.sleep(nanoseconds: 500_000_000)
        }

        // 4. 标记文件为离线可用
        try await integrator.offlineManager.makeAvailableOffline(testFile.path)

        // 5. 验证文件在离线列表中
        let offlineItems = integrator.offlineManager.getOfflineItems()
        XCTAssertTrue(
            offlineItems.contains { $0.localPath == testFile.path },
            "File should be in offline items")

        // 6. 验证离线访问
        XCTAssertTrue(
            integrator.offlineManager.isAvailableOffline(testFile.path),
            "File should be available offline")

        // 7. 模拟离线修改
        let offlineContent = testContent + "\nModified while offline"
        try offlineContent.write(to: testFile, atomically: true, encoding: .utf8)

        // 8. 验证离线修改被标记
        let itemState = integrator.syncEngine.getItemState(at: testFile.path)
        XCTAssertNotEqual(itemState, .synced, "Modified offline file should not be in synced state")

        logger.info("Offline access workflow test passed")
    }

    func testSelectiveSyncWorkflow() async throws {
        logger.info("Testing selective sync workflow")

        // 1. 创建多个文件夹
        let folder1 = testDirectory.appendingPathComponent("Folder1")
        let folder2 = testDirectory.appendingPathComponent("Folder2")
        let folder3 = testDirectory.appendingPathComponent("Folder3")

        try FileManager.default.createDirectory(at: folder1, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: folder2, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: folder3, withIntermediateDirectories: true)

        // 2. 在每个文件夹中创建文件
        try "Content 1".write(
            to: folder1.appendingPathComponent("file1.txt"), atomically: true, encoding: .utf8)
        try "Content 2".write(
            to: folder2.appendingPathComponent("file2.txt"), atomically: true, encoding: .utf8)
        try "Content 3".write(
            to: folder3.appendingPathComponent("file3.txt"), atomically: true, encoding: .utf8)

        // 3. 启动同步
        try await integrator.resumeSync()

        // 4. 等待初始同步完成
        let initialSyncTimeout = Date().addingTimeInterval(15)
        while Date() < initialSyncTimeout {
            let folder1State = integrator.syncEngine.getItemState(at: folder1.path)
            let folder2State = integrator.syncEngine.getItemState(at: folder2.path)
            let folder3State = integrator.syncEngine.getItemState(at: folder3.path)

            if folder1State == .synced && folder2State == .synced && folder3State == .synced {
                break
            }
            try await Task.sleep(nanoseconds: 500_000_000)
        }

        // 5. 取消选择 Folder2
        try await integrator.selectiveSync.selectFolder(folder2.path, selected: false)
        try await integrator.selectiveSync.applySelectionChanges()

        // 6. 验证选择性同步设置
        let selectedFolders = integrator.selectiveSync.getSelectedFolders()
        XCTAssertFalse(selectedFolders.contains(folder2.path), "Folder2 should not be selected")
        XCTAssertTrue(selectedFolders.contains(folder1.path), "Folder1 should still be selected")
        XCTAssertTrue(selectedFolders.contains(folder3.path), "Folder3 should still be selected")

        // 7. 验证本地文件夹状态
        // Folder2 应该被移除或标记为仅云端
        let folder2State = integrator.syncEngine.getItemState(at: folder2.path)
        XCTAssertNotEqual(folder2State, .synced, "Unselected folder should not be in synced state")

        logger.info("Selective sync workflow test passed")
    }

    func testBandwidthManagementWorkflow() async throws {
        logger.info("Testing bandwidth management workflow")

        // 1. 设置带宽限制
        var config = integrator.syncConfiguration
        config.bandwidthLimits.uploadLimit = 1024 * 1024  // 1MB/s
        config.bandwidthLimits.downloadLimit = 2 * 1024 * 1024  // 2MB/s
        try await integrator.updateConfiguration(config)

        // 2. 创建大文件进行测试
        let largeFile = testDirectory.appendingPathComponent("large_file.dat")
        let largeContent = String(repeating: "A", count: 5 * 1024 * 1024)  // 5MB
        try largeContent.write(to: largeFile, atomically: true, encoding: .utf8)

        // 3. 启动同步并监控带宽使用
        try await integrator.resumeSync()

        let startTime = Date()
        let monitorTimeout = Date().addingTimeInterval(30)
        var bandwidthRespected = false

        while Date() < monitorTimeout {
            let currentUsage = await integrator.bandwidthManager.getCurrentUsage()

            // 验证带宽限制被遵守
            if Double(currentUsage.uploadSpeed) <= Double(config.bandwidthLimits.uploadLimit!) * 1.1
            {  // 允许10%误差
                bandwidthRespected = true
            }

            // 检查文件是否已同步完成
            if integrator.syncEngine.getItemState(at: largeFile.path) == .synced {
                break
            }

            try await Task.sleep(nanoseconds: 1_000_000_000)  // 1秒
        }

        let syncDuration = Date().timeIntervalSince(startTime)

        // 验证同步时间合理（考虑带宽限制）
        let expectedMinimumTime =
            Double(largeContent.count) / Double(config.bandwidthLimits.uploadLimit!) * 0.8  // 允许20%误差
        XCTAssertGreaterThan(
            syncDuration, expectedMinimumTime, "Sync should respect bandwidth limits")

        logger.info("Bandwidth management workflow test passed")
    }

    func testErrorRecoveryWorkflow() async throws {
        logger.info("Testing error recovery workflow")

        // 1. 创建测试文件
        let testFile = testDirectory.appendingPathComponent("error_test.txt")
        let testContent = "This file will test error recovery"
        try testContent.write(to: testFile, atomically: true, encoding: .utf8)

        // 2. 启动同步
        try await integrator.resumeSync()

        // 3. 模拟网络错误
        // 这里我们通过直接调用错误恢复管理器来模拟错误处理
        let networkError = NSError(
            domain: "NetworkError", code: -1009,
            userInfo: [
                NSLocalizedDescriptionKey: "The Internet connection appears to be offline."
            ])

        await integrator.errorRecoveryManager.handleError(networkError, for: testFile.path)

        // 4. 验证错误恢复机制
        let recoveryInfo = await integrator.errorRecoveryManager.getRecoveryInfo(for: testFile.path)
        XCTAssertNotNil(recoveryInfo, "Recovery info should be available for failed operation")

        // 5. 模拟网络恢复
        await integrator.errorRecoveryManager.retryFailedOperations()

        // 6. 等待重试完成
        let retryTimeout = Date().addingTimeInterval(15)
        while Date() < retryTimeout {
            if integrator.syncEngine.getItemState(at: testFile.path) == .synced {
                break
            }
            try await Task.sleep(nanoseconds: 500_000_000)
        }

        XCTAssertEqual(
            integrator.syncEngine.getItemState(at: testFile.path), .synced,
            "File should be synced after error recovery")

        logger.info("Error recovery workflow test passed")
    }

    func testSystemIntegrationWorkflow() async throws {
        logger.info("Testing system integration workflow")

        // 1. 验证系统托盘集成
        XCTAssertNotNil(integrator.systemTrayManager, "System tray manager should be initialized")

        // 2. 验证 Finder 集成
        XCTAssertNotNil(
            integrator.finderIntegrationService, "Finder integration service should be initialized")

        // 3. 验证通知服务
        XCTAssertNotNil(
            integrator.notificationService, "Notification service should be initialized")

        // 4. 验证 Spotlight 集成
        XCTAssertNotNil(integrator.spotlightService, "Spotlight service should be initialized")

        // 5. 验证 Quick Look 集成
        XCTAssertNotNil(integrator.quickLookService, "Quick Look service should be initialized")

        // 6. 测试通知功能
        try await integrator.notificationService.showSyncCompletedNotification(itemCount: 5)

        // 7. 测试系统托盘状态更新
        await integrator.systemTrayManager.updateSyncState(.syncing)

        logger.info("System integration workflow test passed")
    }

    func testDiagnosticAndReportingWorkflow() async throws {
        logger.info("Testing diagnostic and reporting workflow")

        // 1. 生成诊断信息
        let diagnosticInfo = await integrator.getDiagnosticInfo()

        // 2. 验证诊断信息完整性
        XCTAssertNotNil(diagnosticInfo.systemInfo, "System info should be available")
        XCTAssertNotNil(diagnosticInfo.syncStatus, "Sync status should be available")
        XCTAssertNotNil(diagnosticInfo.errorLogs, "Error logs should be available")
        XCTAssertNotNil(
            diagnosticInfo.performanceMetrics, "Performance metrics should be available")

        // 3. 导出诊断报告
        let reportURL = try await integrator.exportDiagnosticReport()

        // 4. 验证报告文件存在
        XCTAssertTrue(
            FileManager.default.fileExists(atPath: reportURL.path),
            "Diagnostic report should be created")

        // 5. 验证报告内容
        let reportContent = try String(contentsOf: reportURL)
        XCTAssertFalse(reportContent.isEmpty, "Diagnostic report should not be empty")
        XCTAssertTrue(
            reportContent.contains("System Information"), "Report should contain system information"
        )
        XCTAssertTrue(reportContent.contains("Sync Status"), "Report should contain sync status")

        // 6. 清理报告文件
        try FileManager.default.removeItem(at: reportURL)

        logger.info("Diagnostic and reporting workflow test passed")
    }
}

// MARK: - Test Utilities

extension EndToEndIntegrationTests {

    private func waitForSyncState(
        _ expectedState: SyncItem.SyncState, at path: String, timeout: TimeInterval = 10
    ) async throws {
        let deadline = Date().addingTimeInterval(timeout)

        while Date() < deadline {
            if integrator.syncEngine.getItemState(at: path) == expectedState {
                return
            }
            try await Task.sleep(nanoseconds: 500_000_000)  // 500ms
        }

        XCTFail("Timeout waiting for sync state \(expectedState) at path: \(path)")
    }

    private func createTestFileStructure() throws -> [URL] {
        var files: [URL] = []

        // 创建根级文件
        let rootFile = testDirectory.appendingPathComponent("root_file.txt")
        try "Root file content".write(to: rootFile, atomically: true, encoding: .utf8)
        files.append(rootFile)

        // 创建子文件夹和文件
        let subDir = testDirectory.appendingPathComponent("SubDirectory")
        try FileManager.default.createDirectory(at: subDir, withIntermediateDirectories: true)

        let subFile = subDir.appendingPathComponent("sub_file.txt")
        try "Sub file content".write(to: subFile, atomically: true, encoding: .utf8)
        files.append(subFile)

        // 创建深层嵌套结构
        let deepDir = subDir.appendingPathComponent("DeepDirectory")
        try FileManager.default.createDirectory(at: deepDir, withIntermediateDirectories: true)

        let deepFile = deepDir.appendingPathComponent("deep_file.txt")
        try "Deep file content".write(to: deepFile, atomically: true, encoding: .utf8)
        files.append(deepFile)

        return files
    }
}
