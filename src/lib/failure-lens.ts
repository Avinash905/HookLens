import { prisma } from "@/lib/db";
import type { FailureAnalysis } from "@/types";

interface RequestRow {
  id: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  queryParams: Record<string, string>;
  signatureVerified: boolean | null;
  responseStatus: number;
  forwardStatus: string | null;
  forwardResponseCode: number | null;
  failureStatus: string | null;
  bodySize: number;
  createdAt: Date;
}

function diffHeaders(
  failed: Record<string, string>,
  success: Record<string, string>
): { key: string; failedValue: string; successValue: string }[] {
  const allKeys = new Set([...Object.keys(failed), ...Object.keys(success)]);
  const diffs: { key: string; failedValue: string; successValue: string }[] = [];
  for (const key of allKeys) {
    const fVal = failed[key] ?? "(missing)";
    const sVal = success[key] ?? "(missing)";
    if (fVal !== sVal) {
      diffs.push({ key, failedValue: fVal, successValue: sVal });
    }
  }
  return diffs;
}

export function diffBody(failed: string | null, success: string | null): { type: string; detail: string }[] {
  const flags: { type: string; detail: string }[] = [];

  if (!failed && success) {
    flags.push({ type: "body_missing", detail: "Failed request has no body, but successful request has a body" });
    return flags;
  }
  if (failed && !success) {
    flags.push({ type: "body_extra", detail: "Failed request has a body, but successful request has no body" });
    return flags;
  }
  if (!failed && !success) return flags;

  // Try JSON diff
  try {
    const fJson = JSON.parse(failed!);
    const sJson = JSON.parse(success!);
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];
    const diffKeys = (f: unknown, s: unknown, prefix: string) => {
      if (typeof f !== "object" || f === null || typeof s !== "object" || s === null) {
        if (JSON.stringify(f) !== JSON.stringify(s)) changed.push(prefix);
        return;
      }
      const fKeys = new Set(Object.keys(f as Record<string, unknown>));
      const sKeys = new Set(Object.keys(s as Record<string, unknown>));
      for (const k of sKeys) if (!fKeys.has(k)) added.push(prefix ? `${prefix}.${k}` : k);
      for (const k of fKeys) if (!sKeys.has(k)) removed.push(prefix ? `${prefix}.${k}` : k);
      for (const k of fKeys) {
        if (sKeys.has(k)) {
          diffKeys((f as Record<string, unknown>)[k], (s as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k);
        }
      }
    };
    diffKeys(fJson, sJson, "");
    if (added.length) flags.push({ type: "body_fields_missing", detail: `Missing fields in failed request: ${added.join(", ")}` });
    if (removed.length) flags.push({ type: "body_fields_extra", detail: `Extra fields in failed request: ${removed.join(", ")}` });
    if (changed.length) flags.push({ type: "body_fields_changed", detail: `Changed fields: ${changed.join(", ")}` });
  } catch {
    // Non-JSON body — simple string comparison
    if (failed !== success) {
      flags.push({ type: "body_diff", detail: "Body content differs between failed and successful requests" });
    }
  }

  return flags;
}

