import test from "node:test";
import assert from "node:assert/strict";
import { deriveStatus, normalizeDomain, STATUS } from "../src/lib/schema.mjs";

test("normalizeDomain keeps configured domains and falls back predictably", () => {
  const domains = ["research", "operations", "general"];
  assert.equal(normalizeDomain(domains, " Research "), "research");
  assert.equal(normalizeDomain(domains, "unknown"), "general");
});

test("deriveStatus exposes the current confidence and source-count rules", () => {
  assert.equal(deriveStatus({ confidence: "high", sources: [] }), STATUS.TRUTH);
  assert.equal(
    deriveStatus({ confidence: "medium", sources: ["a", "b", "c"] }),
    STATUS.TRUTH,
  );
  assert.equal(
    deriveStatus({ confidence: "medium", sources: ["a"] }),
    STATUS.PLAUSIBLE,
  );
  assert.equal(
    deriveStatus({ confidence: "low", sources: [] }),
    STATUS.NEEDS_VERIFICATION,
  );
  assert.equal(
    deriveStatus({
      confidence: "high",
      sources: [],
      note: "refuted by the reference",
    }),
    STATUS.CONTRADICTED,
  );
});
