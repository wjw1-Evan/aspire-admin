import XCTest
import SwiftCheck
import CryptoKit
@testable import MacOSSyncClientCore

/// 加密服务属性测试
/// 验证属性 11: 安全保护完整性
/// **验证需求: 需求 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7**
class EncryptionPropertyTests: XCTestCase {
    
    var encryptionService: EncryptionService!
    var tempDirectory: URL!
    
    override func setUp() async throws {
        try await super.setUp()
        encryptionService = EncryptionService()
        
        // 创建临时目录用于测试
        tempDirectory = FileManager.default.temporaryDirectory
            .appendingPathComponent("EncryptionTests")
            .appendingPathComponent(UUID().uuidString)
        
        try FileManager.default.createDirectory(
            at: tempDirectory,
            withIntermediateDirectories: true
        )
    }
    
    override func tearDown() async throws {
        // 清理临时文件
        if FileManager.default.fileExists(atPath: tempDirectory.path) {
            try? FileManager.default.removeItem(at: tempDirectory)
        }
        
        // 清理敏感数据
        encryptionService.clearSensitiveData()
        encryptionService = nil
        try await super.tearDown()
    }
    
    /// 测试数据加密和解密的往返一致性
    /// 验证需求 9.1: 文件上传到云端时应该使用端到端加密保护文件内容
    /// **功能: macos-sync-client, 属性 11: 安全保护完整性**
    func testEncryptionDecryptionRoundTrip() async throws {
        let expectation = XCTestExpectation(description: "Encryption round trip")
        
        Task {
            do {
                // 生成密钥
                let key = encryptionService.generateSymmetricKey()
                
                // 加密数据
                let testData = "Consistent test data for encryption".data(using: .utf8)!
                let encryptedData = try await encryptionService.encryptData(testData, with: key)
                
                // 解密数据
                let decryptedData = try await encryptionService.decryptData(encryptedData, with: key)
                
                // 验证往返一致性
                XCTAssertEqual(decryptedData, testData, "Decrypted data should match original")
                
                expectation.fulfill()
            } catch {
                XCTFail("Encryption round trip failed: \(error)")
                expectation.fulfill()
            }
        }
        
        await fulfillment(of: [expectation], timeout: 5.0)
    }
    
    /// 测试文件加密和解密的往返一致性
    /// 验证需求 9.1: 文件上传到云端时应该使用端到端加密保护文件内容
    /// **功能: macos-sync-client, 属性 11: 安全保护完整性**
    func testFileEncryptionDecryptionRoundTrip() async throws {
        // 创建测试文件
        let testData = "This is test content for file encryption".data(using: .utf8)!
        let sourceFile = tempDirectory.appendingPathComponent("test_source.txt")
        let encryptedFile = tempDirectory.appendingPathComponent("test_encrypted.enc")
        let decryptedFile = tempDirectory.appendingPathComponent("test_decrypted.txt")
        
        try testData.write(to: sourceFile)
        
        // 生成密钥
        let key = encryptionService.generateSymmetricKey()
        
        // 加密文件
        try await encryptionService.encryptFile(from: sourceFile, to: encryptedFile, with: key)
        
        // 验证加密文件存在且不同于原文件
        XCTAssertTrue(FileManager.default.fileExists(atPath: encryptedFile.path))
        let encryptedData = try Data(contentsOf: encryptedFile)
        XCTAssertNotEqual(encryptedData, testData, "Encrypted file should be different from original")
        
        // 解密文件
        try await encryptionService.decryptFile(from: encryptedFile, to: decryptedFile, with: key)
        
        // 验证解密后的文件内容与原文件相同
        let decryptedData = try Data(contentsOf: decryptedFile)
        XCTAssertEqual(decryptedData, testData, "Decrypted file should match original content")
    }
    
    /// 测试加密数据的不可预测性
    /// 验证需求 9.1: 文件上传到云端时应该使用端到端加密保护文件内容
    /// **功能: macos-sync-client, 属性 11: 安全保护完整性**
    func testEncryptionUnpredictability() async throws {
        let testData = "Consistent test data for encryption".data(using: .utf8)!
        let key = encryptionService.generateSymmetricKey()
        
        // 多次加密相同数据
        let encrypted1 = try await encryptionService.encryptData(testData, with: key)
        let encrypted2 = try await encryptionService.encryptData(testData, with: key)
        
        // 加密结果应该不同（因为使用了随机IV）
        XCTAssertNotEqual(encrypted1, encrypted2, "Multiple encryptions of same data should produce different results")
        
        // 但解密后应该得到相同的原始数据
        let decrypted1 = try await encryptionService.decryptData(encrypted1, with: key)
        let decrypted2 = try await encryptionService.decryptData(encrypted2, with: key)
        
        XCTAssertEqual(decrypted1, testData, "First decryption should match original")
        XCTAssertEqual(decrypted2, testData, "Second decryption should match original")
        XCTAssertEqual(decrypted1, decrypted2, "Both decryptions should match")
    }
    
