// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MacOSSyncClient",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "MacOSSyncClientCore",
            targets: ["MacOSSyncClientCore"]
        ),
    ],
    dependencies: [
        // SwiftCheck for property-based testing
        .package(url: "https://github.com/typelift/SwiftCheck.git", from: "0.12.0"),
        // SQLite.swift for database operations (alternative to raw SQLite3)
        .package(url: "https://github.com/stephencelis/SQLite.swift.git", from: "0.14.1"),
    ],
    targets: [
        .target(
            name: "MacOSSyncClientCore",
            dependencies: [
                .product(name: "SQLite", package: "SQLite.swift"),
            ],
            path: "MacOSSyncClient",
            exclude: ["MacOSSyncClientApp.swift", "ContentView.swift", "Preview Content", "Assets.xcassets", "MacOSSyncClient.entitlements"]
        ),
        .testTarget(
            name: "MacOSSyncClientTests",
            dependencies: [
                "MacOSSyncClientCore",
                .product(name: "SwiftCheck", package: "SwiftCheck"),
            ],
            path: "Tests/MacOSSyncClientTests"
        ),
    ]
)