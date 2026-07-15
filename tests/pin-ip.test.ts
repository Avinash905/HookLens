import { describe, it, expect } from "vitest";
import { pinIpInUrl } from "@/lib/ssrf";

describe("SSRF — pinIpInUrl", () => {
  it("replaces hostname with IPv4 and preserves port", () => {
    const { url, host } = pinIpInUrl("http://example.com:8080/webhook", "93.184.216.34");
    expect(host).toBe("example.com");
    expect(url).toBe("http://93.184.216.34:8080/webhook");
  });

  it("replaces hostname with IPv4 without port", () => {
    const { url, host } = pinIpInUrl("https://example.com/webhook", "93.184.216.34");
    expect(host).toBe("example.com");
    expect(url).toBe("https://93.184.216.34/webhook");
  });

  it("wraps IPv6 address in brackets", () => {
    const { url, host } = pinIpInUrl("http://example.com/webhook", "2606:2800:220:1:248:1893:25c8:1946");
    expect(host).toBe("example.com");
    expect(url).toBe("http://[2606:2800:220:1:248:1893:25c8:1946]/webhook");
  });

  it("preserves IPv6 with port", () => {
    const { url, host } = pinIpInUrl("http://example.com:3000/webhook", "::1");
    expect(host).toBe("example.com");
    expect(url).toBe("http://[::1]:3000/webhook");
  });

  it("preserves path and query string", () => {
    const { url } = pinIpInUrl("http://example.com/api/webhook?event=push&delivery=123", "1.2.3.4");
    expect(url).toBe("http://1.2.3.4/api/webhook?event=push&delivery=123");
  });

  it("returns original hostname for Host header", () => {
    const { host } = pinIpInUrl("http://api.github.com:443/webhook", "140.82.121.6");
    expect(host).toBe("api.github.com");
  });
});
