import Foundation

/// 文件系统服务实现
class FileSystemService: FileSystemServiceProtocol {
    private let fileManager: FileManager
    
    init(fileManager: FileManager = .default) {
        self.fileManager = fileManager
    }
    
    // MARK: - File Operations
    
    func createFile(at path: String, with data: Data) throws {
        // 检查文件是否已存在
        if fileManager.fileExists(atPath: path) {
            throw FileSystemError.fileAlreadyExists(path)
        }
        
        // 检查父目录是否存在，如果不存在则创建
        let parentDirectory = URL(fileURLWithPath: path).deletingLastPathComponent().path
        if !fileManager.fileExists(atPath: parentDirectory) {
            try createDirectory(at: parentDirectory)
        }
        
        // 检查权限
        guard hasPermission(.write, for: parentDirectory) else {
            throw FileSystemError.permissionDenied(path)
        }
        
        // 检查磁盘空间
        let availableSpace = try getAvailableSpace(at: parentDirectory)
        if Int64(data.count) > availableSpace {
            throw FileSystemError.insufficientSpace(Int64(data.count), availableSpace)
        }
        
        // 创建文件
        guard fileManager.createFile(atPath: path, contents: data, attributes: nil) else {
            throw FileSystemError.operationFailed("Failed to create file at \(path)")
        }
    }
    
    func readFile(at path: String) throws -> Data {
        // 检查文件是否存在
        guard fileManager.fileExists(atPath: path) else {
            throw FileSystemError.fileNotFound(path)
        }
        
        // 检查权限
        guard hasPermission(.read, for: path) else {
            throw FileSystemError.permissionDenied(path)
        }
        
        // 读取文件
        do {
            return try Data(contentsOf: URL(fileURLWithPath: path))
        } catch {
            throw FileSystemError.operationFailed("Failed to read file at \(path): \(error.localizedDescription)")
        }
    }
    
    func updateFile(at path: String, with data: Data) throws {
        // 检查文件是否存在
        guard fileManager.fileExists(atPath: path) else {
            throw FileSystemError.fileNotFound(path)
        }
        
        // 检查权限
        guard hasPermission(.write, for: path) else {
            throw FileSystemError.permissionDenied(path)
        }
        
        // 检查磁盘空间
        let parentDirectory = URL(fileURLWithPath: path).deletingLastPathComponent().path
        let availableSpace = try getAvailableSpace(at: parentDirectory)
        let currentSize = try getFileAttributes(at: path).size
        let additionalSpace = Int64(data.count) - currentSize
        
        if additionalSpace > availableSpace {
            throw FileSystemError.insufficientSpace(additionalSpace, availableSpace)
        }
        
        // 更新文件
        do {
            try data.write(to: URL(fileURLWithPath: path))
        } catch {
            throw FileSystemError.operationFailed("Failed to update file at \(path): \(error.localizedDescription)")
        }
    }
    
    func deleteFile(at path: String) throws {
        // 检查文件是否存在
        guard fileManager.fileExists(atPath: path) else {
            throw FileSystemError.fileNotFound(path)
        }
        
        // 检查权限
        let parentDirectory = URL(fileURLWithPath: path).deletingLastPathComponent().path
        guard hasPermission(.write, for: parentDirectory) else {
            throw FileSystemError.permissionDenied(path)
        }
        
        // 删除文件
        do {
            try fileManager.removeItem(atPath: path)
        } catch {
            throw FileSystemError.operationFailed("Failed to delete file at \(path): \(error.localizedDescription)")
        }
    }
    
    func moveFile(from sourcePath: String, to destinationPath: String) throws {
        // 检查源文件是否存在
        guard fileManager.fileExists(atPath: sourcePath) else {
            throw FileSystemError.fileNotFound(sourcePath)
        }
        
        // 检查目标文件是否已存在
        if fileManager.fileExists(atPath: destinationPath) {
            throw FileSystemError.fileAlreadyExists(destinationPath)
        }
        
        // 检查权限
        let sourceParent = URL(fileURLWithPath: sourcePath).deletingLastPathComponent().path
        let destinationParent = URL(fileURLWithPath: destinationPath).deletingLastPathComponent().path
        
        guard hasPermission(.write, for: sourceParent) else {
            throw FileSystemError.permissionDenied(sourcePath)
        }
        
        guard hasPermission(.write, for: destinationParent) else {
            throw FileSystemError.permissionDenied(destinationPath)
        }
        
        // 确保目标目录存在
        if !fileManager.fileExists(atPath: destinationParent) {
            try createDirectory(at: destinationParent)
        }
        
        // 移动文件
        do {
            try fileManager.moveItem(atPath: sourcePath, toPath: destinationPath)
        } catch {
            throw FileSystemError.operationFailed("Failed to move file from \(sourcePath) to \(destinationPath): \(error.localizedDescription)")
        }
    }
    
