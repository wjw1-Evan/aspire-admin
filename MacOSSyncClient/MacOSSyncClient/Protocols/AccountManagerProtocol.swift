import Foundation

/// Protocol for managing multiple user accounts
protocol AccountManagerProtocol: AnyObject {
    // MARK: - Account Management
    
    /// All registered accounts
    var accounts: [Account] { get }
    
    /// Currently active account
    var currentAccount: Account? { get }
    
    /// Account events stream
    var accountEvents: AsyncStream<AccountEvent> { get }
    
    /// Add a new account
    /// - Parameter account: The account to add
    /// - Throws: AccountError if account cannot be added
    func addAccount(_ account: Account) async throws
    
    /// Remove an account
    /// - Parameter accountId: ID of the account to remove
    /// - Throws: AccountError if account cannot be removed
    func removeAccount(_ accountId: UUID) async throws
    
    /// Switch to a different account
    /// - Parameters:
    ///   - accountId: ID of the account to switch to
    ///   - reason: Reason for the switch
    /// - Throws: AccountError if switch fails
    func switchToAccount(_ accountId: UUID, reason: AccountSwitchContext.SwitchReason) async throws
    
    /// Update account information
    /// - Parameter account: Updated account information
    /// - Throws: AccountError if update fails
    func updateAccount(_ account: Account) async throws
    
    /// Get account by ID
    /// - Parameter accountId: Account ID
    /// - Returns: Account if found, nil otherwise
    func getAccount(_ accountId: UUID) -> Account?
    
    /// Validate account configuration
    /// - Parameter account: Account to validate
    /// - Returns: Validation result
    func validateAccount(_ account: Account) async -> AccountValidationResult
    
    // MARK: - Account Isolation
    
    /// Get isolation configuration for an account
    /// - Parameter accountId: Account ID
    /// - Returns: Isolation configuration
    func getAccountIsolation(_ accountId: UUID) -> AccountIsolation?
    
    /// Create isolated environment for account
    /// - Parameter account: Account to create isolation for
    /// - Throws: AccountError if isolation cannot be created
    func createAccountIsolation(_ account: Account) async throws
    
    /// Remove isolated environment for account
    /// - Parameter accountId: Account ID
    /// - Throws: AccountError if isolation cannot be removed
    func removeAccountIsolation(_ accountId: UUID) async throws
    
    // MARK: - Enterprise Policy Management
    
    /// Apply enterprise policies to an account
    /// - Parameters:
    ///   - accountId: Account ID
    ///   - policies: Policies to apply
    /// - Throws: PolicyError if policies cannot be applied
    func applyPolicies(to accountId: UUID, policies: [EnterprisePolicy]) async throws
    
    /// Check if operation is allowed by enterprise policies
    /// - Parameters:
    ///   - operation: Operation to check
    ///   - accountId: Account ID
    ///   - context: Additional context for policy evaluation
    /// - Returns: Policy decision
    func checkPolicyCompliance(for operation: PolicyOperation, 
                              accountId: UUID, 
                              context: [String: Any]) async -> PolicyDecision
    
    /// Get active policies for an account
    /// - Parameter accountId: Account ID
    /// - Returns: Active policies
    func getActivePolicies(for accountId: UUID) -> [EnterprisePolicy]
    
    /// Report policy violation
    /// - Parameters:
    ///   - accountId: Account ID
    ///   - violation: Violation details
    ///   - policy: Violated policy
    func reportPolicyViolation(accountId: UUID, violation: String, policy: EnterprisePolicy) async
}

// MARK: - Supporting Types

// AccountError is defined in AccountModels.swift
// PolicyOperation is defined in AccountModels.swift
// PolicyDecision is defined in AccountModels.swift
