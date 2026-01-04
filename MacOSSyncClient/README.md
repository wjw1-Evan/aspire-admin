# macOS Sync Client

A native macOS application for file synchronization with cloud storage, inspired by OneDrive.

## Features

- **Bidirectional Sync**: Automatic synchronization between local folders and cloud storage
- **Real-time Monitoring**: Instant detection of file system changes
- **Conflict Resolution**: Intelligent handling of sync conflicts
- **Selective Sync**: Choose which folders to sync locally
- **Offline Access**: Access important files even when offline
- **System Integration**: Native macOS integration with Finder, System Tray, and more
- **Security**: End-to-end encryption and secure authentication
- **Bandwidth Management**: Control sync speed and network usage

## Requirements

- macOS 12.0 or later
- Xcode 15.0 or later
- Swift 5.9 or later

## Building

1. Open `MacOSSyncClient.xcodeproj` in Xcode
2. Select the MacOSSyncClient scheme
3. Build and run (⌘R)

## Architecture

The application follows a modular architecture with the following components:

- **Models**: Core data structures (`SyncItem`, `SyncConfiguration`)
- **Protocols**: Interface definitions (`SyncEngineProtocol`)
- **Services**: Business logic and data access (`LocalDBService`)
- **Views**: SwiftUI user interface components
- **Extensions**: System integration (Finder Sync, System Tray)

## Testing

The project includes comprehensive testing with:

- **Unit Tests**: Specific scenarios and edge cases
- **Property-Based Tests**: Universal correctness properties using SwiftCheck
- **Integration Tests**: End-to-end workflow validation

Run tests with ⌘U in Xcode or `swift test` from the command line.

## Database Schema

The application uses SQLite for local data storage with the following tables:

- `sync_items`: File and folder metadata
- `conflict_info`: Conflict resolution data
- `sync_configuration`: User preferences and settings
- `sync_activities`: Operation history and logs
- `offline_cache`: Offline file cache management

## License

This project is licensed under the MIT License - see the LICENSE file for details.