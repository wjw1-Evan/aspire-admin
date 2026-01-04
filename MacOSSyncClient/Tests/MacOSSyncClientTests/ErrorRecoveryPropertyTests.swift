import XCTest
import SwiftCheck
@testable import MacOSSyncClientCore

/// 错误恢复属性测试
/// 验证属性 12: 错误恢复健壮性
/// **验证需求: 需求 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7**
class ErrorRecoveryPropertyTests: XCTestCase {
    
    var errorRecoveryManager: ErrorRecoveryManager!
    
    override func setUp() async throws {
        try await super.setUp()
        errorRecoveryManager = ErrorRecoveryManager()
    }
    
    override func tearDown() async throws {
        errorRecoveryManager = nil
        try await super.tearDown()
    }
    
    /// 测试网络错误的重试机制
    /// 验证需求 11.1: 网络连接不稳定时应该自动重试失败的同步操作
    /// **功能: macos-sync-client, 属性 12: 错误恢复健壮性**
    func testNetworkErrorRetryMechanism() {
        property("For any network error, system should retry appropriately") <- forAll { (attempt: Int) in
            let attemptNumber = max(0, min(attempt, 10))
            let networkErrors: [SyncError] = [.networkUnavailable, .connectionTimeout, .serverError(500)]
            
            var allRetriesHandled = true
            
            for error in networkErrors {
                let shouldRetry = self.errorRecoveryManager.shouldRetryError(error)
                
                // 网络错误应该被重试
                if !shouldRetry {
                    allRetriesHandled = false
                    break
                }
                
                // 验证重试延迟计算
                let delay = self.errorRecoveryManager.calculateRetryDelay(attempt: attemptNumber)
                if delay <= 0 || delay > 60 {
                    allRetriesHandled = false
                    break
                }
            }
            
            return allRetriesHandled
        }
    }
    
    /// 测试重试延迟的指数退避算法
    /// 验证需求 11.1: 网络连接不稳定时应该自动重试失败的同步操作
    /// **功能: macos-sync-client, 属性 12: 错误恢复健壮性**
    func testExponentialBackoffDelay() {
        property("For any retry attempt, delay should follow exponential backoff") <- forAll { (attempt: Int) in
            let attemptNumber = max(0, min(attempt, 10))
            
            let delay = self.errorRecoveryManager.calculateRetryDelay(attempt: attemptNumber)
            
            // 验证延迟在合理范围内
            guard delay > 0 && delay <= 60 else { return false }
            
            // 验证指数增长（每次尝试延迟应该增加）
            if attemptNumber > 0 {
                let previousDelay = self.errorRecoveryManager.calculateRetryDelay(attempt: attemptNumber - 1)
                return delay >= previousDelay
            }
            
            return true
        }
    }
    
    /// 测试错误分类的正确性
    /// 验证需求 11.7: 用户报告同步问题时应该提供详细的诊断日志和修复建议
    /// **功能: macos-sync-client, 属性 12: 错误恢复健壮性**
    func testErrorClassification() {
        let retryableErrors: [SyncError] = [
            .networkUnavailable, .connectionTimeout, .serverError(500), 
            .rateLimitExceeded, .fileInUse("/test")
        ]
        
        let nonRetryableErrors: [SyncError] = [
            .authenticationFailed, .permissionDenied("/test"), .diskSpaceInsufficient,
            .quotaExceeded, .syncDatabaseCorrupted, .checksumMismatch("/test")
        ]
        
        // 测试可重试错误
        for error in retryableErrors {
            XCTAssertTrue(errorRecoveryManager.shouldRetryError(error), 
                         "Error \(error) should be retryable")
        }
        
        // 测试不可重试错误
        for error in nonRetryableErrors {
            XCTAssertFalse(errorRecoveryManager.shouldRetryError(error), 
                          "Error \(error) should not be retryable")
        }
    }
    
    /// 测试诊断报告生成的完整性
    /// 验证需求 11.7: 用户报告同步问题时应该提供详细的诊断日志和修复建议
    /// **功能: macos-sync-client, 属性 12: 错误恢复健壮性**
    func testDiagnosticReportGeneration() async {
        // 生成诊断报告
        let report = await errorRecoveryManager.generateDiagnosticReport()
        
        // 验证报告包含必要信息
        XCTAssertFalse(report.systemInfo.osVersion.isEmpty, "OS version should not be empty")
        XCTAssertTrue(report.generatedAt <= Date(), "Generated timestamp should be valid")
        XCTAssertTrue(report.errorSummary.totalErrors >= 0, "Error count should be non-negative")
    }
    
    /// 测试错误日志记录的完整性
    /// 验证需求 11.7: 用户报告同步问题时应该提供详细的诊断日志和修复建议
    /// **功能: macos-sync-client, 属性 12: 错误恢复健壮性**
    func testErrorLoggingCompleteness() async {
        let operation = SyncOperation(type: .upload, path: "/test/file.txt")
        let error = SyncError.networkUnavailable
        
        // 记录错误
        await errorRecoveryManager.logError(error, for: operation)
        
        // 获取错误统计
        let statistics = await errorRecoveryManager.getErrorStatistics()
        
        // 验证错误被正确记录
        XCTAssertTrue(statistics.totalErrors > 0, "Error should be logged")
    }
    
    /// 测试操作重试次数限制
    /// 验证需求 11.1: 网络连接不稳定时应该自动重试失败的同步操作
    /// **功能: macos-sync-client, 属性 12: 错误恢复健壮性**
    func testRetryCountLimits() {
        var operation = SyncOperation(type: .upload, path: "/test", maxRetries: 3)
        
        // 验证初始状态可以重试
        XCTAssertTrue(operation.canRetry, "Operation should be retryable initially")
        
        // 模拟重试直到达到限制
        for _ in 0..<3 {
            operation.incrementRetryCount()
        }
        
        // 验证达到限制后不能重试
        XCTAssertFalse(operation.canRetry, "Operation should not be retryable after max attempts")
    }
}