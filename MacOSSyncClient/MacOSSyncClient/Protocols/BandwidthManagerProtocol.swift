import Foundation
import Network

/// 带宽管理器协议
/// 负责控制同步时的网络带宽使用，实现智能带宽限制和网络状况自适应调整
protocol BandwidthManagerProtocol {
    // MARK: - 带宽控制

    /// 设置上传带宽限制
    /// - Parameter limit: 带宽限制（字节/秒），nil 表示无限制
    func setUploadLimit(_ limit: Int64?) async

    /// 设置下载带宽限制
    /// - Parameter limit: 带宽限制（字节/秒），nil 表示无限制
    func setDownloadLimit(_ limit: Int64?) async

    /// 获取当前上传带宽限制
    func getUploadLimit() -> Int64?

    /// 获取当前下载带宽限制
    func getDownloadLimit() -> Int64?

    /// 启用或禁用自动带宽调节
    /// - Parameter enabled: 是否启用自动调节
    func setAutoThrottlingEnabled(_ enabled: Bool) async

    /// 检查自动带宽调节是否启用
    func isAutoThrottlingEnabled() -> Bool

    // MARK: - 网络状况监控

    /// 获取当前网络类型
    func getCurrentNetworkType() -> NetworkType

    /// 检查是否为计费网络连接
    func isMeteredConnection() -> Bool

    /// 获取当前网络质量评估
    func getNetworkQuality() -> NetworkQuality

    /// 获取当前网络带宽使用情况
    func getBandwidthUsage() -> BandwidthUsage

    /// 异步获取最新带宽使用情况
    func getCurrentUsage() async -> BandwidthUsage

    // MARK: - 传输控制

    /// 暂停所有传输
    func pauseAllTransfers() async

    /// 恢复所有传输
    func resumeAllTransfers() async

    /// 检查传输是否暂停
    func areTransfersPaused() -> Bool

    /// 为特定传输分配带宽
    /// - Parameters:
    ///   - transferId: 传输ID
    ///   - type: 传输类型
    ///   - priority: 传输优先级
    /// - Returns: 分配的带宽（字节/秒）
    func allocateBandwidth(for transferId: UUID, type: TransferType, priority: TransferPriority)
        async -> Int64

    /// 释放传输带宽
    /// - Parameter transferId: 传输ID
    func releaseBandwidth(for transferId: UUID) async

    // MARK: - 省电模式和时间窗口

    /// 设置省电模式
    /// - Parameter enabled: 是否启用省电模式
    func setPowerSavingMode(_ enabled: Bool) async

    /// 检查是否处于省电模式
    func isPowerSavingModeEnabled() -> Bool

    /// 设置同步时间窗口
    /// - Parameter windows: 允许同步的时间窗口列表
    func setSyncTimeWindows(_ windows: [SyncTimeWindow]) async

    /// 获取当前同步时间窗口
    func getSyncTimeWindows() -> [SyncTimeWindow]

    /// 检查当前时间是否在允许同步的时间窗口内
    func isCurrentTimeInSyncWindow() -> Bool

    // MARK: - 事件监听

    /// 网络状况变化事件流
    var networkStatusChanges: AsyncStream<NetworkStatusChange> { get }

    /// 带宽使用情况更新事件流
    var bandwidthUsageUpdates: AsyncStream<BandwidthUsage> { get }

    /// 传输状态变化事件流
    var transferStatusChanges: AsyncStream<TransferStatusChange> { get }
}

// MARK: - 支持数据结构

/// 网络类型
enum NetworkType: String, Codable, CaseIterable {
    case wifi = "wifi"
    case ethernet = "ethernet"
    case cellular = "cellular"
    case other = "other"
    case unknown = "unknown"

    var displayName: String {
        switch self {
        case .wifi:
            return "Wi-Fi"
        case .ethernet:
            return "Ethernet"
        case .cellular:
            return "Cellular"
        case .other:
            return "Other"
        case .unknown:
            return "Unknown"
        }
    }

    /// 是否为计费连接
    var isMetered: Bool {
        return self == .cellular
    }
}

/// 网络质量评估
enum NetworkQuality: String, Codable, CaseIterable {
    case excellent = "excellent"
    case good = "good"
    case fair = "fair"
    case poor = "poor"
    case unavailable = "unavailable"

    var displayName: String {
        switch self {
        case .excellent:
            return "Excellent"
        case .good:
            return "Good"
        case .fair:
            return "Fair"
        case .poor:
            return "Poor"
        case .unavailable:
            return "Unavailable"
        }
    }

