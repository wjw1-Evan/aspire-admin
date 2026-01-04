import Foundation
import OSLog

/// Implementation of multi-account management
class AccountManager: AccountManagerProtocol, ObservableObject {
    private let logger = Logger(subsystem: "com.syncclient.macos", category: "AccountManager")
    private let fileManager = FileManager.default
    private let userDefaults: UserDefaults

    // MARK: - Properties

    @Published private(set) var accounts: [Account] = []
    @Published private(set) var currentAccount: Account?

    private let accountsKey: String
    private let currentAccountKey: String
    private let basePath: String
    private var accountIsolations: [UUID: AccountIsolation] = [:]

    // Event streams
    private let accountEventsContinuation: AsyncStream<AccountEvent>.Continuation
    let accountEvents: AsyncStream<AccountEvent>

    // MARK: - Initialization

    init(basePath: String = NSHomeDirectory(), userDefaults: UserDefaults? = nil) {
        self.basePath = basePath
        let storage = userDefaults ?? AccountManager.makeUserDefaults(basePath: basePath)
        self.userDefaults = storage
        self.accountsKey = "SyncClient.Accounts." + String(basePath.hashValue)
        self.currentAccountKey = "SyncClient.CurrentAccount." + String(basePath.hashValue)

        // Create event stream
        (accountEvents, accountEventsContinuation) = AsyncStream<AccountEvent>.makeStream()

        // Load existing accounts
        loadAccounts()
        loadCurrentAccount()

        logger.info("AccountManager initialized with \(self.accounts.count) accounts")
    }

    deinit {
        accountEventsContinuation.finish()
    }

    // MARK: - Account Management

    func addAccount(_ account: Account) async throws {
        logger.info("Adding account: \(account.username)")

        // Validate account
        let validation = await validateAccount(account)
        guard validation.isValid else {
            let errorMessage = validation.errors.map { $0.message }.joined(separator: ", ")
            throw AccountError.invalidAccountConfiguration(errorMessage)
        }

        // Check for duplicates
        if accounts.contains(where: { $0.username == account.username || $0.email == account.email }
        ) {
            throw AccountError.accountAlreadyExists(account.username)
        }

        // Create account isolation
        try await createAccountIsolation(account)

        // Add to accounts list
        accounts.append(account)
        saveAccounts()

        // Emit event
        accountEventsContinuation.yield(.accountAdded(account))

        logger.info("Account added successfully: \(account.username)")
    }

    func removeAccount(_ accountId: UUID) async throws {
        logger.info("Removing account: \(accountId)")

        guard let accountIndex = accounts.firstIndex(where: { $0.id == accountId }) else {
            throw AccountError.accountNotFound(accountId)
        }

        let account = accounts[accountIndex]

        // If this is the current account, switch to another or clear
        if currentAccount?.id == accountId {
            let otherAccount = accounts.first { $0.id != accountId }
            if let otherAccount = otherAccount {
                try await switchToAccount(otherAccount.id, reason: .automatic)
            } else {
                currentAccount = nil
                userDefaults.removeObject(forKey: currentAccountKey)
            }
        }

        // Remove account isolation
        try await removeAccountIsolation(accountId)

        // Remove from accounts list
        accounts.remove(at: accountIndex)
        saveAccounts()

        // Emit event
        accountEventsContinuation.yield(.accountRemoved(accountId))

        logger.info("Account removed successfully: \(account.username)")
    }

    func switchToAccount(_ accountId: UUID, reason: AccountSwitchContext.SwitchReason) async throws
    {
        logger.info("Switching to account: \(accountId), reason: \(reason.rawValue)")

        guard let newAccount = accounts.first(where: { $0.id == accountId }) else {
            throw AccountError.accountNotFound(accountId)
        }

        let oldAccount = currentAccount
        let switchContext = AccountSwitchContext(
            reason: reason,
            previousAccountId: oldAccount?.id,
            targetAccountId: newAccount.id,
            metadata: [:]
        )

        // Update current account
        currentAccount = newAccount
        saveCurrentAccount()

        // Emit event
        accountEventsContinuation.yield(
            .accountSwitched(from: oldAccount?.id, to: newAccount.id, context: switchContext))

        logger.info(
            "Account switched successfully from \(oldAccount?.username ?? "none") to \(newAccount.username)"
        )
    }

