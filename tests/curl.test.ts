import { describe, it, expect } from "vitest";
import { generateCurlCommand } from "@/lib/curl";
import type { RequestDetail } from "@/types";

function makeRequest(overrides: Partial<RequestDetail> = {}): RequestDetail {
  return {
    id: "req-1",
    endpointId: "ep-1",
    method: "POST",
    headers: { "content-type": "application/json", "x-github-event": "push" },
    body: '{"action":"opened"}',
    queryParams: {},
    ipAddress: null,
    signatureVerified: null,
    responseStatus: 200,
    responseTime: 10,
    forwardStatus: null,
    forwardResponseCode: null,
    forwardResponseTime: null,
    failureStatus: null,
    bodySize: 20,
    createdAt: new Date().toISOString(),
    forwardUrl: null,
    ...overrides,
  };
}

describe("cURL — generateCurlCommand", () => {
  it("generates basic POST command with URL from slug", () => {
    const req = makeRequest();
    const curl = generateCurlCommand(req, undefined, "my-slug");
    expect(curl).toContain("curl -X POST");
    expect(curl).toContain("/u/my-slug");
  });

  it("uses targetUrl when provided", () => {
    const req = makeRequest();
    const curl = generateCurlCommand(req, "https://example.com/webhook");
    expect(curl).toContain("https://example.com/webhook");
    expect(curl).not.toContain("/u/my-slug");
  });

  it("falls back to endpointId when no slug or targetUrl", () => {
    const req = makeRequest();
    const curl = generateCurlCommand(req);
    expect(curl).toContain("/u/ep-1");
  });

  it("includes headers as -H flags", () => {
    const req = makeRequest({ headers: { "content-type": "application/json", "x-github-event": "push" } });
    const curl = generateCurlCommand(req, "https://example.com");
    expect(curl).toContain("-H 'content-type: application/json'");
    expect(curl).toContain("-H 'x-github-event: push'");
  });

  it("filters out hop-by-hop headers", () => {
    const req = makeRequest({
      headers: {
        "content-type": "application/json",
        connection: "keep-alive",
        "transfer-encoding": "chunked",
        host: "example.com",
      },
    });
    const curl = generateCurlCommand(req, "https://example.com");
    expect(curl).toContain("content-type");
    expect(curl).not.toContain("connection");
    expect(curl).not.toContain("transfer-encoding");
    expect(curl).not.toContain("host: example.com");
  });

  it("escapes single quotes in header values", () => {
    const req = makeRequest({ headers: { "x-custom": "it's a test" } });
    const curl = generateCurlCommand(req, "https://example.com");
    expect(curl).toContain("it'\\''s a test");
  });

  it("includes body with -d flag", () => {
    const req = makeRequest({ body: '{"action":"opened"}' });
    const curl = generateCurlCommand(req, "https://example.com");
    expect(curl).toContain("-d '{\"action\":\"opened\"}'");
  });

  it("escapes single quotes in body", () => {
    const req = makeRequest({ body: "it's a body" });
    const curl = generateCurlCommand(req, "https://example.com");
    expect(curl).toContain("it'\\''s a body");
  });

  it("omits -d flag when no body", () => {
    const req = makeRequest({ body: null });
    const curl = generateCurlCommand(req, "https://example.com");
    expect(curl).not.toContain("-d");
  });

  it("handles GET method", () => {
    const req = makeRequest({ method: "GET", body: null });
    const curl = generateCurlCommand(req, "https://example.com");
    expect(curl).toContain("curl -X GET");
  });

  it("appends query params to URL", () => {
    const req = makeRequest({ queryParams: { foo: "bar", baz: "qux" } });
    const curl = generateCurlCommand(req, undefined, "my-slug");
    expect(curl).toContain("foo=bar");
    expect(curl).toContain("baz=qux");
    expect(curl).toContain("?");
  });

  it("encodes special characters in query params", () => {
    const req = makeRequest({ queryParams: { q: "hello world", url: "https://example.com" } });
    const curl = generateCurlCommand(req, undefined, "my-slug");
    expect(curl).toContain("q=hello%20world");
    expect(curl).toContain("url=https%3A%2F%2Fexample.com");
  });

  it("omits query string when no query params", () => {
    const req = makeRequest({ queryParams: {} });
    const curl = generateCurlCommand(req, undefined, "my-slug");
    expect(curl).not.toContain("?");
  });
});
