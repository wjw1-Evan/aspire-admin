import XCTest
@testable import MacOSSyncClientCore

class AccountManagerTests: XCTestCase {
    var accountManager: AccountManager!
    var tempDirectory: URL!

    override func setUp() {
        super.setUp()

        // Create temporary directory for testing
        tempDirectory = FileManager.default.temporaryDirectory
            .appendingPathComponent("AccountManagerTests")
            .appendingPathComponent(UUID().uuidString)

        try! FileManager.default.createDirectory(at: tempDirectory, withIntermediateDirectories: true)

        accountManager = AccountManager(basePath: tempDirectory.path)
    }

    override func tearDown() {
        // Clean up temporary directory
        try? FileManager.default.removeItem(at: tempDirectory)
        accountManager = nil
        super.tearDown()
    }

    // MARK: - Account Management Tests

    func testAddAccount() async throws {
        let account = createTestAccount(username: "testuser", email: "test@example.com")

        try await accountManager.addAccount(account)

        XCTAssertEqual(accountManager.accounts.count, 1)
        XCTAssertEqual(accountManager.accounts.first?.username, "testuser")
        XCTAssertEqual(accountManager.accounts.first?.email, "test@example.com")
    }

    func testAddDuplicateAccount() async throws {
        let account1 = createTestAccount(username: "testuser", email: "test@example.com")
        let account2 = createTestAccount(username: "testuser", email: "different@example.com")

        try await accountManager.addAccount(account1)

        do {
            try await accountManager.addAccount(account2)
            XCTFail("Should have thrown AccountError.accountAlreadyExists")
        } catch AccountError.accountAlreadyExists(let username) {
            XCTAssertEqual(username, "testuser")
        }
    }

    func testRemoveAccount() async throws {
        let account = createTestAccount(username: "testuser", email: "test@example.com")

        try await accountManager.addAccount(account)
        XCTAssertEqual(accountManager.accounts.count, 1)

        try await accountManager.removeAccount(account.id)
        XCTAssertEqual(accountManager.accounts.count, 0)
    }

    func testRemoveNonexistentAccount() async throws {
        let nonexistentId = UUID()

        do {
            try await accountManager.removeAccount(nonexistentId)
            XCTFail("Should have thrown AccountError.accountNotFound")
        } catch AccountError.accountNotFound(let id) {
            XCTAssertEqual(id, nonexistentId)
        }
    }

    func testSwitchAccount() async throws {
        let account1 = createTestAccount(username: "user1", email: "user1@example.com")
        let account2 = createTestAccount(username: "user2", email: "user2@example.com")

        try await accountManager.addAccount(account1)
        try await accountManager.addAccount(account2)

        try await accountManager.switchToAccount(account1.id, reason: .userInitiated)
        XCTAssertEqual(accountManager.currentAccount?.id, account1.id)

        try await accountManager.switchToAccount(account2.id, reason: .userInitiated)
        XCTAssertEqual(accountManager.currentAccount?.id, account2.id)
    }

    func testSwitchToNonexistentAccount() async throws {
        let nonexistentId = UUID()

        do {
            try await accountManager.switchToAccount(nonexistentId, reason: .userInitiated)
            XCTFail("Should have thrown AccountError.accountNotFound")
        } catch AccountError.accountNotFound(let id) {
            XCTAssertEqual(id, nonexistentId)
        }
    }

    func testUpdateAccount() async throws {
        let account = createTestAccount(username: "testuser", email: "test@example.com")

        try await accountManager.addAccount(account)

        let updatedAccount = Account(
            id: account.id,
            username: account.username,
            email: "updated@example.com",
            displayName: "Updated User",
            serverURL: account.serverURL,
            syncRootPath: account.syncRootPath,
            isActive: account.isActive,
            accountType: account.accountType,
            createdAt: account.createdAt,
            lastLoginAt: Date(),
            enterpriseSettings: account.enterpriseSettings
        )

        try await accountManager.updateAccount(updatedAccount)

        let retrievedAccount = accountManager.getAccount(account.id)
        XCTAssertEqual(retrievedAccount?.email, "updated@example.com")
        XCTAssertEqual(retrievedAccount?.displayName, "Updated User")
        XCTAssertNotNil(retrievedAccount?.lastLoginAt)
    }

    func testGetAccount() async throws {
        let account = createTestAccount(username: "testuser", email: "test@example.com")

        try await accountManager.addAccount(account)

        let retrievedAccount = accountManager.getAccount(account.id)
        XCTAssertNotNil(retrievedAccount)
        XCTAssertEqual(retrievedAccount?.id, account.id)

        let nonexistentAccount = accountManager.getAccount(UUID())
        XCTAssertNil(nonexistentAccount)
    }

    // MARK: - Account Validation Tests

    func testValidateValidAccount() async {
        let account = createTestAccount(username: "testuser", email: "test@example.com")

        let result = await accountManager.validateAccount(account)

        XCTAssertTrue(result.isValid)
        XCTAssertTrue(result.errors.isEmpty)
    }

