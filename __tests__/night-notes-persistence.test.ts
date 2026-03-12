import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
  length: 0,
  key: vi.fn(() => null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import { loadNightNotes, saveNightNotes, EMPTY_NOTES, hasNightNotes } from '@/lib/night-notes';

describe('night-notes persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('returns EMPTY_NOTES when no data exists', () => {
    const notes = loadNightNotes('2025-01-15');
    expect(notes).toEqual(EMPTY_NOTES);
    expect(notes.symptomRating).toBeNull();
  });

  it('saves and loads symptomRating', () => {
    const notes = { ...EMPTY_NOTES, symptomRating: 4 };
    saveNightNotes('2025-01-15', notes);
    const loaded = loadNightNotes('2025-01-15');
    expect(loaded.symptomRating).toBe(4);
  });

  it('rejects invalid symptomRating values', () => {
    // Manually inject invalid data
    localStorageMock.setItem('airwaylab_night_notes_2025-01-15', JSON.stringify({
      ...EMPTY_NOTES,
      symptomRating: 6,
    }));
    const loaded = loadNightNotes('2025-01-15');
    expect(loaded.symptomRating).toBeNull();
  });

  it('rejects non-numeric symptomRating', () => {
    localStorageMock.setItem('airwaylab_night_notes_2025-01-15', JSON.stringify({
      ...EMPTY_NOTES,
      symptomRating: 'good',
    }));
    const loaded = loadNightNotes('2025-01-15');
    expect(loaded.symptomRating).toBeNull();
  });

  it('accepts symptomRating of 1 (minimum)', () => {
    const notes = { ...EMPTY_NOTES, symptomRating: 1 };
    saveNightNotes('2025-01-15', notes);
    const loaded = loadNightNotes('2025-01-15');
    expect(loaded.symptomRating).toBe(1);
  });

  it('accepts symptomRating of 5 (maximum)', () => {
    const notes = { ...EMPTY_NOTES, symptomRating: 5 };
    saveNightNotes('2025-01-15', notes);
    const loaded = loadNightNotes('2025-01-15');
    expect(loaded.symptomRating).toBe(5);
  });

  it('does not remove entry when only symptomRating is set', () => {
    const notes = { ...EMPTY_NOTES, symptomRating: 3 };
    saveNightNotes('2025-01-15', notes);
    expect(hasNightNotes('2025-01-15')).toBe(true);
  });
});
