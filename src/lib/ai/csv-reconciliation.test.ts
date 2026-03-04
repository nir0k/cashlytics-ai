import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCsvReconciliationPrompt,
  parseAndValidateCsvReconciliationOutput,
  validateCsvReconciliationOutput,
} from "./csv-reconciliation";

test("validateCsvReconciliationOutput returns success for schema-valid output", () => {
  const result = validateCsvReconciliationOutput({
    decisions: [
      {
        csvRowId: "row-1",
        action: "match_existing",
        matchedTransactionId: "d36c9bdc-48d8-4f12-b7f3-d86f5f6d0931",
        confidence: 0.97,
        reason: "Same amount, same date, and highly similar description.",
      },
    ],
    summary: {
      matchedCount: 1,
      createCount: 0,
      skipCount: 0,
      reviewCount: 0,
    },
  });

  assert.equal(result.success, true);
});

test("validateCsvReconciliationOutput rejects schema-invalid output", () => {
  const result = validateCsvReconciliationOutput({
    decisions: [
      {
        csvRowId: "row-1",
        action: "match_existing",
        matchedTransactionId: null,
        confidence: 0.91,
        reason: "Missing transaction id should fail schema.",
      },
    ],
    summary: {
      matchedCount: 1,
      createCount: 0,
      skipCount: 0,
      reviewCount: 0,
    },
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.errorCode, "SCHEMA_VALIDATION_FAILED");
    assert.ok(result.issues.length > 0);
  }
});

test("parseAndValidateCsvReconciliationOutput rejects malformed partial JSON", () => {
  const result = parseAndValidateCsvReconciliationOutput('{"decisions":[');

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.errorCode, "MALFORMED_JSON");
    assert.equal(result.retryable, true);
  }
});

test("buildCsvReconciliationPrompt is authored in English", () => {
  const prompt = buildCsvReconciliationPrompt({
    accountName: "Main Checking",
    rows: [
      {
        csvRowId: "row-1",
        date: "2026-03-01",
        amount: 24.5,
        description: "Grocery Store",
        currency: "EUR",
      },
    ],
    existingTransactions: [
      {
        transactionId: "d36c9bdc-48d8-4f12-b7f3-d86f5f6d0931",
        date: "2026-03-01",
        amount: 24.5,
        description: "Grocery purchase",
        type: "expense",
      },
    ],
  });

  assert.match(prompt, /You are a reconciliation engine/);
  assert.doesNotMatch(prompt, /Du bist|Konto|Ausgabe|Einnahme/);
});
