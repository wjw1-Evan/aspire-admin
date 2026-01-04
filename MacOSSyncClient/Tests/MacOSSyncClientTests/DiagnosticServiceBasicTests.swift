import XCTest
@testable import MacOSSyncClientCore

/// 基础诊断服务测试
class DiagnosticServiceBasicTests: XCTestCase {
    
    var diagnosticService: DiagnosticService!
    
    override func setUp() async throws {
        try await super.setUp()
        diagnosticService = DiagnosticService()
    }
    
    override func tearDown() async throws {
        diagnosticService = nil
        try await super.tearDown()
    }
    
    /// 测试诊断服务初始化
    func testDiagnosticServiceInitialization() {
        XCTAssertNotNil(diagnosticService, "DiagnosticService should initialize successfully")
    }
    
    /// 测试基本日志记录功能
    func testBasicLogging() {
        // 测试文件操作日志记录
        diagnosticService.logFileOperation(
            operation: "open",
            path: "/test/path",
            result: .success,
            duration: 1.0
        )
        
        // 测试网络操作日志记录
        diagnosticService.logNetworkOperation(
            operation: "GET",
            url: "https://test.com",
            statusCode: 200,
            duration: 0.5,
            bytesTransferred: 1024
        )
        
        // 如果没有崩溃，测试通过
        XCTAssertTrue(true, "Basic logging should complete without errors")
    }
    
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
        XCTAssertTrue(now.timeIntervalSince(healthStatus.lastChecked) < 5.0, "Last checked time should be recent")
    }
}