    func updateAccount(_ account: Account) async throws {
        logger.info("Updating account: \(account.username)")

        guard let accountIndex = accounts.firstIndex(where: { $0.id == account.id }) else {
            throw AccountError.accountNotFound(account.id)
        }

        // Validate updated account
        let validation = await validateAccount(account)
        guard validation.isValid else {
            let errorMessage = validation.errors.map { $0.message }.joined(separator: ", ")
            throw AccountError.invalidAccountConfiguration(errorMessage)
        }

        // Update account
        accounts[accountIndex] = account
        saveAccounts()

        // Update current account if it's the same
        if currentAccount?.id == account.id {
            currentAccount = account
            saveCurrentAccount()
        }

        // Emit event
        accountEventsContinuation.yield(.accountUpdated(account))

        logger.info("Account updated successfully: \(account.username)")
    }

    func getAccount(_ accountId: UUID) -> Account? {
        return accounts.first { $0.id == accountId }
    }

    func validateAccount(_ account: Account) async -> AccountValidationResult {
        var errors: [ValidationError] = []
        var warnings: [ValidationWarning] = []

        // Validate required fields
        if account.username.isEmpty {
            errors.append(
                ValidationError(
                    field: "username", message: "Username is required", code: "REQUIRED"))
        }

        if account.email.isEmpty {
            errors.append(
                ValidationError(field: "email", message: "Email is required", code: "REQUIRED"))
        }

        if account.serverURL.isEmpty {
            errors.append(
                ValidationError(
                    field: "serverURL", message: "Server URL is required", code: "REQUIRED"))
        }

        if account.syncRootPath.isEmpty {
            errors.append(
                ValidationError(
                    field: "syncRootPath", message: "Sync root path is required", code: "REQUIRED"))
        }

        // Validate email format
        if !account.email.isEmpty && !isValidEmail(account.email) {
            errors.append(
                ValidationError(
                    field: "email", message: "Invalid email format", code: "INVALID_FORMAT"))
        }

        // Validate server URL format (must include scheme + host)
        if !account.serverURL.isEmpty && !isValidServerURL(account.serverURL) {
            errors.append(
                ValidationError(
                    field: "serverURL", message: "Invalid server URL format", code: "INVALID_FORMAT"
                ))
        }

        // Validate sync root path
        if !account.syncRootPath.isEmpty && !fileManager.fileExists(atPath: account.syncRootPath) {
            warnings.append(
                ValidationWarning(
                    field: "syncRootPath", message: "Sync root path does not exist",
                    code: "PATH_NOT_EXISTS"))
        }

        // Validate enterprise settings if present
        if let enterpriseSettings = account.enterpriseSettings {
            if enterpriseSettings.organizationId.isEmpty {
                errors.append(
                    ValidationError(
                        field: "enterpriseSettings.organizationId",
                        message: "Organization ID is required for enterprise accounts",
                        code: "REQUIRED"))
            }

            if enterpriseSettings.domain.isEmpty {
                errors.append(
                    ValidationError(
                        field: "enterpriseSettings.domain",
                        message: "Domain is required for enterprise accounts", code: "REQUIRED"))
            }
        }

        return AccountValidationResult(
            isValid: errors.isEmpty,
            errors: errors,
            warnings: warnings
        )
    }

    // MARK: - Account Isolation

    func getAccountIsolation(_ accountId: UUID) -> AccountIsolation? {
        return accountIsolations[accountId]
    }

    func createAccountIsolation(_ account: Account) async throws {
        logger.info("Creating account isolation for: \(account.username)")

        let isolation = AccountIsolation(accountId: account.id, basePath: basePath)

        // Create isolated directories
        let directories = [
            isolation.isolatedSyncPath,
            isolation.isolatedDatabasePath,
            isolation.isolatedCachePath,
            isolation.isolatedLogPath,
            isolation.isolatedConfigPath,
        ]

        for directory in directories {
            do {
                try fileManager.createDirectory(
                    atPath: directory, withIntermediateDirectories: true)
            } catch {
                logger.error("Failed to create isolation directory: \(directory), error: \(error)")
                throw AccountError.isolationFailed("Failed to create directory: \(directory)")
            }
        }

        // Store isolation configuration
        accountIsolations[account.id] = isolation

        logger.info("Account isolation created successfully for: \(account.username)")
    }

