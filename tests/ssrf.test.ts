import { describe, it, expect } from "vitest";
import { isBlockedIP } from "@/lib/ssrf";

describe("SSRF Protection — isBlockedIP", () => {
  it("blocks loopback IPv4 (127.0.0.1)", () => {
    expect(isBlockedIP("127.0.0.1")).toBe(true);
  });

  it("blocks private 10.x range", () => {
    expect(isBlockedIP("10.0.0.1")).toBe(true);
    expect(isBlockedIP("10.255.255.255")).toBe(true);
  });

  it("blocks private 172.16-31.x range", () => {
    expect(isBlockedIP("172.16.0.1")).toBe(true);
    expect(isBlockedIP("172.31.255.255")).toBe(true);
  });

  it("blocks private 192.168.x range", () => {
    expect(isBlockedIP("192.168.0.1")).toBe(true);
    expect(isBlockedIP("192.168.1.100")).toBe(true);
  });

  it("blocks cloud metadata 169.254.169.254", () => {
    expect(isBlockedIP("169.254.169.254")).toBe(true);
  });

  it("blocks 0.0.0.0/8 range", () => {
    expect(isBlockedIP("0.0.0.0")).toBe(true);
    expect(isBlockedIP("0.255.255.255")).toBe(true);
  });

  it("blocks IPv6 loopback ::1", () => {
    expect(isBlockedIP("::1")).toBe(true);
  });

  it("blocks IPv6 link-local fe80::", () => {
    expect(isBlockedIP("fe80::1")).toBe(true);
  });

  it("blocks IPv6 unique-local fc00::", () => {
    expect(isBlockedIP("fc00::1")).toBe(true);
  });

  it("allows public IPv4 (8.8.8.8)", () => {
    expect(isBlockedIP("8.8.8.8")).toBe(false);
  });

  it("allows public IPv4 (1.1.1.1)", () => {
    expect(isBlockedIP("1.1.1.1")).toBe(false);
  });

  it("blocks invalid IP string", () => {
    expect(isBlockedIP("not-an-ip")).toBe(true);
  });
});
