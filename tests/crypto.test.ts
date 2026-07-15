import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

describe("Crypto — AES-256-GCM", () => {
  it("encrypts and decrypts a string correctly", () => {
    const plaintext = "my-secret-webhook-secret";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).not.toContain(":");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for same plaintext (random IV)", () => {
    const plaintext = "same-secret";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
    expect(decrypt(enc1)).toBe(plaintext);
    expect(decrypt(enc2)).toBe(plaintext);
  });

  it("handles empty string", () => {
    const encrypted = encrypt("");
    expect(decrypt(encrypted)).toBe("");
  });

  it("handles long strings", () => {
    const plaintext = "x".repeat(10000);
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("handles unicode characters", () => {
    const plaintext = "secret-🔐-webhook-日本語";
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("my-secret");
    const buf = Buffer.from(encrypted, "base64");
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString("base64");
    expect(() => decrypt(tampered)).toThrow();
  });
});
