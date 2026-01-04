import XCTest
@testable import MacOSSyncClientCore

/// 文件传输单元测试
/// 验证需求: 需求 2.6, 9.6
class FileTransferTests: XCTestCase {
    
    // MARK: - 传输进度信息测试
    
    /// 测试传输进度信息创建
    func testTransferProgressInfoCreation() {
        // Given
        let itemId = UUID()
        let transferType = TransferProgressInfo.TransferType.upload
        let progress = 0.5
        let currentAttempt = 2
        let maxAttempts = 3
        
        // When
        let progressInfo = TransferProgressInfo(
            itemId: itemId,
            transferType: transferType,
            progress: progress,
            currentAttempt: currentAttempt,
            maxAttempts: maxAttempts
        )
        
        // Then
        XCTAssertEqual(progressInfo.itemId, itemId)
        XCTAssertEqual(progressInfo.transferType, transferType)
        XCTAssertEqual(progressInfo.progress, progress)
        XCTAssertEqual(progressInfo.currentAttempt, currentAttempt)
        XCTAssertEqual(progressInfo.maxAttempts, maxAttempts)
        XCTAssertFalse(progressInfo.isCompleted)
        XCTAssertFalse(progressInfo.isFailed)
    }
    
    /// 测试传输完成状态
    func testTransferProgressCompletion() {
        // Given
        let progressInfo = TransferProgressInfo(
            itemId: UUID(),
            transferType: .download,
            progress: 1.0,
            currentAttempt: 1,
            maxAttempts: 3
        )
        
        // Then
        XCTAssertTrue(progressInfo.isCompleted)
        XCTAssertFalse(progressInfo.isFailed)
    }
    
    /// 测试传输失败状态
    func testTransferProgressFailure() {
        // Given
        let progressInfo = TransferProgressInfo(
            itemId: UUID(),
            transferType: .upload,
            progress: 0.3,
            currentAttempt: 3,
            maxAttempts: 3
        )
        
        // Then
        XCTAssertFalse(progressInfo.isCompleted)
        XCTAssertTrue(progressInfo.isFailed)
    }
    
    /// 测试传输类型显示名称
    func testTransferTypeDisplayNames() {
        // Given & When & Then
        XCTAssertEqual(TransferProgressInfo.TransferType.upload.displayName, "Uploading")
        XCTAssertEqual(TransferProgressInfo.TransferType.download.displayName, "Downloading")
    }
    
    /// 测试格式化进度百分比
    func testFormattedProgress() {
        // Given
        let progressInfo = TransferProgressInfo(
            itemId: UUID(),
            transferType: .upload,
            progress: 0.756,
            currentAttempt: 1,
            maxAttempts: 3
        )
        
        // When
        let formattedProgress = progressInfo.formattedProgress
        
        // Then
        XCTAssertEqual(formattedProgress, "75.6%")
    }
    
    /// 测试传输速度格式化
    func testFormattedTransferSpeed() {
        // Given
        let progressInfo = TransferProgressInfo(
            itemId: UUID(),
            transferType: .download,
            progress: 0.5,
            currentAttempt: 1,
            maxAttempts: 3,
            transferSpeed: 1024 * 1024 // 1MB/s
        )
        
        // When
        let formattedSpeed = progressInfo.formattedTransferSpeed
        
        // Then
        XCTAssertNotNil(formattedSpeed)
        XCTAssertTrue(formattedSpeed!.contains("MB/s"))
    }
    
    // MARK: - 传输会话测试
    
    /// 测试传输会话创建
    func testTransferSessionCreation() {
        // Given
        let itemId = UUID()
        let transferType = TransferProgressInfo.TransferType.upload
        let localPath = "/tmp/test.dat"
        let cloudPath = "/test.dat"
        
        // When
        let session = TransferSession(
            itemId: itemId,
            transferType: transferType,
            localPath: localPath,
            cloudPath: cloudPath
        )
        
        // Then
        XCTAssertEqual(session.itemId, itemId)
        XCTAssertEqual(session.transferType, transferType)
        XCTAssertEqual(session.localPath, localPath)
        XCTAssertEqual(session.cloudPath, cloudPath)
        XCTAssertTrue(session.isActive)
        XCTAssertEqual(session.currentProgress, 0.0)
        XCTAssertFalse(session.canResume) // 没有resumeData
    }
    
    /// 测试传输会话恢复能力
    func testTransferSessionResumeCapability() {
        // Given
        let resumeData = Data([1, 2, 3, 4, 5])
        var session = TransferSession(
            itemId: UUID(),
            transferType: .download,
            localPath: "/tmp/resume.dat",
            cloudPath: "/resume.dat",
            resumeData: resumeData
        )
        
        // When
        session.isActive = false
        
        // Then
        XCTAssertTrue(session.canResume)
        XCTAssertEqual(session.resumeData, resumeData)
    }
    
