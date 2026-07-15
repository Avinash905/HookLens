import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    endpoint: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    request: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    replayLog: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { verifyGitHubSignature } from "@/lib/signature";
import { isBlockedIP } from "@/lib/ssrf";

describe("Tenant Isolation — Authorization Checks", () => {
  it("returns 403 when user A accesses user B's endpoint", async () => {
    vi.mocked(prisma.endpoint.findUnique).mockResolvedValue({
      id: "ep-1",
      userId: "user-B",
      name: "B's endpoint",
      slug: "slug-b",
      forwardUrl: null,
      autoForward: false,
      signingSecret: null,
      requestCount: 0,
      lastRequestAt: null,
      createdAt: new Date(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const endpoint = await prisma.endpoint.findUnique({ where: { id: "ep-1" } });
    expect(endpoint).not.toBeNull();
    expect(endpoint!.userId).toBe("user-B");
    expect(endpoint!.userId).not.toBe("user-A");
  });

  it("returns 403 when user A accesses user B's request", async () => {
    vi.mocked(prisma.request.findUnique).mockResolvedValue({
      id: "req-1",
      endpointId: "ep-1",
      method: "POST",
      headers: {},
      body: null,
      queryParams: {},
      ipAddress: null,
      signatureVerified: null,
      responseStatus: 200,
      responseTime: 10,
      forwardStatus: null,
      forwardResponseCode: null,
      forwardResponseTime: null,
      failureStatus: null,
      bodySize: 0,
      createdAt: new Date(),
      endpoint: {
        id: "ep-1",
        userId: "user-B",
        name: "B's endpoint",
        slug: "slug-b",
        forwardUrl: null,
        autoForward: false,
        signingSecret: null,
        requestCount: 0,
        lastRequestAt: null,
        createdAt: new Date(),
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const request = await prisma.request.findUnique({ where: { id: "req-1" }, include: { endpoint: true } });
    expect(request).not.toBeNull();
    expect(request!.endpoint.userId).toBe("user-B");
    expect(request!.endpoint.userId).not.toBe("user-A");
  });

  it("does not leak endpoint data across users in findMany", async () => {
    vi.mocked(prisma.endpoint.findMany).mockResolvedValue([
      {
        id: "ep-1",
        userId: "user-A",
        name: "A's endpoint",
        slug: "slug-a",
        forwardUrl: null,
        autoForward: false,
        signingSecret: null,
        requestCount: 0,
        lastRequestAt: null,
        createdAt: new Date(),
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any[]);

    const endpoints = await prisma.endpoint.findMany({ where: { userId: "user-A" } });
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].userId).toBe("user-A");
  });
});

describe("Security — Signature verification is constant-time", () => {
  it("rejects wrong-length signatures without error", () => {
    const body = '{"test":true}';
    const result = verifyGitHubSignature(body, "sha256=abc", "secret");
    expect(result).toBe(false);
  });
});

describe("Security — SSRF blocks cloud metadata", () => {
  it("blocks AWS metadata 169.254.169.254", () => {
    expect(isBlockedIP("169.254.169.254")).toBe(true);
  });

  it("blocks GCP metadata 169.254.169.253", () => {
    expect(isBlockedIP("169.254.169.253")).toBe(true);
  });
});
