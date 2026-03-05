export type ImportConflictItem = {
  id: string;
  decision: "keep_both" | "replace_existing" | "skip_import_row" | null;
};

export type ImportFlowStep = "upload" | "resolveConflicts" | "reviewRows" | "confirm";

export function getImportFlowStep(input: {
  hasSession: boolean;
  rowCount: number;
  conflictCount: number;
  unresolvedConflictCount: number;
}): ImportFlowStep {
  if (!input.hasSession) {
    return "upload";
  }

  if (input.conflictCount > 0 && input.unresolvedConflictCount > 0) {
    return "resolveConflicts";
  }

  if (input.rowCount === 0) {
    return "reviewRows";
  }

  return "confirm";
}

export function getUnresolvedConflictCount(conflicts: ImportConflictItem[]): number {
  return conflicts.filter((conflict) => conflict.decision === null).length;
}

export function buildDecisionPayload(
  conflicts: ImportConflictItem[]
): Array<{ conflictId: string; decision: "keep_both" | "replace_existing" | "skip_import_row" }> {
  return conflicts
    .filter(
      (
        conflict
      ): conflict is {
        id: string;
        decision: "keep_both" | "replace_existing" | "skip_import_row";
      } => conflict.decision !== null
    )
    .map((conflict) => ({
      conflictId: conflict.id,
      decision: conflict.decision,
    }));
}
