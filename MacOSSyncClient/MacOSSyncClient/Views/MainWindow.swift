import SwiftUI

/// 主窗口界面，提供文件列表、活动监控、设置等功能
struct MainWindow: View {
    @StateObject private var statusManager = StatusManager()
    @State private var selectedTab: TabType = .files
    @State private var searchText = ""
    @State private var showingSettings = false
    @State private var syncItems: [SyncItem] = []
    @State private var syncProgress: SyncProgress = SyncProgress(totalItems: 0, completedItems: 0, totalBytes: 0, transferredBytes: 0)

    var body: some View {
        HStack(spacing: 0) {
            SidebarView(selectedTab: $selectedTab, statusManager: statusManager)
                .frame(width: 240)
                .background(Color(nsColor: .windowBackgroundColor))
                .overlay(Divider(), alignment: .trailing)
                .padding(.vertical, 8)
                .padding(.leading, 4)

            Divider()

            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text(selectedTab.displayName)
                        .font(.title3).bold()
                    Spacer()
                    SyncStatusButton(
                        syncProgress: syncProgress,
                        statusManager: statusManager
                    )
                    Button(action: { showingSettings = true }) {
                        Image(systemName: "gear")
                    }
                    .buttonStyle(.borderless)
                    .help("Settings")
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)

                Divider()

                Group {
                    switch selectedTab {
                    case .files:
                        FileListView(
                            syncItems: $syncItems,
                            searchText: $searchText,
                            statusManager: statusManager
                        )
                    case .activity:
                        // Placeholder to isolate layout issues; restore ActivityView after stability check
                        Text("Activity placeholder")
                    case .conflicts:
                        // Placeholder to isolate layout issues; restore ConflictView after stability check
                        Text("Conflicts placeholder")
                    case .settings:
                        // Placeholder to isolate layout issues; restore SettingsView after stability check
                        Text("Settings placeholder")
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
            .padding(.top, 4)
        }
        .frame(minWidth: 800, minHeight: 600)
        .sheet(isPresented: $showingSettings) {
            SettingsView()
        }
        .onAppear {
            loadInitialData()
        }
    }

    // MARK: - Private Methods

    private func refreshFileList() {
        // TODO: Implement file list refresh
        // This would typically call the sync engine to refresh the file list
    }

    private func loadInitialData() {
        // TODO: Load initial sync items and progress
        // This would typically load data from the sync engine
        loadSampleData()
    }

    private func loadSampleData() {
        // Sample data for demonstration
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
            )
        ]

        syncProgress = SyncProgress(
            totalItems: 10,
            completedItems: 7,
            totalBytes: 10240,
            transferredBytes: 7168,
            currentOperation: "Uploading file2.txt",
            estimatedTimeRemaining: 30
        )

        // Update status manager with sample data
        Task { @MainActor in
            statusManager.updateStatus(for: syncItems)
        }
    }
}

// MARK: - Tab Types

extension MainWindow {
    enum TabType: String, CaseIterable {
        case files = "Files"
        case activity = "Activity"
        case conflicts = "Conflicts"
        case settings = "Settings"

        var displayName: String {
            return self.rawValue
        }

        var iconName: String {
            switch self {
            case .files:
                return "doc.fill"
            case .activity:
                return "chart.line.uptrend.xyaxis"
            case .conflicts:
                return "exclamationmark.triangle.fill"
            case .settings:
                return "gear"
            }
        }
    }
}

#Preview {
    MainWindow()
        .frame(minWidth: 800, minHeight: 600)
}
