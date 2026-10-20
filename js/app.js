import { createStore } from "./services/store.js";

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const el = {
  body: document.body,
  navLinks: $$('[data-view-link]'),
  dashboardView: $('#dashboardView'),
  calendarFocusView: $('#calendarFocusView'),
  notesView: $('#notesView'),
  statsView: $('#statsView'),
  globalSearch: $('#globalSearch'),
  themeToggle: $('#themeToggle'),
  profileButton: $('#profileButton'),
  profilePopover: $('#profilePopover'),
  taskForm: $('#taskForm'),
  taskText: $('#taskText'),
  taskSubtasks: $('#taskSubtasks'),
  priority: $('#priority'),
  taskDate: $('#taskDate'),
  status: $('#status'),
  taskList: $('#taskList'),
  topSummary: $('#topSummary'),
  todayLabel: $('#todayLabel'),
  filterButtons: $$('.filter'),
  openCountBadge: $('#openCountBadge'),
  waitingCountBadge: $('#waitingCountBadge'),
  doneCountBadge: $('#doneCountBadge'),
  sortMode: $('#sortMode'),
  deleteDoneBtn: $('#deleteDoneBtn'),
  calendarCurrent: $('#calendarCurrent'),
  calendarNext: $('#calendarNext'),
  calendarFocusCurrent: $('#calendarFocusCurrent'),
  calendarFocusNext: $('#calendarFocusNext'),
  eventList: $('#eventList'),
  eventFocusList: $('#eventFocusList'),
  addEventBtn: $('#addEventBtn'),
  addEventWideBtn: $('#addEventWideBtn'),
  calendarAddEventBtn: $('#calendarAddEventBtn'),
  taskOverview: $('#taskOverview'),
  progressDonut: $('#progressDonut'),
  progressPercent: $('#progressPercent'),
  progressOpen: $('#progressOpen'),
  progressDone: $('#progressDone'),
  progressTotal: $('#progressTotal'),
  exportDataBtn: $('#exportDataBtn'),
  importDataBtn: $('#importDataBtn'),
  importFileInput: $('#importFileInput'),
  clearDoneShortcut: $('#clearDoneShortcut'),
  settingsBtn: $('#settingsBtn'),
  favoriteLinks: $('#favoriteLinks'),
  manageLinksBtn: $('#manageLinksBtn'),
  linksDialog: $('#linksDialog'),
  linksForm: $('#linksForm'),
  linksEditorList: $('#linksEditorList'),
  addLinkRowBtn: $('#addLinkRowBtn'),
  closeLinksBtn: $('#closeLinksBtn'),
  cancelLinksBtn: $('#cancelLinksBtn'),
  notesList: $('#notesList'),
  createNoteBtn: $('#createNoteBtn'),
  noteDialog: $('#noteDialog'),
  noteForm: $('#noteForm'),
  noteDialogKicker: $('#noteDialogKicker'),
  noteDialogTitle: $('#noteDialogTitle'),
  noteBody: $('#noteBody'),
  deleteNoteBtn: $('#deleteNoteBtn'),
  closeNoteBtn: $('#closeNoteBtn'),
  cancelNoteBtn: $('#cancelNoteBtn'),
  eventDialog: $('#eventDialog'),
  eventForm: $('#eventForm'),
  eventDate: $('#eventDate'),
  eventName: $('#eventName'),
  cancelEventBtn: $('#cancelEventBtn'),
  closeEventBtn: $('#closeEventBtn'),
  settingsDialog: $('#settingsDialog'),
  settingsForm: $('#settingsForm'),
  themeSetting: $('#themeSetting'),
  defaultViewSetting: $('#defaultViewSetting'),
  confirmDeleteSetting: $('#confirmDeleteSetting'),
  closeSettingsBtn: $('#closeSettingsBtn'),
  cancelSettingsBtn: $('#cancelSettingsBtn'),
  statsContent: $('#statsContent'),
  statsPeriodLabel: $('#statsPeriodLabel')
};

let store;
let tasks = [];
let calendarEvents = [];
let favoriteLinks = [];
let notes = [];
let settings = {
  theme: 'dark',
  defaultView: 'overview',
  confirmDelete: true,
  sortMode: 'manual'
};
let currentFilter = 'open';
let currentView = 'overview';
let searchQuery = '';
let editingId = null;
let addingSubtaskTaskId = null;
let activeNoteId = null;
let activeNoteTaskId = null;
let dragState = null;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

function formatLongDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('nb-NO', { weekday: 'short', day: 'numeric', month: 'long' })
    .format(new Date(year, month - 1, day));
}

