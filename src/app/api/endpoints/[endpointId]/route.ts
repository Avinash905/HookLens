import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateEndpointSchema } from "@/lib/validations";
import { validateUrl } from "@/lib/ssrf";
import { encrypt } from "@/lib/crypto";
import { formatEndpoint } from "@/lib/format";

async function getOwnedEndpoint(endpointId: string, userId: string) {
  const endpoint = await prisma.endpoint.findUnique({ where: { id: endpointId } });
  if (!endpoint) return null;
  if (endpoint.userId !== userId) return "forbidden" as const;
  return endpoint;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpointId } = await params;
  const endpoint = await getOwnedEndpoint(endpointId, session.user.id);
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }
  if (endpoint === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(formatEndpoint(endpoint));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpointId } = await params;
  const endpoint = await getOwnedEndpoint(endpointId, session.user.id);
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }
  if (endpoint === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateEndpointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};

  if (parsed.data.name !== undefined) {
    data.name = parsed.data.name;
  }

  if (parsed.data.forwardUrl !== undefined) {
    if (parsed.data.forwardUrl !== null) {
      const ssrfResult = await validateUrl(parsed.data.forwardUrl);
      if (!ssrfResult.allowed) {
        return NextResponse.json(
          { error: "URL blocked: resolves to private IP range", details: { url: parsed.data.forwardUrl, reason: ssrfResult.reason } },
          { status: 400 }
        );
      }
    }
    data.forwardUrl = parsed.data.forwardUrl;
  }

  if (parsed.data.autoForward !== undefined) {
    data.autoForward = parsed.data.autoForward;
  }

  if (parsed.data.signingSecret !== undefined) {
    data.signingSecret = parsed.data.signingSecret === null ? null : encrypt(parsed.data.signingSecret);
  }

  const updated = await prisma.endpoint.update({
    where: { id: endpointId },
    data,
  });

  return NextResponse.json(formatEndpoint(updated));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpointId } = await params;
  const endpoint = await getOwnedEndpoint(endpointId, session.user.id);
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });
  }
  if (endpoint === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.endpoint.delete({ where: { id: endpointId } });

  return NextResponse.json({ success: true });
}
