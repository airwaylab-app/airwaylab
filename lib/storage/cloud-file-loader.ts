// ============================================================
// AirwayLab — Cloud File Loader
// Fetches stored files from Supabase Storage for a given night,
// converting them to File objects usable by the waveform worker.
// ============================================================

import type { StoredFileMetadata } from './types';

/**
 * Load cloud-stored files for a specific night date.
 * Returns File objects compatible with the waveform extraction worker.
 * Optionally filter by file extension pattern (e.g., /\.edf$/i).
 */
export async function loadCloudFiles(
  nightDate: string,
  fileFilter?: RegExp
): Promise<File[]> {
  // Fetch file list for this night
  const listRes = await fetch(`/api/files/list?nightDate=${encodeURIComponent(nightDate)}`, {
    credentials: 'same-origin',
  });

  if (!listRes.ok) {
    throw new Error('Failed to fetch file list from cloud');
  }

  const { files } = await listRes.json() as { files: StoredFileMetadata[] };

  if (!files || files.length === 0) {
    return [];
  }

  // Filter files if pattern provided
  let filtered = files;
  if (fileFilter) {
    filtered = files.filter(f => fileFilter.test(f.fileName));
  }

  if (filtered.length === 0) return [];

  // Download files in parallel (with concurrency limit)
  const CONCURRENCY = 5;
  const results: File[] = [];
  const queue = [...filtered];

  const downloadOne = async (meta: StoredFileMetadata): Promise<File | null> => {
    try {
      // Get signed download URL
      const urlRes = await fetch(`/api/files/download?id=${encodeURIComponent(meta.id)}`, {
        credentials: 'same-origin',
      });

      if (!urlRes.ok) return null;

      const { url, fileName } = await urlRes.json() as { url: string; fileName: string };

      // Download the actual file
      const fileRes = await fetch(url);
      if (!fileRes.ok) return null;

      const blob = await fileRes.blob();

      // Create a File object with the original path as webkitRelativePath
      const file = new File([blob], fileName, { type: blob.type });
      // Attach the original relative path for the worker
      Object.defineProperty(file, 'webkitRelativePath', {
        value: meta.filePath,
        writable: false,
      });

      return file;
    } catch (err) {
      console.error(`[cloud-file-loader] Failed to download ${meta.fileName}:`, err);
      return null;
    }
  };

  // Process with concurrency
  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(downloadOne));
    for (const file of batchResults) {
      if (file) results.push(file);
    }
  }

  return results;
}

/**
 * Check if the user has stored files for a specific night.
 * Lightweight check — doesn't download anything.
 */
export async function hasCloudFiles(nightDate: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/files/list?nightDate=${encodeURIComponent(nightDate)}`, {
      credentials: 'same-origin',
    });

    if (!res.ok) return false;

    const { files } = await res.json() as { files: StoredFileMetadata[] };
    return (files ?? []).length > 0;
  } catch {
    return false;
  }
}
