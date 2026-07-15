import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeFailure } from "@/lib/failure-lens";

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

  const analysis = await analyzeFailure(id);
  if (!analysis) {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }

  return NextResponse.json(analysis);
}
