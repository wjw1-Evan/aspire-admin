import Foundation
import SwiftUI

/// 状态管理器协议，负责管理文件和文件夹的同步状态显示
@MainActor
protocol StatusManagerProtocol: ObservableObject {
    // MARK: - 状态查询
    
    /// 获取指定路径项目的状态信息
    func getStatusInfo(for path: String) -> StatusInfo?
    
    /// 获取指定项目的状态信息
    func getStatusInfo(for item: SyncItem) -> StatusInfo
    
    /// 获取所有项目的状态统计
    func getStatusStatistics() -> StatusStatistics
    
    // MARK: - 状态更新
    
    /// 更新项目状态
    func updateStatus(for path: String, state: SyncItem.SyncState, progress: Double?)
    
    /// 批量更新项目状态
    func updateStatus(for items: [SyncItem])
    
    /// 清除指定路径的状态信息
    func clearStatus(for path: String)
    
    /// 清除所有状态信息
    func clearAllStatus()
    
    // MARK: - 事件监听
    
    /// 状态变化流
    var statusChanges: AsyncStream<StatusChange> { get }
    
    /// 统计信息变化流
    var statisticsChanges: AsyncStream<StatusStatistics> { get }
}