import Foundation
import OSLog

/// 冲突解决器实现，负责检测和解决同步冲突
class ConflictResolver: ConflictResolverProtocol {
    private let logger = Logger(subsystem: "com.syncapp.macos", category: "ConflictResolver")
    private let fileSystemService: FileSystemServiceProtocol
    private let cloudAPIService: CloudAPIServiceProtocol
    private let localDBService: LocalDBService
    
    // 事件流的 continuation
    private let conflictDetectedContinuation: AsyncStream<ConflictInfo>.Continuation
    private let conflictResolvedContinuation: AsyncStream<ConflictResolutionResult>.Continuation
    
    // 公开的事件流
    let conflictDetected: AsyncStream<ConflictInfo>
    let conflictResolved: AsyncStream<ConflictResolutionResult>
    
    init(
        fileSystemService: FileSystemServiceProtocol,
        cloudAPIService: CloudAPIServiceProtocol,
        localDBService: LocalDBService
    ) {
        self.fileSystemService = fileSystemService
        self.cloudAPIService = cloudAPIService
        self.localDBService = localDBService
        
        // 初始化事件流
        (self.conflictDetected, self.conflictDetectedContinuation) = AsyncStream.makeStream()
        (self.conflictResolved, self.conflictResolvedContinuation) = AsyncStream.makeStream()
    }
    
    deinit {
        conflictDetectedContinuation.finish()
        conflictResolvedContinuation.finish()
    }
    
    // MARK: - 冲突检测
    
    func detectConflicts() async -> [ConflictInfo] {
        logger.info("开始检测所有冲突")
        
        do {
            let syncItems = try localDBService.getAllSyncItems()
            var conflicts: [ConflictInfo] = []
            
            for item in syncItems {
                if let conflict = await detectConflict(for: item) {
                    conflicts.append(conflict)
                    conflictDetectedContinuation.yield(conflict)
                }
            }
            
            logger.info("检测到 \(conflicts.count) 个冲突")
            return conflicts
            
        } catch {
            logger.error("检测冲突失败: \(error.localizedDescription)")
            return []
        }
    }
    
    func detectConflict(for item: SyncItem) async -> ConflictInfo? {
        do {
            // 获取云端对应项目
            guard let cloudItem = try await getCloudItem(for: item) else {
                return nil
            }
            
            return await detectConflict(between: item, and: cloudItem)
            
        } catch {
            logger.error("检测项目冲突失败 \(item.name): \(error.localizedDescription)")
            return nil
        }
    }
    
    func detectConflict(between localItem: SyncItem, and cloudItem: CloudItem) async -> ConflictInfo? {
        // 检查是否存在冲突的基本条件
        guard await hasConflictConditions(localItem: localItem, cloudItem: cloudItem) else {
            return nil
        }
        
        // 检测冲突类型
        if let conflictType = await detectConflictType(localItem: localItem, cloudItem: cloudItem) {
            let conflictInfo = ConflictInfo(
                itemId: localItem.id,
                itemName: localItem.name,
                conflictType: conflictType,
                localModifiedDate: localItem.modifiedDate,
                cloudModifiedDate: cloudItem.modifiedDate,
                localSize: localItem.size,
                cloudSize: getCloudItemSize(cloudItem),
                resolutionOptions: ConflictInfo.availableOptions(for: conflictType)
            )
            
            logger.info("检测到冲突: \(localItem.name) - \(conflictType.rawValue)")
            return conflictInfo
        }
        
        return nil
    }
    
    // MARK: - 冲突解决
    
    func resolveConflict(_ conflict: ConflictInfo, resolution: ConflictInfo.ResolutionOption) async throws {
        logger.info("开始解决冲突，解决方案: \(resolution.rawValue)")
        throw ConflictResolutionError.unknownError("需要具体的 SyncItem 来解决冲突")
    }
    