function createId(prefix = 'item') {
  return crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const escapeAttr = escapeHtml;

function autoGrowTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function parseSubtaskLines(value) {
  return String(value || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

function migrateTask(task, index) {
  const migrated = { ...task };
  if (!Array.isArray(migrated.subtasks)) {
    const legacyLines = String(migrated.note || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    migrated.subtasks = legacyLines.map((text, subIndex) => ({
      id: createId(`legacy-${index}-${subIndex}`), text, done: false
    }));
  }
  delete migrated.note;
  if (!migrated.id) migrated.id = createId('task');
  if (!migrated.createdAt) migrated.createdAt = Date.now() + index;
  if (!migrated.originalDate) migrated.originalDate = migrated.date || localDateString();
  return migrated;
}

function automaticCompare(a, b) {
  const rank = { 'Høy': 0, 'Middels': 1, 'Lav': 2 };
  const priorityDiff = (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
  if (priorityDiff !== 0) return priorityDiff;
  const dateDiff = String(a.date || '').localeCompare(String(b.date || ''));
  if (dateDiff !== 0) return dateDiff;
  return (a.createdAt || 0) - (b.createdAt || 0);
}

function normalizeOrders(list) {
  list.forEach((task, index) => { task.order = index; });
}

function ensureInitialOrder() {
  if (!tasks.some(task => typeof task.order !== 'number')) return;
  const open = tasks.filter(task => task.status !== 'Ferdig').sort(automaticCompare);
  const done = tasks.filter(task => task.status === 'Ferdig').sort(automaticCompare);
  normalizeOrders(open);
  normalizeOrders(done);
  tasks = [...open, ...done];
}

function seedManualOrderFromAutomatic() {
  const open = tasks.filter(task => task.status !== 'Ferdig').sort(automaticCompare);
  const done = tasks.filter(task => task.status === 'Ferdig').sort(automaticCompare);
  normalizeOrders(open);
  normalizeOrders(done);
  tasks = [...open, ...done];
}

function smartInsertTask(task) {
  const isDone = task.status === 'Ferdig';
  const sameGroup = tasks
    .filter(item => item.id !== task.id && (item.status === 'Ferdig') === isDone)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  let insertIndex = sameGroup.findIndex(existing => automaticCompare(task, existing) < 0);
  if (insertIndex < 0) insertIndex = sameGroup.length;
  sameGroup.splice(insertIndex, 0, task);
  normalizeOrders(sameGroup);
  const otherGroup = tasks
    .filter(item => (item.status === 'Ferdig') !== isDone)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  tasks = isDone ? [...otherGroup, ...sameGroup] : [...sameGroup, ...otherGroup];
}

function mergeEditedSubtasks(task, value) {
  const lines = parseSubtaskLines(value);
  const existing = Array.isArray(task.subtasks) ? task.subtasks : [];
  const usedIds = new Set();
  return lines.map(text => {
    const match = existing.find(subtask => !usedIds.has(subtask.id) && subtask.text.trim().toLowerCase() === text.toLowerCase());
    if (match) {
      usedIds.add(match.id);
      return { ...match, text };
    }
    return { id: createId('subtask'), text, done: false };
  });
}

async function persistTasks() { await store.saveTasks(tasks); }
async function persistEvents() { await store.saveEvents(calendarEvents); }
async function persistSettings() { await store.saveSettings(settings); }
async function persistLinks() { await store.saveLinks(favoriteLinks); }
async function persistNotes() { await store.saveNotes(notes); }

function queryMatchesTask(task) {
  if (!searchQuery) return true;
  const haystack = [task.text, task.status, task.priority, ...(task.subtasks || []).map(s => s.text)].join(' ').toLowerCase();
  return haystack.includes(searchQuery);
}

function sortedTasks(list) {
  if (settings.sortMode === 'automatic') return [...list].sort(automaticCompare);
  return [...list].sort((a, b) => {
    const diff = (a.order ?? 0) - (b.order ?? 0);
    return diff !== 0 ? diff : automaticCompare(a, b);
  });
}

function filteredTasks() {
  return sortedTasks(tasks.filter(task => {
    let statusMatch = false;
    if (currentFilter === 'done') statusMatch = task.status === 'Ferdig';
    else if (currentFilter === 'waiting') statusMatch = task.status === 'Venter';
    else statusMatch = task.status !== 'Ferdig' && task.status !== 'Venter';
    return statusMatch && queryMatchesTask(task);
  }));
}

function isOverdue(task) {
  return task.status !== 'Ferdig' &&
    task.status !== 'Venter' &&
    task.date &&
    task.date < localDateString();
}

function priorityClass(priority) {
  if (priority === 'Høy') return 'priority-high';
  if (priority === 'Lav') return 'priority-low';
  return 'priority-medium';
}

function taskStatusClass(status) {
  if (status === 'Pågår') return 'status-in-progress';
  if (status === 'Venter') return 'status-waiting';
  if (status === 'Ferdig') return 'done';
  return 'status-not-started';
}

function statusBadgeClass(status) {
  if (status === 'Pågår') return 'status-in-progress-badge';
  if (status === 'Venter') return 'status-waiting-badge';
  if (status === 'Ferdig') return 'status-done-badge';
  return 'status-not-started-badge';
}

function taskStatusOptions(current) {
  return ['Ikke startet', 'Pågår', 'Venter', 'Ferdig']
    .map(value => `<option value="${value}" ${current === value ? 'selected' : ''}>${value}</option>`).join('');
}

function priorityOptions(current) {
  return ['Høy', 'Middels', 'Lav']
    .map(value => `<option value="${value}" ${current === value ? 'selected' : ''}>${value}</option>`).join('');
}

function shouldConfirm(message) {
  return !settings.confirmDelete || confirm(message);
}

function normalizeLinkUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function faviconUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return '';
  }
}

function renderFavoriteLinks() {
  if (!favoriteLinks.length) {
    el.favoriteLinks.innerHTML = '<div class="favorite-links-empty">Ingen favoritter lagt til ennå.</div>';
    return;
  }

  el.favoriteLinks.innerHTML = favoriteLinks.map(link => {
    const iconUrl = faviconUrl(link.url);

    return `<a class="favorite-link" href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="Åpne ${escapeAttr(link.name)}">
      <span class="favorite-link-logo-wrap" aria-hidden="true">
        ${iconUrl ? `<img class="favorite-link-logo" src="${escapeAttr(iconUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ''}
        <span class="favorite-link-fallback">${escapeHtml(link.name.slice(0, 1).toUpperCase())}</span>
      </span>
      <span class="favorite-link-name">${escapeHtml(link.name)}</span>
    </a>`;
  }).join('');

  el.favoriteLinks.querySelectorAll('.favorite-link-logo').forEach(image => {
    image.addEventListener('load', () => image.parentElement?.classList.add('has-logo'), { once: true });
    image.addEventListener('error', () => image.remove(), { once: true });
  });
}

function linkEditorRowMarkup(link = {}) {
  return `<div class="link-editor-row" data-id="${escapeAttr(link.id || '')}">
    <div class="form-field link-name-field">
      <label>Kallenavn</label>
      <input class="link-name-input" type="text" maxlength="40" autocomplete="off" placeholder="F.eks. Gmail" value="${escapeAttr(link.name || '')}" required />
    </div>
    <div class="form-field link-url-field">
      <label>Lenke</label>
      <input class="link-url-input" type="text" inputmode="url" autocomplete="url" placeholder="https://…" value="${escapeAttr(link.url || '')}" required />
    </div>
    <button class="remove-link-row" type="button" aria-label="Fjern lenke" title="Fjern">×</button>
  </div>`;
}

function addLinkEditorRow(link = {}) {
  el.linksEditorList.insertAdjacentHTML('beforeend', linkEditorRowMarkup(link));
  const rows = el.linksEditorList.querySelectorAll('.link-editor-row');
  rows[rows.length - 1]?.querySelector('.link-name-input')?.focus();
}

function openLinksDialog() {
  el.linksEditorList.innerHTML = favoriteLinks.map(link => linkEditorRowMarkup(link)).join('');
  if (!favoriteLinks.length) addLinkEditorRow();
  el.linksDialog.showModal();
}

function closeLinksDialog() {
  if (el.linksDialog.open) el.linksDialog.close();
}

function migrateNote(note, index) {
  return {
    id: note?.id || createId(`note-${index}`),
    taskId: note?.taskId || null,
    body: String(note?.body || ''),
    createdAt: Number(note?.createdAt) || Date.now() + index,
    updatedAt: Number(note?.updatedAt) || Number(note?.createdAt) || Date.now() + index
  };
}

function noteTask(note) {
  return note.taskId ? tasks.find(task => task.id === note.taskId) : null;
}

function standaloneNoteParts(note) {
  const lines = String(note.body || '').trim().split(/\r?\n/);
  const firstContentIndex = lines.findIndex(line => line.trim());
  if (firstContentIndex < 0) return { title: 'Notat', body: '' };

  const firstLine = lines[firstContentIndex].trim();
  const title = firstLine.length > 70 ? `${firstLine.slice(0, 67)}…` : firstLine;
  const body = lines.slice(firstContentIndex + 1).join('\n').trim();
  return { title, body };
}

function noteDisplay(note) {
  const task = noteTask(note);
  if (task) return { title: task.text, body: note.body.trim(), type: 'Oppgave', taskNote: true };

  const standalone = standaloneNoteParts(note);
  return { title: standalone.title, body: standalone.body, type: 'Eget notat', taskNote: false };
}

function formatNoteTimestamp(value) {
  return new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function visibleNotes() {
  return notes
    .filter(note => note.body.trim() && (!note.taskId || noteTask(note)))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function renderNotes() {
  if (!el.notesList) return;
  const visible = visibleNotes();

  if (!visible.length) {
    el.notesList.innerHTML = '<div class="empty-state">Ingen notater ennå. Lag et eget notat, eller skriv et notat på en oppgave.</div>';
    return;
  }

  el.notesList.innerHTML = visible.map(note => {
    const display = noteDisplay(note);
    return `<article class="panel note-card" data-note-id="${escapeAttr(note.id)}">
      <div class="note-card-head">
        <div class="note-card-title-wrap">
          <span class="note-type ${display.taskNote ? 'task-note' : ''}">${display.type}</span>
          <h2 class="note-card-title">${escapeHtml(display.title)}</h2>
        </div>
        <span class="note-card-time">${escapeHtml(formatNoteTimestamp(note.updatedAt))}</span>
      </div>
      ${display.body ? `<p class="note-card-body">${escapeHtml(display.body)}</p>` : '<div class="note-card-body"></div>'}
      <div class="note-card-actions">
        <button class="note-card-action edit-note-btn" type="button">Rediger</button>
        <button class="note-card-action delete delete-note-card-btn" type="button">Slett</button>
      </div>
    </article>`;
  }).join('');
}

function openNoteDialog({ noteId = null, taskId = null } = {}) {
  const existing = noteId
    ? notes.find(note => note.id === noteId)
    : taskId
      ? notes.find(note => note.taskId === taskId)
      : null;

  activeNoteId = existing?.id || null;
  activeNoteTaskId = existing?.taskId || taskId || null;

  const task = activeNoteTaskId ? tasks.find(item => item.id === activeNoteTaskId) : null;
  el.noteDialogKicker.textContent = task ? 'Oppgavenotat' : 'Notat';
  el.noteDialogTitle.textContent = task ? task.text : existing ? 'Rediger notat' : 'Nytt notat';
  el.noteBody.value = existing?.body || '';
  el.deleteNoteBtn.hidden = !existing;
  el.noteDialog.showModal();

  requestAnimationFrame(() => {
    el.noteBody.focus();
    el.noteBody.setSelectionRange(el.noteBody.value.length, el.noteBody.value.length);
  });
}

function closeNoteDialog() {
  if (el.noteDialog.open) el.noteDialog.close();
  activeNoteId = null;
  activeNoteTaskId = null;
}

async function saveActiveNote() {
  const body = el.noteBody.value.trim();
  const existing = activeNoteId ? notes.find(note => note.id === activeNoteId) : null;

  if (!body) {
    if (existing) {
      notes = notes.filter(note => note.id !== existing.id);
      await persistNotes();
      renderNotes();
    }
    closeNoteDialog();
    return;
  }

  if (existing) {
    existing.body = body;
    existing.updatedAt = Date.now();
  } else {
    notes.push({
      id: createId('note'),
      taskId: activeNoteTaskId || null,
      body,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  await persistNotes();
  renderNotes();
  closeNoteDialog();
}

async function deleteNoteById(noteId) {
  const note = notes.find(item => item.id === noteId);
  if (!note || !shouldConfirm('Slette notatet?')) return false;
  notes = notes.filter(item => item.id !== noteId);
  await persistNotes();
  renderNotes();
  return true;
}

function renderCounts() {
  const active = tasks.filter(task => task.status !== 'Ferdig' && task.status !== 'Venter').length;
  const waiting = tasks.filter(task => task.status === 'Venter').length;
  const done = tasks.filter(task => task.status === 'Ferdig').length;

  el.openCountBadge.textContent = active ? `(${active})` : '';
  el.waitingCountBadge.textContent = waiting ? `(${waiting})` : '';
  el.doneCountBadge.textContent = done ? `(${done})` : '';

  const today = localDateString();
  const dueToday = tasks.filter(task =>
    task.status !== 'Ferdig' &&
    task.status !== 'Venter' &&
    task.date === today
  ).length;

  el.topSummary.textContent = `${dueToday} med frist i dag${waiting ? ` · ${waiting} pauset` : ''}`;
}

function renderTaskOverview() {
  const activeTasks = sortedTasks(tasks.filter(task =>
    task.status !== 'Ferdig' &&
    task.status !== 'Venter' &&
    queryMatchesTask(task)
  ));
  const waitingTasks = sortedTasks(tasks.filter(task =>
    task.status === 'Venter' &&
    queryMatchesTask(task)
  ));

  if (!activeTasks.length && !waitingTasks.length) {
    el.taskOverview.innerHTML = '<div class="quick-list-empty">Ingen åpne oppgaver.</div>';
    return;
  }

  const activeMarkup = activeTasks.length
    ? `<ol class="quick-list">${activeTasks.map(task => `<li class="${task.status === 'Pågår' ? 'quick-in-progress' : 'quick-not-started'}">${escapeHtml(task.text)}</li>`).join('')}</ol>`
    : '<div class="quick-list-empty">Ingen aktive oppgaver.</div>';

  const waitingMarkup = waitingTasks.length
    ? `<div class="quick-list-section-title">Venter</div><ol class="quick-list waiting-quick-list">${waitingTasks.map(task => `<li>${escapeHtml(task.text)}</li>`).join('')}</ol>`
    : '';

  el.taskOverview.innerHTML = activeMarkup + waitingMarkup;
}

function renderProgress() {
  const active = tasks.filter(task => task.status !== 'Ferdig' && task.status !== 'Venter').length;
  const waiting = tasks.filter(task => task.status === 'Venter').length;
  const done = tasks.filter(task => task.status === 'Ferdig').length;
  const total = active + waiting + done;
  const percent = total ? Math.round(done / total * 100) : 0;
  el.progressDonut.style.setProperty('--progress', `${percent}%`);
  el.progressPercent.textContent = `${percent}%`;
  el.progressOpen.textContent = `${active} aktive · ${waiting} venter`;
  el.progressDone.textContent = `${done} ferdige ${done === 1 ? 'oppgave' : 'oppgaver'}`;
  el.progressTotal.textContent = `Totalt: ${total} ${total === 1 ? 'oppgave' : 'oppgaver'}`;
}

function renderTasks() {
  const visible = filteredTasks();
  renderCounts();
  renderTaskOverview();
  renderProgress();
  renderStats();
  if (!visible.length) {
    el.taskList.innerHTML = `<div class="empty-state">${searchQuery
      ? 'Ingen oppgaver matcher søket.'
      : currentFilter === 'done'
        ? 'Ingen ferdige oppgaver ennå.'
        : currentFilter === 'waiting'
          ? 'Ingen oppgaver venter akkurat nå.'
          : 'Ingen aktive oppgaver. Legg til en oppgave over.'}</div>`;
    return;
  }
  el.taskList.innerHTML = visible.map(task => {
    if (editingId === task.id) {
      return `<article class="task-card" data-id="${task.id}">
        <button class="drag-handle" type="button" aria-label="Flytt oppgave">⠿</button>
        <form class="edit-form">
          <div class="edit-grid">
            <div class="form-field"><label>Oppgave</label><input class="edit-text" type="text" value="${escapeAttr(task.text)}" required /></div>
            <div class="form-field"><label>Prioritet</label><select class="edit-priority">${priorityOptions(task.priority)}</select></div>
            <div class="form-field"><label>Frist</label><input class="edit-date" type="date" value="${task.date}" required /></div>
          </div>
          <div class="edit-grid secondary">
            <div class="form-field"><label>Underoppgaver <span>én per linje</span></label><textarea class="edit-subtasks" rows="1">${escapeHtml((task.subtasks || []).map(s => s.text).join('\n'))}</textarea></div>
            <div class="form-field"><label>Status</label><select class="edit-status">${taskStatusOptions(task.status)}</select></div>
          </div>
          <div class="edit-actions"><button class="button button-secondary cancel-edit-btn" type="button">Avbryt</button><button class="button button-primary" type="submit">Lagre</button></div>
        </form>
      </article>`;
    }
    const completed = (task.subtasks || []).filter(s => s.done).length;
    const subtaskCount = (task.subtasks || []).length;
    const addingSubtask = addingSubtaskTaskId === task.id;
    return `<article class="task-card ${taskStatusClass(task.status)} ${isOverdue(task) ? 'overdue' : ''}" data-id="${task.id}">
      <button class="drag-handle" type="button" aria-label="Flytt oppgave" title="${settings.sortMode === 'manual' ? 'Dra for å flytte. Pil opp/ned flytter med tastatur.' : 'Bytt til manuell sortering for å flytte.'}">⠿</button>
      <div class="task-main">
        <div class="task-title-row"><span class="task-title">${escapeHtml(task.text)}</span><span class="badge ${statusBadgeClass(task.status)}">${escapeHtml(task.status)}</span><span class="badge ${priorityClass(task.priority)}">${task.priority}</span>${isOverdue(task) ? '<span class="badge overdue-badge">Frist passert</span>' : ''}</div>
        <div class="task-meta"><span>Frist: ${formatDate(task.date)}</span></div>
        ${subtaskCount ? `<div class="subtasks">${task.subtasks.map(subtask => `<label class="subtask ${subtask.done ? 'done' : ''}"><input class="subtask-check" type="checkbox" data-subtask-id="${subtask.id}" ${subtask.done ? 'checked' : ''} /><span>${escapeHtml(subtask.text)}</span></label>`).join('')}</div><div class="subtask-progress">${completed} av ${subtaskCount} underoppgaver ferdig</div>` : ''}
        ${task.status !== 'Ferdig' ? (addingSubtask ? `<form class="inline-subtask-form"><input class="inline-subtask-input" type="text" placeholder="Ny underoppgave" required /><button class="button button-primary" type="submit">Legg til</button><button class="button button-ghost cancel-inline-subtask" type="button">Avbryt</button></form>` : `<button class="inline-subtask-add" type="button"><span>+</span> Legg til underoppgave</button>`) : ''}
      </div>
      <div class="task-actions">
        ${task.status !== 'Ferdig' ? '<button class="complete-task-btn" type="button">Ferdig</button>' : ''}
        <select class="status-select" aria-label="Endre status">${taskStatusOptions(task.status)}</select>
        <div class="task-action-row"><button class="task-action-button edit-btn" type="button">Rediger</button><button class="task-action-button delete delete-btn" type="button">Slett</button></div>
        <button class="task-action-button task-note-btn view-note-btn ${notes.some(note => note.taskId === task.id && note.body.trim()) ? 'has-note' : ''}" type="button">Vis notat</button>
      </div>
    </article>`;
  }).join('');
  requestAnimationFrame(() => {
    el.taskList.querySelectorAll('textarea').forEach(autoGrowTextarea);
    el.taskList.querySelector('.inline-subtask-input')?.focus();
  });
}

function endOfNextMonthIso() {
  const now = new Date();
  return localDateString(new Date(now.getFullYear(), now.getMonth() + 2, 0));
}

function sixMonthsFromTodayIso() {
  const today = new Date();
  const targetMonth = today.getMonth() + 6;
  const lastDay = new Date(today.getFullYear(), targetMonth + 1, 0).getDate();
  const targetDay = Math.min(today.getDate(), lastDay);
  return localDateString(new Date(today.getFullYear(), targetMonth, targetDay));
}

function visibleEventList() {
  const today = localDateString();
  const horizon = sixMonthsFromTodayIso();
  return calendarEvents
    .filter(event => event.date >= today && event.date <= horizon)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0));
}

function renderMiniCalendar(container, date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const title = new Intl.DateTimeFormat('nb-NO', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = localDateString();
  const calendarLastDay = endOfNextMonthIso();
  const eventsByDate = new Map();
  visibleEventList().filter(event => event.date <= calendarLastDay).forEach(event => {
    if (!eventsByDate.has(event.date)) eventsByDate.set(event.date, []);
    eventsByDate.get(event.date).push(event);
  });
  const blanks = Array.from({ length: firstWeekday }, () => '<div class="calendar-blank" aria-hidden="true"></div>').join('');
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = eventsByDate.get(iso) || [];
    const dot = dayEvents.length ? `<span class="event-dot" tabindex="0" aria-label="Vis hendelser ${formatDate(iso)}"><span class="event-tooltip" role="tooltip"><div class="event-tooltip-title">${escapeHtml(formatDate(iso))}</div>${dayEvents.map(event => `<div class="event-tooltip-line">${escapeHtml(event.name)}</div>`).join('')}</span></span>` : '';
    return `<div class="calendar-day ${iso === today ? 'today' : ''}"><span>${day}</span>${dot}</div>`;
  }).join('');
  container.innerHTML = `<h3 class="calendar-month-title">${escapeHtml(title)}</h3><div class="calendar-weekdays" aria-hidden="true"><span>Ma</span><span>Ti</span><span>On</span><span>To</span><span>Fr</span><span>Lø</span><span>Sø</span></div><div class="calendar-days">${blanks}${days}</div>`;
}

function daysUntil(dateIso) {
  const [ty, tm, td] = dateIso.split('-').map(Number);
  const [y, m, d] = localDateString().split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86400000);
}

function countdownLabel(dateIso) {
  const days = daysUntil(dateIso);
  if (days === 0) return 'i dag';
  if (days === 1) return 'om 1 dag';
  return `om ${days} dager`;
}

function eventListMarkup() {
  const visible = visibleEventList();
  if (!visible.length) return '<div class="events-empty">Ingen hendelser de neste seks månedene.</div>';
  const grouped = new Map();
  visible.forEach(event => {
    if (!grouped.has(event.date)) grouped.set(event.date, []);
    grouped.get(event.date).push(event);
  });
  return [...grouped.entries()].map(([date, items]) => `<div class="event-day-group"><div class="event-date-label"><span>${escapeHtml(formatLongDate(date))}</span><span class="event-countdown">${escapeHtml(countdownLabel(date))}</span></div>${items.map(event => `<div class="event-item"><span class="event-item-text">${escapeHtml(event.name)}</span><button class="delete-event-btn" type="button" data-event-id="${event.id}" aria-label="Slett ${escapeAttr(event.name)}" title="Slett hendelse">×</button></div>`).join('')}</div>`).join('');
}

function renderCalendarArea() {
  const now = new Date();
  const current = new Date(now.getFullYear(), now.getMonth(), 1);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  renderMiniCalendar(el.calendarCurrent, current);
  renderMiniCalendar(el.calendarNext, next);
  renderMiniCalendar(el.calendarFocusCurrent, current);
  renderMiniCalendar(el.calendarFocusNext, next);
  const markup = eventListMarkup();
  el.eventList.innerHTML = markup;
  el.eventFocusList.innerHTML = markup;
}

function renderStats() {
  if (!el.statsContent) return;
  const total = tasks.length;
  const done = tasks.filter(task => task.status === 'Ferdig').length;
  const waiting = tasks.filter(task => task.status === 'Venter').length;
  const active = total - done - waiting;
  const overdue = tasks.filter(isOverdue).length;
  const completion = total ? Math.round(done / total * 100) : 0;
  const priorities = {
    'Høy': tasks.filter(task => task.status !== 'Ferdig' && task.status !== 'Venter' && task.priority === 'Høy').length,
    'Middels': tasks.filter(task => task.status !== 'Ferdig' && task.status !== 'Venter' && task.priority === 'Middels').length,
    'Lav': tasks.filter(task => task.status !== 'Ferdig' && task.status !== 'Venter' && task.priority === 'Lav').length
  };
  const allSubtasks = tasks.flatMap(task => task.subtasks || []);
  const doneSubtasks = allSubtasks.filter(s => s.done).length;
  const subtaskPercent = allSubtasks.length ? Math.round(doneSubtasks / allSubtasks.length * 100) : 0;
  const priorityMax = Math.max(1, ...Object.values(priorities));
  el.statsContent.innerHTML = `<div class="stats-summary-grid">
    <section class="panel metric-card"><span class="metric-label">Aktive oppgaver</span><strong class="metric-value">${active}</strong><span class="metric-note">${overdue} med passert frist</span></section>
    <section class="panel metric-card"><span class="metric-label">Ferdige oppgaver</span><strong class="metric-value">${done}</strong><span class="metric-note">${completion}% av alle oppgaver</span></section>
    <section class="panel metric-card"><span class="metric-label">Venter</span><strong class="metric-value">${waiting}</strong><span class="metric-note">oppgaver med status Venter</span></section>
    <section class="panel metric-card"><span class="metric-label">Hendelser</span><strong class="metric-value">${visibleEventList().length}</strong><span class="metric-note">de neste seks månedene</span></section>
  </div><div class="stats-detail-grid">
    <section class="panel stats-panel"><div class="panel-heading"><div><span class="kicker">Oppgaver</span><h2>Ferdigstillelse</h2></div></div><div class="big-progress"><div class="progress-donut" style="--progress:${completion}%"><span>${completion}%</span></div><div><h2>${done} av ${total} oppgaver ferdig</h2><p class="muted-text">${active} aktive · ${waiting} venter · ${overdue} med passert frist</p></div></div></section>
    <section class="panel stats-panel"><div class="panel-heading"><div><span class="kicker">Åpne oppgaver</span><h2>Prioritetsfordeling</h2></div></div><div class="stats-list">${Object.entries(priorities).map(([name,count]) => `<div class="stats-row"><span>${name}</span><div class="stats-bar"><span style="width:${count / priorityMax * 100}%"></span></div><strong>${count}</strong></div>`).join('')}</div></section>
    <section class="panel stats-panel"><div class="panel-heading"><div><span class="kicker">Underoppgaver</span><h2>Fremdrift</h2></div></div><div class="stats-list"><div class="stats-row"><span>Ferdige</span><div class="stats-bar"><span style="width:${subtaskPercent}%"></span></div><strong>${doneSubtasks}/${allSubtasks.length}</strong></div></div></section>
    <section class="panel stats-panel"><div class="panel-heading"><div><span class="kicker">Neste</span><h2>Kommende hendelser</h2></div></div><div class="stats-list">${visibleEventList().slice(0,4).map(event => `<div class="stats-row"><span>${escapeHtml(formatLongDate(event.date))}</span><div class="muted-text">${escapeHtml(event.name)}</div><strong>${escapeHtml(countdownLabel(event.date))}</strong></div>`).join('') || '<div class="muted-text">Ingen kommende hendelser.</div>'}</div></section>
  </div>`;
  el.statsPeriodLabel.textContent = `Oppdatert ${new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}`;
}

function applyTheme(theme) {
  const resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme;
  el.body.dataset.theme = resolved;
}

function showView(view) {
  currentView = view;
  el.body.dataset.view = view;
  el.navLinks.forEach(link => link.classList.toggle('active', link.dataset.viewLink === view));
  el.dashboardView.classList.toggle('active', view === 'overview' || view === 'tasks');
  el.calendarFocusView.classList.toggle('active', view === 'calendar');
  el.notesView.classList.toggle('active', view === 'notes');
  el.statsView.classList.toggle('active', view === 'stats');
  if (view === 'stats') renderStats();
  if (view === 'calendar') renderCalendarArea();
  if (view === 'notes') renderNotes();
}

function openEventDialog() {
  const today = localDateString();
  el.eventDate.min = today;
  el.eventDate.removeAttribute('max');
  el.eventDate.value = today;
  el.eventName.value = '';
  el.eventDialog.showModal();
  requestAnimationFrame(() => el.eventName.focus());
}

function closeEventDialog() { if (el.eventDialog.open) el.eventDialog.close(); }

function openSettingsDialog() {
  el.themeSetting.value = settings.theme;
  el.defaultViewSetting.value = settings.defaultView;
  el.confirmDeleteSetting.checked = settings.confirmDelete;
  el.settingsDialog.showModal();
}

function closeSettingsDialog() { if (el.settingsDialog.open) el.settingsDialog.close(); }

function visibleTaskIdsFromDom() {
  return [...el.taskList.querySelectorAll('.task-card[data-id]')].map(card => card.dataset.id);
}

async function saveVisibleDomOrder() {
  visibleTaskIdsFromDom().forEach((id, index) => {
    const task = tasks.find(item => item.id === id);
    if (task) task.order = index;
  });
  await persistTasks();
}

function beginLiveDrag(event, handle) {
  if (settings.sortMode !== 'manual' || searchQuery) return;
  if (event.button !== undefined && event.button !== 0) return;
  const card = handle.closest('.task-card');
  if (!card || card.querySelector('.edit-form')) return;
  event.preventDefault();
  const rect = card.getBoundingClientRect();
  const placeholder = document.createElement('div');
  placeholder.className = 'task-placeholder';
  placeholder.style.height = `${rect.height}px`;
  card.after(placeholder);
  dragState = { card, placeholder, pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
  card.classList.add('dragging');
  card.style.left = `${rect.left}px`;
  card.style.top = `${rect.top}px`;
  card.style.width = `${rect.width}px`;
  card.style.height = `${rect.height}px`;
  document.body.appendChild(card);
  document.body.classList.add('is-sorting');
  if (handle.setPointerCapture && event.pointerId !== undefined) { try { handle.setPointerCapture(event.pointerId); } catch {} }
  moveLiveDrag(event);
}

function moveLiveDrag(event) {
  if (!dragState) return;
  if (dragState.pointerId !== undefined && event.pointerId !== undefined && event.pointerId !== dragState.pointerId) return;
  event.preventDefault();
  const { card, placeholder, offsetX, offsetY } = dragState;
  card.style.left = `${event.clientX - offsetX}px`;
  card.style.top = `${event.clientY - offsetY}px`;
  const candidates = [...el.taskList.querySelectorAll('.task-card[data-id]')].filter(candidate => candidate !== card);
  let placed = false;
  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect();
    if (event.clientY < rect.top + rect.height / 2) {
      el.taskList.insertBefore(placeholder, candidate);
      placed = true;
      break;
    }
  }
  if (!placed) el.taskList.appendChild(placeholder);
  if (event.clientY < 70) window.scrollBy(0, -12);
  else if (event.clientY > window.innerHeight - 70) window.scrollBy(0, 12);
}

async function finishLiveDrag(event) {
  if (!dragState) return;
  if (dragState.pointerId !== undefined && event?.pointerId !== undefined && event.pointerId !== dragState.pointerId) return;
  const { card, placeholder } = dragState;
  placeholder.replaceWith(card);
  card.classList.remove('dragging');
  card.style.left = card.style.top = card.style.width = card.style.height = '';
  document.body.classList.remove('is-sorting');
  dragState = null;
  await saveVisibleDomOrder();
  renderTasks();
}

async function moveTaskByKeyboard(taskId, direction) {
  if (settings.sortMode !== 'manual' || searchQuery) return;
  const visible = filteredTasks();
  const index = visible.findIndex(task => task.id === taskId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= visible.length) return;
  [visible[index], visible[targetIndex]] = [visible[targetIndex], visible[index]];
  normalizeOrders(visible);
  await persistTasks();
  renderTasks();
  el.taskList.querySelector(`[data-id="${taskId}"] .drag-handle`)?.focus();
}

async function clearCompletedTasks() {
  const doneTasks = tasks.filter(task => task.status === 'Ferdig');
  if (!doneTasks.length) return;
  if (!shouldConfirm(`Fjerne ${doneTasks.length} ferdige ${doneTasks.length === 1 ? 'oppgave' : 'oppgaver'}?`)) return;
  const removedIds = new Set(doneTasks.map(task => task.id));
  tasks = tasks.filter(task => task.status !== 'Ferdig');
  notes = notes.filter(note => !note.taskId || !removedIds.has(note.taskId));
  await Promise.all([persistTasks(), persistNotes()]);
  renderTasks();
  renderNotes();
}

function exportData() {
  const payload = { app: 'HuskelApp', schemaVersion: 3, exportedAt: new Date().toISOString(), tasks, events: calendarEvents, links: favoriteLinks, notes, settings };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `huskelapp-backup-${localDateString()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function importDataFile(file) {
  const data = JSON.parse(await file.text());
  if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.events)) throw new Error('Ugyldig HuskelApp-backup.');
  if (!confirm('Import erstatter nåværende oppgaver, hendelser, lenker og notater. Fortsette?')) return;
  tasks = data.tasks.map(migrateTask);
  calendarEvents = data.events.map((event, index) => ({
    id: event.id || createId(`event-${index}`),
    name: event.name || '',
    date: event.date || localDateString(),
    createdAt: event.createdAt || Date.now() + index
  }));
  favoriteLinks = Array.isArray(data.links)
    ? data.links.map((link, index) => ({
        id: link.id || createId(`link-${index}`),
        name: String(link.name || '').trim(),
        url: normalizeLinkUrl(link.url),
        createdAt: link.createdAt || Date.now() + index
      })).filter(link => link.name && link.url)
    : [];
  notes = Array.isArray(data.notes) ? data.notes.map(migrateNote) : [];
  if (data.settings && typeof data.settings === 'object') settings = { ...settings, ...data.settings };
  ensureInitialOrder();
  await Promise.all([persistTasks(), persistEvents(), persistLinks(), persistNotes(), persistSettings()]);
  applyTheme(settings.theme);
  el.sortMode.value = settings.sortMode;
  renderTasks();
  renderCalendarArea();
  renderFavoriteLinks();
  renderNotes();
  showView(currentView);
}

el.taskForm.addEventListener('submit', async event => {
  event.preventDefault();
  const text = el.taskText.value.trim();
  if (!text) return;
  const date = el.taskDate.value || localDateString();
  const task = {
    id: createId('task'), text, priority: el.priority.value, date, originalDate: date, status: el.status.value,
    subtasks: parseSubtaskLines(el.taskSubtasks.value).map(text => ({ id: createId('subtask'), text, done: false })),
    createdAt: Date.now(), order: Number.MAX_SAFE_INTEGER
  };
  tasks.push(task);
  if (settings.sortMode === 'manual') smartInsertTask(task);
  await persistTasks();
  el.taskForm.reset();
  el.priority.value = 'Middels';
  el.status.value = 'Ikke startet';
  el.taskDate.value = localDateString();
  el.taskSubtasks.style.height = 'auto';
  el.taskText.focus();
  renderTasks();
});

el.taskList.addEventListener('input', event => {
  if (event.target.matches('textarea')) autoGrowTextarea(event.target);
});

el.taskList.addEventListener('change', async event => {
  const card = event.target.closest('.task-card');
  if (!card) return;
  const task = tasks.find(item => item.id === card.dataset.id);
  if (!task) return;
  if (event.target.classList.contains('status-select')) {
    task.status = event.target.value;
    if (settings.sortMode === 'manual') smartInsertTask(task);
    await persistTasks();
    renderTasks();
    return;
  }
  if (event.target.classList.contains('subtask-check')) {
    const subtask = task.subtasks.find(item => item.id === event.target.dataset.subtaskId);
    if (!subtask) return;
    subtask.done = event.target.checked;
    await persistTasks();
    renderTasks();
    return;
  }
});

el.taskList.addEventListener('click', async event => {
  const card = event.target.closest('.task-card');
  if (!card) return;
  const taskId = card.dataset.id;
  if (event.target.closest('.complete-task-btn')) {
    const task = tasks.find(item => item.id === taskId);
    if (!task) return;
    task.status = 'Ferdig';
    if (settings.sortMode === 'manual') smartInsertTask(task);
    await persistTasks();
    renderTasks();
    return;
  }
  if (event.target.closest('.view-note-btn')) { openNoteDialog({ taskId }); return; }
  if (event.target.closest('.edit-btn')) { editingId = taskId; addingSubtaskTaskId = null; renderTasks(); return; }
  if (event.target.closest('.cancel-edit-btn')) { editingId = null; renderTasks(); return; }
  if (event.target.closest('.inline-subtask-add')) { addingSubtaskTaskId = taskId; renderTasks(); return; }
  if (event.target.closest('.cancel-inline-subtask')) { addingSubtaskTaskId = null; renderTasks(); return; }
  if (event.target.closest('.delete-btn')) {
    const task = tasks.find(item => item.id === taskId);
    if (task && shouldConfirm(`Slette oppgaven "${task.text}"?`)) {
      tasks = tasks.filter(item => item.id !== taskId);
      notes = notes.filter(note => note.taskId !== taskId);
      await Promise.all([persistTasks(), persistNotes()]);
      renderTasks();
      renderNotes();
    }
  }
});

el.taskList.addEventListener('submit', async event => {
  const card = event.target.closest('.task-card');
  if (!card) return;
  const task = tasks.find(item => item.id === card.dataset.id);
  if (!task) return;
  if (event.target.classList.contains('edit-form')) {
    event.preventDefault();
    const newText = event.target.querySelector('.edit-text').value.trim();
    if (!newText) return;
    const oldStatus = task.status;
    task.text = newText;
    task.priority = event.target.querySelector('.edit-priority').value;
    task.date = event.target.querySelector('.edit-date').value || localDateString();
    task.subtasks = mergeEditedSubtasks(task, event.target.querySelector('.edit-subtasks').value);
    task.status = event.target.querySelector('.edit-status').value;
    if (settings.sortMode === 'manual' && task.status !== oldStatus) smartInsertTask(task);
    editingId = null;
    await persistTasks();
    renderTasks();
    return;
  }
  if (event.target.classList.contains('inline-subtask-form')) {
    event.preventDefault();
    const text = event.target.querySelector('.inline-subtask-input').value.trim();
    if (!text) return;
    task.subtasks.push({ id: createId('subtask'), text, done: false });
    addingSubtaskTaskId = null;
    await persistTasks();
    renderTasks();
  }
});

el.taskList.addEventListener('pointerdown', event => {
  const handle = event.target.closest('.drag-handle');
  if (handle) beginLiveDrag(event, handle);
});

el.taskList.addEventListener('keydown', event => {
  const handle = event.target.closest('.drag-handle');
  if (!handle) return;
  if (event.key === 'ArrowUp') { event.preventDefault(); void moveTaskByKeyboard(handle.closest('.task-card').dataset.id, -1); }
  if (event.key === 'ArrowDown') { event.preventDefault(); void moveTaskByKeyboard(handle.closest('.task-card').dataset.id, 1); }
});

document.addEventListener('pointermove', moveLiveDrag, { passive: false });
document.addEventListener('pointerup', event => void finishLiveDrag(event));
document.addEventListener('pointercancel', event => void finishLiveDrag(event));

el.filterButtons.forEach(button => button.addEventListener('click', () => {
  currentFilter = button.dataset.filter;
  el.filterButtons.forEach(item => item.classList.toggle('active', item === button));
  renderTasks();
}));

el.sortMode.addEventListener('change', async () => {
  const previous = settings.sortMode;
  settings.sortMode = el.sortMode.value;
  if (previous === 'automatic' && settings.sortMode === 'manual') seedManualOrderFromAutomatic();
  await Promise.all([persistSettings(), persistTasks()]);
  renderTasks();
});

el.deleteDoneBtn.addEventListener('click', () => void clearCompletedTasks());
el.clearDoneShortcut.addEventListener('click', () => void clearCompletedTasks());
[el.addEventBtn, el.addEventWideBtn, el.calendarAddEventBtn].forEach(button => button.addEventListener('click', openEventDialog));
el.cancelEventBtn.addEventListener('click', closeEventDialog);
el.closeEventBtn.addEventListener('click', closeEventDialog);
el.eventDialog.addEventListener('click', event => { if (event.target === el.eventDialog) closeEventDialog(); });

el.eventForm.addEventListener('submit', async event => {
  event.preventDefault();
  const name = el.eventName.value.trim();
  const date = el.eventDate.value;
  if (!name || !date || date < localDateString()) { el.eventForm.reportValidity(); return; }
  calendarEvents.push({ id: createId('event'), name, date, createdAt: Date.now() });
  await persistEvents();
  closeEventDialog();
  renderCalendarArea();
  renderStats();
});

async function handleEventDelete(event) {
  const button = event.target.closest('.delete-event-btn');
  if (!button) return;
  const item = calendarEvents.find(eventItem => eventItem.id === button.dataset.eventId);
  if (!item || !shouldConfirm(`Slette hendelsen "${item.name}"?`)) return;
  calendarEvents = calendarEvents.filter(eventItem => eventItem.id !== item.id);
  await persistEvents();
  renderCalendarArea();
  renderStats();
}

el.eventList.addEventListener('click', event => void handleEventDelete(event));
el.eventFocusList.addEventListener('click', event => void handleEventDelete(event));
el.taskSubtasks.addEventListener('input', () => autoGrowTextarea(el.taskSubtasks));
el.globalSearch.addEventListener('input', () => { searchQuery = el.globalSearch.value.trim().toLowerCase(); renderTasks(); });

document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) { event.preventDefault(); el.globalSearch.focus(); }
  if (event.key === 'Escape') { el.profilePopover.hidden = true; el.profileButton.setAttribute('aria-expanded', 'false'); }
});

el.navLinks.forEach(link => link.addEventListener('click', () => showView(link.dataset.viewLink)));
el.themeToggle.addEventListener('click', async () => {
  settings.theme = el.body.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(settings.theme);
  await persistSettings();
});

el.profileButton.addEventListener('click', () => {
  const open = !el.profilePopover.hidden;
  el.profilePopover.hidden = open;
  el.profileButton.setAttribute('aria-expanded', String(!open));
});

document.addEventListener('click', event => {
  if (!event.target.closest('.profile-menu')) {
    el.profilePopover.hidden = true;
    el.profileButton.setAttribute('aria-expanded', 'false');
  }
});

el.exportDataBtn.addEventListener('click', exportData);
el.importDataBtn.addEventListener('click', () => { el.importFileInput.value = ''; el.importFileInput.click(); });
el.importFileInput.addEventListener('change', async () => {
  const file = el.importFileInput.files?.[0];
  if (!file) return;
  try { await importDataFile(file); } catch (error) { alert(error.message || 'Kunne ikke importere filen.'); }
});

el.manageLinksBtn.addEventListener('click', openLinksDialog);
el.closeLinksBtn.addEventListener('click', closeLinksDialog);
el.cancelLinksBtn.addEventListener('click', closeLinksDialog);
el.linksDialog.addEventListener('click', event => { if (event.target === el.linksDialog) closeLinksDialog(); });
el.addLinkRowBtn.addEventListener('click', () => addLinkEditorRow());
el.linksEditorList.addEventListener('click', event => {
  const button = event.target.closest('.remove-link-row');
  if (!button) return;
  button.closest('.link-editor-row')?.remove();
  if (!el.linksEditorList.children.length) addLinkEditorRow();
});
el.linksForm.addEventListener('submit', async event => {
  event.preventDefault();
  const nextLinks = [];
  const rows = [...el.linksEditorList.querySelectorAll('.link-editor-row')];

  for (const [index, row] of rows.entries()) {
    const name = row.querySelector('.link-name-input').value.trim();
    const urlInput = row.querySelector('.link-url-input');
    const url = normalizeLinkUrl(urlInput.value);

    if (!name && !urlInput.value.trim()) continue;
    if (!name || !url) {
      urlInput.setCustomValidity(url ? '' : 'Skriv inn en gyldig http- eller https-lenke.');
      urlInput.reportValidity();
      urlInput.setCustomValidity('');
      return;
    }

    nextLinks.push({
      id: row.dataset.id || createId(`link-${index}`),
      name,
      url,
      createdAt: favoriteLinks.find(link => link.id === row.dataset.id)?.createdAt || Date.now() + index
    });
  }

  favoriteLinks = nextLinks;
  await persistLinks();
  renderFavoriteLinks();
  closeLinksDialog();
});

el.createNoteBtn.addEventListener('click', () => openNoteDialog());
el.closeNoteBtn.addEventListener('click', closeNoteDialog);
el.cancelNoteBtn.addEventListener('click', closeNoteDialog);
el.noteDialog.addEventListener('click', event => { if (event.target === el.noteDialog) closeNoteDialog(); });
el.noteForm.addEventListener('submit', async event => {
  event.preventDefault();
  await saveActiveNote();
});
el.deleteNoteBtn.addEventListener('click', async () => {
  if (!activeNoteId) return;
  if (await deleteNoteById(activeNoteId)) closeNoteDialog();
});
el.notesList.addEventListener('click', async event => {
  const card = event.target.closest('.note-card');
  if (!card) return;
  const noteId = card.dataset.noteId;
  if (event.target.closest('.edit-note-btn')) {
    openNoteDialog({ noteId });
    return;
  }
  if (event.target.closest('.delete-note-card-btn')) {
    await deleteNoteById(noteId);
  }
});

el.settingsBtn.addEventListener('click', openSettingsDialog);
el.closeSettingsBtn.addEventListener('click', closeSettingsDialog);
el.cancelSettingsBtn.addEventListener('click', closeSettingsDialog);
el.settingsDialog.addEventListener('click', event => { if (event.target === el.settingsDialog) closeSettingsDialog(); });
el.settingsForm.addEventListener('submit', async event => {
  event.preventDefault();
  settings.theme = el.themeSetting.value;
  settings.defaultView = el.defaultViewSetting.value;
  settings.confirmDelete = el.confirmDeleteSetting.checked;
  applyTheme(settings.theme);
  await persistSettings();
  closeSettingsDialog();
});

window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (settings.theme === 'system') applyTheme('system');
});

