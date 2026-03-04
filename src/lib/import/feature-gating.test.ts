import assert from "node:assert/strict";
import test from "node:test";
import {
  getImportFeatureGateError,
  IMPORT_FEATURE_DISABLED_ERROR,
  isAiEnabled,
} from "./feature-gating";

test("isAiEnabled returns false when key is missing", () => {
  assert.equal(isAiEnabled(undefined), false);
});

test("isAiEnabled returns false when key is whitespace", () => {
  assert.equal(isAiEnabled("   "), false);
});

test("isAiEnabled returns true when key is present", () => {
  assert.equal(isAiEnabled("sk-test-key"), true);
});

test("getImportFeatureGateError returns disabled error when key is missing", () => {
  const result = getImportFeatureGateError<{ id: string }>(undefined);

  assert.deepEqual(result, {
    success: false,
    error: IMPORT_FEATURE_DISABLED_ERROR,
  });
});

test("getImportFeatureGateError returns null when key is present", () => {
  const result = getImportFeatureGateError<{ id: string }>("sk-test-key");

  assert.equal(result, null);
});
