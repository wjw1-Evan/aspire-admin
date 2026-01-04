import Foundation
import OSLog

/// 选择性同步服务实现
@MainActor
class SelectiveSync: ObservableObject, SelectiveSyncProtocol {
    private let logger = Logger(subsystem: "com.syncapp.macos", category: "SelectiveSync")
    
    // MARK: - Dependencies
    private let cloudAPIService: CloudAPIServiceProtocol
    private let localDBService: LocalDBService
    private let syncEngine: SyncEngineProtocol
    
    // MARK: - State
    @Published private var folderTree: FolderNode?
    @Published private var selectedFolders: Set<String> = []
    
    // MARK: - Event Streams
    private let selectionChangesContinuation: AsyncStream<SelectionChange>.Continuation
    let selectionChanges: AsyncStream<SelectionChange>
    
    // MARK: - Initialization
    
    init(
        cloudAPIService: CloudAPIServiceProtocol,
        localDBService: LocalDBService,
        syncEngine: SyncEngineProtocol
    ) {
        self.cloudAPIService = cloudAPIService
        self.localDBService = localDBService
        self.syncEngine = syncEngine
        
        // 初始化事件流
        (self.selectionChanges, self.selectionChangesContinuation) = AsyncStream<SelectionChange>.makeStream()
        
        // 加载保存的选择状态
        Task {
            await loadSelectedFolders()
        }
    }
    
    deinit {
        selectionChangesContinuation.finish()
    }
    
    // MARK: - SelectiveSyncProtocol Implementation
    
    func getFolderTree() async throws -> FolderNode {
        logger.info("获取文件夹树结构")
        
        do {
            // 从云端获取文件夹结构
            let cloudFolders = try await cloudAPIService.listFolder(at: "/")
            
            // 构建文件夹树
            let tree = try await buildFolderTree(from: cloudFolders, parentPath: nil)
            
            // 更新本地缓存
            self.folderTree = tree
            
            logger.info("成功获取文件夹树，包含 \(tree.children.count) 个根文件夹")
            return tree
            
        } catch {
            logger.error("获取文件夹树失败: \(error.localizedDescription)")
            throw error
        }
    }
    
    func selectFolder(_ path: String, selected: Bool) async throws {
        logger.info("设置文件夹选择状态: \(path) -> \(selected)")
        
        // 更新选择状态
        if selected {
            selectedFolders.insert(path)
        } else {
            selectedFolders.remove(path)
        }
        
        // 更新文件夹树中的选择状态
        if var tree = folderTree {
            updateNodeSelection(in: &tree, path: path, selected: selected)
            folderTree = tree
        }
        
        // 保存选择状态
        try await saveSelectedFolders()
        
        // 发送变化事件
        let change = SelectionChange(
            path: path,
            isSelected: selected,
            affectedSize: try await estimateDownloadSize(for: [path])
        )
        selectionChangesContinuation.yield(change)
        
        logger.info("文件夹选择状态已更新: \(path)")
    }
    
    func getSelectedFolders() -> Set<String> {
        return selectedFolders
    }
    
    func applySelectionChanges() async throws {
        logger.info("应用选择性同步设置变化")
        
        guard let tree = folderTree else {
            throw SyncError.invalidConfiguration
        }
        
        // 获取当前选中的路径
        let currentSelected = tree.getSelectedPaths()
        let previousSelected = try await loadPreviousSelectedFolders()
        
        // 计算需要下载的新文件夹
        let toDownload = currentSelected.subtracting(previousSelected)
        
        // 计算需要删除的文件夹
        let toRemove = previousSelected.subtracting(currentSelected)
        
        logger.info("需要下载 \(toDownload.count) 个文件夹，删除 \(toRemove.count) 个文件夹")
        
        // 删除取消选中的文件夹
        for path in toRemove {
            try await removeLocalFolder(path)
        }
        
        // 下载新选中的文件夹
        for path in toDownload {
            try await downloadFolder(path)
        }
        
        // 保存当前选择状态
        try await savePreviousSelectedFolders(currentSelected)
        
        logger.info("选择性同步设置变化应用完成")
    }
    
