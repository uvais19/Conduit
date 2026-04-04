import fs from "fs/promises";
import path from "path";

const ROOT = path.resolve(process.cwd(), ".conduit-local-media");

export function getLocalMediaRoot(): string {
  return ROOT;
}

export function assertSafeMediaKey(key: string): void {
  if (!key || key.includes("..") || path.isAbsolute(key)) {
    throw new Error("Invalid media key");
  }
}

export async function writeLocalMediaFile(key: string, body: Buffer): Promise<void> {
  assertSafeMediaKey(key);
  const full = path.join(ROOT, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body);
}

export function resolveSafeLocalMediaPath(key: string): string | null {
  try {
    assertSafeMediaKey(key);
  } catch {
    return null;
  }
  const resolved = path.resolve(ROOT, key);
  const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : `${ROOT}${path.sep}`;
  if (resolved !== ROOT && !resolved.startsWith(rootWithSep)) {
    return null;
  }
  return resolved;
}
