import Foundation

/// 离线管理器协议
protocol OfflineManagerProtocol: AnyObject {
    
    /// 将文件标记为离线可用
    func makeAvailableOffline(_ path: String) async throws
    
    /// 从离线缓存中移除文件
    func removeFromOffline(_ path: String) async throws
    
    /// 检查文件是否离线可用
    func isAvailableOffline(_ path: String) -> Bool
    
    /// 获取所有离线可用的项目
    func getOfflineItems() -> [OfflineCacheItem]
    
    /// 获取缓存使用情况
    func getCacheUsage() -> CacheUsage
    
    /// 清理缓存
    func cleanupCache(threshold: Double) async throws
    
    /// 缓存更新事件流
    var cacheUpdates: AsyncStream<CacheUpdate> { get }
    
    /// 访问离线文件
    func accessOfflineFile(_ path: String) async throws -> String
    
    // MARK: - Offline Sync Methods
    
    /// 记录离线修改
    func recordOfflineModification(_ modification: OfflineModification)
    
    /// 设置网络状态
    func setNetworkAvailable(_ available: Bool)
    
    /// 获取待同步的修改数量
    func getPendingModificationsCount() -> Int
    
    /// 获取所有待同步的修改
    func getPendingModifications() -> [OfflineModification]
}