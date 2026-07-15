import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyGitHubSignature } from "@/lib/signature";
import { decrypt } from "@/lib/crypto";
import { validateUrl, pinIpInUrl } from "@/lib/ssrf";
import { HOP_BY_HOP_HEADERS, MAX_BODY_SIZE, FORWARD_TIMEOUT } from "@/lib/constants";

async function readRawBody(req: Request): Promise<string> {
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let totalSize = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalSize += value.length;
      if (totalSize > MAX_BODY_SIZE) {
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}

function extractHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  return headers;
}

function extractQueryParams(url: string): Record<string, string> {
  const parsed = new URL(url);
  const params: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

function extractIpAddress(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

async function forwardRequest(
  method: string,
  headers: Record<string, string>,
  body: string | null,
  targetUrl: string
): Promise<{ status: string; responseCode: number | null; responseTime: number | null }> {
  const ssrfResult = await validateUrl(targetUrl);
  if (!ssrfResult.allowed) {
    return { status: "blocked", responseCode: null, responseTime: null };
  }

  const isHttps = targetUrl.startsWith("https://");
  const { url: pinnedUrl, host } = isHttps ? { url: targetUrl, host: "" } : pinIpInUrl(targetUrl, ssrfResult.ip!);

  const forwardHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      forwardHeaders[key] = value;
    }
  }
  if (body) {
    forwardHeaders["content-length"] = Buffer.byteLength(body).toString();
  }
  if (!isHttps) {
    forwardHeaders["host"] = host;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FORWARD_TIMEOUT);

  const startTime = Date.now();
  try {
    const res = await fetch(pinnedUrl, {
      method,
      headers: forwardHeaders,
      body: body || undefined,
      redirect: "manual",
      signal: controller.signal,
    });
    const responseTime = Date.now() - startTime;
    return {
      status: "success",
      responseCode: res.status,
      responseTime,
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    if (err instanceof Error && err.name === "AbortError") {
      return { status: "timeout", responseCode: null, responseTime };
    }
    return { status: "failed", responseCode: null, responseTime };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handleRequest(req, params, "POST");
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handleRequest(req, params, "GET");
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handleRequest(req, params, "PUT");
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handleRequest(req, params, "DELETE");
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return handleRequest(req, params, "PATCH");
}

async function handleRequest(
  req: Request,
  params: Promise<{ slug: string }>,
  method: string
) {
  const { slug } = await params;

  const endpoint = await prisma.endpoint.findUnique({ where: { slug } });
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }

  let rawBody: string;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    if (err instanceof Error && err.message === "BODY_TOO_LARGE") {
      return NextResponse.json({ error: "Request body too large (max 1MB)" }, { status: 413 });
    }
    throw err;
  }

  const headers = extractHeaders(req);
  const queryParams = extractQueryParams(req.url);
  const ipAddress = extractIpAddress(req);
  const startTime = Date.now();

  // Signature verification
  let signatureVerified: boolean | null = null;
  if (endpoint.signingSecret) {
    try {
      const secret = decrypt(endpoint.signingSecret);
      const sigHeader = headers["x-hub-signature-256"] || null;
      signatureVerified = verifyGitHubSignature(rawBody, sigHeader, secret);
    } catch {
      signatureVerified = false;
    }
  }

  // Forwarding
  let forwardStatus: string | null = null;
  let forwardResponseCode: number | null = null;
  let forwardResponseTime: number | null = null;
  let failureStatus: string | null = null;

  if (endpoint.autoForward && endpoint.forwardUrl) {
    const result = await forwardRequest(method, headers, rawBody, endpoint.forwardUrl);
    forwardStatus = result.status;
    forwardResponseCode = result.responseCode;
    forwardResponseTime = result.responseTime;
    if (result.status === "failed" || result.status === "blocked") {
      failureStatus = "failed";
    } else if (result.status === "timeout") {
      failureStatus = "timeout";
    } else if (result.responseCode && result.responseCode >= 400) {
      failureStatus = "failed";
    }
  }

  const responseTime = Date.now() - startTime;

  const [request] = await prisma.$transaction([
    prisma.request.create({
      data: {
        endpointId: endpoint.id,
        method,
        headers,
        body: rawBody || null,
        queryParams,
        ipAddress,
        signatureVerified,
        responseStatus: 200,
        responseTime,
        forwardStatus,
        forwardResponseCode,
        forwardResponseTime,
        failureStatus,
        bodySize: Buffer.byteLength(rawBody),
      },
    }),
    prisma.endpoint.update({
      where: { id: endpoint.id },
      data: {
        requestCount: { increment: 1 },
        lastRequestAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ received: true, id: request.id }, { status: 200 });
}
