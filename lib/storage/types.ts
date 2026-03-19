// ============================================================
// AirwayLab — Cloud Storage Types
// Shared types for the raw file storage system.
// ============================================================

export interface StoredFileMetadata {
  id: string;
  nightDate: string | null;
  filePath: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  isSupported: boolean;
  uploadedAt: string;
}

export interface StorageUsage {
  totalBytes: number;
  fileCount: number;
  quotaBytes: number;
  remainingBytes: number;
  isQuotaExceeded: boolean;
}

export interface UploadProgress {
  current: number;
  total: number;
  bytesUploaded: number;
  bytesTotal: number;
  stage: 'hashing' | 'checking' | 'uploading' | 'complete';
  /** Number of files already stored from a previous upload (resume context) */
  skippedExisting: number;
}

export interface UploadResult {
  uploaded: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export type UploadStatus = 'idle' | 'hashing' | 'checking' | 'uploading' | 'complete' | 'error';

export interface UploadState {
  status: UploadStatus;
  progress: UploadProgress;
  result: UploadResult | null;
  error: string | null;
}

/** Known supported file extensions for PAP devices */
export const SUPPORTED_EXTENSIONS = new Set([
  '.edf', '.csv', '.json', '.dat', '.crc',
]);

/** Max file size: 50MB (Supabase Storage default) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Storage bucket name */
export const STORAGE_BUCKET = 'user-files';
