import assert from "node:assert/strict";
import test from "node:test";
import { createImportReviewService, type ImportReviewServiceDeps } from "./import-review-service";

type MemorySession = {
  id: string;
  userId: string;
  status: "draft" | "review" | "confirmed" | "cancelled";
  stagedRows: number;
  conflictRows: number;
};

type MemoryRow = {
  id: string;
  userId: string;
  sessionId: string;
  bookingDate: Date | null;
  amount: string;
  currency: string;
  description: string;
  counterparty: string | null;
  senderAccount: string | null;
  receiverAccount: string | null;
  balanceAfterBooking: string | null;
  normalizedPayload: string;
  excludedByUser: boolean;
};

type MemoryConflict = {
  id: string;
  userId: string;
  sessionId: string;
  importRowId: string;
};

type MemoryDecision = {
  conflictId: string;
  userId: string;
  sessionId: string;
  decision: "keep_both" | "replace_existing" | "skip_import_row";
};

type MemoryState = {
  sessions: MemorySession[];
  rows: MemoryRow[];
  conflicts: MemoryConflict[];
  decisions: MemoryDecision[];
};

function createMemoryDeps(state: MemoryState): ImportReviewServiceDeps {
  return {
    async inTransaction(callback) {
      const draft = structuredClone(state) as MemoryState;

      const store = {
        async getSessionById(userId: string, sessionId: string) {
          return (
            draft.sessions.find(
              (session) => session.userId === userId && session.id === sessionId
            ) ?? null
          );
        },

        async getRowById(userId: string, sessionId: string, rowId: string) {
          return (
            draft.rows.find(
              (row) => row.userId === userId && row.sessionId === sessionId && row.id === rowId
            ) ?? null
          );
        },

        async updateRow(userId: string, sessionId: string, rowId: string, row: MemoryRow) {
          const rowIndex = draft.rows.findIndex(
            (item) => item.userId === userId && item.sessionId === sessionId && item.id === rowId
          );
          if (rowIndex < 0) {
            throw new Error("Staged import row not found");
          }
          draft.rows[rowIndex] = row;
        },

        async excludeRowAndClearConflicts(userId: string, sessionId: string, rowId: string) {
          const row = draft.rows.find(
            (item) => item.userId === userId && item.sessionId === sessionId && item.id === rowId
          );
          if (!row) {
            throw new Error("Staged import row not found");
          }

          row.excludedByUser = true;
          const removedConflictIds = draft.conflicts
            .filter((conflict) => conflict.userId === userId && conflict.sessionId === sessionId)
            .filter((conflict) => conflict.importRowId === rowId)
            .map((conflict) => conflict.id);

          draft.conflicts = draft.conflicts.filter(
            (conflict) => !removedConflictIds.includes(conflict.id)
          );
          draft.decisions = draft.decisions.filter(
            (decision) => !removedConflictIds.includes(decision.conflictId)
          );
        },

        async countIncludedRows(userId: string, sessionId: string) {
          return draft.rows.filter(
            (row) => row.userId === userId && row.sessionId === sessionId && !row.excludedByUser
          ).length;
        },

        async countConflicts(userId: string, sessionId: string) {
          return draft.conflicts.filter(
            (conflict) => conflict.userId === userId && conflict.sessionId === sessionId
          ).length;
        },

        async replaceDecisions(
          userId: string,
          sessionId: string,
          decisions: Array<{
            conflictId: string;
            decision: "keep_both" | "replace_existing" | "skip_import_row";
          }>
        ) {
          const decisionConflictIds = decisions.map((decision) => decision.conflictId);
          const validConflictIds = draft.conflicts
            .filter((conflict) => conflict.userId === userId && conflict.sessionId === sessionId)
            .map((conflict) => conflict.id);

          if (!decisionConflictIds.every((id) => validConflictIds.includes(id))) {
            throw new Error("One or more conflict decisions target invalid rows");
          }

          draft.decisions = draft.decisions.filter(
            (decision) =>
              !(
                decision.userId === userId &&
                decision.sessionId === sessionId &&
                decisionConflictIds.includes(decision.conflictId)
              )
          );
          draft.decisions.push(
            ...decisions.map((decision) => ({ ...decision, userId, sessionId }))
          );
          return decisions.length;
        },

        async updateSessionCounters(
          userId: string,
          sessionId: string,
          counters: { stagedRows: number; conflictRows: number }
        ) {
          const session = draft.sessions.find(
            (item) => item.userId === userId && item.id === sessionId
          );
          if (!session) {
            throw new Error("Import session not found");
          }
          session.stagedRows = counters.stagedRows;
          session.conflictRows = counters.conflictRows;
        },
      };

      const result = await callback(store);
      Object.assign(state, draft);
      return result;
    },
  };
}

test("updateStagedRow persists edited staged-row fields", async () => {
  const state: MemoryState = {
    sessions: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        userId: "20000000-0000-4000-8000-000000000001",
        status: "review",
        stagedRows: 1,
        conflictRows: 0,
      },
    ],
    rows: [
      {
        id: "30000000-0000-4000-8000-000000000001",
        userId: "20000000-0000-4000-8000-000000000001",
        sessionId: "10000000-0000-4000-8000-000000000001",
        bookingDate: new Date("2026-03-01T00:00:00.000Z"),
        amount: "12.00",
        currency: "EUR",
        description: "Old Desc",
        counterparty: null,
        senderAccount: null,
        receiverAccount: null,
        balanceAfterBooking: null,
        normalizedPayload: JSON.stringify({ amount: "12.00", description: "Old Desc" }),
        excludedByUser: false,
      },
    ],
    conflicts: [],
    decisions: [],
  };

  const service = createImportReviewService(createMemoryDeps(state));
  const result = await service.updateStagedRow({
    userId: "20000000-0000-4000-8000-000000000001",
    sessionId: "10000000-0000-4000-8000-000000000001",
    rowId: "30000000-0000-4000-8000-000000000001",
    patch: {
      amount: "14.9",
      description: "Updated Salary",
      bookingDate: "2026-03-02",
    },
  });

  assert.equal(result.rowId, "30000000-0000-4000-8000-000000000001");
  assert.equal(state.rows[0]?.amount, "14.90");
  assert.equal(state.rows[0]?.description, "Updated Salary");
  assert.equal(state.rows[0]?.bookingDate?.toISOString().slice(0, 10), "2026-03-02");
});

