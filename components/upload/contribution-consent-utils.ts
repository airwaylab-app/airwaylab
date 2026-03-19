const OPTED_IN_KEY = 'airwaylab_contribute_optin';
const LEGACY_KEY = 'airwaylab-contribute-optin';

/** Migrate the legacy hyphenated key to the underscore key. */
export function migrateConsentKey(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      localStorage.setItem(OPTED_IN_KEY, legacy);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch { /* noop — private browsing or storage full */ }
}

/** Read current consent state from localStorage. Returns false on any error. */
export function getConsentState(): boolean {
  try {
    return localStorage.getItem(OPTED_IN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Returns true if consent has ever been explicitly set (to '0' or '1'). */
export function hasExplicitConsent(): boolean {
  try {
    return localStorage.getItem(OPTED_IN_KEY) !== null;
  } catch {
    return false;
  }
}

/** Persist consent state to localStorage. Swallows errors. */
export function setConsentState(optedIn: boolean): void {
  try {
    localStorage.setItem(OPTED_IN_KEY, optedIn ? '1' : '0');
  } catch { /* noop */ }
}

// ── Waveform contribution date tracking ─────────────────────

const WAVEFORM_DATES_KEY = 'airwaylab_contributed_waveform_dates';
const WAVEFORM_ENGINE_KEY = 'airwaylab_contributed_waveform_engine';

/** Get the set of night dates that have had waveforms contributed. */
export function getContributedWaveformDates(): Set<string> {
  try {
    const raw = localStorage.getItem(WAVEFORM_DATES_KEY);
    if (!raw) return new Set();
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

/** Track successfully contributed waveform dates. */
export function trackContributedWaveformDate(dateStr: string): void {
  try {
    const existing = getContributedWaveformDates();
    existing.add(dateStr);
    localStorage.setItem(WAVEFORM_DATES_KEY, JSON.stringify(Array.from(existing)));
  } catch { /* noop */ }
}

/** Clear all contributed waveform dates (e.g., on engine version change). */
export function clearContributedWaveformDates(): void {
  try {
    localStorage.removeItem(WAVEFORM_DATES_KEY);
    localStorage.removeItem(WAVEFORM_ENGINE_KEY);
  } catch { /* noop */ }
}

/** Get the engine version that was active when waveforms were last contributed. */
export function getContributedWaveformEngine(): string | null {
  try {
    return localStorage.getItem(WAVEFORM_ENGINE_KEY);
  } catch {
    return null;
  }
}

/** Store the engine version used for waveform contribution. */
export function setContributedWaveformEngine(version: string): void {
  try {
    localStorage.setItem(WAVEFORM_ENGINE_KEY, version);
  } catch { /* noop */ }
}

// ── Waveform contribution failure tracking ───────────────────

const WAVEFORM_FAILURES_KEY = 'airwaylab_waveform_upload_failures';
const WAVEFORM_FAILURE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

interface WaveformFailure {
  date: string;
  failedAt: number;
}

/** Get dates that failed upload and are still in cooldown. */
export function getFailedWaveformDates(): Set<string> {
  try {
    const raw = localStorage.getItem(WAVEFORM_FAILURES_KEY);
    if (!raw) return new Set();
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries)) return new Set();
    const now = Date.now();
    const active = (entries as WaveformFailure[]).filter(
      (e) => typeof e.date === 'string' && typeof e.failedAt === 'number' && now - e.failedAt < WAVEFORM_FAILURE_COOLDOWN_MS
    );
    // Prune expired entries
    if (active.length !== (entries as WaveformFailure[]).length) {
      localStorage.setItem(WAVEFORM_FAILURES_KEY, JSON.stringify(active));
    }
    return new Set(active.map((e) => e.date));
  } catch {
    return new Set();
  }
}

/** Track a failed waveform upload date (24h cooldown before retry). */
export function trackFailedWaveformDate(dateStr: string): void {
  try {
    const raw = localStorage.getItem(WAVEFORM_FAILURES_KEY);
    const entries: WaveformFailure[] = raw ? JSON.parse(raw) : [];
    const filtered = entries.filter((e) => e.date !== dateStr);
    filtered.push({ date: dateStr, failedAt: Date.now() });
    localStorage.setItem(WAVEFORM_FAILURES_KEY, JSON.stringify(filtered));
  } catch { /* noop */ }
}

// ── Oximetry trace contribution date tracking ────────────────

const OXTRACE_DATES_KEY = 'airwaylab_contributed_oxtrace_dates';
const OXTRACE_ENGINE_KEY = 'airwaylab_contributed_oxtrace_engine';

/** Get the set of night dates that have had oximetry traces contributed. */
export function getContributedOximetryDates(): Set<string> {
  try {
    const raw = localStorage.getItem(OXTRACE_DATES_KEY);
    if (!raw) return new Set();
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

/** Track a successfully contributed oximetry trace date. */
export function trackContributedOximetryDate(dateStr: string): void {
  try {
    const existing = getContributedOximetryDates();
    existing.add(dateStr);
    localStorage.setItem(OXTRACE_DATES_KEY, JSON.stringify(Array.from(existing)));
  } catch { /* noop */ }
}

/** Clear all contributed oximetry trace dates (e.g., on engine version change). */
export function clearContributedOximetryDates(): void {
  try {
    localStorage.removeItem(OXTRACE_DATES_KEY);
    localStorage.removeItem(OXTRACE_ENGINE_KEY);
  } catch { /* noop */ }
}

/** Get the engine version that was active when oximetry traces were last contributed. */
export function getContributedOximetryEngine(): string | null {
  try {
    return localStorage.getItem(OXTRACE_ENGINE_KEY);
  } catch {
    return null;
  }
}

/** Store the engine version used for oximetry trace contribution. */
export function setContributedOximetryEngine(version: string): void {
  try {
    localStorage.setItem(OXTRACE_ENGINE_KEY, version);
  } catch { /* noop */ }
}
