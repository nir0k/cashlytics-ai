import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDecisionPayload,
  getImportFlowStep,
  getUnresolvedConflictCount,
  type ImportConflictItem,
} from "./flow";

test("getImportFlowStep returns upload without session", () => {
  const step = getImportFlowStep({
    hasSession: false,
    rowCount: 0,
    conflictCount: 0,
    unresolvedConflictCount: 0,
  });

  assert.equal(step, "upload");
});

test("getImportFlowStep returns resolveConflicts when unresolved conflicts remain", () => {
  const step = getImportFlowStep({
    hasSession: true,
    rowCount: 12,
    conflictCount: 3,
    unresolvedConflictCount: 2,
  });

  assert.equal(step, "resolveConflicts");
});

test("getImportFlowStep returns reviewRows when no rows remain", () => {
  const step = getImportFlowStep({
    hasSession: true,
    rowCount: 0,
    conflictCount: 0,
    unresolvedConflictCount: 0,
  });

  assert.equal(step, "reviewRows");
});

test("getImportFlowStep returns confirm when session is ready", () => {
  const step = getImportFlowStep({
    hasSession: true,
    rowCount: 8,
    conflictCount: 0,
    unresolvedConflictCount: 0,
  });

  assert.equal(step, "confirm");
});

test("decision helpers count unresolved and build payload", () => {
  const conflicts: ImportConflictItem[] = [
    { id: "c1", decision: "keep_both" },
    { id: "c2", decision: null },
    { id: "c3", decision: "skip_import_row" },
  ];

  assert.equal(getUnresolvedConflictCount(conflicts), 1);
  assert.deepEqual(buildDecisionPayload(conflicts), [
    { conflictId: "c1", decision: "keep_both" },
    { conflictId: "c3", decision: "skip_import_row" },
  ]);
});