    /// 测试传输会话持续时间
    func testTransferSessionDuration() {
        // Given
        let startTime = Date().addingTimeInterval(-60) // 1分钟前
        var session = TransferSession(
            itemId: UUID(),
            transferType: .upload,
            localPath: "/tmp/duration.dat",
            cloudPath: "/duration.dat",
            startTime: startTime
        )
        
        // When
        session.lastProgressUpdate = Date()
        
        // Then
        XCTAssertGreaterThan(session.duration, 50) // 应该大约是60秒
        XCTAssertLessThan(session.duration, 70)
    }
    
    // MARK: - 传输统计测试
    
    /// 测试传输统计信息创建
    func testTransferStatisticsCreation() {
        // Given
        let totalTransfers = 100
        let activeTransfers = 5
        let completedTransfers = 90
        let failedTransfers = 5
        let totalBytesTransferred: Int64 = 1024 * 1024 * 1024 // 1GB
        let averageTransferSpeed = 1024.0 * 1024.0 // 1MB/s
        
        // When
        let statistics = TransferStatistics(
            totalTransfers: totalTransfers,
            activeTransfers: activeTransfers,
            completedTransfers: completedTransfers,
            failedTransfers: failedTransfers,
            totalBytesTransferred: totalBytesTransferred,
            averageTransferSpeed: averageTransferSpeed
        )
        
        // Then
        XCTAssertEqual(statistics.totalTransfers, totalTransfers)
        XCTAssertEqual(statistics.activeTransfers, activeTransfers)
        XCTAssertEqual(statistics.completedTransfers, completedTransfers)
        XCTAssertEqual(statistics.failedTransfers, failedTransfers)
        XCTAssertEqual(statistics.totalBytesTransferred, totalBytesTransferred)
        XCTAssertEqual(statistics.averageTransferSpeed, averageTransferSpeed)
    }
    
    /// 测试传输成功率计算
    func testTransferSuccessRate() {
        // Given
        let statistics = TransferStatistics(
            totalTransfers: 100,
            completedTransfers: 85,
            failedTransfers: 15
        )
        
        // When
        let successRate = statistics.successRate
        
        // Then
        XCTAssertEqual(successRate, 0.85, accuracy: 0.01)
    }
    
    /// 测试空统计的成功率
    func testEmptyStatisticsSuccessRate() {
        // Given
        let statistics = TransferStatistics()
        
        // When
        let successRate = statistics.successRate
        
        // Then
        XCTAssertEqual(successRate, 0.0)
    }
    
    /// 测试格式化传输量
    func testFormattedTotalBytes() {
        // Given
        let statistics = TransferStatistics(
            totalBytesTransferred: 1024 * 1024 * 1024 // 1GB
        )
        
        // When
        let formattedBytes = statistics.formattedTotalBytes
        
        // Then
        XCTAssertTrue(formattedBytes.contains("GB") || formattedBytes.contains("MB"))
    }
    
    /// 测试格式化平均速度
    func testFormattedAverageSpeed() {
        // Given
        let statistics = TransferStatistics(
            averageTransferSpeed: 1024 * 1024 // 1MB/s
        )
        
        // When
        let formattedSpeed = statistics.formattedAverageSpeed
        
        // Then
        XCTAssertTrue(formattedSpeed.contains("/s"))
        XCTAssertTrue(formattedSpeed.contains("MB") || formattedSpeed.contains("KB"))
    }
    
    // MARK: - 传输模型序列化测试
    
    /// 测试传输进度信息序列化
    func testTransferProgressInfoSerialization() throws {
        // Given
        let originalProgressInfo = TransferProgressInfo(
            itemId: UUID(),
            transferType: .upload,
            progress: 0.75,
            currentAttempt: 2,
            maxAttempts: 3,
            bytesTransferred: 1024 * 1024,
            totalBytes: 2 * 1024 * 1024,
            transferSpeed: 512 * 1024
        )
        
        // When
        let encoder = JSONEncoder()
        let data = try encoder.encode(originalProgressInfo)
        
        let decoder = JSONDecoder()
        let decodedProgressInfo = try decoder.decode(TransferProgressInfo.self, from: data)
        
        // Then
        XCTAssertEqual(originalProgressInfo.itemId, decodedProgressInfo.itemId)
        XCTAssertEqual(originalProgressInfo.transferType, decodedProgressInfo.transferType)
        XCTAssertEqual(originalProgressInfo.progress, decodedProgressInfo.progress)
        XCTAssertEqual(originalProgressInfo.currentAttempt, decodedProgressInfo.currentAttempt)
        XCTAssertEqual(originalProgressInfo.maxAttempts, decodedProgressInfo.maxAttempts)
        XCTAssertEqual(originalProgressInfo.bytesTransferred, decodedProgressInfo.bytesTransferred)
        XCTAssertEqual(originalProgressInfo.totalBytes, decodedProgressInfo.totalBytes)
        XCTAssertEqual(originalProgressInfo.transferSpeed, decodedProgressInfo.transferSpeed)
    }
    