    func estimateDownloadSize(for paths: [String]) async throws -> Int64 {
        var totalSize: Int64 = 0
        
        for path in paths {
            totalSize += await calculateFolderSize(path)
        }
        
        return totalSize
    }
    
    // MARK: - 批量操作
    
    func selectFolders(_ paths: [String]) async throws {
        logger.info("批量选择 \(paths.count) 个文件夹")
        
        for path in paths {
            try await selectFolder(path, selected: true)
        }
    }
    
    func deselectFolders(_ paths: [String]) async throws {
        logger.info("批量取消选择 \(paths.count) 个文件夹")
        
        for path in paths {
            try await selectFolder(path, selected: false)
        }
    }
    
    func selectAllFolders() async throws {
        logger.info("选择所有文件夹")
        
        guard let tree = folderTree else {
            throw SyncError.invalidConfiguration
        }
        
        let allPaths = getAllFolderPaths(from: tree)
        try await selectFolders(Array(allPaths))
    }
    
    func deselectAllFolders() async throws {
        logger.info("取消选择所有文件夹")
        
        let allPaths = Array(selectedFolders)
        try await deselectFolders(allPaths)
    }
    
    // MARK: - 层级关系管理
    
    func updateChildrenSelection(parentPath: String, selected: Bool, recursive: Bool) async throws {
        logger.info("更新子文件夹选择状态: \(parentPath) -> \(selected), recursive: \(recursive)")
        
        guard let tree = folderTree else {
            throw SyncError.invalidConfiguration
        }
        
        // 查找父节点
        guard let parentNode = tree.findNode(at: parentPath) else {
            throw SyncError.fileNotFound(parentPath)
        }
        
        // 更新子节点选择状态
        let childPaths = getChildPaths(from: parentNode, recursive: recursive)
        
        for childPath in childPaths {
            try await selectFolder(childPath, selected: selected)
        }
    }
    
    func updateParentSelection(childPath: String) async throws {
        logger.info("根据子文件夹状态更新父文件夹: \(childPath)")
        
        guard let tree = folderTree else {
            throw SyncError.invalidConfiguration
        }
        
        // 查找子节点
        guard let childNode = tree.findNode(at: childPath) else {
            throw SyncError.fileNotFound(childPath)
        }
        
        // 查找父节点路径
        guard let parentPath = childNode.parentPath else {
            return // 根节点没有父节点
        }
        
        // 查找父节点
        guard let parentNode = tree.findNode(at: parentPath) else {
            return
        }
        
        // 检查所有兄弟节点的选择状态
        let siblingNodes = parentNode.children
        let selectedSiblings = siblingNodes.filter { selectedFolders.contains($0.path) }
        
        // 根据子节点状态决定父节点状态
        let shouldSelectParent = selectedSiblings.count == siblingNodes.count
        
        if shouldSelectParent != selectedFolders.contains(parentPath) {
            try await selectFolder(parentPath, selected: shouldSelectParent)
        }
        
        // 递归更新上级父节点
        if parentNode.parentPath != nil {
            try await updateParentSelection(childPath: parentPath)
        }
    }
    
    // MARK: - 状态查询
    
    func isSelected(_ path: String) -> Bool {
        return selectedFolders.contains(path)
    }
    
    func getSelectedSize() -> Int64 {
        guard let tree = folderTree else { return 0 }
        
        var totalSize: Int64 = 0
        for path in selectedFolders {
            if let node = tree.findNode(at: path) {
                totalSize += node.totalSize
            }
        }
        
        return totalSize
    }
    
    func getSelectedCount() -> Int {
        return selectedFolders.count
    }
    
    // MARK: - Private Helper Methods
    