    func resolveConflict(for item: SyncItem, resolution: ConflictInfo.ResolutionOption) async throws {
        guard let conflictInfo = item.conflictInfo else {
            throw ConflictResolutionError.conflictNotFound
        }
        
        logger.info("解决项目冲突: \(item.name) 使用方案: \(resolution.rawValue)")
        
        let result: ConflictResolutionResult
        
        do {
            let resolvedItem = try await executeResolution(item: item, resolution: resolution)
            result = ConflictResolutionResult(
                conflictInfo: conflictInfo,
                resolution: resolution,
                resolvedItem: resolvedItem,
                success: true
            )
            
            logger.info("冲突解决成功: \(item.name)")
            
        } catch {
            result = ConflictResolutionResult(
                conflictInfo: conflictInfo,
                resolution: resolution,
                resolvedItem: item,
                success: false,
                error: error.localizedDescription
            )
            
            logger.error("冲突解决失败: \(item.name) - \(error.localizedDescription)")
            throw error
        }
        
        conflictResolvedContinuation.yield(result)
    }
    
    func resolveAllConflicts(strategy: ConflictResolutionStrategy) async throws {
        logger.info("使用策略解决所有冲突: \(strategy.rawValue)")
        
        let conflicts = await detectConflicts()
        
        for conflict in conflicts {
            let resolution = determineResolution(for: conflict, using: strategy)
            
            if resolution != .keepBoth || strategy != .askUser {
                logger.info("自动解决冲突使用方案: \(resolution.rawValue)")
            }
        }
    }
    
    func createConflictCopy(for item: SyncItem) async throws -> SyncItem {
        logger.info("为项目创建冲突副本: \(item.name)")
        
        let timestamp = DateFormatter.conflictCopy.string(from: Date())
        let fileExtension = URL(fileURLWithPath: item.name).pathExtension
        let baseName = URL(fileURLWithPath: item.name).deletingPathExtension().lastPathComponent
        
        let conflictName: String
        if fileExtension.isEmpty {
            conflictName = "\(baseName) (Conflicted Copy \(timestamp))"
        } else {
            conflictName = "\(baseName) (Conflicted Copy \(timestamp)).\(fileExtension)"
        }
        
        let conflictPath = URL(fileURLWithPath: item.localPath)
            .deletingLastPathComponent()
            .appendingPathComponent(conflictName)
            .path
        
        // 复制文件
        try fileSystemService.copyFile(from: item.localPath, to: conflictPath)
        
        // 创建新的 SyncItem
        let conflictItem = SyncItem(
            cloudId: UUID().uuidString,
            localPath: conflictPath,
            cloudPath: URL(fileURLWithPath: item.cloudPath)
                .deletingLastPathComponent()
                .appendingPathComponent(conflictName)
                .path,
            name: conflictName,
            type: item.type,
            size: item.size,
            modifiedDate: item.modifiedDate,
            syncState: .localOnly,
            hash: item.hash,
            parentId: item.parentId
        )
        
        logger.info("冲突副本创建成功: \(conflictName)")
        return conflictItem
    }
}

// MARK: - 私有辅助方法
extension ConflictResolver {
    
    /// 获取云端项目
    private func getCloudItem(for item: SyncItem) async throws -> CloudItem? {
        do {
            if item.type == .file {
                let cloudFile = try await cloudAPIService.getFileInfo(at: item.cloudPath)
                return .file(cloudFile)
            } else {
                let cloudFolder = try await cloudAPIService.getFolderInfo(at: item.cloudPath)
                return .folder(cloudFolder)
            }
        } catch {
            logger.debug("无法获取云端项目信息: \(item.cloudPath)")
            return nil
        }
    }
    
    /// 检查是否存在冲突条件
    private func hasConflictConditions(localItem: SyncItem, cloudItem: CloudItem) async -> Bool {
        // 如果本地和云端都有修改，且修改时间不同，可能存在冲突
        let localModified = localItem.modifiedDate
        let cloudModified = cloudItem.modifiedDate
        
        // 允许1秒的时间差异（考虑到时间精度问题）
        let timeDifference = abs(localModified.timeIntervalSince(cloudModified))
        
        return timeDifference > 1.0
    }
    
    /// 检测冲突类型
    private func detectConflictType(localItem: SyncItem, cloudItem: CloudItem) async -> ConflictInfo.ConflictType? {
        // 检查类型冲突（文件 vs 文件夹）
        if (localItem.type == .file && cloudItem.isFolder) || 
           (localItem.type == .folder && !cloudItem.isFolder) {
            return .typeConflict
        }
        
        // 检查名称冲突
        if localItem.name != cloudItem.name {
            return .nameConflict
        }
        
        // 检查内容冲突（仅对文件）
        if localItem.type == .file && !cloudItem.isFolder {
            if let cloudFile = getCloudFile(from: cloudItem) {
                if localItem.hash != cloudFile.hash {
                    return .contentConflict
                }
            }
        }
        
        return nil
    }
    
