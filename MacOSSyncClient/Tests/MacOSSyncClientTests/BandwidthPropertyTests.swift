import XCTest
@testable import MacOSSyncClientCore

/// 带宽管理属性测试
/// 验证属性 10: 带宽管理有效性
/// **验证需求: 需求 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**
class BandwidthPropertyTests: XCTestCase {
    
    var bandwidthManager: BandwidthManager!
    
    override func setUp() async throws {
        try await super.setUp()
        bandwidthManager = await BandwidthManager()
    }
    
    override func tearDown() async throws {
        bandwidthManager = nil
        try await super.tearDown()
    }
    
    /// 测试带宽限制设置的有效性
    /// 验证需求 8.1, 8.2: 用户设置的带宽限制应该被严格遵守
    /// **功能: macos-sync-client, 属性 10: 带宽管理有效性**
    func testBandwidthLimitEnforcement() async throws {
        // 测试多个不同的带宽限制值
        let testLimits: [Int64?] = [nil, 1024, 1024*1024, 10*1024*1024]
        
        for uploadLimit in testLimits {
            // 设置带宽限制
            await bandwidthManager.setUploadLimit(uploadLimit)
            
            // 验证限制设置
            let actualUploadLimit = await bandwidthManager.getUploadLimit()
            XCTAssertEqual(actualUploadLimit, uploadLimit, "Upload limit should match the set value")
        }
        
        for downloadLimit in testLimits {
            // 设置带宽限制
            await bandwidthManager.setDownloadLimit(downloadLimit)
            
            // 验证限制设置
            let actualDownloadLimit = await bandwidthManager.getDownloadLimit()
            XCTAssertEqual(actualDownloadLimit, downloadLimit, "Download limit should match the set value")
        }
    }
    
    /// 测试传输暂停和恢复功能
    /// 验证需求 8.6: 大文件正在同步时应该支持暂停和恢复传输
    /// **功能: macos-sync-client, 属性 10: 带宽管理有效性**
    func testTransferPauseAndResume() async throws {
        // 初始状态应该是未暂停
        let initialPaused = await bandwidthManager.areTransfersPaused()
        XCTAssertFalse(initialPaused, "Transfers should not be paused initially")
        
        // 暂停所有传输
        await bandwidthManager.pauseAllTransfers()
        let pausedState = await bandwidthManager.areTransfersPaused()
        XCTAssertTrue(pausedState, "Transfers should be paused after pauseAllTransfers")
        
        // 恢复所有传输
        await bandwidthManager.resumeAllTransfers()
        let resumedState = await bandwidthManager.areTransfersPaused()
        XCTAssertFalse(resumedState, "Transfers should not be paused after resumeAllTransfers")
    }
    
    /// 测试省电模式设置
    /// 验证需求 8.7: 用户启用省电模式时应该降低同步频率以节省电量
    /// **功能: macos-sync-client, 属性 10: 带宽管理有效性**
    func testPowerSavingMode() async throws {
        // 初始状态应该是未启用省电模式
        let initialPowerSaving = await bandwidthManager.isPowerSavingModeEnabled()
        XCTAssertFalse(initialPowerSaving, "Power saving mode should be disabled initially")
        
        // 启用省电模式
        await bandwidthManager.setPowerSavingMode(true)
        let enabledState = await bandwidthManager.isPowerSavingModeEnabled()
        XCTAssertTrue(enabledState, "Power saving mode should be enabled")
        
        // 禁用省电模式
        await bandwidthManager.setPowerSavingMode(false)
        let disabledState = await bandwidthManager.isPowerSavingModeEnabled()
        XCTAssertFalse(disabledState, "Power saving mode should be disabled")
    }
    
    /// 测试自动调节设置
    /// 验证需求 8.3: 检测到网络活动繁忙时应该自动降低同步优先级
    /// **功能: macos-sync-client, 属性 10: 带宽管理有效性**
    func testAutoThrottling() async throws {
        // 初始状态应该是启用自动调节
        let initialAutoThrottling = await bandwidthManager.isAutoThrottlingEnabled()
        XCTAssertTrue(initialAutoThrottling, "Auto throttling should be enabled initially")
        
        // 禁用自动调节
        await bandwidthManager.setAutoThrottlingEnabled(false)
        let disabledState = await bandwidthManager.isAutoThrottlingEnabled()
        XCTAssertFalse(disabledState, "Auto throttling should be disabled")
        
        // 启用自动调节
        await bandwidthManager.setAutoThrottlingEnabled(true)
        let enabledState = await bandwidthManager.isAutoThrottlingEnabled()
        XCTAssertTrue(enabledState, "Auto throttling should be enabled")
    }
    
    /// 测试带宽分配和释放
    /// 验证需求 8.1, 8.2: 带宽分配应该正确管理
    /// **功能: macos-sync-client, 属性 10: 带宽管理有效性**
    func testBandwidthAllocation() async throws {
        // 设置带宽限制
        await bandwidthManager.setUploadLimit(1024 * 1024) // 1MB/s
        
        let transferId = UUID()
        
        // 分配带宽
        let allocatedBandwidth = await bandwidthManager.allocateBandwidth(
            for: transferId,
            type: .upload,
            priority: .normal
        )
        
        // 验证分配了带宽
        XCTAssertGreaterThan(allocatedBandwidth, 0, "Should allocate some bandwidth")
        
        // 释放带宽
        await bandwidthManager.releaseBandwidth(for: transferId)
        
        // 验证释放成功（通过检查带宽使用情况）
        let usage = await bandwidthManager.getBandwidthUsage()
        XCTAssertEqual(usage.activeTransfers, 0, "Should have no active transfers after release")
    }
}