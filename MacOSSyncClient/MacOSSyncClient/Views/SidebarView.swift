import SwiftUI

/// 侧边栏视图，显示导航选项和状态统计
struct SidebarView: View {
    @Binding var selectedTab: MainWindow.TabType
    @ObservedObject var statusManager: StatusManager

    var body: some View {
        List {
            Section("Navigation") {
                ForEach(MainWindow.TabType.allCases, id: \.self) { tab in
                    Button {
                        selectedTab = tab
                    } label: {
                        HStack {
                            Image(systemName: tab.iconName)
                                .foregroundColor(iconColor(for: tab))
                            Text(tab.displayName)
                            Spacer()
                            if let badge = badgeCount(for: tab) {
                                Text("\(badge)")
                                    .font(.caption)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.red)
                                    .clipShape(Capsule())
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .contentShape(Rectangle())
                        .background(selectedTab == tab ? Color.accentColor.opacity(0.1) : Color.clear)
                    }
                    .buttonStyle(.plain)
                }
            }

            Section("Status Overview") {
                StatusOverviewView(statusManager: statusManager)
            }
        }
        .listStyle(SidebarListStyle())
        .navigationTitle("Sync Client")
    }

    // MARK: - Private Methods

    private func iconColor(for tab: MainWindow.TabType) -> Color {
        switch tab {
        case .files:
            return .blue
        case .activity:
            return .green
        case .conflicts:
            return .orange
        case .settings:
            return .gray
        }
    }

    private func badgeCount(for tab: MainWindow.TabType) -> Int? {
        let statistics = statusManager.getStatusStatistics()

        switch tab {
        case .conflicts:
            return statistics.conflictItems > 0 ? statistics.conflictItems : nil
        case .activity:
            return statistics.hasActiveSync ? statistics.activeItems : nil
        default:
            return nil
        }
    }
}

/// 状态概览视图
struct StatusOverviewView: View {
    @ObservedObject var statusManager: StatusManager

    var body: some View {
        let statistics = statusManager.getStatusStatistics()

        VStack(alignment: .leading, spacing: 8) {
            StatusRow(
                icon: "checkmark.circle.fill",
                color: .green,
                label: "Synced",
                count: statistics.syncedItems
            )

            StatusRow(
                icon: "arrow.up.circle.fill",
                color: .blue,
                label: "Uploading",
                count: statistics.uploadingItems
            )

            StatusRow(
                icon: "arrow.down.circle.fill",
                color: .blue,
                label: "Downloading",
                count: statistics.downloadingItems
            )

            StatusRow(
                icon: "exclamationmark.triangle.fill",
                color: .orange,
                label: "Conflicts",
                count: statistics.conflictItems
            )

            StatusRow(
                icon: "xmark.circle.fill",
                color: .red,
                label: "Errors",
                count: statistics.errorItems
            )

            Divider()

            HStack {
                Text("Total: \(statistics.totalItems)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                if statistics.hasActiveSync {
                    HStack(spacing: 4) {
                        ProgressView()
                            .scaleEffect(0.7)
                        Text("Syncing")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

/// 状态行视图
struct StatusRow: View {
    let icon: String
    let color: Color
    let label: String
    let count: Int

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 16)

            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)

            Spacer()

            Text("\(count)")
                .font(.caption)
                .fontWeight(.medium)
        }
    }
}

#Preview {
    NavigationSplitView {
        SidebarView(
            selectedTab: .constant(.files),
            statusManager: StatusManager()
        )
    } detail: {
        Text("Detail View")
    }
    .frame(width: 800, height: 600)
}
