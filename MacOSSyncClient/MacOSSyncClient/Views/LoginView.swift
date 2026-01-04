import OSLog
import SwiftUI

public struct LoginView: View {
    @EnvironmentObject var syncClientIntegrator: SyncClientIntegrator
    @EnvironmentObject var appState: AppState

    @State private var username: String = "admin"
    @State private var password: String = "admin123"
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let logger = Logger(subsystem: "com.macos.syncclient", category: "LoginView")

    private var displayBaseURL: String {
        CloudAPIService.Configuration.default.baseURL
    }

    public init() {}

    public var body: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                Image(systemName: "lock.shield")
                    .font(.system(size: 48))
                    .foregroundColor(.accentColor)
                Text("登录到云端")
                    .font(.title2).bold()
                Text("服务器: \(displayBaseURL)")
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }

            VStack(alignment: .leading, spacing: 12) {
                TextField("用户名", text: $username)
                    .textFieldStyle(.roundedBorder)
                    .disabled(isLoading)

                SecureField("密码", text: $password)
                    .textFieldStyle(.roundedBorder)
                    .disabled(isLoading)

                if let error = errorMessage {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.red)
                        Text(error)
                            .foregroundColor(.red)
                    }
                    .padding(.top, 4)
                }
            }
            .frame(maxWidth: 360)

            Button(action: submit) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .scaleEffect(0.9)
                        .frame(width: 16, height: 16)
                } else {
                    Text("登录")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(
                isLoading || username.isEmpty || password.isEmpty
                    || !syncClientIntegrator.isInitialized
            )
            .frame(maxWidth: 360)

            if !syncClientIntegrator.isInitialized {
                HStack(spacing: 6) {
                    ProgressView()
                        .progressViewStyle(.circular)
                        .scaleEffect(0.8)
                    Text("正在初始化客户端组件…")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(32)
        .frame(maxWidth: 480)
    }

    private func submit() {
        errorMessage = nil
        guard !username.isEmpty, !password.isEmpty else { return }
        guard syncClientIntegrator.isInitialized else {
            errorMessage = "客户端尚未初始化，请稍候"
            return
        }

        isLoading = true
        Task {
            do {
                _ = try await syncClientIntegrator.cloudAPIService.authenticate(
                    credentials: AuthCredentials(username: username, password: password)
                )
                await MainActor.run {
                    appState.isAuthenticated = true
                    appState.currentUsername = username
                }
            } catch {
                logger.error("Login failed: \(error.localizedDescription)")
                await MainActor.run {
                    if let apiError = error as? CloudAPIError {
                        switch apiError {
                        case .invalidCredentials:
                            errorMessage = "用户名或密码错误"
                        case .networkError(let urlError):
                            errorMessage = "网络错误: \(urlError.localizedDescription)"
                        case .serverError(_, let message):
                            errorMessage = message ?? "服务器错误"
                        default:
                            errorMessage = apiError.localizedDescription
                        }
                    } else {
                        errorMessage = error.localizedDescription
                    }
                    isLoading = false
                }
                return
            }

            await MainActor.run {
                isLoading = false
            }
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(SyncClientIntegrator())
        .environmentObject(AppState())
}
