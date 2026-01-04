import OSLog
import SwiftUI

struct ContentView: View {
    @EnvironmentObject var syncClientIntegrator: SyncClientIntegrator
    @EnvironmentObject var appState: AppState

    private let logger = Logger(subsystem: "com.macos.syncclient", category: "ContentView")

    var body: some View {
        content
            .sheet(isPresented: $appState.showSettings) {
                SettingsView()
            }
    }

    @ViewBuilder
    private var content: some View {
        if appState.isAuthenticated {
            MainWindowDebugShell()
                .onAppear {
                    logger.info("ContentView switched to MainWindowDebugShell for isolation test")
                }
        } else {
            VStack {
                Spacer()
                LoginView()
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(nsColor: .windowBackgroundColor))
        }
    }
}

/// 极简主窗口壳，用于排查约束递归问题
struct MainWindowDebugShell: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var statusManager = StatusManager()
    @State private var selection: MainWindow.TabType = .files
    @State private var syncItems: [SyncItem] = []
    @State private var searchText: String = ""

    var body: some View {
        HStack(spacing: 0) {
            SidebarView(selectedTab: $selection, statusManager: statusManager)
                .frame(width: 240)
                .background(Color(nsColor: .windowBackgroundColor))
                .overlay(Divider(), alignment: .trailing)
                .padding(.vertical, 8)
                .padding(.leading, 4)

            Divider()

            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text(selection.displayName)
                        .font(.title3).bold()
                    Spacer()
                    Button(action: { appState.showSettings = true }) {
                        Image(systemName: "gear")
                    }
                    .buttonStyle(.borderless)
                    .help("Settings (placeholder)")
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)

                Divider()

                Group {
                    switch selection {
                    case .files:
                        FileListView(
                            syncItems: $syncItems,
                            searchText: $searchText,
                            statusManager: statusManager
                        )
                    default:
                        VStack(alignment: .leading, spacing: 12) {
                            Text("内容占位：\(selection.rawValue)")
                                .font(.headline)
                            Text(
                                "逐步替换为真实子视图（Files/Activity/Conflicts/Settings），每次恢复后运行以观察是否复现约束递归崩溃。"
                            )
                            .foregroundColor(.secondary)
                            .fixedSize(horizontal: false, vertical: true)

                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.accentColor.opacity(0.08))
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .overlay(
                                    VStack(spacing: 8) {
                                        Text("占位面板")
                                            .font(.headline)
                                        Text("此处将逐步换成实际内容视图。")
                                            .foregroundColor(.secondary)
                                    }
                                    .padding()
                                )
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .padding()
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .onAppear {
                loadSampleData()
            }
        }
        .frame(minWidth: 800, minHeight: 600)
    }

    // MARK: - Sample data for isolation tests
    private func loadSampleData() {
        guard syncItems.isEmpty else { return }
        syncItems = [
            SyncItem(
                cloudId: "1",
                localPath: "/Users/user/Documents/file1.txt",
                cloudPath: "/Documents/file1.txt",
                name: "file1.txt",
                type: .file,
                size: 1024,
                modifiedDate: Date(),
                syncState: .synced,
                hash: "abc123"
            ),
            SyncItem(
                cloudId: "2",
                localPath: "/Users/user/Documents/folder1",
                cloudPath: "/Documents/folder1",
                name: "folder1",
                type: .folder,
                size: 0,
                modifiedDate: Date(),
                syncState: .uploading,
                hash: ""
            ),
            SyncItem(
                cloudId: "3",
                localPath: "/Users/user/Documents/file2.txt",
                cloudPath: "/Documents/file2.txt",
                name: "file2.txt",
                type: .file,
                size: 2048,
                modifiedDate: Date(),
                syncState: .conflict,
                hash: "def456"
            ),
        ]

        Task { @MainActor in
            statusManager.updateStatus(for: syncItems)
        }
    }
}

struct OverviewView: View {
    @EnvironmentObject var syncClientIntegrator: SyncClientIntegrator

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Sync Status Card
                SyncStatusCard()

                // Quick Stats
                QuickStatsView()

                // Recent Activity
                RecentActivityView()

                // Quick Actions
                QuickActionsView()
            }
            .padding()
        }
        .navigationTitle("Overview")
    }
}

struct SyncStatusCard: View {
    @EnvironmentObject var syncClientIntegrator: SyncClientIntegrator

    var body: some View {
        GroupBox("Sync Status") {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: syncStatusIcon)
                        .foregroundColor(syncStatusColor)
                        .font(.title2)

                    VStack(alignment: .leading) {
                        Text(syncStatusText)
                            .font(.headline)
                        Text("Last sync: \(lastSyncText)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Button(syncActionText) {
                        Task {
                            await handleSyncAction()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }

                if let progress = currentProgress {
                    ProgressView(value: progress.completionPercentage) {
                        Text("\(progress.completedItems)/\(progress.totalItems) items")
                    }
                }
            }
            .padding()
        }
    }