    /// 建议的带宽调节因子（0.0-1.0）
    var throttlingFactor: Double {
        switch self {
        case .excellent:
            return 1.0
        case .good:
            return 0.8
        case .fair:
            return 0.6
        case .poor:
            return 0.3
        case .unavailable:
            return 0.0
        }
    }
}

/// 带宽使用情况
struct BandwidthUsage: Codable, Hashable {
    let timestamp: Date
    let uploadSpeed: Int64  // 当前上传速度（字节/秒）
    let downloadSpeed: Int64  // 当前下载速度（字节/秒）
    let uploadLimit: Int64?  // 上传限制（字节/秒）
    let downloadLimit: Int64?  // 下载限制（字节/秒）
    let activeTransfers: Int  // 活跃传输数量
    let networkType: NetworkType
    let networkQuality: NetworkQuality

    init(
        timestamp: Date = Date(),
        uploadSpeed: Int64 = 0,
        downloadSpeed: Int64 = 0,
        uploadLimit: Int64? = nil,
        downloadLimit: Int64? = nil,
        activeTransfers: Int = 0,
        networkType: NetworkType = .unknown,
        networkQuality: NetworkQuality = .unavailable
    ) {
        self.timestamp = timestamp
        self.uploadSpeed = uploadSpeed
        self.downloadSpeed = downloadSpeed
        self.uploadLimit = uploadLimit
        self.downloadLimit = downloadLimit
        self.activeTransfers = activeTransfers
        self.networkType = networkType
        self.networkQuality = networkQuality
    }

    /// 上传带宽使用率（0.0-1.0）
    var uploadUtilization: Double {
        guard let limit = uploadLimit, limit > 0 else { return 0.0 }
        return min(Double(uploadSpeed) / Double(limit), 1.0)
    }

    /// 下载带宽使用率（0.0-1.0）
    var downloadUtilization: Double {
        guard let limit = downloadLimit, limit > 0 else { return 0.0 }
        return min(Double(downloadSpeed) / Double(limit), 1.0)
    }

    /// 格式化的上传速度
    var formattedUploadSpeed: String {
        return ByteCountFormatter.string(fromByteCount: uploadSpeed, countStyle: .file) + "/s"
    }

    /// 格式化的下载速度
    var formattedDownloadSpeed: String {
        return ByteCountFormatter.string(fromByteCount: downloadSpeed, countStyle: .file) + "/s"
    }
}

/// 传输类型
enum TransferType: String, Codable, CaseIterable {
    case upload = "upload"
    case download = "download"

    var displayName: String {
        switch self {
        case .upload:
            return "Upload"
        case .download:
            return "Download"
        }
    }
}

/// 传输优先级
enum TransferPriority: String, Codable, CaseIterable {
    case high = "high"
    case normal = "normal"
    case low = "low"

    var displayName: String {
        switch self {
        case .high:
            return "High"
        case .normal:
            return "Normal"
        case .low:
            return "Low"
        }
    }

    /// 优先级权重（用于带宽分配）
    var weight: Double {
        switch self {
        case .high:
            return 3.0
        case .normal:
            return 2.0
        case .low:
            return 1.0
        }
    }
}

/// 同步时间窗口
struct SyncTimeWindow: Codable, Hashable {
    let id: UUID
    let name: String
    let startTime: TimeOfDay  // 开始时间
    let endTime: TimeOfDay  // 结束时间
    let daysOfWeek: Set<DayOfWeek>  // 适用的星期
    let isEnabled: Bool

    init(
        id: UUID = UUID(),
        name: String,
        startTime: TimeOfDay,
        endTime: TimeOfDay,
        daysOfWeek: Set<DayOfWeek> = Set(DayOfWeek.allCases),
        isEnabled: Bool = true
    ) {
        self.id = id
        self.name = name
        self.startTime = startTime
        self.endTime = endTime
        self.daysOfWeek = daysOfWeek
        self.isEnabled = isEnabled
    }

    /// 检查指定时间是否在此窗口内
    /// - Parameter date: 要检查的时间
    /// - Returns: 是否在窗口内
    func contains(_ date: Date) -> Bool {
        guard isEnabled else { return false }

        let calendar = Calendar.current
        let components = calendar.dateComponents([.weekday, .hour, .minute], from: date)

        guard let weekday = components.weekday,
            let hour = components.hour,
            let minute = components.minute
        else {
            return false
        }

        // 检查星期
        let dayOfWeek = DayOfWeek.from(weekday: weekday)
        guard daysOfWeek.contains(dayOfWeek) else { return false }

        // 检查时间
        let currentTime = TimeOfDay(hour: hour, minute: minute)

        if startTime <= endTime {
            // 同一天内的时间窗口
            return currentTime >= startTime && currentTime <= endTime
        } else {
            // 跨天的时间窗口
            return currentTime >= startTime || currentTime <= endTime
        }
    }
}

