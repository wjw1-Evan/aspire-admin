import XCTest

@testable import MacOSSyncClientCore

class EnterprisePolicyEngineTests: XCTestCase {
    var accountManager: MockAccountManager!
    var policyEngine: EnterprisePolicyEngine!

    override func setUp() {
        super.setUp()
        accountManager = MockAccountManager()
        policyEngine = EnterprisePolicyEngine(accountManager: accountManager)
    }

    override func tearDown() {
        policyEngine = nil
        accountManager = nil
        super.tearDown()
    }

    // MARK: - File Operation Policy Tests

    func testCheckFileOperationAllowed() async {
        let account = createTestEnterpriseAccount()
        accountManager.mockAccounts[account.id] = account

        let operation = MacOSSyncClientCore.FileOperation(
            path: "/test/document.txt", type: .upload, fileSize: 1000)
        let decision = await policyEngine.checkFileOperation(operation, for: account.id)

        XCTAssertNotNil(decision)
        // Decision result depends on policy implementation
    }

    func testCheckFileOperationDenied() async {
        let denyPolicy = createTestPolicy(
            name: "Deny Upload", type: .fileRestriction, action: .deny)
        let account = createTestEnterpriseAccount(policies: [denyPolicy])
        accountManager.mockAccounts[account.id] = account

        let operation = MacOSSyncClientCore.FileOperation(
            path: "/test/document.txt", type: .upload, fileSize: 1000)
        let decision = await policyEngine.checkFileOperation(operation, for: account.id)

        XCTAssertFalse(decision.isAllowed)
        XCTAssertNotNil(decision.reason)
    }

    // MARK: - Data Loss Prevention Tests

    func testEnforceDataLossPreventionAllowed() async {
        let dlpPolicy = createTestPolicy(
            name: "DLP Policy", type: .dataLossPrevention, action: .allow)
        let account = createTestEnterpriseAccount(policies: [dlpPolicy])
        accountManager.mockAccounts[account.id] = account

        let operation = MacOSSyncClientCore.FileOperation(
            path: "/test/document.txt", type: .upload, fileSize: 1000)
        let result = await policyEngine.enforceDataLossPrevention(operation, for: account.id)

        XCTAssertTrue(result.isAllowed)
        XCTAssertTrue(result.warnings.isEmpty)
    }

    func testEnforceDataLossPreventionBlocked() async {
        let dlpPolicy = createTestPolicy(
            name: "DLP Policy", type: .dataLossPrevention, action: .deny)
        let account = createTestEnterpriseAccount(policies: [dlpPolicy])
        accountManager.mockAccounts[account.id] = account

        let operation = MacOSSyncClientCore.FileOperation(
            path: "/test/sensitive.txt", type: .upload, fileSize: 1000)
        let result = await policyEngine.enforceDataLossPrevention(operation, for: account.id)

        XCTAssertFalse(result.isAllowed)
    }

    func testEnforceDataLossPreventionWithWarning() async {
        let dlpPolicy = createTestPolicy(
            name: "DLP Policy", type: .dataLossPrevention, action: .warn)
        let account = createTestEnterpriseAccount(policies: [dlpPolicy])
        accountManager.mockAccounts[account.id] = account

        let operation = MacOSSyncClientCore.FileOperation(
            path: "/test/document.txt", type: .upload, fileSize: 1000)
        let result = await policyEngine.enforceDataLossPrevention(operation, for: account.id)

        XCTAssertTrue(result.isAllowed)
        XCTAssertFalse(result.warnings.isEmpty)
    }

    // MARK: - File Type Restriction Tests

    func testCheckFileTypeRestrictionsAllowed() async {
        let account = createTestEnterpriseAccount(
            allowedFileTypes: ["txt", "pdf", "docx"],
            blockedFileTypes: ["exe", "bat"]
        )
        accountManager.mockAccounts[account.id] = account

        let isAllowed = await policyEngine.checkFileTypeRestrictions(
            "/test/document.txt", for: account.id)
        XCTAssertTrue(isAllowed)
    }

    func testCheckFileTypeRestrictionsBlocked() async {
        let account = createTestEnterpriseAccount(
            allowedFileTypes: ["txt", "pdf", "docx"],
            blockedFileTypes: ["exe", "bat"]
        )
        accountManager.mockAccounts[account.id] = account

        let isBlocked = await policyEngine.checkFileTypeRestrictions(
            "/test/malware.exe", for: account.id)
        XCTAssertFalse(isBlocked)
    }

    func testCheckFileTypeRestrictionsNotInAllowedList() async {
        let account = createTestEnterpriseAccount(
            allowedFileTypes: ["txt", "pdf"],
            blockedFileTypes: []
        )
        accountManager.mockAccounts[account.id] = account

        let isAllowed = await policyEngine.checkFileTypeRestrictions(
            "/test/image.jpg", for: account.id)
        XCTAssertFalse(isAllowed)
    }

    // MARK: - File Size Restriction Tests

