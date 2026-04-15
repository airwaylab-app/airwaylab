'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FolderOpen, FileText, CheckCircle2, AlertTriangle, XCircle, Monitor, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateSDFiles, validateOximetryFiles, checkOximetryFormats, type ValidationResult } from '@/lib/upload-validation';
import { UnsupportedFormatDialog } from './unsupported-format-dialog';
import { UnsupportedDeviceDialog } from './unsupported-device-dialog';
import { getFileStructureMetadata } from '@/lib/parsers/device-detector';
import { events } from '@/lib/analytics';
import { supportsWebkitGetAsEntry, traverseDataTransferItems, toFilesWithPaths, isIOSDevice } from '@/lib/directory-traversal';
import * as Sentry from '@sentry/nextjs';

interface FileUploadProps {
  onFilesSelected: (sdFiles: File[], oximetryFiles: File[], deviceType?: string, bmcSerial?: string) => void;
  disabled?: boolean;
  isFirstRun?: boolean;
}

export function FileUpload({ onFilesSelected, disabled, isFirstRun }: FileUploadProps) {
  const sdInputRef = useRef<HTMLInputElement>(null);
  const oxInputRef = useRef<HTMLInputElement>(null);
  const [sdFiles, setSdFiles] = useState<File[]>([]);
  const [oxFiles, setOxFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [sdValidation, setSdValidation] = useState<ValidationResult | null>(null);
  const [oxValidation, setOxValidation] = useState<ValidationResult | null>(null);
  const [unsupportedFiles, setUnsupportedFiles] = useState<{ fileName: string; headerSample: string }[]>([]);
  const [unsupportedDevice, setUnsupportedDevice] = useState<{
    totalFiles: number;
    extensions: Record<string, number>;
    folderStructure: string[];
    totalSizeBytes: number;
  } | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSDevice());
  }, []);

  const handleSDChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        const result = validateSDFiles(files);
        setSdValidation(result);
        setSdFiles(files);
        if (result.valid) {
          events.uploadStart();
          onFilesSelected(files, oxFiles, result.deviceType, result.bmcSerial);
        } else if (result.deviceType === 'unknown') {
          const fileInfos = files.map((f) => ({
            name: f.name,
            path: (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name,
            size: f.size,
          }));
          setUnsupportedDevice(getFileStructureMetadata(fileInfos));
          Sentry.captureMessage('Upload: unsupported device detected', {
            level: 'info',
            tags: { checkpoint: 'unsupported_device', file_count: files.length },
          });
        }
        // No Sentry for rejected files — user error (wrong files selected), not a bug
      }
    },
    [onFilesSelected, oxFiles]
  );

  const handleOxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        const result = validateOximetryFiles(files);
        setOxValidation(result);
        setOxFiles(files);
        if (sdFiles.length > 0 && sdValidation?.valid) {
          onFilesSelected(sdFiles, files);
        }
        // Check for unsupported oximetry formats
        checkOximetryFormats(files).then((unsupported) => {
          if (unsupported.length > 0) setUnsupportedFiles(unsupported);
        });
      }
    },
    [onFilesSelected, sdFiles, sdValidation]
  );

  const processDroppedFiles = useCallback(
    (allFiles: File[]) => {
      if (allFiles.length === 0) return;

      const csvFiles = allFiles.filter((f) =>
        f.name.toLowerCase().endsWith('.csv')
      );
      const edfFiles = allFiles.filter(
        (f) => !f.name.toLowerCase().endsWith('.csv')
      );

      if (edfFiles.length > 0) {
        const result = validateSDFiles(edfFiles);
        setSdValidation(result);
        setSdFiles(edfFiles);
        if (result.valid) {
          onFilesSelected(edfFiles, csvFiles.length > 0 ? csvFiles : oxFiles, result.deviceType, result.bmcSerial);
        } else if (result.deviceType === 'unknown') {
          const fileInfos = edfFiles.map((f) => ({
            name: f.name,
            path: (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name,
            size: f.size,
          }));
          setUnsupportedDevice(getFileStructureMetadata(fileInfos));
          Sentry.captureMessage('Upload: unsupported device detected', {
            level: 'info',
            tags: { checkpoint: 'unsupported_device', file_count: edfFiles.length },
          });
        }
      }
      if (csvFiles.length > 0) {
        const oxResult = validateOximetryFiles(csvFiles);
        setOxValidation(oxResult);
        setOxFiles(csvFiles);
        checkOximetryFormats(csvFiles).then((unsupported) => {
          if (unsupported.length > 0) setUnsupportedFiles(unsupported);
        });
      }
    },
    [onFilesSelected, oxFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      // Use webkitGetAsEntry for recursive directory traversal (Safari support)
      if (supportsWebkitGetAsEntry(e.dataTransfer.items)) {
        traverseDataTransferItems(e.dataTransfer.items)
          .then((traversed) => {
            if (traversed.length > 0) {
              processDroppedFiles(toFilesWithPaths(traversed));
            } else {
              // Traversal returned nothing (e.g. dropped plain files, not a directory)
              processDroppedFiles(Array.from(e.dataTransfer.files));
            }
          })
          .catch((err) => {
            Sentry.captureException(err, {
              tags: { checkpoint: 'directory_traversal_fallback' },
            });
            processDroppedFiles(Array.from(e.dataTransfer.files));
          });
        return;
      }

      // Fallback: browsers without webkitGetAsEntry support
      processDroppedFiles(Array.from(e.dataTransfer.files));
    },
    [processDroppedFiles]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* SD Card Upload */}
      <div
        role="button"
        tabIndex={0}
        aria-label={sdFiles.length > 0 ? `${sdFiles.length} SD card files selected. Click to change selection.` : 'Choose your PAP machine SD card. Click or drag and drop.'}
        className={`group relative cursor-pointer rounded-xl border-2 border-dashed transition-all ${
          dragOver
            ? 'border-primary bg-primary/5'
            : sdFiles.length > 0
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-border/50 hover:border-border hover:bg-card/50'
        } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && sdInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) sdInputRef.current?.click(); } }}
      >
        <div className="flex flex-col items-center gap-3 px-6 py-8">
          <div
            className={`rounded-xl p-3 transition-colors ${
              sdFiles.length > 0
                ? 'bg-emerald-500/10'
                : 'bg-muted group-hover:bg-primary/10'
            }`}
          >
            {sdFiles.length > 0 ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            ) : (
              <FolderOpen className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {sdFiles.length > 0
                ? sdValidation
                  ? sdValidation.deviceType === 'bmc'
                    ? `BMC / Luna device detected (${sdValidation.edfCount} data files)`
                    : `${sdValidation.edfCount} EDF files found`
                  : `${sdFiles.length} files selected`
                : 'Upload SD Card'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {sdFiles.length > 0
                ? 'Click to change selection'
                : 'Choose your PAP machine\'s SD card or drag & drop'}
            </p>
          </div>
          {/* Validation feedback */}
          {sdValidation && (sdValidation.errors.length > 0 || sdValidation.warnings.length > 0) && (
            <div className="mt-1 flex flex-col gap-1 text-left">
              {sdValidation.errors.map((err, i) => (
                <div key={`e${i}`} className="flex items-start gap-1.5">
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                  <span className="text-xs text-red-400">{err}</span>
                </div>
              ))}
              {sdValidation.warnings.map((warn, i) => (
                <div key={`w${i}`} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  <span className="text-xs text-amber-400">{warn}</span>
                </div>
              ))}
            </div>
          )}
          {sdFiles.length === 0 && isIOS && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
              <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-xs leading-snug text-amber-400">
                Folder selection isn&apos;t supported on iOS. Please use a desktop browser to upload your SD card data.
              </p>
            </div>
          )}
          {sdFiles.length === 0 && (
            <div className="mt-2 flex flex-col gap-1.5 text-left">
              {[
                'Remove the SD card from your PAP machine',
                'Insert it into your computer (use an adapter if needed)',
                'Click here and choose your SD card drive',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">
                    {step}
                  </span>
                </div>
              ))}
              <div className="mt-2 space-y-0.5">
                <p className="text-[10px] text-muted-foreground/70">
                  Supports ResMed AirSense 10/11, AirCurve 10, and BMC Luna 2 / RESmart G2.
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  Using another device? Upload your data and enable data sharing so we can analyse the structure and add support.
                </p>
              </div>
              {!isIOS && (
                <a
                  href="/getting-started"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  First time? See the getting started guide
                  <ArrowRight className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
        <input
          ref={sdInputRef}
          type="file"
          className="hidden"
          // @ts-expect-error webkitdirectory is not in standard types
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleSDChange}
          disabled={disabled}
        />
      </div>

      {/* Oximetry Upload — hidden for first-run users until after initial analysis */}
      {!isFirstRun && (
        <div
          role="button"
          tabIndex={0}
          aria-label={oxFiles.length > 0 ? `${oxFiles.length} oximetry file${oxFiles.length !== 1 ? 's' : ''} selected. Click to change.` : 'Upload pulse oximetry CSV files (optional). Click to browse.'}
          className={`group cursor-pointer rounded-xl border border-dashed transition-all ${
            oxFiles.length > 0
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-border/50 hover:border-border hover:bg-card/50'
          } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
          onClick={() => !disabled && oxInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) oxInputRef.current?.click(); } }}
        >
          <div className="flex items-center gap-3 px-5 py-4">
            <div
              className={`rounded-lg p-2 ${
                oxFiles.length > 0 ? 'bg-emerald-500/10' : 'bg-muted'
              }`}
            >
              {oxFiles.length > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                Pulse Oximetry CSVs{' '}
                <span className="text-muted-foreground">(optional)</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {oxFiles.length > 0
                  ? `${oxFiles.length} file${oxFiles.length !== 1 ? 's' : ''} selected`
                  : 'Viatom / Checkme O2 Max exports'}
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" tabIndex={-1}>
              Browse
            </Button>
          </div>
          {/* Oximetry validation feedback */}
          {oxValidation && (oxValidation.errors.length > 0 || oxValidation.warnings.length > 0) && (
            <div className="flex flex-col gap-1 px-5 pb-3">
              {oxValidation.errors.map((err, i) => (
                <div key={`e${i}`} className="flex items-start gap-1.5">
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                  <span className="text-xs text-red-400">{err}</span>
                </div>
              ))}
              {oxValidation.warnings.map((warn, i) => (
                <div key={`w${i}`} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  <span className="text-xs text-amber-400">{warn}</span>
                </div>
              ))}
            </div>
          )}
          <input
            ref={oxInputRef}
            type="file"
            className="hidden"
            accept=".csv"
            multiple
            onChange={handleOxChange}
            disabled={disabled}
          />
        </div>
      )}
      {/* Unsupported Oximetry Format Dialog */}
      {unsupportedFiles.length > 0 && (
        <UnsupportedFormatDialog
          files={unsupportedFiles}
          onClose={() => setUnsupportedFiles([])}
        />
      )}
      {/* Unsupported Device Dialog */}
      {unsupportedDevice && (
        <UnsupportedDeviceDialog
          fileStructure={unsupportedDevice}
          onClose={() => setUnsupportedDevice(null)}
        />
      )}
    </div>
  );
}