/// 一天中的时间
struct TimeOfDay: Codable, Hashable, Comparable {
    let hour: Int  // 0-23
    let minute: Int  // 0-59

    init(hour: Int, minute: Int) {
        self.hour = max(0, min(23, hour))
        self.minute = max(0, min(59, minute))
    }

    static func < (lhs: TimeOfDay, rhs: TimeOfDay) -> Bool {
        if lhs.hour != rhs.hour {
            return lhs.hour < rhs.hour
        }
        return lhs.minute < rhs.minute
    }

    /// 格式化显示
    var formatted: String {
        return String(format: "%02d:%02d", hour, minute)
    }
}

/// 星期枚举
enum DayOfWeek: String, Codable, CaseIterable {
    case sunday = "sunday"
    case monday = "monday"
    case tuesday = "tuesday"
    case wednesday = "wednesday"
    case thursday = "thursday"
    case friday = "friday"
    case saturday = "saturday"

    var displayName: String {
        switch self {
        case .sunday:
            return "Sunday"
        case .monday:
            return "Monday"
        case .tuesday:
            return "Tuesday"
        case .wednesday:
            return "Wednesday"
        case .thursday:
            return "Thursday"
        case .friday:
            return "Friday"
        case .saturday:
            return "Saturday"
        }
    }

    /// 从 Calendar 的 weekday 转换（1=Sunday, 2=Monday, ...）
    static func from(weekday: Int) -> DayOfWeek {
        switch weekday {
        case 1: return .sunday
        case 2: return .monday
        case 3: return .tuesday
        case 4: return .wednesday
        case 5: return .thursday
        case 6: return .friday
        case 7: return .saturday
        default: return .sunday
        }
    }
}

/// 网络状况变化事件
struct NetworkStatusChange: Codable, Hashable {
    let timestamp: Date
    let previousType: NetworkType
    let currentType: NetworkType
    let previousQuality: NetworkQuality
    let currentQuality: NetworkQuality
    let isMeteredConnection: Bool

    init(
        timestamp: Date = Date(),
        previousType: NetworkType,
        currentType: NetworkType,
        previousQuality: NetworkQuality,
        currentQuality: NetworkQuality,
        isMeteredConnection: Bool
    ) {
        self.timestamp = timestamp
        self.previousType = previousType
        self.currentType = currentType
        self.previousQuality = previousQuality
        self.currentQuality = currentQuality
        self.isMeteredConnection = isMeteredConnection
    }

    /// 网络类型是否发生变化
    var networkTypeChanged: Bool {
        return previousType != currentType
    }

    /// 网络质量是否发生变化
    var networkQualityChanged: Bool {
        return previousQuality != currentQuality
    }

    /// 是否需要调整带宽策略
    var requiresBandwidthAdjustment: Bool {
        return networkTypeChanged || networkQualityChanged
    }
}

/// 传输状态变化事件
struct TransferStatusChange: Codable, Hashable {
    let timestamp: Date
    let transferId: UUID
    let transferType: TransferType
    let previousStatus: TransferStatus
    let currentStatus: TransferStatus
    let allocatedBandwidth: Int64?

    init(
        timestamp: Date = Date(),
        transferId: UUID,
        transferType: TransferType,
        previousStatus: TransferStatus,
        currentStatus: TransferStatus,
        allocatedBandwidth: Int64? = nil
    ) {
        self.timestamp = timestamp
        self.transferId = transferId
        self.transferType = transferType
        self.previousStatus = previousStatus
        self.currentStatus = currentStatus
        self.allocatedBandwidth = allocatedBandwidth
    }
}

/// 传输状态
enum TransferStatus: String, Codable, CaseIterable {
    case pending = "pending"
    case active = "active"
    case paused = "paused"
    case completed = "completed"
    case failed = "failed"
    case cancelled = "cancelled"

    var displayName: String {
        switch self {
        case .pending:
            return "Pending"
        case .active:
            return "Active"
        case .paused:
            return "Paused"
        case .completed:
            return "Completed"
        case .failed:
            return "Failed"
        case .cancelled:
            return "Cancelled"
        }
    }

    /// 是否为活跃状态
    var isActive: Bool {
        return self == .active
    }

    /// 是否为终止状态
    var isTerminal: Bool {
        return [.completed, .failed, .cancelled].contains(self)
    }
}
