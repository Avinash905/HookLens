import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { validateUrl, pinIpInUrl } from "@/lib/ssrf";
import { HOP_BY_HOP_HEADERS, FORWARD_TIMEOUT } from "@/lib/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const JsonNull = (Prisma as any).JsonNull;

export interface ReplayResult {
  status: "success" | "failed" | "timeout" | "blocked";
  responseStatus: number | null;
  responseHeaders: Record<string, string> | null;
  responseBody: string | null;
  responseTime: number | null;
  errorMessage: string | null;
}

export async function replayRequest(
  requestId: string,
  targetUrl: string,
  userId: string
): Promise<{ result: ReplayResult; logId: string } | { error: string; status: number }> {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { endpoint: true },
  });

  if (!request) {
    return { error: "Request not found", status: 404 };
  }

  if (request.endpoint.userId !== userId) {
    return { error: "Forbidden", status: 403 };
  }

  const ssrfResult = await validateUrl(targetUrl);
  if (!ssrfResult.allowed) {
    const log = await prisma.replayLog.create({
      data: {
        requestId,
        targetUrl,
        responseStatus: null,
        responseHeaders: JsonNull,
        responseBody: null,
        responseTime: null,
        status: "failed",
        isRecovery: false,
        errorMessage: `URL blocked: ${ssrfResult.reason}`,
      },
    });
    return {
      result: {
        status: "blocked",
        responseStatus: null,
        responseHeaders: null,
        responseBody: null,
        responseTime: null,
        errorMessage: `URL blocked: ${ssrfResult.reason}`,
      },
      logId: log.id,
    };
  }

  const isHttps = targetUrl.startsWith("https://");
  const { url: pinnedUrl, host } = isHttps ? { url: targetUrl, host: "" } : pinIpInUrl(targetUrl, ssrfResult.ip!);

  const forwardHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.headers as Record<string, string>)) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      forwardHeaders[key] = value;
    }
  }
  if (request.body) {
    forwardHeaders["content-length"] = Buffer.byteLength(request.body).toString();
  }
  if (!isHttps) {
    forwardHeaders["host"] = host;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FORWARD_TIMEOUT);
  const startTime = Date.now();

  try {
    const res = await fetch(pinnedUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: request.body || undefined,
      redirect: "manual",
      signal: controller.signal,
    });

    const responseTime = Date.now() - startTime;
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    const responseBody = await res.text().catch(() => null);

    const isSuccess = res.status >= 200 && res.status < 400;
    const isRecovery = isSuccess && (request.failureStatus === "failed" || request.failureStatus === "timeout");

    const log = await prisma.replayLog.create({
      data: {
        requestId,
        targetUrl,
        responseStatus: res.status,
        responseHeaders,
        responseBody: responseBody?.slice(0, 10000) || null,
        responseTime,
        status: isSuccess ? "success" : "failed",
        isRecovery,
        errorMessage: null,
      },
    });

    if (isRecovery) {
      await prisma.request.update({
        where: { id: requestId },
        data: { failureStatus: "recovered" },
      });
    }

    return {
      result: {
        status: isSuccess ? "success" : "failed",
        responseStatus: res.status,
        responseHeaders,
        responseBody: responseBody?.slice(0, 10000) || null,
        responseTime,
        errorMessage: null,
      },
      logId: log.id,
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    const log = await prisma.replayLog.create({
      data: {
        requestId,
        targetUrl,
        responseStatus: null,
        responseHeaders: JsonNull,
        responseBody: null,
        responseTime,
        status: isTimeout ? "timeout" : "failed",
        isRecovery: false,
        errorMessage: errorMsg,
      },
    });

    return {
      result: {
        status: isTimeout ? "timeout" : "failed",
        responseStatus: null,
        responseHeaders: null,
        responseBody: null,
        responseTime,
        errorMessage: errorMsg,
      },
      logId: log.id,
    };
  } finally {
    clearTimeout(timeout);
  }
}