function generateHeuristics(
  failed: RequestRow,
  success: RequestRow | null
): { type: string; severity: "high" | "medium" | "low"; message: string }[] {
  const flags: { type: string; severity: "high" | "medium" | "low"; message: string }[] = [];

  // No successful request to compare
  if (!success) {
    if (failed.forwardStatus === "timeout") {
      flags.push({ type: "timeout", severity: "high", message: "Forward request timed out — target server may be down or slow" });
    }
    if (failed.forwardStatus === "failed") {
      flags.push({ type: "connection_failed", severity: "high", message: "Forward request failed — unable to connect to target URL" });
    }
    if (failed.forwardResponseCode && failed.forwardResponseCode >= 500) {
      flags.push({ type: "server_error", severity: "high", message: `Target server returned ${failed.forwardResponseCode} error` });
    }
    if (failed.forwardResponseCode === 401 || failed.forwardResponseCode === 403) {
      flags.push({ type: "auth_error", severity: "high", message: `Target server returned ${failed.forwardResponseCode} — authentication issue` });
    }
    if (failed.forwardResponseCode === 404) {
      flags.push({ type: "not_found", severity: "medium", message: "Target URL returned 404 — endpoint may not exist" });
    }
    if (failed.signatureVerified === false) {
      flags.push({ type: "signature_invalid", severity: "medium", message: "GitHub signature verification failed — secret may be misconfigured" });
    }
    return flags;
  }

  // Compare with successful request
  const headerDiffs = diffHeaders(failed.headers, success.headers);
  const bodyDiffs = diffBody(failed.body, success.body);

  if (headerDiffs.length > 0) {
    const importantHeaders = headerDiffs.filter((d) =>
      ["content-type", "x-github-event", "x-hub-signature-256", "authorization", "x-github-delivery"].includes(d.key.toLowerCase())
    );
    if (importantHeaders.length > 0) {
      flags.push({
        type: "header_diff",
        severity: "high",
        message: `Important headers differ: ${importantHeaders.map((d) => d.key).join(", ")}`,
      });
    } else {
      flags.push({
        type: "header_diff",
        severity: "low",
        message: `${headerDiffs.length} header(s) differ from successful request`,
      });
    }
  }

  for (const diff of bodyDiffs) {
    const severity = diff.type === "body_missing" || diff.type === "body_fields_missing" ? "high" : "medium";
    flags.push({ type: diff.type, severity, message: diff.detail });
  }

  if (failed.signatureVerified === false && success.signatureVerified === true) {
    flags.push({
      type: "signature_invalid",
      severity: "high",
      message: "Signature verification failed on this request but passed on successful one — secret may have changed",
    });
  }

  if (failed.forwardResponseCode && failed.forwardResponseCode >= 500 && success.forwardResponseCode && success.forwardResponseCode < 400) {
    flags.push({
      type: "server_error",
      severity: "high",
      message: `Target returned ${failed.forwardResponseCode} (successful request got ${success.forwardResponseCode})`,
    });
  }

  if (failed.forwardStatus === "timeout" && success.forwardStatus === "success") {
    flags.push({
      type: "timeout",
      severity: "high",
      message: "This request timed out but a similar request succeeded — intermittent target server issue",
    });
  }

  return flags;
}

export async function analyzeFailure(requestId: string): Promise<FailureAnalysis | null> {
  const failedRequest = await prisma.request.findUnique({
    where: { id: requestId },
  });

  if (!failedRequest) return null;

  // Find the most recent successful request on the same endpoint
  const successRequest = await prisma.request.findFirst({
    where: {
      endpointId: failedRequest.endpointId,
      id: { not: requestId },
      OR: [
        { failureStatus: null },
        { failureStatus: "recovered" },
      ],
      forwardStatus: "success",
    },
    orderBy: { id: "desc" },
  });

  const failed: RequestRow = {
    id: failedRequest.id,
    method: failedRequest.method,
    headers: failedRequest.headers as Record<string, string>,
    body: failedRequest.body,
    queryParams: failedRequest.queryParams as Record<string, string>,
    signatureVerified: failedRequest.signatureVerified,
    responseStatus: failedRequest.responseStatus,
    forwardStatus: failedRequest.forwardStatus,
    forwardResponseCode: failedRequest.forwardResponseCode,
    failureStatus: failedRequest.failureStatus,
    bodySize: failedRequest.bodySize,
    createdAt: failedRequest.createdAt,
  };

  const success: RequestRow | null = successRequest
    ? {
        id: successRequest.id,
        method: successRequest.method,
        headers: successRequest.headers as Record<string, string>,
        body: successRequest.body,
        queryParams: successRequest.queryParams as Record<string, string>,
        signatureVerified: successRequest.signatureVerified,
        responseStatus: successRequest.responseStatus,
        forwardStatus: successRequest.forwardStatus,
        forwardResponseCode: successRequest.forwardResponseCode,
        failureStatus: successRequest.failureStatus,
        bodySize: successRequest.bodySize,
        createdAt: successRequest.createdAt,
      }
    : null;

  const heuristics = generateHeuristics(failed, success);

  const headerDiffs = success ? diffHeaders(failed.headers, success.headers) : [];
  const bodyDiffs = success ? diffBody(failed.body, success.body) : [];

  return {
    requestId,
    successRequestId: success?.id ?? null,
    heuristics,
    headerDiffs: success ? headerDiffs : [],
    bodyDiffs: success ? bodyDiffs.map((d) => ({ type: d.type, detail: d.detail })) : [],
  };
}