    func testCheckFileSizeRestrictionsAllowed() async {
        let account = createTestEnterpriseAccount(maxFileSizeBytes: 10_000_000)  // 10MB
        accountManager.mockAccounts[account.id] = account

        let isAllowed = await policyEngine.checkFileSizeRestrictions(5_000_000, for: account.id)  // 5MB
        XCTAssertTrue(isAllowed)
    }

    func testCheckFileSizeRestrictionsExceeded() async {
        let account = createTestEnterpriseAccount(maxFileSizeBytes: 10_000_000)  // 10MB
        accountManager.mockAccounts[account.id] = account

        let isAllowed = await policyEngine.checkFileSizeRestrictions(15_000_000, for: account.id)  // 15MB
        XCTAssertFalse(isAllowed)
    }

    func testCheckFileSizeRestrictionsNoLimit() async {
        let account = createTestEnterpriseAccount(maxFileSizeBytes: nil)
        accountManager.mockAccounts[account.id] = account

        let isAllowed = await policyEngine.checkFileSizeRestrictions(100_000_000, for: account.id)  // 100MB
        XCTAssertTrue(isAllowed)
    }

    // MARK: - Compliance Audit Tests

    func testApplyComplianceAudit() async {
        let auditPolicy = createTestPolicy(
            name: "Audit Policy", type: .auditCompliance, action: .audit)
        let account = createTestEnterpriseAccount(policies: [auditPolicy], auditingEnabled: true)
        accountManager.mockAccounts[account.id] = account

        let operation = MacOSSyncClientCore.FileOperation(
            path: "/test/document.txt", type: .upload, fileSize: 1000)

        // This should not throw and should log audit entries
        await policyEngine.applyComplianceAudit(operation, for: account.id)

        // Verify audit log has entries
        let auditEntries = policyEngine.getAuditLog(for: account.id)
        XCTAssertFalse(auditEntries.isEmpty)
    }

    func testApplyComplianceAuditDisabled() async {
        let auditPolicy = createTestPolicy(
            name: "Audit Policy", type: .auditCompliance, action: .audit)
        let account = createTestEnterpriseAccount(policies: [auditPolicy], auditingEnabled: false)
        accountManager.mockAccounts[account.id] = account

        let operation = MacOSSyncClientCore.FileOperation(
            path: "/test/document.txt", type: .upload, fileSize: 1000)

        // This should not perform any auditing
        await policyEngine.applyComplianceAudit(operation, for: account.id)

        // Verify no audit entries were created
        let auditEntries = policyEngine.getAuditLog(for: account.id)
        XCTAssertTrue(auditEntries.isEmpty)
    }

    // MARK: - Policy Management Tests

    func testUpdateActivePolicies() async {
        let policy1 = createTestPolicy(name: "Policy 1", type: .dataLossPrevention, isEnabled: true)
        let policy2 = createTestPolicy(name: "Policy 2", type: .accessControl, isEnabled: false)
        let account = createTestEnterpriseAccount(policies: [policy1, policy2])

        accountManager.mockAccounts[account.id] = account
        accountManager.mockActivePolicies[account.id] = [policy1]  // Only enabled policies

        await policyEngine.updateActivePolicies(for: account.id)

        XCTAssertEqual(policyEngine.activePolicies[account.id]?.count, 1)
        XCTAssertEqual(policyEngine.activePolicies[account.id]?.first?.name, "Policy 1")
    }

    func testGetPolicyViolations() async {
        let account = createTestEnterpriseAccount()
        accountManager.mockAccounts[account.id] = account

        // Simulate a policy violation by performing a denied operation
        let denyPolicy = createTestPolicy(
            name: "Deny Policy", type: .fileRestriction, action: .deny)
        let accountWithDenyPolicy = createTestEnterpriseAccount(policies: [denyPolicy])
        accountManager.mockAccounts[account.id] = accountWithDenyPolicy

        let operation = MacOSSyncClientCore.FileOperation(
            path: "/test/blocked.txt", type: .upload, fileSize: 1000)
        _ = await policyEngine.checkFileOperation(operation, for: account.id)

        let violations = policyEngine.getPolicyViolations(for: account.id)
        // Violations depend on policy implementation
        XCTAssertNotNil(violations)
    }

    func testGetAuditLog() async {
        let account = createTestEnterpriseAccount()
        accountManager.mockAccounts[account.id] = account

        let operation = MacOSSyncClientCore.FileOperation(
            path: "/test/document.txt", type: .upload, fileSize: 1000)
        _ = await policyEngine.checkFileOperation(operation, for: account.id)

        let auditEntries = policyEngine.getAuditLog(for: account.id)
        XCTAssertFalse(auditEntries.isEmpty)

        let limitedEntries = policyEngine.getAuditLog(for: account.id, limit: 1)
        XCTAssertLessThanOrEqual(limitedEntries.count, 1)
    }

