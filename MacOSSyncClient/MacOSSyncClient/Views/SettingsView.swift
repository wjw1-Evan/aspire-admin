import SwiftUI

/// 设置视图，提供同步配置选项
struct SettingsView: View {
    @State private var configuration = SyncConfiguration()
    @State private var selectedTab: SettingsTab = .general
    @StateObject private var selectiveSync: SelectiveSync

    init() {
        // Create mock services for preview
        let mockCloudAPI = MockCloudAPIService()
        let mockLocalDB = LocalDBService()
        let mockFileSystem = MockFileSystemService()
        let mockFileMonitor = MockFileMonitor()
        let mockSyncEngine = SyncEngine(
            cloudAPIService: mockCloudAPI,
            localDBService: mockLocalDB,
            fileSystemService: mockFileSystem,
            fileMonitor: mockFileMonitor,
            configuration: SyncConfiguration()
        )

        self._selectiveSync = StateObject(wrappedValue: SelectiveSync(
            cloudAPIService: mockCloudAPI,
            localDBService: mockLocalDB,
            syncEngine: mockSyncEngine
        ))
    }

    var body: some View {
        NavigationView {
            // Settings sidebar
            List(SettingsTab.allCases, id: \.self, selection: $selectedTab) { tab in
                NavigationLink(value: tab) {
                    HStack {
                        Image(systemName: tab.iconName)
                            .foregroundColor(tab.color)
                            .frame(width: 20)
                        Text(tab.displayName)
                    }
                }
                .tag(tab)
            }
            .listStyle(SidebarListStyle())
            .navigationTitle("Settings")
            .frame(minWidth: 200)

            // Settings content
            VStack {
                switch selectedTab {
                case .general:
                    GeneralSettingsView(configuration: $configuration)
                case .sync:
                    SyncSettingsView(configuration: $configuration)
                case .selectiveSync:
                    SelectiveSyncView(selectiveSync: selectiveSync)
                case .bandwidth:
                    BandwidthSettingsView(configuration: $configuration)
                case .security:
                    SecuritySettingsView(configuration: $configuration)
                case .advanced:
                    AdvancedSettingsView(configuration: $configuration)
                }
            }
            .frame(minWidth: 400)
        }
        .frame(minWidth: 600, minHeight: 500)
    }
}

// MARK: - Settings Tabs

enum SettingsTab: String, CaseIterable {
    case general = "General"
    case sync = "Sync"
    case selectiveSync = "Selective Sync"
    case bandwidth = "Bandwidth"
    case security = "Security"
    case advanced = "Advanced"

    var displayName: String {
        switch self {
        case .selectiveSync:
            return "Selective Sync"
        default:
            return self.rawValue
        }
    }

    var iconName: String {
        switch self {
        case .general:
            return "gear"
        case .sync:
            return "arrow.triangle.2.circlepath"
        case .selectiveSync:
            return "folder.badge.gearshape"
        case .bandwidth:
            return "speedometer"
        case .security:
            return "lock.shield"
        case .advanced:
            return "slider.horizontal.3"
        }
    }

    var color: Color {
        switch self {
        case .general:
            return .gray
        case .sync:
            return .blue
        case .selectiveSync:
            return .purple
        case .bandwidth:
            return .green
        case .security:
            return .red
        case .advanced:
            return .orange
        }
    }
}

// MARK: - General Settings

struct GeneralSettingsView: View {
    @Binding var configuration: SyncConfiguration
    @State private var showingFolderPicker = false

    var body: some View {
        Form {
            Section("Sync Folder") {
                HStack {
                    Text("Location:")
                    Spacer()
                    Text(configuration.syncRootPath)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)

                    Button("Change") {
                        showingFolderPicker = true
                    }
                }

                Text("This is where your synced files will be stored locally.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("Startup") {
                Toggle("Launch at login", isOn: .constant(false))
                Toggle("Start sync automatically", isOn: .constant(true))
            }

            Section("Notifications") {
                Toggle("Show sync notifications", isOn: .constant(true))
                Toggle("Show conflict notifications", isOn: .constant(true))
                Toggle("Show error notifications", isOn: .constant(true))
            }
        }
        .navigationTitle("General")
        .fileImporter(
            isPresented: $showingFolderPicker,
            allowedContentTypes: [.folder],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                if let url = urls.first {
                    configuration.syncRootPath = url.path
                }
            case .failure(let error):
                print("Error selecting folder: \(error)")
            }
        }
    }
}

