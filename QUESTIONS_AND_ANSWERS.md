# HookLens — Questions & Answers

## Q: Does HookLens work with all webhook providers or only GitHub?

**HookLens works with any webhook provider for capturing, inspecting, forwarding, and replaying requests.** The webhook endpoint (`/u/[slug]`) accepts all HTTP methods (GET, POST, PUT, DELETE, PATCH) and captures headers, body, and query params regardless of the source — Stripe, Shopify, Slack, GitHub, or any custom webhook.

**However, signature verification is currently GitHub-specific.** The app checks for the `x-hub-signature-256` header and verifies HMAC-SHA256 signatures in GitHub's format. Other providers use different headers and signature schemes:

| Provider | Header | Format |
|---|---|---|
| GitHub | `x-hub-signature-256` | `sha256=<hex>` |
| Stripe | `stripe-signature` | `t=<timestamp>,v1=<hex>` |
| Shopify | `x-shopify-hmac-sha256` | base64-encoded HMAC |
| Slack | `x-slack-signature` | `v0=<timestamp>.body.hmac` |

If a non-GitHub webhook is sent to HookLens:
- **Capturing, forwarding, replay, cURL export, failure analysis** — all work normally
- **Signature verification** — will show as `false` (if a signing secret is configured) or `null` (if no secret is set), because the GitHub-specific header won't be present

Support for Stripe, Shopify, and Slack signature formats is planned for a future release.

## Q: How does the live feed work?

HookLens uses Server-Sent Events (SSE) to push new webhook requests to the dashboard in real-time. When a request hits your endpoint URL, it's instantly reflected in the request list without page refresh. The connection automatically reconnects if dropped.

## Q: What is Failure Lens?

Failure Lens compares a failed webhook delivery against a successful one from the same endpoint. It analyzes header differences, body diffs, and applies heuristic flags to pinpoint the likely cause of failure — no manual diffing required.

## Q: What does the replay feature do?

Replay re-sends a captured webhook request to any URL you specify. This is useful for:
- Retrying failed deliveries after fixing your server
- Testing your webhook handler locally
- Sending the same payload to a different endpoint

Successful replays of previously failed requests are tracked as "recovered" in the request list.

## Q: How does SSRF protection work?

All forwarding and replay target URLs are validated before the request is sent. HookLens blocks:
- Private IP ranges (10.x, 172.16-31.x, 192.168.x)
- Loopback addresses (127.x, ::1)
- Link-local addresses (169.254.x, including AWS/GCP cloud metadata endpoints)
- DNS rebinding attacks (IP is pinned after DNS resolution)

## Q: Is my data isolated from other users?

Yes. Every endpoint is scoped to the authenticated user who created it. All API routes perform authorization checks to ensure you can only access your own endpoints and requests.

## Q: Can I use this without a signing secret?

Yes. The signing secret is optional. Without it, HookLens captures and forwards webhooks normally — the signature verification status will simply show as `null` (not verified). With a secret configured, incoming requests are verified and the result is displayed in the request list.

## Q: What's the maximum request body size?

1 MB. Requests exceeding this limit receive a `413` error response.
