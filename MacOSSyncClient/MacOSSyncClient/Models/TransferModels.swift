import Foundation

/// 传输进度信息
struct TransferProgressInfo: Codable, Hashable {
    let itemId: UUID
    let transferType: TransferType
    let progress: Double // 0.0 - 1.0
    let currentAttempt: Int
    let maxAttempts: Int
    let timestamp: Date
    let bytesTransferred: Int64?
    let totalBytes: Int64?
    let transferSpeed: Double? // bytes per second
    
    /// 传输类型
    enum TransferType: String, Codable, CaseIterable {
        case upload = "upload"
        case download = "download"
        
        var displayName: String {
            switch self {
            case .upload:
                return "Uploading"
            case .download:
                return "Downloading"
            }
        }
    }
    
    init(
        itemId: UUID,
        transferType: TransferType,
        progress: Double,
        currentAttempt: Int = 1,
        maxAttempts: Int = 3,
        timestamp: Date = Date(),
        bytesTransferred: Int64? = nil,
        totalBytes: Int64? = nil,
        transferSpeed: Double? = nil
    ) {
        self.itemId = itemId
        self.transferType = transferType
        self.progress = progress
        self.currentAttempt = currentAttempt
        self.maxAttempts = maxAttempts
        self.timestamp = timestamp
        self.bytesTransferred = bytesTransferred
        self.totalBytes = totalBytes
        self.transferSpeed = transferSpeed
    }
    
    /// 是否完成
    var isCompleted: Bool {
        return progress >= 1.0
    }
    
    /// 是否失败
    var isFailed: Bool {
        return currentAttempt >= maxAttempts && !isCompleted
    }
    
    /// 格式化的传输速度
    var formattedTransferSpeed: String? {
        guard let speed = transferSpeed else { return nil }
        return ByteCountFormatter.string(fromByteCount: Int64(speed), countStyle: .file) + "/s"
    }
    
    /// 格式化的进度百分比
    var formattedProgress: String {
        return String(format: "%.1f%%", progress * 100)
    }
    
    /// 预估剩余时间
    var estimatedTimeRemaining: TimeInterval? {
        guard progress > 0.01, let speed = transferSpeed, let total = totalBytes else {
            return nil
        }
        
        let remainingBytes = Double(total) - (Double(total) * progress)
        return remainingBytes / speed
    }
    
    /// 格式化的剩余时间
    var formattedTimeRemaining: String? {
        guard let timeRemaining = estimatedTimeRemaining else { return nil }
        
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = [.hour, .minute, .second]
        formatter.unitsStyle = .abbreviated
        return formatter.string(from: timeRemaining)
    }
}

/// 传输会话信息
struct TransferSession: Codable, Hashable {
    let id: UUID
    let itemId: UUID
    let transferType: TransferProgressInfo.TransferType
    let localPath: String
    let cloudPath: String
    let startTime: Date
    let resumeData: Data? // 用于断点续传
    var lastProgressUpdate: Date
    var currentProgress: Double
    var isActive: Bool
    
    init(
        id: UUID = UUID(),
        itemId: UUID,
        transferType: TransferProgressInfo.TransferType,
        localPath: String,
        cloudPath: String,
        startTime: Date = Date(),
        resumeData: Data? = nil
    ) {
        self.id = id
        self.itemId = itemId
        self.transferType = transferType
        self.localPath = localPath
        self.cloudPath = cloudPath
        self.startTime = startTime
        self.resumeData = resumeData
        self.lastProgressUpdate = startTime
        self.currentProgress = 0.0
        self.isActive = true
    }
    
    /// 会话持续时间
    var duration: TimeInterval {
        return lastProgressUpdate.timeIntervalSince(startTime)
    }
    
    /// 平均传输速度（基于进度）
    var averageSpeed: Double? {
        guard duration > 0, currentProgress > 0 else { return nil }
        return currentProgress / duration
    }
    
    /// 是否可以恢复
    var canResume: Bool {
        return resumeData != nil && !isActive
    }
}

/// 传输统计信息
struct TransferStatistics: Codable, Hashable {
    let totalTransfers: Int
    let activeTransfers: Int
    let completedTransfers: Int
    let failedTransfers: Int
    let totalBytesTransferred: Int64
    let averageTransferSpeed: Double
    let timestamp: Date
    
    init(
        totalTransfers: Int = 0,
        activeTransfers: Int = 0,
        completedTransfers: Int = 0,
        failedTransfers: Int = 0,
        totalBytesTransferred: Int64 = 0,
        averageTransferSpeed: Double = 0.0,
        timestamp: Date = Date()
    ) {
        self.totalTransfers = totalTransfers
        self.activeTransfers = activeTransfers
        self.completedTransfers = completedTransfers
        self.failedTransfers = failedTransfers
        self.totalBytesTransferred = totalBytesTransferred
        self.averageTransferSpeed = averageTransferSpeed
        self.timestamp = timestamp
    }
    
    /// 成功率
    var successRate: Double {
        guard totalTransfers > 0 else { return 0.0 }
        return Double(completedTransfers) / Double(totalTransfers)
    }
    
    /// 格式化的传输量
    var formattedTotalBytes: String {
        return ByteCountFormatter.string(fromByteCount: totalBytesTransferred, countStyle: .file)
    }
    
    /// 格式化的平均速度
    var formattedAverageSpeed: String {
        return ByteCountFormatter.string(fromByteCount: Int64(averageTransferSpeed), countStyle: .file) + "/s"
    }
}