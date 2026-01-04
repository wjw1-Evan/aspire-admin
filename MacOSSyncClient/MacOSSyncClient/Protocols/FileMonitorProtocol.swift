import Foundation

/// 文件监控协议
protocol FileMonitorProtocol {
    /// 开始监控指定路径
    func startMonitoring(path: String) throws
    
    /// 停止监控
    func stopMonitoring()
    
    /// 添加排除模式
    func addExcludePattern(_ pattern: String)
    
    /// 移除排除模式
    func removeExcludePattern(_ pattern: String)
    
    /// 文件事件流
    var fileEvents: AsyncStream<FileEvent> { get }
    
    /// 监控状态
    var isMonitoring: Bool { get }
    
    /// 当前监控的路径
    var monitoredPath: String? { get }
    
    /// 当前的排除模式列表
    var excludePatterns: [String] { get }
}

/// 文件监控错误
enum FileMonitorError: Error, LocalizedError {
    case pathNotFound(String)
    case permissionDenied(String)
    case alreadyMonitoring
    case notMonitoring
    case systemError(String)
    
    var errorDescription: String? {
        switch self {
        case .pathNotFound(let path):
            return "Path not found: \(path)"
        case .permissionDenied(let path):
            return "Permission denied for path: \(path)"
        case .alreadyMonitoring:
            return "File monitoring is already active"
        case .notMonitoring:
            return "File monitoring is not active"
        case .systemError(let message):
            return "System error: \(message)"
        }
    }
}