    private func buildFolderTree(from cloudItems: [CloudItem], parentPath: String?) async throws -> FolderNode {
        let folders = cloudItems.compactMap { item -> CloudFolder? in
            if case .folder(let folder) = item {
                return folder
            }
            return nil
        }
        
        var children: [FolderNode] = []
        
        for folder in folders {
            let isSelected = selectedFolders.contains(folder.path)
            let size = await calculateFolderSize(folder.path)
            
            // 递归获取子文件夹
            let subItems = try await cloudAPIService.listFolder(at: folder.path)
            let subChildren = try await buildFolderTree(from: subItems, parentPath: folder.path)
            
            let node = FolderNode(
                path: folder.path,
                name: folder.name,
                isSelected: isSelected,
                size: size,
                children: subChildren.children,
                parentPath: parentPath
            )
            
            children.append(node)
        }
        
        // 创建根节点或返回子节点集合
        if let parentPath = parentPath {
            return FolderNode(
                path: parentPath,
                name: URL(fileURLWithPath: parentPath).lastPathComponent,
                isSelected: selectedFolders.contains(parentPath),
                size: 0,
                children: children,
                parentPath: nil
            )
        } else {
            return FolderNode(
                path: "/",
                name: "Root",
                isSelected: false,
                size: 0,
                children: children,
                parentPath: nil
            )
        }
    }
    
    private func updateNodeSelection(in tree: inout FolderNode, path: String, selected: Bool) {
        if tree.path == path {
            tree.updateSelection(selected, recursive: false)
            return
        }
        
        for i in tree.children.indices {
            updateNodeSelection(in: &tree.children[i], path: path, selected: selected)
        }
    }
    
    private func getAllFolderPaths(from node: FolderNode) -> Set<String> {
        var paths = Set<String>()
        paths.insert(node.path)
        
        for child in node.children {
            paths.formUnion(getAllFolderPaths(from: child))
        }
        
        return paths
    }
    
    private func getChildPaths(from node: FolderNode, recursive: Bool) -> [String] {
        var paths: [String] = []
        
        for child in node.children {
            paths.append(child.path)
            
            if recursive {
                paths.append(contentsOf: getChildPaths(from: child, recursive: true))
            }
        }
        
        return paths
    }
    
    private func calculateFolderSize(_ path: String) async -> Int64 {
        do {
            let items = try await cloudAPIService.listFolder(at: path)
            var totalSize: Int64 = 0
            
            for item in items {
                switch item {
                case .file(let file):
                    totalSize += file.size
                case .folder(let folder):
                    totalSize += await calculateFolderSize(folder.path)
                }
            }
            
            return totalSize
        } catch {
            logger.warning("计算文件夹大小失败: \(path) - \(error.localizedDescription)")
            return 0
        }
    }
    
    private func removeLocalFolder(_ path: String) async throws {
        logger.info("删除本地文件夹: \(path)")
        
        // 通过同步引擎删除本地文件夹
        try await syncEngine.deleteItem(at: path)
        
        // 从数据库中删除相关记录 - 需要通过路径查找ID
        // 这里简化处理，实际应该先查找对应的SyncItem ID
        // try await localDBService.deleteSyncItem(by: itemId)
    }
    
    private func downloadFolder(_ path: String) async throws {
        logger.info("下载文件夹: \(path)")
        
        // 通过同步引擎下载文件夹
        try await syncEngine.syncFolder(at: path, recursive: true)
    }
    
    // MARK: - Persistence
    
    private func loadSelectedFolders() async {
        do {
            let config = try localDBService.loadSyncConfiguration()
            self.selectedFolders = config.selectedFolders
            logger.info("加载了 \(self.selectedFolders.count) 个选中的文件夹")
        } catch {
            logger.warning("加载选中文件夹失败: \(error.localizedDescription)")
            self.selectedFolders = []
        }
    }
    
    private func saveSelectedFolders() async throws {
        var config = try localDBService.loadSyncConfiguration()
        config.selectedFolders = selectedFolders
        try localDBService.saveSyncConfiguration(config)
        logger.info("保存了 \(self.selectedFolders.count) 个选中的文件夹")
    }
    
    private func loadPreviousSelectedFolders() async throws -> Set<String> {
        return try await localDBService.getPreviousSelectedFolders()
    }
    
    private func savePreviousSelectedFolders(_ folders: Set<String>) async throws {
        try await localDBService.savePreviousSelectedFolders(folders)
    }
}