    func removeAccountIsolation(_ accountId: UUID) async throws {
        logger.info("Removing account isolation for: \(accountId)")

        guard let isolation = accountIsolations[accountId] else {
            logger.warning("No isolation found for account: \(accountId)")
            return
        }

        // Remove isolated directories
        let directories = [
            isolation.isolatedSyncPath,
            isolation.isolatedDatabasePath,
            isolation.isolatedCachePath,
            isolation.isolatedLogPath,
            isolation.isolatedConfigPath,
        ]

        for directory in directories {
            do {
                if fileManager.fileExists(atPath: directory) {
                    try fileManager.removeItem(atPath: directory)
                }
            } catch {
                logger.error("Failed to remove isolation directory: \(directory), error: \(error)")
                // Continue with other directories
            }
        }

        // Remove isolation configuration
        accountIsolations.removeValue(forKey: accountId)

        logger.info("Account isolation removed successfully for: \(accountId)")
    }

    // MARK: - Enterprise Policy Management

    func applyPolicies(to accountId: UUID, policies: [EnterprisePolicy]) async throws {
        logger.info("Applying \(policies.count) policies to account: \(accountId)")

        guard let account = getAccount(accountId) else {
            throw AccountError.accountNotFound(accountId)
        }

        // Update enterprise settings with new policies
        if var enterpriseSettings = account.enterpriseSettings {
            enterpriseSettings = EnterpriseSettings(
                organizationId: enterpriseSettings.organizationId,
                organizationName: enterpriseSettings.organizationName,
                domain: enterpriseSettings.domain,
                policies: policies,
                auditingEnabled: enterpriseSettings.auditingEnabled,
                dataRetentionDays: enterpriseSettings.dataRetentionDays,
                allowedFileTypes: enterpriseSettings.allowedFileTypes,
                blockedFileTypes: enterpriseSettings.blockedFileTypes,
                maxFileSizeBytes: enterpriseSettings.maxFileSizeBytes,
                encryptionRequired: enterpriseSettings.encryptionRequired,
                offlineAccessAllowed: enterpriseSettings.offlineAccessAllowed,
                externalSharingAllowed: enterpriseSettings.externalSharingAllowed
            )

            let updatedAccount = Account(
                id: account.id,
                username: account.username,
                email: account.email,
                displayName: account.displayName,
                serverURL: account.serverURL,
                syncRootPath: account.syncRootPath,
                isActive: account.isActive,
                accountType: account.accountType,
                createdAt: account.createdAt,
                lastLoginAt: account.lastLoginAt,
                enterpriseSettings: enterpriseSettings
            )

            try await updateAccount(updatedAccount)

            // Emit policy applied events
            for policy in policies {
                accountEventsContinuation.yield(.policyApplied(accountId, policy))
            }
        }

        logger.info("Policies applied successfully to account: \(accountId)")
    }

    func checkPolicyCompliance(
        for operation: PolicyOperation,
        accountId: UUID,
        context: [String: Any]
    ) async -> PolicyDecision {
        guard let account = getAccount(accountId),
            let enterpriseSettings = account.enterpriseSettings
        else {
            return PolicyDecision(
                isAllowed: true,
                reason: "No enterprise policies configured",
                appliedPolicies: [],
                requiredActions: [],
                warnings: []
            )
        }

        let activePolicies = enterpriseSettings.policies.filter { $0.isEnabled }
        var appliedPolicies: [EnterprisePolicy] = []
        var requiredActions: [PolicyRule.PolicyAction] = []
        var warnings: [String] = []
        var isAllowed = true
        var denyReason: String?

        // Evaluate each policy
        for policy in activePolicies.sorted(by: { $0.priority > $1.priority }) {
            let policyResult = evaluatePolicy(policy, for: operation, context: context)

            if policyResult.applies {
                appliedPolicies.append(policy)

                for rule in policy.rules {
                    switch rule.action {
                    case .deny:
                        isAllowed = false
                        denyReason = "Denied by policy: \(policy.name)"
                    case .encrypt:
                        requiredActions.append(.encrypt)
                    case .audit:
                        requiredActions.append(.audit)
                    case .quarantine:
                        requiredActions.append(.quarantine)
                    case .warn:
                        warnings.append("Warning from policy \(policy.name): \(rule.condition)")
                    case .allow:
                        break  // Explicitly allowed
                    }
                }
            }
        }

        return PolicyDecision(
            isAllowed: isAllowed,
            reason: denyReason,
            appliedPolicies: appliedPolicies,
            requiredActions: Array(Set(requiredActions)),
            warnings: warnings
        )
    }