async function init() {
  store = await createStore();
  const [storedTasks, storedEvents, storedLinks, storedNotes, storedSettings] = await Promise.all([
    store.getTasks(), store.getEvents(), store.getLinks(), store.getNotes(), store.getSettings()
  ]);
  tasks = storedTasks.map(migrateTask);
  calendarEvents = storedEvents.map((event, index) => ({ id: event.id || createId(`event-${index}`), name: event.name || '', date: event.date || localDateString(), createdAt: event.createdAt || Date.now() + index }));
  favoriteLinks = storedLinks.map((link, index) => ({
    id: link.id || createId(`link-${index}`),
    name: String(link.name || '').trim(),
    url: normalizeLinkUrl(link.url),
    createdAt: link.createdAt || Date.now() + index
  })).filter(link => link.name && link.url);
  notes = storedNotes.map(migrateNote);
  settings = { ...settings, ...(storedSettings && typeof storedSettings === 'object' ? storedSettings : {}) };
  ensureInitialOrder();
  await persistTasks();
  applyTheme(settings.theme);
  el.sortMode.value = settings.sortMode;
  el.todayLabel.textContent = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  el.taskDate.value = localDateString();
  el.eventDate.min = localDateString();
  renderTasks();
  renderCalendarArea();
  renderFavoriteLinks();
  renderNotes();
  renderStats();
  showView(settings.defaultView);
  setInterval(() => { renderCalendarArea(); renderTasks(); }, 60000);
}

init().catch(error => {
  console.error(error);
  el.taskList.innerHTML = '<div class="empty-state">Appen kunne ikke starte. Åpne utviklerkonsollen for detaljer.</div>';
});
