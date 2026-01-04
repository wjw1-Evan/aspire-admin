import Foundation

/// 云端 API 服务协议，定义与云端网盘系统的交互接口
protocol CloudAPIServiceProtocol {
    // MARK: - 认证
    
    /// 用户认证
    /// - Parameter credentials: 认证凭据
    /// - Returns: 认证令牌
    func authenticate(credentials: AuthCredentials) async throws -> AuthToken
    
    /// 刷新认证令牌
    /// - Parameter token: 当前令牌
    /// - Returns: 新的认证令牌
    func refreshToken(_ token: AuthToken) async throws -> AuthToken
    
    /// 用户登出
    func logout() async throws
    
    // MARK: - 文件操作
    
    /// 上传文件
    /// - Parameters:
    ///   - localPath: 本地文件路径
    ///   - cloudPath: 云端目标路径
    ///   - progressHandler: 进度回调
    /// - Returns: 上传后的云端文件信息
    func uploadFile(
        at localPath: String,
        to cloudPath: String,
        progressHandler: @escaping (Double) -> Void
    ) async throws -> CloudFile
    
    /// 下载文件
    /// - Parameters:
    ///   - cloudPath: 云端文件路径
    ///   - localPath: 本地目标路径
    ///   - progressHandler: 进度回调
    func downloadFile(
        from cloudPath: String,
        to localPath: String,
        progressHandler: @escaping (Double) -> Void
    ) async throws
    
    /// 删除文件
    /// - Parameter cloudPath: 云端文件路径
    func deleteFile(at cloudPath: String) async throws
    
    /// 移动文件
    /// - Parameters:
    ///   - from: 源路径
    ///   - to: 目标路径
    /// - Returns: 移动后的文件信息
    func moveFile(from: String, to: String) async throws -> CloudFile
    
    /// 复制文件
    /// - Parameters:
    ///   - from: 源路径
    ///   - to: 目标路径
    /// - Returns: 复制后的文件信息
    func copyFile(from: String, to: String) async throws -> CloudFile
    
    // MARK: - 文件夹操作
    
    /// 创建文件夹
    /// - Parameter cloudPath: 云端文件夹路径
    /// - Returns: 创建的文件夹信息
    func createFolder(at cloudPath: String) async throws -> CloudFolder
    
    /// 列出文件夹内容
    /// - Parameter cloudPath: 云端文件夹路径
    /// - Returns: 文件夹内容列表
    func listFolder(at cloudPath: String) async throws -> [CloudItem]
    
    /// 删除文件夹
    /// - Parameter cloudPath: 云端文件夹路径
    func deleteFolder(at cloudPath: String) async throws
    
    // MARK: - 元数据
    
    /// 获取文件信息
    /// - Parameter cloudPath: 云端文件路径
    /// - Returns: 文件信息
    func getFileInfo(at cloudPath: String) async throws -> CloudFile
    
    /// 获取文件夹信息
    /// - Parameter cloudPath: 云端文件夹路径
    /// - Returns: 文件夹信息
    func getFolderInfo(at cloudPath: String) async throws -> CloudFolder
    
    /// 获取变化列表
    /// - Parameter cursor: 变化游标，nil表示从头开始
    /// - Returns: 变化集合
    func getChanges(since cursor: String?) async throws -> ChangeSet
    
    // MARK: - 实时通信
    
    /// 连接 WebSocket
    /// - Returns: WebSocket 连接
    func connectWebSocket() async throws -> WebSocketConnection
    
    /// 订阅路径变化通知
    /// - Parameter paths: 要监听的路径列表
    func subscribeToChanges(paths: [String]) async throws
}

/// WebSocket 连接协议
protocol WebSocketConnection {
    /// 连接状态
    var isConnected: Bool { get }
    
    /// 发送消息
    /// - Parameter message: 要发送的消息
    func send(message: String) async throws
    
    /// 关闭连接
    func close() async
    
    /// 消息接收流
    var messageStream: AsyncStream<String> { get }
    
    /// 连接状态变化流
    var connectionStateStream: AsyncStream<WebSocketConnectionState> { get }
}

/// WebSocket 连接状态
enum WebSocketConnectionState: String, Codable, CaseIterable {
    case connecting = "connecting"
    case connected = "connected"
    case disconnected = "disconnected"
    case error = "error"
    
    var displayName: String {
        switch self {
        case .connecting:
            return "Connecting"
        case .connected:
            return "Connected"
        case .disconnected:
            return "Disconnected"
        case .error:
            return "Error"
        }
    }
}

/// 云端 API 错误类型
enum CloudAPIError: Error, LocalizedError {
    case invalidURL
    case invalidCredentials
    case tokenExpired
    case networkError(Error)
    case serverError(Int, String?)
    case fileNotFound(String)
    case folderNotFound(String)
    case quotaExceeded
    case rateLimitExceeded
    case uploadFailed(String)
    case downloadFailed(String)
    case webSocketConnectionFailed
    case invalidResponse
    case parsingError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidCredentials:
            return "Invalid credentials"
        case .tokenExpired:
            return "Authentication token expired"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .serverError(let code, let message):
            return "Server error (\(code)): \(message ?? "Unknown error")"
        case .fileNotFound(let path):
            return "File not found: \(path)"
        case .folderNotFound(let path):
            return "Folder not found: \(path)"
        case .quotaExceeded:
            return "Storage quota exceeded"
        case .rateLimitExceeded:
            return "Rate limit exceeded"
        case .uploadFailed(let reason):
            return "Upload failed: \(reason)"
        case .downloadFailed(let reason):
            return "Download failed: \(reason)"
        case .webSocketConnectionFailed:
            return "WebSocket connection failed"
        case .invalidResponse:
            return "Invalid server response"
        case .parsingError(let error):
            return "Response parsing error: \(error.localizedDescription)"
        }
    }
}