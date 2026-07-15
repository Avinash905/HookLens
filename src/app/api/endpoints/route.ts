import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createEndpointSchema } from "@/lib/validations";
import { generateSlug } from "@/lib/slug";
import { formatEndpoint } from "@/lib/format";

const MAX_ENDPOINTS = 10;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const endpoints = await prisma.endpoint.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: endpoints.map(formatEndpoint) });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createEndpointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const count = await prisma.endpoint.count({ where: { userId: session.user.id } });
  if (count >= MAX_ENDPOINTS) {
    return NextResponse.json(
      { error: `Maximum endpoint limit reached (${MAX_ENDPOINTS})` },
      { status: 403 }
    );
  }

  const endpoint = await prisma.endpoint.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      slug: generateSlug(),
    },
  });

  return NextResponse.json(formatEndpoint(endpoint), { status: 201 });
}
