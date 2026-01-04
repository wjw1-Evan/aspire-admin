import Foundation
import CryptoKit

/// 加密服务协议
protocol EncryptionServiceProtocol {
    
    // MARK: - 文件加密
    
    /// 加密文件数据
    func encryptData(_ data: Data, with key: SymmetricKey?) async throws -> Data
    
    /// 解密文件数据
    func decryptData(_ encryptedData: Data, with key: SymmetricKey?) async throws -> Data
    
    /// 加密文件
    func encryptFile(from sourceURL: URL, to destinationURL: URL, with key: SymmetricKey?) async throws
    
    /// 解密文件
    func decryptFile(from sourceURL: URL, to destinationURL: URL, with key: SymmetricKey?) async throws
    
    // MARK: - 密钥管理
    
    /// 生成新的对称密钥
    func generateSymmetricKey() -> SymmetricKey
    
    /// 从密码派生密钥
    func deriveKey(from password: String, salt: Data?) -> (key: SymmetricKey, salt: Data)
    
    /// 安全存储密钥到钥匙串
    func storeKey(_ key: SymmetricKey, with identifier: String) throws
    
    /// 从钥匙串检索密钥
    func retrieveKey(with identifier: String) throws -> SymmetricKey?
    
    /// 从钥匙串删除密钥
    func deleteKey(with identifier: String) throws
    
    // MARK: - 哈希和验证
    
    /// 计算数据的哈希值
    func computeHash(for data: Data) -> String
    
    /// 计算文件的哈希值
    func computeFileHash(at url: URL) async throws -> String
    
    /// 验证数据完整性
    func verifyIntegrity(of data: Data, expectedHash: String) -> Bool
    
    /// 验证文件完整性
    func verifyFileIntegrity(at url: URL, expectedHash: String) async throws -> Bool
    
    // MARK: - 安全清理
    
    /// 安全清理内存中的敏感数据
    func clearSensitiveData()
    
    /// 安全删除文件
    func secureDeleteFile(at url: URL) throws
}

/// 加密错误类型
enum EncryptionError: Error, LocalizedError {
    case keyGenerationFailed
    case keyDerivationFailed
    case encryptionFailed
    case decryptionFailed
    case keyNotFound(String)
    case keychainError(OSStatus)
    case invalidData
    case fileNotFound(URL)
    case fileAccessError(URL)
    case hashComputationFailed
    case integrityVerificationFailed
    
    var errorDescription: String? {
        switch self {
        case .keyGenerationFailed:
            return "Failed to generate encryption key"
        case .keyDerivationFailed:
            return "Failed to derive key from password"
        case .encryptionFailed:
            return "Failed to encrypt data"
        case .decryptionFailed:
            return "Failed to decrypt data"
        case .keyNotFound(let identifier):
            return "Encryption key not found: \(identifier)"
        case .keychainError(let status):
            return "Keychain error: \(status)"
        case .invalidData:
            return "Invalid data format"
        case .fileNotFound(let url):
            return "File not found: \(url.path)"
        case .fileAccessError(let url):
            return "Cannot access file: \(url.path)"
        case .hashComputationFailed:
            return "Failed to compute hash"
        case .integrityVerificationFailed:
            return "Data integrity verification failed"
        }
    }
}

/// 加密元数据
struct EncryptionMetadata: Codable {
    let algorithm: String
    let keyDerivation: String?
    let salt: Data?
    let iv: Data?
    let timestamp: Date
    
    init(
        algorithm: String = "AES-GCM",
        keyDerivation: String? = nil,
        salt: Data? = nil,
        iv: Data? = nil,
        timestamp: Date = Date()
    ) {
        self.algorithm = algorithm
        self.keyDerivation = keyDerivation
        self.salt = salt
        self.iv = iv
        self.timestamp = timestamp
    }
}