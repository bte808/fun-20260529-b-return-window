import assert from "node:assert/strict";
import test from "node:test";
import {
  buildChecklist,
  buildIcs,
  itemDeadline,
  itemStatus,
  normalizeItem,
  summarizeItems
} from "../src/logic.js";

const baseItem = {
  id: "demo",
  item: "Laptop sleeve",
  place: "Stationery shop",
  purchaseDate: "2026-05-20",
  returnDays: 10,
  condition: "Keep tag attached.",
  notes: "Check backpack fit.",
  channel: "Receipt counter",
  done: false
};

test("computes the final return date from purchase date and window", () => {
  assert.equal(itemDeadline(baseItem), "2026-05-30");
});

test("labels urgent and expired windows from the current date", () => {
  assert.equal(itemStatus(baseItem, "2026-05-29").label, "Urgent");
  assert.equal(itemStatus(baseItem, "2026-06-02").label, "Expired");
});

test("normalizes and validates form data", () => {
  const item = normalizeItem({
    item: "  Shoes  ",
    place: "Mall",
    purchaseDate: "2026-05-29",
    returnDays: "30",
    condition: "",
    notes: "",
    channel: "Front desk"
  });

  assert.equal(item.item, "Shoes");
  assert.equal(item.returnDays, 30);
  assert.throws(() => normalizeItem({ ...item, returnDays: 0 }), /1 to 365/);
});

test("builds a copyable return checklist", () => {
  const checklist = buildChecklist([baseItem], "2026-05-29");
  assert.match(checklist, /Laptop sleeve/);
  assert.match(checklist, /Deadline: 2026-05-30/);
  assert.match(checklist, /1 day left/);
});

test("builds an importable calendar file", () => {
  const ics = buildIcs([baseItem], "2026-05-29");
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:Return deadline: Laptop sleeve/);
  assert.match(ics, /TRIGGER:-P1D/);
});

test("summarizes open, urgent, expired, and done items", () => {
  const summary = summarizeItems(
    [
      baseItem,
      { ...baseItem, id: "late", purchaseDate: "2026-05-01" },
      { ...baseItem, id: "done", done: true }
    ],
    "2026-05-29"
  );

  assert.equal(summary.total, 3);
  assert.equal(summary.urgent, 1);
  assert.equal(summary.expired, 1);
  assert.equal(summary.done, 1);
});
