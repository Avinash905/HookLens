import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
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

  const logs = await prisma.replayLog.findMany({
    where: { requestId: id },
    orderBy: { createdAt: "desc" },
  });

  const data = logs.map((log) => ({
    id: log.id,
    requestId: log.requestId,
    targetUrl: log.targetUrl,
    responseStatus: log.responseStatus,
    responseHeaders: log.responseHeaders as Record<string, string> | null,
    responseBody: log.responseBody,
    responseTime: log.responseTime,
    status: log.status,
    isRecovery: log.isRecovery,
    errorMessage: log.errorMessage,
    createdAt: log.createdAt.toISOString(),
  }));

  return NextResponse.json({ data });
}