    private var syncStatusIcon: String {
        switch syncClientIntegrator.syncEngine.getSyncState() {
        case .idle: return "cloud"
        case .syncing: return "cloud.fill"
        case .paused: return "pause.circle"
        case .error: return "exclamationmark.triangle"
        }
    }

    private var syncStatusColor: Color {
        switch syncClientIntegrator.syncEngine.getSyncState() {
        case .idle: return .blue
        case .syncing: return .green
        case .paused: return .orange
        case .error: return .red
        }
    }

    private var syncStatusText: String {
        switch syncClientIntegrator.syncEngine.getSyncState() {
        case .idle: return "Ready to sync"
        case .syncing: return "Syncing..."
        case .paused: return "Sync paused"
        case .error: return "Sync error"
        }
    }

    private var syncActionText: String {
        switch syncClientIntegrator.syncEngine.getSyncState() {
        case .idle: return "Start Sync"
        case .syncing: return "Pause Sync"
        case .paused: return "Resume Sync"
        case .error: return "Retry Sync"
        }
    }

    private var lastSyncText: String {
        // This would come from the sync engine's last sync time
        return "Just now"
    }

    private var currentProgress: SyncProgress? {
        return syncClientIntegrator.syncEngine.getSyncProgress()
    }

    private func handleSyncAction() async {
        switch syncClientIntegrator.syncEngine.getSyncState() {
        case .idle, .error:
            try? await syncClientIntegrator.resumeSync()
        case .syncing:
            await syncClientIntegrator.pauseSync()
        case .paused:
            try? await syncClientIntegrator.resumeSync()
        }
    }
}

struct QuickStatsView: View {
    @EnvironmentObject var syncClientIntegrator: SyncClientIntegrator

    var body: some View {
        GroupBox("Quick Stats") {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 16) {
                StatItem(title: "Total Files", value: "1,234", icon: "doc")
                StatItem(
                    title: "Synced", value: "1,200", icon: "checkmark.circle.fill", color: .green)
                StatItem(title: "Pending", value: "34", icon: "clock", color: .orange)
                StatItem(
                    title: "Conflicts", value: "0", icon: "exclamationmark.triangle", color: .red)
                StatItem(title: "Offline", value: "56", icon: "wifi.slash", color: .blue)
                StatItem(title: "Storage Used", value: "2.3 GB", icon: "externaldrive")
            }
            .padding()
        }
    }
}

struct StatItem: View {
    let title: String
    let value: String
    let icon: String
    var color: Color = .primary

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)

            Text(value)
                .font(.headline)
                .foregroundColor(color)

            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }
}

struct RecentActivityView: View {
    var body: some View {
        GroupBox("Recent Activity") {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(0..<5) { index in
                    HStack {
                        Image(systemName: "doc.text")
                            .foregroundColor(.blue)

                        VStack(alignment: .leading) {
                            Text("Document \(index + 1).pdf")
                                .font(.body)
                            Text("Synced 2 minutes ago")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }
                    .padding(.vertical, 4)

                    if index < 4 {
                        Divider()
                    }
                }
            }
            .padding()
        }
    }
}

struct QuickActionsView: View {
    @EnvironmentObject var syncClientIntegrator: SyncClientIntegrator

    var body: some View {
        GroupBox("Quick Actions") {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 16) {
                ActionButton(
                    title: "Open Sync Folder",
                    icon: "folder",
                    action: {
                        let url = URL(
                            fileURLWithPath: syncClientIntegrator.syncConfiguration.syncRootPath)
                        NSWorkspace.shared.open(url)
                    }
                )

                ActionButton(
                    title: "Selective Sync",
                    icon: "checkmark.circle",
                    action: {
                        // Open selective sync settings
                    }
                )

                ActionButton(
                    title: "Resolve Conflicts",
                    icon: "exclamationmark.triangle",
                    action: {
                        // Open conflict resolution
                    }
                )

                ActionButton(
                    title: "Export Diagnostics",
                    icon: "doc.text",
                    action: {
                        Task {
                            try? await syncClientIntegrator.exportDiagnosticReport()
                        }
                    }
                )
            }
            .padding()
        }
    }
}

struct ActionButton: View {
    let title: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)

                Text(title)
                    .font(.caption)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(8)
        }
        .buttonStyle(.plain)
    }
}

struct LoadingView: View {
    var body: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)

            Text("Initializing Sync Client...")
                .font(.headline)

            Text("Please wait while we set up your sync environment")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct ErrorView: View {
    let error: Error

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(.red)

            Text("Initialization Failed")
                .font(.headline)

            Text(error.localizedDescription)
                .font(.body)
                .multilineTextAlignment(.center)
                .padding()

            Button("Retry") {
                // Retry initialization
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

struct SettingsButton: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Button(action: {
            appState.showSettings = true
        }) {
            Image(systemName: "gear")
        }
        .help("Settings")
    }
}

#Preview {
    ContentView()
        .environmentObject(SyncClientIntegrator())
        .environmentObject(AppState())
}
