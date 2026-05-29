import {
  SAMPLE_ITEMS,
  buildChecklist,
  buildIcs,
  itemStatus,
  nextAction,
  normalizeItem,
  sortItems,
  summarizeItems,
  toIsoDate
} from "./logic.js";

const storageKey = "return-window-buddy-items";
const todayIso = toIsoDate();

const state = {
  items: loadItems(),
  editingId: null
};

const els = {
  form: document.querySelector("#item-form"),
  item: document.querySelector("#item"),
  place: document.querySelector("#place"),
  purchaseDate: document.querySelector("#purchaseDate"),
  returnDays: document.querySelector("#returnDays"),
  condition: document.querySelector("#condition"),
  channel: document.querySelector("#channel"),
  notes: document.querySelector("#notes"),
  submit: document.querySelector("#submit-item"),
  cancelEdit: document.querySelector("#cancel-edit"),
  list: document.querySelector("#item-list"),
  empty: document.querySelector("#empty-state"),
  checklist: document.querySelector("#checklist"),
  toast: document.querySelector("#toast"),
  countTotal: document.querySelector("#count-total"),
  countUrgent: document.querySelector("#count-urgent"),
  countSoon: document.querySelector("#count-soon"),
  nextDeadline: document.querySelector("#next-deadline"),
  copy: document.querySelector("#copy-checklist"),
  download: document.querySelector("#download-ics"),
  demo: document.querySelector("#load-demo"),
  clearDone: document.querySelector("#clear-done")
};

els.purchaseDate.value = todayIso;

render();

els.form.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    const formData = Object.fromEntries(new FormData(els.form).entries());
    const item = normalizeItem(formData, state.editingId);
    if (state.editingId) {
      state.items = state.items.map((existing) =>
        existing.id === state.editingId ? { ...existing, ...item } : existing
      );
    } else {
      state.items = [item, ...state.items];
    }
    state.editingId = null;
    els.submit.textContent = "Add item";
    els.cancelEdit.hidden = true;
    els.form.reset();
    els.purchaseDate.value = todayIso;
    saveItems();
    render();
    showToast("Saved.");
  } catch (error) {
    showToast(error.message);
  }
});

els.cancelEdit.addEventListener("click", () => {
  state.editingId = null;
  els.submit.textContent = "Add item";
  els.cancelEdit.hidden = true;
  els.form.reset();
  els.purchaseDate.value = todayIso;
});

els.copy.addEventListener("click", async () => {
  const text = buildChecklist(state.items, todayIso);
  await copyText(text);
  showToast("Checklist copied.");
});

els.download.addEventListener("click", () => {
  const ics = buildIcs(state.items, todayIso);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `return-windows-${todayIso}.ics`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Calendar file created.");
});

els.demo.addEventListener("click", () => {
  state.items = SAMPLE_ITEMS.map((item) => ({ ...item }));
  state.editingId = null;
  saveItems();
  render();
  showToast("Demo items loaded.");
});

els.clearDone.addEventListener("click", () => {
  const before = state.items.length;
  state.items = state.items.filter((item) => !item.done);
  saveItems();
  render();
  showToast(before === state.items.length ? "No completed items." : "Completed items cleared.");
});

els.list.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  const id = event.target.closest("[data-id]")?.dataset.id;
  if (!action || !id) return;

  const item = state.items.find((candidate) => candidate.id === id);
  if (!item) return;

  if (action === "toggle") {
    item.done = !item.done;
    saveItems();
    render();
  }

  if (action === "edit") {
    fillForm(item);
  }

  if (action === "delete") {
    state.items = state.items.filter((candidate) => candidate.id !== id);
    saveItems();
    render();
  }
});

function loadItems() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return SAMPLE_ITEMS.map((item) => ({ ...item }));
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return SAMPLE_ITEMS.map((item) => ({ ...item }));
  }
}

function saveItems() {
  localStorage.setItem(storageKey, JSON.stringify(state.items));
}

function render() {
  const sorted = sortItems(state.items, todayIso);
  const summary = summarizeItems(state.items, todayIso);
  const next = sorted.find((item) => !item.done);

  els.countTotal.textContent = String(summary.total);
  els.countUrgent.textContent = String(summary.urgent + summary.expired);
  els.countSoon.textContent = String(summary.soon);
  els.nextDeadline.textContent = next ? itemStatus(next, todayIso).deadline : "None";
  els.checklist.textContent = buildChecklist(state.items, todayIso);
  els.empty.hidden = state.items.length > 0;
  els.list.innerHTML = sorted.map(renderItem).join("");
}

function renderItem(item) {
  const status = itemStatus(item, todayIso);
  const dayText =
    status.daysLeft >= 0
      ? `${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left`
      : `${Math.abs(status.daysLeft)} day${status.daysLeft === -1 ? "" : "s"} late`;
  const condition = item.condition ? `<p>${escapeHtml(item.condition)}</p>` : "";
  const notes = item.notes ? `<p>${escapeHtml(item.notes)}</p>` : "";
  const action = nextAction(item, todayIso);

  return `
    <article class="return-card ${item.done ? "is-done" : ""}" data-id="${escapeHtml(item.id)}">
      <div class="card-main">
        <div>
          <span class="status status-${status.tone}">${status.label}</span>
          <h3>${escapeHtml(item.item)}</h3>
        </div>
        <p class="deadline">${escapeHtml(status.deadline)} · ${dayText}</p>
      </div>
      <div class="meta-grid">
        <span><strong>Place</strong>${escapeHtml(item.place || "Not set")}</span>
        <span><strong>Return path</strong>${escapeHtml(item.channel || "Check receipt")}</span>
      </div>
      <p class="next-action"><strong>Next action</strong>${escapeHtml(action)}</p>
      <div class="notes">${condition}${notes}</div>
      <div class="card-actions">
        <button type="button" data-action="toggle">${item.done ? "Reopen" : "Mark done"}</button>
        <button type="button" data-action="edit">Edit</button>
        <button type="button" data-action="delete">Delete</button>
      </div>
    </article>
  `;
}

function fillForm(item) {
  state.editingId = item.id;
  els.item.value = item.item;
  els.place.value = item.place;
  els.purchaseDate.value = item.purchaseDate;
  els.returnDays.value = String(item.returnDays);
  els.condition.value = item.condition;
  els.channel.value = item.channel;
  els.notes.value = item.notes;
  els.submit.textContent = "Save changes";
  els.cancelEdit.hidden = false;
  els.item.focus();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2200);
}

async function copyText(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, area.value.length);
  const copied = document.execCommand("copy");
  area.remove();

  if (copied) return;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  throw new Error("Copy failed. Select the checklist text manually.");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
