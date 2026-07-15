import crypto from "crypto";

export function verifyGitHubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;

  const expectedPrefix = "sha256=";
  if (!signatureHeader.startsWith(expectedPrefix)) return false;

  const expectedHex = signatureHeader.slice(expectedPrefix.length);
  const expected = Buffer.from(expectedHex, "hex");

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody);
  const computed = hmac.digest();

  if (expected.length !== computed.length) return false;

  return crypto.timingSafeEqual(expected, computed);
}