    func getActivePolicies(for accountId: UUID) -> [EnterprisePolicy] {
        guard let account = getAccount(accountId),
            let enterpriseSettings = account.enterpriseSettings
        else {
            return []
        }

        return enterpriseSettings.policies.filter { $0.isEnabled }
    }

    func reportPolicyViolation(accountId: UUID, violation: String, policy: EnterprisePolicy) async {
        logger.warning(
            "Policy violation reported for account \(accountId): \(violation) (Policy: \(policy.name))"
        )

        // Emit policy violation event
        accountEventsContinuation.yield(.policyViolation(accountId, violation, policy))

        // TODO: Send violation report to enterprise admin if configured
    }

    // MARK: - Private Methods

    private func loadAccounts() {
        guard let data = userDefaults.data(forKey: accountsKey),
            let loadedAccounts = try? JSONDecoder().decode([Account].self, from: data)
        else {
            logger.info("No existing accounts found")
            return
        }

        accounts = loadedAccounts
        logger.info("Loaded \(self.accounts.count) accounts")
    }

    private func saveAccounts() {
        do {
            let data = try JSONEncoder().encode(accounts)
            userDefaults.set(data, forKey: accountsKey)
            logger.debug("Accounts saved successfully")
        } catch {
            logger.error("Failed to save accounts: \(error)")
        }
    }

    private func loadCurrentAccount() {
        guard let data = userDefaults.data(forKey: currentAccountKey),
            let accountId = try? JSONDecoder().decode(UUID.self, from: data),
            let account = accounts.first(where: { $0.id == accountId })
        else {
            logger.info("No current account found")
            return
        }

        currentAccount = account
        logger.info("Loaded current account: \(account.username)")
    }

    private func saveCurrentAccount() {
        guard let currentAccount = currentAccount else {
            userDefaults.removeObject(forKey: currentAccountKey)
            return
        }

        do {
            let data = try JSONEncoder().encode(currentAccount.id)
            userDefaults.set(data, forKey: currentAccountKey)
            logger.debug("Current account saved successfully")
        } catch {
            logger.error("Failed to save current account: \(error)")
        }
    }

    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = #"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"#
        return email.range(of: emailRegex, options: .regularExpression) != nil
    }

    private func isValidServerURL(_ urlString: String) -> Bool {
        guard let components = URLComponents(string: urlString),
            let scheme = components.scheme,
            let host = components.host,
            !scheme.isEmpty,
            !host.isEmpty
        else {
            return false
        }

        return ["http", "https"].contains(scheme.lowercased())
    }

    private func evaluatePolicy(
        _ policy: EnterprisePolicy,
        for operation: PolicyOperation,
        context: [String: Any]
    ) -> (applies: Bool, result: PolicyRule.PolicyAction?) {
        // Simple policy evaluation - in a real implementation, this would be more sophisticated
        for rule in policy.rules {
            if rule.condition.contains(operation.rawValue) {
                return (applies: true, result: rule.action)
            }
        }

        return (applies: false, result: nil)
    }

    private static func makeUserDefaults(basePath: String) -> UserDefaults {
        let suiteName = "com.syncclient.accountmanager." + String(basePath.hashValue)
        return UserDefaults(suiteName: suiteName) ?? .standard
    }
}
