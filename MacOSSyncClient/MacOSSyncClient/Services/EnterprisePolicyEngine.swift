import Foundation
import OSLog

/// Enterprise policy engine for enforcing business rules and compliance
class EnterprisePolicyEngine: ObservableObject {
    private let logger = Logger(subsystem: "com.syncclient.macos", category: "EnterprisePolicyEngine")
    private let accountManager: AccountManagerProtocol
    
    // MARK: - Properties
    
    @Published private(set) var activePolicies: [UUID: [EnterprisePolicy]] = [:]
    @Published private(set) var policyViolations: [PolicyViolationRecord] = []
    @Published private(set) var auditLog: [AuditLogEntry] = []
    
    private let maxAuditLogEntries = 10000
    private let maxViolationRecords = 1000
    
    // MARK: - Initialization
    
    init(accountManager: AccountManagerProtocol) {
        self.accountManager = accountManager
        loadPolicyViolations()
        loadAuditLog()
        
        // Monitor account events
        Task {
            for await event in accountManager.accountEvents {
                await handleAccountEvent(event)
            }
        }
        
        logger.info("EnterprisePolicyEngine initialized")
    }
    
    // MARK: - Policy Enforcement
    
    /// Check if a file operation is allowed by enterprise policies
    func checkFileOperation(_ operation: FileOperation, for accountId: UUID) async -> PolicyDecision {
        let policyOperation = mapFileOperationToPolicyOperation(operation)
        let context = createFileOperationContext(operation)
        
        let decision = await accountManager.checkPolicyCompliance(
            for: policyOperation,
            accountId: accountId,
            context: context
        )
        
        // Log the policy check
        await logAuditEntry(
            accountId: accountId,
            action: "PolicyCheck",
            resource: operation.path,
            result: decision.isAllowed ? "Allowed" : "Denied",
            details: decision.reason ?? "No reason provided"
        )
        
        // If denied, record violation
        if !decision.isAllowed {
            await recordPolicyViolation(
                accountId: accountId,
                operation: operation,
                decision: decision
            )
        }
        
        return decision
    }
    
    /// Enforce data loss prevention policies
    func enforceDataLossPrevention(_ operation: FileOperation, for accountId: UUID) async -> DLPResult {
        guard let account = accountManager.getAccount(accountId),
              let enterpriseSettings = account.enterpriseSettings else {
            return DLPResult(isAllowed: true, actions: [], warnings: [])
        }
        
        let dlpPolicies = enterpriseSettings.policies.filter { 
            $0.type == .dataLossPrevention && $0.isEnabled 
        }
        
        var actions: [DLPResult.DLPAction] = []
        var warnings: [String] = []
        var isAllowed = true
        
        for policy in dlpPolicies {
            let result = await self.evaluateDLPPolicy(policy, operation: operation, account: account)
            
            if !result.isAllowed {
                isAllowed = false
            }
            
            actions.append(contentsOf: result.actions)
            warnings.append(contentsOf: result.warnings)
        }
        
        // Log DLP enforcement
        await logAuditEntry(
            accountId: accountId,
            action: "DLPEnforcement",
            resource: operation.path,
            result: isAllowed ? "Allowed" : "Blocked",
            details: "DLP policies evaluated: \(dlpPolicies.count)"
        )
        
        return DLPResult(isAllowed: isAllowed, actions: actions, warnings: warnings)
    }
    
    /// Check file type restrictions
    func checkFileTypeRestrictions(_ filePath: String, for accountId: UUID) async -> Bool {
        guard let account = accountManager.getAccount(accountId),
              let enterpriseSettings = account.enterpriseSettings else {
            return true
        }
        
        let fileExtension = URL(fileURLWithPath: filePath).pathExtension.lowercased()
        
        // Check blocked file types
        if !enterpriseSettings.blockedFileTypes.isEmpty &&
           enterpriseSettings.blockedFileTypes.contains(fileExtension) {
            await logAuditEntry(
                accountId: accountId,
                action: "FileTypeBlocked",
                resource: filePath,
                result: "Blocked",
                details: "File type '\(fileExtension)' is blocked"
            )
            return false
        }
        
        // Check allowed file types (if specified)
        if let allowedTypes = enterpriseSettings.allowedFileTypes,
           !allowedTypes.isEmpty,
           !allowedTypes.contains(fileExtension) {
            await logAuditEntry(
                accountId: accountId,
                action: "FileTypeNotAllowed",
                resource: filePath,
                result: "Blocked",
                details: "File type '\(fileExtension)' is not in allowed list"
            )
            return false
        }
        
        return true
    }
    
    /// Check file size restrictions
    func checkFileSizeRestrictions(_ fileSize: Int64, for accountId: UUID) async -> Bool {
        guard let account = accountManager.getAccount(accountId),
              let enterpriseSettings = account.enterpriseSettings,
              let maxSize = enterpriseSettings.maxFileSizeBytes else {
            return true
        }
        
        if fileSize > maxSize {
            await logAuditEntry(
                accountId: accountId,
                action: "FileSizeExceeded",
                resource: "File size: \(fileSize) bytes",
                result: "Blocked",
                details: "File size exceeds maximum allowed: \(maxSize) bytes"
            )
            return false
        }
        
        return true
    }
    
