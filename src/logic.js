const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const SAMPLE_ITEMS = [
  {
    id: "sample-headphones",
    item: "Noise-canceling headphones",
    place: "Downtown electronics shop",
    purchaseDate: "2026-05-21",
    returnDays: 14,
    condition: "Keep box, cable, and receipt together.",
    notes: "Try calls in a noisy cafe before deciding.",
    channel: "In-store desk",
    done: false
  },
  {
    id: "sample-textbook",
    item: "Course reference book",
    place: "Campus bookstore",
    purchaseDate: "2026-05-18",
    returnDays: 21,
    condition: "No writing inside; keep price sticker.",
    notes: "Compare with library copy after first lecture.",
    channel: "Receipt counter",
    done: false
  }
];

export function toIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    throw new Error("Use a YYYY-MM-DD date.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    throw new Error("Use a real calendar date.");
  }

  return date;
}

export function addDays(isoDate, days) {
  const date = parseIsoDate(isoDate);
  date.setDate(date.getDate() + Number(days));
  return toIsoDate(date);
}

export function daysBetween(startIso, endIso) {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  return Math.round((end - start) / MS_PER_DAY);
}

export function itemDeadline(item) {
  return addDays(item.purchaseDate, Number(item.returnDays || 0));
}

export function itemStatus(item, todayIso = toIsoDate()) {
  const deadline = itemDeadline(item);
  const daysLeft = daysBetween(todayIso, deadline);

  if (item.done) {
    return { label: "Done", tone: "done", daysLeft, deadline };
  }

  if (daysLeft < 0) {
    return { label: "Expired", tone: "expired", daysLeft, deadline };
  }

  if (daysLeft <= 2) {
    return { label: "Urgent", tone: "urgent", daysLeft, deadline };
  }

  if (daysLeft <= 7) {
    return { label: "Soon", tone: "soon", daysLeft, deadline };
  }

  return { label: "Open", tone: "open", daysLeft, deadline };
}

export function nextAction(item, todayIso = toIsoDate()) {
  const status = itemStatus(item, todayIso);
  const returnPath = item.channel || "the listed return path";

  if (item.done) {
    return "Resolved. Keep the record until the refund, exchange, or keep decision is confirmed.";
  }

  if (status.daysLeft < 0) {
    return `Window closed on ${status.deadline}. Check exception policy, warranty, or resale before archiving.`;
  }

  if (status.daysLeft <= 2) {
    return `Act now: pack the item, receipt, and required condition; use ${returnPath}.`;
  }

  if (status.daysLeft <= 7) {
    return `Run the final keep-or-return test by ${addDays(status.deadline, -2)} so there is buffer.`;
  }

  return `Schedule a trial by ${addDays(status.deadline, -3)} and keep ${
    item.condition ? "the required condition intact" : "packaging and proof of purchase together"
  }.`;
}

export function sortItems(items, todayIso = toIsoDate()) {
  return [...items].sort((a, b) => {
    const statusA = itemStatus(a, todayIso);
    const statusB = itemStatus(b, todayIso);
    if (a.done !== b.done) return Number(a.done) - Number(b.done);
    if (statusA.daysLeft !== statusB.daysLeft) return statusA.daysLeft - statusB.daysLeft;
    return a.item.localeCompare(b.item);
  });
}

export function buildChecklist(items, todayIso = toIsoDate()) {
  const active = sortItems(items, todayIso).filter((item) => !item.done);

  if (!active.length) {
    return "No open return windows. Add an item when you buy something uncertain.";
  }

  return active
    .map((item) => {
      const status = itemStatus(item, todayIso);
      const dayWord = status.daysLeft === 1 ? "day" : "days";
      const left =
        status.daysLeft >= 0
          ? `${status.daysLeft} ${dayWord} left`
          : `${Math.abs(status.daysLeft)} ${dayWord} late`;
      const details = [
        `- ${item.item} (${item.place || "unknown place"})`,
        `  Deadline: ${status.deadline} - ${left}`,
        `  Return path: ${item.channel || "check receipt/store policy"}`,
        `  Next action: ${nextAction(item, todayIso)}`
      ];

      if (item.condition) details.push(`  Condition: ${item.condition}`);
      if (item.notes) details.push(`  Note: ${item.notes}`);

      return details.join("\n");
    })
    .join("\n\n");
}

function escapeIcs(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function compactDate(isoDate) {
  return isoDate.replace(/-/g, "");
}

export function buildIcs(items, todayIso = toIsoDate()) {
  const active = sortItems(items, todayIso).filter((item) => !item.done);
  const stamp = compactDate(todayIso) + "T090000";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Return Window Buddy//EN",
    "CALSCALE:GREGORIAN"
  ];

  active.forEach((item) => {
    const status = itemStatus(item, todayIso);
    const summary = `Return deadline: ${item.item}`;
    const description = [
      `Place: ${item.place || "unknown"}`,
      `Return path: ${item.channel || "check receipt/store policy"}`,
      item.condition ? `Condition: ${item.condition}` : "",
      item.notes ? `Note: ${item.notes}` : ""
    ]
      .filter(Boolean)
      .join("\\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcs(item.id)}@return-window-buddy`,
      `DTSTAMP:${stamp}Z`,
      `DTSTART;VALUE=DATE:${compactDate(status.deadline)}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(summary)}`,
      "TRIGGER:-P1D",
      "END:VALARM",
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function summarizeItems(items, todayIso = toIsoDate()) {
  return items.reduce(
    (summary, item) => {
      const status = itemStatus(item, todayIso);
      summary.total += 1;
      summary[status.tone] += 1;
      if (!item.done && status.daysLeft >= 0) {
        summary.active += 1;
      }
      return summary;
    },
    { total: 0, active: 0, urgent: 0, soon: 0, open: 0, expired: 0, done: 0 }
  );
}

export function normalizeItem(formData, existingId) {
  const item = {
    id: existingId || `item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    item: String(formData.item || "").trim(),
    place: String(formData.place || "").trim(),
    purchaseDate: String(formData.purchaseDate || "").trim(),
    returnDays: Number(formData.returnDays),
    condition: String(formData.condition || "").trim(),
    notes: String(formData.notes || "").trim(),
    channel: String(formData.channel || "").trim(),
    done: Boolean(formData.done)
  };

  if (!item.item) throw new Error("Name the item first.");
  parseIsoDate(item.purchaseDate);
  if (!Number.isFinite(item.returnDays) || item.returnDays < 1 || item.returnDays > 365) {
    throw new Error("Return window must be 1 to 365 days.");
  }

  return item;
}
