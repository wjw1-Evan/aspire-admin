import XCTest
@testable import MacOSSyncClientCore

class FileSystemServiceTests: XCTestCase {
    var fileSystemService: FileSystemService!
    var testDirectory: String!
    
    override func setUp() {
        super.setUp()
        fileSystemService = FileSystemService()
        
        // 创建测试目录
        let tempDir = NSTemporaryDirectory()
        testDirectory = tempDir + "FileSystemServiceTests_\(UUID().uuidString)"
        
        do {
            try fileSystemService.createDirectory(at: testDirectory)
        } catch {
            XCTFail("Failed to create test directory: \(error)")
        }
    }
    
    override func tearDown() {
        // 清理测试目录
        if let testDir = testDirectory {
            try? fileSystemService.deleteDirectory(at: testDir)
        }
        
        fileSystemService = nil
        testDirectory = nil
        super.tearDown()
    }
    
    // MARK: - File Operations Tests
    
    func testCreateFile() {
        let filePath = testDirectory + "/test_file.txt"
        let testData = "Hello, World!".data(using: .utf8)!
        
        XCTAssertNoThrow(try fileSystemService.createFile(at: filePath, with: testData))
        XCTAssertTrue(fileSystemService.fileExists(at: filePath))
        
        // 测试读取创建的文件
        do {
            let readData = try fileSystemService.readFile(at: filePath)
            XCTAssertEqual(readData, testData)
        } catch {
            XCTFail("Failed to read created file: \(error)")
        }
    }
    
    func testCreateFileAlreadyExists() {
        let filePath = testDirectory + "/existing_file.txt"
        let testData = "Test data".data(using: .utf8)!
        
        // 先创建文件
        XCTAssertNoThrow(try fileSystemService.createFile(at: filePath, with: testData))
        
        // 再次创建应该失败
        XCTAssertThrowsError(try fileSystemService.createFile(at: filePath, with: testData)) { error in
            XCTAssertTrue(error is FileSystemError)
            if case FileSystemError.fileAlreadyExists = error {
                // 预期的错误
            } else {
                XCTFail("Expected fileAlreadyExists error, got \(error)")
            }
        }
    }
    
    func testReadFileNotFound() {
        let nonExistentPath = testDirectory + "/non_existent_file.txt"
        
        XCTAssertThrowsError(try fileSystemService.readFile(at: nonExistentPath)) { error in
            XCTAssertTrue(error is FileSystemError)
            if case FileSystemError.fileNotFound = error {
                // 预期的错误
            } else {
                XCTFail("Expected fileNotFound error, got \(error)")
            }
        }
    }
    
    func testUpdateFile() {
        let filePath = testDirectory + "/update_test.txt"
        let originalData = "Original content".data(using: .utf8)!
        let updatedData = "Updated content".data(using: .utf8)!
        
        // 创建文件
        XCTAssertNoThrow(try fileSystemService.createFile(at: filePath, with: originalData))
        
        // 更新文件
        XCTAssertNoThrow(try fileSystemService.updateFile(at: filePath, with: updatedData))
        
        // 验证更新
        do {
            let readData = try fileSystemService.readFile(at: filePath)
            XCTAssertEqual(readData, updatedData)
        } catch {
            XCTFail("Failed to read updated file: \(error)")
        }
    }
    
    func testDeleteFile() {
        let filePath = testDirectory + "/delete_test.txt"
        let testData = "Delete me".data(using: .utf8)!
        
        // 创建文件
        XCTAssertNoThrow(try fileSystemService.createFile(at: filePath, with: testData))
        XCTAssertTrue(fileSystemService.fileExists(at: filePath))
        
        // 删除文件
        XCTAssertNoThrow(try fileSystemService.deleteFile(at: filePath))
        XCTAssertFalse(fileSystemService.fileExists(at: filePath))
    }
    
    func testMoveFile() {
        let sourcePath = testDirectory + "/source_file.txt"
        let destinationPath = testDirectory + "/destination_file.txt"
        let testData = "Move me".data(using: .utf8)!
        
        // 创建源文件
        XCTAssertNoThrow(try fileSystemService.createFile(at: sourcePath, with: testData))
        
        // 移动文件
        XCTAssertNoThrow(try fileSystemService.moveFile(from: sourcePath, to: destinationPath))
        
        // 验证移动结果
        XCTAssertFalse(fileSystemService.fileExists(at: sourcePath))
        XCTAssertTrue(fileSystemService.fileExists(at: destinationPath))
        
        // 验证内容
        do {
            let readData = try fileSystemService.readFile(at: destinationPath)
            XCTAssertEqual(readData, testData)
        } catch {
            XCTFail("Failed to read moved file: \(error)")
        }
    }
    
