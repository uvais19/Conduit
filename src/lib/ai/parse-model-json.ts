/**
 * Robust JSON extraction from LLM responses (markdown fences, BOM, trailing prose,
 * and first-{ to last-} bugs when the root is an array or strings contain "}").
 */

export function stripBom(s: string): string {
  return s.replace(/^\uFEFF/, "").trim();
}

/** Slice one balanced JSON object or array starting at `start` (must be `{` or `[`). */
export function sliceBalancedJson(text: string, start: number): string | null {
  const root = text[start];
  if (root !== "{" && root !== "[") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (root === "{") {
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    } else {
      if (c === "[") depth++;
      else if (c === "]") {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

export function extractJsonBlock(text: string): string {
  const trimmed = stripBom(text);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const inner = stripBom(fenced[1]);
    const first = inner[0];
    if (first === "{" || first === "[") {
      const balanced = sliceBalancedJson(inner, 0);
      if (balanced) return balanced;
    }
    return inner;
  }

  const idxObj = trimmed.indexOf("{");
  const idxArr = trimmed.indexOf("[");
  let start = -1;
  if (idxArr >= 0 && (idxObj < 0 || idxArr < idxObj)) {
    start = idxArr;
  } else if (idxObj >= 0) {
    start = idxObj;
  }
  if (start >= 0) {
    const balanced = sliceBalancedJson(trimmed, start);
    if (balanced) return balanced;
  }

  const startLegacy = trimmed.indexOf("{");
  const endLegacy = trimmed.lastIndexOf("}");
  if (startLegacy >= 0 && endLegacy > startLegacy) {
    return trimmed.slice(startLegacy, endLegacy + 1);
  }
  return trimmed;
}

export function parseJsonFromModelResponse<T>(raw: string | null): T | null {
  if (!raw) return null;
  const trimmed = stripBom(raw);
  for (const candidate of [trimmed, extractJsonBlock(raw)]) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // try next candidate
    }
  }
  return null;
}
