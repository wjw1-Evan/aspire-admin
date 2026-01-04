import Foundation

/// 冲突解决器协议，定义冲突检测和解决的接口
protocol ConflictResolverProtocol {
    // MARK: - 冲突检测
    
    /// 检测所有冲突
    func detectConflicts() async -> [ConflictInfo]
    
    /// 检测特定项目的冲突
    func detectConflict(for item: SyncItem) async -> ConflictInfo?
    
    /// 检测两个项目之间的冲突
    func detectConflict(between localItem: SyncItem, and cloudItem: CloudItem) async -> ConflictInfo?
    
    // MARK: - 冲突解决
    
    /// 解决冲突
    func resolveConflict(_ conflict: ConflictInfo, resolution: ConflictInfo.ResolutionOption) async throws
    
    /// 解决特定项目的冲突
    func resolveConflict(for item: SyncItem, resolution: ConflictInfo.ResolutionOption) async throws
    
    /// 使用策略解决所有冲突
    func resolveAllConflicts(strategy: ConflictResolutionStrategy) async throws
    
    /// 创建冲突副本
    func createConflictCopy(for item: SyncItem) async throws -> SyncItem
    
    // MARK: - 事件流
    
    /// 冲突检测事件流
    var conflictDetected: AsyncStream<ConflictInfo> { get }
    
    /// 冲突解决事件流
    var conflictResolved: AsyncStream<ConflictResolutionResult> { get }
}