    func testValidateAccountWithMissingFields() async {
        let account = Account(
            id: UUID(),
            username: "",
            email: "",
            displayName: "Test User",
            serverURL: "",
            syncRootPath: "",
            isActive: false,
            accountType: .personal,
            createdAt: Date(),
            lastLoginAt: nil,
            enterpriseSettings: nil
        )

        let result = await accountManager.validateAccount(account)

        XCTAssertFalse(result.isValid)
        XCTAssertEqual(result.errors.count, 4) // username, email, serverURL, syncRootPath

        let errorFields = result.errors.map { $0.field }
        XCTAssertTrue(errorFields.contains("username"))
        XCTAssertTrue(errorFields.contains("email"))
        XCTAssertTrue(errorFields.contains("serverURL"))
        XCTAssertTrue(errorFields.contains("syncRootPath"))
    }

    func testValidateAccountWithInvalidEmail() async {
        let account = createTestAccount(username: "testuser", email: "invalid-email")

        let result = await accountManager.validateAccount(account)

        XCTAssertFalse(result.isValid)
        XCTAssertTrue(result.errors.contains { $0.field == "email" && $0.code == "INVALID_FORMAT" })
    }

    func testValidateAccountWithInvalidServerURL() async {
        let account = Account(
            id: UUID(),
            username: "testuser",
            email: "test@example.com",
            displayName: "Test User",
            serverURL: "invalid-url",
            syncRootPath: tempDirectory.path,
            isActive: false,
            accountType: .personal,
            createdAt: Date(),
            lastLoginAt: nil,
            enterpriseSettings: nil
        )

        let result = await accountManager.validateAccount(account)

        XCTAssertFalse(result.isValid)
        XCTAssertTrue(result.errors.contains { $0.field == "serverURL" && $0.code == "INVALID_FORMAT" })
    }

    // MARK: - Account Isolation Tests

    func testCreateAccountIsolation() async throws {
        let account = createTestAccount(username: "testuser", email: "test@example.com")

        try await accountManager.createAccountIsolation(account)

        let isolation = accountManager.getAccountIsolation(account.id)
        XCTAssertNotNil(isolation)
        XCTAssertEqual(isolation?.accountId, account.id)

        // Verify directories were created
        XCTAssertTrue(FileManager.default.fileExists(atPath: isolation!.isolatedSyncPath))
        XCTAssertTrue(FileManager.default.fileExists(atPath: isolation!.isolatedDatabasePath))
        XCTAssertTrue(FileManager.default.fileExists(atPath: isolation!.isolatedCachePath))
        XCTAssertTrue(FileManager.default.fileExists(atPath: isolation!.isolatedLogPath))
        XCTAssertTrue(FileManager.default.fileExists(atPath: isolation!.isolatedConfigPath))
    }

    func testRemoveAccountIsolation() async throws {
        let account = createTestAccount(username: "testuser", email: "test@example.com")

        try await accountManager.createAccountIsolation(account)
        let isolation = accountManager.getAccountIsolation(account.id)!

        // Verify directories exist
        XCTAssertTrue(FileManager.default.fileExists(atPath: isolation.isolatedSyncPath))

        try await accountManager.removeAccountIsolation(account.id)

        // Verify directories were removed
        XCTAssertFalse(FileManager.default.fileExists(atPath: isolation.isolatedSyncPath))
        XCTAssertNil(accountManager.getAccountIsolation(account.id))
    }

    // MARK: - Enterprise Policy Tests

    func testApplyPolicies() async throws {
        let enterpriseSettings = createTestEnterpriseSettings()
        let account = createTestEnterpriseAccount(enterpriseSettings: enterpriseSettings)

        try await accountManager.addAccount(account)

        let newPolicies = [createTestPolicy(name: "New Policy", type: .dataLossPrevention)]
        try await accountManager.applyPolicies(to: account.id, policies: newPolicies)

        let updatedAccount = accountManager.getAccount(account.id)
        XCTAssertEqual(updatedAccount?.enterpriseSettings?.policies.count, 1)
        XCTAssertEqual(updatedAccount?.enterpriseSettings?.policies.first?.name, "New Policy")
    }

    func testCheckPolicyCompliance() async throws {
        let policy = createTestPolicy(name: "Upload Policy", type: .fileRestriction)
        let enterpriseSettings = createTestEnterpriseSettings(policies: [policy])
        let account = createTestEnterpriseAccount(enterpriseSettings: enterpriseSettings)

        try await accountManager.addAccount(account)

        let decision = await accountManager.checkPolicyCompliance(
            for: .fileUpload,
            accountId: account.id,
            context: ["path": "/test/file.txt"]
        )

        XCTAssertNotNil(decision)
        // Decision result depends on policy implementation
    }

