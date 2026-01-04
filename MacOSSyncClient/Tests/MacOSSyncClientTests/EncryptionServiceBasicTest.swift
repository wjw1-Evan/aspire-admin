import XCTest
@testable import MacOSSyncClientCore

/// Basic test to verify EncryptionService can be imported and instantiated
class EncryptionServiceBasicTest: XCTestCase {
    
    func testEncryptionServiceInstantiation() {
        let service = EncryptionService()
        XCTAssertNotNil(service, "EncryptionService should be instantiable")
    }
}