    /// Apply compliance audit requirements
    func applyComplianceAudit(_ operation: FileOperation, for accountId: UUID) async {
        guard let account = accountManager.getAccount(accountId),
              let enterpriseSettings = account.enterpriseSettings,
              enterpriseSettings.auditingEnabled else {
            return
        }
        
        let auditPolicies = enterpriseSettings.policies.filter { 
            $0.type == .auditCompliance && $0.isEnabled 
        }
        
        for policy in auditPolicies {
            await evaluateAuditPolicy(policy, operation: operation, account: account)
        }
    }
    
    // MARK: - Policy Management
    
    /// Update active policies for an account
    func updateActivePolicies(for accountId: UUID) async {
        let policies = accountManager.getActivePolicies(for: accountId)
        activePolicies[accountId] = policies
        
        logger.info("Updated active policies for account \(accountId): \(policies.count) policies")
    }
    
    /// Get policy violations for an account
    func getPolicyViolations(for accountId: UUID) -> [PolicyViolationRecord] {
        return policyViolations.filter { $0.accountId == accountId }
    }
    
    /// Get audit log entries for an account
    func getAuditLog(for accountId: UUID, limit: Int = 100) -> [AuditLogEntry] {
        return Array(auditLog.filter { $0.accountId == accountId }.prefix(limit))
    }
    
    /// Clear old audit log entries
    func cleanupAuditLog() async {
        let cutoffDate = Calendar.current.date(byAdding: .day, value: -90, to: Date()) ?? Date()
        auditLog.removeAll { $0.timestamp < cutoffDate }
        
        // Keep only the most recent entries
        if auditLog.count > maxAuditLogEntries {
            auditLog = Array(auditLog.suffix(maxAuditLogEntries))
        }
        
        saveAuditLog()
        logger.info("Audit log cleanup completed. Entries: \(self.auditLog.count)")
    }
    
    // MARK: - Private Methods
    
    private func handleAccountEvent(_ event: AccountEvent) async {
        switch event {
        case .accountAdded(let account):
            await updateActivePolicies(for: account.id)
        case .accountUpdated(let account):
            await updateActivePolicies(for: account.id)
        case .accountRemoved(let accountId):
            activePolicies.removeValue(forKey: accountId)
        case .policyApplied(let accountId, _):
            await updateActivePolicies(for: accountId)
        case .policyViolation(let accountId, let violation, let policy):
            await recordPolicyViolationEvent(accountId: accountId, violation: violation, policy: policy)
        default:
            break
        }
    }
    
    private func mapFileOperationToPolicyOperation(_ operation: FileOperation) -> PolicyOperation {
        switch operation.type {
        case .upload:
            return .fileUpload
        case .download:
            return .fileDownload
        case .delete:
            return .fileDelete
        case .share:
            return .fileShare
        case .createFolder:
            return .folderCreate
        case .export:
            return .dataExport
        }
    }
    
