import assert from "node:assert/strict";
import test from "node:test";
import { getMainNavItems } from "./app-sidebar";

test("getMainNavItems hides import when AI is disabled", () => {
  const items = getMainNavItems(false);

  assert.equal(
    items.some((item) => item.url === "/import"),
    false
  );
});

test("getMainNavItems shows import when AI is enabled", () => {
  const items = getMainNavItems(true);

  assert.equal(
    items.some((item) => item.url === "/import"),
    true
  );
});
