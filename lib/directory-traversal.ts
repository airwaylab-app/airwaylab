/**
 * Cross-browser directory traversal for drag-and-drop file uploads.
 *
 * Safari does not recursively enumerate folder contents via
 * `DataTransfer.files`. This utility uses the `webkitGetAsEntry()` /
 * `FileSystemDirectoryReader` APIs to walk directory trees and collect
 * all files with their relative paths reconstructed.
 */

/** A collected file with its reconstructed relative path. */
export interface TraversedFile {
  file: File;
  relativePath: string;
}

/**
 * Read all entries from a FileSystemDirectoryReader.
 * `readEntries()` may return partial results (max ~100 per call in some
 * browsers), so we loop until it returns an empty array.
 */
function readAllEntries(
  reader: FileSystemDirectoryReader
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const allEntries: FileSystemEntry[] = [];

    function readBatch() {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            resolve(allEntries);
          } else {
            allEntries.push(...entries);
            readBatch();
          }
        },
        (err) => reject(err)
      );
    }

    readBatch();
  });
}

/** Promisify FileSystemFileEntry.file(). */
function getFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

/**
 * Recursively traverse a FileSystemEntry tree and collect all files
 * with their relative paths.
 */
async function traverseEntry(
  entry: FileSystemEntry,
  basePath: string
): Promise<TraversedFile[]> {
  if (entry.isFile) {
    const file = await getFile(entry as FileSystemFileEntry);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    return [{ file, relativePath }];
  }

  if (entry.isDirectory) {
    const dirReader = (entry as FileSystemDirectoryEntry).createReader();
    const entries = await readAllEntries(dirReader);
    const dirPath = basePath ? `${basePath}/${entry.name}` : entry.name;
    const results: TraversedFile[] = [];

    for (const child of entries) {
      const childFiles = await traverseEntry(child, dirPath);
      results.push(...childFiles);
    }

    return results;
  }

  return [];
}

/**
 * Check whether the browser supports `webkitGetAsEntry()` on
 * DataTransferItems. Returns false when the API is unavailable
 * (e.g. very old browsers).
 */
export function supportsWebkitGetAsEntry(
  items: DataTransferItemList
): boolean {
  if (!items || items.length === 0) return false;
  const first = items[0];
  return first !== undefined && typeof first.webkitGetAsEntry === 'function';
}

/**
 * Traverse all items in a DataTransferItemList, recursively walking
 * directories and collecting files with their relative paths.
 *
 * Falls back to returning an empty array if `webkitGetAsEntry()` is
 * not supported -- the caller should use `DataTransfer.files` instead.
 */
export async function traverseDataTransferItems(
  items: DataTransferItemList
): Promise<TraversedFile[]> {
  if (!supportsWebkitGetAsEntry(items)) {
    return [];
  }

  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    const entry = item.webkitGetAsEntry();
    if (entry) entries.push(entry);
  }

  const results: TraversedFile[] = [];
  for (const entry of entries) {
    const files = await traverseEntry(entry, '');
    results.push(...files);
  }

  return results;
}

/**
 * Convert TraversedFile[] to File[] with `webkitRelativePath` set.
 *
 * The File constructor does not allow setting `webkitRelativePath`
 * directly (it is read-only). We create new File objects and attach
 * the path via Object.defineProperty so downstream code that reads
 * `webkitRelativePath` works correctly.
 */
export function toFilesWithPaths(traversed: TraversedFile[]): File[] {
  return traversed.map(({ file, relativePath }) => {
    const newFile = new File([file], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
    Object.defineProperty(newFile, 'webkitRelativePath', {
      value: relativePath,
      writable: false,
      enumerable: true,
      configurable: true,
    });
    return newFile;
  });
}

/**
 * Detect iOS/iPadOS where folder selection is not supported.
 *
 * iPadOS reports as "Macintosh" in its user agent since iPadOS 13,
 * so we combine UA checks with touch capability detection.
 */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;

  // Classic iOS detection
  if (/iPad|iPhone|iPod/.test(ua)) return true;

  // iPadOS 13+ reports as Macintosh but has touch support
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;

  return false;
}
