import Foundation

/// 文件监控服务实现
class FileMonitor: FileMonitorProtocol {
    private var _excludePatterns: [String] = []
    private var _monitoredPath: String?
    private var _isMonitoring: Bool = false
    private var eventContinuation: AsyncStream<FileEvent>.Continuation?
    private var _fileEvents: AsyncStream<FileEvent>?
    
    init() {
        setupEventStream()
    }
    
    // MARK: - FileMonitorProtocol Implementation
    
    var fileEvents: AsyncStream<FileEvent> {
        return _fileEvents ?? AsyncStream { _ in }
    }
    
    var isMonitoring: Bool {
        return _isMonitoring
    }
    
    var monitoredPath: String? {
        return _monitoredPath
    }
    
    var excludePatterns: [String] {
        return _excludePatterns
    }
    
    func startMonitoring(path: String) throws {
        guard !_isMonitoring else {
            throw FileMonitorError.alreadyMonitoring
        }
        
        // 验证路径存在
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: path, isDirectory: &isDirectory) else {
            throw FileMonitorError.pathNotFound(path)
        }
        
        // 检查权限
        guard FileManager.default.isReadableFile(atPath: path) else {
            throw FileMonitorError.permissionDenied(path)
        }
        
        _monitoredPath = path
        _isMonitoring = true
        
        print("Started monitoring path: \(path)")
    }
    
    func stopMonitoring() {
        guard _isMonitoring else { return }
        
        _isMonitoring = false
        _monitoredPath = nil
        
        // 结束事件流
        eventContinuation?.finish()
        
        print("Stopped file monitoring")
    }
    
    func addExcludePattern(_ pattern: String) {
        if !_excludePatterns.contains(pattern) {
            _excludePatterns.append(pattern)
            print("Added exclude pattern: \(pattern)")
        }
    }
    
    func removeExcludePattern(_ pattern: String) {
        _excludePatterns.removeAll { $0 == pattern }
        print("Removed exclude pattern: \(pattern)")
    }
    
    // MARK: - Private Methods
    
    private func setupEventStream() {
        _fileEvents = AsyncStream<FileEvent> { continuation in
            self.eventContinuation = continuation
        }
    }
}