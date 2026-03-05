import assert from "node:assert/strict";
import test from "node:test";
import {
  createAiNearMatchResolver,
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

  let nearResolverCalls = 0;
  let observedNearRows: string[] = [];

  const engine = createImportReconciliationEngine({
    ...createMemoryDeps(state),
    resolveNearMatches: async (input) => {
      nearResolverCalls += 1;
      observedNearRows = input.rows.map((row) => row.id);
      return [
        {
          importRowId: "row-2",
          matchedTransactionId: "income-1",
          confidence: 0.89,
          similarityScore: 0.91,
          explanation: "Similar salary wording and matching amount around expected date.",
          suggestion: "keep_both",
        },
      ];
    },
  });

  const result = await engine.detectAndStageConflicts({
    userId: "user-1",
    sessionId: "session-2",
  });

  assert.equal(result.exactMatchCount, 0);
  assert.equal(result.nearMatchCount, 1);
  assert.equal(result.conflictRows, 1);
  assert.equal(nearResolverCalls, 1);
  assert.deepEqual(observedNearRows, ["row-2"]);
  assert.equal(result.candidates[0]?.matchStrategy, "ai_near");
  assert.deepEqual(result.candidates[0]?.resolutionOptions, [
    "replace_existing",
    "keep_both",
    "skip_import_row",
  ]);
  assert.equal(state.storedConflicts[0]?.existingIncomeId, "income-1");
  assert.equal(state.storedConflicts[0]?.suggestion, "keep_both");
});

test("detectAndStageConflicts falls back safely when AI near-match resolver throws", async () => {
  const state: MemoryState = {
    session: {
      id: "session-3",
      userId: "user-1",
      accountId: "acc-1",
    },
    rows: [
      {
        id: "row-3",
        userId: "user-1",
        rowIndex: 3,
        bookingDate: new Date("2026-03-01T09:00:00.000Z"),
        amount: "-24.50",
        description: "Grocery Store",
        excludedByUser: false,
      },
      {
        id: "row-4",
        userId: "user-1",
        rowIndex: 4,
        bookingDate: new Date("2026-03-06T08:30:00.000Z"),
        amount: "1000.00",
        description: "Salary March",
        excludedByUser: false,
      },
    ],
    transactions: [
      {
        id: "expense-3",
        userId: "user-1",
        accountId: "acc-1",
        type: "expense",
        date: new Date("2026-03-01T12:00:00.000Z"),
        amount: "24.50",
        description: "grocery store",
      },
      {
        id: "income-3",
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
    resolveNearMatches: async () => {
      throw new Error("AI service unavailable");
    },
  });

  const result = await engine.detectAndStageConflicts({
    userId: "user-1",
    sessionId: "session-3",
  });

  assert.equal(result.exactMatchCount, 1);
  assert.equal(result.nearMatchCount, 0);
  assert.equal(result.conflictRows, 1);
  assert.equal(state.storedConflicts.length, 1);
  assert.equal(state.storedConflicts[0]?.importRowId, "row-3");
});

test("createAiNearMatchResolver maps schema-valid AI output to near-match decisions", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";

  const resolver = createAiNearMatchResolver({
    runReconciliationPrompt: async (prompt) => {
      assert.match(prompt, /row-10/);
      return JSON.stringify({
        decisions: [
          {
            csvRowId: "row-10",
            action: "match_existing",
            matchedTransactionId: "d36c9bdc-48d8-4f12-b7f3-d86f5f6d0931",
            confidence: 0.97,
            reason: "Same salary amount and highly similar text.",
          },
        ],
        summary: {
          matchedCount: 1,
          createCount: 0,
          skipCount: 0,
          reviewCount: 0,
        },
      });
    },
  });

  try {
    const decisions = await resolver({
      rows: [
        {
          id: "row-10",
          userId: "user-1",
          rowIndex: 10,
          bookingDate: new Date("2026-03-10T00:00:00.000Z"),
          amount: "1000.00",
          description: "Salary April",
          excludedByUser: false,
        },
      ],
      existingTransactions: [
        {
          id: "d36c9bdc-48d8-4f12-b7f3-d86f5f6d0931",
          userId: "user-1",
          accountId: "acc-1",
          type: "income",
          date: new Date("2026-03-09T00:00:00.000Z"),
          amount: "1000.00",
          description: "Monthly Salary",
        },
      ],
    });

    assert.equal(decisions.length, 1);
    assert.equal(decisions[0]?.importRowId, "row-10");
    assert.equal(decisions[0]?.matchedTransactionId, "d36c9bdc-48d8-4f12-b7f3-d86f5f6d0931");
    assert.equal(decisions[0]?.suggestion, "replace_existing");
  } finally {
    process.env.OPENAI_API_KEY = previousApiKey;
  }
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
