import { safeGetItem, safeSetItem, safeRemoveItem } from './safe-local-storage';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type TimeFormat = '24h' | '12h';
export type NumberFormat = 'comma' | 'dot';

export interface DisplayPreferences {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  numberFormat: NumberFormat;
}

const KEYS = {
  dateFormat: 'airwaylab_date_format',
  timeFormat: 'airwaylab_time_format',
  numberFormat: 'airwaylab_number_format',
} as const;

export const DEFAULTS: DisplayPreferences = {
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  numberFormat: 'comma',
};

export function loadDisplayPreferences(): DisplayPreferences {
  const dateRaw = safeGetItem(KEYS.dateFormat);
  const timeRaw = safeGetItem(KEYS.timeFormat);
  const numberRaw = safeGetItem(KEYS.numberFormat);

  return {
    dateFormat:
      dateRaw === 'DD/MM/YYYY' || dateRaw === 'MM/DD/YYYY'
        ? dateRaw
        : DEFAULTS.dateFormat,
    timeFormat:
      timeRaw === '24h' || timeRaw === '12h'
        ? timeRaw
        : DEFAULTS.timeFormat,
    numberFormat:
      numberRaw === 'comma' || numberRaw === 'dot'
        ? numberRaw
        : DEFAULTS.numberFormat,
  };
}

export function saveDateFormat(value: DateFormat): void {
  safeSetItem(KEYS.dateFormat, value);
}

export function saveTimeFormat(value: TimeFormat): void {
  safeSetItem(KEYS.timeFormat, value);
}

export function saveNumberFormat(value: NumberFormat): void {
  safeSetItem(KEYS.numberFormat, value);
}

export function clearDisplayPreferences(): void {
  safeRemoveItem(KEYS.dateFormat);
  safeRemoveItem(KEYS.timeFormat);
  safeRemoveItem(KEYS.numberFormat);
}