    private func createFileOperationContext(_ operation: FileOperation) -> [String: Any] {
        var context: [String: Any] = [
            "path": operation.path,
            "type": operation.type.rawValue,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        if let fileSize = operation.fileSize {
            context["fileSize"] = fileSize
        }
        
        if let fileExtension = operation.fileExtension {
            context["fileExtension"] = fileExtension
        }
        
        return context
    }
    
    private func evaluateDLPPolicy(_ policy: EnterprisePolicy, 
                                  operation: FileOperation, 
                                  account: Account) async -> DLPResult {
        var actions: [DLPResult.DLPAction] = []
        var warnings: [String] = []
        var isAllowed = true
        
        for rule in policy.rules {
            if await evaluatePolicyRule(rule, operation: operation, account: account) {
                switch rule.action {
                case .deny:
                    isAllowed = false
                case .encrypt:
                    actions.append(.encrypt)
                case .audit:
                    actions.append(.audit)
                case .quarantine:
                    actions.append(.quarantine)
                case .warn:
                    warnings.append("DLP Warning: \(rule.condition)")
                case .allow:
                    break
                }
            }
        }
        
        return DLPResult(isAllowed: isAllowed, actions: actions, warnings: warnings)
    }
    
    private func evaluateAuditPolicy(_ policy: EnterprisePolicy, 
                                    operation: FileOperation, 
                                    account: Account) async {
        for rule in policy.rules {
            if await evaluatePolicyRule(rule, operation: operation, account: account) {
                await logAuditEntry(
                    accountId: account.id,
                    action: "ComplianceAudit",
                    resource: operation.path,
                    result: "Audited",
                    details: "Policy: \(policy.name), Rule: \(rule.condition)"
                )
            }
        }
    }
    
    private func evaluatePolicyRule(_ rule: PolicyRule, 
                                   operation: FileOperation, 
                                   account: Account) async -> Bool {
        // Simple rule evaluation - in a real implementation, this would be more sophisticated
        let condition = rule.condition.lowercased()
        let operationType = operation.type.rawValue.lowercased()
        let filePath = operation.path.lowercased()
        
        // Check if rule applies to this operation type
        if condition.contains(operationType) {
            return true
        }
        
        // Check file extension rules
        if let fileExtension = operation.fileExtension?.lowercased(),
           condition.contains(fileExtension) {
            return true
        }
        
        // Check path-based rules
        if condition.contains("path:") {
            let pathPattern = condition.replacingOccurrences(of: "path:", with: "")
            if filePath.contains(pathPattern) {
                return true
            }
        }
        
        return false
    }
    
    private func recordPolicyViolation(accountId: UUID, 
                                      operation: FileOperation, 
                                      decision: PolicyDecision) async {
        let violation = PolicyViolationRecord(
            id: UUID(),
            accountId: accountId,
            operation: operation,
            violatedPolicies: decision.appliedPolicies,
            reason: decision.reason ?? "Policy violation",
            timestamp: Date(),
            severity: determineSeverity(decision.appliedPolicies)
        )
        
        policyViolations.append(violation)
        
        // Keep only recent violations
        if policyViolations.count > maxViolationRecords {
            policyViolations = Array(policyViolations.suffix(maxViolationRecords))
        }
        
        savePolicyViolations()
        
        logger.warning("Policy violation recorded for account \(accountId): \(violation.reason)")
    }
    
    private func recordPolicyViolationEvent(accountId: UUID, 
                                           violation: String, 
                                           policy: EnterprisePolicy) async {
        await logAuditEntry(
            accountId: accountId,
            action: "PolicyViolation",
            resource: "Policy: \(policy.name)",
            result: "Violation",
            details: violation
        )
    }
    
    private func logAuditEntry(accountId: UUID, 
                              action: String, 
                              resource: String, 
                              result: String, 
                              details: String) async {
        let entry = AuditLogEntry(
            id: UUID(),
            accountId: accountId,
            action: action,
            resource: resource,
            result: result,
            details: details,
            timestamp: Date()
        )
        
        auditLog.append(entry)
        
        // Keep only recent entries
        if auditLog.count > maxAuditLogEntries {
            auditLog = Array(auditLog.suffix(maxAuditLogEntries))
        }
        
        saveAuditLog()
    }
    
    private func determineSeverity(_ policies: [EnterprisePolicy]) -> PolicyViolationSeverity {
        let hasCriticalPolicy = policies.contains { (policy: EnterprisePolicy) in
            policy.type == .dataLossPrevention || policy.rules.contains { $0.action == .deny }
        }
        
        return hasCriticalPolicy ? .high : .medium
    }
    
    // MARK: - Persistence
    
    private func loadPolicyViolations() {
        // Implementation would load from persistent storage
        logger.debug("Policy violations loaded")
    }
    
    private func savePolicyViolations() {
        // Implementation would save to persistent storage
        logger.debug("Policy violations saved")
    }
    
    private func loadAuditLog() {
        // Implementation would load from persistent storage
        logger.debug("Audit log loaded")
    }
    
    private func saveAuditLog() {
        // Implementation would save to persistent storage
        logger.debug("Audit log saved")
    }
}

// MARK: - Supporting Types

/// File operation for policy evaluation
struct FileOperation: Codable {
    let path: String
    let type: OperationType
    let fileSize: Int64?
    let fileExtension: String?
    let timestamp: Date
    
    enum OperationType: String, Codable {
        case upload = "upload"
        case download = "download"
        case delete = "delete"
        case share = "share"
        case createFolder = "createFolder"
        case export = "export"
    }
    
    init(path: String, type: OperationType, fileSize: Int64? = nil, timestamp: Date = Date()) {
        self.path = path
        self.type = type
        self.fileSize = fileSize
        self.fileExtension = URL(fileURLWithPath: path).pathExtension.isEmpty ? nil : URL(fileURLWithPath: path).pathExtension
        self.timestamp = timestamp
    }
}

/// Data Loss Prevention result
struct DLPResult {
    let isAllowed: Bool
    let actions: [DLPAction]
    let warnings: [String]
    
    enum DLPAction: String, Codable {
        case encrypt = "encrypt"
        case audit = "audit"
        case quarantine = "quarantine"
        case notify = "notify"
        case block = "block"
    }
}

/// Policy violation record
struct PolicyViolationRecord: Identifiable, Codable {
    let id: UUID
    let accountId: UUID
    let operation: FileOperation
    let violatedPolicies: [EnterprisePolicy]
    let reason: String
    let timestamp: Date
    let severity: PolicyViolationSeverity
}

/// Policy violation severity
enum PolicyViolationSeverity: String, Codable, CaseIterable {
    case low = "low"
    case medium = "medium"
    case high = "high"
    case critical = "critical"
}

/// Audit log entry
struct AuditLogEntry: Identifiable, Codable {
    let id: UUID
    let accountId: UUID
    let action: String
    let resource: String
    let result: String
    let details: String
    let timestamp: Date
}