    func copyFile(from sourcePath: String, to destinationPath: String) throws {
        // 检查源文件是否存在
        guard fileManager.fileExists(atPath: sourcePath) else {
            throw FileSystemError.fileNotFound(sourcePath)
        }
        
        // 检查目标文件是否已存在
        if fileManager.fileExists(atPath: destinationPath) {
            throw FileSystemError.fileAlreadyExists(destinationPath)
        }
        
        // 检查权限
        guard hasPermission(.read, for: sourcePath) else {
            throw FileSystemError.permissionDenied(sourcePath)
        }
        
        let destinationParent = URL(fileURLWithPath: destinationPath).deletingLastPathComponent().path
        guard hasPermission(.write, for: destinationParent) else {
            throw FileSystemError.permissionDenied(destinationPath)
        }
        
        // 检查磁盘空间
        let fileSize = try getFileAttributes(at: sourcePath).size
        let availableSpace = try getAvailableSpace(at: destinationParent)
        if fileSize > availableSpace {
            throw FileSystemError.insufficientSpace(fileSize, availableSpace)
        }
        
        // 确保目标目录存在
        if !fileManager.fileExists(atPath: destinationParent) {
            try createDirectory(at: destinationParent)
        }
        
        // 复制文件
        do {
            try fileManager.copyItem(atPath: sourcePath, toPath: destinationPath)
        } catch {
            throw FileSystemError.operationFailed("Failed to copy file from \(sourcePath) to \(destinationPath): \(error.localizedDescription)")
        }
    }
    
    // MARK: - Directory Operations
    
    func createDirectory(at path: String) throws {
        // 检查目录是否已存在
        if fileManager.fileExists(atPath: path) {
            throw FileSystemError.directoryAlreadyExists(path)
        }
        
        // 检查父目录权限
        let parentDirectory = URL(fileURLWithPath: path).deletingLastPathComponent().path
        if fileManager.fileExists(atPath: parentDirectory) {
            guard hasPermission(.write, for: parentDirectory) else {
                throw FileSystemError.permissionDenied(path)
            }
        }
        
        // 创建目录
        do {
            try fileManager.createDirectory(atPath: path, withIntermediateDirectories: true, attributes: nil)
        } catch {
            throw FileSystemError.operationFailed("Failed to create directory at \(path): \(error.localizedDescription)")
        }
    }
    
    func deleteDirectory(at path: String) throws {
        // 检查目录是否存在
        guard fileManager.fileExists(atPath: path) else {
            throw FileSystemError.directoryNotFound(path)
        }
        
        // 检查权限
        let parentDirectory = URL(fileURLWithPath: path).deletingLastPathComponent().path
        guard hasPermission(.write, for: parentDirectory) else {
            throw FileSystemError.permissionDenied(path)
        }
        
        // 删除目录
        do {
            try fileManager.removeItem(atPath: path)
        } catch {
            throw FileSystemError.operationFailed("Failed to delete directory at \(path): \(error.localizedDescription)")
        }
    }
    
    func listDirectory(at path: String) throws -> [String] {
        // 检查目录是否存在
        guard fileManager.fileExists(atPath: path) else {
            throw FileSystemError.directoryNotFound(path)
        }
        
        // 检查权限
        guard hasPermission(.read, for: path) else {
            throw FileSystemError.permissionDenied(path)
        }
        
        // 列出目录内容
        do {
            return try fileManager.contentsOfDirectory(atPath: path)
        } catch {
            throw FileSystemError.operationFailed("Failed to list directory at \(path): \(error.localizedDescription)")
        }
    }
    
    // MARK: - File System Queries
    
    func fileExists(at path: String) -> Bool {
        var isDirectory: ObjCBool = false
        let exists = fileManager.fileExists(atPath: path, isDirectory: &isDirectory)
        return exists && !isDirectory.boolValue
    }
    
    func directoryExists(at path: String) -> Bool {
        var isDirectory: ObjCBool = false
        let exists = fileManager.fileExists(atPath: path, isDirectory: &isDirectory)
        return exists && isDirectory.boolValue
    }
    
    func getFileAttributes(at path: String) throws -> FileAttributes {
        // 检查文件是否存在
        guard fileManager.fileExists(atPath: path) else {
            throw FileSystemError.fileNotFound(path)
        }
        
        do {
            let attributes = try fileManager.attributesOfItem(atPath: path)
            
            let size = attributes[.size] as? Int64 ?? 0
            let creationDate = attributes[.creationDate] as? Date ?? Date()
            let modificationDate = attributes[.modificationDate] as? Date ?? Date()
            let fileType = attributes[.type] as? FileAttributeType
            let isDirectory = fileType == .typeDirectory
            let posixPermissions = attributes[.posixPermissions] as? Int ?? 0
            
            return FileAttributes(
                size: size,
                creationDate: creationDate,
                modificationDate: modificationDate,
                isDirectory: isDirectory,
                isReadable: fileManager.isReadableFile(atPath: path),
                isWritable: fileManager.isWritableFile(atPath: path),
                isExecutable: fileManager.isExecutableFile(atPath: path),
                permissions: String(format: "%o", posixPermissions)
            )
        } catch {
            throw FileSystemError.operationFailed("Failed to get attributes for \(path): \(error.localizedDescription)")
        }
    }
    
    func hasPermission(_ permission: FilePermission, for path: String) -> Bool {
        switch permission {
        case .read:
            return fileManager.isReadableFile(atPath: path)
        case .write:
            return fileManager.isWritableFile(atPath: path)
        case .execute:
            return fileManager.isExecutableFile(atPath: path)
        }
    }
    
    func getAvailableSpace(at path: String) throws -> Int64 {
        do {
            let attributes = try fileManager.attributesOfFileSystem(forPath: path)
            let freeSpace = attributes[.systemFreeSize] as? Int64 ?? 0
            return freeSpace
        } catch {
            throw FileSystemError.operationFailed("Failed to get available space for \(path): \(error.localizedDescription)")
        }
    }
}