import { describe, it, expect, vi, beforeEach } from "vitest";

const { resolve4, resolve6 } = vi.hoisted(() => ({
  resolve4: vi.fn(),
  resolve6: vi.fn(),
}));

vi.mock("dns", () => ({
  default: { promises: { resolve4, resolve6 } },
  promises: { resolve4, resolve6 },
}));

import { validateUrl } from "@/lib/ssrf";

describe("SSRF — validateUrl", () => {
  beforeEach(() => {
    resolve4.mockReset();
    resolve6.mockReset();
  });

  it("rejects invalid URLs", async () => {
    const result = await validateUrl("not-a-url");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Invalid URL");
  });

  it("rejects non-http protocols", async () => {
    const result = await validateUrl("ftp://example.com");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Protocol");
  });

  it("rejects file protocol", async () => {
    const result = await validateUrl("file:///etc/passwd");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Protocol");
  });

  it("allows public IPv4 resolution", async () => {
    resolve4.mockResolvedValue(["93.184.216.34"]);
    const result = await validateUrl("https://example.com");
    expect(result.allowed).toBe(true);
    expect(result.ip).toBe("93.184.216.34");
  });

  it("blocks private IPv4 resolution", async () => {
    resolve4.mockResolvedValue(["10.0.0.1"]);
    const result = await validateUrl("https://internal.example.com");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("private/blocked");
    expect(result.ip).toBe("10.0.0.1");
  });

  it("blocks cloud metadata IP", async () => {
    resolve4.mockResolvedValue(["169.254.169.254"]);
    const result = await validateUrl("https://metadata.example.com");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("private/blocked");
  });

  it("blocks loopback IP", async () => {
    resolve4.mockResolvedValue(["127.0.0.1"]);
    const result = await validateUrl("https://localhost");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("private/blocked");
  });

  it("falls back to IPv6 when IPv4 fails", async () => {
    resolve4.mockRejectedValue(new Error("ENOTFOUND"));
    resolve6.mockResolvedValue(["2606:2800:220:1:248:1893:25c8:1946"]);
    const result = await validateUrl("https://example.com");
    expect(result.allowed).toBe(true);
    expect(result.ip).toBe("2606:2800:220:1:248:1893:25c8:1946");
  });

  it("blocks IPv6 loopback from fallback", async () => {
    resolve4.mockRejectedValue(new Error("ENOTFOUND"));
    resolve6.mockResolvedValue(["::1"]);
    const result = await validateUrl("https://localhost");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("private/blocked");
  });

  it("rejects when both IPv4 and IPv6 resolution fail", async () => {
    resolve4.mockRejectedValue(new Error("ENOTFOUND"));
    resolve6.mockRejectedValue(new Error("ENOTFOUND"));
    const result = await validateUrl("https://nonexistent.example.com");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("DNS resolution failed");
  });

  it("blocks if any resolved IP is private", async () => {
    resolve4.mockResolvedValue(["93.184.216.34", "10.0.0.1"]);
    const result = await validateUrl("https://example.com");
    expect(result.allowed).toBe(false);
    expect(result.ip).toBe("10.0.0.1");
  });
});
