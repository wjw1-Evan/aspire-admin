import Foundation

/// 错误恢复管理器协议
protocol ErrorRecoveryManagerProtocol {
    // MARK: - 错误处理
    
    /// 处理同步操作错误
    /// - Parameters:
    ///   - error: 发生的错误
    ///   - operation: 失败的同步操作
    func handleError(_ error: SyncError, for operation: SyncOperation) async
    
    /// 处理网络错误
    /// - Parameters:
    ///   - error: 网络错误
    ///   - operation: 失败的操作
    func handleNetworkError(_ error: SyncError, for operation: SyncOperation) async
    
    /// 处理文件系统错误
    /// - Parameters:
    ///   - error: 文件系统错误
    ///   - operation: 失败的操作
    func handleFileSystemError(_ error: SyncError, for operation: SyncOperation) async
    
    /// 处理认证错误
    /// - Parameter error: 认证错误
    func handleAuthenticationError(_ error: SyncError) async
    
    /// 处理数据库错误
    /// - Parameter error: 数据库错误
    func handleDatabaseError(_ error: SyncError) async
    
    // MARK: - 恢复机制
    
    /// 重建同步数据库
    func rebuildSyncDatabase() async throws
    
    /// 请求重新认证
    func requestReauthentication() async
    
    /// 请求权限
    /// - Parameter path: 需要权限的路径
    func requestPermission(for path: String) async
    
    /// 暂停同步并通知用户
    /// - Parameter reason: 暂停原因
    func pauseSyncAndNotifyUser(reason: PauseReason) async
    
    // MARK: - 重试机制
    
    /// 安排重试操作
    /// - Parameters:
    ///   - operation: 要重试的操作
    ///   - delay: 重试延迟
    func scheduleRetry(_ operation: SyncOperation, after delay: TimeInterval) async
    
    /// 标记操作为失败
    /// - Parameters:
    ///   - operation: 失败的操作
    ///   - error: 错误信息
    func markOperationAsFailed(_ operation: SyncOperation, error: SyncError) async
    
    /// 获取操作的重试次数
    /// - Parameter operation: 同步操作
    /// - Returns: 重试次数
    func getRetryCount(for operation: SyncOperation) -> Int
    
    /// 判断是否应该重试错误
    /// - Parameter error: 错误
    /// - Returns: 是否应该重试
    func shouldRetryError(_ error: SyncError) -> Bool
    
    /// 计算重试延迟
    /// - Parameter attempt: 尝试次数
    /// - Returns: 延迟时间
    func calculateRetryDelay(attempt: Int) -> TimeInterval
    
    // MARK: - 诊断和日志
    
    /// 记录错误日志
    /// - Parameters:
    ///   - error: 错误
    ///   - operation: 操作
    func logError(_ error: SyncError, for operation: SyncOperation) async
    
    /// 生成诊断报告
    /// - Returns: 诊断报告
    func generateDiagnosticReport() async -> DiagnosticReport
    
    /// 获取错误统计
    /// - Returns: 错误统计信息
    func getErrorStatistics() async -> ErrorStatistics
}