    func testCopyFile() {
        let sourcePath = testDirectory + "/source_copy.txt"
        let destinationPath = testDirectory + "/destination_copy.txt"
        let testData = "Copy me".data(using: .utf8)!
        
        // 创建源文件
        XCTAssertNoThrow(try fileSystemService.createFile(at: sourcePath, with: testData))
        
        // 复制文件
        XCTAssertNoThrow(try fileSystemService.copyFile(from: sourcePath, to: destinationPath))
        
        // 验证复制结果
        XCTAssertTrue(fileSystemService.fileExists(at: sourcePath))
        XCTAssertTrue(fileSystemService.fileExists(at: destinationPath))
        
        // 验证内容
        do {
            let sourceData = try fileSystemService.readFile(at: sourcePath)
            let destinationData = try fileSystemService.readFile(at: destinationPath)
            XCTAssertEqual(sourceData, destinationData)
            XCTAssertEqual(sourceData, testData)
        } catch {
            XCTFail("Failed to read copied files: \(error)")
        }
    }
    
    // MARK: - Directory Operations Tests
    
    func testCreateDirectory() {
        let dirPath = testDirectory + "/new_directory"
        
        XCTAssertNoThrow(try fileSystemService.createDirectory(at: dirPath))
        XCTAssertTrue(fileSystemService.directoryExists(at: dirPath))
    }
    
    func testCreateDirectoryAlreadyExists() {
        let dirPath = testDirectory + "/existing_directory"
        
        // 先创建目录
        XCTAssertNoThrow(try fileSystemService.createDirectory(at: dirPath))
        
        // 再次创建应该失败
        XCTAssertThrowsError(try fileSystemService.createDirectory(at: dirPath)) { error in
            XCTAssertTrue(error is FileSystemError)
            if case FileSystemError.directoryAlreadyExists = error {
                // 预期的错误
            } else {
                XCTFail("Expected directoryAlreadyExists error, got \(error)")
            }
        }
    }
    
    func testDeleteDirectory() {
        let dirPath = testDirectory + "/delete_directory"
        
        // 创建目录
        XCTAssertNoThrow(try fileSystemService.createDirectory(at: dirPath))
        XCTAssertTrue(fileSystemService.directoryExists(at: dirPath))
        
        // 删除目录
        XCTAssertNoThrow(try fileSystemService.deleteDirectory(at: dirPath))
        XCTAssertFalse(fileSystemService.directoryExists(at: dirPath))
    }
    
    func testListDirectory() {
        let dirPath = testDirectory + "/list_test"
        
        // 创建目录
        XCTAssertNoThrow(try fileSystemService.createDirectory(at: dirPath))
        
        // 在目录中创建一些文件
        let file1 = dirPath + "/file1.txt"
        let file2 = dirPath + "/file2.txt"
        let subDir = dirPath + "/subdir"
        
        XCTAssertNoThrow(try fileSystemService.createFile(at: file1, with: "File 1".data(using: .utf8)!))
        XCTAssertNoThrow(try fileSystemService.createFile(at: file2, with: "File 2".data(using: .utf8)!))
        XCTAssertNoThrow(try fileSystemService.createDirectory(at: subDir))
        
        // 列出目录内容
        do {
            let contents = try fileSystemService.listDirectory(at: dirPath)
            XCTAssertEqual(contents.count, 3)
            XCTAssertTrue(contents.contains("file1.txt"))
            XCTAssertTrue(contents.contains("file2.txt"))
            XCTAssertTrue(contents.contains("subdir"))
        } catch {
            XCTFail("Failed to list directory: \(error)")
        }
    }
    
    // MARK: - File System Queries Tests
    
    func testFileExists() {
        let filePath = testDirectory + "/exists_test.txt"
        let testData = "Exists test".data(using: .utf8)!
        
        // 文件不存在时
        XCTAssertFalse(fileSystemService.fileExists(at: filePath))
        
        // 创建文件后
        XCTAssertNoThrow(try fileSystemService.createFile(at: filePath, with: testData))
        XCTAssertTrue(fileSystemService.fileExists(at: filePath))
    }
    
    func testDirectoryExists() {
        let dirPath = testDirectory + "/dir_exists_test"
        
        // 目录不存在时
        XCTAssertFalse(fileSystemService.directoryExists(at: dirPath))
        
        // 创建目录后
        XCTAssertNoThrow(try fileSystemService.createDirectory(at: dirPath))
        XCTAssertTrue(fileSystemService.directoryExists(at: dirPath))
    }
    
    func testGetFileAttributes() {
        let filePath = testDirectory + "/attributes_test.txt"
        let testData = "Attributes test content".data(using: .utf8)!
        
        // 创建文件
        XCTAssertNoThrow(try fileSystemService.createFile(at: filePath, with: testData))
        
        // 获取文件属性
        do {
            let attributes = try fileSystemService.getFileAttributes(at: filePath)
            
            XCTAssertEqual(attributes.size, Int64(testData.count))
            XCTAssertFalse(attributes.isDirectory)
            XCTAssertTrue(attributes.isReadable)
            XCTAssertTrue(attributes.isWritable)
            XCTAssertTrue(attributes.creationDate <= Date())
            XCTAssertTrue(attributes.modificationDate <= Date())
            XCTAssertFalse(attributes.permissions.isEmpty)
        } catch {
            XCTFail("Failed to get file attributes: \(error)")
        }
    }
    