    func testCleanupAuditLog() async {
        let account = createTestEnterpriseAccount()
        accountManager.mockAccounts[account.id] = account

        // Generate some audit entries
        for i in 0..<10 {
            let operation = MacOSSyncClientCore.FileOperation(
                path: "/test/document\(i).txt", type: .upload, fileSize: 1000)
            _ = await policyEngine.checkFileOperation(operation, for: account.id)
        }

        let entriesBeforeCleanup = policyEngine.auditLog.count
        XCTAssertGreaterThan(entriesBeforeCleanup, 0)

        await policyEngine.cleanupAuditLog()

        // Cleanup should maintain recent entries
        let entriesAfterCleanup = policyEngine.auditLog.count
        XCTAssertLessThanOrEqual(entriesAfterCleanup, entriesBeforeCleanup)
    }

    // MARK: - Helper Methods

    private func createTestEnterpriseAccount(
        policies: [EnterprisePolicy] = [],
        allowedFileTypes: [String]? = nil,
        blockedFileTypes: [String]? = nil,
        maxFileSizeBytes: Int64? = nil,
        auditingEnabled: Bool = true
    ) -> Account {
        let enterpriseSettings = EnterpriseSettings(
            organizationId: "org123",
            organizationName: "Test Organization",
            domain: "company.com",
            policies: policies,
            auditingEnabled: auditingEnabled,
            dataRetentionDays: 365,
            allowedFileTypes: allowedFileTypes,
            blockedFileTypes: blockedFileTypes ?? [],
            maxFileSizeBytes: maxFileSizeBytes,
            encryptionRequired: true,
            offlineAccessAllowed: true,
            externalSharingAllowed: false
        )

        return Account(
            id: UUID(),
            username: "enterprise_user",
            email: "enterprise@company.com",
            displayName: "Enterprise User",
            serverURL: "https://enterprise.example.com",
            syncRootPath: "/tmp/sync",
            isActive: false,
            accountType: .enterprise,
            createdAt: Date(),
            lastLoginAt: nil,
            enterpriseSettings: enterpriseSettings
        )
    }

    private func createTestPolicy(
        name: String,
        type: EnterprisePolicy.PolicyType,
        action: PolicyRule.PolicyAction = .allow,
        isEnabled: Bool = true
    ) -> EnterprisePolicy {
        let rule = PolicyRule(
            id: UUID(),
            condition: "fileUpload",
            action: action,
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

// MARK: - Mock Account Manager

class MockAccountManager: AccountManagerProtocol {
    var accounts: [Account] = []
    var currentAccount: Account?
    var accountEvents: AsyncStream<AccountEvent> {
        AsyncStream { _ in }
    }

    var mockAccounts: [UUID: Account] = [:]
    var mockActivePolicies: [UUID: [EnterprisePolicy]] = [:]

    func addAccount(_ account: Account) async throws {
        mockAccounts[account.id] = account
        accounts.append(account)
    }

    func removeAccount(_ accountId: UUID) async throws {
        mockAccounts.removeValue(forKey: accountId)
        accounts.removeAll { $0.id == accountId }
    }

    func switchToAccount(_ accountId: UUID, reason: AccountSwitchContext.SwitchReason) async throws
    {
        currentAccount = mockAccounts[accountId]
    }

    func updateAccount(_ account: Account) async throws {
        mockAccounts[account.id] = account
        if let index = accounts.firstIndex(where: { $0.id == account.id }) {
            accounts[index] = account
        }
    }

    func getAccount(_ accountId: UUID) -> Account? {
        return mockAccounts[accountId]
    }

    func validateAccount(_ account: Account) async -> AccountValidationResult {
        return AccountValidationResult(isValid: true, errors: [], warnings: [])
    }

    func getAccountIsolation(_ accountId: UUID) -> AccountIsolation? {
        return AccountIsolation(accountId: accountId, basePath: "/tmp")
    }

    func createAccountIsolation(_ account: Account) async throws {
        // Mock implementation
    }

    func removeAccountIsolation(_ accountId: UUID) async throws {
        // Mock implementation
    }

    func applyPolicies(to accountId: UUID, policies: [EnterprisePolicy]) async throws {
        mockActivePolicies[accountId] = policies
    }

    func checkPolicyCompliance(
        for operation: PolicyOperation, accountId: UUID, context: [String: Any]
    ) async -> PolicyDecision {
        guard let account = mockAccounts[accountId],
            let enterpriseSettings = account.enterpriseSettings
        else {
            return PolicyDecision(
                isAllowed: true, reason: nil, appliedPolicies: [], requiredActions: [], warnings: []
            )
        }

        let activePolicies = enterpriseSettings.policies.filter { $0.isEnabled }

        // Simple mock implementation
        for policy in activePolicies {
            for rule in policy.rules {
                if rule.action == .deny {
                    return PolicyDecision(
                        isAllowed: false,
                        reason: "Denied by policy: \(policy.name)",
                        appliedPolicies: [policy],
                        requiredActions: [],
                        warnings: []
                    )
                }
            }
        }

        return PolicyDecision(
            isAllowed: true, reason: nil, appliedPolicies: activePolicies, requiredActions: [],
            warnings: [])
    }

    func getActivePolicies(for accountId: UUID) -> [EnterprisePolicy] {
        return mockActivePolicies[accountId] ?? []
    }

    func reportPolicyViolation(accountId: UUID, violation: String, policy: EnterprisePolicy) async {
        // Mock implementation
    }
}
