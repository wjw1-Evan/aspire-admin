import Foundation

/// 带宽管理相关的数据模型

/// 带宽配置
struct BandwidthConfiguration: Codable, Hashable {
    var uploadLimit: Int64? // bytes per second
    var downloadLimit: Int64?
    var enableAutoThrottling: Bool
    var pauseOnMeteredConnection: Bool
    var powerSavingMode: Bool
    var syncTimeWindows: [SyncTimeWindow]
    var maxConcurrentTransfers: Int
    var minBandwidthPerTransfer: Int64 // bytes per second
    
    init(
        uploadLimit: Int64? = nil,
        downloadLimit: Int64? = nil,
        enableAutoThrottling: Bool = true,
        pauseOnMeteredConnection: Bool = true,
        powerSavingMode: Bool = false,
        syncTimeWindows: [SyncTimeWindow] = [],
        maxConcurrentTransfers: Int = 5,
        minBandwidthPerTransfer: Int64 = 1024 // 1KB/s minimum
    ) {
        self.uploadLimit = uploadLimit
        self.downloadLimit = downloadLimit
        self.enableAutoThrottling = enableAutoThrottling
        self.pauseOnMeteredConnection = pauseOnMeteredConnection
        self.powerSavingMode = powerSavingMode
        self.syncTimeWindows = syncTimeWindows
        self.maxConcurrentTransfers = maxConcurrentTransfers
        self.minBandwidthPerTransfer = minBandwidthPerTransfer
    }
    
    /// 验证配置是否有效
    func isValid() -> Bool {
        // 检查带宽限制
        if let uploadLimit = uploadLimit, uploadLimit <= 0 {
            return false
        }
        
        if let downloadLimit = downloadLimit, downloadLimit <= 0 {
            return false
        }
        
        // 检查并发传输数量
        if maxConcurrentTransfers <= 0 {
            return false
        }
        
        // 检查最小带宽
        if minBandwidthPerTransfer <= 0 {
            return false
        }
        
        return true
    }
    
    /// 获取格式化的带宽限制
    func formattedBandwidthLimits() -> (upload: String?, download: String?) {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        
        let upload = uploadLimit.map { "\(formatter.string(fromByteCount: $0))/s" }
        let download = downloadLimit.map { "\(formatter.string(fromByteCount: $0))/s" }
        
        return (upload, download)
    }
}