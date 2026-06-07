/**
 * Device fingerprint extraction (non-clinical).
 *
 * Pulls the device-TYPE fingerprint (model + firmware/config markers) and isolates the
 * device-IDENTITY values (serial, GUID) from a ResMed Identification file. This is string
 * and JSON work only — it does NOT parse EDF signals or compute anything clinical, so it
 * intentionally lives outside lib/parsers (which is clinical-gated). It deliberately
 * re-implements the small bit of identification parsing it needs rather than importing
 * lib/parsers/settings-extractor.
 *
 * Two real formats:
 *   - ResMed 10  Identification.tgt text:  "#PNA AirCurve_10_VAuto", "#SRN <serial>",
 *                "#CID CX036-...", "#VID", "#RID", ...   (# codes; #SRN is the serial)
 *   - ResMed 11  JSON: {"FlowGenerator":{"IdentificationProfiles":{"Product":{
 *                "UniversalIdentifier":"<guid>","SerialNumber":"<serial>",
 *                "ProductName":"...","ModelNumber":"..."}}}}
 *
 * The markers map NEVER contains the serial or GUID. Serial/GUID are returned separately,
 * for the caller to hash via lib/device-id and then discard — they are never persisted raw.
 */

export interface DeviceFingerprint {
  /** Model/product name, e.g. "AirCurve_10_VAuto" or "AirCurve 11 VAuto". "Unknown" if absent. */
  model: string;
  /** Non-identifying firmware/config markers (ResMed # codes, JSON model/firmware fields). */
  firmwareMarkers: Record<string, string>;
  /** Identifying — for hashing ONLY, never persist. */
  serial: string | null;
  /** Identifying — for hashing ONLY, never persist. */
  guid: string | null;
}

/** Keys whose VALUES identify an individual device and must never land in markers. */
const IDENTIFYING_KEY = /serial|identifier|uuid|guid|\bsn\b/i;

function emptyFingerprint(): DeviceFingerprint {
  return { model: 'Unknown', firmwareMarkers: {}, serial: null, guid: null };
}

export function extractDeviceFingerprint(
  identificationText: string | null | undefined,
): DeviceFingerprint {
  if (!identificationText || !identificationText.trim()) return emptyFingerprint();
  const text = identificationText;

  // Serial + GUID via regex first — robust even if the JSON is truncated (the stored
  // identification_text is capped at 2000 chars) or in # code form.
  const serial =
    match(text, /"SerialNumber"\s*:\s*"([^"]+)"/i) ??
    match(text, /#SRN\s+(\S+)/i) ??
    null;
  const guid = match(text, /"UniversalIdentifier"\s*:\s*"([0-9a-fA-F-]{8,})"/i) ?? null;

  const fingerprint: DeviceFingerprint = { model: 'Unknown', firmwareMarkers: {}, serial, guid };

  // Try JSON (ResMed 11) for model + markers.
  const product = tryParseProduct(text);
  if (product) {
    for (const [key, value] of Object.entries(product)) {
      if (typeof value !== 'string' && typeof value !== 'number') continue;
      if (IDENTIFYING_KEY.test(key)) continue; // drop serial / UniversalIdentifier
      fingerprint.firmwareMarkers[key] = String(value);
    }
    fingerprint.model =
      str(product.ProductName) ?? str(product.ModelNumber) ?? fingerprint.model;
  } else {
    // ResMed 10 # code text: "#PNA value", "#CID value", ...
    for (const m of text.matchAll(/#(\w+)\s+(\S+)/g)) {
      const code = m[1]!.toUpperCase();
      const value = m[2]!;
      if (code === 'SRN') continue; // serial — already captured, never a marker
      if (code === 'PNA') {
        fingerprint.model = value;
        continue;
      }
      fingerprint.firmwareMarkers[code] = value;
    }
  }

  // Last-resort model hint from free text.
  if (fingerprint.model === 'Unknown') {
    const lc = text.toLowerCase();
    if (lc.includes('aircurve')) fingerprint.model = 'AirCurve';
    else if (lc.includes('airsense')) fingerprint.model = 'AirSense';
  }

  return fingerprint;
}

function match(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m && m[1] ? m[1] : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

/** Returns the ResMed-11 Product object if the text is parseable JSON containing one. */
function tryParseProduct(text: string): Record<string, unknown> | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  if (!json || typeof json !== 'object') return null;
  const fg = (json as Record<string, unknown>).FlowGenerator as Record<string, unknown> | undefined;
  const profiles = (fg?.IdentificationProfiles ?? (json as Record<string, unknown>).IdentificationProfiles) as
    | Record<string, unknown>
    | Record<string, unknown>[]
    | undefined;
  if (!profiles) return null;
  const product = Array.isArray(profiles)
    ? (profiles[0]?.Product ?? profiles[0])
    : (profiles.Product ?? profiles);
  return product && typeof product === 'object' ? (product as Record<string, unknown>) : null;
}
