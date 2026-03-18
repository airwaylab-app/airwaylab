/**
 * Shared helpers for accessing File.webkitRelativePath.
 *
 * TypeScript's File type omits the non-standard webkitRelativePath property
 * set by <input webkitdirectory>. These helpers centralise the type cast
 * so the rest of the codebase can access the path without repeating it.
 */

/** Return the browser-relative path from a directory upload, or file.name as fallback. */
export function getFilePath(file: File): string {
  return (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

/** Return the raw webkitRelativePath (may be undefined if not a directory upload). */
export function getRelativePath(file: File): string | undefined {
  return (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || undefined;
}

/** Extract just the filename from the webkitRelativePath, falling back to file.name. */
export function getFileName(file: File): string {
  return getFilePath(file).split('/').pop() || file.name;
}
