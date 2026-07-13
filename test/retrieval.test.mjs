import test from "node:test";
import assert from "node:assert/strict";
import { retrieve, tokenize } from "../src/stages/serve.mjs";

test("tokenize uses Unicode-aware word and number tokens", () => {
  assert.deepEqual(tokenize("Evidence 123, café."), [
    "evidence",
    "123",
    "café",
  ]);
});

test("retrieve ranks matching facts and omits unrelated facts", () => {
  const docs = [
    { id: "a", status: "TRUTH", text: "Water temperature affects extraction." },
    { id: "b", status: "PLAUSIBLE", text: "Grinding changes flow rate." },
  ];
  const df = new Map();
  for (const doc of docs)
    for (const token of new Set(tokenize(doc.text)))
      df.set(token, (df.get(token) || 0) + 1);
  const hits = retrieve(
    { docs, df, N: docs.length },
    "extraction temperature",
    8,
  );
  assert.deepEqual(
    hits.map((hit) => hit.id),
    ["a"],
  );
});