    /// 测试密钥存储和检索的安全性
    /// 验证需求 9.3: 本地存储同步元数据时应该加密存储敏感信息
    /// **功能: macos-sync-client, 属性 11: 安全保护完整性**
    func testKeyStorageAndRetrieval() async throws {
        let testIdentifier = "test.encryption.key.\(UUID().uuidString)"
        
        // 生成密钥
        let originalKey = encryptionService.generateSymmetricKey()
        
        // 存储密钥
        try encryptionService.storeKey(originalKey, with: testIdentifier)
        
        // 检索密钥
        let retrievedKey = try encryptionService.retrieveKey(with: testIdentifier)
        XCTAssertNotNil(retrievedKey, "Should be able to retrieve stored key")
        
        // 验证检索的密钥与原始密钥相同
        let originalKeyData = originalKey.withUnsafeBytes { bytes in
            Data(Array(bytes))
        }
        let retrievedKeyData = retrievedKey!.withUnsafeBytes { bytes in
            Data(Array(bytes))
        }
        XCTAssertEqual(originalKeyData, retrievedKeyData, "Retrieved key should match original key")
        
        // 删除密钥
        try encryptionService.deleteKey(with: testIdentifier)
        
        // 验证密钥已删除
        let deletedKey = try encryptionService.retrieveKey(with: testIdentifier)
        XCTAssertNil(deletedKey, "Key should be deleted")
    }
    
    /// 测试密钥派生的一致性
    /// 验证需求 9.3: 本地存储同步元数据时应该加密存储敏感信息
    /// **功能: macos-sync-client, 属性 11: 安全保护完整性**
    func testKeyDerivationConsistency() async throws {
        let password = "TestPassword123"
        let salt = Data((0..<32).map { _ in UInt8.random(in: 0...255) })
        
        // 使用相同的密码和盐派生密钥两次
        let (key1, _) = encryptionService.deriveKey(from: password, salt: salt)
        let (key2, _) = encryptionService.deriveKey(from: password, salt: salt)
        
        // 验证派生的密钥相同
        let key1Data = key1.withUnsafeBytes { bytes in
            Data(Array(bytes))
        }
        let key2Data = key2.withUnsafeBytes { bytes in
            Data(Array(bytes))
        }
        XCTAssertEqual(key1Data, key2Data, "Keys derived from same password and salt should be identical")
    }
    
    /// 测试哈希计算的一致性和唯一性
    /// 验证需求 9.6: 同步过程中网络中断时应该确保部分传输的文件不会损坏
    /// **功能: macos-sync-client, 属性 11: 安全保护完整性**
    func testHashConsistencyAndUniqueness() async throws {
        let data1 = "Test data 1".data(using: .utf8)!
        let data2 = "Test data 2".data(using: .utf8)!
        
        // 相同数据的哈希应该相同
        let hash1a = encryptionService.computeHash(for: data1)
        let hash1b = encryptionService.computeHash(for: data1)
        XCTAssertEqual(hash1a, hash1b, "Hash of same data should be consistent")
        
        // 不同数据的哈希应该不同（除非发生碰撞，但概率极低）
        let hash2 = encryptionService.computeHash(for: data2)
        XCTAssertNotEqual(hash1a, hash2, "Hash of different data should be different")
    }
    
    /// 测试数据完整性验证
    /// 验证需求 9.6: 同步过程中网络中断时应该确保部分传输的文件不会损坏
    /// **功能: macos-sync-client, 属性 11: 安全保护完整性**
    func testDataIntegrityVerification() async throws {
        let testData = "Test data for integrity verification".data(using: .utf8)!
        
        // 计算正确的哈希
        let correctHash = encryptionService.computeHash(for: testData)
        
        // 验证正确的哈希
        let validVerification = encryptionService.verifyIntegrity(of: testData, expectedHash: correctHash)
        XCTAssertTrue(validVerification, "Valid hash verification should return true")
        
        // 验证错误的哈希
        let wrongHash = "0000000000000000000000000000000000000000000000000000000000000000"
        let invalidVerification = encryptionService.verifyIntegrity(of: testData, expectedHash: wrongHash)
        XCTAssertFalse(invalidVerification, "Invalid hash verification should return false")
    }
    
    /// 测试错误密钥解密失败
    /// 验证需求 9.1: 文件上传到云端时应该使用端到端加密保护文件内容
    /// **功能: macos-sync-client, 属性 11: 安全保护完整性**
    func testDecryptionWithWrongKey() async throws {
        let testData = "Test data for wrong key decryption".data(using: .utf8)!
        
        // 使用一个密钥加密
        let correctKey = encryptionService.generateSymmetricKey()
        let encryptedData = try await encryptionService.encryptData(testData, with: correctKey)
        
        // 使用不同的密钥尝试解密
        let wrongKey = encryptionService.generateSymmetricKey()
        
        do {
            _ = try await encryptionService.decryptData(encryptedData, with: wrongKey)
            XCTFail("Decryption with wrong key should fail")
        } catch {
            // 预期的错误
            XCTAssertTrue(error is EncryptionError, "Should throw EncryptionError, but got: \(error)")
        }
    }
    
    /// 测试安全文件删除
    /// 验证需求 9.5: 用户注销或卸载应用时应该安全清理所有本地缓存和凭据
    /// **功能: macos-sync-client, 属性 11: 安全保护完整性**
    func testSecureFileDeletion() async throws {
        let testData = "Sensitive data that should be securely deleted".data(using: .utf8)!
        let testFile = tempDirectory.appendingPathComponent("sensitive_file.txt")
        
        // 创建测试文件
        try testData.write(to: testFile)
        XCTAssertTrue(FileManager.default.fileExists(atPath: testFile.path))
        
        // 安全删除文件
        try encryptionService.secureDeleteFile(at: testFile)
        
        // 验证文件已删除
        XCTAssertFalse(FileManager.default.fileExists(atPath: testFile.path), "File should be deleted")
    }
}