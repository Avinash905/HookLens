import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { RequestItem, PaginatedResponse } from "@/types";

const PAGE_SIZE = 20;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpointId } = await params;
  const endpoint = await prisma.endpoint.findUnique({ where: { id: endpointId } });
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }
  if (endpoint.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || `${PAGE_SIZE}`), 100);

  const requests = await prisma.request.findMany({
    where: {
      endpointId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: "desc" },
    take: limit + 1,
  });

  const hasMore = requests.length > limit;
  const items = requests.slice(0, limit);
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  const data: RequestItem[] = items.map((r) => ({
    id: r.id,
    method: r.method,
    signatureVerified: r.signatureVerified,
    responseStatus: r.responseStatus,
    forwardStatus: r.forwardStatus,
    forwardResponseCode: r.forwardResponseCode,
    failureStatus: r.failureStatus as "failed" | "timeout" | "recovered" | null,
    bodySize: r.bodySize,
    createdAt: r.createdAt.toISOString(),
  }));

  const response: PaginatedResponse<RequestItem> = {
    data,
    nextCursor,
    hasMore,
  };

  return NextResponse.json(response);
}
