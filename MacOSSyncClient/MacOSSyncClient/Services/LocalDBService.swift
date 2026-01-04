import Foundation
import SQLite3

/// 本地数据库服务，使用 SQLite 存储同步状态和元数据
class LocalDBService {
    private var db: OpaquePointer?
    private let dbPath: String
    // SQLite 需要在绑定文本时复制字符串数据，使用 SQLITE_TRANSIENT 确保生命周期安全
    private let sqliteTransient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
    private var lastSavedConfiguration: SyncConfiguration?

    /// 初始化数据库服务
    /// - Parameter dbPath: 数据库文件路径，如果为nil则使用默认路径
    init(dbPath: String? = nil) {
        if let customPath = dbPath {
            self.dbPath = customPath
        } else {
            // 使用应用支持目录作为默认路径
            let appSupportDir = FileManager.default.urls(
                for: .applicationSupportDirectory,
                in: .userDomainMask
            ).first!
            let appDir = appSupportDir.appendingPathComponent("MacOSSyncClient")

            // 确保目录存在
            try? FileManager.default.createDirectory(
                at: appDir,
                withIntermediateDirectories: true,
                attributes: nil)

            self.dbPath = appDir.appendingPathComponent("sync.db").path
        }
    }

    deinit {
        closeDatabase()
    }

    // MARK: - 数据库连接管理

    /// 打开数据库连接
    func openDatabase() throws {
        let result = sqlite3_open(dbPath, &db)

        guard result == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            sqlite3_close(db)
            db = nil
            throw DatabaseError.connectionFailed(errorMessage)
        }

        // 启用外键约束
        try executeSQL("PRAGMA foreign_keys = ON")

