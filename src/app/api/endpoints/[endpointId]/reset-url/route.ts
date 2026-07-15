import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/slug";
import { formatEndpoint } from "@/lib/format";

export async function POST(
  _req: Request,
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

  const updated = await prisma.endpoint.update({
    where: { id: endpointId },
    data: { slug: generateSlug() },
  });

  return NextResponse.json(formatEndpoint(updated));
}
