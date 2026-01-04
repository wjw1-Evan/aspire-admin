import XCTest
import Foundation
@testable import MacOSSyncClientCore

/// CloudAPIService 单元测试
/// 测试基本配置和初始化
class CloudAPIServiceTests: XCTestCase {

    var apiService: CloudAPIService!

    override func setUp() {
        super.setUp()

        // 使用测试配置
        let testConfig = CloudAPIService.Configuration(
            baseURL: "https://test-api.example.com/v1",
            timeout: 10.0,
            maxRetryAttempts: 2,
            retryDelay: 0.1
        )

        apiService = CloudAPIService(configuration: testConfig)
    }

    override func tearDown() {
        apiService = nil
        super.tearDown()
    }

    // MARK: - Configuration Tests

    func testCloudAPIServiceInitialization() {
        // Given
        let config = CloudAPIService.Configuration(
            baseURL: "https://api.example.com/v1",
            timeout: 30.0,
            maxRetryAttempts: 3,
            retryDelay: 1.0
        )

        // When
        let service = CloudAPIService(configuration: config)

        // Then
        XCTAssertNotNil(service)
    }

    func testDefaultConfiguration() {
        // Given & When
        let defaultConfig = CloudAPIService.Configuration.default
        let expectedBaseURL = ProcessInfo.processInfo.environment["SYNC_API_BASE_URL"] ?? "http://localhost:15000/api"

        // Then
        XCTAssertEqual(defaultConfig.baseURL, expectedBaseURL)
        XCTAssertEqual(defaultConfig.timeout, 30.0)
        XCTAssertEqual(defaultConfig.maxRetryAttempts, 3)
        XCTAssertEqual(defaultConfig.retryDelay, 1.0)
    }

    // MARK: - Authentication Tests

    func testAuthenticateSuccessReturnsToken() async throws {
        // Given
        let mockResponseDate = ISO8601DateFormatter().date(from: "2026-01-04T00:00:00Z")!
        let responseBody = """
        {"success":true,"data":{"token":"access-token","refreshToken":"refresh-token","expiresAt":"2026-01-04T00:00:00Z"}}
        """.data(using: .utf8)!

        MockURLProtocol.requestHandler = { request in
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertEqual(request.url?.path, "/api/auth/login")
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, responseBody)
        }

        let sessionConfig = URLSessionConfiguration.ephemeral
        sessionConfig.protocolClasses = [MockURLProtocol.self]
        let session = URLSession(configuration: sessionConfig)

        let config = CloudAPIService.Configuration(
            baseURL: "https://example.com/api",
            timeout: 5,
            maxRetryAttempts: 1,
            retryDelay: 0.1
        )
        let service = CloudAPIService(configuration: config, session: session, preloadDefaultToken: false)

        // When
        let token = try await service.authenticate(credentials: AuthCredentials(username: "admin", password: "admin123"))