// MARK: - Sync Settings

struct SyncSettingsView: View {
    @Binding var configuration: SyncConfiguration

    var body: some View {
        Form {
            Section("Conflict Resolution") {
                Picker("Default action", selection: $configuration.conflictResolution) {
                    ForEach(SyncConfiguration.ConflictResolutionStrategy.allCases, id: \.self) { strategy in
                        Text(strategy.displayName).tag(strategy)
                    }
                }
                .pickerStyle(MenuPickerStyle())

                Text("Choose how conflicts should be resolved automatically.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("File Exclusions") {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Exclude these file patterns:")
                        .font(.headline)

                    ForEach(configuration.excludePatterns.indices, id: \.self) { index in
                        HStack {
                            TextField("Pattern", text: $configuration.excludePatterns[index])
                                .textFieldStyle(RoundedBorderTextFieldStyle())

                            Button(action: {
                                configuration.excludePatterns.remove(at: index)
                            }) {
                                Image(systemName: "minus.circle.fill")
                                    .foregroundColor(.red)
                            }
                            .buttonStyle(BorderlessButtonStyle())
                        }
                    }

                    Button("Add Pattern") {
                        configuration.excludePatterns.append("")
                    }
                    .buttonStyle(BorderlessButtonStyle())
                }

                Text("Files matching these patterns will not be synced. Use * as wildcard.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("Sync Behavior") {
                Toggle("Sync hidden files", isOn: .constant(false))
                Toggle("Preserve file permissions", isOn: .constant(true))
                Toggle("Sync file extended attributes", isOn: .constant(false))
            }
        }
        .navigationTitle("Sync")
    }
}

// MARK: - Bandwidth Settings

struct BandwidthSettingsView: View {
    @Binding var configuration: SyncConfiguration
    @State private var uploadLimitEnabled = false
    @State private var downloadLimitEnabled = false
    @State private var uploadLimit: Double = 1.0
    @State private var downloadLimit: Double = 1.0

    var body: some View {
        Form {
            Section("Upload Bandwidth") {
                Toggle("Limit upload speed", isOn: $uploadLimitEnabled)

                if uploadLimitEnabled {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Speed limit:")
                            Spacer()
                            Text("\(uploadLimit, specifier: "%.1f") MB/s")
                                .foregroundColor(.secondary)
                        }

                        Slider(value: $uploadLimit, in: 0.1...10.0, step: 0.1)
                    }
                }
            }

            Section("Download Bandwidth") {
                Toggle("Limit download speed", isOn: $downloadLimitEnabled)

                if downloadLimitEnabled {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Speed limit:")
                            Spacer()
                            Text("\(downloadLimit, specifier: "%.1f") MB/s")
                                .foregroundColor(.secondary)
                        }

                        Slider(value: $downloadLimit, in: 0.1...10.0, step: 0.1)
                    }
                }
            }

            Section("Smart Throttling") {
                Toggle("Auto-throttle on metered connections", isOn: $configuration.bandwidthLimits.pauseOnMeteredConnection)
                Toggle("Reduce speed when other apps are using network", isOn: $configuration.bandwidthLimits.enableAutoThrottling)
            }

            Section("Schedule") {
                Toggle("Pause sync during work hours", isOn: .constant(false))
                Toggle("Limit sync to specific time windows", isOn: .constant(false))
            }
        }
        .navigationTitle("Bandwidth")
        .onChange(of: uploadLimitEnabled) { enabled in
            configuration.bandwidthLimits.uploadLimit = enabled ? Int64(uploadLimit * 1024 * 1024) : nil
        }
        .onChange(of: downloadLimitEnabled) { enabled in
            configuration.bandwidthLimits.downloadLimit = enabled ? Int64(downloadLimit * 1024 * 1024) : nil
        }
        .onChange(of: uploadLimit) { limit in
            if uploadLimitEnabled {
                configuration.bandwidthLimits.uploadLimit = Int64(limit * 1024 * 1024)
            }
        }
        .onChange(of: downloadLimit) { limit in
            if downloadLimitEnabled {
                configuration.bandwidthLimits.downloadLimit = Int64(limit * 1024 * 1024)
            }
        }
    }
}

