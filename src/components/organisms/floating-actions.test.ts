import assert from "node:assert/strict";
import test from "node:test";
import { getFloatingActions } from "./floating-actions";

test("getFloatingActions hides CSV import when AI is disabled", () => {
  const actions = getFloatingActions(false);

  assert.equal(
    actions.some((action) => action.key === "import"),
    false
  );
});

test("getFloatingActions shows CSV import when AI is enabled", () => {
  const actions = getFloatingActions(true);

  assert.equal(
    actions.some((action) => action.key === "import"),
    true
  );
});
