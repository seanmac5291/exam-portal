import { test } from "node:test";
import assert from "node:assert/strict";
import { examLabel } from "../src/format.js";

test("pads exam id", () => {
  assert.equal(examLabel(42, "NE"), "NE-000042");
});