    /// 获取云端项目大小
    private func getCloudItemSize(_ cloudItem: CloudItem) -> Int64 {
        switch cloudItem {
        case .file(let file):
            return file.size
        case .folder:
            return 0
        }
    }
    
    /// 从 CloudItem 获取 CloudFile
    private func getCloudFile(from cloudItem: CloudItem) -> CloudFile? {
        switch cloudItem {
        case .file(let file):
            return file
        case .folder:
            return nil
        }
    }
    
    /// 根据策略确定解决方案
    private func determineResolution(for conflict: ConflictInfo, using strategy: ConflictResolutionStrategy) -> ConflictInfo.ResolutionOption {
        switch strategy {
        case .askUser:
            return .keepBoth // 默认选择，实际需要用户输入
        case .keepLocal:
            return .keepLocal
        case .keepCloud:
            return .keepCloud
        case .keepBoth:
            return .keepBoth
        case .keepNewer:
            return conflict.localModifiedDate > conflict.cloudModifiedDate ? .keepLocal : .keepCloud
        case .keepLarger:
            return conflict.localSize > conflict.cloudSize ? .keepLocal : .keepCloud
        }
    }
    
    /// 执行冲突解决
    private func executeResolution(item: SyncItem, resolution: ConflictInfo.ResolutionOption) async throws -> SyncItem {
        switch resolution {
        case .keepLocal:
            return try await executeKeepLocal(item: item)
        case .keepCloud:
            return try await executeKeepCloud(item: item)
        case .keepBoth:
            return try await executeKeepBoth(item: item)
        case .merge:
            return try await executeMerge(item: item)
        }
    }
    
    /// 执行保留本地版本
    private func executeKeepLocal(item: SyncItem) async throws -> SyncItem {
        // 上传本地版本到云端，覆盖云端版本
        _ = try await cloudAPIService.uploadFile(at: item.localPath, to: item.cloudPath) { _ in }
        
        var updatedItem = item
        updatedItem.syncState = .synced
        updatedItem.conflictInfo = nil
        updatedItem.lastSyncDate = Date()
        
        return updatedItem
    }
    
    /// 执行保留云端版本
    private func executeKeepCloud(item: SyncItem) async throws -> SyncItem {
        // 下载云端版本到本地，覆盖本地版本
        try await cloudAPIService.downloadFile(from: item.cloudPath, to: item.localPath) { _ in }
        
        var updatedItem = item
        updatedItem.syncState = .synced
        updatedItem.conflictInfo = nil
        updatedItem.lastSyncDate = Date()
        
        // 更新本地文件信息
        if let fileAttributes = try? fileSystemService.getFileAttributes(at: item.localPath) {
            updatedItem.size = fileAttributes.size
            updatedItem.modifiedDate = fileAttributes.modificationDate
            // Note: hash calculation would need to be implemented
        }
        
        return updatedItem
    }
    
    /// 执行保留两个版本
    private func executeKeepBoth(item: SyncItem) async throws -> SyncItem {
        // 创建冲突副本
        let conflictCopy = try await createConflictCopy(for: item)
        
        // 保存冲突副本到数据库
        try localDBService.insertSyncItem(conflictCopy)
        
        // 下载云端版本覆盖原文件
        return try await executeKeepCloud(item: item)
    }
    
    /// 执行合并（仅适用于文件夹）
    private func executeMerge(item: SyncItem) async throws -> SyncItem {
        guard item.type == .folder else {
            throw ConflictResolutionError.invalidResolution
        }
        
        // 文件夹合并逻辑比较复杂，这里简化处理
        // 实际实现需要递归处理文件夹内容
        logger.info("执行文件夹合并: \(item.name)")
        
        var updatedItem = item
        updatedItem.syncState = .synced
        updatedItem.conflictInfo = nil
        updatedItem.lastSyncDate = Date()
        
        return updatedItem
    }
}

// MARK: - DateFormatter 扩展
extension DateFormatter {
    static let conflictCopy: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH-mm-ss"
        return formatter
    }()
}