        // 创建表结构
        try createTables()
    }

    /// 关闭数据库连接
    func closeDatabase() {
        if db != nil {
            sqlite3_close(db)
            db = nil
        }
    }

    /// 检查数据库是否已连接
    var isConnected: Bool {
        return db != nil
    }

    // MARK: - 表结构创建

    private func createTables() throws {
        // 同步项目表
        let createSyncItemsTable = """
                CREATE TABLE IF NOT EXISTS sync_items (
                    id TEXT PRIMARY KEY,
                    cloud_id TEXT NOT NULL,
                    local_path TEXT NOT NULL,
                    cloud_path TEXT NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
                    size INTEGER NOT NULL DEFAULT 0,
                    modified_date INTEGER NOT NULL,
                    sync_state TEXT NOT NULL CHECK (sync_state IN ('synced', 'uploading', 'downloading', 'localOnly', 'cloudOnly', 'conflict', 'error', 'paused')),
                    hash TEXT,
                    parent_id TEXT,
                    is_selected BOOLEAN NOT NULL DEFAULT 1,
                    is_offline_available BOOLEAN NOT NULL DEFAULT 0,
                    last_sync_date INTEGER,
                    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                    FOREIGN KEY (parent_id) REFERENCES sync_items(id)
                )
            """

        // 冲突信息表
        let createConflictInfoTable = """
                CREATE TABLE IF NOT EXISTS conflict_info (
                    id TEXT PRIMARY KEY,
                    sync_item_id TEXT NOT NULL,
                    conflict_type TEXT NOT NULL CHECK (conflict_type IN ('contentConflict', 'nameConflict', 'typeConflict')),
                    local_modified_date INTEGER NOT NULL,
                    cloud_modified_date INTEGER NOT NULL,
                    local_size INTEGER NOT NULL,
                    cloud_size INTEGER NOT NULL,
                    resolution_options TEXT NOT NULL,
                    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                    FOREIGN KEY (sync_item_id) REFERENCES sync_items(id) ON DELETE CASCADE
                )
            """

        // 同步配置表
        let createSyncConfigurationTable = """
                CREATE TABLE IF NOT EXISTS sync_configuration (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    sync_root_path TEXT NOT NULL,
                    selected_folders TEXT NOT NULL,
                    exclude_patterns TEXT NOT NULL,
                    bandwidth_limits TEXT NOT NULL,
                    conflict_resolution TEXT NOT NULL,
                    offline_settings TEXT NOT NULL,
                    security_settings TEXT NOT NULL,
                    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
                )
            """

        // 同步活动日志表
        let createSyncActivitiesTable = """
                CREATE TABLE IF NOT EXISTS sync_activities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sync_item_id TEXT,
                    activity_type TEXT NOT NULL CHECK (activity_type IN ('upload', 'download', 'delete', 'conflict', 'error')),
                    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
                    message TEXT,
                    bytes_transferred INTEGER DEFAULT 0,
                    total_bytes INTEGER DEFAULT 0,
                    error_code TEXT,
                    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                    completed_at INTEGER,
                    FOREIGN KEY (sync_item_id) REFERENCES sync_items(id)
                )
            """

        // 离线缓存表
        let createOfflineCacheTable = """
                CREATE TABLE IF NOT EXISTS offline_cache (
                    id TEXT PRIMARY KEY,
                    sync_item_id TEXT NOT NULL,
                    cache_path TEXT NOT NULL,
                    cache_size INTEGER NOT NULL,
                    last_accessed INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                    FOREIGN KEY (sync_item_id) REFERENCES sync_items(id) ON DELETE CASCADE
                )
            """

        // 上次选中文件夹表
        let createPreviousSelectedFoldersTable = """
                CREATE TABLE IF NOT EXISTS previous_selected_folders (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    folder_paths TEXT NOT NULL DEFAULT '',
                    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
                )
            """

        // 执行表创建
        try executeSQL(createSyncItemsTable)
        try executeSQL(createConflictInfoTable)
        try executeSQL(createSyncConfigurationTable)
        try executeSQL(createSyncActivitiesTable)
        try executeSQL(createOfflineCacheTable)
        try executeSQL(createPreviousSelectedFoldersTable)

        // 创建索引
        try createIndexes()
    }

    private func createIndexes() throws {
        let indexes = [
            "CREATE INDEX IF NOT EXISTS idx_sync_items_local_path ON sync_items(local_path)",
            "CREATE INDEX IF NOT EXISTS idx_sync_items_cloud_path ON sync_items(cloud_path)",
            "CREATE INDEX IF NOT EXISTS idx_sync_items_parent_id ON sync_items(parent_id)",
            "CREATE INDEX IF NOT EXISTS idx_sync_items_sync_state ON sync_items(sync_state)",
            "CREATE INDEX IF NOT EXISTS idx_sync_activities_created_at ON sync_activities(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_offline_cache_last_accessed ON offline_cache(last_accessed)",
        ]

        for indexSQL in indexes {
            try executeSQL(indexSQL)
        }
    }

    // MARK: - SQL 执行

    /// 执行 SQL 语句
    /// - Parameter sql: SQL 语句
    private func executeSQL(_ sql: String) throws {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let result = sqlite3_exec(db, sql, nil, nil, nil)

        guard result == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.executionFailed(errorMessage)
        }
    }

    /// 安全绑定文本到 SQLite 语句（自动处理 nil）
    private func bindText(_ statement: OpaquePointer?, index: Int32, value: String?) {
        if let value = value {
            sqlite3_bind_text(statement, index, value, -1, sqliteTransient)
        } else {
            sqlite3_bind_null(statement, index)
        }
    }

    // MARK: - SyncItem CRUD 操作

    /// 插入同步项目
    /// - Parameter item: 要插入的同步项目
    func insertSyncItem(_ item: SyncItem) throws {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                INSERT INTO sync_items (
                    id, cloud_id, local_path, cloud_path, name, type, size,
                    modified_date, sync_state, hash, parent_id, is_selected,
                    is_offline_available, last_sync_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        // 绑定参数
        let parentIdToUse: UUID? = {
            guard let parentId = item.parentId else { return nil }
            // 如果父节点不存在，避免外键约束失败，置空父节点
            return (try? getSyncItem(by: parentId)) != nil ? parentId : nil
        }()

        bindText(statement, index: 1, value: item.id.uuidString)
        bindText(statement, index: 2, value: item.cloudId)
        bindText(statement, index: 3, value: item.localPath)
        bindText(statement, index: 4, value: item.cloudPath)
        bindText(statement, index: 5, value: item.name)
        bindText(statement, index: 6, value: item.type.rawValue)
        sqlite3_bind_int64(statement, 7, item.size)
        sqlite3_bind_int64(statement, 8, Int64(item.modifiedDate.timeIntervalSince1970))
        bindText(statement, index: 9, value: item.syncState.rawValue)
        bindText(statement, index: 10, value: item.hash)

        if let parentId = parentIdToUse {
            bindText(statement, index: 11, value: parentId.uuidString)
        } else {
            sqlite3_bind_null(statement, 11)
        }

        sqlite3_bind_int(statement, 12, item.isSelected ? 1 : 0)
        sqlite3_bind_int(statement, 13, item.isOfflineAvailable ? 1 : 0)

        if let lastSyncDate = item.lastSyncDate {
            sqlite3_bind_int64(statement, 14, Int64(lastSyncDate.timeIntervalSince1970))
        } else {
            sqlite3_bind_null(statement, 14)
        }

        guard sqlite3_step(statement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.executionFailed(errorMessage)
        }
    }

    /// 更新同步项目
    /// - Parameter item: 要更新的同步项目
    func updateSyncItem(_ item: SyncItem) throws {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                UPDATE sync_items SET
                    cloud_id = ?, local_path = ?, cloud_path = ?, name = ?, type = ?,
                    size = ?, modified_date = ?, sync_state = ?, hash = ?, parent_id = ?,
                    is_selected = ?, is_offline_available = ?, last_sync_date = ?,
                    updated_at = strftime('%s', 'now')
                WHERE id = ?
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        // 绑定参数
        let parentIdToUse: UUID? = {
            guard let parentId = item.parentId else { return nil }
            // 如果父节点不存在，避免外键约束失败，置空父节点
            return (try? getSyncItem(by: parentId)) != nil ? parentId : nil
        }()

        bindText(statement, index: 1, value: item.cloudId)
        bindText(statement, index: 2, value: item.localPath)
        bindText(statement, index: 3, value: item.cloudPath)
        bindText(statement, index: 4, value: item.name)
        bindText(statement, index: 5, value: item.type.rawValue)
        sqlite3_bind_int64(statement, 6, item.size)
        sqlite3_bind_int64(statement, 7, Int64(item.modifiedDate.timeIntervalSince1970))
        bindText(statement, index: 8, value: item.syncState.rawValue)
        bindText(statement, index: 9, value: item.hash)

        if let parentId = parentIdToUse {
            bindText(statement, index: 10, value: parentId.uuidString)
        } else {
            sqlite3_bind_null(statement, 10)
        }

        sqlite3_bind_int(statement, 11, item.isSelected ? 1 : 0)
        sqlite3_bind_int(statement, 12, item.isOfflineAvailable ? 1 : 0)

        if let lastSyncDate = item.lastSyncDate {
            sqlite3_bind_int64(statement, 13, Int64(lastSyncDate.timeIntervalSince1970))
        } else {
            sqlite3_bind_null(statement, 13)
        }

        bindText(statement, index: 14, value: item.id.uuidString)

        guard sqlite3_step(statement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.executionFailed(errorMessage)
        }
    }

    /// 保存同步项目（插入或更新）
    /// - Parameter item: 要保存的同步项目
    func saveSyncItem(_ item: SyncItem) throws {
        // 检查项目是否已存在
        if (try? getSyncItem(by: item.id)) != nil {
            // 项目已存在，执行更新
            try updateSyncItem(item)
        } else {
            // 项目不存在，执行插入
            try insertSyncItem(item)
        }
    }

    /// 删除同步项目
    /// - Parameter id: 要删除的项目ID
    func deleteSyncItem(by id: UUID) throws {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = "DELETE FROM sync_items WHERE id = ?"

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        bindText(statement, index: 1, value: id.uuidString)

        guard sqlite3_step(statement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.executionFailed(errorMessage)
        }
    }

    /// 根据ID查询同步项目
    /// - Parameter id: 项目ID
    /// - Returns: 同步项目，如果不存在则返回nil
    func getSyncItem(by id: UUID) throws -> SyncItem? {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                SELECT id, cloud_id, local_path, cloud_path, name, type, size,
                       modified_date, sync_state, hash, parent_id, is_selected,
                       is_offline_available, last_sync_date
                FROM sync_items
                WHERE id = ?
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        bindText(statement, index: 1, value: id.uuidString)

        guard sqlite3_step(statement) == SQLITE_ROW else {
            return nil
        }

        return try parseSyncItemFromStatement(statement)
    }

    /// 根据本地路径查询同步项目
    /// - Parameter localPath: 本地路径
    /// - Returns: 同步项目，如果不存在则返回nil
    func getSyncItem(byLocalPath localPath: String) throws -> SyncItem? {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                SELECT id, cloud_id, local_path, cloud_path, name, type, size,
                       modified_date, sync_state, hash, parent_id, is_selected,
                       is_offline_available, last_sync_date
                FROM sync_items
                WHERE local_path = ?
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        bindText(statement, index: 1, value: localPath)

        guard sqlite3_step(statement) == SQLITE_ROW else {
            return nil
        }

        return try parseSyncItemFromStatement(statement)
    }

    /// 根据云端路径查询同步项目
    /// - Parameter cloudPath: 云端路径
    /// - Returns: 同步项目，如果不存在则返回nil
    func getSyncItem(byCloudPath cloudPath: String) throws -> SyncItem? {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                SELECT id, cloud_id, local_path, cloud_path, name, type, size,
                       modified_date, sync_state, hash, parent_id, is_selected,
                       is_offline_available, last_sync_date
                FROM sync_items
                WHERE cloud_path = ?
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        bindText(statement, index: 1, value: cloudPath)

        guard sqlite3_step(statement) == SQLITE_ROW else {
            return nil
        }

        return try parseSyncItemFromStatement(statement)
    }

    /// 获取所有同步项目
    /// - Returns: 同步项目数组
    func getAllSyncItems() throws -> [SyncItem] {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                SELECT id, cloud_id, local_path, cloud_path, name, type, size,
                       modified_date, sync_state, hash, parent_id, is_selected,
                       is_offline_available, last_sync_date
                FROM sync_items
                ORDER BY name
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        var items: [SyncItem] = []

        while sqlite3_step(statement) == SQLITE_ROW {
            let item = try parseSyncItemFromStatement(statement)
            items.append(item)
        }

        return items
    }

    /// 根据同步状态查询项目
    /// - Parameter syncState: 同步状态
    /// - Returns: 匹配的同步项目数组
    func getSyncItems(bySyncState syncState: SyncItem.SyncState) throws -> [SyncItem] {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                SELECT id, cloud_id, local_path, cloud_path, name, type, size,
                       modified_date, sync_state, hash, parent_id, is_selected,
                       is_offline_available, last_sync_date
                FROM sync_items
                WHERE sync_state = ?
                ORDER BY name
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        bindText(statement, index: 1, value: syncState.rawValue)

        var items: [SyncItem] = []

        while sqlite3_step(statement) == SQLITE_ROW {
            let item = try parseSyncItemFromStatement(statement)
            items.append(item)
        }

        return items
    }

    /// 获取子项目
    /// - Parameter parentId: 父项目ID
    /// - Returns: 子项目数组
    func getChildItems(of parentId: UUID) throws -> [SyncItem] {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                SELECT id, cloud_id, local_path, cloud_path, name, type, size,
                       modified_date, sync_state, hash, parent_id, is_selected,
                       is_offline_available, last_sync_date
                FROM sync_items
                WHERE parent_id = ?
                ORDER BY type DESC, name
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        bindText(statement, index: 1, value: parentId.uuidString)

        var items: [SyncItem] = []

        while sqlite3_step(statement) == SQLITE_ROW {
            let item = try parseSyncItemFromStatement(statement)
            items.append(item)
        }

        return items
    }

    /// 更新项目的同步状态
    /// - Parameters:
    ///   - id: 项目ID
    ///   - syncState: 新的同步状态
    func updateSyncState(for id: UUID, to syncState: SyncItem.SyncState) throws {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                UPDATE sync_items
                SET sync_state = ?, updated_at = strftime('%s', 'now')
                WHERE id = ?
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        bindText(statement, index: 1, value: syncState.rawValue)
        bindText(statement, index: 2, value: id.uuidString)

        guard sqlite3_step(statement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.executionFailed(errorMessage)
        }
    }

    /// 从 SQLite 语句中解析 SyncItem
    private func parseSyncItemFromStatement(_ statement: OpaquePointer?) throws -> SyncItem {
        guard let statement = statement else {
            throw DatabaseError.parsingFailed("Statement is nil")
        }

        let idString = String(cString: sqlite3_column_text(statement, 0))
        let cloudId = String(cString: sqlite3_column_text(statement, 1))
        let localPath = String(cString: sqlite3_column_text(statement, 2))
        let cloudPath = String(cString: sqlite3_column_text(statement, 3))
        let name = String(cString: sqlite3_column_text(statement, 4))
        let typeString = String(cString: sqlite3_column_text(statement, 5))
        let size = sqlite3_column_int64(statement, 6)
        let modifiedDateTimestamp = sqlite3_column_int64(statement, 7)
        let syncStateString = String(cString: sqlite3_column_text(statement, 8))
        let hash = String(cString: sqlite3_column_text(statement, 9))

        guard let id = UUID(uuidString: idString),
            let type = SyncItem.ItemType(rawValue: typeString),
            let syncState = SyncItem.SyncState(rawValue: syncStateString)
        else {
            throw DatabaseError.parsingFailed("Invalid data format")
        }

        let modifiedDate = Date(timeIntervalSince1970: TimeInterval(modifiedDateTimestamp))

        // 解析可选字段
        var parentId: UUID?
        if sqlite3_column_type(statement, 10) != SQLITE_NULL {
            let parentIdString = String(cString: sqlite3_column_text(statement, 10))
            parentId = UUID(uuidString: parentIdString)
        }

        let isSelected = sqlite3_column_int(statement, 11) != 0
        let isOfflineAvailable = sqlite3_column_int(statement, 12) != 0

        var lastSyncDate: Date?
        if sqlite3_column_type(statement, 13) != SQLITE_NULL {
            let lastSyncTimestamp = sqlite3_column_int64(statement, 13)
            lastSyncDate = Date(timeIntervalSince1970: TimeInterval(lastSyncTimestamp))
        }

        return SyncItem(
            id: id,
            cloudId: cloudId,
            localPath: localPath,
            cloudPath: cloudPath,
            name: name,
            type: type,
            size: size,
            modifiedDate: modifiedDate,
            syncState: syncState,
            hash: hash,
            parentId: parentId,
            isSelected: isSelected,
            isOfflineAvailable: isOfflineAvailable,
            lastSyncDate: lastSyncDate
        )
    }

    // MARK: - 配置管理

    /// 保存同步配置
    /// - Parameter configuration: 同步配置
    func saveSyncConfiguration(_ configuration: SyncConfiguration) throws {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        lastSavedConfiguration = configuration

        let encoder = JSONEncoder()

        let selectedFoldersData = try encoder.encode(Array(configuration.selectedFolders))
        let excludePatternsData = try encoder.encode(configuration.excludePatterns)
        let bandwidthLimitsData = try encoder.encode(configuration.bandwidthLimits)
        let offlineSettingsData = try encoder.encode(configuration.offlineSettings)
        let securitySettingsData = try encoder.encode(configuration.securitySettings)

        let selectedFoldersJson = String(data: selectedFoldersData, encoding: .utf8) ?? "[]"
        let excludePatternsJson = String(data: excludePatternsData, encoding: .utf8) ?? "[]"
        let bandwidthLimitsJson = String(data: bandwidthLimitsData, encoding: .utf8) ?? "{}"
        let offlineSettingsJson = String(data: offlineSettingsData, encoding: .utf8) ?? "{}"
        let securitySettingsJson = String(data: securitySettingsData, encoding: .utf8) ?? "{}"

        let sql = """
                INSERT OR REPLACE INTO sync_configuration (
                    id, sync_root_path, selected_folders, exclude_patterns,
                    bandwidth_limits, conflict_resolution, offline_settings, security_settings
                ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, configuration.syncRootPath, -1, nil)
        sqlite3_bind_text(statement, 2, selectedFoldersJson, -1, nil)
        sqlite3_bind_text(statement, 3, excludePatternsJson, -1, nil)
        sqlite3_bind_text(statement, 4, bandwidthLimitsJson, -1, nil)
        sqlite3_bind_text(statement, 5, configuration.conflictResolution.rawValue, -1, nil)
        sqlite3_bind_text(statement, 6, offlineSettingsJson, -1, nil)
        sqlite3_bind_text(statement, 7, securitySettingsJson, -1, nil)

        guard sqlite3_step(statement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.executionFailed(errorMessage)
        }
    }

    /// 加载同步配置
    /// - Returns: 同步配置，如果不存在则返回默认配置
    func loadSyncConfiguration() throws -> SyncConfiguration {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                SELECT sync_root_path, selected_folders, exclude_patterns,
                       bandwidth_limits, conflict_resolution, offline_settings, security_settings
                FROM sync_configuration
                WHERE id = 1
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        guard sqlite3_step(statement) == SQLITE_ROW else {
            // 如果没有配置，返回默认配置
            return SyncConfiguration()
        }

        let syncRootPath = String(cString: sqlite3_column_text(statement, 0))
        let selectedFoldersJson = String(cString: sqlite3_column_text(statement, 1))
        let excludePatternsJson = String(cString: sqlite3_column_text(statement, 2))
        let bandwidthLimitsJson = String(cString: sqlite3_column_text(statement, 3))
        let conflictResolutionString = String(cString: sqlite3_column_text(statement, 4))
        let offlineSettingsJson = String(cString: sqlite3_column_text(statement, 5))
        let securitySettingsJson = String(cString: sqlite3_column_text(statement, 6))

        let decoder = JSONDecoder()

        do {
            let selectedData = selectedFoldersJson.data(using: .utf8) ?? Data("[]".utf8)
            let excludeData = excludePatternsJson.data(using: .utf8) ?? Data("[]".utf8)
            let bandwidthData = bandwidthLimitsJson.data(using: .utf8) ?? Data("{}".utf8)
            let offlineData = offlineSettingsJson.data(using: .utf8) ?? Data("{}".utf8)
            let securityData = securitySettingsJson.data(using: .utf8) ?? Data("{}".utf8)

            let selectedFoldersArray = try decoder.decode(
                [String].self, from: selectedData.isEmpty ? Data("[]".utf8) : selectedData)
            let excludePatterns = try decoder.decode(
                [String].self, from: excludeData.isEmpty ? Data("[]".utf8) : excludeData)
            let bandwidthLimits = try decoder.decode(
                SyncConfiguration.BandwidthLimits.self,
                from: bandwidthData.isEmpty ? Data("{}".utf8) : bandwidthData)
            let offlineSettings = try decoder.decode(
                SyncConfiguration.OfflineSettings.self,
                from: offlineData.isEmpty ? Data("{}".utf8) : offlineData)
            let securitySettings = try decoder.decode(
                SyncConfiguration.SecuritySettings.self,
                from: securityData.isEmpty ? Data("{}".utf8) : securityData)

            guard
                let conflictResolution = SyncConfiguration.ConflictResolutionStrategy(
                    rawValue: conflictResolutionString)
            else {
                throw DatabaseError.parsingFailed("Invalid conflict resolution strategy")
            }

            return SyncConfiguration(
                syncRootPath: syncRootPath,
                selectedFolders: Set(selectedFoldersArray),
                excludePatterns: excludePatterns,
                bandwidthLimits: bandwidthLimits,
                conflictResolution: conflictResolution,
                offlineSettings: offlineSettings,
                securitySettings: securitySettings
            )
        } catch {
            if let last = lastSavedConfiguration {
                return last
            }
            throw DatabaseError.parsingFailed(
                "Failed to parse configuration: \(error.localizedDescription)")
        }
    }

    // MARK: - 冲突信息管理

    /// 保存冲突信息
    /// - Parameters:
    ///   - conflictInfo: 冲突信息
    ///   - syncItemId: 关联的同步项目ID
    func saveConflictInfo(_ conflictInfo: ConflictInfo, for syncItemId: UUID) throws {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let encoder = JSONEncoder()
        let resolutionOptionsData = try encoder.encode(conflictInfo.resolutionOptions)
        let resolutionOptionsJson = String(data: resolutionOptionsData, encoding: .utf8) ?? "[]"

        let sql = """
                INSERT OR REPLACE INTO conflict_info (
                    id, sync_item_id, conflict_type, local_modified_date, cloud_modified_date,
                    local_size, cloud_size, resolution_options
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        let conflictId = UUID().uuidString
        sqlite3_bind_text(statement, 1, conflictId, -1, nil)
        sqlite3_bind_text(statement, 2, syncItemId.uuidString, -1, nil)
        sqlite3_bind_text(statement, 3, conflictInfo.conflictType.rawValue, -1, nil)
        sqlite3_bind_int64(
            statement, 4, Int64(conflictInfo.localModifiedDate.timeIntervalSince1970))
        sqlite3_bind_int64(
            statement, 5, Int64(conflictInfo.cloudModifiedDate.timeIntervalSince1970))
        sqlite3_bind_int64(statement, 6, conflictInfo.localSize)
        sqlite3_bind_int64(statement, 7, conflictInfo.cloudSize)
        sqlite3_bind_text(statement, 8, resolutionOptionsJson, -1, nil)

        guard sqlite3_step(statement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.executionFailed(errorMessage)
        }
    }

    /// 删除冲突信息
    /// - Parameter syncItemId: 同步项目ID
    func deleteConflictInfo(for syncItemId: UUID) throws {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = "DELETE FROM conflict_info WHERE sync_item_id = ?"

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, syncItemId.uuidString, -1, nil)

        guard sqlite3_step(statement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.executionFailed(errorMessage)
        }
    }

    // MARK: - 离线缓存管理

    /// 添加离线缓存项目
    /// - Parameter cacheItem: 缓存项目
    func addOfflineCacheItem(_ cacheItem: OfflineCacheItem) throws {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                INSERT OR REPLACE INTO offline_cache (
                    id, sync_item_id, cache_path, cache_size, last_accessed
                ) VALUES (?, ?, ?, ?, ?)
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, cacheItem.id.uuidString, -1, nil)
        sqlite3_bind_text(statement, 2, cacheItem.syncItemId.uuidString, -1, nil)
        sqlite3_bind_text(statement, 3, cacheItem.cachePath, -1, nil)
        sqlite3_bind_int64(statement, 4, cacheItem.size)
        sqlite3_bind_int64(statement, 5, Int64(cacheItem.lastAccessedDate.timeIntervalSince1970))

        guard sqlite3_step(statement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.executionFailed(errorMessage)
        }
    }

    /// 删除离线缓存项目
    /// - Parameter id: 缓存项目ID
    func removeOfflineCacheItem(by id: UUID) throws {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = "DELETE FROM offline_cache WHERE id = ?"

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, id.uuidString, -1, nil)

        guard sqlite3_step(statement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.executionFailed(errorMessage)
        }
    }

    /// 获取所有离线缓存项目
    /// - Returns: 离线缓存项目数组
    func getAllOfflineCacheItems() throws -> [OfflineCacheItem] {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = """
                SELECT oc.id, oc.sync_item_id, si.local_path, oc.cache_path, oc.cache_size,
                       oc.last_accessed, oc.created_at
                FROM offline_cache oc
                JOIN sync_items si ON oc.sync_item_id = si.id
                ORDER BY oc.last_accessed DESC
            """

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        var items: [OfflineCacheItem] = []

        while sqlite3_step(statement) == SQLITE_ROW {
            let idString = String(cString: sqlite3_column_text(statement, 0))
            let syncItemIdString = String(cString: sqlite3_column_text(statement, 1))
            let localPath = String(cString: sqlite3_column_text(statement, 2))
            let cachePath = String(cString: sqlite3_column_text(statement, 3))
            let cacheSize = sqlite3_column_int64(statement, 4)
            let lastAccessedTimestamp = sqlite3_column_int64(statement, 5)
            let createdAtTimestamp = sqlite3_column_int64(statement, 6)

            guard let id = UUID(uuidString: idString),
                let syncItemId = UUID(uuidString: syncItemIdString)
            else {
                continue
            }

            let lastAccessedDate = Date(timeIntervalSince1970: TimeInterval(lastAccessedTimestamp))
            let createdDate = Date(timeIntervalSince1970: TimeInterval(createdAtTimestamp))

            let cacheItem = OfflineCacheItem(
                id: id,
                syncItemId: syncItemId,
                localPath: localPath,
                cachePath: cachePath,
                size: cacheSize,
                cachedDate: createdDate,
                lastAccessedDate: lastAccessedDate
            )

            items.append(cacheItem)
        }

        return items
    }

    /// 更新缓存项目的最后访问时间
    /// - Parameter id: 缓存项目ID
    func updateCacheItemLastAccessed(_ id: UUID) throws {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        let sql = "UPDATE offline_cache SET last_accessed = strftime('%s', 'now') WHERE id = ?"

        var statement: OpaquePointer?

        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.preparationFailed(errorMessage)
        }

        defer { sqlite3_finalize(statement) }

        sqlite3_bind_text(statement, 1, id.uuidString, -1, nil)

        guard sqlite3_step(statement) == SQLITE_DONE else {
            let errorMessage = String(cString: sqlite3_errmsg(db))
            throw DatabaseError.executionFailed(errorMessage)
        }
    }

    // MARK: - 统计信息

    /// 获取数据库统计信息
    /// - Returns: 包含各种统计数据的字典
    func getDatabaseStatistics() throws -> [String: Any] {
        guard let db = db else {
            throw DatabaseError.notConnected
        }

        var statistics: [String: Any] = [:]

        // 同步项目统计
        let itemCountSQL = "SELECT COUNT(*) FROM sync_items"
        var statement: OpaquePointer?

        if sqlite3_prepare_v2(db, itemCountSQL, -1, &statement, nil) == SQLITE_OK {
            if sqlite3_step(statement) == SQLITE_ROW {
                statistics["totalItems"] = sqlite3_column_int(statement, 0)
            }
            sqlite3_finalize(statement)
        }

        // 按状态统计
        let stateCountSQL = "SELECT sync_state, COUNT(*) FROM sync_items GROUP BY sync_state"
        if sqlite3_prepare_v2(db, stateCountSQL, -1, &statement, nil) == SQLITE_OK {
            var stateCounts: [String: Int] = [:]
            while sqlite3_step(statement) == SQLITE_ROW {
                let state = String(cString: sqlite3_column_text(statement, 0))
                let count = sqlite3_column_int(statement, 1)
                stateCounts[state] = Int(count)
            }
            statistics["itemsByState"] = stateCounts
            sqlite3_finalize(statement)
        }

        // 缓存统计
        let cacheCountSQL = "SELECT COUNT(*), SUM(cache_size) FROM offline_cache"
        if sqlite3_prepare_v2(db, cacheCountSQL, -1, &statement, nil) == SQLITE_OK {
            if sqlite3_step(statement) == SQLITE_ROW {
                statistics["cacheItemCount"] = sqlite3_column_int(statement, 0)
                statistics["totalCacheSize"] = sqlite3_column_int64(statement, 1)
            }
            sqlite3_finalize(statement)
        }

        return statistics
    }

    // MARK: - 选择性同步支持

    /// 获取上次应用的选中文件夹
    func getPreviousSelectedFolders() async throws -> Set<String> {
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .background).async {
                do {
                    var statement: OpaquePointer?
                    let sql = "SELECT folder_paths FROM previous_selected_folders WHERE id = 1"

                    if sqlite3_prepare_v2(self.db, sql, -1, &statement, nil) == SQLITE_OK {
                        var folders = Set<String>()

                        if sqlite3_step(statement) == SQLITE_ROW {
                            if let pathsData = sqlite3_column_text(statement, 0) {
                                let pathsString = String(cString: pathsData)
                                let pathsArray = pathsString.components(separatedBy: ",")
                                folders = Set(pathsArray.filter { !$0.isEmpty })
                            }
                        }

                        sqlite3_finalize(statement)
                        continuation.resume(returning: folders)
                    } else {
                        let errorMessage = String(cString: sqlite3_errmsg(self.db))
                        continuation.resume(throwing: DatabaseError.queryFailed(errorMessage))
                    }
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    /// 保存上次应用的选中文件夹
    func savePreviousSelectedFolders(_ folders: Set<String>) async throws {
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .background).async {
                do {
                    var statement: OpaquePointer?
                    let pathsString = folders.joined(separator: ",")
                    let sql = """
                            INSERT OR REPLACE INTO previous_selected_folders (id, folder_paths, updated_at)
                            VALUES (1, ?, ?)
                        """

                    if sqlite3_prepare_v2(self.db, sql, -1, &statement, nil) == SQLITE_OK {
                        sqlite3_bind_text(statement, 1, pathsString, -1, nil)
                        sqlite3_bind_int64(statement, 2, Int64(Date().timeIntervalSince1970))

                        if sqlite3_step(statement) == SQLITE_DONE {
                            sqlite3_finalize(statement)
                            continuation.resume()
                        } else {
                            let errorMessage = String(cString: sqlite3_errmsg(self.db))
                            sqlite3_finalize(statement)
                            continuation.resume(throwing: DatabaseError.insertFailed(errorMessage))
                        }
                    } else {
                        let errorMessage = String(cString: sqlite3_errmsg(self.db))
                        continuation.resume(throwing: DatabaseError.queryFailed(errorMessage))
                    }
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
}

// MARK: - 数据库错误类型

enum DatabaseError: Error, LocalizedError {
    case notConnected
    case connectionFailed(String)
    case preparationFailed(String)
    case executionFailed(String)
    case parsingFailed(String)
    case queryFailed(String)
    case insertFailed(String)

    var errorDescription: String? {
        switch self {
        case .notConnected:
            return "Database is not connected"
        case .connectionFailed(let message):
            return "Failed to connect to database: \(message)"
        case .preparationFailed(let message):
            return "Failed to prepare SQL statement: \(message)"
        case .executionFailed(let message):
            return "Failed to execute SQL statement: \(message)"
        case .parsingFailed(let message):
            return "Failed to parse database result: \(message)"
        case .queryFailed(let message):
            return "Failed to execute query: \(message)"
        case .insertFailed(let message):
            return "Failed to insert data: \(message)"
        }
    }
}