    func testGetActivePolicies() async throws {
        let policy1 = createTestPolicy(name: "Policy 1", type: .dataLossPrevention, isEnabled: true)
        let policy2 = createTestPolicy(name: "Policy 2", type: .accessControl, isEnabled: false)
        let enterpriseSettings = createTestEnterpriseSettings(policies: [policy1, policy2])
        let account = createTestEnterpriseAccount(enterpriseSettings: enterpriseSettings)

        try await accountManager.addAccount(account)

        let activePolicies = accountManager.getActivePolicies(for: account.id)

        XCTAssertEqual(activePolicies.count, 1)
        XCTAssertEqual(activePolicies.first?.name, "Policy 1")
    }

    // MARK: - Account Events Tests

    func testAccountEvents() async throws {
        let account = createTestAccount(username: "testuser", email: "test@example.com")

        var receivedEvents: [AccountEvent] = []
        let eventTask = Task {
            for await event in accountManager.accountEvents {
                receivedEvents.append(event)
                if receivedEvents.count >= 3 { break } // Stop after receiving expected events
            }
        }

        // Add account
        try await accountManager.addAccount(account)

        // Switch account
        try await accountManager.switchToAccount(account.id, reason: .userInitiated)

        // Remove account
        try await accountManager.removeAccount(account.id)

        // Wait for events
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
        eventTask.cancel()

        XCTAssertGreaterThanOrEqual(receivedEvents.count, 3)

        // Verify event types
        let eventTypes = receivedEvents.map { event in
            switch event {
            case .accountAdded: return "added"
            case .accountSwitched: return "switched"
            case .accountRemoved: return "removed"
            default: return "other"
            }
        }

        XCTAssertTrue(eventTypes.contains("added"))
        XCTAssertTrue(eventTypes.contains("switched"))
        XCTAssertTrue(eventTypes.contains("removed"))
    }

    // MARK: - Data Isolation Tests

    func testAccountDataIsolation() async throws {
        let account1 = createTestAccount(username: "user1", email: "user1@example.com")
        let account2 = createTestAccount(username: "user2", email: "user2@example.com")

        try await accountManager.addAccount(account1)
        try await accountManager.addAccount(account2)

        let isolation1 = accountManager.getAccountIsolation(account1.id)!
        let isolation2 = accountManager.getAccountIsolation(account2.id)!

        // Verify isolation paths are different
        XCTAssertNotEqual(isolation1.isolatedSyncPath, isolation2.isolatedSyncPath)
        XCTAssertNotEqual(isolation1.isolatedDatabasePath, isolation2.isolatedDatabasePath)
        XCTAssertNotEqual(isolation1.isolatedCachePath, isolation2.isolatedCachePath)

        // Verify paths contain account IDs
        XCTAssertTrue(isolation1.isolatedSyncPath.contains(account1.id.uuidString))
        XCTAssertTrue(isolation2.isolatedSyncPath.contains(account2.id.uuidString))
    }

    // MARK: - Helper Methods

    private func createTestAccount(username: String, email: String, accountType: Account.AccountType = .personal) -> Account {
        return Account(
            id: UUID(),
            username: username,
            email: email,
            displayName: "\(username) Display",
            serverURL: "https://example.com",
            syncRootPath: tempDirectory.path,
            isActive: false,
            accountType: accountType,
            createdAt: Date(),
            lastLoginAt: nil,
            enterpriseSettings: nil
        )
    }

    private func createTestEnterpriseAccount(enterpriseSettings: EnterpriseSettings) -> Account {
        return Account(
            id: UUID(),
            username: "enterprise_user",
            email: "enterprise@company.com",
            displayName: "Enterprise User",
            serverURL: "https://enterprise.example.com",
            syncRootPath: tempDirectory.path,
            isActive: false,
            accountType: .enterprise,
            createdAt: Date(),
            lastLoginAt: nil,
            enterpriseSettings: enterpriseSettings
        )
    }

    private func createTestEnterpriseSettings(policies: [EnterprisePolicy] = []) -> EnterpriseSettings {
        return EnterpriseSettings(
            organizationId: "org123",
            organizationName: "Test Organization",
            domain: "company.com",
            policies: policies,
            auditingEnabled: true,
            dataRetentionDays: 365,
            allowedFileTypes: ["txt", "pdf", "docx"],
            blockedFileTypes: ["exe", "bat"],
            maxFileSizeBytes: 100_000_000, // 100MB
            encryptionRequired: true,
            offlineAccessAllowed: true,
            externalSharingAllowed: false
        )
    }

    private func createTestPolicy(name: String,
                                 type: EnterprisePolicy.PolicyType,
                                 isEnabled: Bool = true) -> EnterprisePolicy {
        let rule = PolicyRule(
            id: UUID(),
            condition: "fileUpload",
            action: .audit,
            parameters: [:]
        )

        return EnterprisePolicy(
            id: UUID(),
            name: name,
            type: type,
            rules: [rule],
            isEnabled: isEnabled,
            priority: 1,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
}
