import test from "node:test";
import assert from "node:assert/strict";
import { globToRegExp } from "../src/stages/verify.mjs";

test("globToRegExp escapes regex syntax and expands only glob stars", () => {
  const pattern = globToRegExp("C:\\reference (v1)\\**\\*.json");
  assert.equal(pattern.test("C:/reference (v1)/nested/facts.json"), true);
  assert.equal(pattern.test("C:/reference v1/nested/facts.json"), false);
  assert.equal(pattern.test("C:/reference (v1)/nested/facts.csv"), false);
});
