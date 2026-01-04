import Foundation

// MARK: - Account Models

/// 账户信息
struct Account: Codable, Identifiable {
    let id: UUID
    let username: String
    let email: String
    let displayName: String?
    let serverURL: String
    let syncRootPath: String
    let isActive: Bool
    let accountType: AccountType
    let createdAt: Date
    let lastLoginAt: Date?
    let enterpriseSettings: EnterpriseSettings?
    
    enum AccountType: String, Codable, CaseIterable {
        case personal = "personal"
        case enterprise = "enterprise"
        case shared = "shared"
    }
    
    init(
        id: UUID = UUID(),
        username: String,
        email: String,
        displayName: String? = nil,
        serverURL: String,
        syncRootPath: String,
        isActive: Bool = true,
        accountType: AccountType = .personal,
        createdAt: Date = Date(),
        lastLoginAt: Date? = nil,
        enterpriseSettings: EnterpriseSettings? = nil
    ) {
        self.id = id
        self.username = username
        self.email = email
        self.displayName = displayName
        self.serverURL = serverURL
        self.syncRootPath = syncRootPath
        self.isActive = isActive
        self.accountType = accountType
        self.createdAt = createdAt
        self.lastLoginAt = lastLoginAt
        self.enterpriseSettings = enterpriseSettings
    }
}

/// 企业设置
struct EnterpriseSettings: Codable {
    let organizationId: String
    let organizationName: String
    let domain: String
    let policies: [EnterprisePolicy]
    let auditingEnabled: Bool
    let dataRetentionDays: Int
    let allowedFileTypes: [String]?
    let blockedFileTypes: [String]
    let maxFileSizeBytes: Int64?
    let encryptionRequired: Bool
    let offlineAccessAllowed: Bool
    let externalSharingAllowed: Bool
    
    init(
        organizationId: String,
        organizationName: String,
        domain: String,
        policies: [EnterprisePolicy] = [],
        auditingEnabled: Bool = true,
        dataRetentionDays: Int = 365,
        allowedFileTypes: [String]? = nil,
        blockedFileTypes: [String] = [],
        maxFileSizeBytes: Int64? = nil,
        encryptionRequired: Bool = true,
        offlineAccessAllowed: Bool = true,
        externalSharingAllowed: Bool = false
    ) {
        self.organizationId = organizationId
        self.organizationName = organizationName
        self.domain = domain
        self.policies = policies
        self.auditingEnabled = auditingEnabled
        self.dataRetentionDays = dataRetentionDays
        self.allowedFileTypes = allowedFileTypes
        self.blockedFileTypes = blockedFileTypes
        self.maxFileSizeBytes = maxFileSizeBytes
        self.encryptionRequired = encryptionRequired
        self.offlineAccessAllowed = offlineAccessAllowed
        self.externalSharingAllowed = externalSharingAllowed
    }
}

/// 企业策略
struct EnterprisePolicy: Codable, Identifiable {
    let id: UUID
    let name: String
    let type: PolicyType
    let rules: [PolicyRule]
    let isEnabled: Bool
    let priority: Int
    let createdAt: Date
    let updatedAt: Date
    
    enum PolicyType: String, Codable, CaseIterable {
        case fileRestriction = "fileRestriction"
        case syncRestriction = "syncRestriction"
        case auditCompliance = "auditCompliance"
        case accessControl = "accessControl"
        case dataLossPrevention = "dataLossPrevention"
    }
    
