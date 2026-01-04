import CryptoKit
import Foundation
import Security

/// 加密服务实现
class EncryptionService: EncryptionServiceProtocol {

    private let defaultKeyIdentifier = "com.macossync.default.encryption.key"
    private var cachedKeys: [String: SymmetricKey] = [:]
    private let keyQueue = DispatchQueue(
        label: "com.macossync.encryption.keys", attributes: .concurrent)

    init() {
        clearSensitiveData()
    }

    deinit {
        clearSensitiveData()
    }

    func encryptData(_ data: Data, with key: SymmetricKey?) async throws -> Data {
        let encryptionKey = try key ?? getDefaultKey()

        do {
            let iv = AES.GCM.Nonce()
            let sealedBox = try AES.GCM.seal(data, using: encryptionKey, nonce: iv)

            let metadata = EncryptionMetadata(iv: Data(iv))
            let metadataData = try JSONEncoder().encode(metadata)

            var result = Data()
            let metadataLength = UInt32(metadataData.count)
            result.append(withUnsafeBytes(of: metadataLength.bigEndian) { Data($0) })
            result.append(metadataData)
            result.append(sealedBox.combined!)

            return result
        } catch {
            throw EncryptionError.encryptionFailed
        }
    }

    func decryptData(_ encryptedData: Data, with key: SymmetricKey?) async throws -> Data {
        let decryptionKey = try key ?? getDefaultKey()

        guard encryptedData.count > 4 else {
            throw EncryptionError.invalidData
        }

        do {
            let metadataLengthData = encryptedData.prefix(4)
            let metadataLength = metadataLengthData.withUnsafeBytes {
                $0.load(as: UInt32.self).bigEndian
            }

            guard encryptedData.count > 4 + Int(metadataLength) else {
                throw EncryptionError.invalidData
            }

            let metadataData = encryptedData.subdata(in: 4..<(4 + Int(metadataLength)))
            let metadata = try JSONDecoder().decode(EncryptionMetadata.self, from: metadataData)

            let encryptedPayload = encryptedData.subdata(
                in: (4 + Int(metadataLength))..<encryptedData.count)
            let nonce = try AES.GCM.Nonce(data: metadata.iv!)
            let sealedBox = try AES.GCM.SealedBox(combined: encryptedPayload)
            let decryptedData = try AES.GCM.open(sealedBox, using: decryptionKey)

            return decryptedData
        } catch {
            throw EncryptionError.decryptionFailed
        }
    }

    func encryptFile(from sourceURL: URL, to destinationURL: URL, with key: SymmetricKey?)
        async throws
    {
        guard FileManager.default.fileExists(atPath: sourceURL.path) else {
            throw EncryptionError.fileNotFound(sourceURL)
        }

        do {
            let data = try Data(contentsOf: sourceURL)
            let encryptedData = try await self.encryptData(data, with: key)
            try encryptedData.write(to: destinationURL)
        } catch let error as EncryptionError {
            throw error
        } catch {
            throw EncryptionError.fileAccessError(sourceURL)
        }
    }

    func decryptFile(from sourceURL: URL, to destinationURL: URL, with key: SymmetricKey?)
        async throws
    {
        guard FileManager.default.fileExists(atPath: sourceURL.path) else {
            throw EncryptionError.fileNotFound(sourceURL)
        }

        do {
            let encryptedData = try Data(contentsOf: sourceURL)
            let decryptedData = try await self.decryptData(encryptedData, with: key)
            try decryptedData.write(to: destinationURL)
        } catch let error as EncryptionError {
            throw error
        } catch {
            throw EncryptionError.fileAccessError(sourceURL)
        }
    }

    func generateSymmetricKey() -> SymmetricKey {
        return SymmetricKey(size: .bits256)
    }

