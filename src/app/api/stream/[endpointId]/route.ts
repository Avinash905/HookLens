import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const POLL_INTERVAL = 1000; // 1s
const MAX_DURATION = 20000; // 20s (Vercel timeout buffer)
const HEARTBEAT_INTERVAL = 15000; // 15s

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { endpointId } = await params;
  const endpoint = await prisma.endpoint.findUnique({ where: { id: endpointId } });
  if (!endpoint) {
    return new Response("Endpoint not found", { status: 404 });
  }
  if (endpoint.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };

      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      let lastSeenId: string | null = null;
      const startTime = Date.now();
      let lastHeartbeat = Date.now();

      // Send initial connected event
      const latestRequest = await prisma.request.findFirst({
        where: { endpointId },
        orderBy: { id: "desc" },
        select: { id: true },
      });
      lastSeenId = latestRequest?.id ?? null;

      safeEnqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ lastRequestId: lastSeenId })}\n\n`)
      );

      const poll = async () => {
        try {
          const newRequests = await prisma.request.findMany({
            where: {
              endpointId,
              ...(lastSeenId ? { id: { gt: lastSeenId } } : {}),
            },
            orderBy: { id: "asc" },
            take: 50,
          });

          for (const req of newRequests) {
            const data = {
              id: req.id,
              method: req.method,
              signatureVerified: req.signatureVerified,
              responseStatus: req.responseStatus,
              forwardStatus: req.forwardStatus,
              forwardResponseCode: req.forwardResponseCode,
              failureStatus: req.failureStatus,
              bodySize: req.bodySize,
              createdAt: req.createdAt.toISOString(),
            };
            safeEnqueue(
              encoder.encode(`event: request\ndata: ${JSON.stringify(data)}\n\n`)
            );
            lastSeenId = req.id;
          }

          // Heartbeat
          if (Date.now() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
            safeEnqueue(encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ t: Date.now() })}\n\n`));
            lastHeartbeat = Date.now();
          }

          // Check timeout
          if (Date.now() - startTime >= MAX_DURATION) {
            safeEnqueue(encoder.encode(`event: close\ndata: ${JSON.stringify({ reason: "timeout" })}\n\n`));
            safeClose();
            return;
          }

          if (!closed) {
            pollTimer = setTimeout(poll, POLL_INTERVAL);
          }
        } catch {
          safeClose();
        }
      };

      if (!closed) {
        pollTimer = setTimeout(poll, POLL_INTERVAL);
      }
    },

    cancel() {
      closed = true;
      if (pollTimer) clearTimeout(pollTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
