import { afterEach, describe, expect, it } from "vitest";
import { decrypt, encrypt, isEncryptionConfigured } from "@/lib/encryption";

const originalKey = process.env.ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = originalKey;
});

describe("encryption key", () => {
  it("throws when the key is absent", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(isEncryptionConfigured()).toBe(false);
    expect(() => encrypt("token")).toThrow(/ENCRYPTION_KEY/);
  });

  it("throws when the key is not 32 bytes of hex", () => {
    process.env.ENCRYPTION_KEY = "abcd";
    expect(isEncryptionConfigured()).toBe(false);
    expect(() => encrypt("token")).toThrow(/64-character/);
  });

  it("round-trips plaintext with a 32-byte key", () => {
    process.env.ENCRYPTION_KEY = "ab".repeat(32);
    expect(isEncryptionConfigured()).toBe(true);
    expect(decrypt(encrypt("page-token"))).toBe("page-token");
  });
});
