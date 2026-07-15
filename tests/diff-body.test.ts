import { describe, it, expect } from "vitest";
import { diffBody } from "@/lib/failure-lens";

describe("Failure Lens — diffBody", () => {
  it("returns no diffs for identical JSON bodies", () => {
    const body = JSON.stringify({ action: "opened", number: 1 });
    expect(diffBody(body, body)).toEqual([]);
  });

  it("returns no diffs for both null bodies", () => {
    expect(diffBody(null, null)).toEqual([]);
  });

  it("flags body_missing when failed has no body but success does", () => {
    const diffs = diffBody(null, JSON.stringify({ action: "opened" }));
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe("body_missing");
  });

  it("flags body_extra when failed has body but success does not", () => {
    const diffs = diffBody(JSON.stringify({ action: "opened" }), null);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe("body_extra");
  });

  it("detects top-level changed field", () => {
    const failed = JSON.stringify({ action: "opened", number: 1 });
    const success = JSON.stringify({ action: "closed", number: 1 });
    const diffs = diffBody(failed, success);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe("body_fields_changed");
    expect(diffs[0].detail).toContain("action");
  });

  it("detects missing field in failed request", () => {
    const failed = JSON.stringify({ action: "opened" });
    const success = JSON.stringify({ action: "opened", number: 1 });
    const diffs = diffBody(failed, success);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe("body_fields_missing");
    expect(diffs[0].detail).toContain("number");
  });

  it("detects extra field in failed request", () => {
    const failed = JSON.stringify({ action: "opened", number: 1, extra: true });
    const success = JSON.stringify({ action: "opened", number: 1 });
    const diffs = diffBody(failed, success);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe("body_fields_extra");
    expect(diffs[0].detail).toContain("extra");
  });

  it("detects nested field changes", () => {
    const failed = JSON.stringify({ repository: { id: 1, name: "foo" } });
    const success = JSON.stringify({ repository: { id: 1, name: "bar" } });
    const diffs = diffBody(failed, success);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe("body_fields_changed");
    expect(diffs[0].detail).toContain("repository.name");
  });

  it("detects nested missing field", () => {
    const failed = JSON.stringify({ repository: { id: 1 } });
    const success = JSON.stringify({ repository: { id: 1, name: "foo" } });
    const diffs = diffBody(failed, success);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe("body_fields_missing");
    expect(diffs[0].detail).toContain("repository.name");
  });

  it("detects deeply nested changes (3 levels)", () => {
    const failed = JSON.stringify({ a: { b: { c: 1 } } });
    const success = JSON.stringify({ a: { b: { c: 2 } } });
    const diffs = diffBody(failed, success);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe("body_fields_changed");
    expect(diffs[0].detail).toContain("a.b.c");
  });

  it("detects multiple diffs at once", () => {
    const failed = JSON.stringify({ action: "opened", number: 1, repo: { name: "foo" } });
    const success = JSON.stringify({ action: "closed", number: 1, repo: { name: "bar", stars: 5 } });
    const diffs = diffBody(failed, success);
    expect(diffs.length).toBeGreaterThanOrEqual(2);
    const types = diffs.map((d) => d.type);
    expect(types).toContain("body_fields_changed");
    expect(types).toContain("body_fields_missing");
  });

  it("falls back to string comparison for non-JSON bodies", () => {
    const diffs = diffBody("plain text body", "plain text body different");
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe("body_diff");
  });

  it("returns no diffs for identical non-JSON bodies", () => {
    expect(diffBody("same text", "same text")).toEqual([]);
  });
});
