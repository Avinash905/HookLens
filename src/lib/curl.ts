import type { RequestDetail } from "@/types";
import { HOP_BY_HOP_HEADERS } from "@/lib/constants";

export function generateCurlCommand(request: RequestDetail, targetUrl?: string, slug?: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = targetUrl || (slug ? `${baseUrl}/u/${slug}` : `${baseUrl}/u/${request.endpointId}`);

  const queryEntries = Object.entries(request.queryParams);
  const queryString = queryEntries.length > 0
    ? "?" + queryEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
    : "";
  const fullUrl = `${url}${queryString}`;

  const parts: string[] = [`curl -X ${request.method} '${fullUrl}'`];

  for (const [key, value] of Object.entries(request.headers)) {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    const escaped = value.replace(/'/g, "'\\''");
    parts.push(`  -H '${key}: ${escaped}'`);
  }

  if (request.body) {
    const escaped = request.body.replace(/'/g, "'\\''");
    parts.push(`  -d '${escaped}'`);
  }

  return parts.join(" \\\n");
}