// MARK: - Security Settings

struct SecuritySettingsView: View {
    @Binding var configuration: SyncConfiguration

    var body: some View {
        Form {
            Section("Encryption") {
                Toggle("Enable end-to-end encryption", isOn: $configuration.securitySettings.enableEncryption)

                Text("Files are encrypted before being uploaded to the cloud.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("Authentication") {
                Toggle("Require two-factor authentication", isOn: $configuration.securitySettings.requireTwoFactor)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Auto-lock timeout:")

                    Picker("Timeout", selection: $configuration.securitySettings.autoLockTimeout) {
                        Text("Never").tag(TimeInterval(0))
                        Text("15 minutes").tag(TimeInterval(15 * 60))
                        Text("30 minutes").tag(TimeInterval(30 * 60))
                        Text("1 hour").tag(TimeInterval(60 * 60))
                        Text("4 hours").tag(TimeInterval(4 * 60 * 60))
                    }
                    .pickerStyle(MenuPickerStyle())
                }
            }

            Section("Privacy") {
                Toggle("Send anonymous usage statistics", isOn: .constant(false))
                Toggle("Send crash reports", isOn: .constant(true))

                Button("Clear Local Cache") {
                    // TODO: Implement cache clearing
                }
                .foregroundColor(.red)
            }
        }
        .navigationTitle("Security")
    }
}

// MARK: - Advanced Settings

struct AdvancedSettingsView: View {
    @Binding var configuration: SyncConfiguration

    private var cacheSizeBinding: Binding<Double> {
        Binding(
            get: { Double(configuration.offlineSettings.maxCacheSize) / (1024 * 1024 * 1024) },
            set: { configuration.offlineSettings.maxCacheSize = Int64($0 * 1024 * 1024 * 1024) }
        )
    }

    var body: some View {
        Form {
            Section("Offline Storage") {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Maximum cache size:")
                        Spacer()
                        Text(configuration.formattedCacheSize())
                            .foregroundColor(.secondary)
                    }

                    Slider(
                        value: cacheSizeBinding,
                        in: 1...100,
                        step: 1
                    )
                }

                Toggle("Auto-cleanup when storage is low", isOn: $configuration.offlineSettings.autoCleanupEnabled)

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Cleanup threshold:")
                        Spacer()
                        Text("\(Int(configuration.offlineSettings.cleanupThreshold * 100))%")
                            .foregroundColor(.secondary)
                    }

                    Slider(
                        value: $configuration.offlineSettings.cleanupThreshold,
                        in: 0.5...0.95,
                        step: 0.05
                    )
                }
            }

            Section("Logging") {
                Toggle("Enable debug logging", isOn: .constant(false))
                Toggle("Log file operations", isOn: .constant(true))

                Button("Export Logs") {
                    // TODO: Implement log export
                }

                Button("Clear Logs") {
                    // TODO: Implement log clearing
                }
                .foregroundColor(.red)
            }

            Section("Reset") {
                Button("Reset All Settings") {
                    configuration = SyncConfiguration()
                }
                .foregroundColor(.red)

                Button("Reset Sync Database") {
                    // TODO: Implement database reset
                }
                .foregroundColor(.red)
            }
        }
        .navigationTitle("Advanced")
    }
}

#Preview {
    SettingsView()
}

// MARK: - Mock Services for Preview

@MainActor
private class MockCloudAPIService: CloudAPIServiceProtocol {
    func authenticate(credentials: AuthCredentials) async throws -> AuthToken {
        return AuthToken(accessToken: "mock", refreshToken: "mock", expiresAt: Date().addingTimeInterval(3600))
    }

    func refreshToken(_ token: AuthToken) async throws -> AuthToken { return token }
    func logout() async throws {}

    func listFolder(at path: String) async throws -> [CloudItem] {
        return []
    }

