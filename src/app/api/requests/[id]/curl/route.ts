import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateCurlCommand } from "@/lib/curl";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const request = await prisma.request.findUnique({
    where: { id },
    include: { endpoint: true },
  });

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (request.endpoint.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("target") || undefined;

  const detail = {
    id: request.id,
    endpointId: request.endpointId,
    method: request.method,
    headers: request.headers as Record<string, string>,
    body: request.body,
    queryParams: request.queryParams as Record<string, string>,
    ipAddress: request.ipAddress,
    signatureVerified: request.signatureVerified,
    responseStatus: request.responseStatus,
    responseTime: request.responseTime,
    forwardStatus: request.forwardStatus,
    forwardResponseCode: request.forwardResponseCode,
    forwardResponseTime: request.forwardResponseTime,
    failureStatus: request.failureStatus as "failed" | "timeout" | "recovered" | null,
    bodySize: request.bodySize,
    createdAt: request.createdAt.toISOString(),
    forwardUrl: request.endpoint.forwardUrl,
  };

  const curl = generateCurlCommand(detail, targetUrl, request.endpoint.slug);
  return NextResponse.json({ curl });
}
