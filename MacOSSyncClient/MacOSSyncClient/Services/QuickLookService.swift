import Foundation
import QuickLookThumbnailing
import OSLog
import AppKit

class QuickLookService: QuickLookServiceProtocol {
    private let logger = Logger(subsystem: "com.synclient.macos", category: "QuickLookService")
    private var temporaryPreviewFiles: Set<URL> = []
    
    func canPreview(fileAt path: String) -> Bool {
        let url = URL(fileURLWithPath: path)
        // Simple file type check instead of using QLPreviewPanel
        let pathExtension = url.pathExtension.lowercased()
        let supportedExtensions = ["txt", "pdf", "jpg", "jpeg", "png", "gif", "doc", "docx", "xls", "xlsx", "ppt", "pptx"]
        return supportedExtensions.contains(pathExtension)
    }
    
    func generateThumbnail(for path: String, size: CGSize) async throws -> NSImage? {
        let url = URL(fileURLWithPath: path)
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = QLThumbnailGenerator.Request(
                fileAt: url,
                size: size,
                scale: NSScreen.main?.backingScaleFactor ?? 1.0,
                representationTypes: .thumbnail
            )
            
            QLThumbnailGenerator.shared.generateBestRepresentation(for: request) { thumbnail, error in
                if let error = error {
                    self.logger.error("Failed to generate thumbnail for \(path): \(error.localizedDescription)")
                    continuation.resume(throwing: error)
                } else if let thumbnail = thumbnail {
                    continuation.resume(returning: thumbnail.nsImage)
                } else {
                    continuation.resume(returning: nil)
                }
            }
        }
    }
    
    func prepareForPreview(fileAt path: String) async throws -> URL {
        let originalURL = URL(fileURLWithPath: path)
        
        // Check if file exists and is accessible
        guard FileManager.default.fileExists(atPath: path) else {
            throw QuickLookError.fileNotFound
        }
        
        // For local files, we can return the original URL
        // For cloud-only files, we might need to download them first
        if await isFileAvailableLocally(at: path) {
            return originalURL
        } else {
            // Download the file to a temporary location for preview
            return try await downloadFileForPreview(from: path)
        }
    }
    
    func cleanupPreviewFiles() async {
        for tempFile in temporaryPreviewFiles {
            do {
                try FileManager.default.removeItem(at: tempFile)
                logger.info("Cleaned up temporary preview file: \(tempFile.path)")
            } catch {
                logger.error("Failed to cleanup temporary file \(tempFile.path): \(error.localizedDescription)")
            }
        }
        temporaryPreviewFiles.removeAll()
    }
    
    // MARK: - Private Methods
    
    private func isFileAvailableLocally(at path: String) async -> Bool {
        // Check if the file is actually available locally (not just a placeholder)
        let url = URL(fileURLWithPath: path)
        
        do {
            let resourceValues = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
            return resourceValues.isRegularFile == true && (resourceValues.fileSize ?? 0) > 0
        } catch {
            logger.error("Failed to check file availability: \(error.localizedDescription)")
            return false
        }
    }
    
    private func downloadFileForPreview(from path: String) async throws -> URL {
        // Create a temporary file for preview
        let tempDirectory = FileManager.default.temporaryDirectory
        let fileName = URL(fileURLWithPath: path).lastPathComponent
        let tempURL = tempDirectory.appendingPathComponent("preview_\(UUID().uuidString)_\(fileName)")
        
        // In a real implementation, this would download the file from cloud storage
        // For now, we'll simulate by copying the file if it exists
        let originalURL = URL(fileURLWithPath: path)
        
        do {
            try FileManager.default.copyItem(at: originalURL, to: tempURL)
            temporaryPreviewFiles.insert(tempURL)
            logger.info("Prepared file for preview: \(tempURL.path)")
            return tempURL
        } catch {
            logger.error("Failed to prepare file for preview: \(error.localizedDescription)")
            throw QuickLookError.preparationFailed
        }
    }
}

enum QuickLookError: Error, LocalizedError {
    case fileNotFound
    case preparationFailed
    case thumbnailGenerationFailed
    
    var errorDescription: String? {
        switch self {
        case .fileNotFound:
            return "File not found for preview"
        case .preparationFailed:
            return "Failed to prepare file for preview"
        case .thumbnailGenerationFailed:
            return "Failed to generate thumbnail"
        }
    }
}