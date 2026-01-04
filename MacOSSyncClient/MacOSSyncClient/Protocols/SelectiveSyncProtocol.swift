import Foundation

/// 选择性同步协议，定义文件夹选择和管理功能
@MainActor
protocol SelectiveSyncProtocol {
    // MARK: - 文件夹树管理
    
    /// 获取云端文件夹树结构
    /// - Returns: 根文件夹节点，包含完整的层级结构
    func getFolderTree() async throws -> FolderNode
    
    /// 选择或取消选择指定文件夹
    /// - Parameters:
    ///   - path: 文件夹路径
    ///   - selected: 是否选择该文件夹
    func selectFolder(_ path: String, selected: Bool) async throws
    
    /// 获取当前选中的文件夹路径集合
    /// - Returns: 选中的文件夹路径集合
    func getSelectedFolders() -> Set<String>
    
    /// 应用选择性同步设置变化
    /// 根据当前选择状态，下载新选中的文件夹，删除取消选中的文件夹
    func applySelectionChanges() async throws
    
    /// 估算指定路径的下载大小
    /// - Parameter paths: 文件夹路径数组
    /// - Returns: 总下载大小（字节）
    func estimateDownloadSize(for paths: [String]) async throws -> Int64
    
    // MARK: - 批量操作
    
    /// 批量选择多个文件夹
    /// - Parameter paths: 文件夹路径数组
    func selectFolders(_ paths: [String]) async throws
    
    /// 批量取消选择多个文件夹
    /// - Parameter paths: 文件夹路径数组
    func deselectFolders(_ paths: [String]) async throws
    
    /// 选择所有文件夹
    func selectAllFolders() async throws
    
    /// 取消选择所有文件夹
    func deselectAllFolders() async throws
    
    // MARK: - 层级关系管理
    
    /// 根据父文件夹选择状态更新子文件夹
    /// - Parameters:
    ///   - parentPath: 父文件夹路径
    ///   - selected: 选择状态
    ///   - recursive: 是否递归应用到所有子文件夹
    func updateChildrenSelection(parentPath: String, selected: Bool, recursive: Bool) async throws
    
    /// 根据子文件夹选择状态更新父文件夹
    /// - Parameter childPath: 子文件夹路径
    func updateParentSelection(childPath: String) async throws
    
    // MARK: - 状态查询
    
    /// 检查指定路径是否被选中
    /// - Parameter path: 文件夹路径
    /// - Returns: 是否被选中
    func isSelected(_ path: String) -> Bool
    
    /// 获取选中文件夹的总大小
    /// - Returns: 总大小（字节）
    func getSelectedSize() -> Int64
    
    /// 获取选中文件夹的数量
    /// - Returns: 选中的文件夹数量
    func getSelectedCount() -> Int
    
    // MARK: - 事件监听
    
    /// 选择性同步变化事件流
    var selectionChanges: AsyncStream<SelectionChange> { get }
}