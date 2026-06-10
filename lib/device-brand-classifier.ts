/**
 * Device brand classification from the upload's file list (non-clinical).
 *
 * Classifies the PAP brand from file/folder NAMES only — no binary/EDF parsing — so it can
 * run in an API route / orchestrator without touching the clinical-gated lib/parsers. The
 * ResMed and BMC signatures are ported from lib/parsers/device-detector.ts (verified). We
 * deliberately do NOT guess Philips / Löwenstein / Fisher & Paykel yet: a confident
 * misclassification would poison the device-support roadmap. Instead every unmatched upload
 * returns `unknown` PLUS a `signature` (extension histogram + folders) and is logged, so we
 * can cluster real-world unknowns and learn their signatures before claiming detection.
 */

export type DeviceBrand =
  | 'resmed'
  | 'bmc'
  | 'philips'
  | 'lowenstein'
  | 'fisher_paykel'
  | 'unknown';

export interface FileRef {
  name: string;
  path?: string;
}

export interface BrandSignature {
  fileCount: number;
  extensions: Record<string, number>;
  folders: string[];
}

export interface BrandClassification {
  brand: DeviceBrand;
  label: string;
  /** Always present — the auditable evidence, and the clustering input for unknown brands. */
  signature: BrandSignature;
}

export function classifyBrand(files: FileRef[]): BrandClassification {
  const signature = buildSignature(files);
  const names = files.map((f) => f.name.toLowerCase());
  const paths = files.map((f) => (f.path || f.name).toUpperCase());

  // ResMed: DATALOG/ folder or BRP.edf or STR.edf or Identification.tgt
  const isResMed =
    paths.some((p) => p.includes('DATALOG')) ||
    names.some((n) => n.endsWith('brp.edf') || n.endsWith('_brp.edf')) ||
    names.some((n) => n === 'str.edf' || n.endsWith('/str.edf')) ||
    names.some((n) => n.startsWith('identification.'));
  if (isResMed) return { brand: 'resmed', label: 'ResMed', signature };

  // BMC (Luna / RESmart): numeric SERIAL.idx/.usr with a companion SERIAL.000
  if (hasBmcTriad(files)) return { brand: 'bmc', label: 'BMC / Luna', signature };

  // Unknown — capture the signature so this brand can be learned, do not guess.
  if (files.length > 0) {
    console.warn('[brand-classifier] unmatched device signature', signature);
  }
  return { brand: 'unknown', label: 'Unknown device', signature };
}

function hasBmcTriad(files: FileRef[]): boolean {
  const lower = files.map((f) => f.name.toLowerCase());
  const has = (n: string) => lower.includes(n);
  for (const name of lower) {
    const dot = name.lastIndexOf('.');
    if (dot < 0) continue;
    const base = name.slice(0, dot);
    const ext = name.slice(dot + 1);
    if ((ext === 'idx' || ext === 'usr') && /^\d+$/.test(base) && has(`${base}.000`)) {
      return true;
    }
  }
  return false;
}

function buildSignature(files: FileRef[]): BrandSignature {
  const extensions: Record<string, number> = {};
  const folders = new Set<string>();
  for (const f of files) {
    const ext = f.name.includes('.') ? f.name.split('.').pop()!.toLowerCase() : '(none)';
    extensions[ext] = (extensions[ext] ?? 0) + 1;
    const rel = f.path || f.name;
    const parts = rel.split('/');
    if (parts.length > 1) folders.add(parts.slice(0, -1).join('/').toUpperCase());
  }
  return {
    fileCount: files.length,
    extensions,
    folders: Array.from(folders).sort().slice(0, 50),
  };
}
