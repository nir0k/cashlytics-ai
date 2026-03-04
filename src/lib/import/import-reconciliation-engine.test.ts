import assert from "node:assert/strict";
import test from "node:test";
import {
  createImportReconciliationEngine,
  toStagedConflictCandidateRecord,
  type ImportReconciliationEngineDeps,
  type ReconciliationManualTransaction,
  type ReconciliationSession,
  type ReconciliationStagedRow,
  type StagedConflictCandidateRecord,
} from "./import-reconciliation-engine";

type MemoryState = {
  session: ReconciliationSession;
  rows: ReconciliationStagedRow[];
  transactions: ReconciliationManualTransaction[];
  storedConflicts: StagedConflictCandidateRecord[];
  observedUserIds: string[];
};

function createMemoryDeps(state: MemoryState): ImportReconciliationEngineDeps {
  return {
    store: {
      async getSession(userId: string, sessionId: string) {
        if (state.session.userId !== userId || state.session.id !== sessionId) {
          return null;
        }
        return state.session;
      },

      async getStagedRows() {
        return state.rows;
      },

      async getManualTransactions(userId: string) {
        state.observedUserIds.push(userId);
        return state.transactions;
      },

      async replaceConflicts(
        _userId: string,
        _sessionId: string,
        conflicts: StagedConflictCandidateRecord[]
      ) {
        state.storedConflicts = conflicts;
      },
    },
  };
}

test("detectAndStageConflicts resolves deterministic exact matches before AI", async () => {
  const state: MemoryState = {
    session: {
      id: "session-1",
      userId: "user-1",
      accountId: "acc-1",
    },
    rows: [
      {
        id: "row-1",
        userId: "user-1",
        rowIndex: 1,
        bookingDate: new Date("2026-03-01T08:30:00.000Z"),
        amount: "-24.50",
        description: "Grocery Store",
        excludedByUser: false,
      },
    ],
    transactions: [
      {
        id: "expense-1",
        userId: "user-1",
        accountId: "acc-1",
        type: "expense",
        date: new Date("2026-03-01T12:00:00.000Z"),
        amount: "24.50",
        description: "grocery   store",
      },
      {
        id: "expense-2",
        userId: "other-user",
        accountId: "acc-1",
        type: "expense",
        date: new Date("2026-03-01T12:00:00.000Z"),
        amount: "24.50",
        description: "Grocery Store",
      },
    ],
    storedConflicts: [],
    observedUserIds: [],
  };

  let nearResolverCalls = 0;
  const engine = createImportReconciliationEngine({
    ...createMemoryDeps(state),
    resolveNearMatches: async () => {
      nearResolverCalls += 1;
      return [];
    },
  });

  const result = await engine.detectAndStageConflicts({
    userId: "user-1",
    sessionId: "session-1",
  });

  assert.equal(result.exactMatchCount, 1);
  assert.equal(result.nearMatchCount, 0);
  assert.equal(result.conflictRows, 1);
  assert.equal(nearResolverCalls, 0);
  assert.equal(state.observedUserIds[0], "user-1");
  assert.equal(state.storedConflicts.length, 1);
  assert.equal(state.storedConflicts[0]?.existingExpenseId, "expense-1");
  assert.equal(state.storedConflicts[0]?.suggestion, "replace_existing");
});

test("detectAndStageConflicts uses AI near-match path for unresolved rows", async () => {
  const state: MemoryState = {
    session: {
      id: "session-2",
      userId: "user-1",
      accountId: "acc-1",
    },
    rows: [
      {
        id: "row-2",
        userId: "user-1",
        rowIndex: 2,
        bookingDate: new Date("2026-03-05T08:30:00.000Z"),
        amount: "1000.00",
        description: "Salary March",
        excludedByUser: false,
      },
    ],
    transactions: [
      {
        id: "income-1",
        userId: "user-1",
        accountId: "acc-1",
        type: "income",
        date: new Date("2026-03-04T08:30:00.000Z"),
        amount: "1000.00",
        description: "Monthly Salary",
      },
    ],
    storedConflicts: [],
    observedUserIds: [],
  };

  const engine = createImportReconciliationEngine({
    ...createMemoryDeps(state),
    resolveNearMatches: async () => [
      {
        importRowId: "row-2",
        matchedTransactionId: "income-1",
        confidence: 0.89,
        similarityScore: 0.91,
        explanation: "Similar salary wording and matching amount around expected date.",
        suggestion: "keep_both",
      },
    ],
  });

  const result = await engine.detectAndStageConflicts({
    userId: "user-1",
    sessionId: "session-2",
  });

  assert.equal(result.exactMatchCount, 0);
  assert.equal(result.nearMatchCount, 1);
  assert.equal(result.conflictRows, 1);
  assert.equal(result.candidates[0]?.matchStrategy, "ai_near");
  assert.deepEqual(result.candidates[0]?.resolutionOptions, [
    "replace_existing",
    "keep_both",
    "skip_import_row",
  ]);
  assert.equal(state.storedConflicts[0]?.existingIncomeId, "income-1");
  assert.equal(state.storedConflicts[0]?.suggestion, "keep_both");
});

test("toStagedConflictCandidateRecord keeps machine-readable conflict options contract", () => {
  const record = toStagedConflictCandidateRecord({
    userId: "user-1",
    sessionId: "session-9",
    candidate: {
      importRowId: "row-9",
      existingTransactionId: "income-9",
      existingTransactionType: "income",
      matchStrategy: "ai_near",
      similarityScore: 0.75,
      confidence: 0.8,
      explanation: "Possible duplicate.",
      suggestion: "needs_user_review",
      resolutionOptions: ["replace_existing", "keep_both", "skip_import_row"],
    },
  });

  assert.equal(record.existingIncomeId, "income-9");
  assert.equal(record.existingExpenseId, null);
  assert.equal(record.similarityScore, "0.7500");
  assert.equal(record.confidence, "0.8000");
});
