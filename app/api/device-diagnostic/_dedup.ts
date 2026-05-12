export const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000

export const deviceModelLastAlertTs = new Map<string, number>()
export const deviceModelHitCount = new Map<string, number>()

/** Exported only for unit tests — do not call in production code. */
export function __resetForTests(): void {
  deviceModelLastAlertTs.clear()
  deviceModelHitCount.clear()
}