    func deriveKey(from password: String, salt: Data?) -> (key: SymmetricKey, salt: Data) {
        let usedSalt = salt ?? Data((0..<32).map { _ in UInt8.random(in: 0...255) })

        guard let passwordData = password.data(using: .utf8) else {
            return (generateSymmetricKey(), usedSalt)
        }

        let derivedKey = HKDF<SHA256>.deriveKey(
            inputKeyMaterial: SymmetricKey(data: passwordData),
            salt: usedSalt,
            outputByteCount: 32
        )

        return (derivedKey, usedSalt)
    }

    func storeKey(_ key: SymmetricKey, with identifier: String) throws {
        let keyData = key.withUnsafeBytes { Data($0) }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: identifier,
            kSecAttrService as String: "MacOSSyncClient",
            kSecValueData as String: keyData,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]

        SecItemDelete(query as CFDictionary)

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw EncryptionError.keychainError(status)
        }

        keyQueue.async(flags: .barrier) {
            self.cachedKeys[identifier] = key
        }
    }

    func retrieveKey(with identifier: String) throws -> SymmetricKey? {
        return try keyQueue.sync {
            if let cachedKey = cachedKeys[identifier] {
                return cachedKey
            }

            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: identifier,
                kSecAttrService as String: "MacOSSyncClient",
                kSecReturnData as String: true,
                kSecMatchLimit as String: kSecMatchLimitOne,
            ]

            var result: AnyObject?
            let status = SecItemCopyMatching(query as CFDictionary, &result)

            guard status == errSecSuccess else {
                if status == errSecItemNotFound {
                    return nil
                }
                throw EncryptionError.keychainError(status)
            }

            guard let keyData = result as? Data else {
                throw EncryptionError.invalidData
            }

            let key = SymmetricKey(data: keyData)
            cachedKeys[identifier] = key
            return key
        }
    }

    func deleteKey(with identifier: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: identifier,
            kSecAttrService as String: "MacOSSyncClient",
        ]

        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw EncryptionError.keychainError(status)
        }

        keyQueue.async(flags: .barrier) {
            self.cachedKeys.removeValue(forKey: identifier)
        }
    }

    func computeHash(for data: Data) -> String {
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }

    func computeFileHash(at url: URL) async throws -> String {
        guard FileManager.default.fileExists(atPath: url.path) else {
            throw EncryptionError.fileNotFound(url)
        }

        do {
            let data = try Data(contentsOf: url)
            return computeHash(for: data)
        } catch {
            throw EncryptionError.fileAccessError(url)
        }
    }

    func verifyIntegrity(of data: Data, expectedHash: String) -> Bool {
        let actualHash = computeHash(for: data)
        return actualHash.lowercased() == expectedHash.lowercased()
    }

    func verifyFileIntegrity(at url: URL, expectedHash: String) async throws -> Bool {
        let actualHash = try await computeFileHash(at: url)
        return actualHash.lowercased() == expectedHash.lowercased()
    }

    func clearSensitiveData() {
        keyQueue.sync(flags: .barrier) {
            self.cachedKeys.removeAll()
        }
    }

    func secureDeleteFile(at url: URL) throws {
        guard FileManager.default.fileExists(atPath: url.path) else {
            return
        }

        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            guard let fileSize = attributes[.size] as? Int64, fileSize > 0 else {
                try FileManager.default.removeItem(at: url)
                return
            }

            let randomData = Data((0..<Int(fileSize)).map { _ in UInt8.random(in: 0...255) })
            try randomData.write(to: url)

            let zeroData = Data(repeating: 0, count: Int(fileSize))
            try zeroData.write(to: url)

            try FileManager.default.removeItem(at: url)
        } catch {
            throw EncryptionError.fileAccessError(url)
        }
    }

    private func getDefaultKey() throws -> SymmetricKey {
        if let existingKey = try retrieveKey(with: defaultKeyIdentifier) {
            return existingKey
        }

        let newKey = generateSymmetricKey()
        try storeKey(newKey, with: defaultKeyIdentifier)
        return newKey
    }
}
