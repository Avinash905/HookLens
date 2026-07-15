import { describe, it, expect } from "vitest";
import http from "http";

const BASE_URL = process.env.LOAD_TEST_URL || "http://localhost:3000";
const CONCURRENT_REQUESTS = 50;
const TOTAL_REQUESTS = 200;
const SLUG = process.env.LOAD_TEST_SLUG || "test-slug";

function sendWebhook(slug: string, body: Record<string, unknown>): Promise<{ status: number; time: number }> {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const url = new URL(`${BASE_URL}/u/${slug}`);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "x-github-event": "push",
      },
    };

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      res.resume();
      resolve({ status: res.statusCode || 0, time: Date.now() - startTime });
    });

    req.on("error", () => {
      resolve({ status: 0, time: Date.now() - startTime });
    });

    req.write(data);
    req.end();
  });
}

describe("Load Test — Webhook Capture", () => {
  it(`handles ${TOTAL_REQUESTS} requests with ${CONCURRENT_REQUESTS} concurrency`, async () => {
    const results: { status: number; time: number }[] = [];
    const body = { action: "opened", number: 1, repository: { id: 1 } };

    for (let i = 0; i < TOTAL_REQUESTS; i += CONCURRENT_REQUESTS) {
      const batch = Array.from({ length: Math.min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - i) }, () =>
        sendWebhook(SLUG, body)
      );
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }

    const successCount = results.filter((r) => r.status === 200).length;
    const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
    const maxTime = Math.max(...results.map((r) => r.time));
    const minTime = Math.min(...results.map((r) => r.time));

    console.log(`\nLoad Test Results:`);
    console.log(`  Total: ${results.length}`);
    console.log(`  Success: ${successCount} (${(successCount / results.length * 100).toFixed(1)}%)`);
    console.log(`  Avg time: ${avgTime.toFixed(0)}ms`);
    console.log(`  Min time: ${minTime}ms`);
    console.log(`  Max time: ${maxTime}ms`);

    expect(successCount / results.length).toBeGreaterThan(0.95);
  }, 60000);
});