test("removeStagedRow enforces ownership and clears conflicts/decisions", async () => {
  const state: MemoryState = {
    sessions: [
      {
        id: "10000000-0000-4000-8000-000000000002",
        userId: "20000000-0000-4000-8000-000000000002",
        status: "review",
        stagedRows: 2,
        conflictRows: 1,
      },
    ],
    rows: [
      {
        id: "30000000-0000-4000-8000-000000000010",
        userId: "20000000-0000-4000-8000-000000000002",
        sessionId: "10000000-0000-4000-8000-000000000002",
        bookingDate: new Date("2026-03-01T00:00:00.000Z"),
        amount: "4.99",
        currency: "EUR",
        description: "Coffee",
        counterparty: null,
        senderAccount: null,
        receiverAccount: null,
        balanceAfterBooking: null,
        normalizedPayload: "{}",
        excludedByUser: false,
      },
      {
        id: "30000000-0000-4000-8000-000000000011",
        userId: "20000000-0000-4000-8000-000000000002",
        sessionId: "10000000-0000-4000-8000-000000000002",
        bookingDate: new Date("2026-03-01T00:00:00.000Z"),
        amount: "12.00",
        currency: "EUR",
        description: "Lunch",
        counterparty: null,
        senderAccount: null,
        receiverAccount: null,
        balanceAfterBooking: null,
        normalizedPayload: "{}",
        excludedByUser: false,
      },
    ],
    conflicts: [
      {
        id: "40000000-0000-4000-8000-000000000001",
        userId: "20000000-0000-4000-8000-000000000002",
        sessionId: "10000000-0000-4000-8000-000000000002",
        importRowId: "30000000-0000-4000-8000-000000000010",
      },
    ],
    decisions: [
      {
        conflictId: "40000000-0000-4000-8000-000000000001",
        userId: "20000000-0000-4000-8000-000000000002",
        sessionId: "10000000-0000-4000-8000-000000000002",
        decision: "replace_existing",
      },
    ],
  };

  const service = createImportReviewService(createMemoryDeps(state));

  await assert.rejects(
    () =>
      service.removeStagedRow({
        userId: "20000000-0000-4000-8000-000000000099",
        sessionId: "10000000-0000-4000-8000-000000000002",
        rowId: "30000000-0000-4000-8000-000000000010",
      }),
    /Import session not found/
  );

  const result = await service.removeStagedRow({
    userId: "20000000-0000-4000-8000-000000000002",
    sessionId: "10000000-0000-4000-8000-000000000002",
    rowId: "30000000-0000-4000-8000-000000000010",
  });

  assert.equal(result.stagedRows, 1);
  assert.equal(result.conflictRows, 0);
  assert.equal(state.rows[0]?.excludedByUser, true);
  assert.equal(state.conflicts.length, 0);
  assert.equal(state.decisions.length, 0);
});

test("saveConflictDecisions persists conflict decisions", async () => {
  const state: MemoryState = {
    sessions: [
      {
        id: "10000000-0000-4000-8000-000000000003",
        userId: "20000000-0000-4000-8000-000000000003",
        status: "review",
        stagedRows: 2,
        conflictRows: 2,
      },
    ],
    rows: [],
    conflicts: [
      {
        id: "40000000-0000-4000-8000-000000000010",
        userId: "20000000-0000-4000-8000-000000000003",
        sessionId: "10000000-0000-4000-8000-000000000003",
        importRowId: "30000000-0000-4000-8000-000000000100",
      },
      {
        id: "40000000-0000-4000-8000-000000000011",
        userId: "20000000-0000-4000-8000-000000000003",
        sessionId: "10000000-0000-4000-8000-000000000003",
        importRowId: "30000000-0000-4000-8000-000000000101",
      },
    ],
    decisions: [
      {
        conflictId: "40000000-0000-4000-8000-000000000010",
        userId: "20000000-0000-4000-8000-000000000003",
        sessionId: "10000000-0000-4000-8000-000000000003",
        decision: "keep_both",
      },
    ],
  };

  const service = createImportReviewService(createMemoryDeps(state));
  const result = await service.saveConflictDecisions({
    userId: "20000000-0000-4000-8000-000000000003",
    sessionId: "10000000-0000-4000-8000-000000000003",
    decisions: [
      {
        conflictId: "40000000-0000-4000-8000-000000000010",
        decision: "replace_existing",
      },
      {
        conflictId: "40000000-0000-4000-8000-000000000011",
        decision: "skip_import_row",
      },
    ],
  });

  assert.equal(result.savedCount, 2);
  assert.equal(state.decisions.length, 2);
  assert.equal(
    state.decisions.find(
      (decision) => decision.conflictId === "40000000-0000-4000-8000-000000000010"
    )?.decision,
    "replace_existing"
  );
});