    func testHasPermission() {
        let filePath = testDirectory + "/permission_test.txt"
        let testData = "Permission test".data(using: .utf8)!
        
        // 创建文件
        XCTAssertNoThrow(try fileSystemService.createFile(at: filePath, with: testData))
        
        // 测试权限
        XCTAssertTrue(fileSystemService.hasPermission(.read, for: filePath))
        XCTAssertTrue(fileSystemService.hasPermission(.write, for: filePath))
        // 注意：文本文件通常不是可执行的
        XCTAssertFalse(fileSystemService.hasPermission(.execute, for: filePath))
    }
    
    func testGetAvailableSpace() {
        do {
            let availableSpace = try fileSystemService.getAvailableSpace(at: testDirectory)
            XCTAssertGreaterThan(availableSpace, 0)
        } catch {
            XCTFail("Failed to get available space: \(error)")
        }
    }
    
    // MARK: - Error Handling Tests
    
    func testInvalidPathHandling() {
        let invalidPath = ""
        let testData = "Test".data(using: .utf8)!
        
        // 空路径应该导致错误
        XCTAssertThrowsError(try fileSystemService.createFile(at: invalidPath, with: testData))
    }
    
    func testPermissionDeniedScenario() {
        // 这个测试在沙盒环境中很难模拟权限错误
        // 我们只测试权限检查功能的基本工作
        let filePath = testDirectory + "/permission_test.txt"
        let testData = "Permission test".data(using: .utf8)!
        
        // 创建文件
        XCTAssertNoThrow(try fileSystemService.createFile(at: filePath, with: testData))
        
        // 验证权限检查功能正常工作
        XCTAssertTrue(fileSystemService.hasPermission(.read, for: filePath))
        XCTAssertTrue(fileSystemService.hasPermission(.write, for: filePath))
    }
    
    // MARK: - Edge Cases Tests
    
    func testEmptyFileOperations() {
        let filePath = testDirectory + "/empty_file.txt"
        let emptyData = Data()
        
        // 创建空文件
        XCTAssertNoThrow(try fileSystemService.createFile(at: filePath, with: emptyData))
        XCTAssertTrue(fileSystemService.fileExists(at: filePath))
        
        // 读取空文件
        do {
            let readData = try fileSystemService.readFile(at: filePath)
            XCTAssertEqual(readData.count, 0)
        } catch {
            XCTFail("Failed to read empty file: \(error)")
        }
        
        // 获取空文件属性
        do {
            let attributes = try fileSystemService.getFileAttributes(at: filePath)
            XCTAssertEqual(attributes.size, 0)
        } catch {
            XCTFail("Failed to get empty file attributes: \(error)")
        }
    }
    
    func testLargeFileOperations() {
        let filePath = testDirectory + "/large_file.txt"
        
        // 创建一个相对较大的文件（1MB）
        let largeData = Data(repeating: 65, count: 1024 * 1024) // 1MB of 'A' characters
        
        XCTAssertNoThrow(try fileSystemService.createFile(at: filePath, with: largeData))
        XCTAssertTrue(fileSystemService.fileExists(at: filePath))
        
        // 验证文件大小
        do {
            let attributes = try fileSystemService.getFileAttributes(at: filePath)
            XCTAssertEqual(attributes.size, Int64(largeData.count))
        } catch {
            XCTFail("Failed to get large file attributes: \(error)")
        }
        
        // 读取大文件
        do {
            let readData = try fileSystemService.readFile(at: filePath)
            XCTAssertEqual(readData.count, largeData.count)
        } catch {
            XCTFail("Failed to read large file: \(error)")
        }
    }
    
    func testNestedDirectoryOperations() {
        let nestedPath = testDirectory + "/level1/level2/level3"
        
        // 创建嵌套目录
        XCTAssertNoThrow(try fileSystemService.createDirectory(at: nestedPath))
        XCTAssertTrue(fileSystemService.directoryExists(at: nestedPath))
        
        // 在嵌套目录中创建文件
        let filePath = nestedPath + "/nested_file.txt"
        let testData = "Nested file content".data(using: .utf8)!
        
        XCTAssertNoThrow(try fileSystemService.createFile(at: filePath, with: testData))
        XCTAssertTrue(fileSystemService.fileExists(at: filePath))
        
        // 验证文件内容
        do {
            let readData = try fileSystemService.readFile(at: filePath)
            XCTAssertEqual(readData, testData)
        } catch {
            XCTFail("Failed to read nested file: \(error)")
        }
    }
}