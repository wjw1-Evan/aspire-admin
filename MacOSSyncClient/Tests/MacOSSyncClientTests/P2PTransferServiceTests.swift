import XCTest

@testable import MacOSSyncClientCore

final class P2PTransferServiceTests: XCTestCase {
    private var tempDir: URL!
    private var testFileURL: URL!
    private var service: P2PTransferService!

    override func setUpWithError() throws {
        try super.setUpWithError()
        tempDir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
        testFileURL = tempDir.appendingPathComponent("test.dat")
        try Data(repeating: 0xAB, count: 1024).write(to: testFileURL)
        service = P2PTransferService(fileSystemService: FileSystemService())
        awaitStart()
    }

    override func tearDownWithError() throws {
        let expectation = expectation(description: "p2p stop")
        Task {
            await service.stop()
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 3.0)

        try? FileManager.default.removeItem(at: tempDir)
        tempDir = nil
        testFileURL = nil
        service = nil
        try super.tearDownWithError()
    }

    private func awaitStart() {
        let expectation = XCTestExpectation(description: "p2p start")
        Task {
            await service.start(advertisedName: "test")
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 2.0)
    }

    func testSendFileCompletes() async throws {
        let completion = expectation(description: "transfer completes")
        var eventsTask: Task<Void, Never>?

        eventsTask = Task {
            for await event in service.events {
                if case .sessionCompleted(let session) = event,
                    session.fileName == testFileURL.lastPathComponent
                {
                    completion.fulfill()
                    break
                }
            }
        }

        _ = try await service.sendFile(to: "peer-1", localPath: testFileURL.path)
        await fulfillment(of: [completion], timeout: 5.0)
        eventsTask?.cancel()
    }

    func testSendWithoutStartThrows() async {
        let newService = P2PTransferService(fileSystemService: FileSystemService())
        await newService.stop()  // ensure not started
        await XCTAssertThrowsErrorAsync(
            try await newService.sendFile(to: "peer-2", localPath: self.testFileURL.path))
    }

    func testCancelStopsTransfer() async throws {
        let cancelled = expectation(description: "transfer cancelled")
        var eventsTask: Task<Void, Never>?

        eventsTask = Task {
            for await event in service.events {
                if case .sessionUpdated(let session) = event,
                    session.status == .cancelled
                {
                    cancelled.fulfill()
                    break
                }
            }
        }

        let session = try await service.sendFile(to: "peer-3", localPath: testFileURL.path)
        // 立即取消，避免完成
        await service.cancel(sessionId: session.id)
        await fulfillment(of: [cancelled], timeout: 3.0)
        eventsTask?.cancel()
    }
}

// MARK: - Async XCTAssert helpers

extension XCTestCase {
    func XCTAssertThrowsErrorAsync<T>(
        _ expression: @autoclosure @escaping () async throws -> T,
        _ message: @autoclosure () -> String = "",
        file: StaticString = #filePath,
        line: UInt = #line
    ) async {
        do {
            _ = try await expression()
            XCTFail(message(), file: file, line: line)
        } catch {
            // success
        }
    }
}