        // Then
        XCTAssertEqual(token.accessToken, "access-token")
        XCTAssertEqual(token.refreshToken, "refresh-token")
        XCTAssertEqual(token.expiresAt, mockResponseDate)
        XCTAssertEqual(token.tokenType, "Bearer")
    }

    func testAuthenticateInvalidCredentials() async {
        // Given
        MockURLProtocol.requestHandler = { request in
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 401,
                httpVersion: nil,
                headerFields: nil
            )!
            return (response, Data())
        }

        let sessionConfig = URLSessionConfiguration.ephemeral
        sessionConfig.protocolClasses = [MockURLProtocol.self]
        let session = URLSession(configuration: sessionConfig)

        let config = CloudAPIService.Configuration(
            baseURL: "https://example.com/api",
            timeout: 5,
            maxRetryAttempts: 1,
            retryDelay: 0.1
        )
        let service = CloudAPIService(configuration: config, session: session, preloadDefaultToken: false)

        // When/Then
        do {
            _ = try await service.authenticate(credentials: AuthCredentials(username: "bad", password: "bad"))
            XCTFail("Expected invalidCredentials error")
        } catch {
            guard case CloudAPIError.invalidCredentials = error else {
                return XCTFail("Expected invalidCredentials, got \(error)")
            }
        }
    }

    // MARK: - Model Tests

    func testAuthCredentialsCreation() {
        // Given
        let username = "testuser"
        let password = "testpass"

        // When
        let credentials = AuthCredentials(username: username, password: password)

        // Then
        XCTAssertEqual(credentials.username, username)
        XCTAssertEqual(credentials.password, password)
        XCTAssertNil(credentials.token)
        XCTAssertNil(credentials.refreshToken)
    }

    func testAuthTokenCreation() {
        // Given
        let accessToken = "access_token"
        let refreshToken = "refresh_token"
        let expiresAt = Date().addingTimeInterval(3600)
        let tokenType = "Bearer"

        // When
        let token = AuthToken(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: expiresAt,
            tokenType: tokenType
        )

        // Then
        XCTAssertEqual(token.accessToken, accessToken)
        XCTAssertEqual(token.refreshToken, refreshToken)
        XCTAssertEqual(token.expiresAt, expiresAt)
        XCTAssertEqual(token.tokenType, tokenType)
        XCTAssertFalse(token.isExpired)
        XCTAssertEqual(token.authorizationHeader, "Bearer access_token")
    }

    func testAuthTokenExpiration() {
        // Given
        let expiredToken = AuthToken(
            accessToken: "expired_token",
            refreshToken: "refresh_token",
            expiresAt: Date().addingTimeInterval(-3600), // 1 hour ago
            tokenType: "Bearer"
        )

        let expiringSoonToken = AuthToken(
            accessToken: "expiring_token",
            refreshToken: "refresh_token",
            expiresAt: Date().addingTimeInterval(60), // 1 minute from now
            tokenType: "Bearer"
        )

        // Then
        XCTAssertTrue(expiredToken.isExpired)
        XCTAssertTrue(expiringSoonToken.isExpiringSoon)
    }

    // MARK: - Error Tests

    func testCloudAPIErrorDescriptions() {
        // Test error descriptions
        let errors: [CloudAPIError] = [
            .invalidURL,
            .invalidCredentials,
            .tokenExpired,
            .networkError(URLError(.notConnectedToInternet)),
            .serverError(500, "Internal Server Error"),
            .fileNotFound("/test/file.txt"),
            .folderNotFound("/test/folder"),
            .quotaExceeded,
            .rateLimitExceeded,
            .uploadFailed("Network error"),
            .downloadFailed("Disk full"),
            .webSocketConnectionFailed,
            .invalidResponse,
            .parsingError(NSError(domain: "test", code: 1, userInfo: nil))
        ]

        for error in errors {
            XCTAssertNotNil(error.errorDescription)
            XCTAssertFalse(error.errorDescription!.isEmpty)
        }
    }

    // MARK: - WebSocket Connection State Tests

    func testWebSocketConnectionStateDisplayNames() {
        let states: [WebSocketConnectionState] = [.connecting, .connected, .disconnected, .error]

        for state in states {
            XCTAssertFalse(state.displayName.isEmpty)
        }

        XCTAssertEqual(WebSocketConnectionState.connecting.displayName, "Connecting")
        XCTAssertEqual(WebSocketConnectionState.connected.displayName, "Connected")
        XCTAssertEqual(WebSocketConnectionState.disconnected.displayName, "Disconnected")
        XCTAssertEqual(WebSocketConnectionState.error.displayName, "Error")
    }

    // MARK: - CloudFile Tests

    func testCloudFileProperties() {
        // Given
        let cloudFile = CloudFile(
            id: "test-id",
            name: "document.pdf",
            path: "/documents/document.pdf",
            size: 2048,
            modifiedDate: Date(),
            hash: "abc123",
            mimeType: "application/pdf"
        )

        // Then
        XCTAssertEqual(cloudFile.fileExtension, "pdf")
        XCTAssertFalse(cloudFile.isImage)
        XCTAssertTrue(cloudFile.isDocument)
        XCTAssertTrue(cloudFile.formattedSize.contains("2"))
    }

    func testCloudFileImageDetection() {
        // Given
        let imageFile = CloudFile(
            id: "image-id",
            name: "photo.jpg",
            path: "/photos/photo.jpg",
            size: 1024,
            modifiedDate: Date(),
            hash: "image123",
            mimeType: "image/jpeg"
        )

        // Then
        XCTAssertTrue(imageFile.isImage)
        XCTAssertFalse(imageFile.isDocument)
        XCTAssertEqual(imageFile.fileExtension, "jpg")
    }

    // MARK: - CloudFolder Tests

    func testCloudFolderCreation() {
        // Given
        let folder = CloudFolder(
            id: "folder-id",
            name: "Documents",
            path: "/Documents",
            modifiedDate: Date(),
            itemCount: 5
        )

        // Then
        XCTAssertEqual(folder.name, "Documents")
        XCTAssertEqual(folder.path, "/Documents")
        XCTAssertEqual(folder.itemCount, 5)
    }

    // MARK: - CloudItem Tests

    func testCloudItemFile() {
        // Given
        let file = CloudFile(
            id: "file-id",
            name: "test.txt",
            path: "/test.txt",
            size: 100,
            modifiedDate: Date(),
            hash: "hash123",
            mimeType: "text/plain"
        )
        let item = CloudItem.file(file)

        // Then
        XCTAssertEqual(item.id, "file-id")
        XCTAssertEqual(item.name, "test.txt")
        XCTAssertEqual(item.path, "/test.txt")
        XCTAssertFalse(item.isFolder)
    }

    func testCloudItemFolder() {
        // Given
        let folder = CloudFolder(
            id: "folder-id",
            name: "TestFolder",
            path: "/TestFolder",
            modifiedDate: Date(),
            itemCount: 3
        )
        let item = CloudItem.folder(folder)

        // Then
        XCTAssertEqual(item.id, "folder-id")
        XCTAssertEqual(item.name, "TestFolder")
        XCTAssertEqual(item.path, "/TestFolder")
        XCTAssertTrue(item.isFolder)
    }

    // MARK: - ChangeSet Tests

    func testChangeSetCreation() {
        // Given
        let changes = [
            ChangeSet.Change(path: "/test1.txt", changeType: .created),
            ChangeSet.Change(path: "/test2.txt", changeType: .modified),
            ChangeSet.Change(path: "/test3.txt", changeType: .deleted)
        ]
        let changeSet = ChangeSet(changes: changes, cursor: "cursor123", hasMore: false)

        // Then
        XCTAssertEqual(changeSet.changes.count, 3)
        XCTAssertEqual(changeSet.cursor, "cursor123")
        XCTAssertFalse(changeSet.hasMore)
        XCTAssertEqual(changeSet.createdItems.count, 1)
        XCTAssertEqual(changeSet.modifiedItems.count, 1)
        XCTAssertEqual(changeSet.deletedItems.count, 1)
    }

    func testChangeTypeDisplayNames() {
        // Test all change types have display names
        let changeTypes: [ChangeSet.Change.ChangeType] = [.created, .modified, .deleted, .moved]

        for changeType in changeTypes {
            XCTAssertFalse(changeType.displayName.isEmpty)
        }

        XCTAssertEqual(ChangeSet.Change.ChangeType.created.displayName, "Created")
        XCTAssertEqual(ChangeSet.Change.ChangeType.modified.displayName, "Modified")
        XCTAssertEqual(ChangeSet.Change.ChangeType.deleted.displayName, "Deleted")
        XCTAssertEqual(ChangeSet.Change.ChangeType.moved.displayName, "Moved")
    }

    // MARK: - Edge Cases

    func testEmptyChangeSet() {
        // Given
        let emptyChangeSet = ChangeSet(changes: [], cursor: "empty", hasMore: false)

        // Then
        XCTAssertEqual(emptyChangeSet.changes.count, 0)
        XCTAssertEqual(emptyChangeSet.createdItems.count, 0)
        XCTAssertEqual(emptyChangeSet.modifiedItems.count, 0)
        XCTAssertEqual(emptyChangeSet.deletedItems.count, 0)
        XCTAssertEqual(emptyChangeSet.movedItems.count, 0)
    }

    func testZeroSizeFile() {
        // Given
        let zeroSizeFile = CloudFile(
            id: "zero-id",
            name: "empty.txt",
            path: "/empty.txt",
            size: 0,
            modifiedDate: Date(),
            hash: "empty-hash",
            mimeType: "text/plain"
        )

        // Then
        XCTAssertEqual(zeroSizeFile.size, 0)
        XCTAssertTrue(zeroSizeFile.formattedSize.contains("0"))
    }
}

// MARK: - Test Helpers

final class MockURLProtocol: URLProtocol {
    static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        guard let handler = MockURLProtocol.requestHandler else {
            fatalError("Request handler is not set")
        }

        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {
        // No-op
    }
}