    init(
        id: UUID = UUID(),
        name: String,
        type: PolicyType,
        rules: [PolicyRule] = [],
        isEnabled: Bool = true,
        priority: Int = 0,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.rules = rules
        self.isEnabled = isEnabled
        self.priority = priority
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

/// 策略规则
struct PolicyRule: Codable, Identifiable {
    let id: UUID
    let condition: String
    let action: PolicyAction
    let parameters: [String: String]
    
    enum PolicyAction: String, Codable, CaseIterable {
        case allow = "allow"
        case deny = "deny"
        case warn = "warn"
        case encrypt = "encrypt"
        case audit = "audit"
        case quarantine = "quarantine"
    }
    
    init(
        id: UUID = UUID(),
        condition: String,
        action: PolicyAction,
        parameters: [String: String] = [:]
    ) {
        self.id = id
        self.condition = condition
        self.action = action
        self.parameters = parameters
    }
}

/// 账户切换上下文
struct AccountSwitchContext: Codable {
    let timestamp: Date
    let reason: SwitchReason
    let previousAccountId: UUID?
    let targetAccountId: UUID
    let metadata: [String: String]
    
    enum SwitchReason: String, Codable {
        case userInitiated = "userInitiated"
        case automatic = "automatic"
        case policyEnforced = "policyEnforced"
        case sessionExpired = "sessionExpired"
    }
    
    init(
        timestamp: Date = Date(),
        reason: SwitchReason,
        previousAccountId: UUID? = nil,
        targetAccountId: UUID,
        metadata: [String: String] = [:]
    ) {
        self.timestamp = timestamp
        self.reason = reason
        self.previousAccountId = previousAccountId
        self.targetAccountId = targetAccountId
        self.metadata = metadata
    }
}

/// 账户隔离配置
struct AccountIsolation: Codable {
    let accountId: UUID
    let isolatedSyncPath: String
    let isolatedDatabasePath: String
    let isolatedCachePath: String
    let isolatedLogPath: String
    let isolatedConfigPath: String
    let createdAt: Date
    
    init(accountId: UUID, basePath: String) {
        self.accountId = accountId
        let accountPath = "\(basePath)/accounts/\(accountId.uuidString)"
        self.isolatedSyncPath = "\(accountPath)/sync"
        self.isolatedDatabasePath = "\(accountPath)/database"
        self.isolatedCachePath = "\(accountPath)/cache"
        self.isolatedLogPath = "\(accountPath)/logs"
        self.isolatedConfigPath = "\(accountPath)/config"
        self.createdAt = Date()
    }
}

/// 账户事件
enum AccountEvent {
    case accountAdded(Account)
    case accountRemoved(UUID)
    case accountUpdated(Account)
    case accountSwitched(from: UUID?, to: UUID, context: AccountSwitchContext)
    case policyApplied(UUID, EnterprisePolicy)
    case policyViolation(UUID, String, EnterprisePolicy)
    case isolationCreated(UUID)
    case isolationRemoved(UUID)
}

/// 策略操作类型
enum PolicyOperation: String, Codable {
    case fileUpload = "fileUpload"
    case fileDownload = "fileDownload"
    case fileDelete = "fileDelete"
    case fileShare = "fileShare"
    case folderCreate = "folderCreate"
    case dataExport = "dataExport"
}

/// 策略决策
struct PolicyDecision: Codable {
    let isAllowed: Bool
    let reason: String?
    let appliedPolicies: [EnterprisePolicy]
    let requiredActions: [PolicyRule.PolicyAction]
    let warnings: [String]
    
    init(
        isAllowed: Bool,
        reason: String? = nil,
        appliedPolicies: [EnterprisePolicy] = [],
        requiredActions: [PolicyRule.PolicyAction] = [],
        warnings: [String] = []
    ) {
        self.isAllowed = isAllowed
        self.reason = reason
        self.appliedPolicies = appliedPolicies
        self.requiredActions = requiredActions
        self.warnings = warnings
    }
}

/// 账户错误
enum AccountError: Error, LocalizedError {
    case accountNotFound(UUID)
    case accountAlreadyExists(String)
    case invalidAccountData(String)
    case invalidAccountConfiguration(String)
    case isolationCreationFailed(String)
    case isolationFailed(String)
    case policyApplicationFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .accountNotFound(let id):
            return "Account not found: \(id)"
        case .accountAlreadyExists(let username):
            return "Account already exists: \(username)"
        case .invalidAccountData(let reason):
            return "Invalid account data: \(reason)"
        case .invalidAccountConfiguration(let reason):
            return "Invalid account configuration: \(reason)"
        case .isolationCreationFailed(let reason):
            return "Failed to create account isolation: \(reason)"
        case .isolationFailed(let reason):
            return "Account isolation failed: \(reason)"
        case .policyApplicationFailed(let reason):
            return "Failed to apply policy: \(reason)"
        }
    }
}

/// 账户验证结果
struct AccountValidationResult: Codable {
    let isValid: Bool
    let errors: [ValidationError]
    let warnings: [ValidationWarning]
    
    init(isValid: Bool = true, errors: [ValidationError] = [], warnings: [ValidationWarning] = []) {
        self.isValid = isValid
        self.errors = errors
        self.warnings = warnings
    }
}

/// 验证错误
struct ValidationError: Codable {
    let field: String
    let message: String
    let code: String
    
    init(field: String, message: String, code: String) {
        self.field = field
        self.message = message
        self.code = code
    }
}

/// 验证警告
struct ValidationWarning: Codable {
    let field: String
    let message: String
    let code: String
    
    init(field: String, message: String, code: String) {
        self.field = field
        self.message = message
        self.code = code
    }
}