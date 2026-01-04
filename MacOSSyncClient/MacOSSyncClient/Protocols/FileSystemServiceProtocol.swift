import Foundation

/// 文件系统服务协议
protocol FileSystemServiceProtocol {
    /// 创建文件
    /// - Parameters:
    ///   - path: 文件路径
    ///   - data: 文件数据
    /// - Throws: 文件操作错误
    func createFile(at path: String, with data: Data) throws
    
    /// 读取文件
    /// - Parameter path: 文件路径
    /// - Returns: 文件数据
    /// - Throws: 文件操作错误
    func readFile(at path: String) throws -> Data
    
    /// 更新文件
    /// - Parameters:
    ///   - path: 文件路径
    ///   - data: 新的文件数据
    /// - Throws: 文件操作错误
    func updateFile(at path: String, with data: Data) throws
    
    /// 删除文件
    /// - Parameter path: 文件路径
    /// - Throws: 文件操作错误
    func deleteFile(at path: String) throws
    
    /// 移动文件
    /// - Parameters:
    ///   - sourcePath: 源路径
    ///   - destinationPath: 目标路径
    /// - Throws: 文件操作错误
    func moveFile(from sourcePath: String, to destinationPath: String) throws
    
    /// 复制文件
    /// - Parameters:
    ///   - sourcePath: 源路径
    ///   - destinationPath: 目标路径
    /// - Throws: 文件操作错误
    func copyFile(from sourcePath: String, to destinationPath: String) throws
    
    /// 创建目录
    /// - Parameter path: 目录路径
    /// - Throws: 文件操作错误
    func createDirectory(at path: String) throws
    
    /// 删除目录
    /// - Parameter path: 目录路径
    /// - Throws: 文件操作错误
    func deleteDirectory(at path: String) throws
    
    /// 列出目录内容
    /// - Parameter path: 目录路径
    /// - Returns: 目录内容列表
    /// - Throws: 文件操作错误
    func listDirectory(at path: String) throws -> [String]
    
    /// 检查文件是否存在
    /// - Parameter path: 文件路径
    /// - Returns: 文件是否存在
    func fileExists(at path: String) -> Bool
    
    /// 检查目录是否存在
    /// - Parameter path: 目录路径
    /// - Returns: 目录是否存在
    func directoryExists(at path: String) -> Bool
    
    /// 获取文件属性
    /// - Parameter path: 文件路径
    /// - Returns: 文件属性
    /// - Throws: 文件操作错误
    func getFileAttributes(at path: String) throws -> FileAttributes
    
    /// 检查文件权限
    /// - Parameters:
    ///   - path: 文件路径
    ///   - permission: 权限类型
    /// - Returns: 是否有权限
    func hasPermission(_ permission: FilePermission, for path: String) -> Bool
    
    /// 获取可用磁盘空间
    /// - Parameter path: 路径
    /// - Returns: 可用空间（字节）
    /// - Throws: 文件操作错误
    func getAvailableSpace(at path: String) throws -> Int64
}

/// 文件属性
struct FileAttributes {
    let size: Int64
    let creationDate: Date
    let modificationDate: Date
    let isDirectory: Bool
    let isReadable: Bool
    let isWritable: Bool
    let isExecutable: Bool
    let permissions: String
}

/// 文件权限类型
enum FilePermission {
    case read
    case write
    case execute
}

/// 文件系统错误
enum FileSystemError: Error, LocalizedError {
    case fileNotFound(String)
    case directoryNotFound(String)
    case permissionDenied(String)
    case fileAlreadyExists(String)
    case directoryAlreadyExists(String)
    case insufficientSpace(Int64, Int64) // required, available
    case invalidPath(String)
    case operationFailed(String)
    case unknownError(String)
    
    var errorDescription: String? {
        switch self {
        case .fileNotFound(let path):
            return "File not found: \(path)"
        case .directoryNotFound(let path):
            return "Directory not found: \(path)"
        case .permissionDenied(let path):
            return "Permission denied: \(path)"
        case .fileAlreadyExists(let path):
            return "File already exists: \(path)"
        case .directoryAlreadyExists(let path):
            return "Directory already exists: \(path)"
        case .insufficientSpace(let required, let available):
            return "Insufficient space: required \(required) bytes, available \(available) bytes"
        case .invalidPath(let path):
            return "Invalid path: \(path)"
        case .operationFailed(let operation):
            return "Operation failed: \(operation)"
        case .unknownError(let message):
            return "Unknown error: \(message)"
        }
    }
}