import Foundation

/// 文件夹节点，用于选择性同步的树形结构
struct FolderNode: Codable, Hashable, Identifiable {
    let id: UUID
    let path: String
    let name: String
    var isSelected: Bool
    let size: Int64
    var children: [FolderNode]
    let parentPath: String?
    
    init(
        id: UUID = UUID(),
        path: String,
        name: String,
        isSelected: Bool = true,
        size: Int64 = 0,
        children: [FolderNode] = [],
        parentPath: String? = nil
    ) {
        self.id = id
        self.path = path
        self.name = name
        self.isSelected = isSelected
        self.size = size
        self.children = children
        self.parentPath = parentPath
    }
    
    /// 是否为根节点
    var isRoot: Bool {
        return parentPath == nil
    }
    
    /// 是否有子节点
    var hasChildren: Bool {
        return !children.isEmpty
    }
    
    /// 获取所有子节点的总大小
    var totalSize: Int64 {
        return size + children.reduce(0) { $0 + $1.totalSize }
    }
    
    /// 获取选中的子节点数量
    var selectedChildrenCount: Int {
        return children.filter { $0.isSelected }.count
    }
    
    /// 获取所有选中的路径（包括子节点）
    func getSelectedPaths() -> Set<String> {
        var paths = Set<String>()
        if isSelected {
            paths.insert(path)
        }
        for child in children {
            paths.formUnion(child.getSelectedPaths())
        }
        return paths
    }
    
    /// 递归更新选择状态
    mutating func updateSelection(_ selected: Bool, recursive: Bool = true) {
        isSelected = selected
        if recursive {
            for i in children.indices {
                children[i].updateSelection(selected, recursive: true)
            }
        }
    }
    
    /// 根据子节点状态更新父节点选择状态
    mutating func updateParentSelection() {
        if children.isEmpty {
            return
        }
        
        let selectedCount = children.filter { $0.isSelected }.count
        if selectedCount == children.count {
            isSelected = true
        } else if selectedCount == 0 {
            isSelected = false
        } else {
            // 部分选中状态，保持当前状态或设为选中
            isSelected = true
        }
    }
    
    /// 查找指定路径的节点
    func findNode(at path: String) -> FolderNode? {
        if self.path == path {
            return self
        }
        
        for child in children {
            if let found = child.findNode(at: path) {
                return found
            }
        }
        
        return nil
    }
    
    /// 格式化大小显示
    var formattedSize: String {
        return ByteCountFormatter.string(fromByteCount: totalSize, countStyle: .file)
    }
}

/// 选择性同步变化事件
struct SelectionChange: Codable, Hashable {
    let path: String
    let isSelected: Bool
    let affectedSize: Int64
    let timestamp: Date
    
    init(path: String, isSelected: Bool, affectedSize: Int64, timestamp: Date = Date()) {
        self.path = path
        self.isSelected = isSelected
        self.affectedSize = affectedSize
        self.timestamp = timestamp
    }
    
    /// 变化类型描述
    var changeDescription: String {
        let action = isSelected ? "Selected" : "Deselected"
        let sizeStr = ByteCountFormatter.string(fromByteCount: affectedSize, countStyle: .file)
        return "\(action) \(URL(fileURLWithPath: path).lastPathComponent) (\(sizeStr))"
    }
}