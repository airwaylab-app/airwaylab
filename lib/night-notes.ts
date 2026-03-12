// ============================================================
// AirwayLab — Night Notes Persistence
// Structured per-night context stored in localStorage.
// ============================================================

import type { NightNotes } from './types';

const KEY_PREFIX = 'airwaylab_night_notes_';

export const EMPTY_NOTES: NightNotes = {
  caffeine: null,
  alcohol: null,
  congestion: null,
  position: null,
  stress: null,
  exercise: null,
  note: '',
  symptomRating: null,
};

function storageKey(dateStr: string): string {
  return `${KEY_PREFIX}${dateStr}`;
}

/** Load notes for a specific night. Returns EMPTY_NOTES if none saved. */
export function loadNightNotes(dateStr: string): NightNotes {
  try {
    const raw = localStorage.getItem(storageKey(dateStr));
    if (!raw) return { ...EMPTY_NOTES };
    const parsed = JSON.parse(raw);
    return {
      caffeine: parsed.caffeine ?? null,
      alcohol: parsed.alcohol ?? null,
      congestion: parsed.congestion ?? null,
      position: parsed.position ?? null,
      stress: parsed.stress ?? null,
      exercise: parsed.exercise ?? null,
      note: typeof parsed.note === 'string' ? parsed.note.slice(0, 200) : '',
      symptomRating:
        typeof parsed.symptomRating === 'number' &&
        parsed.symptomRating >= 1 &&
        parsed.symptomRating <= 5
          ? parsed.symptomRating
          : null,
    };
  } catch {
    return { ...EMPTY_NOTES };
  }
}

/** Save notes for a specific night. Removes the key if all fields are empty. */
export function saveNightNotes(dateStr: string, notes: NightNotes): void {
  try {
    const isEmpty =
      notes.caffeine === null &&
      notes.alcohol === null &&
      notes.congestion === null &&
      notes.position === null &&
      notes.stress === null &&
      notes.exercise === null &&
      notes.note.trim() === '' &&
      notes.symptomRating === null;

    if (isEmpty) {
      localStorage.removeItem(storageKey(dateStr));
    } else {
      localStorage.setItem(storageKey(dateStr), JSON.stringify(notes));
    }
  } catch {
    // Silently ignore storage errors
  }
}

/** Check if any notes exist for a night (without full parse). */
export function hasNightNotes(dateStr: string): boolean {
  try {
    return localStorage.getItem(storageKey(dateStr)) !== null;
  } catch {
    return false;
  }
}
