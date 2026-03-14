/**
 * Attempt to extract complete JSON objects from a truncated JSON array response.
 *
 * When Claude's response is cut off by max_tokens, the JSON array is incomplete.
 * This function finds all complete top-level objects within the array by tracking
 * brace depth and string boundaries, then parses each individually.
 *
 * @param text Raw response text, possibly wrapped in markdown fences
 * @returns Array of successfully parsed objects (may be empty if nothing salvageable)
 */
export function salvageTruncatedJSON<T = Record<string, unknown>>(text: string): T[] {
  if (!text || !text.trim()) return [];

  let input = text.trim();

  // Strip markdown code fences if present
  const fenceMatch = input.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/);
  if (fenceMatch) {
    input = fenceMatch[1].trim();
  }

  // Find the start of the array
  const arrayStart = input.indexOf('[');
  if (arrayStart === -1) return [];

  // Extract everything after the opening bracket
  const content = input.slice(arrayStart + 1);

  // Find complete top-level objects by tracking brace depth and string state
  const objects: T[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let objectStart = -1;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) {
        objectStart = i;
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objectStart !== -1) {
        // Found a complete top-level object
        const objectText = content.slice(objectStart, i + 1);
        try {
          const parsed = JSON.parse(objectText) as T;
          objects.push(parsed);
        } catch {
          // Malformed object — skip
        }
        objectStart = -1;
      }
    }
  }

  return objects;
}
