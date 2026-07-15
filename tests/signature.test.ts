import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyGitHubSignature } from "@/lib/signature";

const SECRET = "my-webhook-secret";

function makeSignature(body: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}

describe("GitHub Signature Validation", () => {
  it("returns true for valid signature", () => {
    const body = '{"action":"opened","number":1}';
    const sig = makeSignature(body, SECRET);
    expect(verifyGitHubSignature(body, sig, SECRET)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    const body = '{"action":"opened","number":1}';
    const sig = "sha256=invalidhex";
    expect(verifyGitHubSignature(body, sig, SECRET)).toBe(false);
  });

  it("returns false for missing signature header", () => {
    const body = '{"action":"opened"}';
    expect(verifyGitHubSignature(body, null, SECRET)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const body = '{"action":"opened"}';
    const sig = makeSignature(body, "wrong-secret");
    expect(verifyGitHubSignature(body, sig, SECRET)).toBe(false);
  });

  it("returns false for signature without sha256= prefix", () => {
    const body = '{"action":"opened"}';
    const hmac = crypto.createHmac("sha256", SECRET);
    hmac.update(body);
    const sig = hmac.digest("hex");
    expect(verifyGitHubSignature(body, sig, SECRET)).toBe(false);
  });

  it("returns false for tampered body", () => {
    const original = '{"action":"opened"}';
    const tampered = '{"action":"closed"}';
    const sig = makeSignature(original, SECRET);
    expect(verifyGitHubSignature(tampered, sig, SECRET)).toBe(false);
  });

  it("returns false for empty signature header", () => {
    const body = '{"action":"opened"}';
    expect(verifyGitHubSignature(body, "", SECRET)).toBe(false);
  });

  it("handles empty body correctly", () => {
    const body = "";
    const sig = makeSignature(body, SECRET);
    expect(verifyGitHubSignature(body, sig, SECRET)).toBe(true);
  });
});
