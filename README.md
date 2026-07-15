# HookLens

A webhook inspection tool for GitHub webhooks. Capture, inspect, replay, and debug webhook requests with live SSE updates and failure analysis.

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Prisma + PostgreSQL (Neon)
- NextAuth v5 with GitHub OAuth
- TailwindCSS + shadcn/ui
- Vitest

## Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon, Supabase, or local)
- A GitHub OAuth app (Settings → Developer settings → OAuth Apps)

### Setup

1. Clone and install:
```bash
npm install
```

2. Create `.env` from `.env.example` and fill in the values:
```bash
cp .env.example .env
```

Generate secrets:
```bash
openssl rand -base64 32
```

3. Set up the database:
```bash
npx prisma db push
```

4. Run the dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Webhook capture** — Unique URL per endpoint, supports POST/GET/PUT/DELETE/PATCH
- **GitHub signature verification** — HMAC-SHA256 with constant-time comparison
- **Live feed** — Real-time request updates via Server-Sent Events
- **Request inspector** — View headers, body, query params with JSON formatting
- **cURL export** — Copy any captured request as a curl command
- **Failure Lens** — Compares failed requests against successful ones to identify root cause
- **Replay** — Resend captured requests to any URL, with automatic recovery tracking
- **SSRF protection** — Blocks private IPs, cloud metadata endpoints, and link-local addresses
- **Tenant isolation** — All data scoped per user, authorization checks on every API route

## Testing

```bash
npm test          # unit tests (32 tests)
npm run test:load # load test (requires dev server running)
npx tsc --noEmit  # type check
npm run lint      # lint
```

## Project Structure

```
src/
  app/
    api/           # API routes (endpoints, requests, stream, auth)
    u/[slug]/      # webhook capture route
    dashboard/     # dashboard + endpoint detail pages
  components/      # React components
  lib/             # crypto, ssrf, signature, replay, failure-lens, etc
  types/           # shared TypeScript types
prisma/
  schema.prisma    # User, Endpoint, Request, ReplayLog models
tests/             # vitest test files
```

## License

MIT