    /// 测试传输会话序列化
    func testTransferSessionSerialization() throws {
        // Given
        let originalSession = TransferSession(
            itemId: UUID(),
            transferType: .download,
            localPath: "/tmp/session.dat",
            cloudPath: "/session.dat",
            resumeData: Data([1, 2, 3, 4, 5])
        )
        
        // When
        let encoder = JSONEncoder()
        let data = try encoder.encode(originalSession)
        
        let decoder = JSONDecoder()
        let decodedSession = try decoder.decode(TransferSession.self, from: data)
        
        // Then
        XCTAssertEqual(originalSession.id, decodedSession.id)
        XCTAssertEqual(originalSession.itemId, decodedSession.itemId)
        XCTAssertEqual(originalSession.transferType, decodedSession.transferType)
        XCTAssertEqual(originalSession.localPath, decodedSession.localPath)
        XCTAssertEqual(originalSession.cloudPath, decodedSession.cloudPath)
        XCTAssertEqual(originalSession.resumeData, decodedSession.resumeData)
        XCTAssertEqual(originalSession.isActive, decodedSession.isActive)
    }
    
    /// 测试传输统计序列化
    func testTransferStatisticsSerialization() throws {
        // Given
        let originalStatistics = TransferStatistics(
            totalTransfers: 50,
            activeTransfers: 3,
            completedTransfers: 45,
            failedTransfers: 2,
            totalBytesTransferred: 1024 * 1024 * 500, // 500MB
            averageTransferSpeed: 1024 * 512 // 512KB/s
        )
        
        // When
        let encoder = JSONEncoder()
        let data = try encoder.encode(originalStatistics)
        
        let decoder = JSONDecoder()
        let decodedStatistics = try decoder.decode(TransferStatistics.self, from: data)
        
        // Then
        XCTAssertEqual(originalStatistics.totalTransfers, decodedStatistics.totalTransfers)
        XCTAssertEqual(originalStatistics.activeTransfers, decodedStatistics.activeTransfers)
        XCTAssertEqual(originalStatistics.completedTransfers, decodedStatistics.completedTransfers)
        XCTAssertEqual(originalStatistics.failedTransfers, decodedStatistics.failedTransfers)
        XCTAssertEqual(originalStatistics.totalBytesTransferred, decodedStatistics.totalBytesTransferred)
        XCTAssertEqual(originalStatistics.averageTransferSpeed, decodedStatistics.averageTransferSpeed)
    }
    
    // MARK: - 边界条件测试
    
    /// 测试零进度传输
    func testZeroProgressTransfer() {
        // Given
        let progressInfo = TransferProgressInfo(
            itemId: UUID(),
            transferType: .upload,
            progress: 0.0,
            currentAttempt: 1,
            maxAttempts: 3
        )
        
        // Then
        XCTAssertFalse(progressInfo.isCompleted)
        XCTAssertFalse(progressInfo.isFailed)
        XCTAssertEqual(progressInfo.formattedProgress, "0.0%")
    }
    
    /// 测试超过100%的进度
    func testOverHundredPercentProgress() {
        // Given
        let progressInfo = TransferProgressInfo(
            itemId: UUID(),
            transferType: .download,
            progress: 1.1, // 110%
            currentAttempt: 1,
            maxAttempts: 3
        )
        
        // Then
        XCTAssertTrue(progressInfo.isCompleted) // 仍然认为是完成的
        XCTAssertEqual(progressInfo.formattedProgress, "110.0%")
    }
    
    /// 测试负数进度
    func testNegativeProgress() {
        // Given
        let progressInfo = TransferProgressInfo(
            itemId: UUID(),
            transferType: .upload,
            progress: -0.1,
            currentAttempt: 1,
            maxAttempts: 3
        )
        
        // Then
        XCTAssertFalse(progressInfo.isCompleted)
        XCTAssertEqual(progressInfo.formattedProgress, "-10.0%")
    }
    
    /// 测试最大重试次数
    func testMaxRetryAttempts() {
        // Given
        let progressInfo = TransferProgressInfo(
            itemId: UUID(),
            transferType: .upload,
            progress: 0.5,
            currentAttempt: 5,
            maxAttempts: 5
        )
        
        // Then
        XCTAssertTrue(progressInfo.isFailed)
        XCTAssertFalse(progressInfo.isCompleted)
    }
    
    /// 测试零字节传输
    func testZeroByteTransfer() {
        // Given
        let progressInfo = TransferProgressInfo(
            itemId: UUID(),
            transferType: .download,
            progress: 1.0,
            bytesTransferred: 0,
            totalBytes: 0
        )
        
        // Then
        XCTAssertTrue(progressInfo.isCompleted)
        XCTAssertNil(progressInfo.estimatedTimeRemaining) // 无法估算时间
    }
}