    func uploadFile(at localPath: String, to cloudPath: String, progressHandler: @escaping (Double) -> Void) async throws -> CloudFile {
        return CloudFile(id: UUID().uuidString, name: "mock", path: cloudPath, size: 0, modifiedDate: Date(), hash: "mock", mimeType: "application/octet-stream")
    }
    func downloadFile(from cloudPath: String, to localPath: String, progressHandler: @escaping (Double) -> Void) async throws {}
    func deleteFile(at cloudPath: String) async throws {}
    func moveFile(from: String, to: String) async throws -> CloudFile {
        return CloudFile(id: UUID().uuidString, name: "mock", path: to, size: 0, modifiedDate: Date(), hash: "mock", mimeType: "application/octet-stream")
    }
    func copyFile(from: String, to: String) async throws -> CloudFile {
        return CloudFile(id: UUID().uuidString, name: "mock", path: to, size: 0, modifiedDate: Date(), hash: "mock", mimeType: "application/octet-stream")
    }
    func createFolder(at cloudPath: String) async throws -> CloudFolder {
        return CloudFolder(id: UUID().uuidString, name: "mock", path: cloudPath, modifiedDate: Date(), itemCount: 0)
    }
    func deleteFolder(at cloudPath: String) async throws {}
    func getFileInfo(at cloudPath: String) async throws -> CloudFile {
        return CloudFile(id: UUID().uuidString, name: "mock", path: cloudPath, size: 0, modifiedDate: Date(), hash: "mock", mimeType: "application/octet-stream")
    }
    func getFolderInfo(at cloudPath: String) async throws -> CloudFolder {
        return CloudFolder(id: UUID().uuidString, name: "mock", path: cloudPath, modifiedDate: Date(), itemCount: 0)
    }
    func getChanges(since cursor: String?) async throws -> ChangeSet {
        return ChangeSet(changes: [], cursor: "mock", hasMore: false)
    }
    func connectWebSocket() async throws -> WebSocketConnection {
        fatalError("Not implemented in mock")
    }
    func subscribeToChanges(paths: [String]) async throws {}
}

@MainActor
private class MockFileSystemService: FileSystemServiceProtocol {
    func createFile(at path: String, with data: Data) throws {}
    func updateFile(at path: String, with data: Data) throws {}
    func deleteFile(at path: String) throws {}
    func moveFile(from sourcePath: String, to destinationPath: String) throws {}
    func copyFile(from sourcePath: String, to destinationPath: String) throws {}
    func createDirectory(at path: String) throws {}
    func deleteDirectory(at path: String) throws {}
    func listDirectory(at path: String) throws -> [String] { return [] }
    func fileExists(at path: String) -> Bool { return true }
    func directoryExists(at path: String) -> Bool { return false }
    func getFileAttributes(at path: String) throws -> FileAttributes {
        return FileAttributes(
            size: 0,
            creationDate: Date(),
            modificationDate: Date(),
            isDirectory: false,
            isReadable: true,
            isWritable: true,
            isExecutable: false,
            permissions: "rw"
        )
    }
    func hasPermission(_ permission: FilePermission, for path: String) -> Bool { return true }
    func getAvailableSpace(at path: String) throws -> Int64 { return 1024*1024*1024 }

    // Legacy methods for compatibility
    func removeItem(at path: String) throws {}
    func moveItem(from: String, to: String) throws {}
    func copyItem(from: String, to: String) throws {}
    func isDirectory(at path: String) -> Bool { return false }
    func fileSize(at path: String) throws -> Int64 { return 0 }
    func modificationDate(at path: String) throws -> Date { return Date() }
    func contentsOfDirectory(at path: String) throws -> [String] { return [] }
    func readFile(at path: String) throws -> Data { return Data() }
    func writeFile(at path: String, contents: Data) throws {}
    func calculateHash(for path: String) throws -> String { return "mock_hash" }
}

@MainActor
private class MockFileMonitor: FileMonitorProtocol {
    var fileEvents: AsyncStream<FileEvent> { AsyncStream { _ in } }
    var isMonitoring: Bool = false
    var monitoredPath: String? = nil
    var excludePatterns: [String] = []

    func startMonitoring(path: String) throws {
        isMonitoring = true
        monitoredPath = path
    }
    func stopMonitoring() {
        isMonitoring = false
        monitoredPath = nil
    }
    func addExcludePattern(_ pattern: String) {
        excludePatterns.append(pattern)
    }
    func removeExcludePattern(_ pattern: String) {
        excludePatterns.removeAll { $0 == pattern }
    }
}
