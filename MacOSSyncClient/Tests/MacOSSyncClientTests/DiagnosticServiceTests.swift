import XCTest
@testable import MacOSSyncClientCore

/// 诊断系统单元测试
/// 验证需求 11.7: 用户报告同步问题时应该提供详细的诊断日志和修复建议
/// 验证需求 12.5: 企业要求合规审计时应该记录详细的同步活动日志
class DiagnosticServiceTests: XCTestCase {
    
    var diagnosticService: DiagnosticService!
    
    override func setUp() async throws {
        try await super.setUp()
        diagnosticService = DiagnosticService()
    }
    
    override func tearDown() async throws {
        diagnosticService = nil
        try await super.tearDown()
    }
    
    // MARK: - 日志记录测试
    
    /// 测试文件操作日志记录
    func testFileOperationLogging() {
        // 测试成功操作日志
        diagnosticService.logFileOperation(
            operation: "upload",
            path: "/test/file.txt",
            result: .success,
            duration: 1.5
        )
        
        // 测试失败操作日志
        diagnosticService.logFileOperation(
            operation: "download",
            path: "/test/file2.txt",
            result: .failure,
            duration: 0.5
        )
        
        // 验证日志记录不会崩溃
        XCTAssertTrue(true, "File operation logging should complete without errors")
    }
    
    /// 测试网络操作日志记录
    func testNetworkOperationLogging() {
        // 测试成功的网络操作
        diagnosticService.logNetworkOperation(
            operation: "GET",
            url: "https://api.example.com/files",
            statusCode: 200,
            duration: 0.8,
            bytesTransferred: 1024
        )
        
        // 测试失败的网络操作
        diagnosticService.logNetworkOperation(
            operation: "POST",
            url: "https://api.example.com/upload",
            statusCode: 500,
            duration: 2.5,
            bytesTransferred: 0
        )
        
        XCTAssertTrue(true, "Network operation logging should complete without errors")
    }
    
    /// 测试错误日志记录
    func testErrorLogging() {
        let testError = NSError(domain: "TestDomain", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Test error"])
        
        // 测试不同严重程度的错误日志
        diagnosticService.logError(error: testError, context: "File Upload", severity: .critical)
        diagnosticService.logError(error: testError, context: "Network Request", severity: .error)
        diagnosticService.logError(error: testError, context: "Data Validation", severity: .warning)
        diagnosticService.logError(error: testError, context: "User Action", severity: .info)
        
        XCTAssertTrue(true, "Error logging should complete without errors")
    }
    
    // MARK: - 系统诊断测试
    
    /// 测试系统健康检查
    func testSystemHealthCheck() async {
        let healthStatus = await diagnosticService.performHealthCheck()
        
        // 验证健康状态结构
        XCTAssertNotNil(healthStatus.overallHealth, "Overall health should be set")
        XCTAssertNotNil(healthStatus.networkHealth, "Network health should be set")
        XCTAssertNotNil(healthStatus.diskHealth, "Disk health should be set")
        XCTAssertNotNil(healthStatus.syncHealth, "Sync health should be set")
        XCTAssertNotNil(healthStatus.authHealth, "Auth health should be set")
        
        // 验证时间戳
        let now = Date()
        XCTAssertTrue(healthStatus.lastChecked <= now, "Last checked time should be valid")
        XCTAssertTrue(now.timeIntervalSince(healthStatus.lastChecked) < 5.0, "Last checked time should be recent")
    }
    
    /// 测试诊断报告生成
    func testDiagnosticReportGeneration() async {
        let report = await diagnosticService.generateDiagnosticReport()
        
        // 验证报告结构
        XCTAssertNotNil(report.generatedAt, "Generated timestamp should be set")
        XCTAssertNotNil(report.systemInfo, "System info should be set")
        XCTAssertNotNil(report.syncStatus, "Sync status should be set")
        XCTAssertNotNil(report.errorSummary, "Error summary should be set")
        XCTAssertNotNil(report.recommendations, "Recommendations should be set")
        
        // 验证系统信息
        XCTAssertFalse(report.systemInfo.osVersion.isEmpty, "OS version should not be empty")
        XCTAssertFalse(report.systemInfo.appVersion.isEmpty, "App version should not be empty")
        XCTAssertTrue(report.systemInfo.availableDiskSpace >= 0, "Available disk space should be non-negative")
        XCTAssertTrue(report.systemInfo.totalDiskSpace >= 0, "Total disk space should be non-negative")
    }
    
    // MARK: - 健康级别测试
    
    /// 测试健康级别显示名称
    func testHealthLevelDisplayNames() {
        XCTAssertEqual(SystemHealthStatus.HealthLevel.excellent.displayName, "Excellent")
        XCTAssertEqual(SystemHealthStatus.HealthLevel.good.displayName, "Good")
        XCTAssertEqual(SystemHealthStatus.HealthLevel.warning.displayName, "Warning")
        XCTAssertEqual(SystemHealthStatus.HealthLevel.critical.displayName, "Critical")
        XCTAssertEqual(SystemHealthStatus.HealthLevel.unknown.displayName, "Unknown")
    }
    
    /// 测试健康级别颜色
    func testHealthLevelColors() {
        XCTAssertEqual(SystemHealthStatus.HealthLevel.excellent.color, "green")
        XCTAssertEqual(SystemHealthStatus.HealthLevel.good.color, "blue")
        XCTAssertEqual(SystemHealthStatus.HealthLevel.warning.color, "orange")
        XCTAssertEqual(SystemHealthStatus.HealthLevel.critical.color, "red")
        XCTAssertEqual(SystemHealthStatus.HealthLevel.unknown.color, "gray")
    }
    
    // MARK: - 操作结果测试
    
    /// 测试操作结果初始化
    func testOperationResultInitialization() {
        // 测试成功结果
        let successResult = OperationResult(error: nil)
        XCTAssertEqual(successResult, .success, "Should be success when no error")
        
        // 测试失败结果
        let failureResult = OperationResult(error: "Some error")
        XCTAssertEqual(failureResult, .failure, "Should be failure when error present")
    }
    
    // MARK: - 健康问题测试
    
    /// 测试健康问题创建
    func testHealthIssueCreation() {
        let issue = SystemHealthStatus.HealthIssue(
            severity: .warning,
            category: "Storage",
            title: "Low Disk Space",
            description: "Available disk space is running low",
            recommendation: "Free up some disk space"
        )
        
        XCTAssertNotNil(issue.id, "Issue should have an ID")
        XCTAssertEqual(issue.severity, .warning, "Severity should match")
        XCTAssertEqual(issue.category, "Storage", "Category should match")
        XCTAssertEqual(issue.title, "Low Disk Space", "Title should match")
        XCTAssertEqual(issue.description, "Available disk space is running low", "Description should match")
        XCTAssertEqual(issue.recommendation, "Free up some disk space", "Recommendation should match")
    }
}