'use client';

import { useCallback, useRef, useState } from 'react';
import { FolderOpen, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateSDFiles, validateOximetryFiles, type ValidationResult } from '@/lib/upload-validation';

interface FileUploadProps {
  onFilesSelected: (sdFiles: File[], oximetryFiles: File[]) => void;
  disabled?: boolean;
}

export function FileUpload({ onFilesSelected, disabled }: FileUploadProps) {
  const sdInputRef = useRef<HTMLInputElement>(null);
  const oxInputRef = useRef<HTMLInputElement>(null);
  const [sdFiles, setSdFiles] = useState<File[]>([]);
  const [oxFiles, setOxFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [sdValidation, setSdValidation] = useState<ValidationResult | null>(null);
  const [oxValidation, setOxValidation] = useState<ValidationResult | null>(null);

  const handleSDChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        const result = validateSDFiles(files);
        setSdValidation(result);
        setSdFiles(files);
        if (result.valid) {
          onFilesSelected(files, oxFiles);
        }
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
      }
    },
    [onFilesSelected, sdFiles, sdValidation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const items = Array.from(e.dataTransfer.files);
      if (items.length > 0) {
        const csvFiles = items.filter((f) =>
          f.name.toLowerCase().endsWith('.csv')
        );
        const edfFiles = items.filter(
          (f) => !f.name.toLowerCase().endsWith('.csv')
        );

        if (edfFiles.length > 0) {
          const result = validateSDFiles(edfFiles);
          setSdValidation(result);
          setSdFiles(edfFiles);
          if (result.valid) {
            onFilesSelected(edfFiles, csvFiles.length > 0 ? csvFiles : oxFiles);
          }
        }
        if (csvFiles.length > 0) {
          const oxResult = validateOximetryFiles(csvFiles);
          setOxValidation(oxResult);
          setOxFiles(csvFiles);
        }
      }
    },
    [onFilesSelected, oxFiles]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* SD Card Upload */}
      <div
        role="button"
        tabIndex={0}
        aria-label={sdFiles.length > 0 ? `${sdFiles.length} SD card files selected. Click to change selection.` : 'Upload ResMed SD card root folder. Click or drag and drop.'}
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
                  ? `${sdValidation.edfCount} EDF files found`
                  : `${sdFiles.length} files selected`
                : 'Upload ResMed SD Card'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {sdFiles.length > 0
                ? 'Click to change selection'
                : 'Select the SD card root folder or drag & drop'}
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
          {sdFiles.length === 0 && (
            <div className="mt-2 flex flex-col gap-1.5 text-left">
              {[
                'Remove the SD card from your ResMed machine',
                'Insert it into your computer (use an adapter if needed)',
                'Click here and select the SD card root folder',
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

      {/* Oximetry Upload */}
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
    </div>
  );
}
